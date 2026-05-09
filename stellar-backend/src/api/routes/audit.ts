import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";
import jwt from "jsonwebtoken";
import { parseOrThrow } from "../../lib/validation.js";
import { auditQuerySchema } from "../validators/audit.js";
import { PublicKey } from "@solana/web3.js";
import { appendAuditEvent, listAuditEvents } from "../../storage/auditStore.js";
import { registerProofMemo } from "../../services/solanaProofService.js";
import { getSglMint } from "../../services/sglSolanaService.js";

const router = Router();

type RequestWithUser = Request & {
  user?: {
    userId: string;
    walletAddress: string;
  };
  judgeAccess?: {
    capsuleId: string;
    temporaryWalletAddress: string;
    recipientName: string;
  };
};

type JudgeAccessTokenPayload = {
  type?: string;
  capsuleId?: string;
  temporaryWalletAddress?: string;
  recipientName?: string;
};

function ensureUserId(req: Request): string {
  const userId = (req as RequestWithUser).user?.userId;
  if (!userId) {
    throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
  }
  return userId;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(500, "JWT secret not configured", "JWT_SECRET_MISSING");
  }
  return secret;
}

function requireJudgeAccess(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError(401, "Missing judge authorization", "JUDGE_AUTH_MISSING");
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const payload = jwt.verify(token, getJwtSecret()) as JudgeAccessTokenPayload;

    if (
      payload.type !== "judge_access" ||
      !payload.capsuleId ||
      !payload.temporaryWalletAddress ||
      !payload.recipientName
    ) {
      throw new AppError(401, "Invalid judge token", "INVALID_JUDGE_TOKEN");
    }

    (req as RequestWithUser).judgeAccess = {
      capsuleId: payload.capsuleId,
      temporaryWalletAddress: payload.temporaryWalletAddress,
      recipientName: payload.recipientName,
    };

    next();
  } catch (_error) {
    next(new AppError(401, "Unauthorized judge access", "UNAUTHORIZED_JUDGE_ACCESS"));
  }
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

router.get("/judge/events", requireJudgeAccess, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const judgeAccess = (req as RequestWithUser).judgeAccess;
    if (!judgeAccess) {
      throw new AppError(401, "Unauthorized judge access", "UNAUTHORIZED_JUDGE_ACCESS");
    }

    const events = listAuditEvents({ walletAddress: judgeAccess.temporaryWalletAddress });

    res.status(200).json({
      judge: {
        recipientName: judgeAccess.recipientName,
        capsuleId: judgeAccess.capsuleId,
        temporaryWalletAddress: judgeAccess.temporaryWalletAddress,
      },
      events,
    });
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
