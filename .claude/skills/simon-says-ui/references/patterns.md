# 03 — Patterns (recepty)

Hotové vzory z webu. Použij je místo vymýšlení znovu. Všechny stojí na tokenech a škále.

## Hero sekce (gradient)

```tsx
<section className="bg-gradient-to-br from-primary via-primary to-secondary py-24">
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center">
    <h1 className="text-4xl lg:text-6xl font-bold leading-tight text-primary-foreground">
      Napravujeme, co jiní vzdali.
    </h1>
    <p className="mt-6 text-xl text-primary-foreground/90 max-w-3xl mx-auto">
      Prémiový tým externích manažerů, analytiků a konzultantů.
    </p>
    <Button variant="secondary" size="lg" className="mt-8">Domluvit konzultaci</Button>
  </div>
</section>
```

## Zvýrazněná feature/service karta

```tsx
<Card className="border-l-4 border-l-primary">
  <CardHeader>
    <div className="mb-2 inline-flex w-fit rounded-lg bg-primary/10 p-2">
      <ShieldCheck className="h-6 w-6 text-primary" aria-hidden="true" />
    </div>
    <CardTitle>Interim management</CardTitle>
    <CardDescription className="text-sm leading-relaxed">
      Převezmeme řízení tam, kde to hoří.
    </CardDescription>
  </CardHeader>
</Card>
```

Nebo rovnou `FeatureCard` (viz `docs/02`). Grid: `grid gap-6 md:grid-cols-2 lg:grid-cols-3`.

## Callout (důvěrnost / NDA)

```tsx
<div className="rounded-lg bg-accent/10 p-6">
  <p className="font-bold text-accent-foreground">Důvěrnost</p>
  <p className="mt-1 text-accent-foreground/80">
    Vše řešíme pod NDA. Vaše data zůstávají u vás.
  </p>
</div>
```

Nebo `Callout` komponenta.

## Sekční hlavička

```tsx
<div className="text-center mb-16">
  <h2 className="text-3xl lg:text-4xl font-bold">Co děláme</h2>
  <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
    Tři oblasti, ve kterých přinášíme měřitelný výsledek.
  </p>
</div>
```

## Navigace + aktivní stav + sticky header

```tsx
<header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <nav className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center gap-6">
    <NavLink
      to="/sluzby"
      className={({ isActive }) =>
        cn(
          "text-sm font-medium transition-colors",
          isActive
            ? "text-primary border-b-2 border-primary"
            : "text-muted-foreground hover:text-primary",
        )
      }
    >
      Služby
    </NavLink>
  </nav>
</header>
```

Poznámka: `supports-[backdrop-filter]:…` je arbitrary **varianta** (feature query), kterou shadcn/web běžně používá — to je v pořádku. Zakázané jsou arbitrary **hodnoty** (`bg-[#fff]`, `text-[13px]`).

## Dlouhý obsah (blog)

```tsx
<article className="container mx-auto px-4 sm:px-6 lg:px-8 py-16">
  <div className="max-w-4xl mx-auto prose prose-lg prose-slate max-w-none">
    {/* render obsahu */}
  </div>
</article>
```

Hlavička článku = hero gradient + meta řádek (`Calendar`/`Clock`/`User` ikony) v `text-sm text-primary-foreground/80`.

## Filtry jako „chips"

```tsx
<Button variant={active === tag ? "default" : "outline"} size="sm" onClick={() => setActive(tag)}>
  {tag}
</Button>
```
