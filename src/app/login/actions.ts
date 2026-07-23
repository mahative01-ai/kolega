"use server";

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
import { formatMinutesAsClock, getCheckoutEligibility } from "@/lib/checkout-policy";
import { prisma } from "@/lib/prisma";
import { isExtraWorkday } from "@/lib/workday-balance";

type QrAttendanceInput = {
  action?: string;
  latitude?: number;
  longitude?: number;
};

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earthRadiusMeters = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}
export async function loginAction(formData: FormData) {
  const identifier = String(formData.get("identifier") ?? formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const rememberMe = formData.get("rememberMe") === "on";
  const intent = String(formData.get("intent") ?? "");

  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { email: identifier },
        { username: identifier },
      ],
    },
    select: {
      id: true,
      role: true,
      accountStatus: true,
      passwordHash: true,
    },
  });

  if (!user || !verifyPassword(password, user.passwordHash)) {
    redirect("/login?error=invalid");
  }

  if (user.accountStatus === "ARCHIVED") {
    redirect("/login?error=archived");
  }

  if (user.accountStatus === "INACTIVE") {
    redirect("/login?error=inactive");
  }

  await setSession(user.id, rememberMe);

  if (intent === "request") {
    if (user.role === "ADMIN") {
      redirect("/admin/requests");
    }

    if (user.role === "MEMBER") {
      redirect("/member/requests");
    }
  }

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

// ─── Login and Attend via Office QR Scanner ────────────────────────────────

export async function loginAndAttendWithQrAction(
  qrUid: string,
  input: QrAttendanceInput = {}
) {
  const cleanQrUid = qrUid.trim();
  const action = input.action;

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

  // Check active placement
  const activePlacement = await prisma.placement.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    select: {
      studioId: true,
    },
  });
  const currentStudioId = activePlacement?.studioId ?? user.defaultStudioId;

  if (!currentStudioId) {
    return { success: true, redirectUrl: getDashboardPath(user.role) };
  }

  const userLat = typeof input.latitude === "number" ? input.latitude : null;
  const userLng = typeof input.longitude === "number" ? input.longitude : null;

  if (userLat === null || userLng === null || Number.isNaN(userLat) || Number.isNaN(userLng)) {
    return { success: false, error: "Lokasi wajib diaktifkan untuk presensi WFO." };
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
      warning: `You did not check out on the previous work day (${formatDate(unfinishedRecord.attendanceDate)}). Please submit an attendance correction in your dashboard.`,
      redirectUrl: getDashboardPath(user.role),
    };
  }

  // 3. Ambil data jadwal, aturan libur, pengajuan, dan status kehadiran hari ini
  const [personalSchedule, weeklyRule, holiday, replacementWorkday, approvedRequest, existingRecord, policy, studio] = await Promise.all([
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
          studioId: currentStudioId,
          dayOfWeek,
        },
      },
      select: { isWorkday: true },
    }),
    prisma.calendarEvent.findFirst({
      where: {
        OR: [{ studioId: null }, { studioId: currentStudioId }],
        type: { in: ["NATIONAL_HOLIDAY", "COMPANY_LEAVE", "REGULAR_OFF_DAY", "STUDIO_EVENT"] },
        startDate: { lte: attendanceDate },
        endDate: { gte: attendanceDate },
      },
      select: { id: true, type: true },
    }),
    prisma.calendarEvent.findFirst({
      where: {
        studioId: currentStudioId,
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
        studioId: currentStudioId,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        checkInTime: true,
        graceMinutes: true,
        alphaCutoffTime: true,
        checkOutTime: true,
      },
    }),
    prisma.studio.findUnique({
      where: { id: currentStudioId },
      select: {
        latitude: true,
        longitude: true,
        radiusMeters: true,
      },
    }),
  ]);

  if (!studio || studio.latitude === null || studio.longitude === null) {
    return { success: false, error: "Studio GPS location incomplete. Please contact Admin." };
  }

  const distance = calculateDistance(userLat, userLng, studio.latitude, studio.longitude);
  const radiusMeters = studio.radiusMeters ?? 100;
  const locationValidationStatus =
    distance > radiusMeters ? "OUTSIDE_RADIUS" : "INSIDE_RADIUS";

  // A. Jika sudah melakukan check-in WFH hari ini, blok WFO scan
  if (existingRecord?.workMode === "WFH" && existingRecord.checkInAt) {
    return {
      success: true,
      info: "You have already checked in for WFH today. Please proceed to the dashboard to submit your report.",
      redirectUrl: getDashboardPath(user.role),
    };
  }

  // B. Jika ada pengajuan Izin/Sakit/Cuti yang disetujui untuk hari ini
  if (approvedRequest) {
    const requestLabel =
      approvedRequest.type === "SICK"
        ? "Sick Leave"
        : approvedRequest.type === "LEAVE"
          ? "Annual Leave"
          : approvedRequest.type === "DISPENSATION"
            ? "Dispensation"
            : "Personal Leave";
    return {
      success: true,
      info: `Your schedule today is ${requestLabel}.`,
      redirectUrl: getDashboardPath(user.role),
    };
  }

  // C. Jika hari ini adalah Hari Libur Nasional / Cuti Bersama atau Libur Mingguan (dan tidak ada jadwal WFO khusus / Hari Pengganti)
  const isHardHoliday = holiday?.type === "NATIONAL_HOLIDAY" || holiday?.type === "COMPANY_LEAVE";
  const isOptionalMondayWfo = dayOfWeek === 1 && !isHardHoliday && personalSchedule?.workMode !== "WFH";
  const isWeekendOrHoliday =
    ((holiday && !replacementWorkday) ||
      (weeklyRule?.isWorkday === false && personalSchedule?.workMode !== "WFO" && !replacementWorkday)) &&
    !isOptionalMondayWfo;
  if (isWeekendOrHoliday) {
    return {
      success: true,
      info: "Today is a Holiday / Off Day.",
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
          ownerStudioId: user.defaultStudioId ?? currentStudioId,
          locationStudioId: currentStudioId,
          workMode: "WFO",
          status: "ALPHA",
          locationValidationStatus,
          checkInLatitude: userLat,
          checkInLongitude: userLng,
          distanceMeters: distance,
          createdById: user.id,
        },
      });

      return {
        success: true,
        warning: "Attendance cutoff time (12:00 PM) has passed. Status recorded as Alpha.",
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
        ownerStudioId: user.defaultStudioId ?? currentStudioId,
        locationStudioId: currentStudioId,
        workMode: "WFO",
        status,
        checkInAt: now,
        locationValidationStatus,
        checkInLatitude: userLat,
        checkInLongitude: userLng,
        distanceMeters: distance,
        lateMinutes,
        createdById: user.id,
      },
    });

    const successMsg = status === "LATE"
      ? `WFO Check-in successful (${lateMinutes} mins late).`
      : "WFO Check-in successful (On Time).";

    return {
      success: true,
      message: successMsg,
      redirectUrl: "/member/mood",
    };
  } else {
    // Check-out WFO
    if (existingRecord.checkInAt && existingRecord.checkOutAt) {
      await clearSession();
      return {
        success: true,
        message: "You have already checked out today.",
        redirectUrl: "/login?success=done",
      };
    }

    if (existingRecord.checkInAt && !existingRecord.checkOutAt) {
      if (action === "checkout") {
        const checkoutEligibility = getCheckoutEligibility({
          checkInAt: existingRecord.checkInAt,
          now,
          policy,
        });

        if (!checkoutEligibility.isAllowed) {
          return {
            success: false,
            error: `Check-out opens at ${formatMinutesAsClock(checkoutEligibility.allowedCheckoutMinutes)}. ${checkoutEligibility.remainingMinutes} minutes remaining.`,
          };
        }

        await prisma.$transaction(async (tx) => {
          const extraWorkday = await isExtraWorkday(attendanceDate, currentStudioId);
          const record = await tx.attendanceRecord.findUnique({
            where: { id: existingRecord.id },
            select: { extraWorkdayBalanceApplied: true },
          });
          const applyExtra = extraWorkday && !record?.extraWorkdayBalanceApplied;

          await tx.attendanceRecord.update({
            where: { id: existingRecord.id },
            data: {
              checkOutAt: now,
              checkOutLatitude: userLat,
              checkOutLongitude: userLng,
              locationValidationStatus,
              distanceMeters: distance,
              earlyCheckoutMinutes: checkoutEligibility.earlyCheckoutMinutes,
              ...(applyExtra && { extraWorkdayBalanceApplied: true }),
              updatedAt: now,
            },
          });

          if (applyExtra) {
            await tx.user.update({
              where: { id: user.id },
              data: {
                workDayBalance: {
                  increment: 1,
                },
              },
            });
          }
        });
        await clearSession();
        return {
          success: true,
          message: "WFO Check-out successful.",
          redirectUrl: "/login?success=checkout",
        };
      }

      // Hanya login kembali ke dashboard tanpa mengubah status check-in yang sudah ada
      return {
        success: true,
        message: "Already checked in today. Opening dashboard...",
        redirectUrl: getDashboardPath(user.role),
      };
    }

    // fallback jika status record aneh
    return { success: true, redirectUrl: getDashboardPath(user.role) };
  }
}

