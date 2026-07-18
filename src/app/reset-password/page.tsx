import Link from "next/link";
import { Terminal } from "lucide-react";
import { PasswordInput } from "@/components/password-input";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { resetPasswordAction } from "./actions";

const errorMessages: Record<string, string> = {
  invalid: "Link reset tidak valid, sudah digunakan, atau sudah kedaluwarsa.",
  weak: "Password minimal 6 karakter.",
  mismatch: "Konfirmasi password tidak sama.",
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const params = await searchParams;
  const token = params.token ?? "";
  const errorMessage = params.error ? errorMessages[params.error] : null;

  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-zinc-50 p-6 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50 md:p-10">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-8 shadow-md dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex size-9 items-center justify-center rounded-lg bg-zinc-950 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-950">
            <Terminal className="size-5" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Reset Password</h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Create a new password for your Kolega account.
          </p>
        </div>

        {errorMessage && (
          <p className="mb-4 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-400">
            {errorMessage}
          </p>
        )}

        {!token || params.error === "invalid" ? (
          <Link
            href="/forgot-password"
            className="inline-flex h-9 w-full items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
          >
            Minta Link Baru
          </Link>
        ) : (
          <form action={resetPasswordAction}>
            <input type="hidden" name="token" value={token} />
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="password">Password Baru</FieldLabel>
                <PasswordInput
                  id="password"
                  name="password"
                  placeholder="Minimal 6 karakter"
                  required
                  minLength={6}
                  className="dark:border-zinc-800 dark:bg-zinc-950"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="confirmPassword">Konfirmasi Password</FieldLabel>
                <PasswordInput
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Ulangi password baru"
                  required
                  minLength={6}
                  className="dark:border-zinc-800 dark:bg-zinc-950"
                />
              </Field>
              <button
                type="submit"
                className="inline-flex h-9 w-full items-center justify-center rounded-md bg-zinc-950 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-zinc-900 dark:bg-zinc-50 dark:text-zinc-950 dark:hover:bg-zinc-200"
              >
                Simpan Password Baru
              </button>
            </FieldGroup>
          </form>
        )}
      </div>
    </main>
  );
}
