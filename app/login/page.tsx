"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { safeRedirectPath } from "@/lib/auth/safe-redirect";
import { hildaInputClassName, hildaLabelClassName } from "@/lib/brand/form-styles";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get("redirectTo"));
  const configError = searchParams.get("error") === "missing_env";

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    setSubmitting(false);

    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace(redirectTo);
    router.refresh();
  }

  if (configError) {
    return (
      <p className="text-sm text-hilda-text">
        Supabase is not configured. Copy <code className="rounded bg-hilda-bg px-1">.env.example</code> to{" "}
        <code className="rounded bg-hilda-bg px-1">.env.local</code> and add your project keys.
      </p>
    );
  }

  return (
    <form className="mt-6 space-y-4" onSubmit={onSubmit}>
      <label className="block">
        <span className={hildaLabelClassName}>Email</span>
        <input
          className={hildaInputClassName}
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </label>

      <label className="block">
        <span className={hildaLabelClassName}>Password</span>
        <input
          className={hildaInputClassName}
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <Button className="w-full" type="submit" size="lg" disabled={submitting}>
        {submitting ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm rounded-none border border-hilda-border/15 bg-hilda-surface p-6 shadow-sm">
        <h1 className="font-serif text-2xl font-normal text-hilda-heading">Staff login</h1>
        <p className="mt-1 text-sm text-hilda-text-muted">Hilda Houseplant Hospital</p>

        <Suspense fallback={<p className="mt-6 text-sm text-hilda-text-muted">Loading…</p>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
