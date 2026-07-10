"use server";

import { redirect } from "next/navigation";
import { hashPassword } from "@/lib/auth";
import { hashPasswordResetToken } from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

export async function resetPasswordAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!token) {
    redirect("/reset-password?error=invalid");
  }

  if (password.length < 6) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=weak`);
  }

  if (password !== confirmPassword) {
    redirect(`/reset-password?token=${encodeURIComponent(token)}&error=mismatch`);
  }

  const tokenHash = hashPasswordResetToken(token);
  const now = new Date();

  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          accountStatus: true,
        },
      },
    },
  });

  if (
    !resetToken ||
    resetToken.usedAt ||
    resetToken.expiresAt <= now ||
    resetToken.user.accountStatus !== "ACTIVE"
  ) {
    redirect("/reset-password?error=invalid");
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetToken.user.id },
      data: { passwordHash: hashPassword(password) },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: now },
    }),
    prisma.passwordResetToken.deleteMany({
      where: {
        userId: resetToken.user.id,
        id: { not: resetToken.id },
      },
    }),
  ]);

  redirect("/login?success=reset-password");
}
