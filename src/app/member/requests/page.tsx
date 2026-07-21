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
import { ToastNotificationListener } from "@/components/toast-notification-listener";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cancelRequestAction } from "./actions";
import { RequestFormClient } from "./request-form-client";

export const dynamic = "force-dynamic";

const requestTypeLabel: Record<string, string> = {
  PERMISSION: "Personal Leave",
  SICK: "Official Sick Leave",
  DISPENSATION: "Dispensation",
  LEAVE: "Annual Leave",
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
  "sick-date": "Sick leave can only be submitted for today's date.",
  "sick-notice": "Sick leave can be submitted on the same day. Please select today's date.",
  "attachment-required": "An official attachment is required for dispensation.",
  "past-date": "The request start date cannot be in the past.",
  "intern-wfh": "Interns are not allowed to request WFH. Only Team members and Admins can request WFH.",
  "intern-leave": "Interns are not allowed to request replacement leaves. Use personal or sick leave as needed.",
  "overlapping-request": "You already have an active request (Pending/Approved) for the selected date range.",
  "already-processed": "The request cannot be cancelled because it has already been reviewed by an Admin.",
  "not-found": "Request not found.",
  "insufficient-leave": "Your remaining annual leave balance is insufficient for this request duration.",
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
      <ToastNotificationListener
        successMessages={successMessages}
        errorMessages={errorMessages}
      />

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
                  <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">Annual Leave Balance</p>
                  <p className="text-xs text-zinc-550 dark:text-zinc-400">Your remaining active annual leave balance</p>
                </div>
                <p className="text-2xl font-black text-blue-700 dark:text-blue-400">
                  {leaveBalance} <span className="text-xs font-normal text-zinc-500 font-sans">Days</span>
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
                    <TableCell colSpan={8} className="text-center text-zinc-500">
                      No request history found.
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={requestTypeColor[request.type]}
                        >
                          {requestTypeLabel[request.type] ?? request.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatDate(request.startDate)}</TableCell>
                      <TableCell>{formatDate(request.endDate)}</TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {request.reason}
                      </TableCell>
                      <TableCell>
                        {request.attachmentUrl ? (
                          <a
                            href={request.attachmentUrl}
                            target="_blank"
                            rel="noreferrer"
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
                          className={requestStatusColor[request.status]}
                        >
                          {requestStatusLabel[request.status] ?? request.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-zinc-600">
                        {request.reviewer?.name ?? "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === "PENDING" ? (
                          <form action={cancelRequestAction}>
                            <input type="hidden" name="requestId" value={request.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="icon"
                              className="size-8 text-zinc-500 hover:text-red-600"
                              title="Cancel Request"
                            >
                              <Trash2 className="size-4" />
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
