"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

type PlacementInput = {
  userId: string;
  studioId: string;
  startDate: string; // "YYYY-MM-DD"
  endDate?: string | null; // "YYYY-MM-DD"
  reason?: string | null;
};

function parseDate(str: string): Date {
  return new Date(`${str}T00:00:00.000Z`);
}

export async function createPlacementAction(input: PlacementInput) {
  const actor = await requireAnyRole(["SUPER_ADMIN"]);

  const startDate = parseDate(input.startDate);
  const endDate = input.endDate ? parseDate(input.endDate) : null;

  if (endDate && endDate < startDate) {
    throw new Error("Tanggal selesai tidak boleh sebelum tanggal mulai.");
  }

  // Check if there is an active placement for this user
  const activePlacement = await prisma.placement.findFirst({
    where: {
      userId: input.userId,
      status: "ACTIVE",
    },
  });

  if (activePlacement) {
    throw new Error(
      "User ini masih memiliki penempatan aktif. Selesaikan atau batalkan penempatan lama terlebih dahulu."
    );
  }

  const newPlacement = await prisma.$transaction(async (tx) => {
    const placement = await tx.placement.create({
      data: {
        userId: input.userId,
        studioId: input.studioId,
        startDate,
        endDate,
        status: "ACTIVE",
        reason: input.reason?.trim() || null,
        createdById: actor.id,
      },
      include: {
        user: { select: { name: true, email: true } },
        studio: { select: { name: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "Placement",
        entityId: placement.id,
        action: "CREATE_PLACEMENT",
        metadata: {
          user: placement.user.name,
          studio: placement.studio.name,
          startDate: placement.startDate,
          endDate: placement.endDate,
          reason: placement.reason,
        },
      },
    });

    return placement;
  });

  revalidatePath("/super-admin/placements");
  revalidatePath("/roles");
  revalidatePath("/schedules");
  return { success: true, placement: newPlacement };
}

export async function updatePlacementStatusAction(
  id: string,
  status: "COMPLETED" | "CANCELLED"
) {
  const actor = await requireAnyRole(["SUPER_ADMIN"]);

  const updatedPlacement = await prisma.$transaction(async (tx) => {
    // If completing, we can cap the endDate to today if it is not set or in the future
    const dataToUpdate: Prisma.PlacementUpdateInput = { status };
    if (status === "COMPLETED") {
      dataToUpdate.endDate = new Date();
    }

    const placement = await tx.placement.update({
      where: { id },
      data: dataToUpdate,
      include: {
        user: { select: { name: true, email: true } },
        studio: { select: { name: true } },
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "Placement",
        entityId: placement.id,
        action: "UPDATE_PLACEMENT_STATUS",
        metadata: {
          user: placement.user.name,
          studio: placement.studio.name,
          status: placement.status,
        },
      },
    });

    return placement;
  });

  revalidatePath("/super-admin/placements");
  revalidatePath("/roles");
  revalidatePath("/schedules");
  return { success: true, placement: updatedPlacement };
}
