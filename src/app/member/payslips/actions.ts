"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function getMemberPayslips() {
  const user = await requireUser();
  
  return prisma.payslip.findMany({
    where: {
      userId: user.id,
      status: "SENT",
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" }
    ]
  });
}
