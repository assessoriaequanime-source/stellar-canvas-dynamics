import { Router, Request, Response, NextFunction } from "express";
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

function ensureUser(req: Request): { userId: string; walletAddress: string } {
  const user = (req as RequestWithUser).user;
  if (!user?.userId) {
    throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
  }
  return user;
}

router.get("/status", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, walletAddress } = ensureUser(req);

    const [avatarCount, capsuleCount, legacyCount, transactions] = await Promise.all([
      prisma.avatar.count({ where: { userId } }),
      prisma.timeCapsule.count({ where: { userId } }),
      prisma.digitalLegacy.count({ where: { userId } }),
      prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
    ]);

    const spent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const defaultCredit = 10000;

    res.status(200).json({
      userId,
      walletAddress,
      avatarCount,
      capsuleCount,
      legacyCount,
      sglBalance: Math.max(0, defaultCredit - spent),
      backendSource: "stellar-backend",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/wallet", requireAuth, async (req: Request, res: Response) => {
  const { walletAddress } = ensureUser(req);
  res.status(200).json({
    walletAddress,
    network: "sepolia",
    chainId: 11155111,
    source: "backend",
  });
});

router.get("/metrics", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = ensureUser(req);

    const [transactions, absorptionEvents] = await Promise.all([
      prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 100 }),
      prisma.auditLog.findMany({
        where: { userId, resource: "absorption-feedback" },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);

    const rightCount = absorptionEvents.filter((event) => {
      const direction = (event.details as Record<string, unknown> | null)?.direction;
      return direction === "right";
    }).length;

    const totalAbsorption = absorptionEvents.length;
    const pas = totalAbsorption === 0 ? 0.79 : Math.min(0.99, 0.6 + rightCount / Math.max(totalAbsorption, 1) * 0.39);

    const spent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

    res.status(200).json({
      omega: Number((pas * 100).toFixed(1)),
      pas: Number(pas.toFixed(4)),
      totalTransactions: transactions.length,
      sglSpent: Number(spent.toFixed(2)),
    });
  } catch (error) {
    next(error);
  }
});

router.post("/absorption-feedback", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = ensureUser(req);
    const body = req.body as {
      direction?: "left" | "right";
      profile?: string;
      intensity?: number;
      source?: string;
    };

    if (!body.direction || !["left", "right"].includes(body.direction)) {
      throw new AppError(400, "direction is required", "INVALID_PAYLOAD");
    }

    const event = await prisma.auditLog.create({
      data: {
        userId,
        action: "CONSENT_UPSERT",
        resource: "absorption-feedback",
        details: {
          direction: body.direction,
          profile: body.profile || "unknown",
          intensity: body.intensity || 0,
          source: body.source || "dashboard",
          ts: new Date().toISOString(),
        },
      },
    });

    // TODO: Replace with real PAS pipeline tied to AvatarPro contracts.
    res.status(201).json({
      ok: true,
      eventId: event.id,
      direction: body.direction,
      source: "backend",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/absorption-events", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = ensureUser(req);

    const events = await prisma.auditLog.findMany({
      where: { userId, resource: "absorption-feedback" },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const rightCount = events.filter((event) => {
      const direction = (event.details as Record<string, unknown> | null)?.direction;
      return direction === "right";
    }).length;

    const absorption = events.length === 0 ? 42 : Math.min(100, Math.round((rightCount / events.length) * 100));

    res.status(200).json({
      absorption,
      events,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
