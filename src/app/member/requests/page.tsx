import {
  FileText,
  Paperclip,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardShell } from "@/components/dashboard-shell";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelRequestAction } from "./actions";
import { RequestFormClient } from "./request-form-client";

export const dynamic = "force-dynamic";

const requestTypeLabel: Record<string, string> = {
  PERMISSION: "Personal Leave",
  SICK: "Official Sick Leave",
  DISPENSATION: "Dispensation",
  LEAVE: "Cuti Tahunan",
  WFH: "WFH",
};

const requestTypeColor: Record<string, string> = {
  PERMISSION: "bg-amber-100 text-amber-800",
  SICK: "bg-violet-100 text-violet-800",
  DISPENSATION: "bg-emerald-100 text-emerald-800",
  LEAVE: "bg-blue-100 text-blue-800",
  WFH: "bg-indigo-100 text-indigo-800",
};

const requestStatusLabel: Record<string, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const requestStatusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-300",
  REJECTED: "bg-red-100 text-red-800 border-red-300",
  CANCELLED: "bg-zinc-100 text-zinc-800 border-zinc-300",
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

const successMessages: Record<string, string> = {
  created: "Your request was successfully submitted and is pending approval.",
  cancelled: "Request successfully cancelled.",
};

const errorMessages: Record<string, string> = {
  "invalid-type": "Invalid request type.",
  "missing-fields": "Please fill in all required fields.",
  "invalid-dates": "Invalid date format.",
  "date-range": "End date cannot be before start date.",
  "file-size": "Attachment file size is too large (maximum 2MB).",
  "upload-failed": "Failed to process the file attachment.",
  "leave-notice": "Permits and replacement leaves must be requested at least 1 day in advance.",
  "replacement-date": "Replacement date must be after the leave date range.",
  "sick-notice": "Sick leave requests for today must be submitted at least 1 hour before start time (before 07:00 AM).",
  "attachment-required": "An official attachment is required for dispensation.",
  "past-date": "The request start date cannot be in the past.",
  "intern-wfh": "Interns are not allowed to request WFH. Only Team members and Admins can request WFH.",
  "intern-leave": "Interns are not allowed to request replacement leaves. Use personal or sick leave as needed.",
  "overlapping-request": "You already have an active request (Pending/Approved) for the selected date range.",
  "already-processed": "The request cannot be cancelled because it has already been reviewed by an Admin.",
  "not-found": "Request not found.",
  "insufficient-leave": "Sisa jatah cuti tahunan Anda tidak mencukupi untuk durasi pengajuan ini.",
  unauthorized: "You do not have authorization to cancel this request.",
};

export default async function MemberRequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);
  const params = await searchParams;
  const canRequestReplacementDay = currentUser.memberStatus === "TEAM";

  const userWithBalance = await prisma.user.findUnique({
    where: { id: currentUser.id },
    select: { annualLeaveBalance: true },
  });
  const leaveBalance = userWithBalance?.annualLeaveBalance ?? 12;

  const requests = await prisma.request.findMany({
    where: {
      userId: currentUser.id,
      type: { in: ["PERMISSION", "SICK", "DISPENSATION", "LEAVE", "WFH"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      type: true,
      status: true,
      startDate: true,
      endDate: true,
      reason: true,
      attachmentUrl: true,
      createdAt: true,
      updatedAt: true,
      reviewer: {
        select: { name: true },
      },
    },
  });

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/requests"
      badge="Member Forms"
      title="Submit Leave, Sick, Dispensation, Replacement, or WFH Request"
      description="Submit personal leave, official sick leave, dispensation, replacement leave, or WFH requests here."
    >
      {params.success && successMessages[params.success] ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessages[params.success]}
        </div>
      ) : null}

      {params.error && errorMessages[params.error] ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessages[params.error]}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlusCircle className="size-5 text-zinc-700" />
              Create Request
            </CardTitle>
            <CardDescription>
              Fill in the request details. The default status is PENDING.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {currentUser.memberStatus === "TEAM" && (
              <div className="mb-4 rounded-lg border border-blue-200 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-950/20 p-3 flex items-center justify-between">
                <div className="space-y-0.5">
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Jatah Cuti Tahunan</p>
                  <p className="text-xs text-zinc-500">Sisa jatah cuti aktif Anda</p>
                </div>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-400">
                  {leaveBalance} <span className="text-xs font-normal text-zinc-500">Hari</span>
                </p>
              </div>
            )}
            <RequestFormClient canRequestReplacementDay={canRequestReplacementDay} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-5 text-zinc-700" />
              Request History
            </CardTitle>
            <CardDescription>
              List of submitted requests and their current review status.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Reason / Note</TableHead>
                  <TableHead>Attachment</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-sm text-zinc-500"
                    >
                      No requests submitted yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">
                        <Badge
                          variant="secondary"
                          className={requestTypeColor[req.type]}
                        >
                          {requestTypeLabel[req.type] ?? req.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(req.startDate)}</TableCell>
                      <TableCell>{formatDate(req.endDate)}</TableCell>
                      <TableCell className="max-w-[200px] truncate" title={req.reason}>
                        {req.reason}
                      </TableCell>
                      <TableCell>
                        {req.attachmentUrl ? (
                          <a
                            href={req.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
                          >
                            <Paperclip className="size-3" />
                            View File
                          </a>
                        ) : (
                          <span className="text-xs text-zinc-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={requestStatusColor[req.status]}
                        >
                          {requestStatusLabel[req.status] ?? req.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-zinc-650">
                        {req.reviewer?.name ?? <span className="text-zinc-400">-</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === "PENDING" ? (
                          <form action={cancelRequestAction} method="POST">
                            <input type="hidden" name="requestId" value={req.id} />
                            <Button type="submit" size="sm" variant="ghost" className="text-red-650 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-8 px-2">
                              <Trash2 className="size-4 mr-1" />
                              Cancel
                            </Button>
                          </form>
                        ) : (
                          <span className="text-xs text-zinc-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
