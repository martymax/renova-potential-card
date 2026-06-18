---
name: simon-says-ui
description: Use when designing or building ANY web UI for Simon Says applications (interní nástroje, CRM rozšíření, katalogy nad ERP, admin dashboardy, klientské portály) with React, Tailwind, or shadcn/ui — or whenever the user asks to make something "look like Simon Says" or apply Simon Says branding/design. Applies the Simon Says design system: a recognizable brand core (aubergine #332d43 / magenta #A11054 / gold #D5AB4E palette, aubergine→magenta gradient, gold as a rare accent, left-accent marker, spacious layout) plus UX/UI best practices for layout, components, motion, accessibility (WCAG 2.2 AA) and UX writing. Trigger when styling, laying out, or composing UI/components/pages, choosing colors/typography/spacing, or reviewing a design for a Simon Says product.
---

# Simon Says — UI / UX

Cíl: aplikace má být **na první pohled rozpoznatelná jako Simon Says** a zároveň **navržená pro svůj účel** — ne klon webu, ne jedna šablona na všechno.

## Postup (progressive disclosure)

1. **Vždy nejdřív** přečti `references/design-direction.md` — co je zamčené jádro a kde máš volnost. Tohle je nejdůležitější soubor.
2. Barvy / typografie / layout: `references/foundations.md`.
3. Hotové vzory (hero, karty, callout, nav, blog, filtry): `references/patterns.md` — ber recepty, neimprovizuj.
4. Přístupnost (povinná podlaha): `references/accessibility.md`.
5. Před dokončením projeď `references/do-and-dont.md`.

Čti reference podle potřeby (ne všechny naráz) — šetří kontext.

## Zamčené jádro (rozpoznatelnost — neimprovizovat)

- **Paleta** přes tokeny: aubergine `#332d43` (`primary`), magenta `#A11054` (`secondary`), gold `#D5AB4E` (`accent`). Žádné raw hex/rgb v komponentách.
- **Aubergine→magenta gradient** na hrdinské plochy: `bg-gradient-to-br from-primary via-primary to-secondary`.
- **Gold = vzácný akcent**, max jeden zlatý moment na obrazovku; `bg-accent`/`bg-accent/10` s `text-accent-foreground`. Nikdy gold jako text na světlém pozadí.
- **Levý marker** zdůraznění: `border-l-4 border-l-primary`.
- **Prostorová kompozice**: velkorysý rytmus, centrované intro sekcí, vzduch.
- Ikony jen `lucide-react`. A11y dle WCAG 2.2 AA. UX copy aktivně (tlačítko = akce, stejné sloveso v celém flow).

## Volnost (per app — rozhoduj podle obsahu)

Hero (viz archetypy ve směru), typografická škála, layout/hustota, výběr vzorů, mezery/rozměry. **Utrať odvahu na jednom místě** — nedávej gradient + geometrii + zlato + animace do jedné obrazovky. Mezery: preferuj škálu, ale kde to design potřebuje, smíš sáhnout po konkrétní hodnotě. **Barvy zůstávají tvrdá hranice.**

## Typografie

Tělo/UI systémový `font-sans`. Volitelný display font pro nadpisy přes utilitu `font-display` (čte `--font-display`, default systémový sans). Doporučené OFL: Fraunces (serif, gravitas) nebo Schibsted/Hanken Grotesk. Self-host (`@fontsource/*`), žádné CDN.

## Stack a nástroje

React 18 + TypeScript, Tailwind v3 (preset `@simon-says/design-system/preset`), shadcn/ui (Radix), lucide-react, framer-motion, react-hook-form + zod, recharts, sonner, next-themes. Komponenty přidávej `npx shadcn add <name>` (config `components.json`). Motion presety: `@simon-says/design-system/motion`.

Pokud projekt má `@simon-says/design-system` nainstalovaný, ber tokeny/preset/utility odtud. Jinak se řiď referencemi v tomto skillu.

## Self-check

Pokud je v projektu k dispozici, spusť `node enforcement/check-design-system.mjs src` — CHYBY (barvy/fonty) je nutné opravit, PŘIPOMÍNKY (arbitrary hodnoty) jsou jen doporučení.
