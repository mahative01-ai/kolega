"use server";

import { redirect } from "next/navigation";
import { sendEmail } from "@/lib/email";
import {
  createPasswordResetToken,
  getPasswordResetExpiry,
} from "@/lib/password-reset";
import { prisma } from "@/lib/prisma";

function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
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
      subject: "Reset Password Kolega New Gen",
      text: `Halo ${user.name},

Kami menerima permintaan reset password untuk akun Kolega New Gen Anda.

Buka link ini untuk membuat password baru:
${resetUrl}

Link ini berlaku selama 30 menit. Abaikan email ini jika Anda tidak meminta reset password.`,
    });
  }

  redirect("/forgot-password?sent=1");
}
