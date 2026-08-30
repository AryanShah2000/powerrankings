"use client";

import { useState, useTransition } from "react";

type Analyst = { username: string; name: string };

export function LoginForm({
  analysts,
  hasError,
  callbackUrl,
  action,
}: {
  analysts: Analyst[];
  hasError: boolean;
  callbackUrl: string;
  action: (formData: FormData) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 0%, rgba(57,135,229,0.16) 0%, rgba(10,10,11,0) 70%)",
        }}
      />
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8 text-center">
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/15 text-xl">
            🏆
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-text-primary">
            Power Rankings Committee
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            Sign in to submit or view weekly rankings
          </p>
        </div>

        <form
          action={(fd) => startTransition(() => action(fd))}
          className="rounded-2xl border border-border-hairline bg-bg-surface p-5 shadow-2xl shadow-black/40"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <input type="hidden" name="username" value={selected ?? ""} />

          <div className="mb-4">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-muted">
              Who&rsquo;s ranking?
            </div>
            <div className="grid grid-cols-3 gap-2">
              {analysts.map((a) => {
                const isSelected = selected === a.username;
                return (
                  <button
                    type="button"
                    key={a.username}
                    onClick={() => setSelected(a.username)}
                    className={`flex flex-col items-center gap-2 rounded-xl border px-2 py-3 text-sm transition-colors ${
                      isSelected
                        ? "border-accent bg-accent-soft text-text-primary"
                        : "border-border-hairline bg-bg-surface-2 text-text-secondary hover:bg-bg-surface-hover"
                    }`}
                  >
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold ${
                        isSelected ? "bg-accent text-white" : "bg-bg-surface-hover text-text-secondary"
                      }`}
                    >
                      {a.name.charAt(0)}
                    </span>
                    {a.name}
                  </button>
                );
              })}
            </div>
          </div>

          <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-text-muted">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="mb-4 w-full rounded-lg border border-border-hairline bg-bg-surface-2 px-3 py-2.5 text-sm text-text-primary outline-none placeholder:text-text-muted focus:border-accent focus:ring-2 focus:ring-accent/25"
            placeholder="••••••••"
          />

          {hasError && (
            <p className="mb-4 rounded-lg border border-status-critical/30 bg-status-critical/10 px-3 py-2 text-xs text-status-critical">
              Wrong analyst or password. Try again.
            </p>
          )}

          <button
            type="submit"
            disabled={!selected || isPending}
            className="w-full rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-white transition-opacity hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
