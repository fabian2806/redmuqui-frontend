const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * Parses a backend LocalDate (YYYY-MM-DD) in the browser's local timezone.
 * Using new Date("YYYY-MM-DD") would interpret the value as UTC and can
 * display the previous day in timezones west of Greenwich.
 */
export function parseDateOnly(value: string): Date {
  const match = DATE_ONLY_PATTERN.exec(value)
  if (!match) return new Date(Number.NaN)

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return new Date(Number.NaN)
  }

  return date
}

export function formatDateOnly(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {},
  fallback = "—",
): string {
  if (!value) return fallback

  const date = parseDateOnly(value)
  if (Number.isNaN(date.getTime())) return value

  return date.toLocaleDateString("es-PE", options)
}
