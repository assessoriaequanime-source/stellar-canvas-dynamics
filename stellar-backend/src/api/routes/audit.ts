import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../middlewares/errorHandler";
import { parseOrThrow } from "../../lib/validation";
import { auditQuerySchema } from "../validators/audit";
import { PublicKey } from "@solana/web3.js";
import { appendAuditEvent, listAuditEvents } from "../../storage/auditStore";
import { registerProofMemo } from "../../services/solanaProofService";
import { getSglMint } from "../../services/sglSolanaService";

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
    const query = parseOrThrow(auditQuerySchema, req.query);

    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        action: query.action,
        resource: query.resource,
      },
      orderBy: { createdAt: "desc" },
      take: query.limit || 50,
    });

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
});

router.get("/events", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const walletAddress = req.query.walletAddress?.toString();
    const avatarId = req.query.avatarId?.toString();

    if (walletAddress || avatarId) {
      const normalizedWallet = walletAddress ? new PublicKey(walletAddress).toBase58() : undefined;
      const events = listAuditEvents({ walletAddress: normalizedWallet, avatarId });
      res.status(200).json(events);
      return;
    }

    const userId = ensureUserId(req);
    const logs = await prisma.auditLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
});

router.post("/proof", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const body = req.body as {
      walletAddress?: string;
      avatarId?: string;
      eventType?: string;
      payloadHash?: string;
      serviceType?: string;
    };

    if (!body.walletAddress || !body.eventType || !body.payloadHash) {
      throw new AppError(400, "walletAddress, eventType and payloadHash are required", "INVALID_PAYLOAD");
    }

    const normalizedWallet = new PublicKey(body.walletAddress).toBase58();

    const proof = await registerProofMemo({
      eventType: body.eventType,
      avatarId: body.avatarId,
      walletAddress: normalizedWallet,
      serviceType: body.serviceType,
      payloadHash: body.payloadHash,
      timestamp: new Date().toISOString(),
    });

    const event = appendAuditEvent({
      walletAddress: normalizedWallet,
      avatarId: body.avatarId,
      eventType: body.eventType,
      serviceType: body.serviceType,
      payloadHash: body.payloadHash,
      txSignature: proof.txSignature,
      explorerUrl: proof.explorerUrl,
      createdAt: new Date().toISOString(),
      network: proof.network,
      mintAddress: getSglMint().toBase58(),
    });

    res.status(201).json({
      ...event,
      proofTxSignature: proof.txSignature,
      explorerUrl: proof.explorerUrl,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
