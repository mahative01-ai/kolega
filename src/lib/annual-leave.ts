import "server-only";

import { prisma } from "@/lib/prisma";

export function getCurrentAnnualLeaveYear(now = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
    }).format(now)
  );
}

export async function ensureAnnualLeaveForUser<
  TUser extends {
  id: string;
  memberStatus: string;
  annualLeaveYear: number;
  },
>(user: TUser): Promise<TUser & { annualLeaveBalance?: number; annualLeaveYear: number }> {
  const currentYear = getCurrentAnnualLeaveYear();

  if (user.memberStatus !== "TEAM" || user.annualLeaveYear >= currentYear) {
    return user;
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      annualLeaveBalance: 12,
      annualLeaveYear: currentYear,
    },
  });

  return {
    ...user,
    annualLeaveBalance: 12,
    annualLeaveYear: currentYear,
  };
}

export async function ensureAnnualLeaveForActiveTeams() {
  const currentYear = getCurrentAnnualLeaveYear();

  return prisma.user.updateMany({
    where: {
      memberStatus: "TEAM",
      accountStatus: "ACTIVE",
      annualLeaveYear: { lt: currentYear },
    },
    data: {
      annualLeaveBalance: 12,
      annualLeaveYear: currentYear,
    },
  });
}
