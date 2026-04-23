import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "./errorHandler";
import type { JwtAccessPayload } from "../../types/auth";

type RequestWithUser = Request & {
  user?: {
    userId: string;
    walletAddress: string;
  };
};

function getBearerToken(authHeader?: string): string {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError(401, "Missing or invalid Authorization header", "AUTH_HEADER_INVALID");
  }
  return authHeader.replace("Bearer ", "").trim();
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(500, "JWT secret not configured", "JWT_SECRET_MISSING");
  }
  return secret;
}

export function requireAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const token = getBearerToken(req.headers.authorization);
    const payload = jwt.verify(token, getJwtSecret()) as JwtAccessPayload;

    if (payload.type !== "access" || !payload.sub || !payload.walletAddress) {
      throw new AppError(401, "Invalid access token", "ACCESS_TOKEN_INVALID");
    }

    (req as RequestWithUser).user = {
      userId: payload.sub,
      walletAddress: payload.walletAddress,
    };

    next();
  } catch (_error) {
    next(new AppError(401, "Unauthorized", "UNAUTHORIZED"));
  }
}
