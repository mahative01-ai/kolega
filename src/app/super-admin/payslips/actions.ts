"use server";

import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export async function getPayslips() {
  await requireRole("SUPER_ADMIN");
  
  return prisma.payslip.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          defaultStudioId: true,
          memberStatus: true,
        }
      }
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" },
      { createdAt: "desc" }
    ]
  });
}

export async function getMembers() {
  await requireRole("SUPER_ADMIN");
  
  return prisma.user.findMany({
    where: {
      role: { in: ["ADMIN", "MEMBER"] },
      memberStatus: "TEAM",
      accountStatus: "ACTIVE",
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      defaultStudioId: true,
      defaultStudio: { select: { id: true, name: true } },
    },
    orderBy: {
      name: "asc"
    }
  });
}

export async function getPayslipStudios() {
  await requireRole("SUPER_ADMIN");

  return prisma.studio.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function createPayslip(formData: {
  userId: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  notes?: string;
  pdfFile?: {
    name: string;
    type: string;
    dataUrl: string;
  } | null;
}) {
  await requireRole("SUPER_ADMIN");

  const netSalary = formData.basicSalary + formData.allowances - formData.deductions;

  // Check for duplicate payslip
  const existing = await prisma.payslip.findUnique({
    where: {
      userId_month_year: {
        userId: formData.userId,
        month: formData.month,
        year: formData.year,
      }
    }
  });

  if (existing) {
    throw new Error("Slip gaji untuk member ini pada periode tersebut sudah ada.");
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      id: formData.userId,
      accountStatus: "ACTIVE",
      role: { in: ["ADMIN", "MEMBER"] },
      memberStatus: "TEAM",
    },
    select: { id: true },
  });

  if (!targetUser) {
    throw new Error("Slip gaji hanya bisa dikirim ke Admin/Member dengan status Team.");
  }

  const payslip = await prisma.payslip.create({
    data: {
      userId: formData.userId,
      month: formData.month,
      year: formData.year,
      basicSalary: formData.basicSalary,
      allowances: formData.allowances,
      deductions: formData.deductions,
      netSalary,
      notes: formData.notes || null,
      pdfFileName: formData.pdfFile?.name ?? null,
      pdfMimeType: formData.pdfFile?.type ?? null,
      pdfDataUrl: formData.pdfFile?.dataUrl ?? null,
      uploadedAt: formData.pdfFile ? new Date() : null,
      status: "SENT"
    }
  });

  // Create notification for member
  const monthName = MONTH_NAMES[formData.month - 1] || `${formData.month}`;
  await prisma.notification.create({
    data: {
      userId: formData.userId,
      title: "Slip Gaji Baru Terbit",
      message: `Slip gaji Anda untuk periode ${monthName} ${formData.year} telah diterbitkan. Silakan cek di menu Slip Gaji Saya.`,
    }
  });

  revalidatePath("/super-admin/payslips");
  revalidatePath("/member/payslips");
  return payslip;
}

export async function deletePayslip(id: string) {
  await requireRole("SUPER_ADMIN");

  const deleted = await prisma.payslip.delete({
    where: { id }
  });

  revalidatePath("/super-admin/payslips");
  revalidatePath("/member/payslips");
  return deleted;
}
