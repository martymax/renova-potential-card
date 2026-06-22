# 05 — Accessibility (WCAG 2.2 AA)

Cílová laťka je WCAG 2.2 AA. shadcn/Radix dávají dobrý základ (klávesnice, ARIA, focus) — nekaz ho.

## Kontrast

Orientačně (vždy ověř checkerem u konkrétní kombinace):

| Kombinace | Poměr | Verdikt |
|---|---|---|
| `primary` #332d43 na bílé / bílá na `primary` | ~12:1 | ✓ |
| `secondary` #A11054 na bílé / bílá na `secondary` | ~6.4:1 | ✓ (normální text) |
| `accent-foreground` #332d43 na `accent` #D5AB4E | ~6:1 | ✓ |
| `accent` #D5AB4E (gold) jako TEXT na bílé | ~1.7:1 | ✗ nepoužívat |
| `muted-foreground` na bílé | ~4.7:1 | ✓ minimum pro sekundární text |

Pravidla:
- Akcent gold nikdy jako barva textu na světlém pozadí — jen výplň s tmavým `text-accent-foreground`.
- `muted-foreground` je nejsvětlejší přípustný text; nejdi níž (žádné `text-gray-400` apod.).
- Normální text ≥ 4.5:1, velký text (≥ 24px nebo ≥ 18.66px bold) ≥ 3:1, UI prvky/ohraničení ≥ 3:1.

## Klávesnice a focus

- Neodstraňuj `focus-visible:ring-*` (shadcn je má). Focus musí být vždy viditelný.
- Focus nesmí být překrytý sticky headerem ani jiným prvkem (WCAG 2.2: Focus Not Obscured). U sticky hlavičky hlídej `scroll-margin`/`scroll-padding`.
- Vše ovladatelné myší musí jít i klávesnicí; pořadí Tab odpovídá vizuálnímu pořadí.

## Cíle a gesta (WCAG 2.2)

- Interaktivní cíle min. ~24×24 px (Target Size Minimum). Tlačítka/ikonové akce dělej dostatečně velké (`size` varianty, dostatečný padding).
- Pokud něco jde gestem/tažením, nabídni i jednoduchou alternativu (klik/tlačítka).
- Přihlášení nesmí stát jen na kognitivním testu (Accessible Authentication) — povol vložení z password manageru, nedělej captcha jako jediný krok.

## Formuláře

- Páruj `<Label htmlFor>` s `id` inputu (shadcn `Form` to řeší přes `FormField`/`FormLabel`).
- Chybu hlas u pole, věcně a s návodem: „Zadej platný e-mail.", ne „Neplatný vstup". Errors se neomlouvají a nejsou vágní.
- Povinná pole a formát komunikuj předem, ne až po odeslání.

## i18n (CS / EN)

- Nastav `lang` na `<html>` (`cs` / `en`) a přepínej při změně jazyka.
- Nepředpokládej délku textu — UI musí snést delší české i kratší anglické řetězce (nezalamuj natvrdo, nef ixuj šířky arbitrary hodnotami).
- Formáty (datum, čísla, měna CZK) řeš přes `Intl`, ne ručně.

## Pohyb

- Respektuj `prefers-reduced-motion` (framer to ctí; dekorativní CSS animace se vypínají v `tokens.css`).

## Copy jako součást přístupnosti

- Aktivní sloveso = co se stane: „Uložit změny", ne „Odeslat". Stejné sloveso v celém flow.
- Pojmenovávej podle toho, co uživatel ovládá (ne podle implementace: „Oznámení", ne „Webhook konfigurace").
- Prázdný stav = výzva k akci, ne jen „Nic tu není".
- Sentence case, plain verbs, bez balastu.
