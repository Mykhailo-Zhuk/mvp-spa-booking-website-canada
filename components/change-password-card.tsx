"use client";

import { useState } from "react";
import { t, type Locale } from "@/lib/i18n";

export default function ChangePasswordCard({
  locale,
  title,
  onPasswordChanged,
}: {
  locale: Locale;
  title?: string;
  onPasswordChanged?: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: t(locale, "profile.passwordMismatch") });
      return;
    }

    if (newPassword.length < 4) {
      setMessage({ type: "error", text: "New password must be at least 4 characters long" });
      return;
    }

    setBusy(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: "error", text: data.error ?? "Failed to update password" });
        setBusy(false);
        return;
      }

      setMessage({ type: "success", text: t(locale, "profile.passwordSuccess") });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setBusy(false);
      onPasswordChanged?.();
    } catch {
      setMessage({ type: "error", text: "Network error. Please try again." });
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-sand bg-white p-5 shadow-xs">
      <div className="flex items-center justify-between border-b border-sand/60 pb-3">
        <h2 className="text-base font-bold text-forest">
          🔒 {title ?? t(locale, "profile.changePassword")}
        </h2>
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="text-xs font-semibold text-pine hover:underline cursor-pointer"
        >
          {showPassword ? "Hide text" : "Show text"}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-3">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/70">
            {t(locale, "profile.currentPassword")}
          </label>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 h-10 w-full rounded-xl border border-sand bg-cream/40 px-3 text-sm text-forest outline-none transition focus:border-pine focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/70">
            {t(locale, "profile.newPassword")}
          </label>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 h-10 w-full rounded-xl border border-sand bg-cream/40 px-3 text-sm text-forest outline-none transition focus:border-pine focus:bg-white"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wide text-forest/70">
            {t(locale, "profile.confirmPassword")}
          </label>
          <input
            type={showPassword ? "text" : "password"}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="mt-1 h-10 w-full rounded-xl border border-sand bg-cream/40 px-3 text-sm text-forest outline-none transition focus:border-pine focus:bg-white"
          />
        </div>

        {message && (
          <div
            className={`rounded-xl p-2.5 text-xs font-medium ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.type === "success" ? "✅" : "⚠️"} {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="mt-2 flex h-11 w-full items-center justify-center rounded-xl bg-forest text-sm font-bold text-cream transition hover:bg-forest/90 disabled:opacity-50 cursor-pointer"
        >
          {busy ? "Updating…" : t(locale, "profile.updatePassword")}
        </button>
      </form>
    </div>
  );
}
