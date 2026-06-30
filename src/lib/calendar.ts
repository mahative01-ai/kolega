export const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
export const JAKARTA_TIME_ZONE = "Asia/Jakarta";

export function dateOnly(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function getCurrentMonthKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}`;
}

export function parseMonthKey(value: string | undefined) {
  const monthKey = value?.match(/^\d{4}-\d{2}$/) ? value : getCurrentMonthKey();
  const [year, month] = monthKey.split("-").map(Number);

  return {
    monthKey,
    year,
    monthIndex: month - 1,
  };
}

export function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return dateOnly(new Date(year, month - 1, day));
}

export function getCalendarDays(year: number, monthIndex: number) {
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const leadingBlankDays = (firstDay.getDay() + 6) % 7;

  return {
    leadingBlankDays,
    days: Array.from({ length: daysInMonth }, (_, index) => {
      const date = dateOnly(new Date(year, monthIndex, index + 1));

      return {
        date,
        dateKey: formatDateKey(date),
        dayNumber: index + 1,
      };
    }),
  };
}

export function formatMonthLabel(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}
