# Karta potenciálu — RENOVA, s.r.o.

Segmentově řízené **karty obchodního potenciálu nad CRM Raynet**. Aplikace dává
obchodníkům jedno přehledné místo pro kvalifikaci zákazníka, vedení rychlý
reporting o vyplněnosti a kvalitě dat a kontrolu terénní práce přes ověření
osobních návštěv GPS.

Postaveno podle zadávací dokumentace *„Karta potenciálu pro RENOVA v1.3"* a
nadesignováno design systémem **Simon Says** (`simon-says-ui`).

> Raynet, GPS systém Logbookie a skórovací aplikace Simon Says jsou externí
> systémy — v této implementaci jsou **mockované** za stabilním rozhraním, aby
> šel demonstrovat celý cílový proces. Architektura odpovídá zadání: frontend
> volá výhradně vlastní backend, který drží Raynet přístupové údaje.

## Rychlý start

```bash
npm run install:all     # nainstaluje root, server i web
npm run dev             # spustí backend (:4000) i frontend (:5173) najednou
```

Otevři **http://localhost:5173**. Backend běží na **http://localhost:4000**,
Vite ho proxuje přes `/api`.

### Demo přístupy

Mimo produkci (a v produkci jen s `KP_DEMO_MODE=true`) je heslo shodné s uživatelským jménem.

| Účet | Role | Co vidí |
|---|---|---|
| `obchodnik` | Obchodník | vlastní karty, vyhledávání, vyplňování, GPS ověření |
| `novak` | Obchodník | druhý obchodník (pro reporting napříč týmem) |
| `reditel` | Obchodní ředitel | reporting, kvalita dat, tendry, terénní aktivita, CSV |
| `admin` | Admin | číselníky, mapování na Raynet, GPS a systémová pravidla |

**Hesla a produkce:** hesla se ukládají jen jako scrypt hash, nikdy plaintext.
V produkci (`NODE_ENV=production`) **nevzniká** výchozí účet `admin/admin`:

- `KP_PASSWORD_ADMIN`, `KP_PASSWORD_REDITEL`, … nastaví konkrétní heslo daného účtu;
- `KP_DEMO_MODE=true` povolí demo hesla (= jméno) i v produkci (jen pro ukázku);
- jinak se každému účtu vygeneruje náhodné heslo a jednou vypíše do logu při startu.

## Architektura

```
┌─────────────┐      /api        ┌──────────────────────┐     mock
│   web (SPA) │ ───────────────► │   server (backend)   │ ──────────► Raynet
│  React+Vite │  jen vlastní API │  Express + úložiště   │ ──────────► Logbookie GPS
└─────────────┘                  └──────────────────────┘
```

- **Frontend nevolá Raynet přímo** (§11.2). Mluví jen s vlastním backendem.
- **Backend drží Raynet přístupové údaje** a transformuje data do interního formátu.
- **Lokální uložení má prioritu** (§7.7): když Raynet vypadne, karta se uloží
  a synchronizace se vyřeší později. Výpadek jde nasimulovat v Administraci → Raynet.

### Stack

| Vrstva | Technologie |
|---|---|
| Frontend | React 18 · TypeScript · Vite · Tailwind v3 (Simon Says preset) · shadcn/ui (Radix) · lucide-react · framer-motion · recharts · sonner · next-themes |
| Backend | Node 22 · Express · TypeScript (tsx) · souborové úložiště za repository rozhraním |
| Design | **Simon Says** design systém — viz `.claude/skills/simon-says-ui/` |

## Nasazení (Railway / Docker)

Aplikace se nasazuje jako **jedna služba** — backend obsluhuje i sestavený
frontend. V repozitáři je `Dockerfile`, který:

1. nainstaluje závislosti `web` i `server` **včetně** devDependencies (kvůli
   `tsc`/`vite`, které hostingové platformy v produkčním npm módu vynechávají),
2. sestaví frontend (`web/dist`) a zkompiluje backend (`server/dist`),
3. spustí čisté Node: `node server/dist/index.js`.

Server čte port z `PORT` (Railway ho předá automaticky) a v produkci servíruje
`web/dist` + SPA fallback; `/api` a `/uploads` zůstávají na backendu.

```bash
# lokální produkční ověření bez Dockeru
npm run install:all && npm run build && npm start
```

> Na Railway stačí mít v repu `Dockerfile` — platforma ho použije místo
> automatické detekce a build proběhne deterministicky.

## Co aplikace umí (mapováno na zadání)

- **Přihlášení a role** — obchodník / obchodní ředitel / admin (§4)
- **Vyhledání firmy z Raynetu** podle názvu nebo IČO; nové firmy nezakládá (§7.1)
- **Tři segmentové formuláře** — vodárny/obce/teplárny, správce, SVJ (§8)
- **Draft vs. kompletní karta** s tvrdou validací povinných polí (§7.4, §7.6)
- **SVJ podmíněné pravidlo** — značka stávajících měřidel *nebo* fotografie (§8.3)
- **Quality flags** — měkká kontrola podezřelých odpovědí („x", „nevím", krátký text) (§7.4)
- **Způsob získání údajů** — osobní návštěva / telefonát / e-mail / interní / jiný (§7.5)
- **GPS ověření návštěvy** — Logbookie (vozidlo) s fallbackem na polohu prohlížeče;
  stavy *ověřeno v místě / v toleranci / mimo místo / neověřeno / GPS nedostupná /
  doplněno vzdáleně*; ukládá se jen výsledek, ne trasa (§7.5, §12)
- **Audit změn** — kdo, kdy, původní a nová hodnota (§7.6)
- **Synchronizace do Raynetu** (write-back) vybraných a skórovaných polí (§7.7, §11.4)
- **Reporting** — vyplněnost podle segmentu a obchodníka, blížící se tendry (3/6/12 měs.),
  terénní aktivita a GPS, kvalita dat, obchodní potenciál (§10)
- **CSV export** s BOM pro Excel (§13)
- **Administrace** — číselníky, mapování polí na Raynet, toleranční okruh, zdroj GPS,
  zastarávání karet (180 dní), velikost příloh, pravidla kvality (§9.3)

## Struktura projektu

```
.
├── server/                 # Express backend
│   └── src/
│       ├── index.ts        # app + routy
│       ├── routes/         # auth, raynet, cards, admin, reports, uploads
│       ├── lib/            # store, segments, validation, gps, raynet, cards, seed, demo, auth
│       └── types.ts
├── web/                    # React frontend
│   └── src/
│       ├── ds/             # vendored Simon Says (preset, motion, tokens)
│       ├── components/ui/  # shadcn primitivy + brandové (FeatureCard, Callout)
│       ├── components/app/ # AppShell, CardRow, SegmentField, StatusBadges, …
│       ├── pages/          # Login, Dashboard, Search, Company, Card, Reports, Admin
│       └── lib/            # api, auth, types, labels, segmentLogic
├── tools/check-design-system.mjs   # audit dodržování design systému
└── .claude/skills/simon-says-ui/   # design systém (skill pro Claude Code)
```

## Kontrola kvality

```bash
npm run check:ds                  # audit Simon Says (barvy = tvrdá hranice)
npm --prefix server run typecheck # typecheck backendu
npm --prefix server test          # integrační + jednotkové testy backendu
npm --prefix web run build        # typecheck + produkční build frontendu
```

Testy backendu běží na vestavěném runneru (`node --test` přes tsx, bez dalších
závislostí) a pokrývají přihlášení, tvrdou validaci a podmíněné SVJ pravidlo,
quality flags, GPS ověření, kontrolu vlastnictví karty (IDOR), role, omezení
nahrávání souborů, write-back a ochranu CSV exportu.

CI (GitHub Actions, `.github/workflows/ci.yml`) na každém PR staví a typecheckuje
backend i frontend, pouští testy backendu a audit design systému.

## Co není součástí (dle §3.2)

Automatické zakládání Raynet polí, napojení na Helios, přímý Power BI konektor,
automatické e-mailové reporty, AI scoring textu, ARES fallback, přímé napojení na
skórovací aplikaci (čte z Raynetu), ukládání fotografií přímo do Raynetu,
kontinuální sledování pohybu a plnohodnotná kniha jízd.

---

Implementace: **Simon Says** · nad CRM **Raynet**
