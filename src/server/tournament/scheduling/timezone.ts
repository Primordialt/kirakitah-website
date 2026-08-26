/** Tournament operating timezone for KG926 scheduling display. */
export const TOURNAMENT_DEFAULT_TIMEZONE = "Africa/Lagos";

/**
 * Parse a local date+time in an IANA timezone into a UTC ISO string.
 * Does not use the browser's local timezone as tournament time.
 */
export function parseLocalDateTimeInTimezone(input: {
  date: string;
  time: string;
  timezone: string;
}): string {
  const date = input.date.trim();
  const time = input.time.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("date must be YYYY-MM-DD.");
  }
  if (!/^\d{2}:\d{2}$/.test(time)) {
    throw new Error("time must be HH:MM.");
  }

  const timezone = input.timezone.trim();

  // Fixed-offset shortcuts (tournament default is Africa/Lagos = WAT / UTC+1).
  if (timezone === "Africa/Lagos") {
    return new Date(`${date}T${time}:00+01:00`).toISOString();
  }
  if (timezone === "UTC") {
    return new Date(`${date}T${time}:00Z`).toISOString();
  }

  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);

  const readWall = (ms: number) => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(ms));
    const get = (type: string) =>
      Number(parts.find((part) => part.type === type)?.value ?? "NaN");
    return {
      year: get("year"),
      month: get("month"),
      day: get("day"),
      hour: get("hour") === 24 ? 0 : get("hour"),
      minute: get("minute"),
      second: get("second"),
    };
  };

  // Binary search UTC instant whose wall time in `timezone` matches the input minute.
  let low = Date.UTC(year, month - 1, day, hour, minute) - 14 * 60 * 60 * 1000;
  let high = Date.UTC(year, month - 1, day, hour, minute) + 14 * 60 * 60 * 1000;
  let found: number | null = null;

  for (let i = 0; i < 48; i += 1) {
    const mid = Math.floor((low + high) / 2);
    const wall = readWall(mid);
    const wallKey = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
    const target = Date.UTC(year, month - 1, day, hour, minute);
    if (wallKey === target) {
      // Snap to the start of the wall-clock minute (drop seconds/ms).
      found = mid - wall.second * 1000 - (mid % 1000);
      break;
    }
    if (wallKey < target) low = mid + 1;
    else high = mid - 1;
  }

  if (found == null) {
    throw new Error("Unable to resolve date/time in timezone.");
  }
  return new Date(found).toISOString();
}

export function formatInTimezone(
  iso: string | null | undefined,
  timezone: string = TOURNAMENT_DEFAULT_TIMEZONE,
): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    dateStyle: "medium",
    timeStyle: "short",
    hour12: true,
  }).format(date);
}

export function formatTimezoneLabel(timezone: string = TOURNAMENT_DEFAULT_TIMEZONE): string {
  if (timezone === "Africa/Lagos") return "Africa/Lagos (WAT)";
  return timezone;
}

/** Admin/player display e.g. `14 Sep 2026, 6:00 PM WAT`. */
export function formatScheduleInAfricaLagos(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TOURNAMENT_DEFAULT_TIMEZONE,
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  const month = get("month").replace("Sept", "Sep");
  const day = get("day");
  const year = get("year");
  const hour = get("hour");
  const minute = get("minute");
  const dayPeriod = get("dayPeriod").toUpperCase();
  return `${day} ${month} ${year}, ${hour}:${minute} ${dayPeriod} WAT`;
}

/** Direct interval overlap (no rest buffer). End exclusive if both ends exist. */
export function scheduleWindowsOverlap(input: {
  aStart: string;
  aEnd?: string | null;
  bStart: string;
  bEnd?: string | null;
}): boolean {
  const aStart = new Date(input.aStart).getTime();
  const bStart = new Date(input.bStart).getTime();
  if (Number.isNaN(aStart) || Number.isNaN(bStart)) return false;

  const aEnd = input.aEnd ? new Date(input.aEnd).getTime() : aStart;
  const bEnd = input.bEnd ? new Date(input.bEnd).getTime() : bStart;
  if (Number.isNaN(aEnd) || Number.isNaN(bEnd)) return false;

  return aStart < bEnd && bStart < aEnd;
}
