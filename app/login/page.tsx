// Demo login — sign-in with password for client accounts and admin panel.
"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DEMO_USERS = [
  { email: "natalia@demo.ca", password: "password123", name: "Наталя · Toronto (client)", emoji: "💼", role: "client" },
  { email: "priya@demo.ca", password: "password123", name: "Priya · Vancouver (client)", emoji: "🌱", role: "client" },
  { email: "david@demo.ca", password: "password123", name: "David · Ottawa (client)", emoji: "❤️", role: "client" },
  { email: "sofia@demo.ca", password: "admin123", name: "Sofia · Banff (owner/admin)", emoji: "👑", role: "admin" },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "";
  const isAdminLogin = next.includes("/admin");

  const [email, setEmail] = useState(isAdminLogin ? "sofia@demo.ca" : "natalia@demo.ca");
  const [password, setPassword] = useState(isAdminLogin ? "admin123" : "password123");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdminLogin) {
      setEmail("sofia@demo.ca");
      setPassword("admin123");
    }
  }, [isAdminLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, destination: next }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Login failed");
        setBusy(false);
        return;
      }

      router.push(next || (data.isAdmin ? "/en/admin" : "/en"));
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
      setBusy(false);
    }
  };

  const selectPersona = (u: (typeof DEMO_USERS)[number]) => {
    if (isAdminLogin && u.role !== "admin") {
      setError(`Access denied: ${u.name} is a client account and cannot log in to the admin panel.`);
      return;
    }
    setError(null);
    setEmail(u.email);
    setPassword(u.password);
  };

  return (
    <div className="w-full max-w-sm">
      <div className="mb-6 text-center">
        <span className="inline-grid h-14 w-14 place-items-center rounded-full bg-pine text-3xl">
          {isAdminLogin ? "👑" : "🏔️"}
        </span>
        <h1 className="mt-3 text-xl font-bold text-forest">
          {isAdminLogin ? "Admin Portal Sign In" : "Spa Account Sign In"}
        </h1>
        <p className="mt-1 text-sm text-forest/60">
          {isAdminLogin
            ? "Restricted area. Only owner/admin accounts can access the admin dashboard."
            : "Sign in with your email and password to manage bookings and profile."}
        </p>
      </div>

      {isAdminLogin && (
        <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
          🔒 <strong>Owner/Admin only:</strong> Client accounts are not permitted to log in to the administration portal.
        </div>
      )}

      {/* Main Login Form */}
      <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-sand bg-white p-4 shadow-xs">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/70">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@demo.ca"
            className="mt-1 h-11 w-full rounded-xl border border-sand bg-cream/50 px-3 text-sm text-forest outline-none transition focus:border-pine focus:bg-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold uppercase tracking-wide text-forest/70">Password</label>
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-xs text-pine hover:underline cursor-pointer"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 h-11 w-full rounded-xl border border-sand bg-cream/50 px-3 text-sm text-forest outline-none transition focus:border-pine focus:bg-white"
          />
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-2.5 text-xs font-medium text-red-700">
            ⚠️ {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 flex h-12 w-full items-center justify-center rounded-xl bg-forest text-sm font-bold text-cream transition hover:bg-forest/90 disabled:opacity-50 cursor-pointer"
        >
          {busy ? "Signing in…" : isAdminLogin ? "Log In as Admin" : "Sign In"}
        </button>
      </form>

      {/* Persona Quick-Fill */}
      <div className="mt-5 space-y-2">
        <p className="text-center text-xs font-semibold text-forest/60">
          Demo personas (click to pre-fill credentials):
        </p>
        <div className="grid grid-cols-1 gap-1.5">
          {DEMO_USERS.map((u) => {
            const isRestrictedClient = isAdminLogin && u.role !== "admin";
            const isSelected = email === u.email;
            return (
              <button
                key={u.email}
                type="button"
                onClick={() => selectPersona(u)}
                disabled={busy}
                className={`flex items-center gap-3 rounded-xl border px-3 py-2 text-left text-xs transition cursor-pointer ${
                  isRestrictedClient
                    ? "border-sand/40 bg-sand/10 opacity-50 hover:opacity-75"
                    : isSelected
                    ? "border-pine bg-pine/10 font-bold"
                    : "border-sand bg-white hover:border-pine/40"
                }`}
              >
                <span className="text-lg">{u.emoji}</span>
                <span className="flex-1 truncate">
                  <span className="block font-semibold text-forest">{u.name}</span>
                  <span className="block text-[11px] text-forest/50">
                    {u.email} · pass: <code className="bg-sand/40 px-1 rounded">{u.password}</code>
                  </span>
                </span>
                {u.role === "admin" && (
                  <span className="rounded bg-forest/10 px-1.5 py-0.5 text-[10px] font-bold text-forest">
                    ADMIN
                  </span>
                )}
                {isRestrictedClient && (
                  <span className="text-[10px] text-amber-700">
                    No admin access
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-cream px-4 py-8">
      <Suspense fallback={<div className="text-forest/50">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
