export function formatHumanDate(date: string, locale = "en-US") {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  });
}

export function getTodayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function rollingWindowDates(days = 7, from = new Date()): string[] {
  const list: string[] = [];

  for (let index = 0; index < days; index += 1) {
    const current = new Date(from);
    current.setDate(from.getDate() - index);
    list.push(current.toISOString().slice(0, 10));
  }

  return list;
}
