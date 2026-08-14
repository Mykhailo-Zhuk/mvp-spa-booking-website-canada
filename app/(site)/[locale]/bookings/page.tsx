// My bookings — plan mobile-first tab "Мої бронювання".
import { redirect } from "next/navigation";
import BookingsList from "@/components/bookings-list";
import { getCurrentUser } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function BookingsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: raw } = await params;
  const locale = raw as Locale;

  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=/${locale}/bookings`);

  return <BookingsList userId={user.id} locale={locale} />;
}
