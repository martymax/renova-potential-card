// Karta potenciálu — backend.
// Frontend volá výhradně tento server; Raynet přístupové údaje zůstávají zde (§11.2).

import express from "express";
import cors from "cors";
import { initStore, persist, UPLOAD_DIR } from "./lib/store.js";
import { seed } from "./lib/seed.js";
import { seedDemoCards } from "./lib/demo.js";
import { authRouter } from "./routes/auth.js";
import { raynetRouter } from "./routes/raynet.js";
import { cardsRouter } from "./routes/cards.js";
import { adminRouter } from "./routes/admin.js";
import { reportsRouter } from "./routes/reports.js";
import { uploadsRouter } from "./routes/uploads.js";

initStore(seed);
seedDemoCards();
persist();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, service: "karta-potencialu", time: new Date().toISOString() }));

app.use("/api/auth", authRouter);
app.use("/api/raynet", raynetRouter);
app.use("/api/cards", cardsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/uploads", uploadsRouter);
app.use("/api", adminRouter); // /api/segments, /api/codebooks, /api/mappings, /api/settings, /api/users

app.use("/uploads", express.static(UPLOAD_DIR));

// Jednotné chybové hlášení
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[api error]", err);
  res.status(500).json({ error: "Na serveru nastala chyba. Zkus to prosím znovu." });
});

const PORT = Number(process.env.PORT ?? 4000);
app.listen(PORT, () => {
  console.log(`Karta potenciálu API běží na http://localhost:${PORT}`);
});
