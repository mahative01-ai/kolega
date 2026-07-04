"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function getUnreadCountAction() {
  const user = await getCurrentUser();
  if (!user) return 0;

  return prisma.notification.count({
    where: {
      userId: user.id,
      readAt: null,
    },
  });
}

export async function markNotificationReadAction(id: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.notification.updateMany({
    where: {
      id,
      userId: user.id,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/notifications");
  return { success: true };
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await prisma.notification.updateMany({
    where: {
      userId: user.id,
      readAt: null,
    },
    data: {
      readAt: new Date(),
    },
  });

  revalidatePath("/notifications");
  return { success: true };
}
