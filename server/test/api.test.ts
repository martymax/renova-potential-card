// Integrační a jednotkové testy backendu. Běží na vestavěném test runneru
// (node --test) přes tsx, proti aplikaci v paměti s izolovaným úložištěm.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AddressInfo } from "node:net";

// Izolované úložiště + neprodukční režim (demo hesla) PŘED importem modulů.
process.env.KP_DATA_DIR = mkdtempSync(join(tmpdir(), "kp-test-"));
process.env.NODE_ENV = "test";

const { initStore } = await import("../src/lib/store.js");
const { seed } = await import("../src/lib/seed.js");
const { seedDemoCards } = await import("../src/lib/demo.js");
const { createApp } = await import("../src/app.js");
const { csvCell } = await import("../src/routes/reports.js");

initStore(seed);
seedDemoCards();

const server = createApp().listen(0);
const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

after(() => {
  server.close();
  rmSync(process.env.KP_DATA_DIR!, { recursive: true, force: true });
});

interface ReqOpts { token?: string; body?: unknown }
async function req(method: string, path: string, opts: ReqOpts = {}) {
  const headers: Record<string, string> = {};
  if (opts.token) headers.authorization = `Bearer ${opts.token}`;
  let payload: BodyInit | undefined;
  if (opts.body instanceof FormData) payload = opts.body;
  else if (opts.body !== undefined) {
    headers["content-type"] = "application/json";
    payload = JSON.stringify(opts.body);
  }
  const res = await fetch(base + path, { method, headers, body: payload });
  const text = await res.text();
  let data: any = {};
  try { data = text ? JSON.parse(text) : {}; } catch { data = text; }
  return { status: res.status, data };
}
const tokenFor = async (u: string) =>
  (await req("POST", "/api/auth/login", { body: { username: u, password: u } })).data.token as string;

// Otevře/založí SVJ kartu pro firmu 3001 (bez demo karty) a vrátí ji.
async function openSvjCard(token: string) {
  const r = await req("POST", "/api/cards", { token, body: { raynetCompanyId: 3001, segment: "svj" } });
  return r.data.card;
}

// ---------- Autentizace ----------

test("login: správné heslo vrátí token, špatné 401", async () => {
  const ok = await req("POST", "/api/auth/login", { body: { username: "admin", password: "admin" } });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.token);
  assert.equal(ok.data.user.role, "admin");

  const bad = await req("POST", "/api/auth/login", { body: { username: "admin", password: "spatne" } });
  assert.equal(bad.status, 401);
});

test("chráněný endpoint bez tokenu vrátí 401", async () => {
  const r = await req("GET", "/api/cards");
  assert.equal(r.status, 401);
});

// ---------- Tvrdá validace + podmíněné SVJ pravidlo ----------

test("kompletní kartu nelze uložit s chybějícími povinnými poli (422)", async () => {
  const token = await tokenFor("obchodnik");
  const card = await openSvjCard(token);
  const r = await req("PUT", `/api/cards/${card.id}`, { token, body: { mode: "complete", values: {} } });
  assert.equal(r.status, 422);
  assert.ok(r.data.missingRequired.length > 0);
});

test("draft jde uložit i neúplný; SVJ vyžaduje značku NEBO fotografii", async () => {
  const token = await tokenFor("obchodnik");
  const card = await openSvjCard(token);

  const base4 = {
    pocet_bytu: 12, pocet_meridel: 48, skladba_meridel: "vodoměry SV a TV",
    stavebni_delky: "110 mm", technologie_odectu: "NB-IoT", specifika_instalace: "starší rozvody",
  };
  // Bez značky i fotky → conditional pravidlo blokuje kompletní kartu
  const without = await req("PUT", `/api/cards/${card.id}`, { token, body: { mode: "complete", values: base4 } });
  assert.equal(without.status, 422);
  assert.ok(without.data.missingRequired.includes("znacka_meridel"));

  // Se značkou → kompletní projde
  const withMark = await req("PUT", `/api/cards/${card.id}`, {
    token, body: { mode: "complete", acquisition: "telefonat", values: { ...base4, znacka_meridel: "Maddeo" } },
  });
  assert.equal(withMark.status, 200);
  assert.equal(withMark.data.card.status, "complete");
  assert.equal(withMark.data.card.completeness, 100);
});

test("quality flag se nastaví u zástupné hodnoty x", async () => {
  const token = await tokenFor("obchodnik");
  const card = await openSvjCard(token);
  const r = await req("PUT", `/api/cards/${card.id}`, {
    token, body: { mode: "draft", values: { skladba_meridel: "x" } },
  });
  assert.equal(r.status, 200);
  assert.ok(r.data.card.qualityFlags.some((f: any) => f.field === "skladba_meridel"));
});

// ---------- GPS ověření ----------

test("osobní návštěva nastaví GPS status, e-mail je doplneno_vzdalene", async () => {
  const token = await tokenFor("obchodnik");
  const card = await openSvjCard(token);

  const visit = await req("PUT", `/api/cards/${card.id}`, {
    token, body: { mode: "draft", acquisition: "osobni_navsteva", values: {} },
  });
  assert.equal(visit.status, 200);
  assert.ok(["overeno_v_miste", "overeno_v_toleranci", "mimo_misto", "neovereno", "gps_nedostupna"].includes(visit.data.card.gps.status));

  const remote = await req("PUT", `/api/cards/${card.id}`, {
    token, body: { mode: "draft", acquisition: "email", values: {} },
  });
  assert.equal(remote.data.card.gps.status, "doplneno_vzdalene");
});

// ---------- Broken access control / IDOR ----------

test("obchodník nesmí číst/měnit/synchronizovat cizí kartu (404)", async () => {
  const owner = await tokenFor("obchodnik"); // Karel — má demo karty
  const other = await tokenFor("novak");

  const list = await req("GET", "/api/cards", { token: owner });
  const foreign = list.data.cards[0];
  assert.ok(foreign, "očekávám alespoň jednu kartu obchodníka");

  assert.equal((await req("GET", `/api/cards/${foreign.id}`, { token: other })).status, 404);
  assert.equal((await req("PUT", `/api/cards/${foreign.id}`, { token: other, body: { mode: "draft", values: { skladba_meridel: "HACK" } } })).status, 404);
  assert.equal((await req("POST", `/api/cards/${foreign.id}/sync`, { token: other })).status, 404);

  // Vlastník stále smí
  assert.equal((await req("GET", `/api/cards/${foreign.id}`, { token: owner })).status, 200);
});

test("otevření cizí karty přes POST /cards neodhalí data (403)", async () => {
  const owner = await tokenFor("obchodnik");
  // Karel vlastní demo kartu firmy 1001 (vodárny)
  const mine = await req("POST", "/api/cards", { token: owner, body: { raynetCompanyId: 1001, segment: "vodarny" } });
  assert.equal(mine.status, 200);

  const other = await tokenFor("novak");
  const foreign = await req("POST", "/api/cards", { token: other, body: { raynetCompanyId: 1001, segment: "vodarny" } });
  assert.equal(foreign.status, 403);
  assert.equal(foreign.data.card, undefined);
});

// ---------- Role-based access ----------

test("reporting jen pro ředitele/admina, mapování jen pro admina", async () => {
  const obchodnik = await tokenFor("obchodnik");
  const reditel = await tokenFor("reditel");

  assert.equal((await req("GET", "/api/reports/overview", { token: obchodnik })).status, 403);
  assert.equal((await req("GET", "/api/reports/overview", { token: reditel })).status, 200);
  assert.equal((await req("PUT", "/api/mappings", { token: obchodnik, body: { mappings: [] } })).status, 403);
});

// ---------- Upload hardening ----------

test("upload: HTML s image MIME se uloží jako obrázek, neobrázek je odmítnut", async () => {
  const token = await tokenFor("obchodnik");

  const evil = new FormData();
  evil.append("file", new Blob(["<script>alert(1)</script>"], { type: "image/png" }), "evil.html");
  const up = await req("POST", "/api/uploads", { token, body: evil });
  assert.equal(up.status, 201);
  assert.match(up.data.file.url, /\.png$/); // NIKDY .html
  assert.doesNotMatch(up.data.file.url, /\.html$/);

  const txt = new FormData();
  txt.append("file", new Blob(["ahoj"], { type: "text/plain" }), "x.txt");
  const rej = await req("POST", "/api/uploads", { token, body: txt });
  assert.equal(rej.status, 400);

  // Stažení nahraného souboru vyžaduje přihlášení.
  const png = new FormData();
  png.append("file", new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47])], { type: "image/png" }), "m.png");
  const ok = await req("POST", "/api/uploads", { token, body: png });
  const fileUrl = ok.data.file.url as string;
  assert.equal((await fetch(base + fileUrl)).status, 401); // bez tokenu
  assert.equal((await fetch(base + fileUrl, { headers: { authorization: `Bearer ${token}` } })).status, 200);
});

// ---------- Write-back ----------

test("synchronizace zapíše skórovaná pole do Raynetu", async () => {
  const token = await tokenFor("obchodnik");
  const card = await openSvjCard(token);
  await req("PUT", `/api/cards/${card.id}`, {
    token, body: { mode: "complete", acquisition: "telefonat", values: {
      pocet_bytu: 12, pocet_meridel: 48, skladba_meridel: "vodoměry", stavebni_delky: "110 mm",
      znacka_meridel: "Maddeo", technologie_odectu: "NB-IoT", specifika_instalace: "ok",
    } },
  });
  const sync = await req("POST", `/api/cards/${card.id}/sync`, { token });
  assert.equal(sync.status, 200);
  assert.ok(Object.keys(sync.data.fields).includes("cf_svj_technologie_odectu"));
});

// ---------- CSV injection (jednotkový) ----------

test("CSV export má popsané sloupce a shodný počet sloupců v hlavičce i řádcích", async () => {
  const reditel = await tokenFor("reditel");
  const res = await fetch(base + "/api/reports/export.csv", { headers: { authorization: `Bearer ${reditel}` } });
  assert.equal(res.status, 200);
  const text = (await res.text()).replace(/^﻿/, "");
  const rows = text.split("\n").filter(Boolean);
  // hrubý počet sloupců přes počet oddělovačů (žádné pole demo dat neobsahuje ;)
  const cols = (line: string) => line.split(";").length;
  const headerCols = cols(rows[0]);
  assert.ok(headerCols > 9, "hlavička musí obsahovat i reportovatelné sloupce");
  assert.ok(rows[0].includes("Počet odběrných míst"));
  for (const r of rows.slice(1)) assert.equal(cols(r), headerCols);
});

test("csvCell neutralizuje vzorce a escapuje oddělovače", () => {
  assert.equal(csvCell("=HYPERLINK(x)"), "'=HYPERLINK(x)");
  assert.equal(csvCell("+1"), "'+1");
  assert.equal(csvCell("-5"), "'-5");
  assert.equal(csvCell("@SUM"), "'@SUM");
  assert.equal(csvCell("běžný text"), "běžný text");
  assert.equal(csvCell("má;středník"), '"má;středník"');
});
