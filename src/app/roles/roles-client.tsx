"use client";

import { useMemo, useState, useTransition } from "react";
import { Building2, Edit, Eye, Mail, Search, UserCog, UserPlus, Loader2, ArrowUpDown, Cake, Plus, Trash2 } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_LABEL } from "@/lib/roles";
import { createUserAction, updateUserAction } from "./actions";
import { getMood } from "@/lib/moods";

type UserWithRelations = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  birthDate: Date | null;
  role: "SUPER_ADMIN" | "ADMIN" | "MEMBER";
  memberStatus: "TEAM" | "INTERN";
  accountStatus: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  annualLeaveBalance: number;
  workDayBalance: number;
  defaultStudioId: string | null;
  picketDay: string | null;
  currentMood: string;
  defaultStudio: { name: string } | null;
  placements: Array<{
    id: string;
    studioId: string;
    studio: { name: string };
    startDate: Date;
  }>;
  internProfile?: {
    program: "MAGANG" | "PKL";
    institution: string;
    startDate: Date;
    endDate: Date;
    mentorId: string | null;
  } | null;
  attendanceRecords?: Array<{
    id: string;
    attendanceDate: Date;
    workMode: string;
    status: string;
    checkInAt: Date | null;
    checkOutAt: Date | null;
    lateMinutes: number;
  }>;
};

const accountStatusLabel: Record<string, string> = {
  ACTIVE: "Active",
  INACTIVE: "Inactive",
  ARCHIVED: "Archived",
};

const accountStatusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-amber-100 text-amber-800",
  ARCHIVED: "bg-zinc-200 text-zinc-700",
};

function formatDate(date: Date | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(date));
}

function formatTime(date: Date | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(new Date(date));
}

function formatInputDate(date: Date | null | undefined) {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function workDayBalanceText(balance: number) {
  if (balance < 0) return `${Math.abs(balance)} day debt`;
  if (balance > 0) return `${balance} day surplus`;
  return "Settled";
}

function workDayBalanceClass(balance: number) {
  if (balance < 0) return "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/20 dark:text-red-300";
  if (balance > 0) return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/20 dark:text-emerald-300";
  return "border-zinc-200 bg-zinc-50 text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300";
}

export function RolesClient({
  currentUser,
  users,
  studios,
  mentors,
}: {
  currentUser: { id: string; role: string; defaultStudioId: string | null };
  users: UserWithRelations[];
  studios: Array<{ id: string; name: string }>;
  mentors: Array<{ id: string; name: string }>;
}) {
  const isSuperAdmin = currentUser.role === "SUPER_ADMIN";
  const canShowActions = isSuperAdmin || currentUser.role === "ADMIN";

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRelations | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewUser, setViewUser] = useState<UserWithRelations | null>(null);
  const [page, setPage] = useState(1);
  const [detailScope, setDetailScope] = useState<"ALL" | "MONTH">("MONTH");
  const [detailMonth, setDetailMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const pageSize = 10;

  const handleOpenView = (user: UserWithRelations) => {
    setViewUser(user);
    setDetailScope("MONTH");
    setDetailMonth(new Date().toISOString().slice(0, 7));
    setViewOpen(true);
  };

  const [addMemberStatus, setAddMemberStatus] = useState("TEAM");
  const [editMemberStatus, setEditMemberStatus] = useState("TEAM");
  const [editAccountStatus, setEditAccountStatus] = useState("ACTIVE");
  const [searchQuery, setSearchQuery] = useState("");
  const [studioFilter, setStudioFilter] = useState("ALL");
  const [memberTypeFilter, setMemberTypeFilter] = useState<
    "ALL" | "TEAM" | "INTERN"
  >("ALL");
  const [statusFilter, setStatusFilter] = useState<
    "ACTIVE" | "INACTIVE" | "ARCHIVED"
  >("ACTIVE");

  const [addMentorId, setAddMentorId] = useState("");
  const [editMentorId, setEditMentorId] = useState("");

  const [sortField, setSortField] = useState<string>("name");
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const handleOpenEdit = (user: UserWithRelations) => {
    setSelectedUser(user);
    setEditMemberStatus(user.memberStatus);
    setEditAccountStatus(user.accountStatus);
    setEditMentorId(user.internProfile?.mentorId ?? "");
    setErrorMsg("");
    setEditOpen(true);
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    const filtered = users.filter((user) => {
      const matchesStatus = user.accountStatus === statusFilter;
      const activePlacement = user.placements?.[0];
      const currentStudioId = activePlacement ? activePlacement.studioId : user.defaultStudioId;
      const matchesStudio = isSuperAdmin
        ? (studioFilter === "ALL" || currentStudioId === studioFilter)
        : (currentStudioId === currentUser.defaultStudioId);
      const matchesMemberType =
        memberTypeFilter === "ALL" || user.memberStatus === memberTypeFilter;
      const matchesQuery =
        !query ||
        user.name.toLowerCase().includes(query);

      return (
        matchesStatus && matchesStudio && matchesMemberType && matchesQuery
      );
    });

    return [...filtered].sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";

      if (sortField === "name") {
        aVal = a.name.toLowerCase();
        bVal = b.name.toLowerCase();
      } else if (sortField === "email") {
        aVal = a.email.toLowerCase();
        bVal = b.email.toLowerCase();
      } else if (sortField === "studio") {
        aVal = (a.defaultStudio?.name ?? "").toLowerCase();
        bVal = (b.defaultStudio?.name ?? "").toLowerCase();
      } else if (sortField === "memberStatus") {
        aVal = a.memberStatus;
        bVal = b.memberStatus;
      } else if (sortField === "workDayBalance") {
        aVal = a.workDayBalance;
        bVal = b.workDayBalance;
      } else if (sortField === "accountStatus") {
        aVal = a.accountStatus;
        bVal = b.accountStatus;
      } else if (sortField === "role") {
        aVal = a.role;
        bVal = b.role;
      }

      if (aVal < bVal) return sortAsc ? -1 : 1;
      if (aVal > bVal) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [
    isSuperAdmin,
    memberTypeFilter,
    searchQuery,
    statusFilter,
    studioFilter,
    users,
    currentUser.defaultStudioId,
    sortField,
    sortAsc,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / pageSize));
  const paginatedUsers = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    return filteredUsers.slice((safePage - 1) * pageSize, safePage * pageSize);
  }, [filteredUsers, page, totalPages]);

  const detailRecords = useMemo(() => {
    const records = viewUser?.attendanceRecords ?? [];
    if (detailScope === "ALL") return records;
    return records.filter((record) => {
      const date = new Date(record.attendanceDate);
      const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
      return monthKey === detailMonth;
    });
  }, [detailMonth, detailScope, viewUser]);

  const detailStats = useMemo(() => {
    return detailRecords.reduce(
      (acc, record) => {
        acc.total += 1;
        if (record.status === "ON_TIME") acc.onTime += 1;
        if (record.status === "LATE") acc.late += 1;
        if (record.status === "SICK") acc.sick += 1;
        if (record.status === "PERMISSION") acc.permission += 1;
        if (record.status === "ALPHA") acc.alpha += 1;
        if (record.workMode === "WFH") acc.wfh += 1;
        return acc;
      },
      { total: 0, onTime: 0, late: 0, sick: 0, permission: 0, alpha: 0, wfh: 0 }
    );
  }, [detailRecords]);

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const res = await createUserAction(formData);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to create user.");
      } else {
        setAddOpen(false);
        form.reset();
        setAddMemberStatus("TEAM");
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      const res = await updateUserAction(formData);
      if (!res.success) {
        setErrorMsg(res.error || "Failed to update user.");
      } else {
        setEditOpen(false);
      }
    });
  };

  const totalTeam = useMemo(() => filteredUsers.filter(u => u.memberStatus === "TEAM").length, [filteredUsers]);
  const totalIntern = useMemo(() => filteredUsers.filter(u => u.memberStatus === "INTERN").length, [filteredUsers]);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 sm:grid-cols-2">
        <Card className="shadow-none border border-zinc-200 dark:border-zinc-800">
          <CardHeader className="p-4 text-center">
            <CardDescription className="font-medium text-zinc-500 dark:text-zinc-400">
              Total Team
            </CardDescription>
            <CardTitle className="mt-1 text-4xl font-bold text-blue-700 dark:text-blue-400">
              {totalTeam}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="shadow-none border border-zinc-200 dark:border-zinc-800">
          <CardHeader className="p-4 text-center">
            <CardDescription className="font-medium text-zinc-500 dark:text-zinc-400">
              Total Intern
            </CardDescription>
            <CardTitle className="mt-1 text-4xl font-bold text-amber-600 dark:text-amber-400">
              {totalIntern}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
                <UserCog className="size-5 text-blue-700 dark:text-blue-400" />
                Studio Users
              </CardTitle>
              <CardDescription className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                {isSuperAdmin
                  ? "Super Admin has full access to create, edit, and manage member accounts."
                  : "Admin can only view members in their assigned studio."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-3">
            {isSuperAdmin ? (
              <>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mr-1">
                  <Building2 className="size-3.5" aria-hidden="true" />
                  Studio
                </div>
                <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-0.5 shadow-sm">
                  <Button
                    type="button"
                    size="sm"
                    variant={studioFilter === "ALL" ? "default" : "ghost"}
                    className="h-7 px-3 text-xs"
                    onClick={() => {
                      setStudioFilter("ALL");
                      setPage(1);
                    }}
                  >
                    All
                  </Button>
                  {studios.map((studio) => (
                    <Button
                      key={studio.id}
                      type="button"
                      size="sm"
                      variant={studioFilter === studio.id ? "default" : "ghost"}
                      className="h-7 px-3 text-xs"
                      onClick={() => {
                        setStudioFilter(studio.id);
                        setPage(1);
                      }}
                    >
                      {studio.name}
                    </Button>
                  ))}
                </div>
                <div className="mx-1 h-5 w-px bg-zinc-300 dark:bg-zinc-700" />
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 mr-2 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-md">
                  <Building2 className="size-3.5 text-blue-700 dark:text-blue-400" aria-hidden="true" />
                  Studio: {studios.find((s) => s.id === currentUser.defaultStudioId)?.name ?? "My Studio"}
                </div>
                <div className="mx-1 h-5 w-px bg-zinc-300 dark:bg-zinc-700" />
              </>
            )}

            <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-0.5 shadow-sm">
              {(["ALL", "TEAM", "INTERN"] as const).map((type) => (
                <Button
                  key={type}
                  type="button"
                  size="sm"
                  variant={memberTypeFilter === type ? "default" : "ghost"}
                  className="h-7 px-3 text-xs"
                  onClick={() => {
                    setMemberTypeFilter(type);
                    setPage(1);
                  }}
                >
                  {type === "ALL" ? "All" : type === "TEAM" ? "Team" : "Intern"}
                </Button>
              ))}
            </div>

            {(isSuperAdmin || currentUser.role === "ADMIN") && (
              <div className="ml-auto">
                <Button
                  size="sm"
                  onClick={() => {
                    setErrorMsg("");
                    setAddOpen(true);
                  }}
                >
                  <UserPlus aria-hidden="true" className="size-3.5" />
                  Add Member
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <Input
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setPage(1);
                }}
                placeholder="Search full name..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-0.5 shadow-sm">
              {(["ACTIVE", "INACTIVE", "ARCHIVED"] as const).map((status) => (
                <Button
                  key={status}
                  type="button"
                  size="sm"
                  variant={statusFilter === status ? "default" : "ghost"}
                  className="h-7 px-3 text-xs"
                  onClick={() => {
                    setStatusFilter(status);
                    setPage(1);
                  }}
                >
                  {accountStatusLabel[status]}
                </Button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("name")}>
                    <div className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Name / Username
                      <ArrowUpDown className={`size-3.5 ${sortField === "name" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("memberStatus")}>
                    <div className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Member Type
                      <ArrowUpDown className={`size-3.5 ${sortField === "memberStatus" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("workDayBalance")}>
                    <div className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Workday Balance
                      <ArrowUpDown className={`size-3.5 ${sortField === "workDayBalance" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`} />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer select-none" onClick={() => handleSort("accountStatus")}>
                    <div className="flex items-center gap-1.5 hover:text-zinc-900 dark:hover:text-zinc-100">
                      Account Status
                      <ArrowUpDown className={`size-3.5 ${sortField === "accountStatus" ? "text-blue-600 dark:text-blue-400" : "text-zinc-400"}`} />
                    </div>
                  </TableHead>
                  {canShowActions && <TableHead className="text-right">Actions</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={canShowActions ? 5 : 4}
                      className="h-24 text-center text-sm text-zinc-500"
                    >
                      No members match this search or status.
                    </TableCell>
                  </TableRow>
                ) : paginatedUsers.map((user) => {
                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className={`size-8 rounded-full flex items-center justify-center text-lg shrink-0 border select-none ${getMood(user.currentMood).bgColor} ${getMood(user.currentMood).borderColor}`} title={getMood(user.currentMood).label}>
                            {getMood(user.currentMood).emoji}
                          </div>
                          <div>
                            <div className="text-zinc-900 dark:text-zinc-100">{user.name}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                              @{user.username || "not_set"}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant="secondary">{user.memberStatus}</Badge>
                          {user.memberStatus === "INTERN" && user.internProfile && (
                            <span className="text-[10px] text-zinc-500">
                              {user.internProfile.program} - {user.internProfile.institution}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={workDayBalanceClass(user.workDayBalance)}>
                          {workDayBalanceText(user.workDayBalance)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={accountStatusColor[user.accountStatus]}>
                          {accountStatusLabel[user.accountStatus]}
                        </Badge>
                      </TableCell>
                      {canShowActions && (
                        <TableCell className="text-right flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenView(user)}
                            className="h-8 px-2 text-xs border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-900"
                          >
                            <Eye className="size-3" aria-hidden="true" />
                            Details
                          </Button>
                          {(isSuperAdmin || (currentUser.role === "ADMIN" && user.role === "MEMBER")) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(user)}
                              className="h-8 px-2 text-xs"
                            >
                              <Edit className="size-3" aria-hidden="true" />
                              Edit
                            </Button>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {filteredUsers.length > pageSize && (
            <div className="flex flex-col gap-2 border-t border-zinc-100 pt-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
              <span>
                Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, filteredUsers.length)} of {filteredUsers.length} users
              </span>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
                  Previous
                </Button>
                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                  Page {page} / {totalPages}
                </span>
                <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Member Baru</DialogTitle>
            <DialogDescription>
              Buat akun baru untuk karyawan atau mahasiswa magang (Intern).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="grid gap-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Full Name *</label>
                <Input name="name" placeholder="Full name" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Username</label>
                <Input name="username" placeholder="username" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Email *</label>
                <Input name="email" type="email" placeholder="email@domain.com" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Password *</label>
                <Input name="password" type="password" placeholder="Min. 6 karakter" required minLength={6} />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Birth Date</label>
                <Input name="birthDate" type="date" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Role *</label>
                <select
                  name="role"
                  className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none disabled:opacity-80"
                  defaultValue="MEMBER"
                  disabled={!isSuperAdmin}
                >
                  <option value="MEMBER">Member</option>
                  {isSuperAdmin && <option value="ADMIN">Admin</option>}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Member Type *</label>
                <select
                  name="memberStatus"
                  className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                  value={addMemberStatus}
                  onChange={(e) => setAddMemberStatus(e.target.value)}
                >
                  <option value="TEAM">Team</option>
                  <option value="INTERN">Intern</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Default Studio</label>
                <select
                  name="defaultStudioId"
                  required
                  className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                  defaultValue=""
                >
                  <option value="">Select studio</option>
                  {studios.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {addMemberStatus === "INTERN" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Placement Studio Awal</label>
                <select
                  name="placementStudioId"
                  className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                  defaultValue=""
                >
                  <option value="">No placement</option>
                  {studios.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            )}

            {addMemberStatus === "INTERN" && (
              <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-3 grid gap-2.5 mt-1">
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Intern Profile</div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Program *</label>
                    <select name="program" className="h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2 text-xs outline-none" defaultValue="MAGANG">
                      <option value="MAGANG">Magang</option>
                      <option value="PKL">PKL</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500">Institusi *</label>
                    <Input name="institution" placeholder="School/university name" className="h-8 text-xs" required={addMemberStatus === "INTERN"} />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500">Start Date *</label>
                    <Input name="startDate" type="date" className="h-8 text-xs" required={addMemberStatus === "INTERN"} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500">End Date *</label>
                    <Input name="endDate" type="date" className="h-8 text-xs" required={addMemberStatus === "INTERN"} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Field Mentor</label>
                  <input type="hidden" name="mentorId" value={addMentorId} />
                  <Combobox
                    options={[
                      { value: "", label: "No mentor" },
                      ...mentors.map((m) => ({ value: m.id, label: m.name })),
                    ]}
                    value={addMentorId}
                    onChange={setAddMentorId}
                    placeholder="Select Mentor..."
                    searchPlaceholder="Search mentor..."
                  />
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-1">{errorMsg}</p>
            )}

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} className="flex items-center gap-1.5">
                {isPending && <Loader2 className="size-4 animate-spin" />}
                {isPending ? "Saving..." : "Save Member"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Member Information</DialogTitle>
            <DialogDescription>
              Update profile details, studio assignment, or account status.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditSubmit} className="grid gap-3 py-2">
              <input type="hidden" name="userId" value={selectedUser.id} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Full Name *</label>
                  <Input name="name" defaultValue={selectedUser.name} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Username</label>
                  <Input name="username" defaultValue={selectedUser.username || ""} placeholder="username" />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Email *</label>
                  <Input name="email" type="email" defaultValue={selectedUser.email} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Birth Date</label>
                  <Input name="birthDate" type="date" defaultValue={formatInputDate(selectedUser.birthDate)} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Role *</label>
                  <select
                    name="role"
                    className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none disabled:opacity-80"
                    defaultValue={selectedUser.role}
                    disabled={!isSuperAdmin}
                  >
                    <option value="MEMBER">Member</option>
                    {isSuperAdmin && <option value="ADMIN">Admin</option>}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">
                    Account Status Approval *
                  </label>
                  <select
                    name="accountStatus"
                    className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                    value={editAccountStatus}
                    onChange={(event) =>
                      setEditAccountStatus(event.target.value)
                    }
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="INACTIVE">Inactive</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>

              {editAccountStatus !== selectedUser.accountStatus ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Perubahan status ini akan dicatat sebagai persetujuan Super
                  Admin di audit log.
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Member Type *</label>
                  <select
                    name="memberStatus"
                    className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                    value={editMemberStatus}
                    onChange={(e) => setEditMemberStatus(e.target.value)}
                  >
                    <option value="TEAM">Team</option>
                    <option value="INTERN">Intern</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Default Studio</label>
                  <select
                    name="defaultStudioId"
                    required
                    className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                    defaultValue={selectedUser.defaultStudioId ?? ""}
                  >
                    <option value="">Select studio</option>
                    {studios.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Default Picket Day</label>
                  <select
                    name="picketDay"
                    className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                    defaultValue={selectedUser.picketDay ?? ""}
                  >
                    <option value="">No picket</option>
                    <option value="SENIN">Monday</option>
                    <option value="SELASA">Tuesday</option>
                    <option value="RABU">Wednesday</option>
                    <option value="KAMIS">Thursday</option>
                    <option value="JUMAT">Friday</option>
                    <option value="SABTU">Saturday</option>
                    <option value="MINGGU">Sunday</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Workday Balance</label>
                  <Input
                    name="workDayBalance"
                    type="number"
                    defaultValue={selectedUser.workDayBalance}
                    disabled={!isSuperAdmin}
                  />
                  <p className="text-[10px] text-zinc-500">Negative means replacement-day debt, positive means surplus.</p>
                </div>
              </div>

              {editMemberStatus === "INTERN" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Active Placement Studio</label>
                  <select
                    name="placementStudioId"
                    className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                    defaultValue={selectedUser.placements[0]?.studioId ?? ""}
                  >
                    <option value="">No active placement</option>
                    {studios.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {editMemberStatus === "INTERN" && (
                <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-3 grid gap-2.5 mt-1">
                  <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Intern Profile</div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Program *</label>
                      <select
                        name="program"
                        className="h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2 text-xs outline-none"
                        defaultValue={selectedUser.internProfile?.program ?? "MAGANG"}
                      >
                        <option value="MAGANG">Magang</option>
                        <option value="PKL">PKL</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500">Institusi *</label>
                      <Input
                        name="institution"
                        defaultValue={selectedUser.internProfile?.institution ?? ""}
                        placeholder="School/university name"
                        className="h-8 text-xs"
                        required={editMemberStatus === "INTERN"}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500">Start Date *</label>
                      <Input
                        name="startDate"
                        type="date"
                        defaultValue={formatInputDate(selectedUser.internProfile?.startDate)}
                        className="h-8 text-xs"
                        required={editMemberStatus === "INTERN"}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500">End Date *</label>
                      <Input
                        name="endDate"
                        type="date"
                        defaultValue={formatInputDate(selectedUser.internProfile?.endDate)}
                        className="h-8 text-xs"
                        required={editMemberStatus === "INTERN"}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Field Mentor</label>
                    <input type="hidden" name="mentorId" value={editMentorId} />
                    <Combobox
                      options={[
                        { value: "", label: "No mentor" },
                        ...mentors.map((m) => ({ value: m.id, label: m.name })),
                      ]}
                      value={editMentorId}
                      onChange={setEditMentorId}
                      placeholder="Select Mentor..."
                      searchPlaceholder="Search mentor..."
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-1">{errorMsg}</p>
              )}

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={isPending}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} className="flex items-center gap-1.5">
                  {isPending && <Loader2 className="size-4 animate-spin" />}
                  {isPending
                    ? "Saving..."
                    : editAccountStatus !== selectedUser.accountStatus
                      ? "Approve & Save"
                      : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
      {/* Member Details Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto border-zinc-800 bg-zinc-950 text-zinc-50 sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Member Details</DialogTitle>
            <DialogDescription className="text-zinc-400">
              Profile and attendance history.
            </DialogDescription>
          </DialogHeader>
          
          {viewUser && (
            <div className="grid gap-5 py-2 text-sm">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
                <div className="h-24 rounded-xl bg-[radial-gradient(circle_at_20%_20%,#22c55e,transparent_35%),linear-gradient(135deg,#0f766e,#84cc16_55%,#fef3c7)]" />
                <div className="-mt-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                  <div className="flex items-end gap-4">
                    <div className={`flex size-20 items-center justify-center rounded-full border-2 border-zinc-950 text-3xl ${getMood(viewUser.currentMood).bgColor} ${getMood(viewUser.currentMood).borderColor}`}>
                      {getMood(viewUser.currentMood).emoji}
                    </div>
                    <div className="pb-1">
                      <h3 className="text-xl font-semibold">{viewUser.name}</h3>
                      <div className="mt-1 flex flex-wrap gap-3 text-xs text-zinc-400">
                        <span className="inline-flex items-center gap-1"><Mail className="size-3.5" /> {viewUser.email}</span>
                        <span className="inline-flex items-center gap-1"><Cake className="size-3.5" /> {formatDate(viewUser.birthDate)}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Badge className="border-blue-500/30 bg-blue-500/15 text-blue-300">{ROLE_LABEL[viewUser.role]}</Badge>
                        <Badge className="border-sky-500/30 bg-sky-500/15 text-sky-300">{viewUser.memberStatus}</Badge>
                        <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">{accountStatusLabel[viewUser.accountStatus]}</Badge>
                        <Badge variant="outline" className={workDayBalanceClass(viewUser.workDayBalance)}>
                          {workDayBalanceText(viewUser.workDayBalance)}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid gap-1 rounded-xl border border-zinc-800 bg-zinc-950/70 px-4 py-3 text-xs text-zinc-400">
                    <span>@{viewUser.username || "not_set"}</span>
                    <span>{viewUser.defaultStudio?.name || "No default studio"}</span>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  ["Total", detailStats.total, "text-blue-300"],
                  ["On Time", detailStats.onTime, "text-emerald-300"],
                  ["Late", detailStats.late, "text-orange-300"],
                  ["Sick", detailStats.sick, "text-violet-300"],
                  ["Permission", detailStats.permission, "text-amber-300"],
                  ["Alpha", detailStats.alpha, "text-red-300"],
                  ["WFH", detailStats.wfh, "text-sky-300"],
                ].map(([label, value, color]) => (
                  <div key={label} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-xs text-zinc-500">{label}</p>
                    <p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {viewUser.memberStatus === "INTERN" && viewUser.internProfile && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-zinc-400">Intern Profile</h4>
                  <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                    <span>Program: <b className="text-zinc-100">{viewUser.internProfile.program}</b></span>
                    <span>Institution: <b className="text-zinc-100">{viewUser.internProfile.institution}</b></span>
                    <span>Period: <b className="text-zinc-100">{formatDate(viewUser.internProfile.startDate)} - {formatDate(viewUser.internProfile.endDate)}</b></span>
                    <span>Mentor: <b className="text-zinc-100">{mentors.find((m) => m.id === viewUser.internProfile?.mentorId)?.name || "Not assigned"}</b></span>
                  </div>
                </div>
              )}

              <div className="space-y-3 border-t border-zinc-800 pt-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Attendance History</p>
                    <p className="text-xs text-zinc-500">Latest attendance records for the selected scope.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="flex rounded-lg border border-zinc-800 bg-zinc-900 p-0.5">
                      <Button type="button" size="sm" variant={detailScope === "MONTH" ? "secondary" : "ghost"} onClick={() => setDetailScope("MONTH")} className="h-7 text-xs">
                        Month
                      </Button>
                      <Button type="button" size="sm" variant={detailScope === "ALL" ? "secondary" : "ghost"} onClick={() => setDetailScope("ALL")} className="h-7 text-xs">
                        All
                      </Button>
                    </div>
                    {detailScope === "MONTH" && (
                      <Input type="month" value={detailMonth} onChange={(event) => setDetailMonth(event.target.value)} className="h-8 w-36 border-zinc-800 bg-zinc-950 text-xs text-zinc-100" />
                    )}
                    <Button type="button" size="sm" variant="outline" className="h-8 border-zinc-800 bg-zinc-950 text-xs text-zinc-100 hover:bg-zinc-900">
                      <Plus className="size-3.5" />
                      Add Missing Day
                    </Button>
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-zinc-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-transparent">
                        <TableHead className="text-zinc-400">Date</TableHead>
                        <TableHead className="text-zinc-400">Times</TableHead>
                        <TableHead className="text-zinc-400">Status</TableHead>
                        <TableHead className="text-right text-zinc-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {detailRecords.length === 0 ? (
                        <TableRow className="border-zinc-800">
                          <TableCell colSpan={4} className="h-20 text-center text-zinc-500">No attendance records found.</TableCell>
                        </TableRow>
                      ) : detailRecords.slice(0, 20).map((record) => (
                        <TableRow key={record.id} className="border-zinc-800 hover:bg-zinc-900/60">
                          <TableCell>{formatDate(record.attendanceDate)}</TableCell>
                          <TableCell className="font-mono text-xs text-zinc-300">
                            {formatTime(record.checkInAt)} - {formatTime(record.checkOutAt)}
                          </TableCell>
                          <TableCell>
                            <Badge className="border-indigo-500/30 bg-indigo-500/15 text-indigo-300">
                              {record.status.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="inline-flex gap-1 text-zinc-400">
                              <Edit className="size-4" />
                              <Trash2 className="size-4" />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button type="button" variant="secondary" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

