import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin-dashboard";
import { requireAdmin } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;

  const admin = await requireAdmin();
  if (!admin) redirect(`/login?next=/${locale}/admin`);

  return <AdminDashboard locale={locale} />;
}
