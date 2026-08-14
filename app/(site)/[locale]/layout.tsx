import { redirect } from "next/navigation";
import Header from "@/components/header";
import BottomNav from "@/components/bottom-nav";
import { getCurrentUser } from "@/lib/auth";
import { LOCALES, type Locale } from "@/lib/i18n";

export default async function SiteLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!LOCALES.includes(raw as Locale)) redirect("/en");

  const locale = raw as Locale;
  const base = `/${locale}`;
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh">
      <Header user={user} locale={locale} base={base} />
      <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 md:pb-12">{children}</main>
      <BottomNav locale={locale} base={base} />
    </div>
  );
}
