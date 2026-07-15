"use server";

import type { Prisma } from "@/generated/prisma/client";
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

export async function bulkGeneratePayslipsAction(month: number, year: number, studioId?: string) {
  await requireRole("SUPER_ADMIN");
  if (!month || month < 1 || month > 12) throw new Error("Bulan tidak valid.");
  if (!year || year < 2000 || year > 2100) throw new Error("Tahun tidak valid.");

  const whereClause: Prisma.UserWhereInput = {
    role: { in: ["ADMIN", "MEMBER"] },
    memberStatus: "TEAM",
    accountStatus: "ACTIVE",
  };

  if (studioId) {
    whereClause.defaultStudioId = studioId;
  }

  // Get all active members/admins with memberStatus = TEAM
  const users = await prisma.user.findMany({
    where: whereClause,
    select: { id: true }
  });

  if (users.length === 0) {
    throw new Error("Tidak ada staf aktif berstatus TEAM ditemukan.");
  }

  let generatedCount = 0;
  for (const u of users) {
    // Check if payslip already exists
    const existing = await prisma.payslip.findUnique({
      where: {
        userId_month_year: {
          userId: u.id,
          month,
          year,
        }
      }
    });

    if (!existing) {
      await prisma.payslip.create({
        data: {
          userId: u.id,
          month,
          year,
          basicSalary: 0,
          allowances: 0,
          deductions: 0,
          netSalary: 0,
          status: "DRAFT" // Start as draft so admin can edit it later
        }
      });
      generatedCount++;
    }
  }

  revalidatePath("/super-admin/payslips");
  revalidatePath("/member/payslips");

  return { success: true, generatedCount };
}

export async function updatePayslipAction(
  id: string,
  formData: {
    basicSalary: number;
    allowances: number;
    deductions: number;
    notes?: string;
    pdfFile?: {
      name: string;
      type: string;
      dataUrl: string;
    } | null;
  }
) {
  await requireRole("SUPER_ADMIN");

  const existing = await prisma.payslip.findUnique({
    where: { id }
  });

  if (!existing) {
    throw new Error("Slip gaji tidak ditemukan.");
  }

  const netSalary = formData.basicSalary + formData.allowances - formData.deductions;

  const data: Prisma.PayslipUpdateInput = {
    basicSalary: formData.basicSalary,
    allowances: formData.allowances,
    deductions: formData.deductions,
    netSalary,
    notes: formData.notes || null,
  };

  if (formData.pdfFile) {
    data.pdfFileName = formData.pdfFile.name;
    data.pdfMimeType = formData.pdfFile.type;
    data.pdfDataUrl = formData.pdfFile.dataUrl;
    data.uploadedAt = new Date();
    data.status = "SENT"; // Automatically publish when PDF is uploaded
  } else if (formData.pdfFile === null) {
    // If explicitly set to null, remove PDF
    data.pdfFileName = null;
    data.pdfMimeType = null;
    data.pdfDataUrl = null;
    data.uploadedAt = null;
  }

  const updated = await prisma.payslip.update({
    where: { id },
    data
  });

  // If a PDF is uploaded/updated, notify the user
  if (formData.pdfFile) {
    const monthName = MONTH_NAMES[updated.month - 1] || `${updated.month}`;
    await prisma.notification.create({
      data: {
        userId: updated.userId,
        title: "Slip Gaji Diperbarui",
        message: `Slip gaji Anda untuk periode ${monthName} ${updated.year} telah diperbarui/diterbitkan. Silakan cek di menu Slip Gaji Saya.`,
      }
    });
  }

  revalidatePath("/super-admin/payslips");
  revalidatePath("/member/payslips");

  return updated;
}

export async function deleteAllPayslipsAction(studioId?: string) {
  await requireRole("SUPER_ADMIN");

  const whereClause: Prisma.PayslipWhereInput = {};
  if (studioId) {
    whereClause.user = {
      defaultStudioId: studioId,
    };
  }

  const deleted = await prisma.payslip.deleteMany({
    where: whereClause,
  });

  revalidatePath("/super-admin/payslips");
  revalidatePath("/member/payslips");

  return { success: true, count: deleted.count };
}
