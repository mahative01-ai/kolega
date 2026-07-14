import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CalendarGridClient } from "./calendar-grid-client";
import { getJakartaDateKey } from "@/lib/attendance-time";
import { getIndonesianHolidays } from "@/lib/calendar";
import { dedupeCalendarEvents, isApiHolidayCoveredByDbEvent } from "@/lib/calendar-events";

export const dynamic = "force-dynamic";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TZ = "Asia/Jakarta";

function getMonthKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}`;
}

function parseMonthKey(key?: string) {
  const raw = key ?? getMonthKey();
  const [y, m] = raw.split("-").map(Number);
  const year = Number.isFinite(y) ? y : new Date().getFullYear();
  const month = Number.isFinite(m) && m >= 1 && m <= 12 ? m : new Date().getMonth() + 1;
  return { year, month };
}

function dateOnly(d: Date) {
  return new Date(`${d.toISOString().slice(0, 10)}T00:00:00.000Z`);
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  // Returns 0=Mon … 6=Sun (ISO week style)
  const d = new Date(Date.UTC(year, month - 1, 1));
  return (d.getUTCDay() + 6) % 7; // shift so Mon=0
}

function formatMonthLabel(year: number, month: number) {
  return new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1)
  );
}

function prevMonthKey(year: number, month: number) {
  const d = new Date(year, month - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function nextMonthKey(year: number, month: number) {
  const d = new Date(year, month, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; studioId?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") redirect("/member");

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isGlobalSuperAdmin = user.role === "SUPER_ADMIN";

  const { year, month } = parseMonthKey(params.month);
  const startDate = dateOnly(new Date(Date.UTC(year, month - 1, 1)));
  const endDate = dateOnly(new Date(Date.UTC(year, month, 0)));

  const studios = await (isGlobalSuperAdmin
    ? prisma.studio.findMany({
        where: { isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      })
    : user.defaultStudioId
      ? prisma.studio.findMany({
          where: { id: user.defaultStudioId, isActive: true },
          select: { id: true, name: true },
        })
      : Promise.resolve([]));

  const defaultStudio = studios.find((s) => s.name.toLowerCase().includes("mahative")) || studios[0];
  const filterStudioId = isGlobalSuperAdmin
    ? params.studioId || (defaultStudio?.id ?? "")
    : user.defaultStudioId ?? "__none__";

  const [events, apiHolidays] = await Promise.all([
    prisma.calendarEvent.findMany({
      where: {
        AND: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
          ...(isGlobalSuperAdmin
            ? filterStudioId
              ? [{
                  OR: [
                    { studioId: null },
                    { studioId: filterStudioId },
                  ]
                }]
              : []
            : [{
              OR: [
                { studioId: null },
                { studioId: user.defaultStudioId ?? "__none__" },
              ],
            }]),
        ],
      },
      include: {
        studio: { select: { name: true } },
      },
      orderBy: { startDate: "asc" },
    }),
    getIndonesianHolidays(year),
  ]);

  // Convert IndonesianHoliday to calendar event format
  const mappedApiHolidays = apiHolidays
    .filter((h) => {
      const [hY, hM] = h.dateKey.split("-").map(Number);
      return hY === year && hM === month;
    })
    .map((h, idx) => {
      const dateVal = new Date(`${h.dateKey}T00:00:00.000Z`);
      return {
        id: `api-holiday-${idx}-${h.dateKey}`,
        type: h.isCutiBersama ? ("COMPANY_LEAVE" as const) : ("NATIONAL_HOLIDAY" as const),
        title: h.label,
        startDate: dateVal,
        endDate: dateVal,
        studioId: null,
        studio: null,
      };
    });

  const filteredApiHolidays = mappedApiHolidays.filter(
    (hEv) => !isApiHolidayCoveredByDbEvent(hEv, events)
  );
  const allEvents = dedupeCalendarEvents([...events, ...filteredApiHolidays]);

  // Build day→events map
  const dayEvents: Record<number, typeof allEvents> = {};
  for (const ev of allEvents) {
    const evStart = ev.startDate.getTime();
    const evEnd = ev.endDate.getTime();
    for (let day = 1; day <= daysInMonth(year, month); day++) {
      const dayDate = Date.UTC(year, month - 1, day);
      if (dayDate >= evStart && dayDate <= evEnd) {
        if (!dayEvents[day]) dayEvents[day] = [];
        dayEvents[day].push(ev);
      }
    }
  }

  const totalDays = daysInMonth(year, month);
  const firstDay = firstDayOfMonth(year, month);

  const todayDateKey = getJakartaDateKey();
  const todayMonthKey = todayDateKey.slice(0, 7);
  const todayDay = Number(todayDateKey.slice(8, 10));

  return (
    <DashboardShell
      user={user}
      currentPath="/calendar"
      badge="Kalender"
      title="Kalender Studio"
      description="Lihat dan kelola libur nasional, cuti bersama, hari kerja pengganti, dan kegiatan studio."
    >
      <div className="w-full space-y-6">


        <CalendarGridClient
          year={year}
          month={month}
          firstDay={firstDay}
          totalDays={totalDays}
          todayMonthKey={todayMonthKey}
          todayDay={todayDay}
          dayEvents={dayEvents}
          studios={studios}
          isSuperAdmin={isSuperAdmin}
          activeStudioId={filterStudioId}
          prevMonthKey={prevMonthKey(year, month)}
          nextMonthKey={nextMonthKey(year, month)}
          monthLabel={formatMonthLabel(year, month)}
        />
      </div>
    </DashboardShell>
  );
}
