import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { getPayslips, getMembers, getPayslipStudios } from "./actions";
import { PayslipClient } from "./payslip-client";

export const dynamic = "force-dynamic";

export default async function PayslipsPage() {
  const actor = await requireRole("SUPER_ADMIN");
  
  const [initialPayslips, members, studios] = await Promise.all([
    getPayslips(),
    getMembers(),
    getPayslipStudios(),
  ]);

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
      currentPath="/super-admin/payslips"
      title="Payslips"
      description="Management of monthly team payslip details and distribution."
      badge="Management"
    >
      <div className="p-6">
        <PayslipClient
          initialPayslips={initialPayslips.map((p) => ({
            ...p,
            createdAt: p.createdAt,
          }))}
          members={members}
          studios={studios}
        />
      </div>
    </DashboardShell>
  );
}
