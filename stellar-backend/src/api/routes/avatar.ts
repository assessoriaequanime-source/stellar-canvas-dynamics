import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../middlewares/errorHandler";
import { parseOrThrow } from "../../lib/validation";
import { createAvatarSchema, updateAvatarSchema } from "../validators/avatar";

const router = Router();

type RequestWithUser = Request & {
  user?: {
    userId: string;
    walletAddress: string;
  };
};

function ensureUserId(req: Request): string {
  const requestWithUser = req as RequestWithUser;
  const userId = requestWithUser.user?.userId;

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
    const avatars = await prisma.avatar.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(avatars);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const avatar = await prisma.avatar.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
    });

    if (!avatar) {
      throw new AppError(404, "Avatar not found", "AVATAR_NOT_FOUND");
    }

    res.status(200).json(avatar);
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const payload = parseOrThrow(createAvatarSchema, req.body);

    const avatar = await prisma.avatar.create({
      data: {
        userId,
        name: payload.name,
        contractAddress: payload.contractAddress,
        traits: mapJsonValue(payload.traits),
        metadata: mapJsonValue(payload.metadata),
      },
    });

    res.status(201).json(avatar);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const payload = parseOrThrow(updateAvatarSchema, req.body);

    const existingAvatar = await prisma.avatar.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: { id: true },
    });

    if (!existingAvatar) {
      throw new AppError(404, "Avatar not found", "AVATAR_NOT_FOUND");
    }

    const updatedAvatar = await prisma.avatar.update({
      where: { id: existingAvatar.id },
      data: {
        name: payload.name,
        contractAddress: payload.contractAddress,
        traits: mapJsonValue(payload.traits),
        metadata: mapJsonValue(payload.metadata),
      },
    });

    res.status(200).json(updatedAvatar);
  } catch (error) {
    next(error);
  }
});

router.delete("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);

    const existingAvatar = await prisma.avatar.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: { id: true },
    });

    if (!existingAvatar) {
      throw new AppError(404, "Avatar not found", "AVATAR_NOT_FOUND");
    }

    await prisma.avatar.delete({
      where: { id: existingAvatar.id },
    });

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;
