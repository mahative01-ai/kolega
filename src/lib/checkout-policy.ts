import { getJakartaMinutes, timeToMinutes } from "@/lib/attendance-time";

type AttendancePolicyLike = {
  checkInTime?: string | null;
  checkOutTime?: string | null;
};

export function getCheckoutEligibility({
  checkInAt,
  now = new Date(),
  policy,
}: {
  checkInAt: Date;
  now?: Date;
  policy?: AttendancePolicyLike | null;
}) {
  const scheduledCheckInMinutes = timeToMinutes(policy?.checkInTime, "08:00");
  const scheduledCheckOutMinutes = timeToMinutes(policy?.checkOutTime, "16:00");
  const requiredWorkMinutes = Math.max(0, scheduledCheckOutMinutes - scheduledCheckInMinutes);
  const actualCheckInMinutes = getJakartaMinutes(checkInAt);
  const allowedCheckoutMinutes = actualCheckInMinutes + requiredWorkMinutes;
  const currentMinutes = getJakartaMinutes(now);

  return {
    allowedCheckoutMinutes,
    currentMinutes,
    remainingMinutes: Math.max(0, allowedCheckoutMinutes - currentMinutes),
    earlyCheckoutMinutes: Math.max(0, scheduledCheckOutMinutes - currentMinutes),
    isAllowed: currentMinutes >= allowedCheckoutMinutes,
  };
}

export function formatMinutesAsClock(totalMinutes: number) {
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;

  return `${String(hour).padStart(2, "0")}.${String(minute).padStart(2, "0")}`;
}
