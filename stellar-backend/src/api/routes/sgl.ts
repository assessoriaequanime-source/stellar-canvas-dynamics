import { Router, Request, Response, NextFunction } from "express";
import { Prisma, TransactionStatus, TransactionType } from "@prisma/client";
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

router.get("/balance", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId, walletAddress } = ensureUser(req);

    const transactions = await prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });

    const spent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
    const initialCredit = 10000;

    res.status(200).json({
      walletAddress,
      network: "sepolia",
      sglBalance: Math.max(0, initialCredit - spent),
      spent,
      source: "backend",
    });
  } catch (error) {
    next(error);
  }
});

router.post("/debit", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = ensureUser(req);
    const body = req.body as { amount?: number; serviceType?: string; txHash?: string };

    if (!body.amount || body.amount <= 0) {
      throw new AppError(400, "amount must be positive", "INVALID_PAYLOAD");
    }

    const tx = await prisma.transaction.create({
      data: {
        userId,
        type: TransactionType.PURCHASE,
        status: TransactionStatus.CONFIRMED,
        amount: new Prisma.Decimal(body.amount),
        txHash: body.txHash,
      },
    });

    // TODO: integrate with SGLToken/FeeManager contract execution.
    res.status(201).json({
      ok: true,
      transaction: tx,
      serviceType: body.serviceType || "unknown",
    });
  } catch (error) {
    next(error);
  }
});

router.get("/ledger", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { userId } = ensureUser(req);
    const items = await prisma.transaction.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    res.status(200).json(items);
  } catch (error) {
    next(error);
  }
});

export default router;
