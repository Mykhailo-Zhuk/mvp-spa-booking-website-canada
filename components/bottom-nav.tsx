"use client";

// Mobile-first bottom tab bar (plan: Головна → Пошук → Мої бронювання → Профіль).
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";
import { t } from "@/lib/i18n";

const TABS = [
  { key: "nav.home", href: "/", icon: "🏔️" },
  { key: "nav.services", href: "/services", icon: "🔍" },
  { key: "nav.bookings", href: "/bookings", icon: "📅" },
  { key: "nav.profile", href: "/profile", icon: "👤" },
] as const;

export default function BottomNav({ locale, base }: { locale: Locale; base: string }) {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sand bg-white/95 backdrop-blur md:hidden"
      aria-label="Bottom navigation"
    >
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {TABS.map((tab) => {
          const href = `${base}${tab.href === "/" ? "" : tab.href}`;
          const active =
            tab.href === "/" ? pathname === `${base}` || pathname === `${base}/` : pathname.startsWith(`${base}${tab.href}`);
          return (
            <Link
              key={tab.key}
              href={href}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? "text-pine" : "text-forest/50"
              }`}
            >
              <span className="text-xl leading-none">{tab.icon}</span>
              {t(locale, tab.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
