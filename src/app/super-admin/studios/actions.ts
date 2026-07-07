"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type StudioInput = {
  name: string;
  slug: string;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  radiusMeters?: number;
  weekStartDay?: number;
};

export async function createStudioAction(input: StudioInput) {
  const actor = await requireAnyRole(["SUPER_ADMIN"]);

  const cleanSlug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
    throw new Error("Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).");
  }

  const existing = await prisma.studio.findUnique({
    where: { slug: cleanSlug },
  });

  if (existing) {
    throw new Error("Studio dengan slug ini sudah terdaftar.");
  }

  const newStudio = await prisma.$transaction(async (tx) => {
    const studio = await tx.studio.create({
      data: {
        name: input.name.trim(),
        slug: cleanSlug,
        address: input.address?.trim() || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        radiusMeters: input.radiusMeters ?? 100,
        weekStartDay: input.weekStartDay ?? 1,
        isActive: true,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "Studio",
        entityId: studio.id,
        action: "CREATE_STUDIO",
        metadata: {
          name: studio.name,
          slug: studio.slug,
          address: studio.address,
          latitude: studio.latitude,
          longitude: studio.longitude,
          radiusMeters: studio.radiusMeters,
        },
      },
    });

    return studio;
  });

  revalidatePath("/super-admin/studios");
  revalidatePath("/settings");
  return { success: true, studio: newStudio };
}

export async function updateStudioAction(id: string, input: StudioInput) {
  const actor = await requireAnyRole(["SUPER_ADMIN"]);

  const cleanSlug = input.slug.trim().toLowerCase();
  if (!/^[a-z0-9-]+$/.test(cleanSlug)) {
    throw new Error("Slug hanya boleh berisi huruf kecil, angka, dan tanda hubung (-).");
  }

  const existing = await prisma.studio.findFirst({
    where: {
      slug: cleanSlug,
      NOT: { id },
    },
  });

  if (existing) {
    throw new Error("Studio dengan slug ini sudah terdaftar.");
  }

  const updatedStudio = await prisma.$transaction(async (tx) => {
    const studio = await tx.studio.update({
      where: { id },
      data: {
        name: input.name.trim(),
        slug: cleanSlug,
        address: input.address?.trim() || null,
        latitude: input.latitude ?? null,
        longitude: input.longitude ?? null,
        radiusMeters: input.radiusMeters ?? 100,
        weekStartDay: input.weekStartDay ?? 1,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "Studio",
        entityId: studio.id,
        action: "UPDATE_STUDIO",
        metadata: {
          name: studio.name,
          slug: studio.slug,
          address: studio.address,
          latitude: studio.latitude,
          longitude: studio.longitude,
          radiusMeters: studio.radiusMeters,
        },
      },
    });

    return studio;
  });

  revalidatePath("/super-admin/studios");
  revalidatePath("/settings");
  return { success: true, studio: updatedStudio };
}

export async function toggleStudioActiveAction(id: string, isActive: boolean) {
  const actor = await requireAnyRole(["SUPER_ADMIN"]);

  const updatedStudio = await prisma.$transaction(async (tx) => {
    const studio = await tx.studio.update({
      where: { id },
      data: { isActive },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "Studio",
        entityId: studio.id,
        action: "TOGGLE_STUDIO_ACTIVE",
        metadata: {
          name: studio.name,
          isActive: studio.isActive,
        },
      },
    });

    return studio;
  });

  revalidatePath("/super-admin/studios");
  return { success: true, studio: updatedStudio };
}
