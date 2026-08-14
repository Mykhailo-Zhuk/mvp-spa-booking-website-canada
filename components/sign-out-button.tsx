"use client";

import { useRouter } from "next/navigation";
import { t, type Locale } from "@/lib/i18n";

export default function SignOutButton({ locale }: { locale: Locale }) {
  const router = useRouter();
  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };
  return (
    <button
      onClick={signOut}
      className="h-13 min-h-12 w-full rounded-full bg-white text-sm font-bold text-ember ring-1 ring-sand"
    >
      {t(locale, "nav.signOut")}
    </button>
  );
}
