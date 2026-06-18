import type { Config } from "tailwindcss";
import { simonSaysPreset } from "./src/ds/preset";

/* Tenký projektový config — veškerý theme přichází z presetu Simon Says.
   NEpřidávej sem barvy/fonty; barvy jsou tvrdá hranice (jen tokeny). */
export default {
  presets: [simonSaysPreset],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
} satisfies Config;
