// Demo login — one-tap sign-in as any seeded persona. No passwords in demo mode.
"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DEMO_USERS = [
  { email: "natalia@demo.ca", name: "Наталя · Toronto (returning)", emoji: "💼" },
  { email: "priya@demo.ca", name: "Priya · Vancouver (newbie)", emoji: "🌱" },
  { email: "david@demo.ca", name: "David · Ottawa (tourist)", emoji: "❤️" },
  { email: "sofia@demo.ca", name: "Sofia · Banff (owner/admin)", emoji: "👑" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const login = async (email: string) => {
    setBusy(email);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Login failed");
      setBusy(null);
      return;
    }
    router.push(next || (data.isAdmin ? "/en/admin" : "/en"));
    router.refresh();
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <span className="inline-grid h-14 w-14 place-items-center rounded-full bg-pine text-3xl">🏔️</span>
        <h1 className="mt-3 text-xl font-bold text-forest">Demo sign in</h1>
        <p className="mt-1 text-sm text-forest/60">
          Choose a persona — this simulates Canadian customer / owner login.
        </p>
      </div>
      <div className="space-y-2">
        {DEMO_USERS.map((u) => (
          <button
            key={u.email}
            onClick={() => login(u.email)}
            disabled={busy === u.email}
            className="flex w-full items-center gap-3 rounded-2xl border border-sand bg-white px-4 py-3.5 text-left transition hover:border-pine/50 disabled:opacity-50"
          >
            <span className="text-2xl">{u.emoji}</span>
            <span className="flex-1">
              <span className="block text-sm font-bold text-forest">{u.name}</span>
              <span className="block text-xs text-forest/50">{u.email}</span>
            </span>
            <span className="text-pine">{busy === u.email ? "⏳" : "→"}</span>
          </button>
        ))}
      </div>
      {error && <div className="mt-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
      <p className="mt-6 text-center text-xs text-forest/50">
        Demo mode — session cookie only, no real credentials.
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-cream px-4">
      <Suspense fallback={<div className="text-forest/50">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
