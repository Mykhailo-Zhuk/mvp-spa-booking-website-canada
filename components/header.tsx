// Site header — server component. Includes logo, lang switcher, notifications bell,
// admin link and sign-in state.
import Link from "next/link";
import LangSwitcher from "./lang-switcher";
import NotificationBell from "./notification-bell";
import { t, type Locale } from "@/lib/i18n";
import type { User } from "@/app/generated/prisma/client";

export default function Header({ user, locale, base }: { user: User | null; locale: Locale; base: string }) {
  const firstName = user?.name.split(" ")[0] ?? "";
  return (
    <header className="sticky top-0 z-40 border-b border-sand bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-2 px-4 py-2.5">
        <Link href={base} className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-pine text-xl">🏔️</span>
          <span className="hidden text-sm font-bold leading-tight text-forest sm:block">
            Rocky Mountain
            <br />
            <span className="text-xs font-medium text-pine">Serenity Spa · Banff</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          {user && <NotificationBell userId={user.id} locale={locale} />}
          <LangSwitcher locale={locale} />
          {user?.isAdmin && (
            <Link
              href={`${base}/admin`}
              className="flex h-11 items-center rounded-full bg-forest px-4 text-sm font-semibold text-cream"
            >
              {t(locale, "nav.admin")}
            </Link>
          )}
          {user ? (
            <Link
              href={`${base}/profile`}
              className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-full bg-pine px-3 text-sm font-semibold text-white"
            >
              <span>👤</span>
              <span className="hidden max-w-24 truncate sm:inline">{firstName}</span>
            </Link>
          ) : (
            <Link
              href="/login"
              className="flex h-11 items-center rounded-full bg-pine px-4 text-sm font-semibold text-white"
            >
              {t(locale, "nav.signIn")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
