import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getCurrentUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { loginAction } from "./actions";
import { QrLoginScanner } from "./qr-login-scanner";

export const dynamic = "force-dynamic";

function getDashboardPath(role: string) {
  if (role === "SUPER_ADMIN") {
    return "/super-admin";
  }

  if (role === "ADMIN") {
    return "/admin";
  }

  return "/member";
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; registered?: string }>;
}) {
  const [currentUser, params] = await Promise.all([
    getCurrentUser(),
    searchParams,
  ]);

  const hasError = params.error === "invalid";
  const isRegistered = params.registered === "1";

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-6 py-10 text-zinc-950">
      <Card className="w-full max-w-md shadow-lg border border-zinc-200">
        <CardHeader className="pb-3">
          <Badge variant="outline" className="w-fit bg-white">
            MahaTeams New Gen
          </Badge>
          <CardTitle className="text-xl font-bold">
            {currentUser ? "Sesi Presensi Aktif" : "Login Dashboard"}
          </CardTitle>
          <CardDescription>
            {currentUser
              ? "Pindai QR Card Anda untuk mencatatkan kehadiran hari ini."
              : "Pilih cara masuk untuk membuka dasbor Anda."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentUser ? (
            <div className="grid gap-4">
              <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm flex justify-between items-center shadow-sm">
                <div>
                  <p className="font-semibold text-zinc-950">{currentUser.name}</p>
                  <p className="text-xs text-zinc-500">
                    {currentUser.role === "ADMIN" ? "Admin" : "Member"} •{" "}
                    {currentUser.defaultStudio?.name || "Mahative/Kipa"}
                  </p>
                </div>
                <Link
                  href={getDashboardPath(currentUser.role)}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                >
                  Dashboard
                </Link>
              </div>

              <QrLoginScanner />

              <div className="grid grid-cols-2 gap-2 mt-2">
                <Link
                  href="/member/requests?type=SICK"
                  className={cn(buttonVariants({ variant: "secondary" }), "w-full text-center flex items-center justify-center")}
                >
                  🤒 Saya Sedang Sakit
                </Link>
                <Link
                  href="/member/requests?type=LEAVE"
                  className={cn(buttonVariants({ variant: "secondary" }), "w-full text-center flex items-center justify-center")}
                >
                  ✈️ Saya Sedang Cuti
                </Link>
              </div>
            </div>
          ) : (
            <Tabs defaultValue="credentials" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-4">
                <TabsTrigger value="credentials">Kredensial</TabsTrigger>
                <TabsTrigger value="qr">Scan QR Card</TabsTrigger>
              </TabsList>

              <TabsContent value="credentials">
                <form action={loginAction} className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="nama@email.com"
                      required
                    />
                  </div>
                  <div className="flex flex-col gap-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      placeholder="Masukkan password"
                      required
                    />
                  </div>
                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      name="rememberMe"
                      className="size-4 rounded border-zinc-300 text-zinc-950 focus:ring-zinc-950"
                    />
                    <label
                      htmlFor="rememberMe"
                      className="text-sm text-zinc-600 cursor-pointer select-none"
                    >
                      Ingat saya (30 hari)
                    </label>
                  </div>
                  {hasError ? (
                    <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 border border-red-100">
                      Email atau password tidak sesuai.
                    </p>
                  ) : null}
                  {isRegistered ? (
                    <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 border border-emerald-100">
                      Registrasi berhasil. Silakan login.
                    </p>
                  ) : null}
                  <Button
                    type="submit"
                    className="w-full bg-zinc-950 text-white hover:bg-zinc-900"
                  >
                    Masuk dengan Kredensial
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="qr">
                <QrLoginScanner />
              </TabsContent>
            </Tabs>
          )}

          {!currentUser ? (
            <div className="mt-6 rounded-md bg-zinc-100 p-3 text-[11px] text-zinc-500 space-y-1">
              <p className="font-semibold text-zinc-700">Info Akun Preview:</p>
              <p>Super Admin: owner@mahateams.local / owner123</p>
              <p>Admin: admin.mahative@mahateams.local / admin123</p>
              <p>Member: member@mahateams.local / member123</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
