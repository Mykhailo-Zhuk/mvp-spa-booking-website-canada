# bench/ — вимірювальний гарнес

Інструмент для циклу `autofix/autoresearch_v1`. **Не є частиною застосунку** — виключений з
`tsconfig.json` та `eslint.config.mjs`.

## Метрика

**METRIC = сума медіанних латентностей (мс) за фіксованим набором із 9 запитів. Менше — краще.**

Ранжування — HTTP проти production-збірки (`bench/http-bench.mjs`). `bench/inproc.mts` дає
допоміжний швидкий сигнал по чистих `lib/*` без збірки, але **не** визначає рішення.

## Заморожування даних

`bench/fixtures/dev.db.pristine` — еталонний знімок даних, зроблений один раз на setup.
`http-bench.mjs` **відновлює `dev.db` з нього перед кожним прогоном**, бо частина ендпоінтів пише:

- `GET /api/admin/hot-slots` → `promotion.updateMany` (прострочує промо)

Без відкату кожна ітерація міряла б інший стан бази. Саме тому набір кейсів містить лише
ендпоінти читання (усі — крім виключених `/api/faq/[id]/view`, `/api/book`, `/api/notify/geofence`).

Фікстура — артефакт сесії (`*.db` у `.gitignore`), не комітиться. Відтворити:

```bash
node bench/db.mjs snapshot      # уВАГА: перезапише еталон; потрібен --force
```

## Використання

```bash
node bench/db.mjs snapshot                  # зробити еталон даних (один раз)
node bench/http-bench.mjs --record-golden   # baseline: записати golden + метрику
node bench/http-bench.mjs                   # вимірювання (restore → build → start → 230×9)
node bench/http-bench.mjs --no-build        # без перезбірки — швидші повтори baseline
npx tsx bench/inproc.mts                    # допоміжний мікробенч lib/*
```

## Контракт виводу

```
RESULT	<metric>	<median1>,<median2>,...
GOLDEN	<PASS|FAIL>[	<reason>]
```

`RESULT` відсутній → експеримент впав, дивитись `run.log`.

## Гейт коректності

`bench/golden/*.json` — еталонні відповіді baseline.

- JSON-ендпоінти — точна рівність розібраного JSON.
- HTML-сторінки — рівність хешу після нормалізації `/_next/static/<hash>` і `buildId`
  (щоб хеш відслідковував *контент*, а не фінгерпринт збірки).

**`keep` можливий лише за `GOLDEN PASS`** — це захист від «оптимізацій», що пришвидшують ціною
іншої відповіді.

## Параметри кейсів

`bench/cases.json`. `fixedDate = 2026-08-21` — останній день засіяних даних (168 слотів,
57 заброньованих). **Ніколи не використовувати «today»**: сід писав абсолютні дати від
2026-08-14, тож «сьогодні» вже порожнє.

Admin-авторизація — cookie `spa_demo_session = base64url({email, isAdmin:true})`. Демо-сесія не
підписана, секрету немає.
