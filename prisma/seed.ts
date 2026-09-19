/* eslint-disable @typescript-eslint/no-unused-vars */
// Seed script — Canadian demo data for the Spa Booking Website.
// Run: npx tsx prisma/seed.ts
import { prisma } from "../lib/prisma";
import type { Slot, Therapist, Service, Package } from "../app/generated/prisma/client";

const pad = (n: number) => String(n).padStart(2, "0");
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Local DateTime for (today + dayOffset) at hour:min. */
function at(dayOffset: number, hour: number, min = 0): Date {
  const d = new Date();
  d.setHours(hour, min, 0, 0);
  d.setDate(d.getDate() + dayOffset);
  return d;
}

async function main() {
  console.log("🌲 Seeding Rocky Mountain Serenity demo data...");

  // Clean (fresh seed)
  await prisma.notificationLog.deleteMany();
  await prisma.promotion.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.occupancyStat.deleteMany();
  await prisma.faq.deleteMany();
  await prisma.guestGuideStep.deleteMany();
  await prisma.packageInclusion.deleteMany();
  await prisma.package.deleteMany();
  await prisma.service.deleteMany();
  await prisma.therapist.deleteMany();
  await prisma.user.deleteMany();

  // ---------- Users ----------
  const [natalia, priya, david, sofia, demo] = await Promise.all([
    prisma.user.create({
      data: {
        email: "natalia@demo.ca",
        name: "Наталя Гриценко",
        phone: "+1 416 555 0110",
        province: "ON",
        latitude: 43.6532,
        longitude: -79.3832,
        pushToken: "demo-token-natalia",
        totalBookingsCount: 3,
        firstBookingAt: at(-120, 10),
      },
    }),
    prisma.user.create({
      data: {
        email: "priya@demo.ca",
        name: "Priya Sharma",
        phone: "+1 604 555 0121",
        province: "BC",
        latitude: 49.2827,
        longitude: -123.1207,
        pushToken: "demo-token-priya",
        totalBookingsCount: 0, // newbie → US#3 badge
      },
    }),
    prisma.user.create({
      data: {
        email: "david@demo.ca",
        name: "David Miller",
        phone: "+1 613 555 0132",
        province: "ON",
        latitude: 45.4215,
        longitude: -75.6972,
        pushToken: "demo-token-david",
        totalBookingsCount: 1,
        firstBookingAt: at(-40, 15),
      },
    }),
    prisma.user.create({
      data: {
        email: "sofia@demo.ca",
        name: "Sofia Dubois",
        phone: "+1 403 555 0143",
        province: "AB",
        latitude: 51.1784,
        longitude: -115.5708,
        pushToken: "demo-token-sofia",
        isAdmin: true,
      },
    }),
    // Hidden system user used for "booked by someone else" slots
    prisma.user.create({
      data: { email: "demo@spa.ca", name: "Demo Guest", province: "AB" },
    }),
  ]);

  // Demo customers near Banff (geofence US#4) + 1 far away (Toronto) who must NOT get push
  const banffNames = [
    "Emma Thompson", "Liam Novak", "Olivia Fortier", "Noah Tremblay",
    "Ava Lachance", "Ethan Rousseau", "Mia Caron", "Lucas Bélanger",
  ];
  const banffUsers = await Promise.all(
    banffNames.map((name, i) =>
      prisma.user.create({
        data: {
          email: `guest${i + 1}@demo.ca`,
          name,
          phone: `+1 403 555 02${String(i + 1).padStart(2, "0")}`,
          province: "AB",
          // All within ~9 km of the spa (51.1784, -115.5708) so the 10 km geofence catches them.
          latitude: 51.11 + (i % 4) * 0.03,
          longitude: -115.6 + (i % 3) * 0.03,
          pushToken: i === 7 ? "demo-token-offline-guest8" : `demo-token-guest${i + 1}`,
        },
      }),
    ),
  );
  await prisma.user.create({
    data: {
      email: "faraway@demo.ca",
      name: "Far Away User",
      province: "ON",
      latitude: 43.65,
      longitude: -79.38, // Toronto — 2700 km away, must be excluded
      pushToken: "demo-token-far",
    },
  });

  // ---------- Therapists ----------
  const therapistData = [
    { name: "Олена Коваль", gender: "female", specialty: "hot-stone", bio: "10 років досвіду, гаряче каміння та глибокий релакс", avatarEmoji: "🧖‍♀️" },
    { name: "Marie Tremblay", gender: "female", specialty: "deep-tissue", bio: "Deep tissue specialist, 8 років у Banff", avatarEmoji: "💆‍♀️" },
    { name: "Sarah Chen", gender: "female", specialty: "aromatherapy", bio: "Ароматерапія та шведський масаж", avatarEmoji: "🌸" },
    { name: "Emily Wilson", gender: "female", specialty: "swedish", bio: "Шведський масаж, робота зі стресом", avatarEmoji: "🌿" },
    { name: "James O'Neil", gender: "male", specialty: "sports", bio: "Спортивний масаж, відновлення", avatarEmoji: "💪" },
    { name: "Miguel Santos", gender: "male", specialty: "reflexology", bio: "Рефлексотерапія стоп", avatarEmoji: "🦶" },
    { name: "Anna Berg", gender: "female", specialty: "hot-stone", bio: "Гаряче каміння + ароматерапія", avatarEmoji: "🪨" },
    { name: "Kim Nguyen", gender: "female", specialty: "facial", bio: "Догляд за обличчям, spa rituals", avatarEmoji: "✨" },
  ];
  const therapists = [];
  for (const t of therapistData) {
    therapists.push(
      await prisma.therapist.create({
        data: { name: t.name, gender: t.gender, specialty: t.specialty, bio: t.bio, avatarEmoji: t.avatarEmoji },
      }),
    );
  }

  // ---------- Services ----------
  const serviceData = [
    {
      slug: "back-massage",
      nameEn: "Back Massage", nameFr: "Massage du dos", nameUk: "Масаж спини",
      category: "massage",
      descriptionEn: "Classic back massage to release tension after a busy day.",
      descriptionFr: "Massage classique du dos pour soulager les tensions après une journée chargée.",
      descriptionUk: "Класичний масаж спини для зняття напруги після робочого дня.",
      basePrice: 100, durationMin: 60, icon: "💆",
    },
    {
      slug: "hot-stone",
      nameEn: "Hot Stone Massage", nameFr: "Massage aux pierres chaudes", nameUk: "Масаж гарячим камінням",
      category: "massage",
      descriptionEn: "Hot basalt stones ease muscle tension — Natalia's favourite.",
      descriptionFr: "Les pierres de basalte chaudes soulagent les tensions musculaires — le préféré de Natalia.",
      descriptionUk: "Гаряче базальтове каміння знімає м'язові затиски — улюблена процедура Наталі.",
      basePrice: 120, durationMin: 75, icon: "🪨",
    },
    {
      slug: "swedish",
      nameEn: "Swedish Massage", nameFr: "Massage suédois", nameUk: "Шведський масаж",
      category: "massage",
      descriptionEn: "Full-body Swedish massage with essential oils.",
      descriptionFr: "Massage suédois complet aux huiles essentielles.",
      descriptionUk: "Повнотілий шведський масаж з ефірними оліями.",
      basePrice: 110, durationMin: 60, icon: "🌿",
    },
    {
      slug: "deep-tissue",
      nameEn: "Deep Tissue Massage", nameFr: "Massage des tissus profonds", nameUk: "Глибокий масаж тканин",
      category: "massage",
      descriptionEn: "Deep work on muscles for those who sit a lot.",
      descriptionFr: "Travail en profondeur pour ceux qui passent beaucoup de temps assis.",
      descriptionUk: "Глибока опрацьована м'язів для тих, хто багато сидить.",
      basePrice: 130, durationMin: 60, icon: "💪",
    },
    {
      slug: "aromatherapy",
      nameEn: "Aromatherapy", nameFr: "Aromathérapie", nameUk: "Ароматерапія",
      category: "massage",
      descriptionEn: "Relaxing massage with lavender and citrus.",
      descriptionFr: "Massage relaxant à la lavande et aux agrumes.",
      descriptionUk: "Розслаблюючий масаж з лавандою та цитрусом.",
      basePrice: 95, durationMin: 50, icon: "🌸",
    },
    {
      slug: "smudge-ceremony",
      nameEn: "Smudge Ceremony (Ritual)", nameFr: "Cérémonie de fumigation (rituel)", nameUk: "Smudge-церемонія (ритуал)",
      category: "ritual",
      descriptionEn: "Traditional smoke-cleansing ritual with sauna and rest area. 5 steps: from entrance to exit.",
      descriptionFr: "Rituel traditionnel de purification à la fumée avec sauna et zone de repos. 5 étapes : de l'entrée à la sortie.",
      descriptionUk: "Традиційний ритуал димного очищення з парною та зоною відпочинку. 5 кроків: від входу до виходу.",
      basePrice: 150, durationMin: 90, icon: "🔥",
    },
    {
      slug: "facial",
      nameEn: "Facial Treatment", nameFr: "Soin du visage", nameUk: "Догляд за обличчям",
      category: "facial",
      descriptionEn: "Cleansing, mask and hydration for glowing skin.",
      descriptionFr: "Nettoyage, masque et hydratation pour une peau éclatante.",
      descriptionUk: "Очищення, маска та гідробаланс для сяючої шкіри.",
      basePrice: 105, durationMin: 60, icon: "✨",
    },
  ];
  const services = {} as Record<string, Service>;
  for (const s of serviceData) {
    services[s.slug] = await prisma.service.create({ data: s });
  }

  // ---------- Packages (US#2 — Девід) ----------
  const nordic = await prisma.package.create({
    data: {
      slug: "nordic-relaxation",
      titleEn: "Nordic Relaxation",
      titleFr: "Relaxation nordique",
      titleUk: "Нордичне розслаблення",
      descriptionEn:
        "A full evening of Finnish sauna, open-air jacuzzi and cedar barrel bath (bain de cèdre). Includes robes, slippers, free parking and ginger tea. Champagne is available at an extra cost.",
      descriptionFr:
        "Une soirée complète : sauna finlandais, jacuzzi en plein air et bain de cèdre. Comprend peignoirs, pantoufles, stationnement gratuit et thé au gingembre. Le champagne est disponible en supplément.",
      descriptionUk:
        "Цілий вечір фінської сауни, відкритого джакузі та кедрової бочки (bain de cèdre). Включено халати, тапці, безкоштовний паркінг та імбирний чай. Шампанське — за додаткову плату.",
      price: 189,
      durationMin: 180,
      imageEmoji: "🧖",
    },
  });
  await prisma.packageInclusion.createMany({
    data: [
      { packageId: nordic.id, itemNameEn: "2 bathrobes (S–XXL)", itemNameFr: "2 peignoirs (S–XXL)", itemNameUk: "2 халати (S–XXL)", icon: "👘", tooltip: "Sizes S–XXL. Material: cotton. Included free of charge." },
      { packageId: nordic.id, itemNameEn: "Slippers", itemNameFr: "Pantoufles", itemNameUk: "Тапці", icon: "🩴", tooltip: "One pair per guest, free." },
      { packageId: nordic.id, itemNameEn: "Free parking", itemNameFr: "Stationnement gratuit", itemNameUk: "Безкоштовний паркінг", icon: "🚗", tooltip: "On-site lot, 2 min walk to reception." },
      { packageId: nordic.id, itemNameEn: "Ginger tea", itemNameFr: "Thé au gingembre", itemNameUk: "Імбирний чай", icon: "🍵", tooltip: "Unlimited refills in the relaxation zone." },
      { packageId: nordic.id, itemNameEn: "Cedar barrel bath (bain de cèdre)", itemNameFr: "Bain de cèdre", itemNameUk: "Кедрова бочка (bain de cèdre)", icon: "🛁", tooltip: "45 min private cedar tub at 38°C." },
      { packageId: nordic.id, itemNameEn: "Finnish sauna & open-air jacuzzi", itemNameFr: "Sauna finlandais & jacuzzi extérieur", itemNameUk: "Фінська сауна та відкрите джакузі", icon: "♨️", tooltip: "Included in the package duration." },
    ],
  });

  const duo = await prisma.package.create({
    data: {
      slug: "romantic-duo",
      titleEn: "Romantic Duo",
      titleFr: "Duo romantique",
      titleUk: "Романтичний дует",
      descriptionEn: "A couples package: cedar barrel bath, Swedish massage for two and a private relaxation lounge.",
      descriptionFr: "Forfait duo : bain de cèdre, massage suédois pour deux et salon de détente privé.",
      descriptionUk: "Пакет для пари: кедрова бочка, шведський масаж для двох та приватний лаунж-зон відпочинку.",
      price: 260,
      durationMin: 150,
      imageEmoji: "💑",
    },
  });
  await prisma.packageInclusion.createMany({
    data: [
      { packageId: duo.id, itemNameEn: "2 robes + slippers", itemNameFr: "2 peignoirs + pantoufles", itemNameUk: "2 халати + тапці", icon: "👘", tooltip: "Included for both guests." },
      { packageId: duo.id, itemNameEn: "Private lounge", itemNameFr: "Salon privé", itemNameUk: "Приватний лаунж", icon: "🛋️", tooltip: "30 min after the treatment." },
      { packageId: duo.id, itemNameEn: "Sparkling water", itemNameFr: "Eau pétillante", itemNameUk: "Газована вода", icon: "🥂", tooltip: "Champagne upgrade available at reception (+$15)." },
    ],
  });

  // Package services — so packages are bookable through the same slot flow (US#2 → voucher).
  const pkgServices: { svc: Service; pkg: Package }[] = [];
  for (const [pkg, [nameEn, nameFr, nameUk]] of [
    [nordic, ["Nordic Relaxation", "Relaxation nordique", "Нордичне розслаблення"]],
    [duo, ["Romantic Duo", "Duo romantique", "Романтичний дует"]],
  ] as const) {
    const svc = await prisma.service.create({
      data: {
        slug: `pkg-${pkg.slug}`,
        nameEn,
        nameFr,
        nameUk,
        category: "package",
        descriptionEn: pkg.descriptionEn,
        descriptionFr: pkg.descriptionFr,
        descriptionUk: pkg.descriptionUk,
        basePrice: pkg.price,
        durationMin: pkg.durationMin,
        icon: pkg.imageEmoji,
      },
    });
    pkgServices.push({ svc, pkg });
  }

  // ---------- Guest Guide (US#3 — Прія, for smudge-ceremony) ----------
  const smudge = services["smudge-ceremony"];
  await prisma.guestGuideStep.createMany({
    data: [
      { serviceId: smudge.id, stepNumber: 1, icon: "🚪",
        titleEn: "Arrived", titleFr: "Arrivée", titleUk: "Прийшла",
        descriptionEn: "Come 15 minutes early. Someone will greet you at reception and walk you to the changing room.",
        descriptionFr: "Arrivez 15 minutes avant. On vous accueillera à la réception et vous conduira au vestiaire.",
        descriptionUk: "Приходьте за 15 хвилин. На ресепшені вас зустрінуть і проведуть до роздягальні.",
        estimatedDurationMin: 5 },
      { serviceId: smudge.id, stepNumber: 2, icon: "📿",
        titleEn: "Got your bracelet", titleFr: "Bracelet reçu", titleUk: "Отримала браслет",
        descriptionEn: "You get a fabric bracelet with your locker number and its key.",
        descriptionFr: "Vous recevez un bracelet en tissu avec le numéro de votre casier et sa clé.",
        descriptionUk: "Ви отримуєте тканинний браслет з номером локера та ключ від нього.",
        estimatedDurationMin: 5 },
      { serviceId: smudge.id, stepNumber: 3, icon: "🔐",
        titleEn: "Changing room", titleFr: "Vestiaire", titleUk: "Роздягальня",
        descriptionEn: "Lockers with your own locks. A swimsuit is required — towels and robe are provided.",
        descriptionFr: "Casiers avec cadenas. Maillot de bain obligatoire — serviettes et peignoir fournis.",
        descriptionUk: "Локери з власними замками. Купальник — обов'язковий, рушник та халат надаються.",
        estimatedDurationMin: 10 },
      { serviceId: smudge.id, stepNumber: 4, icon: "🚿",
        titleEn: "Shower before", titleFr: "Douche avant", titleUk: "Душ перед",
        descriptionEn: "Shower is required before the ritual. Water is 38°C, shampoo provided.",
        descriptionFr: "Douche obligatoire avant le rituel. Eau à 38°C, shampoing fourni.",
        descriptionUk: "Обов'язковий душ перед ритуалом. Температура води 38°C, шампунь надається.",
        estimatedDurationMin: 10 },
      { serviceId: smudge.id, stepNumber: 5, icon: "🧖‍♀️",
        titleEn: "Relaxation area", titleFr: "Zone de repos", titleUk: "Зона відпочинку",
        descriptionEn: "Smoke ritual in silence, then sauna and relaxation area with herbal tea.",
        descriptionFr: "Cérémonie de fumigation en silence, puis sauna et zone de repos avec tisane.",
        descriptionUk: "Смокінг-церемонія в тиші, далі — парна та зона відпочинку з трав'яним чаєм.",
        estimatedDurationMin: 60 },
    ],
  });

  // ---------- FAQ (US#3) ----------
  await prisma.faq.createMany({
    data: [
      { serviceId: smudge.id,
        questionEn: "Do I need a swimsuit?", questionFr: "Ai-je besoin d'un maillot de bain ?", questionUk: "Чи потрібен купальник?",
        answerEn: "Yes, a swimsuit is required for the ritual and sauna. Forgot yours? We have disposable ones for $5.",
        answerFr: "Oui, le maillot de bain est obligatoire pour le rituel et le sauna. Vous l'avez oublié ? Nous en avons des jetables à 5 $.",
        answerUk: "Так, купальник обов'язковий для ритуалу та парної. Якщо забули — у нас є одноразові за $5.",
        viewCount: 214, helpfulCount: 190 },
      { serviceId: smudge.id,
        questionEn: "Are there lockers?", questionFr: "Y a-t-il des casiers ?", questionUk: "Чи є локери?",
        answerEn: "Yes, free lockers with a key. Leave valuables at home or in the safe at reception.",
        answerFr: "Oui, casiers gratuits avec clé. Laissez vos objets de valeur à la maison ou au coffre de la réception.",
        answerUk: "Так, безкоштовні локери з ключем. Цінні речі залиште вдома або в сейфі на ресепшені.",
        viewCount: 168, helpfulCount: 141 },
      { serviceId: smudge.id,
        questionEn: "How long does the whole ritual take?", questionFr: "Combien de temps dure le rituel ?", questionUk: "Скільки триває весь ритуал?",
        answerEn: "90 minutes: 5 min welcome, 10 min changing, 10 min shower, 60 min ritual and relaxation.",
        answerFr: "90 minutes : 5 min d'accueil, 10 min vestiaire, 10 min douche, 60 min rituel et repos.",
        answerUk: "90 хвилин: 5 хв зустріч, 10 хв роздягальня, 10 хв душ, 60 хв ритуал і відпочинок.",
        viewCount: 97, helpfulCount: 88 },
    ],
  });

  // ---------- Slots (next 7 days) + pre-booked ----------
  const specialtyToServices: Record<string, string[]> = {
    "hot-stone": ["hot-stone"],
    "deep-tissue": ["deep-tissue", "back-massage"],
    aromatherapy: ["aromatherapy", "swedish"],
    swedish: ["swedish", "back-massage"],
    sports: ["deep-tissue", "back-massage"],
    reflexology: ["aromatherapy"],
    facial: ["facial"],
  };

  let slotCount = 0;
  const bookedSlots: { slot: Slot; therapist: Therapist; service: Service }[] = [];
  // deterministic pseudo-random for stable seeding
  let randState = 42;
  const rnd = () => {
    randState = (randState * 1103515245 + 12345) & 0x7fffffff;
    return randState / 0x7fffffff;
  };

  const currentHour = new Date().getHours();
  for (let day = 0; day <= 7; day++) {
    const weekday = at(day, 0).getDay();
    for (const therapist of therapists) {
      const serviceSlugs = specialtyToServices[therapist.specialty] ?? ["back-massage"];
      for (const slug of serviceSlugs) {
        const service = services[slug];
        for (let hour = 10; hour <= 20; hour++) {
          if (day === 0 && hour <= currentHour) continue; // skip past slots today
          const start = at(day, hour);
          const end = new Date(start.getTime() + service.durationMin * 60000);
          // Higher chance of being booked on weekends
          const bookChance = weekday === 0 || weekday === 6 ? 0.55 : weekday === 2 && hour < 14 ? 0.12 : 0.3;
          const isBooked = rnd() < bookChance;
          const slot = await prisma.slot.create({
            data: {
              therapistId: therapist.id,
              serviceId: service.id,
              startTime: start,
              endTime: end,
              isBooked,
              price: service.basePrice,
            },
          });
          slotCount++;
          if (isBooked && slotCount % 3 === 0) bookedSlots.push({ slot, therapist, service });
        }
      }
    }
  }

  // Package service slots (rotating therapists, packages aren't therapist-bound in demo)
  const packageTherapists = [therapists[1], therapists[2], therapists[6]];
  for (const { svc } of pkgServices) {
    for (let day = 0; day <= 7; day++) {
      const weekday = at(day, 0).getDay();
      for (let hour = 10; hour <= 20; hour += 2) {
        if (day === 0 && hour <= currentHour) continue;
        for (const therapist of packageTherapists) {
          const start = at(day, hour);
          const end = new Date(start.getTime() + svc.durationMin * 60000);
          const isBooked = rnd() < (weekday === 0 || weekday === 6 ? 0.5 : 0.25);
          const slot = await prisma.slot.create({
            data: {
              therapistId: therapist.id,
              serviceId: svc.id,
              startTime: start,
              endTime: end,
              isBooked,
              price: svc.basePrice,
            },
          });
          slotCount++;
          if (isBooked && slotCount % 3 === 0) bookedSlots.push({ slot, therapist, service: svc });
        }
      }
    }
  }

  // Create real Booking rows for a sample of the pre-booked slots (so "booked" slots are consistent)
  for (const [i, { slot, service }] of bookedSlots.slice(0, 18).entries()) {
    const taxRate = 0.05; // AB
    await prisma.booking.create({
      data: {
        bookingCode: `SPA-SEED-${String(i + 1).padStart(3, "0")}`,
        userId: demo.id,
        slotId: slot.id,
        serviceId: service.id,
        basePrice: slot.price,
        taxRate,
        taxAmount: Math.round(slot.price * taxRate * 100) / 100,
        tipAmount: 0,
        totalPaid: Math.round(slot.price * (1 + taxRate) * 100) / 100,
        status: "confirmed",
      },
    });
  }

  // Upcoming real bookings for Natalia (US#1 flow demo) and David (US#2 voucher demo)
  const nataliaSlot = await prisma.slot.findFirst({
    where: { serviceId: services["hot-stone"].id, isBooked: false, startTime: { gte: at(1, 0) } },
    orderBy: { startTime: "asc" },
  });
  const davidSlot = await prisma.slot.findFirst({
    where: { serviceId: services["swedish"].id, isBooked: false, startTime: { gte: at(1, 0) } },
    orderBy: { startTime: "asc" },
  });
  if (nataliaSlot) {
    const taxRate = 0.13;
    const tip = Math.round(nataliaSlot.price * 0.15 * 100) / 100;
    await prisma.booking.create({
      data: {
        bookingCode: "SPA-DEMO-NAT-001",
        userId: natalia.id,
        slotId: nataliaSlot.id,
        serviceId: services["hot-stone"].id,
        basePrice: nataliaSlot.price,
        taxRate,
        taxAmount: Math.round(nataliaSlot.price * taxRate * 100) / 100,
        tipAmount: tip,
        totalPaid: Math.round((nataliaSlot.price * (1 + taxRate) + tip) * 100) / 100,
        status: "confirmed",
      },
    });
    await prisma.slot.update({ where: { id: nataliaSlot.id }, data: { isBooked: true } });
  }
  if (davidSlot) {
    const taxRate = 0.13;
    await prisma.booking.create({
      data: {
        bookingCode: "SPA-DEMO-DAV-001",
        userId: david.id,
        slotId: davidSlot.id,
        serviceId: services["swedish"].id,
        basePrice: davidSlot.price,
        taxRate,
        taxAmount: Math.round(davidSlot.price * taxRate * 100) / 100,
        tipAmount: 0,
        totalPaid: Math.round(davidSlot.price * (1 + taxRate) * 100) / 100,
        status: "confirmed",
      },
    });
    await prisma.slot.update({ where: { id: davidSlot.id }, data: { isBooked: true } });
  }

  // ---------- Occupancy stats (last 7 days → fill_rate per weekday/hour) ----------
  const hourCapacity = 5;
  const stats: {
    date: string; weekday: number; hour: number; serviceId: string;
    bookingsCount: number; capacity: number; fillRate: number;
  }[] = [];
  for (let day = 6; day >= 0; day--) {
    const d = at(-day, 0);
    const weekday = d.getDay();
    for (let hour = 10; hour <= 19; hour++) {
      let fill: number;
      if (weekday === 2 && hour >= 10 && hour <= 14) fill = 0.08 + rnd() * 0.15; // Tuesday dead hours
      else if (weekday === 0 || weekday === 6) fill = 0.55 + rnd() * 0.35; // weekends busy
      else if (hour >= 17) fill = 0.5 + rnd() * 0.3; // evenings
      else fill = 0.2 + rnd() * 0.25;
      stats.push({
        date: isoDate(d),
        weekday,
        hour,
        serviceId: services["back-massage"].id,
        bookingsCount: Math.round(fill * hourCapacity),
        capacity: hourCapacity,
        fillRate: Math.round(fill * 100) / 100,
      });
    }
  }
  await prisma.occupancyStat.createMany({ data: stats });

  // ---------- In-app notifications (demo bell) ----------
  await prisma.notificationLog.createMany({
    data: [
      { type: "inapp", titleEn: "Welcome! 🎉", titleFr: "Bienvenue ! 🎉", titleUk: "Ласкаво просимо! 🎉",
        bodyEn: "First time here? Check the guest guide to feel confident.",
        bodyFr: "Première visite ? Consultez le guide pour vous sentir à l'aise.",
        bodyUk: "Ви вперше тут? Перегляньте гід гостя, щоб почуватися впевнено.",
        userId: priya.id, delivered: true },
      { type: "inapp", titleEn: "Weekend discount", titleFr: "Remise week-end", titleUk: "Знижка на вихідні",
        bodyEn: "-15% on Swedish massage this Saturday.",
        bodyFr: "-15 % sur le massage suédois samedi.",
        bodyUk: "Цієї суботи −15% на шведський масаж.",
        userId: natalia.id, delivered: true },
      { type: "inapp", titleEn: "Seasonal tip 🌨️", titleFr: "Conseil de saison 🌨️", titleUk: "Сезонна порада 🌨️",
        bodyEn: "Hot stone helps with January fatigue — you have it scheduled.",
        bodyFr: "Les pierres chaudes aident contre la fatigue de janvier — vous en avez une prévue.",
        bodyUk: "Гаряче каміння допомагає від січневої втоми — у вас заплановано.",
        userId: natalia.id, delivered: true },
    ],
  });

  const serviceCount = await prisma.service.count();
  console.log(`✅ Seeded: ${therapists.length} therapists, ${serviceCount} services, ${pkgServices.length} packages, ${slotCount} slots, ${stats.length} occupancy stats, ${banffUsers.length + 7} users.`);
  console.log("Demo logins: natalia@demo.ca | priya@demo.ca | david@demo.ca | sofia@demo.ca (admin)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
