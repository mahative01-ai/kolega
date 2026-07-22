import React from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer, QrCode, ShieldCheck } from "lucide-react";
import { requireAnyRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardShell } from "@/components/dashboard-shell";
import { createPersonalQrCredentialAction } from "@/app/member/presensi/actions";
import { ViewQrCardClient } from "@/components/view-qr-card-client";

export const dynamic = "force-dynamic";

export default async function MyQrCardPage() {
  const currentUser = await requireAnyRole(["ADMIN", "MEMBER"]);

  const credential = await prisma.qrCredential.findFirst({
    where: {
      userId: currentUser.id,
      status: "ACTIVE",
    },
    orderBy: {
      issuedAt: "desc",
    },
  });

  const dashboardPath = currentUser.role === "ADMIN" ? "/admin" : "/member";

  return (
    <DashboardShell
      user={currentUser}
      currentPath="/member/qr-card"
      badge="QR Card Management"
      title="My QR Card"
      description="Manage and download your personal digital QR Card for checking in at the office."
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex justify-start">
          <Link
            href={dashboardPath}
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "flex items-center gap-1 text-zinc-500 hover:text-zinc-950 dark:hover:text-zinc-50"
            )}
          >
            <ArrowLeft className="size-4" />
            Back to Dashboard
          </Link>
        </div>

        {credential ? (
          <Card className="shadow-none border border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3 border-b border-zinc-150 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                    <QrCode className="size-5 text-zinc-700 dark:text-zinc-400" />
                    Digital QR Identification
                  </CardTitle>
                  <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                    Your QR credentials are active and ready.
                  </CardDescription>
                </div>
                <span className="rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900 px-2 py-0.5 text-[10px] font-bold">
                  Active
                </span>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-6 flex flex-col items-center">
              <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800 max-w-sm w-full flex justify-center shadow-inner">
                <img
                  src="/member/presensi/qr-card?format=svg"
                  className="w-full h-auto bg-white rounded-lg border border-zinc-200 shadow-sm"
                  alt="My QR Card"
                />
              </div>

              <div className="w-full max-w-sm space-y-3">
                <div className="space-y-1 text-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-400">QR CODE UNIQUE ID</span>
                  <div className="rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 px-3 py-2 font-mono text-sm text-zinc-700 dark:text-zinc-300 text-center select-all">
                    {credential.qrUid}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  <a
                    href="/member/presensi/qr-card?format=png"
                    download="my-qr-card.png"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                  >
                    <Download className="size-3.5 mr-1.5" />
                    PNG Format
                  </a>
                  <a
                    href="/member/presensi/qr-card?format=jpeg"
                    download="my-qr-card.jpg"
                    className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-xs font-semibold text-zinc-900 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                  >
                    <Download className="size-3.5 mr-1.5" />
                    JPEG Format
                  </a>
                </div>
                
                <a
                  href="/member/presensi/qr-card?format=html"
                  target="_blank"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "w-full h-9 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  )}
                >
                  <Printer className="size-3.5" />
                  Print QR Card
                </a>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-none border border-dashed border-2 border-zinc-200 dark:border-zinc-800">
            <CardHeader className="pb-3 text-center">
              <QrCode className="size-10 text-zinc-400 mx-auto mb-2 animate-bounce" />
              <CardTitle className="text-zinc-900 dark:text-zinc-50">Activate Your QR Card</CardTitle>
              <CardDescription className="text-zinc-500 dark:text-zinc-400 text-xs">
                You currently do not have an active digital QR Card. Activate it once to begin logging attendance.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center pb-6">
              <form action={createPersonalQrCredentialAction}>
                <Button type="submit" size="sm" className="px-6 bg-zinc-950 text-white hover:bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-200 font-semibold cursor-pointer">
                  <ShieldCheck className="mr-1.5 size-4" />
                  Activate QR Card
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
