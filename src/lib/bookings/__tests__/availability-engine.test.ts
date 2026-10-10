import {
  buildAvailableSlotsForDate,
  toUtcFromOffsetLocal,
  getUtcDayRangeFromOffsetLocal,
  getWeekdayForLocalDate,
  parseAvailability,
  formatDateInOffset,
} from "@/lib/bookings/availability-engine";

// ────────────────────────────────────────────
// parseAvailability
// ────────────────────────────────────────────

describe("parseAvailability", () => {
  it("parses valid availability windows", () => {
    const raw = [
      { day_of_week: 1, start: "09:00", end: "17:00" },
      { dayOfWeek: 3, start_time: "10:00", end_time: "18:00", slot_minutes: 45 },
    ];
    const result = parseAvailability(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      dayOfWeek: 1,
      start: "09:00",
      end: "17:00",
      slotMinutes: 30,
    });
    expect(result[1]).toEqual({
      dayOfWeek: 3,
      start: "10:00",
      end: "18:00",
      slotMinutes: 45,
    });
  });

  it("skips entries with is_available=false", () => {
    const raw = [
      { day_of_week: 1, start: "09:00", end: "17:00", is_available: false },
    ];
    expect(parseAvailability(raw)).toHaveLength(0);
  });

  it("returns empty for non-array input", () => {
    expect(parseAvailability(null)).toEqual([]);
    expect(parseAvailability("not an array")).toEqual([]);
  });

  it("skips entries with invalid time format", () => {
    const raw = [{ day_of_week: 1, start: "9am", end: "5pm" }];
    expect(parseAvailability(raw)).toHaveLength(0);
  });
});

// ────────────────────────────────────────────
// toUtcFromOffsetLocal
// ────────────────────────────────────────────

describe("toUtcFromOffsetLocal", () => {
  it("converts Dubai 09:00 (UTC+4, offset -240) to UTC 05:00", () => {
    const result = toUtcFromOffsetLocal("2026-04-15", "09:00", -240);
    expect(result.toISOString()).toBe("2026-04-15T05:00:00.000Z");
  });

  it("converts UTC+0 (offset 0) to same time", () => {
    const result = toUtcFromOffsetLocal("2026-04-15", "10:00", 0);
    expect(result.toISOString()).toBe("2026-04-15T10:00:00.000Z");
  });

  it("converts US Eastern (UTC-5, offset +300) 10:00 to UTC 15:00", () => {
    const result = toUtcFromOffsetLocal("2026-04-15", "10:00", 300);
    expect(result.toISOString()).toBe("2026-04-15T15:00:00.000Z");
  });
});

// ────────────────────────────────────────────
// getUtcDayRangeFromOffsetLocal
// ────────────────────────────────────────────

describe("getUtcDayRangeFromOffsetLocal", () => {
  it("returns a 24-hour range for Dubai timezone", () => {
    // Dubai: date 2026-04-15 starts at 2026-04-14T20:00Z (00:00 local = UTC-4h shift)
    const { start, end } = getUtcDayRangeFromOffsetLocal("2026-04-15", -240);
    expect(start.toISOString()).toBe("2026-04-14T20:00:00.000Z");
    expect(end.toISOString()).toBe("2026-04-15T20:00:00.000Z");
  });
});

// ────────────────────────────────────────────
// formatDateInOffset
// ────────────────────────────────────────────

describe("formatDateInOffset", () => {
  it("formats UTC midnight as same date for offset 0", () => {
    expect(formatDateInOffset(new Date("2026-04-15T00:00:00Z"), 0)).toBe("2026-04-15");
  });

  it("formats UTC 23:00 as next local date for Dubai (UTC+4)", () => {
    // 23:00 UTC = 03:00 next day in Dubai
    expect(formatDateInOffset(new Date("2026-04-15T23:00:00Z"), -240)).toBe("2026-04-16");
  });
});

// ────────────────────────────────────────────
// getWeekdayForLocalDate
// ────────────────────────────────────────────

describe("getWeekdayForLocalDate", () => {
  it("returns correct weekday (Wednesday = 3)", () => {
    expect(getWeekdayForLocalDate("2026-04-15")).toBe(3); // Wednesday
  });

  it("returns 0 for Sunday", () => {
    expect(getWeekdayForLocalDate("2026-04-19")).toBe(0); // Sunday
  });
});

// ────────────────────────────────────────────
// buildAvailableSlotsForDate
// ────────────────────────────────────────────

describe("buildAvailableSlotsForDate", () => {
  const availability = [
    { dayOfWeek: 3, start: "09:00", end: "17:00", slot_minutes: 30 }, // Wednesday
  ];

  it("generates slots for a matching weekday", () => {
    const slots = buildAvailableSlotsForDate({
      availability,
      date: "2026-04-15", // Wednesday
      bookingDurationMinutes: 30,
      existingBookings: [],
      tzOffsetMinutes: 0, // UTC
      admin: true, // bypass lead-time
      now: new Date("2026-04-15T06:00:00Z"),
    });

    expect(slots.length).toBeGreaterThan(0);
    // All slots should be within 09:00–17:00 UTC on that day
    for (const slot of slots) {
      expect(slot.starts_at).toMatch(/^2026-04-15T/);
    }
  });

  it("returns no slots for a non-matching weekday", () => {
    const slots = buildAvailableSlotsForDate({
      availability,
      date: "2026-04-16", // Thursday
      bookingDurationMinutes: 30,
      existingBookings: [],
      tzOffsetMinutes: 0,
      admin: true,
    });
    expect(slots).toHaveLength(0);
  });

  it("excludes slots overlapping existing bookings", () => {
    const slots = buildAvailableSlotsForDate({
      availability,
      date: "2026-04-15", // Wednesday
      bookingDurationMinutes: 60,
      existingBookings: [
        { starts_at: "2026-04-15T10:00:00Z", ends_at: "2026-04-15T11:00:00Z" },
      ],
      tzOffsetMinutes: 0,
      admin: true,
    });

    // No slot should overlap with the 10:00–11:00 booking (+ buffer)
    for (const slot of slots) {
      const start = new Date(slot.starts_at).getTime();
      const end = new Date(slot.ends_at).getTime();
      const bookingStart = new Date("2026-04-15T10:00:00Z").getTime();
      const bookingEnd = new Date("2026-04-15T11:00:00Z").getTime();
      const buffer = 30 * 60 * 1000; // 30 min buffer

      // slot should not overlap with [bookingStart - buffer, bookingEnd + buffer]
      const overlaps = start < bookingEnd + buffer && end > bookingStart - buffer;
      expect(overlaps).toBe(false);
    }
  });

  it("enforces lead-time for same-day non-admin requests", () => {
    const now = new Date("2026-04-15T09:00:00Z"); // 09:00 UTC
    const slots = buildAvailableSlotsForDate({
      availability,
      date: "2026-04-15",
      bookingDurationMinutes: 30,
      existingBookings: [],
      tzOffsetMinutes: 0,
      admin: false,
      now,
    });

    // Lead time is 2 hours, so no slots before 11:00 UTC
    for (const slot of slots) {
      expect(new Date(slot.starts_at).getTime()).toBeGreaterThanOrEqual(
        now.getTime() + 2 * 60 * 60 * 1000,
      );
    }
  });

  it("returns empty for zero duration", () => {
    const slots = buildAvailableSlotsForDate({
      availability,
      date: "2026-04-15",
      bookingDurationMinutes: 0,
      existingBookings: [],
      tzOffsetMinutes: 0,
    });
    expect(slots).toHaveLength(0);
  });

  it("handles timezone offset correctly (Dubai UTC+4)", () => {
    const dubaiAvailability = [
      { dayOfWeek: 3, start: "09:00", end: "12:00", slot_minutes: 30 },
    ];

    const slots = buildAvailableSlotsForDate({
      availability: dubaiAvailability,
      date: "2026-04-15", // Wednesday
      bookingDurationMinutes: 30,
      existingBookings: [],
      tzOffsetMinutes: -240, // UTC+4
      admin: true,
    });

    // 09:00 Dubai = 05:00 UTC, 12:00 Dubai = 08:00 UTC
    expect(slots.length).toBeGreaterThan(0);
    for (const slot of slots) {
      const hour = new Date(slot.starts_at).getUTCHours();
      expect(hour).toBeGreaterThanOrEqual(5);
      expect(hour).toBeLessThan(8);
    }
  });

  it("deduplicates slots with the same starts_at", () => {
    // Use two availability windows that could overlap
    const overlappingAvail = [
      { dayOfWeek: 3, start: "09:00", end: "12:00", slot_minutes: 30 },
      { dayOfWeek: 3, start: "09:00", end: "12:00", slot_minutes: 30 },
    ];

    const slots = buildAvailableSlotsForDate({
      availability: overlappingAvail,
      date: "2026-04-15",
      bookingDurationMinutes: 30,
      existingBookings: [],
      tzOffsetMinutes: 0,
      admin: true,
    });

    const startsAtValues = slots.map((s) => s.starts_at);
    const unique = new Set(startsAtValues);
    expect(unique.size).toBe(startsAtValues.length);
  });
});
