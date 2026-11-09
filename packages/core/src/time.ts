import { validation } from "./errors";

/**
 * Converts a browser `datetime-local` value in a firm's IANA time zone into a
 * UTC instant. `new Date("2026-11-06T09:00")` would use the server's time zone,
 * which is wrong for an Australian firm running in a container.
 */
export function zonedDateTimeToUtc(value: string, timeZone: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) throw validation("Enter a valid date and time");
  const [, year, month, day, hour, minute] = match;
  const components = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute)
  };

  try {
    new Intl.DateTimeFormat("en-AU", { timeZone }).format(new Date());
  } catch {
    throw validation("The firm's time zone is not valid");
  }

  const wallClockAsUtc = Date.UTC(
    components.year,
    components.month - 1,
    components.day,
    components.hour,
    components.minute
  );

  let candidate = new Date(wallClockAsUtc);
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(candidate);
    const read = (type: Intl.DateTimeFormatPartTypes): number =>
      Number(parts.find((part) => part.type === type)?.value ?? "0");
    const representedAsUtc = Date.UTC(
      read("year"),
      read("month") - 1,
      read("day"),
      read("hour") === 24 ? 0 : read("hour"),
      read("minute")
    );
    const offset = representedAsUtc - candidate.getTime();
    candidate = new Date(candidate.getTime() - offset);
  }

  const check = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(candidate);
  const readCheck = (type: Intl.DateTimeFormatPartTypes): string =>
    check.find((part) => part.type === type)?.value ?? "";
  const expected = {
    year: String(components.year).padStart(4, "0"),
    month: String(components.month).padStart(2, "0"),
    day: String(components.day).padStart(2, "0"),
    hour: String(components.hour).padStart(2, "0"),
    minute: String(components.minute).padStart(2, "0")
  };
  const actual = {
    year: readCheck("year"),
    month: readCheck("month"),
    day: readCheck("day"),
    hour: readCheck("hour") === "24" ? "00" : readCheck("hour"),
    minute: readCheck("minute")
  };
  if (
    expected.year !== actual.year ||
    expected.month !== actual.month ||
    expected.day !== actual.day ||
    expected.hour !== actual.hour ||
    expected.minute !== actual.minute
  ) {
    throw validation("That local time does not exist in the firm's time zone");
  }

  return candidate;
}

export function isoDateInTimeZone(date: Date, timeZone: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}
