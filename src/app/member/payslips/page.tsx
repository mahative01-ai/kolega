import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getMemberPayslips } from "./actions";
import { MemberPayslipClient } from "./payslip-client";

export const dynamic = "force-dynamic";

export default async function MemberPayslipsPage() {
  const actor = await requireUser();
  
  const initialPayslips = await getMemberPayslips();

  const dashboardUser = {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    role: actor.role,
    defaultStudio: actor.defaultStudio
      ? {
          name: actor.defaultStudio.name,
        }
      : null,
  };

  return (
    <DashboardShell
      user={dashboardUser}
      currentPath="/member/payslips"
      title="Slip Gaji Saya"
      description="Lihat rincian riwayat gaji bulanan Anda."
      badge="Keuangan"
    >
      <div className="p-6">
        <MemberPayslipClient
          initialPayslips={initialPayslips.map((p) => ({
            ...p,
            createdAt: p.createdAt,
          }))}
        />
      </div>
    </DashboardShell>
  );
}
