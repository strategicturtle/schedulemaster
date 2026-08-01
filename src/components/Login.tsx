"use client";

import { useState } from "react";
import { login, signup, type AuthUser } from "@/lib/storage";
import { Mascot } from "@/components/Mascot";
import { PasswordInput } from "@/components/PasswordInput";
import { LanguageSwitcher, ThemeToggle, useI18n } from "@/lib/i18n";

export function Login({
  onAuthed,
  visits,
}: {
  onAuthed: (user: AuthUser) => void;
  visits?: number | null;
}) {
  const { t, locale } = useI18n();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === "signup";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    try {
      const user = isSignup
        ? await signup(username.trim(), password)
        : await login(username.trim(), password);
      if (isSignup) {
        try {
          localStorage.setItem("sm_tour", "pending");
        } catch {
          /* ignore */
        }
      }
      onAuthed(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="flex justify-end gap-1.5">
        <ThemeToggle />
        <LanguageSwitcher />
      </div>

      <header className="flex flex-col items-center gap-1 text-center">
        <Mascot size={104} className="mb-1" />
        <h1 className="brand-gradient text-2xl font-bold tracking-tight">
          ScheduleMaster
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isSignup ? t("login.signup") : t("login.signin")}
        </p>
      </header>

      <form
        onSubmit={submit}
        className="relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-black/[.08] bg-white/60 p-5 shadow-sm before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-gradient-to-r before:from-indigo-500 before:via-fuchsia-500 before:to-cyan-400 before:content-[''] dark:border-white/[.1] dark:bg-zinc-900/40"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {t("login.username")}
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
            className="h-11 rounded-lg border border-black/[.1] bg-transparent px-3 text-base font-normal text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/[.15] dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          {t("login.password")}
          <PasswordInput
            value={password}
            onChange={setPassword}
            className="h-11 rounded-lg border border-black/[.1] bg-transparent px-3 text-base font-normal text-zinc-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/[.15] dark:text-zinc-100"
          />
        </label>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !username.trim() || !password}
          className="btn-primary mt-1 h-11 rounded-lg text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy
            ? t("login.wait")
            : isSignup
              ? t("login.signupBtn")
              : t("login.loginBtn")}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        {isSignup ? t("login.haveAccount") : t("login.newHere")}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(isSignup ? "login" : "signup");
            setError(null);
          }}
          className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-white"
        >
          {isSignup ? t("login.loginBtn") : t("login.signupBtn")}
        </button>
      </p>

      {visits != null && (
        <p className="text-center text-xs text-zinc-400">
          🌐 {t("common.entered", { n: visits.toLocaleString(locale) })}
        </p>
      )}
    </main>
  );
}
