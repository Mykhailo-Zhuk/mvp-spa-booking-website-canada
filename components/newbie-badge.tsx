"use client";

import { t, type Locale } from "@/lib/i18n";

export default function NewbieBadge({ locale }: { locale: Locale }) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const el = document.getElementById("guest-guide");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      history.pushState(null, "", "#guest-guide");
    } else {
      window.location.hash = "#guest-guide";
    }
  };

  return (
    <a
      href="#guest-guide"
      onClick={handleClick}
      className="block cursor-pointer rounded-2xl border-2 border-gold bg-gold/15 px-4 py-3 text-sm font-semibold text-forest transition hover:bg-gold/25"
    >
      {t(locale, "guide.newbieBadge")} <span className="text-pine underline">{t(locale, "guide.seeGuide")} ↓</span>
    </a>
  );
}
