"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireUser, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// ─── WeeklyWorkRule upsert (bulk 7 hari per studio) ─────────────────────────

type DayRule = {
  dayOfWeek: number; // 0=Sun, 1=Mon, ... 6=Sat
  isWorkday: boolean;
  isOptional: boolean;
  workStartTime: string;
  workEndTime: string;
};

export async function upsertWeeklyWorkRulesAction(studioId: string, rules: DayRule[]) {
  const user = await requireRole("SUPER_ADMIN");

  const isGlobalSuperAdmin = user.role === "SUPER_ADMIN";
  if (!isGlobalSuperAdmin && studioId !== user.defaultStudioId) {
    throw new Error("Anda hanya diperbolehkan mengelola aturan kerja untuk studio Anda sendiri.");
  }

  // Verify studio exists
  const studio = await prisma.studio.findUnique({ where: { id: studioId }, select: { id: true } });
  if (!studio) throw new Error("Studio tidak ditemukan.");

  await prisma.$transaction(
    rules.map((rule) =>
      prisma.weeklyWorkRule.upsert({
        where: { studioId_dayOfWeek: { studioId, dayOfWeek: rule.dayOfWeek } },
        create: {
          studioId,
          dayOfWeek: rule.dayOfWeek,
          isWorkday: rule.isWorkday,
          isOptional: rule.isOptional,
          workStartTime: rule.workStartTime,
          workEndTime: rule.workEndTime,
        },
        update: {
          isWorkday: rule.isWorkday,
          isOptional: rule.isOptional,
          workStartTime: rule.workStartTime,
          workEndTime: rule.workEndTime,
        },
      })
    )
  );

  revalidatePath("/settings");
  revalidatePath("/schedules");
}

// ─── Update Studio weekStartDay ──────────────────────────────────────────────

export async function updateStudioWeekStartAction(studioId: string, weekStartDay: number) {
  const user = await requireRole("SUPER_ADMIN");

  const isGlobalSuperAdmin = user.role === "SUPER_ADMIN";
  if (!isGlobalSuperAdmin && studioId !== user.defaultStudioId) {
    throw new Error("Anda hanya diperbolehkan mengubah hari awal kerja untuk studio Anda sendiri.");
  }

  await prisma.studio.update({ where: { id: studioId }, data: { weekStartDay } });
  revalidatePath("/settings");
}

// ─── Self-Service Profile Update ─────────────────────────────────────────────

export async function updateProfileAction(formData: FormData) {
  const actor = await requireUser();

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmNewPassword = String(formData.get("confirmNewPassword") ?? "");
  const birthDateStr = formData.get("birthDate") ? String(formData.get("birthDate")) : null;
  const phoneNumber = formData.get("phoneNumber") ? String(formData.get("phoneNumber")).trim() : null;
  const address = formData.get("address") ? String(formData.get("address")).trim() : null;
  if (!name || !email) {
    throw new Error("Nama dan Email wajib diisi.");
  }

  // Validate username format
  if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) {
    throw new Error(
      "Username harus 3-30 karakter and hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda hubung."
    );
  }

  // Fetch full user including username to compare
  const fullUser = await prisma.user.findUnique({
    where: { id: actor.id },
    select: { email: true, username: true }
  });

  if (!fullUser) {
    throw new Error("User tidak ditemukan.");
  }

  // Validate unique email
  if (email !== fullUser.email) {
    const existingEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existingEmail) {
      throw new Error("Email sudah terdaftar.");
    }
  }

  // Validate unique username
  if (username && username !== fullUser.username) {
    const existingUsername = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (existingUsername) {
      throw new Error("Username sudah digunakan.");
    }
  }

  // Validate password update
  let passwordHash: string | undefined = undefined;
  if (newPassword) {
    if (newPassword.length < 6) {
      throw new Error("Password baru minimal 6 karakter.");
    }
    if (newPassword !== confirmNewPassword) {
      throw new Error("Konfirmasi password baru tidak cocok.");
    }
    passwordHash = hashPassword(newPassword);
  }

  let birthDate: Date | null = null;
  if (birthDateStr) {
    birthDate = new Date(birthDateStr);
    if (isNaN(birthDate.getTime())) {
      throw new Error("Format tanggal lahir tidak valid.");
    }
  }

  // Update profile
  await prisma.user.update({
    where: { id: actor.id },
    data: {
      name,
      username,
      email,
      birthDate,
      phoneNumber,
      address,
      ...(passwordHash ? { passwordHash } : {}),
    },
  });

  revalidatePath("/settings");
}

export async function updateMoodAction(formData: FormData) {
  const actor = await requireUser();
  const currentMood = String(formData.get("currentMood") ?? "NEUTRAL").trim().toUpperCase();
  const moodNote = formData.get("moodNote") ? String(formData.get("moodNote")).trim() : null;

  await prisma.user.update({
    where: { id: actor.id },
    data: {
      currentMood,
      moodNote,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/member");
}

// ─── Update Studio Attendance Policy ─────────────────────────────────────────

export async function updateStudioPolicyAction(
  studioId: string,
  policyData: {
    checkInTime: string;
    checkOutTime: string;
    graceMinutes: number;
    alphaCutoffTime: string;
  }
) {
  const user = await requireRole("SUPER_ADMIN");

  const isGlobalSuperAdmin = user.role === "SUPER_ADMIN";
  if (!isGlobalSuperAdmin && studioId !== user.defaultStudioId) {
    throw new Error("Anda hanya diperbolehkan mengubah kebijakan untuk studio Anda sendiri.");
  }

  // Verify studio exists
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true },
  });
  if (!studio) throw new Error("Studio tidak ditemukan.");

  // Deactivate old active policies for this studio
  await prisma.attendancePolicy.updateMany({
    where: { studioId, isActive: true },
    data: { isActive: false },
  });

  // Create new active policy
  await prisma.attendancePolicy.create({
    data: {
      studioId,
      checkInTime: policyData.checkInTime,
      checkOutTime: policyData.checkOutTime,
      graceMinutes: policyData.graceMinutes,
      alphaCutoffTime: policyData.alphaCutoffTime,
      isActive: true,
      createdById: user.id,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/calendar");
  revalidatePath("/schedules");
}

// ─── Update Studio Geofence & Location ───────────────────────────────────────

export async function updateStudioGeofenceAction(
  studioId: string,
  geofenceData: {
    latitude: number | null;
    longitude: number | null;
    radiusMeters: number;
  }
) {
  const user = await requireRole("SUPER_ADMIN");

  const isGlobalSuperAdmin = user.role === "SUPER_ADMIN";
  if (!isGlobalSuperAdmin && studioId !== user.defaultStudioId) {
    throw new Error("Anda hanya diperbolehkan mengubah geofence untuk studio Anda sendiri.");
  }

  // Verify studio exists
  const studio = await prisma.studio.findUnique({
    where: { id: studioId },
    select: { id: true },
  });
  if (!studio) throw new Error("Studio tidak ditemukan.");

  await prisma.studio.update({
    where: { id: studioId },
    data: {
      latitude: geofenceData.latitude,
      longitude: geofenceData.longitude,
      radiusMeters: geofenceData.radiusMeters,
    },
  });

  revalidatePath("/settings");
}
