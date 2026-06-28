"use client";

import { useState } from "react";
import { login, signup, type AuthUser } from "@/lib/storage";

export function Login({ onAuthed }: { onAuthed: (user: AuthUser) => void }) {
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
      onAuthed(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-4 py-10">
      <header className="flex flex-col gap-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">ScheduleMaster</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          {isSignup ? "Create your account" : "Sign in to your schedules"}
        </p>
      </header>

      <form
        onSubmit={submit}
        className="flex flex-col gap-3 rounded-2xl border border-black/[.08] bg-white/60 p-5 shadow-sm dark:border-white/[.1] dark:bg-zinc-900/40"
      >
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Username
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoCapitalize="none"
            autoCorrect="off"
            autoFocus
            className="h-11 rounded-lg border border-black/[.1] bg-transparent px-3 text-base font-normal text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/[.15] dark:text-zinc-100"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 rounded-lg border border-black/[.1] bg-transparent px-3 text-base font-normal text-zinc-900 outline-none focus:border-zinc-400 dark:border-white/[.15] dark:text-zinc-100"
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
          className="mt-1 h-11 rounded-lg bg-zinc-900 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {busy ? "Please wait…" : isSignup ? "Sign up" : "Log in"}
        </button>
      </form>

      <p className="text-center text-sm text-zinc-500 dark:text-zinc-400">
        {isSignup ? "Already have an account?" : "New to ScheduleMaster?"}{" "}
        <button
          type="button"
          onClick={() => {
            setMode(isSignup ? "login" : "signup");
            setError(null);
          }}
          className="font-medium text-zinc-900 underline-offset-2 hover:underline dark:text-white"
        >
          {isSignup ? "Log in" : "Sign up"}
        </button>
      </p>
    </main>
  );
}
