// Jednoduché souborové úložiště (zdroj pravdy aplikace).
// Záměrně bez nativních závislostí — architektura je za repository rozhraním,
// takže přechod na SQLite/Postgres je výměna této vrstvy.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DbShape } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// src/lib → ../../data = server/data; testy/produkce mohou přepsat přes KP_DATA_DIR
const DATA_DIR = process.env.KP_DATA_DIR ?? join(__dirname, "..", "..", "data");
const DB_PATH = join(DATA_DIR, "db.json");
export const UPLOAD_DIR = join(DATA_DIR, "uploads");

let db: DbShape | null = null;

export function getDb(): DbShape {
  if (!db) throw new Error("Store není inicializován — zavolej initStore() při startu.");
  return db;
}

export function initStore(seed: () => DbShape): DbShape {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

  if (existsSync(DB_PATH)) {
    try {
      db = JSON.parse(readFileSync(DB_PATH, "utf8")) as DbShape;
    } catch (error) {
      // Nepřepisuj poškozenou DB tiše — zazálohuj a spadni, ať nedojde ke ztrátě dat.
      const backup = `${DB_PATH}.corrupt.${Date.now()}`;
      copyFileSync(DB_PATH, backup);
      throw new Error(`Poškozený obsah ${DB_PATH}, záloha uložena do ${backup}.`, { cause: error });
    }
  } else {
    db = seed();
    persist();
  }
  return db;
}

/** Atomický zápis (přes temp + rename), aby se DB neporušila při pádu. */
export function persist(): void {
  if (!db) return;
  const tmp = `${DB_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  renameSync(tmp, DB_PATH);
}

/** Provede mutaci a uloží. */
export function mutate<T>(fn: (db: DbShape) => T): T {
  const result = fn(getDb());
  persist();
  return result;
}

export function genId(prefix = ""): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}${Date.now().toString(36)}${rnd}`;
}
