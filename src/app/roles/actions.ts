"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/calendar";

const ACCOUNT_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;

function parseDateInput(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return Number.isNaN(date.getTime()) ? null : date;
}

async function validateStudioAssignment(
  defaultStudioId: string | null,
  placementStudioId: string | null
) {
  if (!defaultStudioId) {
    throw new Error("Default Studio wajib dipilih.");
  }

  if (placementStudioId === defaultStudioId) {
    throw new Error("Placement harus berbeda dari Default Studio.");
  }

  const studioIds = [...new Set([defaultStudioId, placementStudioId].filter(Boolean))] as string[];
  const studioCount = await prisma.studio.count({
    where: { id: { in: studioIds }, isActive: true },
  });

  if (studioCount !== studioIds.length) {
    throw new Error("Studio yang dipilih tidak tersedia atau sudah nonaktif.");
  }
}

function readInternData(formData: FormData) {
  const program =
    String(formData.get("program") ?? "") === "PKL"
      ? ("PKL" as const)
      : ("MAGANG" as const);
  const institution = String(formData.get("institution") ?? "").trim();
  const startDate = parseDateInput(String(formData.get("startDate") ?? ""));
  const endDate = parseDateInput(String(formData.get("endDate") ?? ""));
  const mentorId = String(formData.get("mentorId") ?? "") || null;

  if (!institution || !startDate || !endDate) {
    throw new Error(
      "Data magang (institusi, tanggal mulai, dan tanggal selesai) wajib diisi untuk Intern."
    );
  }

  if (endDate < startDate) {
    throw new Error("Tanggal selesai Intern tidak boleh sebelum tanggal mulai.");
  }

  return { program, institution, startDate, endDate, mentorId };
}

async function validateMentor(mentorId: string | null) {
  if (!mentorId) {
    return;
  }

  const mentor = await prisma.user.findFirst({
    where: {
      id: mentorId,
      role: { in: ["ADMIN", "SUPER_ADMIN"] },
      accountStatus: "ACTIVE",
    },
    select: { id: true },
  });

  if (!mentor) {
    throw new Error("Mentor yang dipilih tidak tersedia.");
  }
}

export async function createUserAction(formData: FormData) {
  try {
    const actor = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);
    const role = String(formData.get("role") ?? "") === "ADMIN" ? "ADMIN" : "MEMBER";

    // If Admin, they can only create MEMBER role
    if (actor.role === "ADMIN" && role !== "MEMBER") {
      throw new Error("Anda tidak diizinkan membuat akun dengan hak akses Admin.");
    }

    const name = String(formData.get("name") ?? "").trim();
    const username =
      String(formData.get("username") ?? "").trim().toLowerCase() || null;
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");
    const birthDateStr = String(formData.get("birthDate") ?? "") || null;
    const memberStatus = String(formData.get("memberStatus") ?? "") === "INTERN" ? "INTERN" : "TEAM";
    const defaultStudioId = String(formData.get("defaultStudioId") ?? "") || null;
    const annualLeaveBalanceInput = formData.get("annualLeaveBalance");
    const annualLeaveBalance = memberStatus === "INTERN" ? 0 : (annualLeaveBalanceInput ? Number(annualLeaveBalanceInput) : 12);
    const placementStudioId = memberStatus === "INTERN" ? (String(formData.get("placementStudioId") ?? "") || null) : null;
    const picketDay = String(formData.get("picketDay") ?? "") || null;

    if (!name || !email || password.length < 6) {
      throw new Error("Nama, email, dan password minimal 6 karakter wajib diisi.");
    }

    if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) {
      throw new Error(
        "Username harus 3-30 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda hubung."
      );
    }

    if (actor.role !== "SUPER_ADMIN" && actor.defaultStudioId) {
      if (defaultStudioId !== actor.defaultStudioId) {
        throw new Error("Anda hanya diperbolehkan membuat anggota untuk studio Anda sendiri.");
      }
      if (placementStudioId && placementStudioId !== actor.defaultStudioId) {
        throw new Error("Anda hanya diperbolehkan menugaskan placement untuk studio Anda sendiri.");
      }
    }

    await validateStudioAssignment(defaultStudioId, placementStudioId);

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      throw new Error("Email sudah terdaftar.");
    }

    if (username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (existingUsername) {
        throw new Error("Username sudah digunakan.");
      }
    }

    const birthDate = birthDateStr ? parseDateInput(birthDateStr) : null;

    if (birthDateStr && !birthDate) {
      throw new Error("Tanggal lahir tidak valid.");
    }

    const internData =
      memberStatus === "INTERN" ? readInternData(formData) : null;
    await validateMentor(internData?.mentorId ?? null);

    await prisma.$transaction(async (tx) => {
      // 1. Create User
      const user = await tx.user.create({
        data: {
          name,
          email,
          username,
          birthDate,
          passwordHash: hashPassword(password),
          role,
          memberStatus,
          accountStatus: "ACTIVE",
          annualLeaveBalance,
          defaultStudioId,
          picketDay,
        },
        select: { id: true },
      });

      // 2. If placement studio is chosen
      if (placementStudioId) {
        await tx.placement.create({
          data: {
            userId: user.id,
            studioId: placementStudioId,
            startDate: dateOnly(),
            status: "ACTIVE",
            reason: "Placement awal dari manajemen akun",
            createdById: actor.id,
          },
        });
      }

      // 3. If Intern, create profile
      if (memberStatus === "INTERN") {
        await tx.internProfile.create({
          data: {
            userId: user.id,
            ...internData!,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          entity: "User",
          entityId: user.id,
          action: "USER_CREATED_BY_SUPER_ADMIN",
          metadata: {
            role,
            memberStatus,
            defaultStudioId,
            placementStudioId,
            username,
          },
        },
      });
    });

    revalidatePath("/roles");
    revalidatePath("/super-admin");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal membuat user." };
  }
}

export async function updateUserAction(formData: FormData) {
  try {
    const actor = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);
    const role = String(formData.get("role") ?? "") === "ADMIN" ? "ADMIN" : "MEMBER";

    // If Admin, they can only update to MEMBER role
    if (actor.role === "ADMIN" && role !== "MEMBER") {
      throw new Error("Anda tidak diizinkan mengubah role anggota menjadi Admin.");
    }

    const userId = String(formData.get("userId") ?? "");
    const name = String(formData.get("name") ?? "").trim();
    const username =
      String(formData.get("username") ?? "").trim().toLowerCase() || null;
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const birthDateStr = String(formData.get("birthDate") ?? "") || null;
    const memberStatus = String(formData.get("memberStatus") ?? "") === "INTERN" ? "INTERN" : "TEAM";
    const requestedAccountStatus = String(formData.get("accountStatus") ?? "");
    const accountStatus = ACCOUNT_STATUSES.find(
      (status) => status === requestedAccountStatus
    );
    const defaultStudioId = String(formData.get("defaultStudioId") ?? "") || null;
    const placementStudioId = memberStatus === "INTERN" ? (String(formData.get("placementStudioId") ?? "") || null) : null;
    const picketDay = String(formData.get("picketDay") ?? "") || null;
    const annualLeaveBalanceInput = formData.get("annualLeaveBalance");
    const annualLeaveBalance = memberStatus === "INTERN" ? 0 : (annualLeaveBalanceInput ? Number(annualLeaveBalanceInput) : 12);

    if (!userId || !name || !email || !accountStatus) {
      throw new Error("ID, Nama, dan Email wajib diisi.");
    }

    if (username && !/^[a-z0-9._-]{3,30}$/.test(username)) {
      throw new Error(
        "Username harus 3-30 karakter dan hanya boleh berisi huruf kecil, angka, titik, garis bawah, atau tanda hubung."
      );
    }

    await validateStudioAssignment(defaultStudioId, placementStudioId);

    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        email: true,
        username: true,
        accountStatus: true,
        defaultStudioId: true,
      },
    });

    if (!target || target.role === "SUPER_ADMIN") {
      throw new Error("User tidak ditemukan atau tidak dapat diubah.");
    }

    if (actor.role === "ADMIN") {
      if (target.role !== "MEMBER") {
        throw new Error("Anda tidak diizinkan mengubah data Admin lainnya.");
      }
      if (role !== "MEMBER") {
        throw new Error("Anda tidak diizinkan mengubah role anggota menjadi Admin.");
      }
    }

    if (actor.role !== "SUPER_ADMIN" && actor.defaultStudioId) {
      if (target.defaultStudioId !== actor.defaultStudioId) {
        throw new Error("Anda hanya diperbolehkan mengubah user dari studio Anda sendiri.");
      }
      if (defaultStudioId !== actor.defaultStudioId) {
        throw new Error("Anda hanya diperbolehkan mengubah default studio ke studio Anda sendiri.");
      }
      if (placementStudioId && placementStudioId !== actor.defaultStudioId) {
        throw new Error("Anda hanya diperbolehkan menugaskan placement untuk studio Anda sendiri.");
      }
      const mentorId = memberStatus === "INTERN" ? String(formData.get("mentorId") ?? "") || null : null;
      if (mentorId) {
        const mentor = await prisma.user.findFirst({
          where: { id: mentorId, defaultStudioId: actor.defaultStudioId },
          select: { id: true }
        });
        if (!mentor) {
          throw new Error("Mentor yang dipilih harus berasal dari studio yang sama.");
        }
      }
    } else {
      // For Super Admin
      const mentorId = memberStatus === "INTERN" ? String(formData.get("mentorId") ?? "") || null : null;
      if (mentorId) {
        const mentor = await prisma.user.findFirst({
          where: { id: mentorId, defaultStudioId: defaultStudioId || undefined },
          select: { id: true }
        });
        if (!mentor) {
          throw new Error("Mentor yang dipilih harus berasal dari studio yang sama dengan user.");
        }
      }
    }

    // Check unique constraints if changed
    if (email !== target.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingEmail) {
        throw new Error("Email sudah terdaftar.");
      }
    }

    if (username && username !== target.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
      });
      if (existingUsername) {
        throw new Error("Username sudah digunakan.");
      }
    }

    const birthDate = birthDateStr ? parseDateInput(birthDateStr) : null;

    if (birthDateStr && !birthDate) {
      throw new Error("Tanggal lahir tidak valid.");
    }

    const internData =
      memberStatus === "INTERN" ? readInternData(formData) : null;
    await validateMentor(internData?.mentorId ?? null);

    await prisma.$transaction(async (tx) => {
      // 1. Update User fields
      await tx.user.update({
        where: { id: userId },
        data: {
          name,
          email,
          username,
          birthDate,
          role,
          memberStatus,
          accountStatus,
          annualLeaveBalance,
          defaultStudioId,
          picketDay,
        },
      });

      // 2. Handle InternProfile transitions
      if (memberStatus === "INTERN") {
        await tx.internProfile.upsert({
          where: { userId },
          update: {
            ...internData!,
          },
          create: {
            userId,
            ...internData!,
          },
        });
      } else {
        // If changed to TEAM, delete profile if exists
        const existingProfile = await tx.internProfile.findUnique({
          where: { userId },
        });
        if (existingProfile) {
          await tx.internProfile.delete({
            where: { userId },
          });
        }
      }

      // 3. Handle Placement transitions
      const activePlacement = await tx.placement.findFirst({
        where: {
          userId,
          status: "ACTIVE",
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          studioId: true,
        },
      });

      if (!placementStudioId && activePlacement) {
        await tx.placement.update({
          where: { id: activePlacement.id },
          data: {
            status: "COMPLETED",
            endDate: dateOnly(),
          },
        });
      }

      if (
        placementStudioId &&
        (!activePlacement || activePlacement.studioId !== placementStudioId)
      ) {
        await tx.placement.updateMany({
          where: {
            userId,
            status: "ACTIVE",
          },
          data: {
            status: "COMPLETED",
            endDate: dateOnly(),
          },
        });

        await tx.placement.create({
          data: {
            userId,
            studioId: placementStudioId,
            startDate: dateOnly(),
            status: "ACTIVE",
            reason: "Diatur dari manajemen akun",
            createdById: actor.id,
          },
        });
      }

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId: actor.id,
          entity: "User",
          entityId: userId,
          action:
            accountStatus !== target.accountStatus
              ? "ACCOUNT_STATUS_APPROVED_BY_SUPER_ADMIN"
              : "USER_UPDATED_BY_SUPER_ADMIN",
          metadata: {
            name,
            username,
            email,
            role,
            memberStatus,
            accountStatus,
            previousAccountStatus: target.accountStatus,
            defaultStudioId,
            placementStudioId,
          },
        },
      });
    });

    revalidatePath("/roles");
    revalidatePath("/super-admin");
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : "Gagal memperbarui user." };
  }
}
