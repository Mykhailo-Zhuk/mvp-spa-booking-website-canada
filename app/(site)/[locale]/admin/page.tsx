import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin-dashboard";
import { getCurrentUser } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/login?next=/${locale}/admin`);
  }

  if (!user.isAdmin) {
    redirect(`/${locale}`);
  }

  return <AdminDashboard locale={locale} />;
}
