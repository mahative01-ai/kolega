import type { Prisma } from "@/generated/prisma/client";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { ApprovalsTabsClient } from "./approvals-tabs-client";
import { ConfettiTrigger } from "@/components/confetti-trigger";

export const dynamic = "force-dynamic";

const successMessages: Record<string, string> = {
  approve: "Aksi persetujuan berhasil diproses.",
  reject: "Aksi penolakan berhasil diproses.",
  deleted: "Data pengajuan/koreksi berhasil dihapus dan efek kehadirannya telah dipulihkan.",
};

export default async function AdminApprovalsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; tab?: string }>;
}) {
  const currentUser = await requireAnyRole(["SUPER_ADMIN", "ADMIN"]);
  const params = await searchParams;

  const scopedWhereRequests: Prisma.RequestWhereInput =
    currentUser.role === "SUPER_ADMIN"
      ? { status: "PENDING", type: { in: ["PERMISSION", "SICK", "DISPENSATION", "LEAVE", "WFH"] } }
      : {
          status: "PENDING",
          type: { in: ["PERMISSION", "SICK", "DISPENSATION", "LEAVE", "WFH"] },
          user: {
            defaultStudioId: currentUser.defaultStudioId,
            role: {
              notIn: ["ADMIN", "SUPER_ADMIN"],
            },
          },
        };

  const scopedWhereCorrections: Prisma.AttendanceCorrectionWhereInput =
    currentUser.role === "SUPER_ADMIN"
      ? { status: "PENDING" }
      : {
          status: "PENDING",
          attendanceRecord: {
            ownerStudioId: currentUser.defaultStudioId ?? "__NO_STUDIO__",
            user: {
              role: {
                notIn: ["ADMIN", "SUPER_ADMIN"],
              },
            },
          },
        };

  const scopedWhereHistoryRequests: Prisma.RequestWhereInput =
    currentUser.role === "SUPER_ADMIN"
      ? { status: { in: ["APPROVED", "REJECTED", "CANCELLED"] }, type: { in: ["PERMISSION", "SICK", "DISPENSATION", "LEAVE", "WFH"] } }
      : {
          status: { in: ["APPROVED", "REJECTED", "CANCELLED"] },
          type: { in: ["PERMISSION", "SICK", "DISPENSATION", "LEAVE", "WFH"] },
          user: {
            defaultStudioId: currentUser.defaultStudioId,
            role: {
              notIn: ["ADMIN", "SUPER_ADMIN"],
            },
          },
        };

  const scopedWhereHistoryCorrections: Prisma.AttendanceCorrectionWhereInput =
    currentUser.role === "SUPER_ADMIN"
      ? { status: { in: ["APPROVED", "REJECTED"] } }
      : {
          status: { in: ["APPROVED", "REJECTED"] },
          attendanceRecord: {
            ownerStudioId: currentUser.defaultStudioId ?? "__NO_STUDIO__",
            user: {
              role: {
                notIn: ["ADMIN", "SUPER_ADMIN"],
              },
            },
          },
        };

  const [requests, corrections, historyRequests, historyCorrections] = await Promise.all([
    prisma.request.findMany({
      where: scopedWhereRequests,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        reason: true,
        attachmentUrl: true,
        reviewerId: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
            defaultStudio: { select: { name: true } },
          },
        },
        reviewer: {
          select: { name: true },
        },
      },
    }),
    prisma.attendanceCorrection.findMany({
      where: scopedWhereCorrections,
      orderBy: { createdAt: "desc" },
      include: {
        requestedBy: {
          select: {
            name: true,
            email: true,
            defaultStudio: { select: { name: true } },
          },
        },
        attendanceRecord: {
          select: {
            attendanceDate: true,
          },
        },
        approvedBy: {
          select: { name: true },
        },
      },
    }),
    prisma.request.findMany({
      where: scopedWhereHistoryRequests,
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: {
        id: true,
        userId: true,
        type: true,
        status: true,
        startDate: true,
        endDate: true,
        reason: true,
        attachmentUrl: true,
        reviewerId: true,
        reviewedAt: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            name: true,
            email: true,
            defaultStudio: { select: { name: true } },
          },
        },
        reviewer: {
          select: { name: true },
        },
      },
    }),
    prisma.attendanceCorrection.findMany({
      where: scopedWhereHistoryCorrections,
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        requestedBy: {
          select: {
            name: true,
            email: true,
            defaultStudio: { select: { name: true } },
          },
        },
        attendanceRecord: {
          select: {
            attendanceDate: true,
          },
        },
        approvedBy: {
          select: { name: true },
        },
      },
    }),
  ]);

  const defaultTab = params.tab || "requests";

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/admin/requests"
      badge={currentUser.role === "SUPER_ADMIN" ? "Super Admin Approval" : "Admin Approval"}
      title="Persetujuan & Approval"
      description={
        currentUser.role === "SUPER_ADMIN"
          ? "Kelola perizinan member dan permintaan koreksi presensi dari seluruh studio."
          : `Kelola perizinan member dan permintaan koreksi presensi untuk studio ${currentUser.defaultStudio?.name ?? ""}.`
      }
    >
      {params.success && successMessages[params.success] ? (
        <>
          {params.success === "approve" && <ConfettiTrigger />}
          <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 mb-4">
            {successMessages[params.success]}
          </div>
        </>
      ) : null}

      <ApprovalsTabsClient
        currentUser={currentUser}
        pendingRequests={requests}
        pendingCorrections={corrections}
        historyRequests={historyRequests}
        historyCorrections={historyCorrections}
        defaultTab={defaultTab}
      />
    </DashboardShell>
  );
}
