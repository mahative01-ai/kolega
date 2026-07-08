"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  type AppRole,
  getDashboardPath,
  hashPassword,
  requireAnyRole,
  verifyPassword,
  clearSession,
} from "@/lib/auth";
import {
  dateOnlyFromKey,
  getDayOfWeek,
  getJakartaDateKey,
  getJakartaMinutes,
  timeToMinutes,
} from "@/lib/attendance-time";
import { prisma } from "@/lib/prisma";

function createQrUid() {
  return `MHT-${randomUUID().slice(0, 8).toUpperCase()}`;
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function revalidatePersonalAttendance(role: AppRole) {
  revalidatePath(getDashboardPath(role));
  revalidatePath("/member/presensi");
  revalidatePath("/member/presensi/riwayat");
}

export async function createPersonalQrCredentialAction() {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);

  const existingCredential = await prisma.qrCredential.findFirst({
    where: {
      userId: currentUser.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  const dashboardPath = currentUser.role === "ADMIN" ? "/admin" : "/member";

  if (existingCredential) {
    redirect(dashboardPath);
  }

  const qrUid = createQrUid();

  await prisma.qrCredential.create({
    data: {
      userId: currentUser.id,
      qrUid,
      tokenHash: hashPassword(qrUid),
      createdById: currentUser.id,
    },
  });

  revalidatePath(dashboardPath);
  redirect(`${dashboardPath}?success=qr-created`);
}

// ─── WFO Attendance Submission (Camera/QR scan at office) ──────────────────

export async function submitWfoAttendanceAction(formData: FormData) {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const qrUid = String(formData.get("qrUid") ?? "").trim();

  if (!qrUid) {
    redirect("/member/presensi?error=qr");
  }

  // Check active placement
  const activePlacement = await prisma.placement.findFirst({
    where: {
      userId: currentUser.id,
      status: "ACTIVE",
    },
    select: {
      studioId: true,
    },
  });
  const currentStudioId = activePlacement?.studioId ?? currentUser.defaultStudioId;

  if (!currentStudioId) {
    redirect("/member/presensi?error=studio");
  }

  const credential = await prisma.qrCredential.findUnique({
    where: {
      qrUid,
    },
    select: {
      id: true,
      userId: true,
      tokenHash: true,
      status: true,
    },
  });

  if (
    !credential ||
    credential.userId !== currentUser.id ||
    credential.status !== "ACTIVE" ||
    !verifyPassword(qrUid, credential.tokenHash)
  ) {
    redirect("/member/presensi?error=qr");
  }

  const now = new Date();
  const todayKey = getJakartaDateKey(now);
  const attendanceDate = dateOnlyFromKey(todayKey);
  const dayOfWeek = getDayOfWeek(todayKey);

  const [policy, personalSchedule, weeklyRule, holiday, replacementWorkday, existingRecord] =
    await Promise.all([
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
      },
    }),
    prisma.personalWorkSchedule.findUnique({
      where: {
        userId_workDate: {
          userId: currentUser.id,
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
      select: { id: true },
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
    prisma.attendanceRecord.findUnique({
      where: {
        userId_attendanceDate: {
          userId: currentUser.id,
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
  ]);

  const isWeekendOrHoliday = (holiday && !replacementWorkday) || (weeklyRule?.isWorkday === false && personalSchedule?.workMode !== "WFO" && !replacementWorkday);

  // WFO override WFH: Block WFO scan only if they already checked in WFH
  if (existingRecord?.workMode === "WFH" && existingRecord.checkInAt) {
    redirect("/member/presensi?error=mode");
  }

  if (isWeekendOrHoliday) {
    redirect("/member/presensi?error=mode");
  }

  if (existingRecord?.workMode && existingRecord.workMode !== "WFO") {
    redirect("/member/presensi?error=mode");
  }

  if (existingRecord?.status === "ALPHA") {
    redirect("/member/presensi?error=alpha");
  }

  if (existingRecord?.checkInAt && existingRecord.checkOutAt) {
    redirect("/member/presensi?success=done");
  }

  if (existingRecord?.checkInAt && !existingRecord.checkOutAt) {
    const result = await prisma.attendanceRecord.updateMany({
      where: {
        id: existingRecord.id,
        checkOutAt: null,
      },
      data: {
        checkOutAt: now,
        updatedAt: now,
      },
    });

    revalidatePersonalAttendance(currentUser.role);
    const dashboardPath = currentUser.role === "ADMIN" ? "/admin" : "/member/presensi";
    if (result.count === 1) {
      redirect(`${dashboardPath}?success=checkout`);
    } else {
      redirect(`${dashboardPath}?success=done`);
    }
  }

  if (!existingRecord || !existingRecord.checkInAt) {
    const unfinishedRecord = await prisma.attendanceRecord.findFirst({
      where: {
        userId: currentUser.id,
        checkInAt: { not: null },
        checkOutAt: null,
        attendanceDate: { lt: attendanceDate },
      },
      select: { id: true },
    });

    if (unfinishedRecord) {
      redirect("/member/presensi?error=missing-checkout");
    }
  }

  const scheduledMinutes = timeToMinutes(policy?.checkInTime, "08:00");
  const graceMinutes = policy?.graceMinutes ?? 10;
  const currentMinutes = getJakartaMinutes(now);
  const alphaCutoffMinutes = timeToMinutes(
    policy?.alphaCutoffTime,
    "12:00"
  );

  if (currentMinutes >= alphaCutoffMinutes) {
    if (!existingRecord) {
      await prisma.attendanceRecord.createMany({
        data: {
          userId: currentUser.id,
          attendanceDate,
          ownerStudioId: currentUser.defaultStudioId ?? currentStudioId,
          locationStudioId: currentStudioId,
          workMode: "WFO",
          status: "ALPHA",
          locationValidationStatus: "NOT_REQUIRED",
        },
        skipDuplicates: true,
      });
    }

    revalidatePersonalAttendance(currentUser.role);
    redirect("/member/presensi?error=alpha");
  }

  if (
    existingRecord &&
    !existingRecord.checkInAt &&
    !["PRESENT", "ON_TIME", "LATE"].includes(existingRecord.status)
  ) {
    redirect("/member/presensi?error=mode");
  }

  const rawLateMinutes = Math.max(0, currentMinutes - scheduledMinutes);
  const status = rawLateMinutes > graceMinutes ? "LATE" : "ON_TIME";
  const lateMinutes = status === "LATE" ? rawLateMinutes : 0;

  if (existingRecord && !existingRecord.checkInAt) {
    await prisma.attendanceRecord.updateMany({
      where: {
        id: existingRecord.id,
        checkInAt: null,
      },
      data: {
        workMode: "WFO",
        status,
        checkInAt: now,
        ownerStudioId: currentUser.defaultStudioId ?? currentStudioId,
        locationStudioId: currentStudioId,
        locationValidationStatus: "NOT_REQUIRED",
        lateMinutes,
      },
    });
  } else {
    try {
      await prisma.attendanceRecord.create({
        data: {
          userId: currentUser.id,
          attendanceDate,
          ownerStudioId: currentUser.defaultStudioId ?? currentStudioId,
          locationStudioId: currentStudioId,
          workMode: "WFO",
          status,
          checkInAt: now,
          locationValidationStatus: "NOT_REQUIRED",
          lateMinutes,
          createdById: currentUser.id,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        redirect("/member/presensi?success=checkin");
      }

      throw error;
    }
  }

  revalidatePersonalAttendance(currentUser.role);
  redirect("/member/presensi?success=checkin");
}

// ─── WFH Attendance Submission (Work plans & reports) ──────────────────────

export async function submitWfhAttendanceAction(formData: FormData) {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);

  // Check active placement
  const activePlacement = await prisma.placement.findFirst({
    where: {
      userId: currentUser.id,
      status: "ACTIVE",
    },
    select: {
      studioId: true,
    },
  });
  const currentStudioId = activePlacement?.studioId ?? currentUser.defaultStudioId;

  if (!currentStudioId) {
    redirect("/member/presensi?error=studio");
  }

  const now = new Date();
  const todayKey = getJakartaDateKey(now);
  const attendanceDate = dateOnlyFromKey(todayKey);

  // 1. Ambil jadwal personal hari ini
  const personalSchedule = await prisma.personalWorkSchedule.findUnique({
    where: {
      userId_workDate: {
        userId: currentUser.id,
        workDate: attendanceDate,
      },
    },
    select: {
      workMode: true,
    },
  });

  if (personalSchedule?.workMode !== "WFH") {
    redirect("/member/presensi?error=mode");
  }

  // 2. Cari record kehadiran hari ini
  const existingRecord = await prisma.attendanceRecord.findUnique({
    where: {
      userId_attendanceDate: {
        userId: currentUser.id,
        attendanceDate,
      },
    },
    select: {
      id: true,
      checkInAt: true,
      checkOutAt: true,
    },
  });

  // 3. Proses check-in atau check-out
  if (!existingRecord) {
    const unfinishedRecord = await prisma.attendanceRecord.findFirst({
      where: {
        userId: currentUser.id,
        checkInAt: { not: null },
        checkOutAt: null,
        attendanceDate: { lt: attendanceDate },
      },
      select: { id: true },
    });

    if (unfinishedRecord) {
      redirect("/member/presensi?error=missing-checkout");
    }

    // Check-in WFH
    const wfhPlan = String(formData.get("wfhPlan") ?? "").trim();
    if (!wfhPlan) {
      throw new Error("Rencana kerja WFH wajib diisi.");
    }

    try {
      await prisma.attendanceRecord.create({
        data: {
          userId: currentUser.id,
          attendanceDate,
          ownerStudioId: currentUser.defaultStudioId ?? currentStudioId,
          locationStudioId: currentStudioId,
          workMode: "WFH",
          status: "WFH",
          checkInAt: now,
          wfhPlan,
          locationValidationStatus: "NOT_REQUIRED",
          createdById: currentUser.id,
        },
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        redirect("/member/presensi?success=checkin");
      }
      throw error;
    }

    revalidatePersonalAttendance(currentUser.role);
    redirect("/member/presensi?success=checkin");
  } else {
    // Check-out WFH
    if (existingRecord.checkInAt && existingRecord.checkOutAt) {
      redirect("/member/presensi?success=done");
    }

    const wfhReport = String(formData.get("wfhReport") ?? "").trim();
    if (!wfhReport) {
      throw new Error("Laporan kerja WFH wajib diisi.");
    }

    await prisma.attendanceRecord.update({
      where: {
        id: existingRecord.id,
      },
      data: {
        checkOutAt: now,
        wfhReport,
        updatedAt: now,
      },
    });

    revalidatePersonalAttendance(currentUser.role);
    const dashboardPath = currentUser.role === "ADMIN" ? "/admin" : "/member/presensi";
    redirect(`${dashboardPath}?success=checkout`);
  }
}
