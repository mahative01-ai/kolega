import { DashboardShell } from "@/components/dashboard-shell";
import { requireUser } from "@/lib/auth";
import { getMemberPayslips } from "./actions";
import { MemberPayslipClient } from "./payslip-client";

export const dynamic = "force-dynamic";

export default async function MemberPayslipsPage() {
  const actor = await requireUser();
  
  const isEligible = (actor.role === "ADMIN" || actor.memberStatus === "TEAM") && actor.role !== "SUPER_ADMIN";
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
      title="My Payslips"
      description="View details of your monthly salary history."
      badge="Finance"
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
            Payslips are only available for Admin/Member with Team status.
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
