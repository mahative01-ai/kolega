"use client";

import { useState } from "react";
import { User, Mail, ShieldAlert, KeyRound, Loader2, Save, Calendar, Phone, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { updateMoodAction, updateProfileAction } from "./actions";
import { MOODS } from "@/lib/moods";

type UserProfile = {
  name: string;
  email: string;
  username: string | null;
  birthDate: Date | null;
  phoneNumber: string | null;
  address: string | null;
  currentMood: string;
  moodNote: string | null;
};

type Props = {
  initialUser: UserProfile;
};

export function ProfileSettingsClient({ initialUser }: Props) {
  const [loading, setLoading] = useState(false);
  const [moodLoading, setMoodLoading] = useState(false);
  const [selectedMood, setSelectedMood] = useState(initialUser.currentMood || "NEUTRAL");

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
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui profil.");
    } finally {
      setLoading(false);
    }
  }

  async function handleMoodSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMoodLoading(true);

    const formData = new FormData(event.currentTarget);
    try {
      await updateMoodAction(formData);
      toast.success("Mood harian berhasil diperbarui.");
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : "Gagal memperbarui mood.");
    } finally {
      setMoodLoading(false);
    }
  }

  return (
    <div className="space-y-4">
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

            <div className="grid gap-1.5">
              <Label htmlFor="profile-birthdate" className="text-zinc-700 dark:text-zinc-300">Tanggal Lahir</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  id="profile-birthdate"
                  name="birthDate"
                  type="date"
                  defaultValue={initialUser.birthDate ? new Date(initialUser.birthDate).toISOString().split("T")[0] : ""}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="profile-phone" className="text-zinc-700 dark:text-zinc-300">Nomor Telepon</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-zinc-400" />
                <Input
                  id="profile-phone"
                  name="phoneNumber"
                  type="tel"
                  placeholder="Contoh: 08123456789"
                  defaultValue={initialUser.phoneNumber ?? ""}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label htmlFor="profile-address" className="text-zinc-700 dark:text-zinc-300">Alamat Tinggal</Label>
              <div className="relative">
                <Home className="absolute left-3 top-3 size-4 text-zinc-400" />
                <Textarea
                  id="profile-address"
                  name="address"
                  placeholder="Alamat lengkap tinggal saat ini"
                  defaultValue={initialUser.address ?? ""}
                  className="pl-9 pt-2.5"
                  rows={3}
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
                  className="pl-9"
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
                  className="pl-9"
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
    <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-zinc-900 dark:text-zinc-50">
          <User className="size-5 text-emerald-700" />
          Mood Harian
        </CardTitle>
        <CardDescription>
          Perbarui suasana hati dan catatan singkat tanpa mengubah data profil.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleMoodSubmit} className="space-y-5 max-w-xl">
          <div className="grid gap-2 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 bg-zinc-50/30 dark:bg-zinc-900/10">
            <Label className="text-zinc-800 dark:text-zinc-200 font-semibold">Suasana Hati Anda Hari Ini</Label>
            <input type="hidden" name="currentMood" value={selectedMood} />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {MOODS.map((m) => {
                const isSelected = selectedMood === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setSelectedMood(m.key)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all ${
                      isSelected
                        ? `${m.bgColor} ${m.borderColor} ring-2 ring-blue-500 scale-[1.03] shadow-sm`
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900/60"
                    }`}
                  >
                    <span className="text-2xl mb-1">{m.emoji}</span>
                    <span className="text-[10px] font-bold text-zinc-950 dark:text-zinc-50">{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="profile-mood-note" className="text-zinc-700 dark:text-zinc-300">Catatan Mood</Label>
            <Input
              id="profile-mood-note"
              name="moodNote"
              placeholder="Tulis singkat apa yang sedang Anda lakukan atau rasakan..."
              defaultValue={initialUser.moodNote ?? ""}
            />
          </div>

          <Button type="submit" disabled={moodLoading} className="w-full sm:w-auto">
            {moodLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Simpan Mood
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
    </div>
  );
}
