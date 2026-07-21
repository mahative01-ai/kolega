import { prisma } from "@/lib/prisma";
import { AttendanceStatus, MemberStatus, RequestType } from "@/generated/prisma/client";

/**
 * Checks if a given date is an extra workday (non-working day) for a studio.
 * A date is non-working if:
 * 1. Studio WeeklyWorkRule specifies isWorkday = false (or defaults to Sunday/Monday off), OR
 * 2. A CalendarEvent marks it as OFF_DAY, NATIONAL_HOLIDAY, or COMPANY_LEAVE (and not REPLACEMENT_WORKDAY).
 */
export async function isExtraWorkday(attendanceDate: Date, studioId: string): Promise<boolean> {
  const dateObj = new Date(attendanceDate);
  // Get Day of Week in JS (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const jsDay = dateObj.getUTCDay();

  // Check CalendarEvent override for studio or global
  const calendarEvent = await prisma.calendarEvent.findFirst({
    where: {
      startDate: { lte: dateObj },
      endDate: { gte: dateObj },
      OR: [{ studioId: null }, { studioId }],
    },
    orderBy: { createdAt: "desc" },
  });

  if (calendarEvent) {
    if (calendarEvent.type === "REPLACEMENT_WORKDAY") {
      return false; // Forced working day
    }
    if (
      calendarEvent.type === "NATIONAL_HOLIDAY" ||
      calendarEvent.type === "COMPANY_LEAVE" ||
      calendarEvent.type === "REGULAR_OFF_DAY"
    ) {
      return true; // Non-working day
    }
  }

  // Check WeeklyWorkRule
  const weeklyRules = await prisma.weeklyWorkRule.findMany({
    where: { studioId },
  });

  if (weeklyRules.length > 0) {
    const dayRule = weeklyRules.find((r) => r.dayOfWeek === jsDay);
    if (dayRule) {
      return !dayRule.isWorkday;
    }
  }

  // Default fallback: Sunday (0) and Monday (1) are off days for Mahative
  return jsDay === 0 || jsDay === 1;
}

/**
 * Calculates the balance impact of a Request.
 */
export function getRequestBalanceImpact(
  type: RequestType,
  hasAttachment: boolean,
  memberStatus: MemberStatus
): { workdayBalanceDelta: number; annualLeaveBalanceDelta: number } {
  if (type === "SICK") {
    if (hasAttachment) {
      return { workdayBalanceDelta: 0, annualLeaveBalanceDelta: 0 };
    } else {
      return { workdayBalanceDelta: -1, annualLeaveBalanceDelta: 0 }; // Sick without attachment = debt
    }
  }

  if (type === "PERMISSION") {
    return { workdayBalanceDelta: -1, annualLeaveBalanceDelta: 0 };
  }

  if (type === "LEAVE") {
    if (memberStatus === "TEAM") {
      return { workdayBalanceDelta: 0, annualLeaveBalanceDelta: -1 };
    }
    return { workdayBalanceDelta: 0, annualLeaveBalanceDelta: 0 };
  }

  if (type === "DISPENSATION" || type === "WFH") {
    return { workdayBalanceDelta: 0, annualLeaveBalanceDelta: 0 };
  }

  return { workdayBalanceDelta: 0, annualLeaveBalanceDelta: 0 };
}

/**
 * Calculates the balance impact when an AttendanceCorrection is approved.
 */
export function getCorrectionBalanceImpact(
  previousStatus: AttendanceStatus | null,
  newStatus: AttendanceStatus | null,
  hasAttachment: boolean
): { workdayBalanceDelta: number; annualLeaveBalanceDelta: number } {
  let workdayBalanceDelta = 0;
  let annualLeaveBalanceDelta = 0;

  const isOldDebt =
    previousStatus === "ALPHA" ||
    previousStatus === "PERMISSION" ||
    (previousStatus === "SICK" && !hasAttachment);

  const isOldLeave = previousStatus === "LEAVE";

  const isNewDebt =
    newStatus === "ALPHA" ||
    newStatus === "PERMISSION" ||
    (newStatus === "SICK" && !hasAttachment);

  const isNewLeave = newStatus === "LEAVE";

  // Reverse old state impact
  if (isOldDebt) {
    workdayBalanceDelta += 1; // Reclaim debt
  } else if (isOldLeave) {
    annualLeaveBalanceDelta += 1; // Restore annual leave
  }

  // Apply new state impact
  if (isNewDebt) {
    workdayBalanceDelta -= 1; // Deduct debt
  } else if (isNewLeave) {
    annualLeaveBalanceDelta -= 1; // Deduct annual leave
  }

  return { workdayBalanceDelta, annualLeaveBalanceDelta };
}

/**
 * Checks if a user has an approved/submitted SICK request with an attachment for a specific date.
 */
export async function checkSickAttachment(userId: string, attendanceDate: Date): Promise<boolean> {
  const req = await prisma.request.findFirst({
    where: {
      userId,
      type: "SICK",
      startDate: { lte: attendanceDate },
      endDate: { gte: attendanceDate },
      attachmentUrl: { not: null },
    },
    select: { id: true },
  });
  return Boolean(req);
}

