"use client";

import { useState, useTransition } from "react";
import { UserPlus, UserCog, ShieldCheck, Edit } from "lucide-react";
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

  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState("");

  const handleOpenEdit = (user: UserWithRelations) => {
    setSelectedUser(user);
    setEditMemberStatus(user.memberStatus);
    setErrorMsg("");
    setEditOpen(true);
  };

  const handleAddSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMsg("");
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        await createUserAction(formData);
        setAddOpen(false);
        e.currentTarget.reset();
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
    const formData = new FormData(e.currentTarget);
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
      {/* 1. Metric: Total Anggota Card */}
      <section className="grid gap-3 sm:grid-cols-1">
        <Card className="bg-white border-zinc-200">
          <CardHeader className="p-4 text-center">
            <CardDescription className="text-zinc-500 font-medium">Total Anggota</CardDescription>
            <CardTitle className="text-4xl font-bold text-zinc-900 mt-1">{users.length}</CardTitle>
          </CardHeader>
        </Card>
      </section>

      {/* 2. User Table Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="size-5 text-blue-700" />
              Daftar User Studio
            </CardTitle>
            <CardDescription>
              {isSuperAdmin
                ? "Super Admin memiliki akses penuh untuk menambah, mengedit, dan mengatur akun anggota."
                : "Admin hanya dapat melihat daftar anggota di studio asal."}
            </CardDescription>
          </div>
          {isSuperAdmin && (
            <Button onClick={() => { setErrorMsg(""); setAddOpen(true); }} className="bg-zinc-950 text-white hover:bg-zinc-800">
              <UserPlus className="size-4 mr-2" />
              + Tambah User
            </Button>
          )}
        </CardHeader>
        <CardContent>
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
                {users.map((user) => {
                  const isTargetSuperAdmin = user.role === "SUPER_ADMIN";
                  const activePlacement = user.placements[0];

                  return (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        <div className="text-zinc-900">{user.name}</div>
                        <div className="text-xs text-zinc-500 font-mono">
                          @{user.username || "belum_diatur"}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-zinc-700">{user.email}</div>
                        <div className="text-xs text-zinc-500">
                          Lahir: {formatDate(user.birthDate)}
                        </div>
                      </TableCell>
                      <TableCell>{user.defaultStudio?.name ?? "Belum diatur"}</TableCell>
                      <TableCell>
                        {activePlacement ? (
                          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-800">
                            {activePlacement.studio.name}
                          </Badge>
                        ) : (
                          <span className="text-xs text-zinc-400">Tidak ada</span>
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
                          variant={isTargetSuperAdmin ? "default" : "secondary"}
                          className={user.role === "ADMIN" ? "bg-blue-100 text-blue-800" : ""}
                        >
                          {ROLE_LABEL[user.role]}
                        </Badge>
                      </TableCell>
                      {isSuperAdmin && (
                        <TableCell className="text-right">
                          {isTargetSuperAdmin ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                              <ShieldCheck className="size-4" />
                              System
                            </span>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenEdit(user)}
                              className="h-8 px-2 text-xs"
                            >
                              <Edit className="size-3 mr-1" />
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
        </CardContent>
      </Card>

      {/* 3. Pop-up Modal: Tambah User */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Tambah Anggota Baru</DialogTitle>
            <DialogDescription>
              Buat akun baru untuk karyawan atau mahasiswa magang (Intern).
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="grid gap-3 py-2">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Nama Lengkap *</label>
                <Input name="name" placeholder="Nama lengkap" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Username</label>
                <Input name="username" placeholder="username" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Email *</label>
                <Input name="email" type="email" placeholder="email@domain.com" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Password *</label>
                <Input name="password" type="password" placeholder="Min. 6 karakter" required minLength={6} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Tanggal Lahir</label>
                <Input name="birthDate" type="date" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Role *</label>
                <select
                  name="role"
                  className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm"
                  defaultValue="MEMBER"
                >
                  <option value="MEMBER">Member</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold">Status Anggota *</label>
                <select
                  name="memberStatus"
                  className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm"
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
                  className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm"
                  defaultValue=""
                >
                  <option value="">Belum ada studio</option>
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
                className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm"
                defaultValue=""
              >
                <option value="">Tidak ada placement</option>
                {studios.map((st) => (
                  <option key={st.id} value={st.id}>{st.name}</option>
                ))}
              </select>
            </div>

            {/* Conditionally Render Intern Fields */}
            {addMemberStatus === "INTERN" && (
              <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-3 grid gap-2.5 mt-1">
                <div className="text-xs font-bold text-zinc-700">Profil Magang (Intern)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500">Program *</label>
                    <select name="program" className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs" defaultValue="MAGANG">
                      <option value="MAGANG">Magang</option>
                      <option value="PKL">PKL</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-semibold text-zinc-500">Institusi *</label>
                    <Input name="institution" placeholder="Nama sekolah/univ" className="h-8 text-xs" required={addMemberStatus === "INTERN"} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
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
                  <label className="text-[10px] font-semibold text-zinc-500">Mentor Lapangan</label>
                  <select name="mentorId" className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs" defaultValue="">
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

      {/* 4. Pop-up Modal: Edit User */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Informasi Anggota</DialogTitle>
            <DialogDescription>
              Ubah rincian profil, penugasan studio, atau status keaktifan user.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditSubmit} className="grid gap-3 py-2">
              <input type="hidden" name="userId" value={selectedUser.id} />

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Nama Lengkap *</label>
                  <Input name="name" defaultValue={selectedUser.name} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Username</label>
                  <Input name="username" defaultValue={selectedUser.username || ""} placeholder="username" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Email *</label>
                  <Input name="email" type="email" defaultValue={selectedUser.email} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Tanggal Lahir</label>
                  <Input name="birthDate" type="date" defaultValue={formatInputDate(selectedUser.birthDate)} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Role *</label>
                  <select
                    name="role"
                    className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm"
                    defaultValue={selectedUser.role}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Status Keaktifan *</label>
                  <select
                    name="accountStatus"
                    className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm"
                    defaultValue={selectedUser.accountStatus}
                  >
                    <option value="ACTIVE">Aktif</option>
                    <option value="INACTIVE">Nonaktif</option>
                    <option value="ARCHIVED">Arsip</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold">Status Anggota *</label>
                  <select
                    name="memberStatus"
                    className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm"
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
                    className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm"
                    defaultValue={selectedUser.defaultStudioId ?? ""}
                  >
                    <option value="">Belum ada studio</option>
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
                  className="h-9 rounded-md border border-zinc-200 bg-white px-2.5 text-sm"
                  defaultValue={selectedUser.placements[0]?.studioId ?? ""}
                >
                  <option value="">Tidak ada placement aktif</option>
                  {studios.map((st) => (
                    <option key={st.id} value={st.id}>{st.name}</option>
                  ))}
                </select>
              </div>

              {/* Conditionally Render Intern Fields */}
              {editMemberStatus === "INTERN" && (
                <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50/50 p-3 grid gap-2.5 mt-1">
                  <div className="text-xs font-bold text-zinc-700">Profil Magang (Intern)</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-semibold text-zinc-500">Program *</label>
                      <select
                        name="program"
                        className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs"
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
                  <div className="grid grid-cols-2 gap-2">
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
                    <label className="text-[10px] font-semibold text-zinc-500">Mentor Lapangan</label>
                    <select
                      name="mentorId"
                      className="h-8 rounded-md border border-zinc-200 bg-white px-2 text-xs"
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
                  {isPending ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
