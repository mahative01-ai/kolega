import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Flag,
  Building2,
  RefreshCw,
  XCircle,
  Star,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { CalendarEventFormClient } from "./calendar-event-form-client";
import { HolidaySwapFormClient } from "./holiday-swap-form-client";
import { getJakartaDateKey } from "@/lib/attendance-time";

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

// ─── Event type config ────────────────────────────────────────────────────────

export const EVENT_TYPE_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ElementType }
> = {
  NATIONAL_HOLIDAY: { label: "Libur Nasional", color: "text-red-700 dark:text-red-300", bg: "bg-red-100 dark:bg-red-950/50", icon: Flag },
  COMPANY_LEAVE: { label: "Cuti Bersama", color: "text-orange-700 dark:text-orange-300", bg: "bg-orange-100 dark:bg-orange-950/50", icon: Star },
  REGULAR_OFF_DAY: { label: "Libur Final", color: "text-zinc-600 dark:text-zinc-300", bg: "bg-zinc-100 dark:bg-zinc-800", icon: XCircle },
  REPLACEMENT_WORKDAY: { label: "Hari Pengganti", color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-100 dark:bg-emerald-950/50", icon: RefreshCw },
  STUDIO_EVENT: { label: "Kegiatan Studio", color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-100 dark:bg-blue-950/50", icon: Building2 },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const [user, params] = await Promise.all([getCurrentUser(), searchParams]);

  if (!user) redirect("/login");
  if (user.role !== "SUPER_ADMIN" && user.role !== "ADMIN") redirect("/member");

  const isSuperAdmin = user.role === "SUPER_ADMIN";
  const isGlobalSuperAdmin = user.role === "SUPER_ADMIN" && user.defaultStudioId === null;

  const { year, month } = parseMonthKey(params.month);
  const startDate = dateOnly(new Date(Date.UTC(year, month - 1, 1)));
  const endDate = dateOnly(new Date(Date.UTC(year, month, 0)));

  const [studios, events] = await Promise.all([
    isGlobalSuperAdmin
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
        : Promise.resolve([]),
    prisma.calendarEvent.findMany({
      where: {
        AND: [
          { startDate: { lte: endDate }, endDate: { gte: startDate } },
          ...(isGlobalSuperAdmin
            ? []
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
  ]);

  // Build day→events map
  const dayEvents: Record<number, typeof events> = {};
  for (const ev of events) {
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

  const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
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
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* ── Calendar Grid ── */}
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-2 pb-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="size-5 text-blue-700" />
                {formatMonthLabel(year, month)}
              </CardTitle>
              <CardDescription className="mt-0.5">
                {events.length} event di bulan ini
              </CardDescription>
            </div>
            <div className="flex items-center gap-1">
              <a
                href={`?month=${prevMonthKey(year, month)}`}
                className={buttonVariants({ variant: "outline", size: "icon" })}
                aria-label="Bulan sebelumnya"
              >
                <ChevronLeft className="size-4" />
              </a>
              <a
                href={`?month=${nextMonthKey(year, month)}`}
                className={buttonVariants({ variant: "outline", size: "icon" })}
                aria-label="Bulan berikutnya"
              >
                <ChevronRight className="size-4" />
              </a>
            </div>
          </CardHeader>
          <CardContent>
            {/* Day labels */}
            <div className="grid grid-cols-7 mb-1">
              {dayLabels.map((d) => (
                <div key={d} className="py-1 text-center text-xs font-semibold text-zinc-400">
                  {d}
                </div>
              ))}
            </div>
            {/* Day cells */}
            <div className="grid grid-cols-7 gap-px rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-200 dark:bg-zinc-800">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="min-h-16 bg-zinc-50 dark:bg-zinc-900/50" />
              ))}
              {/* Day cells */}
              {Array.from({ length: totalDays }).map((_, i) => {
                const day = i + 1;
                const isToday =
                  `${year}-${String(month).padStart(2, "0")}` === todayMonthKey &&
                  day === todayDay;
                const cellEvents = dayEvents[day] ?? [];
                const hasEvent = cellEvents.length > 0;

                return (
                  <div
                    key={day}
                    className={`min-h-16 p-1.5 bg-white dark:bg-zinc-950 transition-colors ${hasEvent ? "bg-amber-50/30 dark:bg-amber-500/5" : ""}`}
                  >
                    <span
                      className={`inline-flex size-6 items-center justify-center rounded-full text-xs font-medium mb-1 ${
                        isToday
                          ? "bg-zinc-950 dark:bg-zinc-100 text-white dark:text-zinc-950"
                          : "text-zinc-700 dark:text-zinc-300"
                      }`}
                    >
                      {day}
                    </span>
                    <div className="flex flex-col gap-0.5">
                      {cellEvents.slice(0, 2).map((ev) => {
                        const cfg = EVENT_TYPE_CONFIG[ev.type];
                        return (
                          <div
                            key={ev.id}
                            className={`truncate rounded px-1 py-0.5 text-[10px] font-medium leading-tight ${cfg.color} ${cfg.bg}`}
                            title={ev.title}
                          >
                            {ev.title}
                          </div>
                        );
                      })}
                      {cellEvents.length > 2 && (
                        <div className="text-[10px] text-zinc-400">
                          +{cellEvents.length - 2} lainnya
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap gap-2">
              {Object.entries(EVENT_TYPE_CONFIG).map(([key, cfg]) => (
                <span key={key} className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${cfg.color} ${cfg.bg}`}>
                  {cfg.label}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Event List + Form ── */}
        <div className="space-y-4">
          {isSuperAdmin && (
            <div className="grid gap-2">
              <CalendarEventFormClient
                studios={studios}
                monthKey={`${year}-${String(month).padStart(2, "0")}`}
              />
              <HolidaySwapFormClient
                studios={studios}
                monthKey={`${year}-${String(month).padStart(2, "0")}`}
              />
            </div>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Event Bulan Ini</CardTitle>
              <CardDescription>{formatMonthLabel(year, month)}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {events.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4 text-center">
                  Tidak ada event di bulan ini.
                </p>
              ) : (
                events.map((ev) => {
                  const cfg = EVENT_TYPE_CONFIG[ev.type];
                  const Icon = cfg.icon;
                  const startStr = new Intl.DateTimeFormat("id-ID", {
                    day: "numeric",
                    month: "short",
                    timeZone: TZ,
                  }).format(ev.startDate);
                  const endStr =
                    ev.startDate.getTime() !== ev.endDate.getTime()
                      ? " – " +
                        new Intl.DateTimeFormat("id-ID", {
                          day: "numeric",
                          month: "short",
                          timeZone: TZ,
                        }).format(ev.endDate)
                      : "";

                  return (
                    <div
                      key={ev.id}
                      className="flex items-start gap-3 rounded-lg border border-zinc-100 bg-white p-3 shadow-sm"
                    >
                      <div
                        className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md ${cfg.bg}`}
                      >
                        <Icon className={`size-3.5 ${cfg.color}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-zinc-900">
                          {ev.title}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {startStr}{endStr}
                        </p>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 ${cfg.color} ${cfg.bg} border-0`}>
                            {cfg.label}
                          </Badge>
                          {ev.studio ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {ev.studio.name}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-500">
                              Global
                            </Badge>
                          )}
                          {ev.isFinalHoliday && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-500">
                              Libur Final
                            </Badge>
                          )}
                          {ev.isReplacementRequired && ev.replacementDate && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-emerald-700">
                              Pengganti:{" "}
                              {new Intl.DateTimeFormat("id-ID", {
                                day: "numeric",
                                month: "short",
                                timeZone: TZ,
                              }).format(ev.replacementDate)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      {isSuperAdmin && (
                        <CalendarEventFormClient
                          studios={studios}
                          monthKey={`${year}-${String(month).padStart(2, "0")}`}
                          existingEvent={{
                            id: ev.id,
                            type: ev.type,
                            title: ev.title,
                            startDate: ev.startDate.toISOString().slice(0, 10),
                            endDate: ev.endDate.toISOString().slice(0, 10),
                            studioId: ev.studioId,
                            isReplacementRequired: ev.isReplacementRequired,
                            replacementDate: ev.replacementDate
                              ? ev.replacementDate.toISOString().slice(0, 10)
                              : null,
                            isFinalHoliday: ev.isFinalHoliday,
                            note: ev.note,
                          }}
                          mode="edit"
                        />
                      )}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
