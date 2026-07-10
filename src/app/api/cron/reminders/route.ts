import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { getJakartaDateKey } from "@/lib/attendance-time";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization");

  if (!cronSecret || authorization !== `Bearer ${cronSecret}`) {
    return Response.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const todayKey = getJakartaDateKey();
  const todayDate = new Date(`${todayKey}T00:00:00.000Z`);
  const dayOfWeek = (new Date(todayKey).getDay() + 6) % 7; // Mon=0 ... Sun=6

  const activeReminders = await prisma.reminder.findMany({ where: { isActive: true } });

  let notificationsCreated = 0;
  let emailsSent = 0;

  for (const reminder of activeReminders) {
    const targetStudioId = reminder.studioId;

    // Fetch members associated with this studio (or all active members if studioId is null)
    const members = await prisma.user.findMany({
      where: {
        accountStatus: "ACTIVE",
        role: { not: "SUPER_ADMIN" },
        ...(targetStudioId ? { defaultStudioId: targetStudioId } : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        defaultStudioId: true,
      },
    });

    if (reminder.type === "CHECK_IN") {
      // Find members who have NOT checked in yet today (and today is a workday for their studio)
      for (const member of members) {
        const studioId = member.defaultStudioId;
        if (!studioId) continue;

        // Check if today is a workday for the studio
        const [weeklyRule, holidayEvent, replacementWorkdayEvent, existingRecord] = await Promise.all([
          prisma.weeklyWorkRule.findUnique({
            where: { studioId_dayOfWeek: { studioId, dayOfWeek } },
            select: { isWorkday: true },
          }),
          prisma.calendarEvent.findFirst({
            where: {
              OR: [{ studioId: null }, { studioId }],
              type: { in: ["NATIONAL_HOLIDAY", "COMPANY_LEAVE", "REGULAR_OFF_DAY", "STUDIO_EVENT"] },
              startDate: { lte: todayDate },
              endDate: { gte: todayDate },
            },
            select: { id: true },
          }),
          prisma.calendarEvent.findFirst({
            where: { studioId, type: "REPLACEMENT_WORKDAY", startDate: { lte: todayDate }, endDate: { gte: todayDate } },
            select: { id: true },
          }),
          prisma.attendanceRecord.findUnique({
            where: { userId_attendanceDate: { userId: member.id, attendanceDate: todayDate } },
            select: { id: true },
          }),
        ]);

        const isWorkday = (weeklyRule?.isWorkday ?? true) || !!replacementWorkdayEvent;
        const isHoliday = !!holidayEvent && !replacementWorkdayEvent;

        if (isWorkday && !isHoliday && !existingRecord) {
          // Send notification and email
          await prisma.notification.create({
            data: {
              userId: member.id,
              title: reminder.title,
              message: reminder.message,
            },
          });
          notificationsCreated++;

          await sendEmail({
            to: member.email,
            subject: `[Reminder] ${reminder.title}`,
            text: `Halo ${member.name},\n\nIni adalah pengingat untuk Anda:\n${reminder.message}\n\nSilakan lakukan check-in segera di Kolega.`,
          });
          emailsSent++;
        }
      }
    } else if (reminder.type === "CHECK_OUT") {
      // Find members who checked in today but have NOT checked out yet
      for (const member of members) {
        const existingRecord = await prisma.attendanceRecord.findUnique({
          where: { userId_attendanceDate: { userId: member.id, attendanceDate: todayDate } },
          select: { id: true, checkInAt: true, checkOutAt: true },
        });

        if (existingRecord && existingRecord.checkInAt && !existingRecord.checkOutAt) {
          await prisma.notification.create({
            data: {
              userId: member.id,
              title: reminder.title,
              message: reminder.message,
            },
          });
          notificationsCreated++;

          await sendEmail({
            to: member.email,
            subject: `[Reminder] ${reminder.title}`,
            text: `Halo ${member.name},\n\nIni adalah pengingat untuk Anda:\n${reminder.message}\n\nJangan lupa untuk melakukan check-out di Kolega setelah menyelesaikan jam kerja.`,
          });
          emailsSent++;
        }
      }
    } else if (reminder.type === "PICKET") {
      // Find members who have picket duty today
      const picketSchedules = await prisma.picketSchedule.findMany({
        where: {
          picketDate: todayDate,
          ...(targetStudioId ? { studioId: targetStudioId } : {}),
        },
        include: {
          user: { select: { id: true, name: true, email: true } },
          studio: { select: { name: true } },
        },
      });

      for (const picket of picketSchedules) {
        await prisma.notification.create({
          data: {
            userId: picket.user.id,
            title: reminder.title,
            message: `${reminder.message} (Studio: ${picket.studio.name})`,
          },
        });
        notificationsCreated++;

        await sendEmail({
          to: picket.user.email,
          subject: `[Piket Hari Ini] ${reminder.title}`,
          text: `Halo ${picket.user.name},\n\nAnda memiliki tugas piket hari ini:\n${reminder.message}\n\nTerima kasih atas kontribusi Anda menjaga kebersihan studio ${picket.studio.name}.`,
        });
        emailsSent++;
      }
    }
  }

  // ─── Auto Check-out for Forgotten Check-outs (Only after 17:00 WIB) ────────
  let autoCheckOutCount = 0;
  const now = new Date();
  const jakartaHour = Number(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Jakarta",
    hour: "numeric",
    hour12: false,
  }).format(now));

  if (jakartaHour >= 17) {
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

      autoCheckOutCount++;
    }
  }

  return Response.json({
    success: true,
    notificationsCreated,
    emailsSent,
    autoCheckOutCount,
  });
}
