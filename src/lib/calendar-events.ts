export type CalendarEventLike = {
  type: string;
  title: string;
  startDate: Date | string;
  endDate: Date | string;
  studioId?: string | null;
};

export function calendarEventDateKey(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function calendarEventDedupeKey(event: CalendarEventLike) {
  return [
    event.type,
    event.title.trim().toLowerCase(),
    calendarEventDateKey(event.startDate),
    calendarEventDateKey(event.endDate),
    event.studioId ?? "global",
  ].join("|");
}

export function isApiHolidayCoveredByDbEvent(
  apiHoliday: CalendarEventLike,
  dbEvents: CalendarEventLike[]
) {
  const apiDate = calendarEventDateKey(apiHoliday.startDate);
  const apiTitle = apiHoliday.title.trim().toLowerCase();

  return dbEvents.some((dbEvent) => {
    const dbDate = calendarEventDateKey(dbEvent.startDate);
    const isSameDate = dbDate === apiDate;
    const isReplacement = isSameDate && dbEvent.type === "REPLACEMENT_WORKDAY";
    const isSameHoliday =
      isSameDate &&
      (dbEvent.type === "NATIONAL_HOLIDAY" || dbEvent.type === "COMPANY_LEAVE") &&
      dbEvent.title.trim().toLowerCase() === apiTitle;

    return isReplacement || isSameHoliday;
  });
}

export function dedupeCalendarEvents<T extends CalendarEventLike>(events: T[]) {
  const eventMap = new Map<string, T>();

  for (const event of events) {
    const key = calendarEventDedupeKey(event);
    if (!eventMap.has(key)) {
      eventMap.set(key, event);
    }
  }

  return Array.from(eventMap.values());
}
