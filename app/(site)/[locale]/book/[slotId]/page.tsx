import { notFound, redirect } from "next/navigation";
import BookingClient from "@/components/booking-client";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import type { Locale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slotId: string }>;
  searchParams: Promise<{ province?: string; tip?: string }>;
}) {
  const [{ locale: raw, slotId }, query] = await Promise.all([params, searchParams]);
  const locale = raw as Locale;
  const base = `/${locale}`;

  const [slot, user] = await Promise.all([
    prisma.slot.findUnique({
      where: { id: slotId },
      include: { therapist: true, service: true, promotion: true },
    }),
    getCurrentUser(),
  ]);

  if (!slot) notFound();
  if (!user) redirect(`/login?next=${encodeURIComponent(`${base}/book/${slotId}`)}`);

  const activeFlash = slot.promotion && slot.promotion.isActive && slot.promotion.endTime > new Date();
  const price = activeFlash ? slot.promotion!.discountedPrice : slot.price;

  return (
    <BookingClient
      slot={{
        id: slot.id,
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        durationMin: slot.service.durationMin,
        price,
        originalPrice: activeFlash ? slot.price : null,
        isFlashSale: !!activeFlash,
        isBooked: slot.isBooked,
        therapist: { name: slot.therapist.name, avatarEmoji: slot.therapist.avatarEmoji, gender: slot.therapist.gender },
        service: { name: slot.service.name, slug: slot.service.slug, icon: slot.service.icon, basePrice: slot.service.basePrice },
      }}
      user={{ id: user.id, name: user.name, email: user.email, province: user.province }}
      locale={locale}
      base={base}
      initialProvince={query.province ?? user.province}
      initialTip={query.tip === "15"}
    />
  );
}
