"use client";

import { useMemo, useState, useTransition } from "react";
import { Building2, Edit, Search, UserCog, UserPlus } from "lucide-react";
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

type UserWithRelations = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  birthDate: Date | null;
  role: "SUPER_ADMIN" | "ADMIN" | "MEMBER";
  memberStatus: "TEAM" | "INTERN";
  accountStatus: "ACTIVE" | "INACTIVE" | "ARCHIVED";
  defaultStudioId: string | null;
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
};

const accountStatusLabel: Record<string, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
  ARCHIVED: "Arsip",
};

const accountStatusColor: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-amber-100 text-amber-800",
  ARCHIVED: "bg-zinc-200 text-zinc-700",
};

function formatDate(date: Date | null | undefined) {
  if (!date) return "-";
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
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

  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRelations | null>(null);

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

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const handleOpenEdit = (user: UserWithRelations) => {
    setSelectedUser(user);
    setEditMemberStatus(user.memberStatus);
    setEditAccountStatus(user.accountStatus);
    setErrorMsg("");
    setEditOpen(true);
  };

  const filteredUsers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return users.filter((user) => {
      const matchesStatus = isSuperAdmin
        ? user.accountStatus === statusFilter
        : user.accountStatus === "ACTIVE";
      const matchesStudio =
        !isSuperAdmin ||
        studioFilter === "ALL" ||
        user.defaultStudioId === studioFilter;
      const matchesMemberType =
        memberTypeFilter === "ALL" || user.memberStatus === memberTypeFilter;
      const matchesQuery =
        !query ||
        user.name.toLowerCase().includes(query) ||
        user.email.toLowerCase().includes(query) ||
        user.username?.toLowerCase().includes(query);

      return (
        matchesStatus && matchesStudio && matchesMemberType && matchesQuery
      );
    });
  }, [
    isSuperAdmin,
    memberTypeFilter,
    searchQuery,
    statusFilter,
    studioFilter,
    users,
  ]);

  const totalMembers = filteredUsers.length;

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await createUserAction(formData);
        setAddOpen(false);
        form.reset();
        setAddMemberStatus("TEAM");
      } catch (err) {
        const error = err as Error;
        setErrorMsg(error.message || "Gagal membuat user.");
      }
    });
  };

  const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        await updateUserAction(formData);
        setEditOpen(false);
      } catch (err) {
        const error = err as Error;
        setErrorMsg(error.message || "Gagal memperbarui user.");
      }
    });
  };

  return (
    <div className="grid gap-6">
      <section className="grid gap-3 sm:grid-cols-1">
        <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <CardHeader className="p-4 text-center">
            <CardDescription className="font-medium text-zinc-500 dark:text-zinc-400">
              Total Anggota
            </CardDescription>
            <CardTitle className="mt-1 text-4xl font-bold text-zinc-900 dark:text-zinc-50">
              {totalMembers}
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
                Daftar User Studio
              </CardTitle>
              <CardDescription className="mt-0.5 text-zinc-500 dark:text-zinc-400">
                {isSuperAdmin
                  ? "Super Admin memiliki akses penuh untuk menambah, mengedit, dan mengatur akun anggota."
                  : "Admin hanya dapat melihat daftar anggota di studio asal."}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isSuperAdmin ? (
            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/70 dark:bg-zinc-900/40 p-3">
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
                  onClick={() => setStudioFilter("ALL")}
                >
                  Semua
                </Button>
                {studios.map((studio) => (
                  <Button
                    key={studio.id}
                    type="button"
                    size="sm"
                    variant={studioFilter === studio.id ? "default" : "ghost"}
                    className="h-7 px-3 text-xs"
                    onClick={() => setStudioFilter(studio.id)}
                  >
                    {studio.name}
                  </Button>
                ))}
              </div>

              <div className="mx-1 h-5 w-px bg-zinc-300 dark:bg-zinc-700" />

              <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-0.5 shadow-sm">
                {(["ALL", "TEAM", "INTERN"] as const).map((type) => (
                  <Button
                    key={type}
                    type="button"
                    size="sm"
                    variant={memberTypeFilter === type ? "default" : "ghost"}
                    className="h-7 px-3 text-xs"
                    onClick={() => setMemberTypeFilter(type)}
                  >
                    {type === "ALL" ? "Semua" : type === "TEAM" ? "Team" : "Intern"}
                  </Button>
                ))}
              </div>

              <div className="ml-auto">
                <Button
                  size="sm"
                  onClick={() => {
                    setErrorMsg("");
                    setAddOpen(true);
                  }}
                >
                  <UserPlus aria-hidden="true" className="size-3.5" />
                  Tambah Anggota
                </Button>
              </div>
            </div>
          ) : null}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                aria-hidden="true"
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Cari nama, email, atau username…"
                className="pl-9"
              />
            </div>
            {isSuperAdmin ? (
              <div className="flex gap-1 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-0.5 shadow-sm">
                {(["ACTIVE", "INACTIVE", "ARCHIVED"] as const).map((status) => (
                  <Button
                    key={status}
                    type="button"
                    size="sm"
                    variant={statusFilter === status ? "default" : "ghost"}
                    className="h-7 px-3 text-xs"
                    onClick={() => setStatusFilter(status)}
                  >
                    {accountStatusLabel[status]}
                  </Button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama / Username</TableHead>
                  <TableHead>Email / Lahir</TableHead>
                  <TableHead>Default Studio</TableHead>
                  <TableHead>Placement</TableHead>
                  <TableHead>Status Member</TableHead>
                  <TableHead>Status Akun</TableHead>
                  <TableHead>Role</TableHead>
                  {isSuperAdmin && <TableHead className="text-right">Aksi</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={isSuperAdmin ? 8 : 7}
                      className="h-24 text-center text-sm text-zinc-500"
                    >
                      Tidak ada anggota yang sesuai dengan pencarian atau
                      status ini.
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.map((user) => {
                  const activePlacement = user.placements[0];

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="text-zinc-900 dark:text-zinc-100">{user.name}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
                          @{user.username || "belum_diatur"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-zinc-700 dark:text-zinc-300">{user.email}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">
                          Lahir: {formatDate(user.birthDate)}
                        </div>
                      </TableCell>
                      <TableCell>{user.defaultStudio?.name ?? "Belum diatur"}</TableCell>
                      <TableCell>
                        {activePlacement ? (
                          <Badge variant="outline" className="border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300">
                            {activePlacement.studio.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">Tidak ada</span>
                        )}
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
                        <Badge className={accountStatusColor[user.accountStatus]}>
                          {accountStatusLabel[user.accountStatus]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={user.role === "ADMIN" ? "bg-blue-100 text-blue-800" : ""}
                        >
                          {ROLE_LABEL[user.role]}
                        </Badge>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(user)}
                            className="h-8 px-2 text-xs"
                          >
                            <Edit className="size-3" aria-hidden="true" />
                            Edit
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Tambah Anggota Baru</DialogTitle>
            <DialogDescription>
              Buat akun baru untuk karyawan atau mahasiswa magang (Intern).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="grid gap-3 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Nama Lengkap *</label>
                <Input name="name" placeholder="Nama lengkap" required />
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
                <label className="text-xs font-semibold">Tanggal Lahir</label>
                <Input name="birthDate" type="date" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Role *</label>
                <select
                  name="role"
                  className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                  defaultValue="MEMBER"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Status Anggota *</label>
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
                  <option value="">Pilih studio</option>
                  {studios.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold">Placement Studio Awal</label>
              <select
                name="placementStudioId"
                className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                defaultValue=""
              >
                <option value="">Tidak ada placement</option>
                {studios.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>

            {addMemberStatus === "INTERN" && (
              <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-3 grid gap-2.5 mt-1">
                <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Profil Magang (Intern)</div>
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
                    <Input name="institution" placeholder="Nama sekolah/univ" className="h-8 text-xs" required={addMemberStatus === "INTERN"} />
                  </div>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500">Tgl Mulai *</label>
                    <Input name="startDate" type="date" className="h-8 text-xs" required={addMemberStatus === "INTERN"} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500">Tgl Selesai *</label>
                    <Input name="endDate" type="date" className="h-8 text-xs" required={addMemberStatus === "INTERN"} />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Mentor Lapangan</label>
                  <select name="mentorId" className="h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2 text-xs outline-none" defaultValue="">
                    <option value="">Tidak ada mentor</option>
                    {mentors.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {errorMsg && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-1">{errorMsg}</p>
            )}

            <DialogFooter className="mt-4">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)} disabled={isPending}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan Anggota"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Informasi Anggota</DialogTitle>
            <DialogDescription>
              Ubah rincian profil, penugasan studio, atau status keaktifan user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditSubmit} className="grid gap-3 py-2">
              <input type="hidden" name="userId" value={selectedUser.id} />

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Nama Lengkap *</label>
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
                  <label className="text-xs font-semibold">Tanggal Lahir</label>
                  <Input name="birthDate" type="date" defaultValue={formatInputDate(selectedUser.birthDate)} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Role *</label>
                  <select
                    name="role"
                    className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                    defaultValue={selectedUser.role}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">
                    Persetujuan Status Akun *
                  </label>
                  <select
                    name="accountStatus"
                    className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                    value={editAccountStatus}
                    onChange={(event) =>
                      setEditAccountStatus(event.target.value)
                    }
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Nonaktif</option>
                    <option value="ARCHIVED">Arsip</option>
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
                  <label className="text-xs font-semibold">Status Anggota *</label>
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
                    <option value="">Pilih studio</option>
                    {studios.map((st) => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Placement Studio Aktif</label>
                <select
                  name="placementStudioId"
                  className="h-9 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none"
                  defaultValue={selectedUser.placements[0]?.studioId ?? ""}
                >
                  <option value="">Tidak ada placement aktif</option>
                  {studios.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              {editMemberStatus === "INTERN" && (
                <div className="rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 p-3 grid gap-2.5 mt-1">
                  <div className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Profil Magang (Intern)</div>
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
                        placeholder="Nama sekolah/univ"
                        className="h-8 text-xs"
                        required={editMemberStatus === "INTERN"}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500">Tgl Mulai *</label>
                      <Input
                        name="startDate"
                        type="date"
                        defaultValue={formatInputDate(selectedUser.internProfile?.startDate)}
                        className="h-8 text-xs"
                        required={editMemberStatus === "INTERN"}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500">Tgl Selesai *</label>
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
                    <label className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400">Mentor Lapangan</label>
                    <select
                      name="mentorId"
                      className="h-8 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2 text-xs outline-none"
                      defaultValue={selectedUser.internProfile?.mentorId ?? ""}
                    >
                      <option value="">Tidak ada mentor</option>
                      {mentors.map((m) => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {errorMsg && (
                <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-2 mt-1">{errorMsg}</p>
              )}

              <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setEditOpen(false)} disabled={isPending}>
                  Batal
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending
                    ? "Menyimpan..."
                    : editAccountStatus !== selectedUser.accountStatus
                      ? "Setujui & Simpan"
                      : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
