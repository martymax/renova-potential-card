// Karta potenciálu — backend (bootstrap).
// Frontend volá výhradně tento server; Raynet přístupové údaje zůstávají zde (§11.2).

import { initStore, persist } from "./lib/store.js";
import { seed } from "./lib/seed.js";
import { seedDemoCards } from "./lib/demo.js";
import { createApp } from "./app.js";

initStore(seed);
seedDemoCards();
persist();

const app = createApp();
const webServed = process.env.NODE_ENV === "production" ? " (+ frontend)" : "";

const parsedPort = Number.parseInt(process.env.PORT ?? "4000", 10);
const PORT = Number.isInteger(parsedPort) && parsedPort > 0 && parsedPort <= 65535 ? parsedPort : 4000;
app.listen(PORT, () => {
  console.log(`Karta potenciálu API běží na http://localhost:${PORT}${webServed}`);
});
