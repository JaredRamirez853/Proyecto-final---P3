import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthUser } from "../types/auth";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Autenticación requerida." });
  }

  const token = header.slice(7);

  try {
    req.user = jwt.verify(token, env.jwtSecret) as AuthUser;
    next();
  } catch {
    return res.status(401).json({ message: "Token inválido o expirado." });
  }
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({ message: "Acceso de administrador requerido." });
  }

  next();
}
