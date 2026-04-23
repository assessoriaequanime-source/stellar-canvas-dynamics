import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../../lib/prisma";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../middlewares/errorHandler";
import { parseOrThrow } from "../../lib/validation";
import {
  createTransactionSchema,
  updateTransactionStatusSchema,
} from "../validators/transaction";

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

    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.status(200).json(transactions);
  } catch (error) {
    next(error);
  }
});

router.get("/:id", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
    });

    if (!transaction) {
      throw new AppError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
    }

    res.status(200).json(transaction);
  } catch (error) {
    next(error);
  }
});

router.post("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const payload = parseOrThrow(createTransactionSchema, req.body);

    const transaction = await prisma.transaction.create({
      data: {
        userId,
        type: payload.type,
        amount: new Prisma.Decimal(payload.amount),
        txHash: payload.txHash,
      },
    });

    res.status(201).json(transaction);
  } catch (error) {
    next(error);
  }
});

router.patch("/:id/status", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const payload = parseOrThrow(updateTransactionStatusSchema, req.body);

    const existingTransaction = await prisma.transaction.findFirst({
      where: {
        id: req.params.id,
        userId,
      },
      select: { id: true },
    });

    if (!existingTransaction) {
      throw new AppError(404, "Transaction not found", "TRANSACTION_NOT_FOUND");
    }

    const updatedTransaction = await prisma.transaction.update({
      where: { id: existingTransaction.id },
      data: {
        status: payload.status,
        txHash: payload.txHash,
      },
    });

    res.status(200).json(updatedTransaction);
  } catch (error) {
    next(error);
  }
});

export default router;
