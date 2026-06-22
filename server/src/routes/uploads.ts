import { Router } from "express";
import multer from "multer";
import { authMiddleware } from "../lib/auth.js";
import { genId, getDb, UPLOAD_DIR } from "../lib/store.js";

export const uploadsRouter = Router();

// Povolené typy → bezpečná přípona. Přípona se odvozuje VÝHRADNĚ z ověřeného
// MIME typu, nikdy z názvu souboru od uživatele — jinak by šlo uložit např.
// `x.html` a servírovat ho jako text/html ze stejné origin (uložené XSS).
const MIME_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/heic": ".heic",
};

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${genId("img_")}${MIME_EXT[file.mimetype] ?? ".bin"}`),
});

const HARD_CAP_MB = 16; // tvrdý strop; jemnější limit řeší settings.maxAttachmentMB
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => cb(null, file.mimetype in MIME_EXT),
  limits: { fileSize: HARD_CAP_MB * 1024 * 1024 },
});

// Fotografie stávajících měřidel u SVJ (§8.3). V první verzi se ukládá v aplikaci.
uploadsRouter.post("/", authMiddleware, upload.single("file"), (req, res) => {
  const max = getDb().settings.maxAttachmentMB;
  if (!req.file) {
    res.status(400).json({ error: `Nahraj obrázek (JPG, PNG, WebP, HEIC) do ${max} MB.` });
    return;
  }
  if (req.file.size > max * 1024 * 1024) {
    res.status(400).json({ error: `Fotografie je větší než povolených ${max} MB.` });
    return;
  }
  res.status(201).json({
    file: { url: `/uploads/${req.file.filename}`, name: req.file.originalname, size: req.file.size },
  });
});
