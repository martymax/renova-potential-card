/* Tokeny pro JS kontexty (Recharts, canvas, e-maily…).
   V DOM/SVG preferuj CSS proměnné přes hsl(var(--…)) — drží světlý i tmavý režim.
   Hex hodnoty používej jen tam, kde CSS proměnné nejdou (např. export do PNG). */

export const cssVar = (name: string): string => `hsl(var(--${name}))`;

/** Sémantické barvy přes CSS proměnné (preferovaný způsob). */
export const color = {
  background: cssVar("background"),
  foreground: cssVar("foreground"),
  primary: cssVar("primary"),
  secondary: cssVar("secondary"),
  accent: cssVar("accent"),
  muted: cssVar("muted"),
  mutedForeground: cssVar("muted-foreground"),
  destructive: cssVar("destructive"),
  border: cssVar("border"),
} as const;

/** Referenční HEX (NEpoužívat v komponentách — jen pro nástroje bez CSS proměnných). */
export const brandHex = {
  primary: "#332d43", // ds-allow-hex — referenční zdroj pravdy, ne pro komponenty
  secondary: "#A11054", // ds-allow-hex
  accent: "#D5AB4E", // ds-allow-hex
} as const;

/** Pořadí barev pro grafy (Recharts). */
export const chartPalette: string[] = [
  cssVar("primary"),
  cssVar("secondary"),
  cssVar("accent"),
  cssVar("muted-foreground"),
  cssVar("destructive"),
];
