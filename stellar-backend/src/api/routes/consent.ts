import { Router, Request, Response, NextFunction } from "express";
import { ConsentType } from "@prisma/client";
import prisma from "../../lib/prisma";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../middlewares/errorHandler";
import { parseOrThrow } from "../../lib/validation";
import { consentTypeParamSchema, upsertConsentSchema } from "../validators/consent";

const router = Router();

type RequestWithUser = Request & {
  user?: {
    userId: string;
    walletAddress: string;
  };
};

function ensureUserId(req: Request): string {
  const userId = (req as RequestWithUser).user?.userId;
  if (!userId) {
    throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
  }
  return userId;
}

router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);

    const consents = await prisma.consentRegistry.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });

    res.status(200).json(consents);
  } catch (error) {
    next(error);
  }
});

router.get("/:type", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const { type } = parseOrThrow(consentTypeParamSchema, req.params);

    const consent = await prisma.consentRegistry.findFirst({
      where: {
        userId,
        type,
      },
    });

    if (!consent) {
      throw new AppError(404, "Consent not found", "CONSENT_NOT_FOUND");
    }

    res.status(200).json(consent);
  } catch (error) {
    next(error);
  }
});

router.put("/:type", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const { type } = parseOrThrow(consentTypeParamSchema, req.params);
    const payload = parseOrThrow(upsertConsentSchema, req.body);

    const existing = await prisma.consentRegistry.findFirst({
      where: {
        userId,
        type,
      },
      select: { id: true },
    });

    const consent = existing
      ? await prisma.consentRegistry.update({
          where: { id: existing.id },
          data: {
            status: payload.status,
            expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
          },
        })
      : await prisma.consentRegistry.create({
          data: {
            userId,
            type: type as ConsentType,
            status: payload.status,
            expiresAt: payload.expiresAt ? new Date(payload.expiresAt) : null,
          },
        });

    res.status(200).json(consent);
  } catch (error) {
    next(error);
  }
});

export default router;
