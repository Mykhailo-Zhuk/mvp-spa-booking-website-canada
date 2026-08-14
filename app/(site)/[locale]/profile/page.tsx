// Profile — demo session info + sign out.
import { redirect } from "next/navigation";
import SignOutButton from "@/components/sign-out-button";
import { getCurrentUser } from "@/lib/auth";
import { PROVINCES } from "@/lib/taxes";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;
  const base = `/${locale}`;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${base}/profile`);

  const province = PROVINCES[user.province];

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">👤 {t(locale, "nav.profile")}</h1>
      <div className="rounded-2xl border border-sand bg-white p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-sand text-3xl">👤</span>
          <div>
            <div className="text-base font-bold text-forest">{user.name}</div>
            <div className="text-xs text-forest/60">{user.email}</div>
          </div>
          {user.isAdmin && (
            <span className="ml-auto rounded-full bg-forest px-3 py-1 text-[11px] font-bold text-cream">ADMIN</span>
          )}
        </div>
        <div className="mt-4 space-y-1.5 border-t border-sand/60 pt-3 text-sm">
          <div className="flex justify-between"><span className="text-forest/60">Province</span><b>{province?.name} ({province?.label})</b></div>
          <div className="flex justify-between"><span className="text-forest/60">Bookings</span><b>{user.totalBookingsCount}</b></div>
          <div className="flex justify-between"><span className="text-forest/60">Phone</span><b>{user.phone ?? "—"}</b></div>
        </div>
      </div>
      <SignOutButton locale={locale} />
      <p className="text-center text-[11px] text-forest/50">Demo session — no real credentials stored.</p>
    </div>
  );
}
