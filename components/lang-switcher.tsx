"use client";

// EN/FR switcher (US#2, Task 2.1). Swaps the locale segment in the URL via Next client
// navigation — no page reload, matching the plan's History API requirement.
import { usePathname, useRouter } from "next/navigation";
import { useState, useRef, useEffect } from "react";
import { LOCALES, type Locale } from "@/lib/i18n";

function swapLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split("/");
  if (segments[1] === "en" || segments[1] === "fr" || segments[1] === "uk") segments[1] = locale;
  else segments.splice(1, 0, locale);
  return segments.join("/") || `/${locale}`;
}

export default function LangSwitcher({ locale }: { locale: Locale }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const choose = (next: Locale) => {
    setOpen(false);
    if (next !== locale) router.push(swapLocale(pathname, next));
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Language / Langue"
        className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-full bg-sand px-3 text-sm font-semibold text-forest"
      >
        🌐 <span className="hidden sm:inline">{locale.toUpperCase()}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-50 w-40 overflow-hidden rounded-2xl border border-sand bg-white shadow-xl">
          {LOCALES.map((l) => (
            <button
              key={l}
              onClick={() => choose(l)}
              className={`block w-full px-4 py-3 text-left text-sm font-medium hover:bg-cream ${
                l === locale ? "bg-cream text-pine" : "text-forest"
              }`}
            >
              {l === "en" ? "🇬🇧 English" : l === "fr" ? "🇫🇷 Français" : "🇺🇦 Українська"}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
