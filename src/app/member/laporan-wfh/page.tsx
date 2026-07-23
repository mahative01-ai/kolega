import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { parseMonthKey, formatMonthLabel } from "@/lib/calendar";
import { LaporanWfhClient } from "./laporan-wfh-client";

export const dynamic = "force-dynamic";

// Generate range of recent months for filter dropdown
function getMonthOptions() {
  const options = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(d);
    options.push({ key, label });
  }
  return options;
}

export default async function MemberLaporanWfhPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  // Admin and Member can access their own reports
  if (user.role !== "MEMBER" && user.role !== "ADMIN") {
    redirect("/login");
  }

  const params = await searchParams;
  const monthKey = params.month || (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  })();

  const monthInfo = parseMonthKey(monthKey);
  // Get date range for target month
  const monthStart = new Date(Date.UTC(monthInfo.year, monthInfo.monthIndex, 1));
  const monthEnd = new Date(Date.UTC(monthInfo.year, monthInfo.monthIndex + 1, 0, 23, 59, 59, 999));

  // Query WFH and WFO attendance records
  const records = await prisma.attendanceRecord.findMany({
    where: {
      userId: user.id,
      workMode: { in: ["WFH", "WFO"] },
      attendanceDate: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    orderBy: {
      attendanceDate: "desc",
    },
    include: {
      ownerStudio: {
        select: { name: true },
      },
    },
  });

  // Serialize records to match client expected format (convert Date to ISO String)
  const serializedRecords = records.map((record) => ({
    id: record.id,
    attendanceDate: record.attendanceDate.toISOString(),
    workMode: record.workMode,
    status: record.status,
    wfhPlan: record.wfhPlan,
    wfhReport: record.wfhReport,
    checkInAt: record.checkInAt ? record.checkInAt.toISOString() : null,
    checkOutAt: record.checkOutAt ? record.checkOutAt.toISOString() : null,
    ownerStudio: record.ownerStudio,
  }));

  const monthOptions = getMonthOptions();
  const monthLabel = formatMonthLabel(monthInfo.year, monthInfo.monthIndex);

  return (
    <DashboardShell
      user={user}
      currentPath="/member/laporan-wfh"
      badge="Work Journal"
      title="Work Journal & Attendance Reports"
      description="Morning work plans (WFH) and daily work reports (WFO & WFH)."
    >
      <LaporanWfhClient
        initialRecords={serializedRecords}
        monthKey={monthKey}
        monthOptions={monthOptions}
        monthLabel={monthLabel}
      />
    </DashboardShell>
  );
}

