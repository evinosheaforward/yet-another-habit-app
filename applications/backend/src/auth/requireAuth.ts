import type { Request, Response, NextFunction } from "express";
import { verifyIdToken } from "./firebase";

declare module "express-serve-static-core" {
  interface Request {
    auth?: {
      uid: string;
    };
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.method === "OPTIONS") return next(); // allow CORS preflight
    
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing Authorization Bearer token" });
    }

    const token = header.slice("Bearer ".length).trim();
    const decoded = await verifyIdToken(token);

    req.auth = { uid: decoded.uid };
    next();
  } catch (err) {
    let message = "Invalid or expired token - unclear";

    if (err instanceof Error) {
      message = err.message;
    }

    console.error("Auth verify failed:", message ?? err, err);
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}