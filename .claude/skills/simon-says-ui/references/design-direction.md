# 00 — Design Direction (rozpoznatelné jádro + volnost)

Filozofie: aplikace Simon Says **nejsou klon webu pixel po pixelu**. Mají být na první pohled **rozpoznatelné jako Simon Says** a zároveň **navržené pro svůj účel** — ne nalisované do jedné šablony. Tenhle dokument říká, co je závazné jádro a kde máš tvůrčí volnost. Čti ho jako první.

## Co je Simon Says

Prémiový tým externích manažerů, analytiků a konzultantů pro středně velké firmy. Tón: senior, rozhodný, věcný — „napravujeme, co jiní vzdali". Ne křiklavý, ne korporátně-neutrální. Design má vyzařovat kompetenci a klid, ne marketingový hluk.

## Rozpoznatelné jádro (ZÁVAZNÉ)

Tyhle prvky musí být přítomné, aby produkt četl jako Simon Says. Na nich se neimprovizuje:

1. **Paleta.** Aubergine `#332d43` jako kotva, magenta `#A11054`, gold `#D5AB4E` jako akcent. Tahle trojice nese rozpoznatelnost. Drž ji přes tokeny.
2. **Aubergine→magenta gradient.** Nejcharakterističtější device značky. Patří na „hrdinské" plochy (hero, klíčové bannery): `bg-gradient-to-br from-primary via-primary to-secondary`.
3. **Gold jako prémiový akcent.** Gold je vzácný — **jeden zlatý moment na obrazovku** (CTA, callout, highlight), nikdy jako text, vždy s tmavým `text-accent-foreground`. Gold = „kvalita/hodnota", proto šetřit.
4. **Levý akcentní marker.** `border-l-4 border-l-primary` u zdůrazněných bloků — strukturální podpis.
5. **Prostorová, sebevědomá kompozice.** Velkorysý vertikální rytmus, centrované intro sekcí, dost „vzduchu". Prémiovost = klid a prostor, ne hustota.

Sekundární rozpoznatelné rysy: rádius `0.5rem`, jemná geometrická atmosféra v pozadí.

## Tvůrčí volnost (PER APP)

Tady rozhoduješ podle účelu a obsahu — a máš to dělat:

- **Hero/úvod** — viz archetypy níž; nelep všude stejný „velký nadpis na gradientu".
- **Typografická škála** — doporučený základ je ve `foundations`, velikosti/hierarchii laď podle obsahu.
- **Display font** — volitelný (viz níž); default je systémový sans.
- **Layout a hustota** — interní nástroj snese hustší tabulky; landing page víc vzduchu.
- **Které vzory použít** — ber z `patterns`, kombinuj podle potřeby.
- **Mezery/rozměry** — drž škálu jako výchozí, ale kde to design potřebuje, smíš sáhnout po konkrétní hodnotě (lint to jen připomene, neblokuje). **Barvy zůstávají tvrdá hranice.**

## Princip: utrať odvahu na jednom místě

Nedávej do jedné obrazovky všechny podpisové prvky naráz (gradient + geometrie + zlato + animace). Vyber **jeden** signature moment (typicky hero gradient *nebo* geometrické pozadí) a zbytek nech tichý a disciplinovaný. Přemíra efektů působí AI-generovaně.

## Hero jako teze

Hero říká nejcharakterističtější věc, ne vanity metriku. Tři archetypy pro Simon Says:

- **Statement** — sebevědomý slib velkým písmem na aubergine→magenta gradientu, jediné zlaté CTA. (Vychází z webu; povýš typografii.)
- **Situace → odpověď** — pojmenuj klientovu bolest („Projekt, který nikdo nechce převzít?") a odpověz. Sedí k „napravujeme, co jiní vzdali".
- **Důkaz** — slib + jeden reálný výsledek (konkrétní transformace), ne nafouknuté číslo.

Vyhni se defaultu „velké číslo + malý popisek + gradientový akcent", pokud to číslo není fakt to nejcharakterističtější.

## Typografie s osobností (jeden reálný posun)

Systémový sans je bezpečný a rozpoznatelný, ale jako jediné písmo je „neutrální dopravník". Navržený posun: **charakterní display font pro nadpisy** + systémový sans pro tělo a UI. Tím se appky odliší od moře vš-grotesk SaaS, aniž ztratí rozpoznatelnost (tu nese paleta).

Doporučení (vše SIL OFL = self-host, EU-bezpečné na licence):
- **Fraunces** — display serif s osobností; gravitas, „seniorní řemeslo". Favorit pro prémiový konzultační tón.
- **Schibsted Grotesk** / **Hanken Grotesk** — moderní sebevědomý grotesk, když chceš zůstat u bezpatkového.

Jak je to zapojené: `font-display` utilita čte CSS proměnnou `--font-display` (default = systémový sans, takže dokud nic nenastavíš, nadpisy jedou systémově a nic se nerozbije). Zapnutí v `references`/`foundations`. Tělo nech systémové — vyhneš se generickému „Inter všude".

Riziko, které beru vědomě: display serif se může svézt k AI-cliché „cream + serif". Proto: gradient je aubergine, ne krém; gold + magenta drží daleko od té estetiky. Když serif nesedne, vezmi grotesk.

## Struktura nese význam

Eyebrow/štítky ať říkají něco pravdivého (kategorie služby, fáze). Číslování `01/02/03` použij jen tam, kde jde o **reálnou sekvenci** (např. fáze spolupráce) — ne jako dekoraci.

## Motion

Jeden orchestrovaný moment (vstup hero) > rozsypané efekty. Presety z `motion`, scroll-reveal jednou, geometrie jen jako ambient (`aria-hidden`). Reduced-motion vždy respektovat.

## Quality floor (bez výjimky)

Responzivní až na mobil, viditelný keyboard focus, respektovaný reduced-motion, kontrast dle WCAG 2.2 AA. To není volnost — to je podlaha.

## Postup (než stavíš)

1. Pojmenuj účel a publikum aplikace (jedna věta).
2. Zafixuj rozpoznatelné jádro (paleta, jeden signature moment).
3. Vyber hero archetyp a vzory podle obsahu.
4. Utrať odvahu na jednom místě, zbytek drž tiše.
5. Projeď quality floor + `do-and-dont`, spusť `npm run check:ds`.
