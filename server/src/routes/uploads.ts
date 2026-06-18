import { Router } from "express";
import multer from "multer";
import { extname, join } from "node:path";
import { authMiddleware } from "../lib/auth.js";
import { genId, getDb, UPLOAD_DIR } from "../lib/store.js";

export const uploadsRouter = Router();

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${genId("img_")}${extname(file.originalname)}`),
});

const HARD_CAP_MB = 16; // tvrdý strop; jemnější limit řeší settings.maxAttachmentMB
const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const ok = ["image/jpeg", "image/png", "image/webp", "image/heic"].includes(file.mimetype);
    cb(null, ok);
  },
  limits: { fileSize: HARD_CAP_MB * 1024 * 1024 },
});

// Fotografie stávajících měřidel u SVJ (§8.3). V první verzi se ukládá v aplikaci.
uploadsRouter.post("/", authMiddleware, upload.single("file"), (req, res) => {
  const max = getDb().settings.maxAttachmentMB;
  if (!req.file) {
    res.status(400).json({ error: `Nahraj obrázek (JPG, PNG, WebP) do ${max} MB.` });
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
