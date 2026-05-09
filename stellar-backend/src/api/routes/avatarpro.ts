import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";
import { PublicKey } from "@solana/web3.js";
import { getSglBalance } from "../../services/sglSolanaService.js";

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

function normalizeDirection(value: unknown): "left" | "right" | null {
  if (value === "left" || value === "right") return value;
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function computePasFromAbsorptionEvents(events: Array<{ details: unknown }>) {
  const directions = events
    .map((event) => normalizeDirection((event.details as Record<string, unknown> | null)?.direction))
    .filter((value): value is "left" | "right" => Boolean(value));

  const rightCount = directions.filter((direction) => direction === "right").length;
  const wrongCount = directions.filter((direction) => direction === "left").length;
  const totalAbsorption = directions.length;

  if (totalAbsorption === 0) {
    return {
      rightCount,
      wrongCount,
      totalAbsorption,
      pas: 0.79,
      absorption: 42,
    };
  }

  const avgIntensity =
    events.reduce((sum, event) => {
      const details = event.details as Record<string, unknown> | null;
      const intensity = Number(details?.intensity ?? 0);
      return sum + (Number.isNaN(intensity) ? 0 : clamp(intensity, 0, 100));
    }, 0) / Math.max(events.length, 1);

  const rightRatio = rightCount / totalAbsorption;
  const wrongRatio = wrongCount / totalAbsorption;
  const intensityBoost = (avgIntensity / 100) * 0.04;

  const pas = clamp(0.58 + rightRatio * 0.36 - wrongRatio * 0.22 + intensityBoost, 0.35, 0.99);
  const absorption = clamp(Math.round((rightRatio - wrongRatio * 0.35) * 100), 0, 100);

  return {
    rightCount,
    wrongCount,
    totalAbsorption,
    pas,
    absorption,
  };
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

router.get("/wallet", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const walletFromQuery = req.query.walletAddress?.toString();
    const walletAddress = walletFromQuery ? new PublicKey(walletFromQuery).toBase58() : ensureUser(req).walletAddress;
    const balance = await getSglBalance(walletAddress);

    res.status(200).json({
      walletAddress,
      network: "solana-devnet",
      chainId: "devnet",
      tokenAccount: balance.tokenAccount,
      sglBalance: balance.balance,
      source: "solana-devnet",
    });
  } catch (error) {
    next(error);
  }
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

    const absorptionMetrics = computePasFromAbsorptionEvents(absorptionEvents);

    const spent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);

    res.status(200).json({
      omega: Number((absorptionMetrics.pas * 100).toFixed(1)),
      pas: Number(absorptionMetrics.pas.toFixed(4)),
      rightCount: absorptionMetrics.rightCount,
      wrongCount: absorptionMetrics.wrongCount,
      totalAbsorption: absorptionMetrics.totalAbsorption,
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
      targetMessageId?: number;
      targetResponseHash?: string;
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
          targetMessageId: body.targetMessageId ?? null,
          targetResponseHash: body.targetResponseHash || null,
          appliesTo: "last-ai-response",
          ts: new Date().toISOString(),
        },
      },
    });

    const latestEvents = await prisma.auditLog.findMany({
      where: { userId, resource: "absorption-feedback" },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { details: true },
    });

    const absorptionMetrics = computePasFromAbsorptionEvents(latestEvents);

    res.status(201).json({
      ok: true,
      eventId: event.id,
      direction: body.direction,
      newScore: absorptionMetrics.absorption,
      pas: Number(absorptionMetrics.pas.toFixed(4)),
      rightCount: absorptionMetrics.rightCount,
      wrongCount: absorptionMetrics.wrongCount,
      totalAbsorption: absorptionMetrics.totalAbsorption,
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

    const absorptionMetrics = computePasFromAbsorptionEvents(events);

    res.status(200).json({
      absorption: absorptionMetrics.absorption,
      pas: Number(absorptionMetrics.pas.toFixed(4)),
      rightCount: absorptionMetrics.rightCount,
      wrongCount: absorptionMetrics.wrongCount,
      totalAbsorption: absorptionMetrics.totalAbsorption,
      events,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
