# 06 — Do & Don't

Konkrétní anti-patterny. Levý sloupec audit/lint odmítne nebo označí.

| ❌ Nedělej | ✅ Dělej | Proč |
|---|---|---|
| `className="text-[13px]"` | `text-sm` | arbitrary hodnoty rozbíjejí konzistenci a `no-arbitrary-value` je `error` |
| `style={{ color: "#A11054" }}` | `text-secondary` | barvy jen přes tokeny (drží i dark mode) |
| `bg-[#332d43]` | `bg-primary` | totéž |
| `text-gray-500` pro sekundární text | `text-muted-foreground` | jednotná sémantika, ověřený kontrast |
| `text-accent` na bílém pozadí | `bg-accent` + `text-accent-foreground` | gold má nízký kontrast jako text |
| import Google/externího fontu | `font-sans` | systémový sans bez závislostí a licencí |
| `py-[88px]` mezi sekcemi | `py-24` / `py-16` / `py-12` | sekční rytmus webu |
| vlastní „Button" komponenta | shadcn `Button` (`npx shadcn add button`) | jednotné varianty a chování |
| jiný icon set (Heroicons, FA) | `lucide-react` | konzistence + agenti ho znají |
| `delay: index * 0.1` ručně | `staggerContainer()` + `fadeInUp` | jednotné presety, méně chyb |
| odebraný `focus-visible` ring | ponechat | přístupnost (WCAG 2.2 AA) |
| `<input>` bez `<Label htmlFor>` | shadcn `Form` / spárovat `id` | přístupnost formulářů |
| barvy zadané jen pro světlý režim | tokeny (fungují i v `.dark`) | dark mode je povinný |
| tlačítko „Odeslat" → toast „Hotovo" | „Publikovat" → „Publikováno" | konzistentní slovník akcí |
| fixní šířky `w-[240px]` na text | responzivní třídy / `max-w-*` | snese delší CZ i kratší EN text |

Povolené výjimky:
- Arbitrary **varianty** (ne hodnoty): `supports-[backdrop-filter]:…`, `[&>svg]:size-4` — používá je i shadcn, jsou v pořádku.
- Hex jen v `src/tokens/**` (zdroj pravdy) nebo na řádku s komentářem `ds-allow-hex` (pro výjimečné případy mimo barvy UI, např. export do PNG).

Když narazíš na potřebu, kterou systém nepokrývá: nedělej arbitrary hodnotu. Navrhni rozšíření tokenů a domluv se — tím systém zůstává rigidní.
