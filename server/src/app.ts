// Sestavení Express aplikace (bez listen) — sdílené pro běh i testy.

import express from "express";
import cors from "cors";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { UPLOAD_DIR } from "./lib/store.js";
import { authMiddleware } from "./lib/auth.js";
import { authRouter } from "./routes/auth.js";
import { raynetRouter } from "./routes/raynet.js";
import { cardsRouter } from "./routes/cards.js";
import { adminRouter } from "./routes/admin.js";
import { reportsRouter } from "./routes/reports.js";
import { uploadsRouter } from "./routes/uploads.js";

export function createApp(): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, service: "karta-potencialu", time: new Date().toISOString() }),
  );

  app.use("/api/auth", authRouter);
  app.use("/api/raynet", raynetRouter);
  app.use("/api/cards", cardsRouter);
  app.use("/api/reports", reportsRouter);
  app.use("/api/uploads", uploadsRouter);
  app.use("/api", adminRouter); // /api/segments, /api/codebooks, /api/mappings, /api/settings, /api/users

  // Nahrané přílohy jen pro přihlášené (fotky měřidel patří k chráněným kartám).
  // nosniff brání MIME sniffingu; přípona je omezena na obrázkové typy při uploadu.
  app.use("/uploads", authMiddleware, express.static(UPLOAD_DIR, {
    setHeaders: (res) => res.setHeader("X-Content-Type-Options", "nosniff"),
  }));

  // Produkční režim: backend obsluhuje i sestavený frontend (jedna služba).
  // dist/index.js → ../../web/dist; v devu jede frontend přes Vite (:5173).
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const webDist = join(__dirname, "..", "..", "web", "dist");
  if (existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get(/^(?!\/api|\/uploads).*/, (_req, res) => {
      res.sendFile(join(webDist, "index.html"));
    });
  }

  // Jednotné chybové hlášení
  app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[api error]", err);
    res.status(500).json({ error: "Na serveru nastala chyba. Zkus to prosím znovu." });
  });

  return app;
}
