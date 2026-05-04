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
    const rules = await prisma.digitalLegacy.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    res.status(200).json(rules);
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const body = req.body as {
      name?: string;
      beneficiaries?: unknown;
      assets?: unknown;
      contractAddress?: string;
    };

    if (!body.name || !Array.isArray(body.beneficiaries)) {
      throw new AppError(400, "name and beneficiaries are required", "INVALID_PAYLOAD");
    }

    const rule = await prisma.digitalLegacy.create({
      data: {
        userId,
        name: body.name,
        beneficiaries: body.beneficiaries as Prisma.InputJsonValue,
        assets: (body.assets || null) as Prisma.InputJsonValue,
        contractAddress: body.contractAddress,
      },
    });

    // TODO: wire to LegacyPolicy contract mapping.
    res.status(201).json(rule);
  } catch (error) {
    next(error);
  }
});

export default router;
