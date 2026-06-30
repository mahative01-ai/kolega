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

export const dynamic = "force-dynamic";

const dayLabels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
const JAKARTA_TIME_ZONE = "Asia/Jakarta";

function dateOnly(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getCurrentMonthKey() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}`;
}

function parseMonthKey(value: string | undefined) {
  const monthKey = value?.match(/^\d{4}-\d{2}$/) ? value : getCurrentMonthKey();
  const [year, month] = monthKey.split("-").map(Number);

  return {
    monthKey,
    year,
    monthIndex: month - 1,
  };
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);

  return dateOnly(new Date(year, month - 1, day));
}

function getCalendarDays(year: number, monthIndex: number) {
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

function formatMonthLabel(year: number, monthIndex: number) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, monthIndex, 1));
}

async function setWfhScheduleAction(formData: FormData) {
  "use server";

  const actor = await requireRole("SUPER_ADMIN");
  const userId = String(formData.get("userId") ?? "");
  const workDateKey = String(formData.get("workDate") ?? "");

  if (!userId || !workDateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error("Data jadwal tidak lengkap.");
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: userId,
      accountStatus: "ACTIVE",
      role: {
        not: "SUPER_ADMIN",
      },
    },
    select: {
      id: true,
      defaultStudioId: true,
      placements: {
        where: {
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
        select: {
          studioId: true,
        },
      },
    },
  });

  if (!targetUser) {
    throw new Error("User tidak ditemukan atau tidak aktif.");
  }

  const workDate = parseDateKey(workDateKey);
  const studioId = targetUser.placements[0]?.studioId ?? targetUser.defaultStudioId;

  await prisma.$transaction([
    prisma.personalWorkSchedule.upsert({
      where: {
        userId_workDate: {
          userId,
          workDate,
        },
      },
      update: {
        workMode: "WFH",
        studioId,
        note: "WFH diatur oleh Super Admin",
        createdById: actor.id,
      },
      create: {
        userId,
        workDate,
        workMode: "WFH",
        studioId,
        note: "WFH diatur oleh Super Admin",
        createdById: actor.id,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "PersonalWorkSchedule",
        entityId: userId,
        action: "WORK_SCHEDULE_SET_WFH",
        metadata: { userId, workDate: workDateKey },
      },
    }),
  ]);

  revalidatePath("/schedules");
}

async function resetWfoScheduleAction(formData: FormData) {
  "use server";

  const actor = await requireRole("SUPER_ADMIN");
  const userId = String(formData.get("userId") ?? "");
  const workDateKey = String(formData.get("workDate") ?? "");

  if (!userId || !workDateKey.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error("Data jadwal tidak lengkap.");
  }

  const workDate = parseDateKey(workDateKey);

  await prisma.$transaction([
    prisma.personalWorkSchedule.deleteMany({
      where: {
        userId,
        workDate,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "PersonalWorkSchedule",
        entityId: userId,
        action: "WORK_SCHEDULE_RESET_WFO",
        metadata: { userId, workDate: workDateKey },
      },
    }),
  ]);

  revalidatePath("/schedules");
}

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
  const scopedUserWhere =
    actor.role === "SUPER_ADMIN"
      ? {
          accountStatus: "ACTIVE" as const,
          role: {
            not: "SUPER_ADMIN" as const,
          },
        }
      : {
          accountStatus: "ACTIVE" as const,
          defaultStudioId: actor.defaultStudioId ?? "__NO_STUDIO__",
          role: {
            not: "SUPER_ADMIN" as const,
          },
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
  const [schedules, wfhCount] = selectedUser
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
      ])
    : [[], 0];

  return {
    users,
    selectedUser,
    schedules,
    wfhCount,
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
      <section className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <UsersRound className="size-4 text-emerald-700" />
              User Terlihat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-emerald-700">
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
            <p className="text-3xl font-semibold text-zinc-800">
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
            <p className="text-3xl font-semibold text-blue-700">
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
                className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
          <div className="grid grid-cols-7 overflow-hidden rounded-md border border-zinc-200 bg-white">
            {dayLabels.map((label) => (
              <div
                key={label}
                className="border-b border-zinc-200 bg-zinc-50 px-2 py-2 text-center text-xs font-medium text-zinc-600"
              >
                {label}
              </div>
            ))}
            {Array.from({ length: leadingBlankDays }, (_, index) => (
              <div
                key={`blank-${index}`}
                className="min-h-32 border-b border-r border-zinc-100 bg-zinc-50"
              />
            ))}
            {days.map((day) => {
              const schedule = scheduleByDate.get(day.dateKey);
              const isWfh = schedule?.workMode === "WFH";
              const isToday = day.dateKey === todayKey;

              return (
                <div
                  key={day.dateKey}
                  className="min-h-32 border-b border-r border-zinc-100 p-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={
                        isToday
                          ? "flex size-7 items-center justify-center rounded-full bg-zinc-950 text-sm font-semibold text-white"
                          : "text-sm font-semibold text-zinc-900"
                      }
                    >
                      {day.dayNumber}
                    </span>
                    <Badge
                      variant="secondary"
                      className={
                        isWfh
                          ? "bg-blue-100 text-blue-800"
                          : "bg-zinc-100 text-zinc-700"
                      }
                    >
                      {isWfh ? "WFH" : "WFO"}
                    </Badge>
                  </div>

                  <p className="mt-3 min-h-8 text-xs text-zinc-500">
                    {isWfh
                      ? schedule?.note ?? "WFH dari jadwal bulanan"
                      : "Default WFO"}
                  </p>

                  {canManage && data.selectedUser ? (
                    <div className="mt-3 grid gap-2">
                      {isWfh ? (
                        <form action={resetWfoScheduleAction}>
                          <input
                            type="hidden"
                            name="userId"
                            value={data.selectedUser.id}
                          />
                          <input
                            type="hidden"
                            name="workDate"
                            value={day.dateKey}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            <RotateCcw aria-hidden="true" />
                            WFO
                          </Button>
                        </form>
                      ) : (
                        <form action={setWfhScheduleAction}>
                          <input
                            type="hidden"
                            name="userId"
                            value={data.selectedUser.id}
                          />
                          <input
                            type="hidden"
                            name="workDate"
                            value={day.dateKey}
                          />
                          <Button
                            type="submit"
                            size="sm"
                            variant="outline"
                            className="w-full"
                          >
                            <Home aria-hidden="true" />
                            WFH
                          </Button>
                        </form>
                      )}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}
