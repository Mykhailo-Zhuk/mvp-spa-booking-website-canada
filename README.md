# 🏔️ Rocky Mountain Serenity — Spa Booking Website (Canada)

Реалізація плану з `./plan` — spa-booking сайт для канадського ринку, всі 4 user stories
(Наталя, Девід, Прія, Софія) в demo-mode інтеграціях.

## Стек

- **Next.js 16** (App Router, Server Components) + **TypeScript**
- **Prisma 7** + **SQLite** (`dev.db`, driver adapter `@prisma/adapter-better-sqlite3`)
- **Tailwind CSS v4** — mobile-first, канадська spa-палітра
- Client-side: **jsPDF** (A6 ваучер з QR), **qrcode**, генерація `.ics` для календаря

## Швидкий старт

```bash
npm install
npx prisma migrate dev   # створює dev.db + таблиці
npm run db:seed          # демо-дані (терапевти, слоти, пакети, FAQ, occupancy stats)
npm run dev              # http://localhost:3000
```

Продакшен-білд: `npm run build && npm start`.

> ⚠️ Після `git clone` згенерований Prisma Client (`app/generated/`) відсутній — виконайте `npx prisma generate` (входить у `migrate dev`).

## Demo-логіни (одним кліком на /login)

| Персона | Email | Сценарій |
|---|---|---|
| 💼 Наталя | `natalia@demo.ca` | US#1 — повернення, 3+ бронювань |
| 🌱 Priya | `priya@demo.ca` | US#3 — новачок (0 бронювань → бейдж) |
| ❤️ David | `david@demo.ca` | US#2 — турист, ваучер |
| 👑 Sofia | `sofia@demo.ca` | US#4 — адмін /admin |

## Що реалізовано (мапа plan → код)

### US#1 Наталя — каталог + миттєва оплата
- `/en/services` — фільтри (дата / стать терапевта / тип), **реальні слоти** з сітки, заброньовані — сірі
- Sticky-калькулятор: HST/GST/QST за провінцією (бекенд `/api/calculate-price`), toggle «чайові 15%» — приклад з плану: $120 + HST $15.60 = **$135.60**
- `/en/book/[slotId]` — підтвердження → demo-Stripe sheet (картка `•••• 0002` = declined) → успіх: **QR-код**, **Google Calendar (.ics)**, **PDF-ваучер**
- `/api/availability`, `/api/book` (атомарно блокує слот, `booking_code` SPA-YYYY-MM-DD-NNN, статус failed не блокує слот)

### US#2 Девід — двомовність + ваучер
- Глобальний EN/FR перемикач 🌐: URL `/en/...` ↔ `/fr/...` без перезавантаження (client-side nav)
- `/en/packages/nordic-relaxation` — опис з БД двома мовами, сітка «Що ВКЛЮЧЕНО» (👘 🚗 🍵 🛁…) з tooltip, зелена плашка «✅ Included: …», блок «Paid separately: champagne»
- Ваучер A6 (jsPDF + QR з `booking_code`) — з екрану успіху та з «My bookings»

### US#3 Прія — гід гостя + FAQ
- `/en/services/smudge-ceremony` — карусель «5 кроків: від входу до виходу» (🚪→📿→🔐→🚿→🧖♀️) з bottom-sheet деталями
- FAQ-акордеон з аналітикою: розгортання → `view_count +1` (`/api/faq/[id]/view`)
- Бейдж 🎓 «First time here?» для юзерів з 0 бронювань; «Welcome back!» для постійних

### US#4 Софія — адмінка
- `/en/admin` (тільки admin-сесія) — дашборд: «Гарячі слоти» (fill_rate < 30% з історії occupancy за weekday+hour, червоний маркер), виручка за день, активні flash-акції з таймером
- Flash-знижка: повзунок 5–50% + тривалість → промо, ціна змінюється (зберігаючи `original_price`), **гео-push** у радіусі 10 км (haversine замість PostGIS) з **SMS-фолбеком** для offline-токенів; статистика доставки
- Клієнт бачить знижку: ~~$120.00~~ 🔥 $96.00

## Demo-mode інтеграції (зрозумілі для підміни)

| Інтеграція | Demo | Продакшн-заміна |
|---|---|---|
| Stripe | `lib/demo/payment.ts` — симуляція sheet, declined-картка | Stripe PaymentIntents + Webhook |
| Google/Apple Calendar | `lib/demo/calendar.ts` — генерація `.ics` | Google Calendar API (OAuth 2.0) |
| FCM push / Twilio SMS | `lib/demo/notify.ts` — симуляція доставки + фолбек | Firebase Cloud Messaging + Twilio |
| PostGIS гео-запит | haversine в JS | `ST_DWithin` |
| Ваучери | генерація на клієнті | S3/Cloudinary + `bookings.voucher_url` |
| Аутентифікація | cookie-сесія, demo-логіни | реальний auth |

## Структура

```
app/(site)/[locale]/   — сторінки (home, services, packages, book, bookings, profile, admin)
app/api/               — route handlers (availability, calculate-price, book, faq, guest-guide,
                         user-status, admin/*, notify/geofence, generate-voucher, package-details)
components/            — клієнтські компоненти (catalog, booking, guide, faq, admin-dashboard…)
lib/                   — taxes, format, i18n, auth, prisma, demo/* (payment, calendar, notify, voucher)
prisma/schema.prisma   — 13 моделей; prisma/seed.ts — демо-дані
```

Посилання: [plan](./plan) — вихідний Scrum-беклог (4 user stories, 12 задач, Gherkin-критерії).
