import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../middlewares/errorHandler";
import { parseOrThrow } from "../../lib/validation";
import { createCapsuleSchema, updateCapsuleSchema } from "../validators/capsule";

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
    const capsules = await prisma.timeCapsule.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(capsules);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const capsule = await prisma.timeCapsule.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
    });

    if (!capsule) {
      throw new AppError(404, "Time capsule not found", "CAPSULE_NOT_FOUND");
    }

    res.status(200).json(capsule);
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const payload = parseOrThrow(createCapsuleSchema, req.body);

    const capsule = await prisma.timeCapsule.create({
      data: {
        userId,
        name: payload.name,
        content: payload.content,
        unlockDate: new Date(payload.unlockDate),
        metadata: mapJsonValue(payload.metadata),
      },
    });

    res.status(201).json(capsule);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const payload = parseOrThrow(updateCapsuleSchema, req.body);

    const existingCapsule = await prisma.timeCapsule.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: { id: true },
    });

    if (!existingCapsule) {
      throw new AppError(404, "Time capsule not found", "CAPSULE_NOT_FOUND");
    }

    const updatedCapsule = await prisma.timeCapsule.update({
      where: { id: existingCapsule.id },
      data: {
        name: payload.name,
        content: payload.content,
        unlockDate: payload.unlockDate ? new Date(payload.unlockDate) : undefined,
        metadata: mapJsonValue(payload.metadata),
      },
    });

    res.status(200).json(updatedCapsule);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);

    const existingCapsule = await prisma.timeCapsule.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: { id: true },
    });

    if (!existingCapsule) {
      throw new AppError(404, "Time capsule not found", "CAPSULE_NOT_FOUND");
    }

    await prisma.timeCapsule.delete({
      where: { id: existingCapsule.id },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
