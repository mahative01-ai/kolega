import type { Prisma } from "@/generated/prisma/client";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";
import { ApprovalsTabsClient } from "./approvals-tabs-client";
import { ConfettiTrigger } from "@/components/confetti-trigger";
import { ToastNotificationListener } from "@/components/toast-notification-listener";

export const dynamic = "force-dynamic";

const successMessages: Record<string, string> = {
  approve: "Approval action processed successfully.",
  reject: "Rejection action processed successfully.",
  deleted: "Request or correction record deleted successfully and attendance effects restored.",
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
      title="Approvals & Requests"
      description={
        currentUser.role === "SUPER_ADMIN"
          ? "Manage member leave requests and attendance correction requests from all studios."
          : `Manage member leave requests and attendance correction requests for studio ${currentUser.defaultStudio?.name ?? ""}.`
      }
    >
      {params.success === "approve" && <ConfettiTrigger />}
      <ToastNotificationListener successMessages={successMessages} />

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
