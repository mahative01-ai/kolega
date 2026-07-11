"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AttendanceTableBodyClient } from "./attendance-table-body-client";
import { FileText, Home } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SerializedRecord = {
  id: string;
  attendanceDate: string;
  workMode: string;
  status: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  lateMinutes: number;
  earlyCheckoutMinutes: number;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  ownerStudio: {
    name: string;
  };
  locationStudio: {
    name: string;
  } | null;
  wfhPlan: string | null;
  wfhReport: string | null;
};

type Props = {
  records: SerializedRecord[];
  statusColor: Record<string, string>;
  statusLabel: Record<string, string>;
};

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(dateStr));
}

function formatTime(timeStr: string | null) {
  if (!timeStr) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(timeStr));
}

export function LaporanPresensiTabsClient({ records, statusColor, statusLabel }: Props) {
  // WFH-only records
  const wfhRecords = records.filter((r) => r.workMode === "WFH");

  return (
    <Tabs defaultValue="attendance-log" className="w-full">
      <TabsList className="grid w-full max-w-md grid-cols-2 mb-4 bg-zinc-100 dark:bg-zinc-900">
        <TabsTrigger value="attendance-log" className="flex items-center gap-1.5">
          <FileText className="size-4" />
          Log Kehadiran
        </TabsTrigger>
        <TabsTrigger value="wfh-reports" className="flex items-center gap-1.5">
          <Home className="size-4" />
          Jurnal & Hasil WFH
        </TabsTrigger>
      </TabsList>

      <TabsContent value="attendance-log">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <FileText className="size-5 text-blue-700 dark:text-blue-400" />
              Detail Presensi
            </CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">
              Menampilkan catatan presensi umum sesuai filter terpilih.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Default Studio</TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead>Terlambat</TableHead>
                  <TableHead>Pulang Cepat</TableHead>
                </TableRow>
              </TableHeader>
              <AttendanceTableBodyClient
                records={records}
                statusColor={statusColor}
                statusLabel={statusLabel}
              />
            </Table>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="wfh-reports">
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
              <Home className="size-5 text-sky-700 dark:text-sky-400" />
              Laporan Rencana & Hasil Kerja WFH
            </CardTitle>
            <CardDescription className="text-zinc-500 dark:text-zinc-400">
              Meninjau apa yang direncanakan (pagi) dan apa yang dilaporkan (sore) oleh karyawan saat WFH.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Default Studio</TableHead>
                  <TableHead>Jam In/Out</TableHead>
                  <TableHead className="w-[30%]">Rencana Kerja (Pagi)</TableHead>
                  <TableHead className="w-[30%]">Laporan Hasil Kerja (Sore)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {wfhRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-sm text-zinc-500">
                      Tidak ada catatan kerja WFH pada filter terpilih.
                    </TableCell>
                  </TableRow>
                ) : (
                  wfhRecords.map((item) => (
                    <TableRow key={item.id} className="align-top hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10">
                      <TableCell className="font-medium pt-3">
                        <div className="text-zinc-900 dark:text-zinc-100">{item.user.name}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.user.email}</div>
                      </TableCell>
                      <TableCell className="pt-3">{formatDate(item.attendanceDate)}</TableCell>
                      <TableCell className="pt-3">{item.ownerStudio.name}</TableCell>
                      <TableCell className="pt-3 font-mono text-xs">
                        <div>In: {formatTime(item.checkInAt)}</div>
                        <div>Out: {formatTime(item.checkOutAt)}</div>
                      </TableCell>
                      <TableCell className="pt-3 pb-3">
                        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                          {item.wfhPlan || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="pt-3 pb-3">
                        <div className="rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/10 p-2.5 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                          {item.wfhReport || "—"}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
