export const DURATION_UNITS = [
  "minutes",
  "hours",
  "days",
  "weeks",
  "months",
  "years",
] as const;

export const SESSION_DURATION_UNITS = ["minutes", "hours"] as const;

export type DurationUnit = (typeof DURATION_UNITS)[number];
export type SessionDurationUnit = (typeof SESSION_DURATION_UNITS)[number];

export type DurationFieldState = {
  mode: "preset" | "custom";
  amount: string;
  unit: DurationUnit;
  customValue: string;
};

type ParseDurationOptions = {
  allowedUnits?: readonly DurationUnit[];
  fallbackUnit?: DurationUnit;
};

const UNIT_ALIASES: Record<string, DurationUnit> = {
  minute: "minutes",
  minutes: "minutes",
  hour: "hours",
  hours: "hours",
  day: "days",
  days: "days",
  week: "weeks",
  weeks: "weeks",
  month: "months",
  months: "months",
  year: "years",
  years: "years",
};

export const DURATION_UNIT_LABELS: Record<DurationUnit, string> = {
  minutes: "Minutes",
  hours: "Hours",
  days: "Days",
  weeks: "Weeks",
  months: "Months",
  years: "Years",
};

export function createEmptyDurationFieldState(unit: DurationUnit): DurationFieldState {
  return {
    mode: "preset",
    amount: "",
    unit,
    customValue: "",
  };
}

export function parseStoredDuration(
  value: string | null | undefined,
  options: ParseDurationOptions = {},
): DurationFieldState {
  const allowedUnits = options.allowedUnits ?? DURATION_UNITS;
  const fallbackUnit = options.fallbackUnit ?? allowedUnits[0] ?? "minutes";
  const trimmed = value?.trim() ?? "";

  if (!trimmed) {
    return createEmptyDurationFieldState(fallbackUnit);
  }

  const match = trimmed.match(/^(\d+(?:\.\d+)?)\s*(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)$/i);
  if (match) {
    const normalizedUnit = UNIT_ALIASES[match[2].toLowerCase()];
    if (allowedUnits.includes(normalizedUnit)) {
      return {
        mode: "preset",
        amount: match[1],
        unit: normalizedUnit,
        customValue: "",
      };
    }
  }

  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return {
      mode: "preset",
      amount: trimmed,
      unit: fallbackUnit,
      customValue: "",
    };
  }

  const rangeMatch = trimmed.match(
    /^(\d+(?:\.\d+)?)\s*(?:-|–|to)\s*(\d+(?:\.\d+)?)\s*(minute|minutes|hour|hours|day|days|week|weeks|month|months|year|years)$/i,
  );
  if (rangeMatch) {
    const normalizedUnit = UNIT_ALIASES[rangeMatch[3].toLowerCase()];
    if (allowedUnits.includes(normalizedUnit)) {
      return {
        mode: "preset",
        amount: rangeMatch[2],
        unit: normalizedUnit,
        customValue: trimmed,
      };
    }
  }

  return {
    mode: "custom",
    amount: "",
    unit: fallbackUnit,
    customValue: trimmed,
  };
}

export function formatDurationAmount(amount: string, unit: DurationUnit) {
  const normalized = Number(amount);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  const printableAmount = Number.isInteger(normalized) ? String(normalized) : String(normalized);
  const singularUnit = unit.endsWith("s") ? unit.slice(0, -1) : unit;
  const printableUnit = normalized === 1 ? singularUnit : unit;
  return `${printableAmount} ${printableUnit}`;
}

export function serializeDurationField(state: DurationFieldState) {
  if (state.mode === "custom") {
    return state.customValue.trim() || null;
  }

  if (!state.amount.trim()) {
    return null;
  }

  return formatDurationAmount(state.amount.trim(), state.unit);
}

export function getDurationFieldValidationError(
  state: DurationFieldState,
  label: string,
) {
  if (state.mode === "custom") {
    return null;
  }

  if (!state.amount.trim()) {
    return null;
  }

  const normalized = Number(state.amount);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return `${label} must be a positive number.`;
  }

  return null;
}

export function minutesToSessionDuration(totalMinutes: number) {
  if (totalMinutes > 0 && totalMinutes % 60 === 0) {
    return {
      amount: String(totalMinutes / 60),
      unit: "hours" as SessionDurationUnit,
    };
  }

  return {
    amount: totalMinutes > 0 ? String(totalMinutes) : "",
    unit: "minutes" as SessionDurationUnit,
  };
}

export function sessionDurationToMinutes(
  amount: string,
  unit: SessionDurationUnit,
) {
  const normalized = Number(amount);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return null;
  }

  const multiplier = unit === "hours" ? 60 : 1;
  return Math.round(normalized * multiplier);
}
