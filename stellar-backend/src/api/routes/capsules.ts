import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../middlewares/errorHandler";

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
    const capsules = await prisma.timeCapsule.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    res.status(200).json(capsules);
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const body = req.body as { name?: string; content?: string; unlockDate?: string };

    if (!body.name || !body.content || !body.unlockDate) {
      throw new AppError(400, "name, content and unlockDate are required", "INVALID_PAYLOAD");
    }

    const capsule = await prisma.timeCapsule.create({
      data: {
        userId,
        name: body.name,
        content: body.content,
        unlockDate: new Date(body.unlockDate),
        metadata: Prisma.JsonNull,
      },
    });

    res.status(201).json(capsule);
  } catch (error) {
    next(error);
  }
});

router.post("/:id/simulate-trigger", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);

    const capsule = await prisma.timeCapsule.findFirst({
      where: { id: req.params.id, userId },
    });

    if (!capsule) {
      throw new AppError(404, "Capsule not found", "CAPSULE_NOT_FOUND");
    }

    const metadata = {
      ...(typeof capsule.metadata === "object" && capsule.metadata ? capsule.metadata : {}),
      simulatedTriggerAt: new Date().toISOString(),
      status: "SIMULATED_TRIGGERED",
    } as Prisma.InputJsonValue;

    const updated = await prisma.timeCapsule.update({
      where: { id: capsule.id },
      data: { metadata },
    });

    // TODO: wire to TimeCapsule contract trigger flow.
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
});

export default router;
