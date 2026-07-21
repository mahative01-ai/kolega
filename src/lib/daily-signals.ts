import type { Prisma } from "@/generated/prisma/client";
import { dateOnlyFromKey, getJakartaDateKey } from "@/lib/attendance-time";
import { prisma } from "@/lib/prisma";
import type { AppRole } from "@/lib/auth";

export type UserContext = {
  id: string;
  role: AppRole;
  defaultStudioId?: string | null;
};

export type BirthdaySignal = {
  id: string;
  name: string;
  defaultStudioName: string | null;
  defaultStudioId: string | null;
};

export type MoodSignalSummary = {
  totalCheckedIn: number;
  sharedMoodCount: number;
  mostCommonMood: string | null;
};

export type EventSignal = {
  id: string;
  title: string;
  type: string;
  startDate: Date;
  endDate: Date;
  studioName?: string | null;
};

export type DailySignals = {
  birthdays: BirthdaySignal[];
  moodSummary: MoodSignalSummary;
  events: EventSignal[];
};

export async function getTodayBirthdaySignals(user: UserContext): Promise<BirthdaySignal[]> {
  const whereClause: Prisma.UserWhereInput = {
    accountStatus: "ACTIVE",
    birthDate: { not: null },
  };

  if (user.role !== "SUPER_ADMIN" && user.defaultStudioId) {
    whereClause.defaultStudioId = user.defaultStudioId;
  }

  const activeUsers = await prisma.user.findMany({
    where: whereClause,
    select: {
      id: true,
      name: true,
      birthDate: true,
      defaultStudioId: true,
      defaultStudio: {
        select: { name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const todayKey = getJakartaDateKey(new Date());
  const [yearStr, monthStr, dayStr] = todayKey.split("-");
  const targetMonth = parseInt(monthStr, 10);
  const targetDay = parseInt(dayStr, 10);

  const birthdayUsers = activeUsers.filter((u) => {
    if (!u.birthDate) return false;
    const bd = new Date(u.birthDate);
    return bd.getUTCDate() === targetDay && bd.getUTCMonth() + 1 === targetMonth;
  });

  return birthdayUsers.map((u) => ({
    id: u.id,
    name: u.name,
    defaultStudioName: u.defaultStudio?.name ?? null,
    defaultStudioId: u.defaultStudioId ?? null,
  }));
}

export async function getTodayMoodSignals(user: UserContext): Promise<MoodSignalSummary> {
  const todayKey = getJakartaDateKey(new Date());
  const todayDate = dateOnlyFromKey(todayKey);

  const whereClause: Prisma.AttendanceRecordWhereInput = {
    attendanceDate: todayDate,
  };

  if (user.role !== "SUPER_ADMIN" && user.defaultStudioId) {
    whereClause.ownerStudioId = user.defaultStudioId;
  }

  const records = await prisma.attendanceRecord.findMany({
    where: whereClause,
    select: {
      mood: true,
      checkInAt: true,
      status: true,
    },
  });

  const checkedInRecords = records.filter((r) => r.checkInAt !== null || r.status === "WFH");
  const sharedMoods = checkedInRecords.filter((r) => r.mood && r.mood.trim() !== "");

  const moodCounts: Record<string, number> = {};
  for (const r of sharedMoods) {
    if (r.mood) {
      const key = r.mood.toUpperCase();
      moodCounts[key] = (moodCounts[key] || 0) + 1;
    }
  }

  let mostCommonMood: string | null = null;
  let maxCount = 0;
  for (const [key, count] of Object.entries(moodCounts)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonMood = key;
    }
  }

  return {
    totalCheckedIn: checkedInRecords.length,
    sharedMoodCount: sharedMoods.length,
    mostCommonMood,
  };
}

export async function getTodayEventSignals(user: UserContext): Promise<EventSignal[]> {
  const todayKey = getJakartaDateKey(new Date());
  const todayDate = dateOnlyFromKey(todayKey);

  const whereClause: Prisma.CalendarEventWhereInput = {
    startDate: { lte: todayDate },
    endDate: { gte: todayDate },
  };

  if (user.role !== "SUPER_ADMIN") {
    whereClause.OR = [
      { studioId: null },
      { studioId: user.defaultStudioId ?? "__none__" },
    ];
  }

  const events = await prisma.calendarEvent.findMany({
    where: whereClause,
    select: {
      id: true,
      title: true,
      type: true,
      startDate: true,
      endDate: true,
      studio: {
        select: { name: true },
      },
    },
    orderBy: { startDate: "asc" },
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    type: e.type,
    startDate: e.startDate,
    endDate: e.endDate,
    studioName: e.studio?.name ?? null,
  }));
}

export async function getDailySignals(user: UserContext): Promise<DailySignals> {
  const [birthdays, moodSummary, events] = await Promise.all([
    getTodayBirthdaySignals(user),
    getTodayMoodSignals(user),
    getTodayEventSignals(user),
  ]);

  return {
    birthdays,
    moodSummary,
    events,
  };
}
