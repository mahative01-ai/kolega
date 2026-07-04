import Link from "next/link";
import { redirect } from "next/navigation";
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
import { getCurrentUser, getDashboardPath } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registerMemberAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const [currentUser, params, studios] = await Promise.all([
    getCurrentUser(),
    searchParams,
    prisma.studio.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (currentUser) {
    redirect(getDashboardPath(currentUser.role));
  }

  const errorMessage =
    params.error === "email"
      ? "Email sudah terdaftar."
      : params.error === "invalid"
        ? "Lengkapi data dengan benar. Password minimal 6 karakter."
        : null;

  return (
    <main className="grid min-h-screen place-items-center bg-zinc-50 px-6 py-10 text-zinc-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Badge variant="outline" className="w-fit bg-white">
            Registrasi Member
          </Badge>
          <CardTitle>Buat Akun Member</CardTitle>
          <CardDescription>
            Registrasi publik hanya membuat akun Member. Akses Admin diberikan
            oleh Super Admin setelah akun aktif.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={registerMemberAction} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Nama
              </label>
              <Input id="name" name="name" placeholder="Nama lengkap" required />
            </div>
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
                minLength={6}
                placeholder="Minimal 6 karakter"
                required
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="defaultStudioId" className="text-sm font-medium">
                Default Studio
              </label>
              <select
                id="defaultStudioId"
                name="defaultStudioId"
                className="h-8 w-full rounded-lg border border-input bg-transparent dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                required
              >
                <option value="">Pilih studio</option>
                {studios.map((studio) => (
                  <option key={studio.id} value={studio.id}>
                    {studio.name}
                  </option>
                ))}
              </select>
            </div>
            {errorMessage ? (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {errorMessage}
              </p>
            ) : null}
            <Button type="submit" className="w-full">
              Daftar sebagai Member
            </Button>
          </form>

          <Link
            href="/login"
            className={buttonVariants({
              variant: "ghost",
              className: "mt-3 w-full",
            })}
          >
            Sudah punya akun? Login
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
