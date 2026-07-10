"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Printer } from "lucide-react";

type Payslip = {
  id: string;
  month: number;
  year: number;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  notes: string | null;
  createdAt: Date;
};

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember"
];

function localFormatCurrency(amount: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function MemberPayslipClient({
  initialPayslips,
}: {
  initialPayslips: Payslip[];
}) {
  const [payslips] = useState<Payslip[]>(initialPayslips);

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">Riwayat Slip Gaji</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Lihat rincian gaji Anda dan cetak slip gaji secara mandiri.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Periode</TableHead>
              <TableHead>Gaji Pokok</TableHead>
              <TableHead>Tunjangan</TableHead>
              <TableHead>Potongan</TableHead>
              <TableHead>Gaji Bersih</TableHead>
              <TableHead className="text-right">Cetak</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-zinc-500">
                  Belum ada data slip gaji yang diterbitkan untuk Anda.
                </TableCell>
              </TableRow>
            ) : (
              payslips.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </TableCell>
                  <TableCell>{localFormatCurrency(p.basicSalary)}</TableCell>
                  <TableCell className="text-green-600 dark:text-green-400">
                    +{localFormatCurrency(p.allowances)}
                  </TableCell>
                  <TableCell className="text-red-600 dark:text-red-400">
                    -{localFormatCurrency(p.deductions)}
                  </TableCell>
                  <TableCell className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {localFormatCurrency(p.netSalary)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="outline"
                      title="Cetak Slip Gaji"
                      onClick={() => window.open(`/payslip/${p.id}`, "_blank")}
                    >
                      <Printer className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
