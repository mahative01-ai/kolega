import { prisma } from "@/lib/prisma";
import { getJakartaDateKey, dateOnlyFromKey } from "@/lib/attendance-time";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const todayKey = getJakartaDateKey();
  const todayDate = dateOnlyFromKey(todayKey);

  // Find all attendance records for today that have check-in but no check-out
  const activeRecords = await prisma.attendanceRecord.findMany({
    where: {
      attendanceDate: todayDate,
      checkInAt: { not: null },
      checkOutAt: null,
    },
    select: {
      id: true,
      ownerStudioId: true,
      userId: true,
    },
  });

  let checkOutCount = 0;

  for (const record of activeRecords) {
    // Get the active checkout policy for this studio
    const policy = await prisma.attendancePolicy.findFirst({
      where: { studioId: record.ownerStudioId, isActive: true },
      select: { checkOutTime: true },
    });

    const checkoutTime = policy?.checkOutTime ?? "17:00";
    const [h, m] = checkoutTime.split(":").map(Number);

    const autoCheckOutTime = new Date(`${todayKey}T00:00:00.000Z`);
    autoCheckOutTime.setUTCHours(h - 7, m, 0, 0); // Convert Jakarta time to UTC

    await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        checkOutAt: autoCheckOutTime,
        updatedAt: new Date(),
      },
    });

    // Create a notification for the member
    await prisma.notification.create({
      data: {
        userId: record.userId,
        title: "Auto Check-out",
        message: `Sistem mendeteksi Anda belum melakukan check-out hari ini. Anda telah di-checkout otomatis pada jam ${checkoutTime} WIB.`,
      },
    });

    checkOutCount++;
  }

  return Response.json({
    success: true,
    checkOutCount,
  });
}
