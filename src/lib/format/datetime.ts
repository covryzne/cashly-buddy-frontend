export function wibDateTime(date: string, time: string) {
  return `${date}T${time.length === 5 ? `${time}:00` : time}+07:00`;
}

export function formatDate(
  value: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    ...options,
  }).format(new Date(value));
}

/** Calendar day in WIB; independent of the browser/server's local timezone. */
export function wibDayKey(value: string) {
  return new Date(new Date(value).getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function chatDayLabel(value: string, today: string | null) {
  const day = wibDayKey(value);
  if (day === today) return "Hari ini";
  if (today) {
    const yesterday = new Date(
      new Date(`${today}T00:00:00Z`).getTime() - 86400000,
    )
      .toISOString()
      .slice(0, 10);
    if (day === yesterday) return "Kemarin";
  }
  return formatDate(value, { day: "numeric", month: "long", year: "numeric" });
}
