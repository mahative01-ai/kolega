import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Terminal } from "lucide-react";
import Link from "next/link";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

export default async function PrintablePayslipPage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolvedParams = await params;
  const actor = await requireUser();

  const payslip = await prisma.payslip.findUnique({
    where: { id: resolvedParams.id },
    include: {
      user: {
        include: {
          defaultStudio: true
        }
      }
    }
  });

  if (!payslip) {
    notFound();
  }

  // Security Check: Only Super Admin or the owner can view this payslip
  const isSuperAdmin = actor.role === "SUPER_ADMIN";
  const isOwner = actor.id === payslip.userId;

  if (!isSuperAdmin && !isOwner) {
    redirect("/unauthorized"); // Or fallback redirect
  }

  const periodName = `${MONTH_NAMES[payslip.month - 1]} ${payslip.year}`;

  if (payslip.pdfDataUrl) {
    return (
      <div className="min-h-screen bg-zinc-50 p-4 font-sans dark:bg-zinc-900/40 md:p-8">
        <div className="mx-auto mb-6 flex w-full max-w-5xl items-center justify-between print:hidden">
          <Link
            href={isSuperAdmin ? "/super-admin/payslips" : "/member/payslips"}
            className="inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
          >
            <ArrowLeft className="size-4" />
            Kembali ke Dashboard
          </Link>
          <PrintButton />
        </div>
        <div className="mx-auto w-full max-w-5xl rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 print:border-none print:p-0 print:shadow-none">
          <div className="mb-4 print:hidden">
            <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">
              Slip Gaji {periodName}
            </h1>
            <p className="text-sm text-zinc-500">
              {payslip.user.name} · {payslip.pdfFileName ?? "Dokumen PDF"}
            </p>
          </div>
          <iframe
            title={`Slip Gaji ${periodName}`}
            src={payslip.pdfDataUrl}
            className="h-[80vh] w-full rounded-lg border border-zinc-200 dark:border-zinc-800 print:h-screen print:border-none"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-900/40 p-4 md:p-8 font-sans flex flex-col items-center">
      {/* Action Buttons (Hidden when printing) */}
      <div className="w-full max-w-2xl flex items-center justify-between mb-6 print:hidden">
        <Link
          href={isSuperAdmin ? "/super-admin/payslips" : "/member/payslips"}
          className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Kembali ke Dashboard
        </Link>
        <PrintButton />
      </div>

      {/* Payslip Content (Optimized for standard A4 portrait print) */}
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8 md:p-12 shadow-sm dark:shadow-none text-zinc-900 dark:text-zinc-100 print:border-none print:shadow-none print:p-0">
        
        {/* Kop Surat / Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-6 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex aspect-square size-10 items-center justify-center rounded-lg bg-zinc-950 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-950">
              <Terminal className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">KOLEGA</h1>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-lg font-bold text-zinc-800 dark:text-zinc-200">PAYSLIP</h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Period: {periodName}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-6 mb-8 text-sm border-b border-zinc-100 dark:border-zinc-900 pb-6">
          <div>
            <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
              DIBERIKAN KEPADA:
            </h3>
            <p className="font-semibold text-zinc-950 dark:text-zinc-50">{payslip.user.name}</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs">{payslip.user.email}</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs mt-1">
              Studio: {payslip.user.defaultStudio?.name || "Kolega Studio"}
            </p>
          </div>
          <div className="text-right">
            <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2">
              Rincian Dokumen:
            </h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs">ID Slip: {payslip.id}</p>
            <p className="text-zinc-500 dark:text-zinc-400 text-xs">
              Tanggal Cetak: {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
        </div>

        {/* Document Details */}
        <div className="space-y-4 mb-8">
          <h3 className="text-xs font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            Rincian Slip
          </h3>
          
          <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-500 uppercase">
              <div>Informasi</div>
              <div className="text-right">Detail</div>
            </div>
            
            <div className="grid grid-cols-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-900 text-sm">
              <div className="text-zinc-700 dark:text-zinc-300">Periode</div>
              <div className="text-right font-medium">{periodName}</div>
            </div>

            <div className="grid grid-cols-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 text-sm">
              <div className="text-zinc-700 dark:text-zinc-300">File</div>
              <div className="text-right font-medium">{payslip.pdfFileName ?? "PDF slip gaji"}</div>
            </div>
          </div>
        </div>

        {/* Notes (If present) */}
        {payslip.notes && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-lg border border-zinc-150 dark:border-zinc-850 text-xs text-zinc-600 dark:text-zinc-400 mb-8 leading-relaxed">
            <span className="font-semibold block mb-1">Catatan Tambahan:</span>
            {payslip.notes}
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 pt-8 mt-12 text-sm border-t border-zinc-100 dark:border-zinc-900 text-center">
          <div className="flex flex-col items-center">
            <span className="text-zinc-400 dark:text-zinc-500 text-xs uppercase tracking-wider mb-12">
              Diterima Oleh
            </span>
            <div className="border-b border-zinc-300 dark:border-zinc-700 w-40 mb-1 font-semibold text-zinc-900 dark:text-zinc-50">
              {payslip.user.name}
            </div>
            <span className="text-[10px] text-zinc-400">Member Tim</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-zinc-400 dark:text-zinc-500 text-xs uppercase tracking-wider mb-12">
              Authorized By
            </span>
            <div className="border-b border-zinc-300 dark:border-zinc-700 w-40 mb-1 font-semibold text-zinc-900 dark:text-zinc-50">
              Super Admin
            </div>
            <span className="text-[10px] text-zinc-400">KOLEGA</span>
          </div>
        </div>

      </div>
    </div>
  );
}
