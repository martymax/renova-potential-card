// Úložiště aplikace (zdroj pravdy) za jednotným rozhraním.
// Dva backendy:
//   • Postgres (když je nastaveno DATABASE_URL) — celý stav jako JSONB snapshot,
//     přežije redeploy; zápisy se slučují a serializují.
//   • Soubor (jinak) — server/data/db.json; vhodné pro dev, testy a CI.
// Programový model zůstává synchronní (getDb/mutate); perzistence je řešena uvnitř.

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool } from "pg";
import type { DbShape } from "../types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
// src/lib → ../../data = server/data; testy/produkce mohou přepsat přes KP_DATA_DIR
const DATA_DIR = process.env.KP_DATA_DIR ?? join(__dirname, "..", "..", "data");
const DB_PATH = join(DATA_DIR, "db.json");
export const UPLOAD_DIR = join(DATA_DIR, "uploads");

const DATABASE_URL = process.env.DATABASE_URL;
const usePg = !!DATABASE_URL;

let db: DbShape | null = null;
let pool: Pool | null = null;

export function getDb(): DbShape {
  if (!db) throw new Error("Store není inicializován — zavolej initStore() při startu.");
  return db;
}

export function isPostgres(): boolean {
  return usePg;
}

export async function initStore(seed: () => DbShape): Promise<DbShape> {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(UPLOAD_DIR)) mkdirSync(UPLOAD_DIR, { recursive: true });

  if (usePg) {
    db = await initPg(seed);
  } else {
    db = initFile(seed);
  }
  return db;
}

// ---------- Soubor ----------

function initFile(seed: () => DbShape): DbShape {
  if (existsSync(DB_PATH)) {
    try {
      return JSON.parse(readFileSync(DB_PATH, "utf8")) as DbShape;
    } catch (error) {
      // Nepřepisuj poškozenou DB tiše — zazálohuj a spadni, ať nedojde ke ztrátě dat.
      const backup = `${DB_PATH}.corrupt.${Date.now()}`;
      copyFileSync(DB_PATH, backup);
      throw new Error(`Poškozený obsah ${DB_PATH}, záloha uložena do ${backup}.`, { cause: error });
    }
  }
  const seeded = seed();
  db = seeded;
  writeFileSync(`${DB_PATH}.tmp`, JSON.stringify(seeded, null, 2), "utf8");
  renameSync(`${DB_PATH}.tmp`, DB_PATH);
  return seeded;
}

// ---------- Postgres (JSONB snapshot) ----------

async function initPg(seed: () => DbShape): Promise<DbShape> {
  const ssl = /sslmode=require/.test(DATABASE_URL!) || process.env.PGSSL === "require"
    ? { rejectUnauthorized: false }
    : undefined;
  pool = new Pool({ connectionString: DATABASE_URL, ssl });

  await pool.query(
    `CREATE TABLE IF NOT EXISTS app_state (
       id INT PRIMARY KEY,
       data JSONB NOT NULL,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );

  const { rows } = await pool.query<{ data: DbShape }>("SELECT data FROM app_state WHERE id = 1");
  if (rows.length > 0) {
    console.log("[store] Stav načten z Postgresu.");
    return rows[0].data;
  }

  const seeded = seed();
  db = seeded; // aby flush viděl data
  await pool.query(
    "INSERT INTO app_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
    [JSON.stringify(seeded)],
  );
  console.log("[store] Stav inicializován do Postgresu.");
  return seeded;
}

// Sloučený (coalesced) async zápis snapshotu — neztratí poslední stav.
let dirty = false;
let flushing = false;
async function flushPg(): Promise<void> {
  if (!pool || !db) return;
  if (flushing) { dirty = true; return; }
  flushing = true;
  try {
    do {
      dirty = false;
      await pool.query(
        "INSERT INTO app_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()",
        [JSON.stringify(db)],
      );
    } while (dirty);
  } catch (e) {
    console.error("[store] Zápis do Postgresu selhal, zkusím znovu při další změně:", e);
    dirty = true;
  } finally {
    flushing = false;
  }
}

/** Uloží aktuální stav (soubor synchronně, Postgres sloučeným async zápisem). */
export function persist(): void {
  if (!db) return;
  if (usePg) {
    dirty = true;
    void flushPg();
    return;
  }
  const tmp = `${DB_PATH}.tmp`;
  writeFileSync(tmp, JSON.stringify(db, null, 2), "utf8");
  renameSync(tmp, DB_PATH);
}

/** Dokončí případný rozepsaný zápis a zavře spojení (graceful shutdown). */
export async function closeStore(): Promise<void> {
  if (usePg && pool) {
    if (dirty || flushing) await flushPg();
    await pool.end();
    pool = null;
  }
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
