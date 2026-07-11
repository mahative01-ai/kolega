import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getMemberPayslips } from "./actions";
import { MemberPayslipClient } from "./payslip-client";

export const dynamic = "force-dynamic";

export default async function MemberPayslipsPage() {
  const actor = await requireUser();
  
  const isEligible = actor.memberStatus === "TEAM" && actor.role !== "SUPER_ADMIN";
  const initialPayslips = isEligible ? await getMemberPayslips() : [];

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
        {isEligible ? (
          <MemberPayslipClient
            initialPayslips={initialPayslips.map((p) => ({
              ...p,
              createdAt: p.createdAt,
            }))}
          />
        ) : (
          <div className="rounded-xl border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            Slip gaji hanya tersedia untuk Admin/Member dengan status Team.
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
