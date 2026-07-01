"use server";

import { revalidatePath } from "next/cache";
import { requireRole, hashPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { dateOnly } from "@/lib/calendar";

async function requireSuperAdminActor() {
  return requireRole("SUPER_ADMIN");
}

export async function createUserAction(formData: FormData) {
  const actor = await requireSuperAdminActor();

  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const birthDateStr = String(formData.get("birthDate") ?? "") || null;
  const role = String(formData.get("role") ?? "") === "ADMIN" ? "ADMIN" : "MEMBER";
  const memberStatus = String(formData.get("memberStatus") ?? "") === "INTERN" ? "INTERN" : "TEAM";
  const defaultStudioId = String(formData.get("defaultStudioId") ?? "") || null;
  const placementStudioId = String(formData.get("placementStudioId") ?? "") || null;

  if (!name || !email || password.length < 6) {
    throw new Error("Nama, email, dan password minimal 6 karakter wajib diisi.");
  }

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

  const birthDate = birthDateStr ? new Date(birthDateStr) : null;

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
        defaultStudioId,
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
      const program = String(formData.get("program") ?? "") === "PKL" ? "PKL" : "MAGANG";
      const institution = String(formData.get("institution") ?? "").trim();
      const startDateStr = String(formData.get("startDate") ?? "");
      const endDateStr = String(formData.get("endDate") ?? "");
      const mentorId = String(formData.get("mentorId") ?? "") || null;

      if (!institution || !startDateStr || !endDateStr) {
        throw new Error("Data magang (institusi, tgl mulai, tgl selesai) wajib diisi untuk Intern.");
      }

      await tx.internProfile.create({
        data: {
          userId: user.id,
          program,
          institution,
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr),
          mentorId,
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
}

export async function updateUserAction(formData: FormData) {
  const actor = await requireSuperAdminActor();

  const userId = String(formData.get("userId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim() || null;
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const birthDateStr = String(formData.get("birthDate") ?? "") || null;
  const role = String(formData.get("role") ?? "") === "ADMIN" ? "ADMIN" : "MEMBER";
  const memberStatus = String(formData.get("memberStatus") ?? "") === "INTERN" ? "INTERN" : "TEAM";
  const accountStatus = String(formData.get("accountStatus") ?? "") as "ACTIVE" | "INACTIVE" | "ARCHIVED";
  const defaultStudioId = String(formData.get("defaultStudioId") ?? "") || null;
  const placementStudioId = String(formData.get("placementStudioId") ?? "") || null;

  if (!userId || !name || !email) {
    throw new Error("ID, Nama, dan Email wajib diisi.");
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, email: true, username: true },
  });

  if (!target || target.role === "SUPER_ADMIN") {
    throw new Error("User tidak ditemukan atau tidak dapat diubah.");
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

  const birthDate = birthDateStr ? new Date(birthDateStr) : null;

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
        defaultStudioId,
      },
    });

    // 2. Handle InternProfile transitions
    if (memberStatus === "INTERN") {
      const program = String(formData.get("program") ?? "") === "PKL" ? "PKL" : "MAGANG";
      const institution = String(formData.get("institution") ?? "").trim();
      const startDateStr = String(formData.get("startDate") ?? "");
      const endDateStr = String(formData.get("endDate") ?? "");
      const mentorId = String(formData.get("mentorId") ?? "") || null;

      if (!institution || !startDateStr || !endDateStr) {
        throw new Error("Data magang (institusi, tgl mulai, tgl selesai) wajib diisi untuk Intern.");
      }

      await tx.internProfile.upsert({
        where: { userId },
        update: {
          program,
          institution,
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr),
          mentorId,
        },
        create: {
          userId,
          program,
          institution,
          startDate: new Date(startDateStr),
          endDate: new Date(endDateStr),
          mentorId,
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
        action: "USER_UPDATED_BY_SUPER_ADMIN",
        metadata: {
          name,
          username,
          email,
          role,
          memberStatus,
          accountStatus,
          defaultStudioId,
          placementStudioId,
        },
      },
    });
  });

  revalidatePath("/roles");
  revalidatePath("/super-admin");
}
