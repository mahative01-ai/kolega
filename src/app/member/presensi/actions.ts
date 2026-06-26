"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { hashPassword, requireRole, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const JAKARTA_TIME_ZONE = "Asia/Jakarta";

function getJakartaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}

function getJakartaMinutes(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? 0);
  const minute = Number(
    parts.find((part) => part.type === "minute")?.value ?? 0
  );

  return hour * 60 + minute;
}

function dateOnlyFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function timeToMinutes(time: string | null | undefined, fallback: string) {
  const [hour, minute] = (time || fallback).split(":").map(Number);

  return hour * 60 + minute;
}

function createQrUid() {
  return `MHT-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export async function createMemberQrCredentialAction() {
  const currentUser = await requireRole("MEMBER");

  const existingCredential = await prisma.qrCredential.findFirst({
    where: {
      userId: currentUser.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
    },
  });

  if (existingCredential) {
    redirect("/member/presensi");
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

  revalidatePath("/member/presensi");
  redirect("/member/presensi?success=qr-created");
}

export async function submitWfoAttendanceAction(formData: FormData) {
  const currentUser = await requireRole("MEMBER");
  const qrUid = String(formData.get("qrUid") ?? "").trim();

  if (!qrUid) {
    redirect("/member/presensi?error=qr");
  }

  if (!currentUser.defaultStudioId) {
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

  const [policy, existingRecord] = await Promise.all([
    prisma.attendancePolicy.findFirst({
      where: {
        studioId: currentUser.defaultStudioId,
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        checkInTime: true,
        graceMinutes: true,
      },
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

  if (existingRecord?.workMode && existingRecord.workMode !== "WFO") {
    redirect("/member/presensi?error=mode");
  }

  if (existingRecord?.checkInAt && existingRecord.checkOutAt) {
    redirect("/member/presensi?success=done");
  }

  if (existingRecord?.checkInAt && !existingRecord.checkOutAt) {
    await prisma.attendanceRecord.update({
      where: {
        id: existingRecord.id,
      },
      data: {
        checkOutAt: now,
        updatedAt: now,
      },
    });

    revalidatePath("/member");
    revalidatePath("/member/presensi");
    redirect("/member/presensi?success=checkout");
  }

  const scheduledMinutes = timeToMinutes(policy?.checkInTime, "08:00");
  const graceMinutes = policy?.graceMinutes ?? 10;
  const currentMinutes = getJakartaMinutes(now);
  const rawLateMinutes = Math.max(0, currentMinutes - scheduledMinutes);
  const status = rawLateMinutes > graceMinutes ? "LATE" : "ON_TIME";
  const lateMinutes = status === "LATE" ? rawLateMinutes : 0;

  if (existingRecord && !existingRecord.checkInAt) {
    await prisma.attendanceRecord.update({
      where: {
        id: existingRecord.id,
      },
      data: {
        workMode: "WFO",
        status,
        checkInAt: now,
        ownerStudioId: currentUser.defaultStudioId,
        locationStudioId: currentUser.defaultStudioId,
        locationValidationStatus: "NOT_REQUIRED",
        lateMinutes,
      },
    });
  } else {
    await prisma.attendanceRecord.create({
      data: {
        userId: currentUser.id,
        attendanceDate,
        ownerStudioId: currentUser.defaultStudioId,
        locationStudioId: currentUser.defaultStudioId,
        workMode: "WFO",
        status,
        checkInAt: now,
        locationValidationStatus: "NOT_REQUIRED",
        lateMinutes,
        createdById: currentUser.id,
      },
    });
  }

  revalidatePath("/member");
  revalidatePath("/member/presensi");
  redirect("/member/presensi?success=checkin");
}
