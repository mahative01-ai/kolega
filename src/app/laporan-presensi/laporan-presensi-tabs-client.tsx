"use client";

import { useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AttendanceTableBodyClient } from "./attendance-table-body-client";
import { FileText, Home, ArrowUpDown } from "lucide-react";
import { getMood } from "@/lib/moods";
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
  locationValidationStatus: string;
  distanceMeters: number | null;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    currentMood?: string | null;
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
  const [sortField, setSortField] = useState<string>("date");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [studioFilter, setStudioFilter] = useState("ALL");

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const studioTabs = useMemo(() => {
    const names = Array.from(new Set(records.map((record) => record.ownerStudio.name)));
    if (!names.includes("Kipa")) names.push("Kipa");
    if (!names.includes("Mahative")) names.push("Mahative");

    const preferred = ["Kipa", "Mahative"];
    const ordered = [
      ...preferred.filter((name) => names.includes(name)),
      ...names.filter((name) => !preferred.includes(name)),
    ];

    return [
      { value: "ALL", label: "Semua" },
      ...ordered.map((name) => ({ value: name, label: name.replace(" Studio", "") })),
    ];
  }, [records]);

  const sortedRecords = useMemo(() => {
    const scopedRecords =
      studioFilter === "ALL"
        ? records
        : records.filter((record) => record.ownerStudio.name === studioFilter);

    return [...scopedRecords].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortField === "name") {
        aVal = a.user.name.toLowerCase();
        bVal = b.user.name.toLowerCase();
      } else if (sortField === "date") {
        aVal = new Date(a.attendanceDate).getTime();
        bVal = new Date(b.attendanceDate).getTime();
      } else if (sortField === "studio") {
        aVal = a.ownerStudio.name.toLowerCase();
        bVal = b.ownerStudio.name.toLowerCase();
      } else if (sortField === "validation") {
        aVal = a.locationValidationStatus;
        bVal = b.locationValidationStatus;
      } else if (sortField === "distance") {
        aVal = a.distanceMeters ?? 0;
        bVal = b.distanceMeters ?? 0;
      } else if (sortField === "mode") {
        aVal = a.workMode;
        bVal = b.workMode;
      } else if (sortField === "status") {
        aVal = a.status;
        bVal = b.status;
      } else if (sortField === "checkin") {
        aVal = a.checkInAt ? new Date(a.checkInAt).getTime() : 0;
        bVal = b.checkInAt ? new Date(b.checkInAt).getTime() : 0;
      } else if (sortField === "checkout") {
        aVal = a.checkOutAt ? new Date(a.checkOutAt).getTime() : 0;
        bVal = b.checkOutAt ? new Date(b.checkOutAt).getTime() : 0;
      } else if (sortField === "late") {
        aVal = a.lateMinutes;
        bVal = b.lateMinutes;
      } else if (sortField === "early") {
        aVal = a.earlyCheckoutMinutes;
        bVal = b.earlyCheckoutMinutes;
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [records, sortField, sortAsc, studioFilter]);

  // WFH-only records
  const wfhRecords = sortedRecords.filter((r) => r.workMode === "WFH");

  return (
    <Tabs defaultValue="attendance-log" className="w-full space-y-3">
      <div className="flex w-fit max-w-full flex-wrap rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900">
        {studioTabs.map((studio) => (
          <button
            key={studio.value}
            onClick={() => setStudioFilter(studio.value)}
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              studioFilter === studio.value
                ? "bg-white text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-zinc-50"
                : "text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            }`}
          >
            {studio.label}
          </button>
        ))}
      </div>

      <TabsList className="grid w-full max-w-md grid-cols-2 bg-zinc-100 dark:bg-zinc-900">
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
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Nama
                      <ArrowUpDown className={`size-3 ${sortField === "name" ? "text-blue-600 dark:text-blue-400" : "text-zinc-450"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("date")}>
                    <div className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Tanggal
                      <ArrowUpDown className={`size-3 ${sortField === "date" ? "text-blue-600 dark:text-blue-400" : "text-zinc-455"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("studio")}>
                    <div className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Default Studio
                      <ArrowUpDown className={`size-3 ${sortField === "studio" ? "text-blue-600 dark:text-blue-400" : "text-zinc-456"}`} />
                    </div>
                  </TableHead>
                  <TableHead>Lokasi</TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("validation")}>
                    <div className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Validasi Lokasi
                      <ArrowUpDown className={`size-3 ${sortField === "validation" ? "text-blue-600 dark:text-blue-400" : "text-zinc-457"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("distance")}>
                    <div className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Jarak
                      <ArrowUpDown className={`size-3 ${sortField === "distance" ? "text-blue-600 dark:text-blue-400" : "text-zinc-458"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("mode")}>
                    <div className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Mode
                      <ArrowUpDown className={`size-3 ${sortField === "mode" ? "text-blue-600 dark:text-blue-400" : "text-zinc-459"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("status")}>
                    <div className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Status
                      <ArrowUpDown className={`size-3 ${sortField === "status" ? "text-blue-600 dark:text-blue-400" : "text-zinc-460"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("checkin")}>
                    <div className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Check-in
                      <ArrowUpDown className={`size-3 ${sortField === "checkin" ? "text-blue-600 dark:text-blue-400" : "text-zinc-461"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("checkout")}>
                    <div className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Check-out
                      <ArrowUpDown className={`size-3 ${sortField === "checkout" ? "text-blue-600 dark:text-blue-400" : "text-zinc-462"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("late")}>
                    <div className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Terlambat
                      <ArrowUpDown className={`size-3 ${sortField === "late" ? "text-blue-600 dark:text-blue-400" : "text-zinc-463"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("early")}>
                    <div className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Pulang Cepat
                      <ArrowUpDown className={`size-3 ${sortField === "early" ? "text-blue-600 dark:text-blue-400" : "text-zinc-464"}`} />
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <AttendanceTableBodyClient
                records={sortedRecords}
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
                        <div className="flex items-center gap-2">
                          <div className={`size-8 rounded-full flex items-center justify-center text-lg shrink-0 border select-none ${getMood(item.user.currentMood).bgColor} ${getMood(item.user.currentMood).borderColor}`} title={getMood(item.user.currentMood).label}>
                            {getMood(item.user.currentMood).emoji}
                          </div>
                          <div>
                            <div className="text-zinc-900 dark:text-zinc-100">{item.user.name}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400">{item.user.email}</div>
                          </div>
                        </div>
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
