import { Router } from "express";
import { authMiddleware, login, logout, toPublic, type AuthedRequest } from "../lib/auth.js";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const { username, password } = req.body ?? {};
  if (!username || !password) {
    res.status(400).json({ error: "Zadej jméno i heslo." });
    return;
  }
  const result = login(String(username), String(password));
  if (!result) {
    res.status(401).json({ error: "Nesprávné jméno nebo heslo." });
    return;
  }
  res.json(result);
});

authRouter.post("/logout", (req, res) => {
  const header = req.header("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  logout(token);
  res.json({ ok: true });
});

authRouter.get("/me", authMiddleware, (req: AuthedRequest, res) => {
  res.json({ user: toPublic(req.user!) });
});
