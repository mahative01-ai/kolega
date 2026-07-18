"use server";

import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/email";
import {
  createPasswordResetToken,
  getPasswordResetExpiry,
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export async function requestPasswordResetAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email) {
    redirect("/forgot-password?sent=1");
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      accountStatus: true,
    },
  });

  if (user?.accountStatus === "ACTIVE") {
    const { token, tokenHash } = createPasswordResetToken();
    const resetUrl = `${getAppUrl()}/reset-password?token=${token}`;

    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: user.id,
          usedAt: null,
        },
      }),
      prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: getPasswordResetExpiry(),
        },
      }),
    ]);

    await sendEmail({
      to: user.email,
      subject: "Reset Password Kolega",
      text: `Hello ${user.name},

We received a request to reset the password for your Kolega account.

Click this link to create a new password:
${resetUrl}

This link is valid for 30 minutes. Ignore this email if you did not request a password reset.`,
    });
  }

  redirect("/forgot-password?sent=1");
}
