"use client";

import { useState } from "react";
import { User, Mail, ShieldAlert, KeyRound, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { updateProfileAction } from "./actions";

type UserProfile = {
  name: string;
  email: string;
  username: string | null;
};

type Props = {
  initialUser: UserProfile;
};

export function ProfileSettingsClient({ initialUser }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    try {
      await updateProfileAction(formData);
      toast.success("Profil Anda berhasil diperbarui!");
      // Clear password fields
      const form = event.target as HTMLFormElement;
      const newPwdInput = form.elements.namedItem("newPassword") as HTMLInputElement;
      const confirmPwdInput = form.elements.namedItem("confirmNewPassword") as HTMLInputElement;
      if (newPwdInput) newPwdInput.value = "";
      if (confirmPwdInput) confirmPwdInput.value = "";
    } catch (error: any) {
      toast.error(error?.message || "Gagal memperbarui profil.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
          <User className="size-5 text-blue-700" />
          Profil Saya
        </CardTitle>
        <CardDescription>
          Perbarui data diri Anda dan ubah kata sandi akun Kolega Anda.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
          <div className="grid gap-4">
            <div className="grid gap-1.5">
              <Label htmlFor="profile-name" className="text-zinc-700 dark:text-zinc-300">Nama Lengkap</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  id="profile-name"
                  name="name"
                  defaultValue={initialUser.name}
                  className="pl-9"
                  placeholder="Nama Lengkap"
                  required
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="profile-username" className="text-zinc-700 dark:text-zinc-300">Username</Label>
              <div className="relative">
                <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  id="profile-username"
                  name="username"
                  defaultValue={initialUser.username ?? ""}
                  className="pl-9"
                  placeholder="username (opsional)"
                />
              </div>
              <p className="text-[11px] text-zinc-400">
                Gunakan huruf kecil, angka, titik, atau garis bawah.
              </p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="profile-email" className="text-zinc-700 dark:text-zinc-300">Alamat Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  id="profile-email"
                  name="email"
                  type="email"
                  defaultValue={initialUser.email}
                  className="pl-9"
                  placeholder="email@kolega.com"
                  required
                />
              </div>
            </div>

            <hr className="border-zinc-100 dark:border-zinc-800 my-2" />

            <div className="grid gap-1.5">
              <Label htmlFor="profile-new-password" className="text-zinc-700 dark:text-zinc-300">Kata Sandi Baru</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  id="profile-new-password"
                  name="newPassword"
                  type="password"
                  placeholder="Kosongkan jika tidak ingin mengubah"
                  minLength={6}
                />
              </div>
              <p className="text-[11px] text-zinc-400">Minimal 6 karakter.</p>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="profile-confirm-password" className="text-zinc-700 dark:text-zinc-300">Konfirmasi Kata Sandi Baru</Label>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  id="profile-confirm-password"
                  name="confirmNewPassword"
                  type="password"
                  placeholder="Ketik ulang kata sandi baru"
                />
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Perubahan
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
