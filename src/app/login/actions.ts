"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  clearSession,
  getDashboardPath,
  setSession,
  verifyPassword,
} from "@/lib/auth";
import {
  dateOnlyFromKey,
  getDayOfWeek,
  getJakartaDateKey,
  getJakartaMinutes,
  timeToMinutes,
} from "@/lib/attendance-time";
import { prisma } from "@/lib/prisma";

export async function loginAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rememberMe = formData.get("rememberMe") === "on";

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      role: true,
      accountStatus: true,
      passwordHash: true,
    },
  });

  if (
    !user ||
    user.accountStatus !== "ACTIVE" ||
    !verifyPassword(password, user.passwordHash)
  ) {
    redirect("/login?error=invalid");
  }

  await setSession(user.id, rememberMe);
  redirect(getDashboardPath(user.role));
}

export async function logoutAction() {
  await clearSession();
  redirect("/login");
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Jakarta",
  }).format(date);
}

export async function loginAndAttendWithQrAction(qrUid: string, action?: string) {
  const cleanQrUid = qrUid.trim();

  const credential = await prisma.qrCredential.findUnique({
    where: { qrUid: cleanQrUid },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          role: true,
          defaultStudioId: true,
          accountStatus: true,
        },
      },
    },
  });

  if (!credential || credential.status !== "ACTIVE" || credential.user.accountStatus !== "ACTIVE") {
    return { success: false, error: "Kartu QR tidak valid atau dinonaktifkan." };
  }

  const user = credential.user;

  // 1. Set login session (Remember Me diset true default untuk QR Scan)
  await setSession(user.id, true);

  if (!user.defaultStudioId) {
    return { success: true, redirectUrl: getDashboardPath(user.role) };
  }

  const now = new Date();
  const todayKey = getJakartaDateKey(now);
  const attendanceDate = dateOnlyFromKey(todayKey);
  const dayOfWeek = getDayOfWeek(todayKey);

  // 2. Validasi check-out hari lampau yang belum selesai
  const unfinishedRecord = await prisma.attendanceRecord.findFirst({
    where: {
      userId: user.id,
      checkInAt: { not: null },
      checkOutAt: null,
      attendanceDate: { lt: attendanceDate },
    },
    select: {
      attendanceDate: true,
    },
  });

  if (unfinishedRecord) {
    return {
      success: true,
      warning: `Anda belum check-out pada hari sebelumnya (${formatDate(unfinishedRecord.attendanceDate)}). Silakan ajukan koreksi presensi di dashboard.`,
      redirectUrl: getDashboardPath(user.role),
    };
  }

  // 3. Ambil data jadwal, aturan libur, pengajuan, dan status kehadiran hari ini
  const [personalSchedule, weeklyRule, holiday, replacementWorkday, approvedRequest, existingRecord, policy] = await Promise.all([
    prisma.personalWorkSchedule.findUnique({
      where: {
        userId_workDate: {
          userId: user.id,
          workDate: attendanceDate,
        },
      },
      select: {
        workMode: true,
      },
    }),
    prisma.weeklyWorkRule.findUnique({
      where: {
        studioId_dayOfWeek: {
          studioId: user.defaultStudioId,
          dayOfWeek,
        },
      },
      select: { isWorkday: true },
    }),
    prisma.calendarEvent.findFirst({
      where: {
        OR: [{ studioId: null }, { studioId: user.defaultStudioId }],
        type: { in: ["NATIONAL_HOLIDAY", "COMPANY_LEAVE", "REGULAR_OFF_DAY", "STUDIO_EVENT"] },
        startDate: { lte: attendanceDate },
        endDate: { gte: attendanceDate },
      },
      select: { id: true },
    }),
    prisma.calendarEvent.findFirst({
      where: {
        studioId: user.defaultStudioId,
        type: "REPLACEMENT_WORKDAY",
        startDate: { lte: attendanceDate },
        endDate: { gte: attendanceDate },
      },
      select: { id: true },
    }),
    prisma.request.findFirst({
      where: {
        userId: user.id,
        status: "APPROVED",
        startDate: { lte: attendanceDate },
        endDate: { gte: attendanceDate },
      },
      select: {
        type: true,
      },
    }),
    prisma.attendanceRecord.findUnique({
      where: {
        userId_attendanceDate: {
          userId: user.id,
          attendanceDate,
        },
      },
      select: {
        id: true,
        workMode: true,
        status: true,
        checkInAt: true,
        checkOutAt: true,
      },
    }),
    prisma.attendancePolicy.findFirst({
      where: {
        studioId: user.defaultStudioId,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        checkInTime: true,
        graceMinutes: true,
        alphaCutoffTime: true,
      },
    }),
  ]);

  // A. Jika jadwal hari ini diset WFH (baik dari jadwal Super Admin atau pengajuan yang diacc)
  if (personalSchedule?.workMode === "WFH" || existingRecord?.workMode === "WFH") {
    return {
      success: true,
      info: "Jadwal Anda hari ini adalah WFH. Anda harus masuk ke dashboard untuk mengisi rencana kerja.",
      redirectUrl: getDashboardPath(user.role),
    };
  }

  // B. Jika ada pengajuan Izin/Sakit/Cuti yang disetujui untuk hari ini
  if (approvedRequest) {
    const requestLabel = approvedRequest.type === "SICK" ? "Sakit" : approvedRequest.type === "LEAVE" ? "Cuti" : "Libur";
    return {
      success: true,
      info: `Jadwal Anda hari ini adalah ${requestLabel}.`,
      redirectUrl: getDashboardPath(user.role),
    };
  }

  // C. Jika hari ini adalah Hari Libur Nasional / Cuti Bersama atau Libur Mingguan (dan tidak ada jadwal WFO khusus / Hari Pengganti)
  const isWeekendOrHoliday = (holiday && !replacementWorkday) || (weeklyRule?.isWorkday === false && personalSchedule?.workMode !== "WFO" && !replacementWorkday);
  if (isWeekendOrHoliday) {
    return {
      success: true,
      info: "Hari ini adalah Hari Libur / Off Day.",
      redirectUrl: getDashboardPath(user.role),
    };
  }

  // D. Proses WFO Attendance
  if (!existingRecord) {
    // Check-in WFO
    const scheduledMinutes = timeToMinutes(policy?.checkInTime, "08:00");
    const graceMinutes = policy?.graceMinutes ?? 10;
    const currentMinutes = getJakartaMinutes(now);
    const alphaCutoffMinutes = timeToMinutes(policy?.alphaCutoffTime, "12:00");

    if (currentMinutes >= alphaCutoffMinutes) {
      await prisma.attendanceRecord.create({
        data: {
          userId: user.id,
          attendanceDate,
          ownerStudioId: user.defaultStudioId,
          workMode: "WFO",
          status: "ALPHA",
          locationValidationStatus: "NOT_REQUIRED",
          createdById: user.id,
        },
      });

      return {
        success: true,
        warning: "Batas presensi pukul 12.00 telah lewat. Status tercatat Alpha.",
        redirectUrl: getDashboardPath(user.role),
      };
    }

    const rawLateMinutes = Math.max(0, currentMinutes - scheduledMinutes);
    const status = rawLateMinutes > graceMinutes ? "LATE" : "ON_TIME";
    const lateMinutes = status === "LATE" ? rawLateMinutes : 0;

    await prisma.attendanceRecord.create({
      data: {
        userId: user.id,
        attendanceDate,
        ownerStudioId: user.defaultStudioId,
        locationStudioId: user.defaultStudioId,
        workMode: "WFO",
        status,
        checkInAt: now,
        locationValidationStatus: "NOT_REQUIRED",
        lateMinutes,
        createdById: user.id,
      },
    });

    const successMsg = status === "LATE"
      ? `Check-in WFO berhasil (Terlambat ${lateMinutes} menit).`
      : "Check-in WFO berhasil (Tepat Waktu).";

    return {
      success: true,
      message: successMsg,
      redirectUrl: getDashboardPath(user.role),
    };
  } else {
    // Check-out WFO
    if (existingRecord.checkInAt && existingRecord.checkOutAt) {
      await clearSession();
      return {
        success: true,
        message: "Anda sudah check-out hari ini.",
        redirectUrl: "/login?success=done",
      };
    }

    if (existingRecord.checkInAt && !existingRecord.checkOutAt) {
      if (action === "checkout") {
        await prisma.attendanceRecord.update({
          where: { id: existingRecord.id },
          data: {
            checkOutAt: now,
            updatedAt: now,
          },
        });
        await clearSession();
        return {
          success: true,
          message: "Check-out WFO berhasil.",
          redirectUrl: "/login?success=checkout",
        };
      }

      // Hanya login kembali ke dashboard tanpa mengubah status check-in yang sudah ada
      return {
        success: true,
        message: "Anda sudah check-in hari ini. Masuk ke dashboard...",
        redirectUrl: getDashboardPath(user.role),
      };
    }

    // fallback jika status record aneh
    return { success: true, redirectUrl: getDashboardPath(user.role) };
  }
}

export async function unlockRequestsAction() {
  const cookieStore = await cookies();
  cookieStore.set("kolega_unlocked_requests", "1", {
    maxAge: 15 * 60, // 15 minutes
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/member/requests");
}
