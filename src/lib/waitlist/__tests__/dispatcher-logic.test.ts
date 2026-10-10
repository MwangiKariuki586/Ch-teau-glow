import {
  matchesTimeWindow,
  assertSlotInvariants,
  buildShortlist,
  type DispatchCandidateSlot,
  type DispatchSpecialist,
} from "@/lib/waitlist/dispatcher-logic";

// ────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────

function makeSpecialist(overrides: Partial<DispatchSpecialist> = {}): DispatchSpecialist {
  return {
    id: "spec-1",
    name: "Alice",
    title: "Stylist",
    image_url: null,
    branch_id: "branch-1",
    ...overrides,
  };
}

function makeSlot(
  startsAt: string,
  endsAt: string,
  specialist?: Partial<DispatchSpecialist>,
): DispatchCandidateSlot {
  return {
    specialist: makeSpecialist(specialist),
    starts_at: startsAt,
    ends_at: endsAt,
  };
}

// ────────────────────────────────────────────
// matchesTimeWindow
// ────────────────────────────────────────────

describe("matchesTimeWindow", () => {
  // Dubai timezone: UTC+4, JS offset = -240

  it("returns true when no time window preference is set", () => {
    expect(matchesTimeWindow("2026-04-15T06:00:00Z", null, -240)).toBe(true);
  });

  it("matches morning slot (10:00 local = 06:00 UTC in UTC+4)", () => {
    // 06:00 UTC → 10:00 Asia/Dubai (local)
    expect(matchesTimeWindow("2026-04-15T06:00:00Z", "morning", -240)).toBe(true);
  });

  it("rejects afternoon slot when morning is requested", () => {
    // 09:00 UTC → 13:00 Asia/Dubai (local)
    expect(matchesTimeWindow("2026-04-15T09:00:00Z", "morning", -240)).toBe(false);
  });

  it("matches afternoon slot (13:00 local = 09:00 UTC in UTC+4)", () => {
    expect(matchesTimeWindow("2026-04-15T09:00:00Z", "afternoon", -240)).toBe(true);
  });

  it("rejects morning slot when afternoon is requested", () => {
    // 06:00 UTC → 10:00 local → not in [12,17)
    expect(matchesTimeWindow("2026-04-15T06:00:00Z", "afternoon", -240)).toBe(false);
  });

  it("matches evening slot (18:00 local = 14:00 UTC in UTC+4)", () => {
    // 14:00 UTC → 18:00 Asia/Dubai
    expect(matchesTimeWindow("2026-04-15T14:00:00Z", "evening", -240)).toBe(true);
  });

  it("rejects evening slot when morning requested", () => {
    expect(matchesTimeWindow("2026-04-15T14:00:00Z", "morning", -240)).toBe(false);
  });

  it("handles UTC+0 offset correctly", () => {
    // 10:00 UTC with offset 0 → local hour 10 → morning [8,12)
    expect(matchesTimeWindow("2026-04-15T10:00:00Z", "morning", 0)).toBe(true);
    // 14:00 UTC with offset 0 → local hour 14 → afternoon [12,17)
    expect(matchesTimeWindow("2026-04-15T14:00:00Z", "afternoon", 0)).toBe(true);
  });

  it("handles negative UTC offset (e.g. US Eastern = UTC-5, offset +300)", () => {
    // 15:00 UTC with offset +300 → local 10:00 → morning
    expect(matchesTimeWindow("2026-04-15T15:00:00Z", "morning", 300)).toBe(true);
  });

  it("boundary: 08:00 local is morning, 07:59 is not", () => {
    // 04:00 UTC → 08:00 Dubai → morning start boundary
    expect(matchesTimeWindow("2026-04-15T04:00:00Z", "morning", -240)).toBe(true);
    // 03:59 UTC → 07:59 Dubai → below morning start
    expect(matchesTimeWindow("2026-04-15T03:59:00Z", "morning", -240)).toBe(false);
  });

  it("boundary: 11:59 local is morning, 12:00 is not", () => {
    // 07:59 UTC → 11:59 Dubai → still morning
    expect(matchesTimeWindow("2026-04-15T07:59:00Z", "morning", -240)).toBe(true);
    // 08:00 UTC → 12:00 Dubai → afternoon, not morning
    expect(matchesTimeWindow("2026-04-15T08:00:00Z", "morning", -240)).toBe(false);
  });
});

// ────────────────────────────────────────────
// assertSlotInvariants
// ────────────────────────────────────────────

describe("assertSlotInvariants", () => {
  const rangeStart = new Date("2026-04-15T00:00:00Z");
  const rangeEnd = new Date("2026-04-22T00:00:00Z");
  const requestId = "req-test-1";

  beforeEach(() => {
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("passes for a slot within range and matching time window", () => {
    const slot = makeSlot("2026-04-16T06:00:00Z", "2026-04-16T07:00:00Z");
    expect(
      assertSlotInvariants({
        slot,
        rangeStartUtc: rangeStart,
        rangeEndUtc: rangeEnd,
        timeWindow: "morning",
        tzOffsetMinutes: -240,
        requestId,
      }),
    ).toBe(true);
  });

  it("fails for a slot before range start", () => {
    const slot = makeSlot("2026-04-14T23:59:00Z", "2026-04-15T00:59:00Z");
    expect(
      assertSlotInvariants({
        slot,
        rangeStartUtc: rangeStart,
        rangeEndUtc: rangeEnd,
        timeWindow: null,
        tzOffsetMinutes: 0,
        requestId,
      }),
    ).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "[waitlist:invariant] slot before range_start",
      expect.any(Object),
    );
  });

  it("fails for a slot after range end", () => {
    const slot = makeSlot("2026-04-22T00:01:00Z", "2026-04-22T01:01:00Z");
    expect(
      assertSlotInvariants({
        slot,
        rangeStartUtc: rangeStart,
        rangeEndUtc: rangeEnd,
        timeWindow: null,
        tzOffsetMinutes: 0,
        requestId,
      }),
    ).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "[waitlist:invariant] slot after range_end",
      expect.any(Object),
    );
  });

  it("fails for a slot outside the requested time window", () => {
    // 09:00 UTC → 13:00 Dubai → afternoon, but requesting morning
    const slot = makeSlot("2026-04-16T09:00:00Z", "2026-04-16T10:00:00Z");
    expect(
      assertSlotInvariants({
        slot,
        rangeStartUtc: rangeStart,
        rangeEndUtc: rangeEnd,
        timeWindow: "morning",
        tzOffsetMinutes: -240,
        requestId,
      }),
    ).toBe(false);
    expect(console.error).toHaveBeenCalledWith(
      "[waitlist:invariant] slot outside time_window",
      expect.any(Object),
    );
  });

  it("passes with exact range boundary (slot at range_start)", () => {
    const slot = makeSlot("2026-04-15T00:00:00Z", "2026-04-15T01:00:00Z");
    expect(
      assertSlotInvariants({
        slot,
        rangeStartUtc: rangeStart,
        rangeEndUtc: rangeEnd,
        timeWindow: null,
        tzOffsetMinutes: 0,
        requestId,
      }),
    ).toBe(true);
  });
});

// ────────────────────────────────────────────
// buildShortlist
// ────────────────────────────────────────────

describe("buildShortlist", () => {
  it("returns empty array for empty candidates", () => {
    expect(buildShortlist([], 5)).toEqual([]);
  });

  it("limits results to the requested size", () => {
    const candidates = Array.from({ length: 10 }, (_, i) =>
      makeSlot(
        `2026-04-15T0${i}:00:00Z`,
        `2026-04-15T0${i + 1}:00:00Z`,
        { id: `spec-${i}`, name: `Specialist ${i}` },
      ),
    );
    const result = buildShortlist(candidates, 5);
    expect(result).toHaveLength(5);
  });

  it("diversifies across specialists", () => {
    const candidates = [
      makeSlot("2026-04-15T08:00:00Z", "2026-04-15T09:00:00Z", { id: "a", name: "Alice" }),
      makeSlot("2026-04-15T08:30:00Z", "2026-04-15T09:30:00Z", { id: "a", name: "Alice" }),
      makeSlot("2026-04-15T09:00:00Z", "2026-04-15T10:00:00Z", { id: "b", name: "Bob" }),
      makeSlot("2026-04-15T09:30:00Z", "2026-04-15T10:30:00Z", { id: "b", name: "Bob" }),
      makeSlot("2026-04-15T10:00:00Z", "2026-04-15T11:00:00Z", { id: "c", name: "Charlie" }),
    ];

    const result = buildShortlist(candidates, 3);
    const specialistIds = new Set(result.map((s) => s.specialist.id));

    // Should include at least one from each specialist
    expect(specialistIds.size).toBe(3);
    expect(specialistIds.has("a")).toBe(true);
    expect(specialistIds.has("b")).toBe(true);
    expect(specialistIds.has("c")).toBe(true);
  });

  it("returns all candidates when fewer than limit", () => {
    const candidates = [
      makeSlot("2026-04-15T08:00:00Z", "2026-04-15T09:00:00Z"),
      makeSlot("2026-04-15T09:00:00Z", "2026-04-15T10:00:00Z"),
    ];
    const result = buildShortlist(candidates, 5);
    expect(result).toHaveLength(2);
  });

  it("sorts the shortlist by starts_at", () => {
    const candidates = [
      makeSlot("2026-04-15T12:00:00Z", "2026-04-15T13:00:00Z", { id: "b", name: "Bob" }),
      makeSlot("2026-04-15T08:00:00Z", "2026-04-15T09:00:00Z", { id: "a", name: "Alice" }),
      makeSlot("2026-04-15T10:00:00Z", "2026-04-15T11:00:00Z", { id: "c", name: "Charlie" }),
    ];
    const result = buildShortlist(candidates, 5);
    expect(result[0].starts_at).toBe("2026-04-15T08:00:00Z");
    expect(result[1].starts_at).toBe("2026-04-15T10:00:00Z");
    expect(result[2].starts_at).toBe("2026-04-15T12:00:00Z");
  });
});
