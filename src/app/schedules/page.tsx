import { revalidatePath } from "next/cache";
import { CalendarDays, Home, RotateCcw, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireAnyRole, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import {
  dateOnly,
  dayLabels,
  formatDateKey,
  formatMonthLabel,
  getCalendarDays,
  parseDateKey,
  parseMonthKey,
} from "@/lib/calendar";

export const dynamic = "force-dynamic";

import { ToggleScheduleButton } from "./toggle-schedule-button";

async function getScheduleData({
  actor,
  monthKey,
  selectedUserId,
}: {
  actor: Awaited<ReturnType<typeof requireAnyRole>>;
  monthKey: string;
  selectedUserId?: string;
}) {
  const { year, monthIndex } = parseMonthKey(monthKey);
  const monthStart = dateOnly(new Date(year, monthIndex, 1));
  const monthEnd = dateOnly(new Date(year, monthIndex + 1, 0));
  const isGlobalSuperAdmin = actor.role === "SUPER_ADMIN" && actor.defaultStudioId === null;
  const scopedUserWhere =
    isGlobalSuperAdmin
      ? {
          accountStatus: "ACTIVE" as const,
          role: {
            not: "SUPER_ADMIN" as const,
          },
        }
      : {
          accountStatus: "ACTIVE" as const,
          role: {
            not: "SUPER_ADMIN" as const,
          },
          OR: [
            { defaultStudioId: actor.defaultStudioId ?? "__NO_STUDIO__" },
            { placements: { some: { studioId: actor.defaultStudioId ?? "__NO_STUDIO__", status: "ACTIVE" as const } } }
          ]
        };

  const users = await prisma.user.findMany({
    where: scopedUserWhere,
    orderBy: [{ defaultStudioId: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      memberStatus: true,
      defaultStudio: {
        select: {
          name: true,
        },
      },
      placements: {
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          studio: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
  const selectedUser =
    users.find((user) => user.id === selectedUserId) ?? users[0] ?? null;
  const [schedules, wfhCount, calendarEvents] = selectedUser
    ? await Promise.all([
        prisma.personalWorkSchedule.findMany({
          where: {
            userId: selectedUser.id,
            workDate: {
              gte: monthStart,
              lte: monthEnd,
            },
          },
          select: {
            workDate: true,
            workMode: true,
            note: true,
          },
        }),
        prisma.personalWorkSchedule.count({
          where: {
            userId: selectedUser.id,
            workDate: {
              gte: monthStart,
              lte: monthEnd,
            },
            workMode: "WFH",
          },
        }),
        prisma.calendarEvent.findMany({
          where: {
            startDate: { lte: monthEnd },
            endDate: { gte: monthStart },
            ...(isGlobalSuperAdmin
              ? {}
              : {
                  OR: [
                    { studioId: null },
                    { studioId: actor.defaultStudioId ?? "__none__" },
                  ],
                }),
          },
          select: {
            id: true,
            title: true,
            type: true,
            startDate: true,
            endDate: true,
          },
        }),
      ])
    : [[], 0, []];

  return {
    users,
    selectedUser,
    schedules,
    wfhCount,
    calendarEvents,
  };
}

export default async function WorkSchedulesPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; userId?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    requireAnyRole(["SUPER_ADMIN", "ADMIN"]),
    searchParams,
  ]);
  const month = parseMonthKey(params.month);
  const { leadingBlankDays, days } = getCalendarDays(
    month.year,
    month.monthIndex
  );
  const data = await getScheduleData({
    actor: currentUser,
    monthKey: month.monthKey,
    selectedUserId: params.userId,
  });
  const canManage = currentUser.role === "SUPER_ADMIN";
  const scheduleByDate = new Map(
    data.schedules.map((schedule) => [
      formatDateKey(schedule.workDate),
      schedule,
    ])
  );
  const todayKey = formatDateKey(dateOnly());
  const wfoCount = days.length - data.wfhCount;

  // Build holiday map: dateKey → list of events
  const holidayMap = new Map<string, { title: string; type: string }[]>();
  const EVENT_COLORS: Record<string, string> = {
    NATIONAL_HOLIDAY: "bg-red-100 text-red-700",
    COMPANY_LEAVE: "bg-orange-100 text-orange-700",
    REGULAR_OFF_DAY: "bg-zinc-200 text-zinc-600",
    REPLACEMENT_WORKDAY: "bg-emerald-100 text-emerald-700",
    STUDIO_EVENT: "bg-blue-100 text-blue-700",
  };
  for (const ev of data.calendarEvents) {
    const start = ev.startDate.getTime();
    const end = ev.endDate.getTime();
    for (const day of days) {
      const [y, m, d] = day.dateKey.split("-").map(Number);
      const dayTs = Date.UTC(y, m - 1, d);
      if (dayTs >= start && dayTs <= end) {
        const existing = holidayMap.get(day.dateKey) ?? [];
        existing.push({ title: ev.title, type: ev.type });
        holidayMap.set(day.dateKey, existing);
      }
    }
  }

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/schedules"
      badge={canManage ? "Jadwal Bulanan" : "View Only"}
      title="Jadwal WFO/WFH"
      description={
        canManage
          ? "Default jadwal adalah WFO. Super Admin dapat mengubah tanggal tertentu menjadi WFH per member."
          : `Admin hanya melihat jadwal user aktif di studio ${currentUser.defaultStudio?.name ?? "yang sama"}.`
      }
    >
      <div className="space-y-6">
        <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <UsersRound className="size-4 text-emerald-700" />
              User Terlihat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-700 dark:text-emerald-400">
              {data.users.length.toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CalendarDays className="size-4 text-zinc-700" />
              Default WFO
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-zinc-800 dark:text-zinc-100">
              {wfoCount.toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Home className="size-4 text-blue-700" />
              WFH Bulan Ini
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-blue-700 dark:text-blue-400">
              {data.wfhCount.toLocaleString("id-ID")}
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Filter Kalender</CardTitle>
          <CardDescription>
            Pilih bulan dan user untuk melihat kalender kerja personal.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
            <div className="flex flex-col gap-2">
              <label htmlFor="month" className="text-sm font-medium">
                Bulan
              </label>
              <Input
                id="month"
                name="month"
                type="month"
                defaultValue={month.monthKey}
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="userId" className="text-sm font-medium">
                User
              </label>
              <select
                id="userId"
                name="userId"
                className="h-8 rounded-lg border border-input bg-transparent dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                defaultValue={data.selectedUser?.id ?? ""}
              >
                {data.users.length === 0 ? (
                  <option value="">Tidak ada user aktif</option>
                ) : null}
                {data.users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} - {user.defaultStudio?.name ?? "Tanpa studio"}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full md:w-auto">
                Tampilkan
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formatMonthLabel(month.year, month.monthIndex)}</CardTitle>
          <CardDescription>
            {data.selectedUser
              ? `${data.selectedUser.name} - ${data.selectedUser.defaultStudio?.name ?? "Tanpa default studio"}${
                  data.selectedUser.placements[0]?.studio.name
                    ? `, placement ${data.selectedUser.placements[0].studio.name}`
                    : ""
                }`
              : "Belum ada user aktif untuk ditampilkan."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 overflow-hidden rounded-md border border-zinc-200 dark:border-zinc-800 bg-card">
            {dayLabels.map((label) => (
              <div
                key={label}
                className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-2 py-2 text-center text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                {label}
              </div>
            ))}
            {Array.from({ length: leadingBlankDays }, (_, index) => (
              <div
                key={`blank-${index}`}
                className="min-h-32 border-b border-r border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30"
              />
            ))}
            {days.map((day) => {
              const schedule = scheduleByDate.get(day.dateKey);
              const isWfh = schedule?.workMode === "WFH";
              const isToday = day.dateKey === todayKey;

              return (
                <div
                  key={day.dateKey}
                  className="min-h-32 border-b border-r border-zinc-100 dark:border-zinc-800 p-2 bg-transparent"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={
                        isToday
                          ? "flex size-7 items-center justify-center rounded-full bg-zinc-950 dark:bg-zinc-100 text-sm font-semibold text-white dark:text-zinc-950"
                          : "text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                      }
                    >
                      {day.dayNumber}
                    </span>
                    <Badge
                      variant="secondary"
                      className={
                        isWfh
                          ? "bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900"
                          : "bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800"
                      }
                    >
                      {isWfh ? "WFH" : "WFO"}
                    </Badge>
                  </div>

                  <p className="mt-2 min-h-6 text-xs text-zinc-500 dark:text-zinc-400">
                    {isWfh
                      ? schedule?.note ?? "WFH dari jadwal bulanan"
                      : "Default WFO"}
                  </p>

                  {/* ── Holiday badges ── */}
                  {(holidayMap.get(day.dateKey) ?? []).map((ev, i) => (
                    <div
                      key={i}
                      className={`mt-1 truncate rounded px-1.5 py-0.5 text-[10px] font-medium leading-tight ${
                        EVENT_COLORS[ev.type] ?? "bg-zinc-100 text-zinc-600"
                      }`}
                      title={ev.title}
                    >
                      {ev.title}
                    </div>
                  ))}

                  {canManage && data.selectedUser ? (
                    <div className="mt-3">
                      <ToggleScheduleButton
                        userId={data.selectedUser.id}
                        workDate={day.dateKey}
                        isWfh={isWfh}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
      </div>
    </DashboardShell>
  );
}
