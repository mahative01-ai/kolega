import Link from "next/link";
import { Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { requestPasswordResetAction } from "./actions";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string }>;
}) {
  const params = await searchParams;
  const sent = params.sent === "1";

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-zinc-50 p-6 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 md:p-10">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-md dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950">
            <Terminal className="size-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Lupa Password</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Masukkan email akun. Link reset akan dikirim jika akun aktif.
          </p>
        </div>

        {sent ? (
          <div className="grid gap-4">
            <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-400">
              Jika email terdaftar, link reset password sudah dikirim.
            </p>
            <Link
              href="/login"
              className="inline-flex h-9 w-full items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
            >
              Kembali ke Login
            </Link>
          </div>
        ) : (
          <form action={requestPasswordResetAction}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="nama@email.com"
                  required
                  className="dark:border-zinc-800 dark:bg-zinc-950"
                />
                <FieldDescription>
                  Demi keamanan, halaman ini tidak akan menampilkan apakah email terdaftar atau tidak.
                </FieldDescription>
              </Field>
              <Button type="submit" className="w-full">
                Kirim Link Reset
              </Button>
              <Link
                href="/login"
                className="inline-flex h-9 w-full items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Kembali ke Login
              </Link>
            </FieldGroup>
          </form>
        )}
      </div>
    </main>
  );
}
