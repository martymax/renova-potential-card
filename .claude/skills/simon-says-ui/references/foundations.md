# 01 — Foundations

Pozn.: hodnoty níž jsou **doporučený základ**, ne svěrací kazajka. Závazná je paleta a její použití (viz `00-design-direction.md`); škálu typografie a mezer laď podle obsahu aplikace.

## Barvy

Brand barvy (HSL CSS proměnné v `tokens.css`):

| Role | Proměnná | HSL | HEX (ref.) | Foreground | Použití |
|---|---|---|---|---|---|
| Primární (aubergine) | `--primary` | `260 20% 22%` | `#332d43` | `--primary-foreground` `0 0% 98%` | header/footer, primární tlačítka, ikony, gradient |
| Sekundární (magenta) | `--secondary` | `333 69% 34%` | `#A11054` | `--secondary-foreground` `0 0% 98%` | gradient, badge „secondary", důrazy |
| Akcent (gold) | `--accent` | `43 65% 57%` | `#D5AB4E` | `--accent-foreground` `260 20% 22%` | jeden zlatý moment: CTA, callout (`/10`), highlight |

Neutrály a povrchy (shadcn styl): `background/foreground`, `muted` + `muted-foreground` (sekundární texty, jemné sekce — `bg-muted/30`), `card/popover`, `border/input/ring`. Sémantika: `destructive` (+ foreground). Pro success/warning systém zatím token nemá — pokud je potřeba, řeš jako rozšíření tokenů (ne ad-hoc hex), ať drží i dark mode.

Pravidla: v komponentách jen tokenové třídy; gold je výplň s tmavým `text-accent-foreground`, nikdy text na světlém; sekundární text vždy `text-muted-foreground`.

## Typografie

- Tělo a UI: systémový sans (`font-sans`).
- **Display font pro nadpisy (volitelný):** utilita `font-display` čte `--font-display`. Default = systémový sans, takže bez nastavení se nic nemění. Zapnutí:
  1. Self-host OFL font (doporučeno `@fontsource/fraunces` nebo `@fontsource/schibsted-grotesk` — žádné externí CDN, EU-bezpečné).
  2. V projektovém CSS přepiš proměnnou:
     ```css
     :root { --font-display: "Fraunces", Georgia, serif; }
     ```
  3. Nadpisy stav `font-display` (např. `className="font-display text-4xl lg:text-6xl font-bold"`).
- Globální `line-height: 1.4`; nadpisy `h1–h3` jsou `font-bold`.

Doporučená škála (laditelná):

| Prvek | Třídy |
|---|---|
| H1 (hero) | `text-4xl lg:text-6xl font-bold leading-tight` (+ volitelně `font-display`) |
| H1 (vnitřní) | `text-4xl lg:text-5xl font-bold` |
| H2 (sekce) | `text-3xl lg:text-4xl font-bold` |
| Perex v hero | `text-xl text-*/90` (na gradientu `text-primary-foreground/90`) |
| Sekundární text | `text-sm text-muted-foreground` |
| Dlouhý obsah (blog) | `prose prose-lg prose-slate max-w-none` v `max-w-4xl` |

## Layout & grid

- Wrapper: `min-h-screen`. Obsah v kontejneru: `container mx-auto px-4 sm:px-6 lg:px-8` (centrovaný, max `1400px` pro `2xl`, padding `2rem`).
- Vertikální rytmus (doporučený): velké sekce `py-24`, střední `py-16`, malé `py-12`. Landing = víc vzduchu; interní nástroj snese hustší.
- Sekční hlavička: `text-center mb-16`, nadpis + perex v `max-w-3xl mx-auto`.
- Grid: `gap-6`–`gap-8`, 2–4 sloupce dle breakpointu.

## Rádius, border, shadow

- Rádius token `--radius: 0.5rem` → `rounded-lg/md/sm`.
- Karta = `border` + `shadow-sm`; hover elevace jemná a volitelná `transition-shadow hover:shadow-lg`.
- Zvýraznění karty: `border-l-4 border-l-primary`.

## Dark mode

- Class-based (`darkMode: ["class"]`), tokeny pro `.dark` v `tokens.css`. Přepínej třídou na rootu (`next-themes`). Nikdy nehardcoduj barvy mimo tokeny.
