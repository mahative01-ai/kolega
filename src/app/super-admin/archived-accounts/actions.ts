"use server";

import { revalidatePath } from "next/cache";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function restoreAccountAction(userId: string) {
  const actor = await requireAnyRole(["SUPER_ADMIN"]);

  const updatedUser = await prisma.$transaction(async (tx) => {
    const user = await tx.user.update({
      where: { id: userId },
      data: { accountStatus: "ACTIVE" },
    });

    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        entity: "User",
        entityId: user.id,
        action: "RESTORE_ACCOUNT",
        metadata: {
          name: user.name,
          email: user.email,
        },
      },
    });

    return user;
  });

  revalidatePath("/super-admin/archived-accounts");
  revalidatePath("/roles");
  return { success: true, user: updatedUser };
}
