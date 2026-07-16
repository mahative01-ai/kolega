"use client";

import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Paperclip,
  ArrowUpDown,
  Search,
  ClipboardList,
  Clock,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { reviewRequestAction, deleteRequestAction } from "./actions";
import { reviewCorrectionAction, deleteCorrectionAction } from "../corrections/actions";

type RequestItem = {
  id: string;
  userId: string;
  type: string;
  status: string;
  startDate: Date;
  endDate: Date;
  replacementDate: Date | null;
  reason: string;
  attachmentUrl: string | null;
  reviewerId: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    name: string;
    email: string;
    defaultStudio: { name: string } | null;
  };
  reviewer: { name: string } | null;
};

type CorrectionItem = {
  id: string;
  attendanceRecordId: string;
  requestedById: string;
  approvedById: string | null;
  previousStatus: string | null;
  newStatus: string | null;
  proposedCheckInTime: string | null;
  reason: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  requestedBy: {
    name: string;
    email: string;
    defaultStudio: { name: string } | null;
  };
  attendanceRecord: {
    attendanceDate: Date;
  } | null;
  approvedBy: { name: string } | null;
};

type Props = {
  currentUser: { id: string; role: string; defaultStudioId: string | null };
  pendingRequests: RequestItem[];
  pendingCorrections: CorrectionItem[];
  historyRequests: RequestItem[];
  historyCorrections: CorrectionItem[];
  defaultTab: string;
};

const requestTypeLabel: Record<string, string> = {
  PERMISSION: "Izin",
  SICK: "Sakit",
  DISPENSATION: "Dispensasi",
  LEAVE: "Cuti Legacy",
  WFH: "WFH",
};

const requestTypeColor: Record<string, string> = {
  PERMISSION: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  SICK: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-300",
  DISPENSATION: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300",
  LEAVE: "bg-sky-100 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300",
  WFH: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
};

const requestStatusLabel: Record<string, string> = {
  PENDING: "Menunggu",
  APPROVED: "Disetujui",
  REJECTED: "Ditolak",
  CANCELLED: "Dibatalkan",
};

const requestStatusColor: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-250 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
  REJECTED: "bg-red-100 text-red-800 border-red-250 dark:bg-red-950/50 dark:text-red-300 dark:border-red-900",
  CANCELLED: "bg-zinc-100 text-zinc-800 border-zinc-250 dark:bg-zinc-900/50 dark:text-zinc-300 dark:border-zinc-800",
};

const statusLabel: Record<string, string> = {
  PRESENT: "Hadir",
  ON_TIME: "Tepat Waktu",
  LATE: "Terlambat",
  WFH: "WFH",
  PERMISSION: "Izin",
  SICK: "Sakit",
  DISPENSATION: "Dispensasi",
  LEAVE: "Cuti",
  ALPHA: "Alpha",
  HOLIDAY: "Libur",
  OFF_DAY: "Libur",
};

const statusColor: Record<string, string> = {
  PRESENT: "bg-emerald-100 text-emerald-800",
  ON_TIME: "bg-emerald-100 text-emerald-800",
  LATE: "bg-orange-100 text-orange-800",
  WFH: "bg-blue-100 text-blue-800",
  PERMISSION: "bg-amber-100 text-amber-800",
  SICK: "bg-violet-100 text-violet-800",
  DISPENSATION: "bg-emerald-100 text-emerald-800",
  LEAVE: "bg-sky-100 text-sky-800",
  ALPHA: "bg-red-100 text-red-800",
  HOLIDAY: "bg-zinc-200 text-zinc-700",
};

function formatDate(date: Date | string | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

export function ApprovalsTabsClient({
  currentUser,
  pendingRequests,
  pendingCorrections,
  historyRequests,
  historyCorrections,
  defaultTab,
}: Props) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Search & Filter state
  const [searchReq, setSearchReq] = useState("");
  const [searchCorr, setSearchCorr] = useState("");

  // Sorting state
  const [sortFieldPendingReq, setSortFieldPendingReq] = useState<string>("createdAt");
  const [sortAscPendingReq, setSortAscPendingReq] = useState<boolean>(false);

  const [sortFieldPendingCorr, setSortFieldPendingCorr] = useState<string>("createdAt");
  const [sortAscPendingCorr, setSortAscPendingCorr] = useState<boolean>(false);

  const [sortFieldHistoryReq, setSortFieldHistoryReq] = useState<string>("updatedAt");
  const [sortAscHistoryReq, setSortAscHistoryReq] = useState<boolean>(false);

  const [sortFieldHistoryCorr, setSortFieldHistoryCorr] = useState<string>("updatedAt");
  const [sortAscHistoryCorr, setSortAscHistoryCorr] = useState<boolean>(false);

  // Sorting handlers
  const handleSortPendingReq = (field: string) => {
    if (sortFieldPendingReq === field) {
      setSortAscPendingReq(!sortAscPendingReq);
    } else {
      setSortFieldPendingReq(field);
      setSortAscPendingReq(true);
    }
  };

  const handleSortPendingCorr = (field: string) => {
    if (sortFieldPendingCorr === field) {
      setSortAscPendingCorr(!sortAscPendingCorr);
    } else {
      setSortFieldPendingCorr(field);
      setSortAscPendingCorr(true);
    }
  };

  const handleSortHistoryReq = (field: string) => {
    if (sortFieldHistoryReq === field) {
      setSortAscHistoryReq(!sortAscHistoryReq);
    } else {
      setSortFieldHistoryReq(field);
      setSortAscHistoryReq(true);
    }
  };

  const handleSortHistoryCorr = (field: string) => {
    if (sortFieldHistoryCorr === field) {
      setSortAscHistoryCorr(!sortAscHistoryCorr);
    } else {
      setSortFieldHistoryCorr(field);
      setSortAscHistoryCorr(true);
    }
  };

  // Mapped lists
  const sortedAndFilteredPendingReq = useMemo(() => {
    let list = pendingRequests;
    const query = searchReq.toLowerCase().trim();
    if (query) {
      list = list.filter((r) => r.user.name.toLowerCase().includes(query));
    }

    return [...list].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortFieldPendingReq === "name") {
        aVal = a.user.name.toLowerCase();
        bVal = b.user.name.toLowerCase();
      } else if (sortFieldPendingReq === "type") {
        aVal = a.type;
        bVal = b.type;
      } else if (sortFieldPendingReq === "startDate") {
        aVal = new Date(a.startDate).getTime();
        bVal = new Date(b.startDate).getTime();
      } else if (sortFieldPendingReq === "endDate") {
        aVal = new Date(a.endDate).getTime();
        bVal = new Date(b.endDate).getTime();
      } else if (sortFieldPendingReq === "createdAt") {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      }

      if (aVal < bVal) return sortAscPendingReq ? -1 : 1;
      if (aVal > bVal) return sortAscPendingReq ? 1 : -1;
      return 0;
    });
  }, [pendingRequests, searchReq, sortFieldPendingReq, sortAscPendingReq]);

  const sortedAndFilteredPendingCorr = useMemo(() => {
    let list = pendingCorrections;
    const query = searchCorr.toLowerCase().trim();
    if (query) {
      list = list.filter((c) => c.requestedBy.name.toLowerCase().includes(query));
    }

    return [...list].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortFieldPendingCorr === "name") {
        aVal = a.requestedBy.name.toLowerCase();
        bVal = b.requestedBy.name.toLowerCase();
      } else if (sortFieldPendingCorr === "studio") {
        aVal = (a.requestedBy.defaultStudio?.name ?? "").toLowerCase();
        bVal = (b.requestedBy.defaultStudio?.name ?? "").toLowerCase();
      } else if (sortFieldPendingCorr === "date") {
        aVal = a.attendanceRecord ? new Date(a.attendanceRecord.attendanceDate).getTime() : 0;
        bVal = b.attendanceRecord ? new Date(b.attendanceRecord.attendanceDate).getTime() : 0;
      } else if (sortFieldPendingCorr === "previousStatus") {
        aVal = a.previousStatus ?? "";
        bVal = b.previousStatus ?? "";
      } else if (sortFieldPendingCorr === "newStatus") {
        aVal = a.newStatus ?? "";
        bVal = b.newStatus ?? "";
      } else if (sortFieldPendingCorr === "createdAt") {
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
      }

      if (aVal < bVal) return sortAscPendingCorr ? -1 : 1;
      if (aVal > bVal) return sortAscPendingCorr ? 1 : -1;
      return 0;
    });
  }, [pendingCorrections, searchCorr, sortFieldPendingCorr, sortAscPendingCorr]);

  const sortedAndFilteredHistoryReq = useMemo(() => {
    let list = historyRequests;
    const query = searchReq.toLowerCase().trim();
    if (query) {
      list = list.filter((r) => r.user.name.toLowerCase().includes(query));
    }

    return [...list].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortFieldHistoryReq === "name") {
        aVal = a.user.name.toLowerCase();
        bVal = b.user.name.toLowerCase();
      } else if (sortFieldHistoryReq === "studio") {
        aVal = (a.user.defaultStudio?.name ?? "").toLowerCase();
        bVal = (b.user.defaultStudio?.name ?? "").toLowerCase();
      } else if (sortFieldHistoryReq === "type") {
        aVal = a.type;
        bVal = b.type;
      } else if (sortFieldHistoryReq === "startDate") {
        aVal = new Date(a.startDate).getTime();
        bVal = new Date(b.startDate).getTime();
      } else if (sortFieldHistoryReq === "endDate") {
        aVal = new Date(a.endDate).getTime();
        bVal = new Date(b.endDate).getTime();
      } else if (sortFieldHistoryReq === "status") {
        aVal = a.status;
        bVal = b.status;
      } else if (sortFieldHistoryReq === "reviewer") {
        aVal = (a.reviewer?.name ?? "").toLowerCase();
        bVal = (b.reviewer?.name ?? "").toLowerCase();
      } else if (sortFieldHistoryReq === "updatedAt") {
        aVal = new Date(a.updatedAt).getTime();
        bVal = new Date(b.updatedAt).getTime();
      }

      if (aVal < bVal) return sortAscHistoryReq ? -1 : 1;
      if (aVal > bVal) return sortAscHistoryReq ? 1 : -1;
      return 0;
    });
  }, [historyRequests, searchReq, sortFieldHistoryReq, sortAscHistoryReq]);

  const sortedAndFilteredHistoryCorr = useMemo(() => {
    let list = historyCorrections;
    const query = searchCorr.toLowerCase().trim();
    if (query) {
      list = list.filter((c) => c.requestedBy.name.toLowerCase().includes(query));
    }

    return [...list].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortFieldHistoryCorr === "name") {
        aVal = a.requestedBy.name.toLowerCase();
        bVal = b.requestedBy.name.toLowerCase();
      } else if (sortFieldHistoryCorr === "studio") {
        aVal = (a.requestedBy.defaultStudio?.name ?? "").toLowerCase();
        bVal = (b.requestedBy.defaultStudio?.name ?? "").toLowerCase();
      } else if (sortFieldHistoryCorr === "date") {
        aVal = a.attendanceRecord ? new Date(a.attendanceRecord.attendanceDate).getTime() : 0;
        bVal = b.attendanceRecord ? new Date(b.attendanceRecord.attendanceDate).getTime() : 0;
      } else if (sortFieldHistoryCorr === "previousStatus") {
        aVal = a.previousStatus ?? "";
        bVal = b.previousStatus ?? "";
      } else if (sortFieldHistoryCorr === "newStatus") {
        aVal = a.newStatus ?? "";
        bVal = b.newStatus ?? "";
      } else if (sortFieldHistoryCorr === "status") {
        aVal = a.status;
        bVal = b.status;
      } else if (sortFieldHistoryCorr === "reviewer") {
        aVal = (a.approvedBy?.name ?? "").toLowerCase();
        bVal = (b.approvedBy?.name ?? "").toLowerCase();
      } else if (sortFieldHistoryCorr === "updatedAt") {
        aVal = new Date(a.updatedAt).getTime();
        bVal = new Date(b.updatedAt).getTime();
      }

      if (aVal < bVal) return sortAscHistoryCorr ? -1 : 1;
      if (aVal > bVal) return sortAscHistoryCorr ? 1 : -1;
      return 0;
    });
  }, [historyCorrections, searchCorr, sortFieldHistoryCorr, sortAscHistoryCorr]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="requests">Pengajuan Izin</TabsTrigger>
        <TabsTrigger value="corrections">Koreksi Kehadiran</TabsTrigger>
      </TabsList>

      {/* ────────────────── TAB 1: REQUESTS ────────────────── */}
      <TabsContent value="requests" className="space-y-6">
        <div className="flex max-w-sm mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            value={searchReq}
            onChange={(e) => setSearchReq(e.target.value)}
            placeholder="Cari nama lengkap..."
            className="pl-9"
          />
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-blue-700" />
              Menunggu Persetujuan Izin ({sortedAndFilteredPendingReq.length})
            </CardTitle>
            <CardDescription>
              Daftar pengajuan izin, sakit, cuti, atau WFH yang menunggu tinjauan Anda.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSortPendingReq("name")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Nama / Email <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortPendingReq("type")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Tipe <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortPendingReq("startDate")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Mulai <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortPendingReq("endDate")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Selesai <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead>Alasan / Catatan</TableHead>
                    <TableHead>Lampiran</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAndFilteredPendingReq.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-zinc-500">
                        Tidak ada pengajuan izin pending saat ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedAndFilteredPendingReq.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{req.user.name}</div>
                          <div className="text-[10px] text-zinc-500">{req.user.email}</div>
                          {req.user.defaultStudio?.name && (
                            <Badge variant="outline" className="text-[9px] scale-90 origin-left border-zinc-200 mt-0.5">
                              {req.user.defaultStudio.name}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={requestTypeColor[req.type]}>
                            {requestTypeLabel[req.type] ?? req.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{formatDate(req.startDate)}</TableCell>
                        <TableCell className="text-xs font-mono">{formatDate(req.endDate)}</TableCell>
                        <TableCell className="max-w-[180px] truncate text-xs">
                          <Dialog>
                            <DialogTrigger className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-medium" title="Klik untuk melihat detail">{req.reason}</DialogTrigger>
                            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
                              <DialogHeader>
                                <DialogTitle>Detail Alasan Izin</DialogTitle>
                                <DialogDescription>
                                  Diajukan oleh {req.user.name} ({req.user.email})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Tipe Pengajuan</p>
                                    <p className="mt-1 font-semibold">{requestTypeLabel[req.type] ?? req.type}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Studio Asal</p>
                                    <p className="mt-1">{req.user.defaultStudio?.name ?? "-"}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Periode Absen</p>
                                  <p className="mt-1 font-medium">{formatDate(req.startDate)} s.d. {formatDate(req.endDate)}</p>
                                </div>
                                {req.replacementDate && (
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Tanggal Ganti Hari</p>
                                    <p className="mt-1">{formatDate(req.replacementDate)}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Alasan Lengkap</p>
                                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-zinc-850 dark:text-zinc-200">{req.reason}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
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
                              Lihat File
                            </a>
                          ) : (
                            <span className="text-xs text-zinc-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <form action={reviewRequestAction} method="POST">
                              <input type="hidden" name="requestId" value={req.id} />
                              <input type="hidden" name="action" value="APPROVE" />
                              <Button
                                type="submit"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-8"
                              >
                                <CheckCircle2 className="size-3 mr-1" />
                                Setujui
                              </Button>
                            </form>
                            <form action={reviewRequestAction} method="POST">
                              <input type="hidden" name="requestId" value={req.id} />
                              <input type="hidden" name="action" value="REJECT" />
                              <Button
                                type="submit"
                                size="sm"
                                variant="destructive"
                                className="text-[11px] h-8"
                              >
                                <XCircle className="size-3 mr-1" />
                                Tolak
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* RIWAYAT PERSETUJUAN IZIN */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Clock className="size-5 text-zinc-500" />
              Riwayat Persetujuan Perizinan (50 Terakhir)
            </CardTitle>
            <CardDescription>
              Daftar perizinan yang telah disetujui, ditolak, atau dibatalkan.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSortHistoryReq("name")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Nama / Email <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortHistoryReq("studio")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Studio <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortHistoryReq("type")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Jenis <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortHistoryReq("startDate")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Mulai <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortHistoryReq("endDate")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Selesai <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead>Alasan / Catatan</TableHead>
                    <TableHead onClick={() => handleSortHistoryReq("status")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Status <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortHistoryReq("reviewer")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Ditinjau Oleh <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    {currentUser.role === "SUPER_ADMIN" && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAndFilteredHistoryReq.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={currentUser.role === "SUPER_ADMIN" ? 9 : 8}
                        className="h-24 text-center text-sm text-zinc-500"
                      >
                        Tidak ada riwayat perizinan.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedAndFilteredHistoryReq.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{req.user.name}</div>
                          <div className="text-[10px] text-zinc-500">{req.user.email}</div>
                        </TableCell>
                        <TableCell className="text-xs">{req.user.defaultStudio?.name ?? "-"}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className={`text-xs ${requestTypeColor[req.type]}`}>
                            {requestTypeLabel[req.type] ?? req.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs font-mono">{formatDate(req.startDate)}</TableCell>
                        <TableCell className="text-xs font-mono">{formatDate(req.endDate)}</TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">
                          <Dialog>
                            <DialogTrigger className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-medium">{req.reason}</DialogTrigger>
                            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
                              <DialogHeader>
                                <DialogTitle>Detail Alasan Izin (Riwayat)</DialogTitle>
                                <DialogDescription>
                                  Diajukan oleh {req.user.name} ({req.user.email})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Tipe Pengajuan</p>
                                    <p className="mt-1 font-semibold">{requestTypeLabel[req.type] ?? req.type}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Studio Asal</p>
                                    <p className="mt-1">{req.user.defaultStudio?.name ?? "-"}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Periode Absen</p>
                                  <p className="mt-1 font-medium">{formatDate(req.startDate)} s.d. {formatDate(req.endDate)}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Alasan Lengkap</p>
                                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-zinc-850 dark:text-zinc-200">{req.reason}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Status Pengajuan</p>
                                  <Badge className={`mt-1 ${requestStatusColor[req.status]}`}>
                                    {requestStatusLabel[req.status] ?? req.status}
                                  </Badge>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${requestStatusColor[req.status]}`}>
                            {requestStatusLabel[req.status] ?? req.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-550 dark:text-zinc-400">
                          {req.reviewer?.name ?? "-"}
                        </TableCell>
                        {currentUser.role === "SUPER_ADMIN" && (
                          <TableCell className="text-right">
                            <form action={deleteRequestAction} method="POST" onSubmit={(e) => {
                              if (!confirm("Apakah Anda yakin ingin menghapus pengajuan ini secara permanen dan memulihkan efek kehadirannya?")) {
                                e.preventDefault();
                              }
                            }}>
                              <input type="hidden" name="requestId" value={req.id} />
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-7 px-2"
                              >
                                Hapus
                              </Button>
                            </form>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ────────────────── TAB 2: CORRECTIONS ────────────────── */}
      <TabsContent value="corrections" className="space-y-6">
        <div className="flex max-w-sm mb-4 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
          <Input
            value={searchCorr}
            onChange={(e) => setSearchCorr(e.target.value)}
            placeholder="Cari nama lengkap..."
            className="pl-9"
          />
        </div>

        <Card className="shadow-none">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-5 text-amber-600" />
              Menunggu Persetujuan Koreksi ({sortedAndFilteredPendingCorr.length})
            </CardTitle>
            <CardDescription>
              Daftar permintaan koreksi data presensi lampau yang diajukan oleh member.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSortPendingCorr("name")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Nama / Email <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortPendingCorr("studio")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Studio <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortPendingCorr("date")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Tanggal Presensi <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortPendingCorr("previousStatus")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Status Lama <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortPendingCorr("newStatus")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Status Baru <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead>Alasan Koreksi</TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAndFilteredPendingCorr.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center text-sm text-zinc-500">
                        Tidak ada pengajuan koreksi presensi pending saat ini.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedAndFilteredPendingCorr.map((corr) => (
                      <TableRow key={corr.id}>
                        <TableCell>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{corr.requestedBy.name}</div>
                          <div className="text-xs text-zinc-500">{corr.requestedBy.email}</div>
                        </TableCell>
                        <TableCell>{corr.requestedBy.defaultStudio?.name ?? "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{formatDate(corr.attendanceRecord?.attendanceDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={corr.previousStatus ? statusColor[corr.previousStatus] : ""}>
                            {corr.previousStatus ? (statusLabel[corr.previousStatus] ?? corr.previousStatus) : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={corr.newStatus ? statusColor[corr.newStatus] : ""}>
                            {corr.newStatus ? (statusLabel[corr.newStatus] ?? corr.newStatus) : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-xs">
                          <Dialog>
                            <DialogTrigger className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-medium" title="Klik untuk detail alasan">{corr.reason}</DialogTrigger>
                            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
                              <DialogHeader>
                                <DialogTitle>Detail Alasan Koreksi</DialogTitle>
                                <DialogDescription>
                                  Diajukan oleh {corr.requestedBy.name} ({corr.requestedBy.email})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Tanggal Kehadiran</p>
                                    <p className="mt-1 font-semibold">{formatDate(corr.attendanceRecord?.attendanceDate)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Studio Asal</p>
                                    <p className="mt-1">{corr.requestedBy.defaultStudio?.name ?? "-"}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Status Lama</p>
                                    <Badge variant="outline" className={corr.previousStatus ? statusColor[corr.previousStatus] : "mt-1"}>
                                      {corr.previousStatus ? (statusLabel[corr.previousStatus] ?? corr.previousStatus) : "-"}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Status Baru</p>
                                    <Badge variant="outline" className={corr.newStatus ? statusColor[corr.newStatus] : "mt-1"}>
                                      {corr.newStatus ? (statusLabel[corr.newStatus] ?? corr.newStatus) : "-"}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Jam Check-In Baru</p>
                                    <p className="mt-1 font-medium">{corr.proposedCheckInTime ? corr.proposedCheckInTime : "-"}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Alasan Lengkap</p>
                                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-zinc-850 dark:text-zinc-200">{corr.reason}</p>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <form action={reviewCorrectionAction} method="POST">
                              <input type="hidden" name="correctionId" value={corr.id} />
                              <input type="hidden" name="action" value="APPROVE" />
                              <Button
                                type="submit"
                                size="sm"
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] h-8"
                              >
                                <CheckCircle2 className="size-3 mr-1" />
                                Setujui
                              </Button>
                            </form>
                            <form action={reviewCorrectionAction} method="POST">
                              <input type="hidden" name="correctionId" value={corr.id} />
                              <input type="hidden" name="action" value="REJECT" />
                              <Button
                                type="submit"
                                size="sm"
                                variant="destructive"
                                className="text-[11px] h-8"
                              >
                                <XCircle className="size-3 mr-1" />
                                Tolak
                              </Button>
                            </form>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* RIWAYAT PERSETUJUAN KOREKSI */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
              <Clock className="size-5 text-zinc-500" />
              Riwayat Persetujuan Koreksi (50 Terakhir)
            </CardTitle>
            <CardDescription>
              Daftar permintaan koreksi data presensi yang telah disetujui atau ditolak.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead onClick={() => handleSortHistoryCorr("name")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Nama / Email <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortHistoryCorr("studio")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Studio <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortHistoryCorr("date")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Tanggal Presensi <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortHistoryCorr("previousStatus")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Status Lama <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortHistoryCorr("newStatus")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Status Baru <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead>Alasan Koreksi</TableHead>
                    <TableHead onClick={() => handleSortHistoryCorr("status")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Status <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    <TableHead onClick={() => handleSortHistoryCorr("reviewer")} className="cursor-pointer select-none hover:bg-zinc-50 dark:hover:bg-zinc-900/50">
                      <div className="flex items-center gap-1">
                        Ditinjau Oleh <ArrowUpDown className="size-3 text-zinc-400" />
                      </div>
                    </TableHead>
                    {currentUser.role === "SUPER_ADMIN" && <TableHead className="text-right">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAndFilteredHistoryCorr.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={currentUser.role === "SUPER_ADMIN" ? 9 : 8}
                        className="h-24 text-center text-sm text-zinc-500"
                      >
                        Tidak ada riwayat koreksi.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedAndFilteredHistoryCorr.map((corr) => (
                      <TableRow key={corr.id}>
                        <TableCell>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">{corr.requestedBy.name}</div>
                          <div className="text-[10px] text-zinc-500">{corr.requestedBy.email}</div>
                        </TableCell>
                        <TableCell className="text-xs">{corr.requestedBy.defaultStudio?.name ?? "-"}</TableCell>
                        <TableCell className="text-xs font-mono">{formatDate(corr.attendanceRecord?.attendanceDate)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${corr.previousStatus ? statusColor[corr.previousStatus] : ""}`}>
                            {corr.previousStatus ? (statusLabel[corr.previousStatus] ?? corr.previousStatus) : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${corr.newStatus ? statusColor[corr.newStatus] : ""}`}>
                            {corr.newStatus ? (statusLabel[corr.newStatus] ?? corr.newStatus) : "-"}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate text-xs">
                          <Dialog>
                            <DialogTrigger className="cursor-pointer hover:underline text-blue-600 dark:text-blue-400 font-medium">{corr.reason}</DialogTrigger>
                            <DialogContent className="max-w-md bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 font-sans">
                              <DialogHeader>
                                <DialogTitle>Detail Alasan Koreksi (Riwayat)</DialogTitle>
                                <DialogDescription>
                                  Diajukan oleh {corr.requestedBy.name} ({corr.requestedBy.email})
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-2 text-sm text-zinc-700 dark:text-zinc-300">
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Tanggal Kehadiran</p>
                                    <p className="mt-1 font-semibold">{formatDate(corr.attendanceRecord?.attendanceDate)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Studio Asal</p>
                                    <p className="mt-1">{corr.requestedBy.defaultStudio?.name ?? "-"}</p>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Status Lama</p>
                                    <Badge variant="outline" className={corr.previousStatus ? statusColor[corr.previousStatus] : "mt-1"}>
                                      {corr.previousStatus ? (statusLabel[corr.previousStatus] ?? corr.previousStatus) : "-"}
                                    </Badge>
                                  </div>
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Status Baru</p>
                                    <Badge variant="outline" className={corr.newStatus ? statusColor[corr.newStatus] : "mt-1"}>
                                      {corr.newStatus ? (statusLabel[corr.newStatus] ?? corr.newStatus) : "-"}
                                    </Badge>
                                  </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <div>
                                    <p className="text-xs font-semibold text-zinc-400">Jam Check-In Baru</p>
                                    <p className="mt-1 font-medium">{corr.proposedCheckInTime ? corr.proposedCheckInTime : "-"}</p>
                                  </div>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Alasan Lengkap</p>
                                  <p className="mt-1 whitespace-pre-wrap leading-relaxed text-zinc-850 dark:text-zinc-200">{corr.reason}</p>
                                </div>
                                <div>
                                  <p className="text-xs font-semibold text-zinc-400">Status Pengajuan</p>
                                  <Badge className={`mt-1 ${requestStatusColor[corr.status]}`}>
                                    {requestStatusLabel[corr.status] ?? corr.status}
                                  </Badge>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-[10px] ${requestStatusColor[corr.status]}`}>
                            {requestStatusLabel[corr.status] ?? corr.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-zinc-500">
                          {corr.approvedBy?.name ?? "-"}
                        </TableCell>
                        {currentUser.role === "SUPER_ADMIN" && (
                          <TableCell className="text-right">
                            <form action={deleteCorrectionAction} method="POST" onSubmit={(e) => {
                              if (!confirm("Apakah Anda yakin ingin menghapus koreksi ini secara permanen dan memulihkan data kehadiran sebelumnya?")) {
                                e.preventDefault();
                              }
                            }}>
                              <input type="hidden" name="correctionId" value={corr.id} />
                              <Button
                                type="submit"
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 h-7 px-2"
                              >
                                Hapus
                              </Button>
                            </form>
                          </TableCell>
                        )}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}

