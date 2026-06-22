#!/usr/bin/env node
/* Audit dodržování design systému Simon Says (bez závislostí).
 * Spuštění: node enforcement/check-design-system.mjs [adresar=src]
 *
 * Filozofie "rozpoznatelné jádro + volnost":
 *   CHYBY (blokující, chrání rozpoznatelnost):
 *     - raw hex barvy, rgb()/rgba() v komponentách, externí fonty
 *   PŘIPOMÍNKY (neblokující, designová volnost):
 *     - arbitrary Tailwind hodnoty (mezery/rozměry)
 *
 * Výjimky: soubory v /tokens/ a /themes/; řádek s "ds-allow-hex".
 * Návratový kód 1 jen při CHYBÁCH (připomínky build nezhodí). */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, sep } from "node:path";

const ROOT = process.argv[2] || "src";
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".css"]);
const SKIP_DIR = new Set(["node_modules", "dist", ".git", "enforcement"]);
const inTokens = (p) => p.includes(`${sep}tokens${sep}`) || p.includes(`${sep}themes${sep}`);

const RULES = [
  {
    id: "raw-hex",
    severity: "error",
    re: /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b/g,
    msg: "raw HEX barva — použij token (bg-primary, text-muted-foreground…)",
    skipPath: inTokens,
  },
  {
    id: "rgb",
    severity: "error",
    re: /\brgba?\(/g,
    msg: "rgb()/rgba() v kódu — barvy řeš tokeny",
    skipPath: inTokens,
  },
  {
    id: "external-font",
    severity: "error",
    re: /fonts\.(?:googleapis|gstatic)\.com/g,
    msg: "externí font CDN — self-host OFL (@fontsource) nebo systémový sans",
    skipPath: () => false,
  },
  {
    id: "arbitrary-value",
    severity: "note",
    re: /[\w-]+-\[[^\]]+\]/g,
    msg: "arbitrary hodnota — OK kde to design potřebuje; jinak preferuj škálu",
    skipPath: () => false,
  },
];

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIR.has(name)) out.push(...walk(full));
    } else if (EXT.has(extname(name))) {
      out.push(full);
    }
  }
  return out;
}

let errors = 0;
let notes = 0;
let files;
try {
  files = walk(ROOT);
} catch {
  console.error(`Adresář "${ROOT}" nenalezen.`);
  process.exit(1);
}

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  const hits = [];
  lines.forEach((line, i) => {
    if (line.includes("ds-allow-hex")) return;
    for (const rule of RULES) {
      if (rule.skipPath(file)) continue;
      rule.re.lastIndex = 0;
      if (rule.re.test(line)) {
        hits.push({ line: i + 1, rule });
        if (rule.severity === "error") errors++;
        else notes++;
      }
    }
  });
  if (hits.length) {
    console.log(`\n${file}`);
    for (const h of hits) {
      const tag = h.rule.severity === "error" ? "✗ CHYBA" : "· pozn.";
      console.log(`  ${h.line}: [${tag} ${h.rule.id}] ${h.rule.msg}`);
    }
  }
}

console.log("");
if (errors) {
  console.log(`✗ ${errors} chyb (blokujících) · ${notes} připomínek · ${files.length} souborů.`);
  process.exit(1);
} else {
  console.log(`✓ 0 chyb · ${notes} připomínek · ${files.length} souborů zkontrolováno.`);
}
