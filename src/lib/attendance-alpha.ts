import "server-only";
import {
  dateOnlyFromKey,
  getDayOfWeek,
  getJakartaDateKey,
  getJakartaMinutes,
  timeToMinutes,
} from "@/lib/attendance-time";
import { prisma } from "@/lib/prisma";

const HOLIDAY_TYPES = ["NATIONAL_HOLIDAY", "COMPANY_LEAVE"] as const;

export async function materializeDailyAlpha(now = new Date()) {
  const dateKey = getJakartaDateKey(now);
  const attendanceDate = dateOnlyFromKey(dateKey);
  const currentMinutes = getJakartaMinutes(now);
  const dayOfWeek = getDayOfWeek(dateKey);

  const [studios, globalHoliday] = await Promise.all([
    prisma.studio.findMany({
      where: { isActive: true },
      select: {
        id: true,
        policies: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { alphaCutoffTime: true },
        },
        weeklyWorkRules: {
          where: { dayOfWeek },
          take: 1,
          select: { isWorkday: true },
        },
        calendarEvents: {
          where: {
            type: { in: [...HOLIDAY_TYPES] },
            startDate: { lte: attendanceDate },
            endDate: { gte: attendanceDate },
          },
          take: 1,
          select: { id: true },
        },
      },
    }),
    prisma.calendarEvent.findFirst({
      where: {
        studioId: null,
        type: { in: [...HOLIDAY_TYPES] },
        startDate: { lte: attendanceDate },
        endDate: { gte: attendanceDate },
      },
      select: { id: true },
    }),
  ]);

  let createdCount = 0;
  let processedStudioCount = 0;

  const todayKey = getJakartaDateKey(new Date());
  const isPastDay = dateKey < todayKey;

  for (const studio of studios) {
    const cutoffMinutes = timeToMinutes(
      studio.policies[0]?.alphaCutoffTime,
      "12:00"
    );

    if (
      (!isPastDay && currentMinutes < cutoffMinutes) ||
      globalHoliday ||
      studio.calendarEvents.length > 0
    ) {
      continue;
    }

    const isDefaultWorkday =
      studio.weeklyWorkRules[0]?.isWorkday ?? false;
    const scheduleFilter = isDefaultWorkday
      ? {
          personalSchedules: {
            none: { workDate: attendanceDate, workMode: "WFH" as const },
          },
        }
      : {
          personalSchedules: {
            some: { workDate: attendanceDate, workMode: "WFO" as const },
          },
        };

    const absentUsers = await prisma.user.findMany({
      where: {
        role: { in: ["ADMIN", "MEMBER"] },
        accountStatus: "ACTIVE",
        defaultStudioId: studio.id,
        ...scheduleFilter,
        attendanceRecords: { none: { attendanceDate } },
        requests: {
          none: {
            status: "APPROVED",
            type: { in: ["PERMISSION", "SICK", "DISPENSATION", "LEAVE"] },
            startDate: { lte: attendanceDate },
            endDate: { gte: attendanceDate },
          },
        },
      },
      select: { id: true },
    });

    if (absentUsers.length === 0) {
      processedStudioCount += 1;
      continue;
    }

    const result = await prisma.attendanceRecord.createMany({
      data: absentUsers.map((user) => ({
        userId: user.id,
        attendanceDate,
        ownerStudioId: studio.id,
        workMode: "WFO" as const,
        status: "ALPHA" as const,
        locationValidationStatus: "NOT_REQUIRED" as const,
      })),
      skipDuplicates: true,
    });

    if (result.count > 0) {
      await prisma.user.updateMany({
        where: { id: { in: absentUsers.map((user) => user.id) } },
        data: {
          workDayBalance: {
            decrement: 1,
          },
        },
      });
    }

    createdCount += result.count;
    processedStudioCount += 1;
  }

  return { dateKey, createdCount, processedStudioCount };
}
