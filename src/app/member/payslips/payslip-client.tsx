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
  notes: string | null;
  pdfFileName?: string | null;
  pdfDataUrl?: string | null;
  createdAt: Date;
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function MemberPayslipClient({
  initialPayslips,
}: {
  initialPayslips: Payslip[];
}) {
  const [payslips] = useState<Payslip[]>(initialPayslips);

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 font-sans">Payslip History</h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          View your payslip documents and print them independently.
        </p>
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden bg-white dark:bg-zinc-950">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>File</TableHead>
              <TableHead className="text-right">Print</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payslips.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-zinc-500">
                  No payslip data issued for you yet.
                </TableCell>
              </TableRow>
            ) : (
              payslips.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium text-zinc-900 dark:text-zinc-100">
                    {MONTH_NAMES[p.month - 1]} {p.year}
                  </TableCell>
                  <TableCell className="max-w-[320px] text-sm text-zinc-600 dark:text-zinc-300">
                    {p.notes || "-"}
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">
                    {p.pdfFileName || "Payslip PDF"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="outline"
                      title="Print Payslip"
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
