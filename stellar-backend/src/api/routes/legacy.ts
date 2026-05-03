import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../middlewares/errorHandler";
import { parseOrThrow } from "../../lib/validation";
import { createLegacySchema, updateLegacySchema } from "../validators/legacy";

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

function mapJsonValue(
  value: unknown,
): Prisma.InputJsonValue | Prisma.NullableJsonNullValueInput | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return Prisma.JsonNull;
  }

  return value as Prisma.InputJsonValue;
}

router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const legacies = await prisma.digitalLegacy.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(legacies);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const legacy = await prisma.digitalLegacy.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
    });

    if (!legacy) {
      throw new AppError(404, "Digital legacy not found", "LEGACY_NOT_FOUND");
    }

    res.status(200).json(legacy);
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const payload = parseOrThrow(createLegacySchema, req.body);

    const legacy = await prisma.digitalLegacy.create({
      data: {
        userId,
        name: payload.name,
        beneficiaries: payload.beneficiaries as Prisma.InputJsonValue,
        assets: mapJsonValue(payload.assets),
        contractAddress: payload.contractAddress,
      },
    });

    res.status(201).json(legacy);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const payload = parseOrThrow(updateLegacySchema, req.body);

    const existingLegacy = await prisma.digitalLegacy.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: { id: true },
    });

    if (!existingLegacy) {
      throw new AppError(404, "Digital legacy not found", "LEGACY_NOT_FOUND");
    }

    const updatedLegacy = await prisma.digitalLegacy.update({
      where: { id: existingLegacy.id },
      data: {
        name: payload.name,
        beneficiaries: payload.beneficiaries as Prisma.InputJsonValue | undefined,
        assets: mapJsonValue(payload.assets),
        contractAddress: payload.contractAddress,
      },
    });

    res.status(200).json(updatedLegacy);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);

    const existingLegacy = await prisma.digitalLegacy.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: { id: true },
    });

    if (!existingLegacy) {
      throw new AppError(404, "Digital legacy not found", "LEGACY_NOT_FOUND");
    }

    await prisma.digitalLegacy.delete({
      where: { id: existingLegacy.id },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
