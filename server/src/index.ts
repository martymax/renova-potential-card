// Karta potenciálu — backend (bootstrap).
// Frontend volá výhradně tento server; Raynet přístupové údaje zůstávají zde (§11.2).

import { initStore, persist, closeStore, isPostgres } from "./lib/store.js";
import { seed } from "./lib/seed.js";
import { seedDemoCards } from "./lib/demo.js";
import { createApp } from "./app.js";

await initStore(seed);
seedDemoCards();
persist();

const app = createApp();
const extras = [isPostgres() ? "Postgres" : "soubor", process.env.NODE_ENV === "production" ? "frontend" : null]
  .filter(Boolean)
  .join(" + ");

const parsedPort = Number.parseInt(process.env.PORT ?? "4000", 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 4000;
const server = app.listen(PORT, () => {
  console.log(`Karta potenciálu API běží na http://localhost:${PORT} (${extras})`);
});

// Graceful shutdown — dokonči zápis do úložiště (důležité pro Postgres flush).
for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.on(sig, () => {
    server.close(async () => {
      await closeStore();
      process.exit(0);
    });
  });
}
