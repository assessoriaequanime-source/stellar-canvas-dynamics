import { Router, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import prisma from "../../lib/prisma.js";
import { requireAuth } from "../middlewares/auth.js";
import { AppError } from "../middlewares/errorHandler.js";
import { parseOrThrow } from "../../lib/validation.js";
import {
  consumeJudgeAccessCapsuleSchema,
  createJudgeAccessCapsuleSchema,
} from "../validators/capsule.js";
import {
  buildJudgeAccessMetadata,
  createJudgeAccessEnvelope,
  dispatchJudgeAccess,
  verifyAccessCode,
  verifyInviteToken,
} from "../../services/judgeAccessService.js";

const router = Router();

type JudgeCapsuleMetadata = {
  capsuleType?: string;
  judge?: {
    recipientName?: string;
    recipientEmail?: string | null;
    recipientWhatsapp?: string | null;
  };
  delivery?: {
    channel?: string;
    type?: string;
    status?: string;
    scheduledFor?: string;
    dispatchedAt?: string | null;
  };
  temporaryWallet?: {
    address?: string;
    issuedAt?: string;
    discardedAt?: string | null;
  };
  access?: {
    inviteTokenHash?: string;
    accessCodeHash?: string;
    issuedAt?: string;
    consumedAt?: string | null;
    expiresAt?: string;
  };
};

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

async function resolveCapsuleUserIdForWrite(req: Request): Promise<string> {
  const sessionUserId = (req as RequestWithUser).user?.userId;
  if (sessionUserId) {
    return sessionUserId;
  }

  // Demo fallback: prefer existing user rows before creating anything.
  const existingDemoUser = await prisma.user.findUnique({
    where: { walletAddress: "demo-wallet-address" },
    select: { id: true },
  });
  if (existingDemoUser) {
    return existingDemoUser.id;
  }

  const firstUser = await prisma.user.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (firstUser) {
    return firstUser.id;
  }

  const createdDemoUser = await prisma.user.create({
    data: {
      walletAddress: "demo-wallet-address",
      nickname: "Demo User",
      email: "demo@singulai.local",
    },
    select: { id: true },
  });

  return createdDemoUser.id;
}

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(500, "JWT secret not configured", "JWT_SECRET_MISSING");
  }
  return secret;
}

function getAuditEntryBaseUrl(req: Request): string {
  const configured = process.env.AUDIT_ENTRY_BASE_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return `${req.protocol}://${req.get("host")}/audit`;
}

function assertJudgeCapsuleMetadata(metadata: unknown): JudgeCapsuleMetadata {
  if (!metadata || typeof metadata !== "object") {
    throw new AppError(400, "Invalid capsule metadata", "INVALID_CAPSULE_METADATA");
  }

  const judgeMetadata = metadata as JudgeCapsuleMetadata;
  if (judgeMetadata.capsuleType !== "JUDGE_AUDIT_ENTRY") {
    throw new AppError(400, "Capsule is not a judge access capsule", "INVALID_JUDGE_CAPSULE");
  }

  return judgeMetadata;
}

function signJudgeAccessToken(payload: {
  capsuleId: string;
  temporaryWalletAddress: string;
  recipientName: string;
}): string {
  return jwt.sign(
    {
      type: "judge_access",
      capsuleId: payload.capsuleId,
      temporaryWalletAddress: payload.temporaryWalletAddress,
      recipientName: payload.recipientName,
    },
    getJwtSecret(),
    { expiresIn: "4h" },
  );
}

// router.get("/", // requireAuth, async (req: Request, res: Response, next: NextFunction) => {
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionUserId = (req as RequestWithUser).user?.userId;
    if (!sessionUserId) {
      // Public demo access: keep endpoint open and deterministic without requiring session/DB writes.
      res.status(200).json([]);
      return;
    }

    const userId = sessionUserId;
    const capsules = await prisma.timeCapsule.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    res.status(200).json(capsules);
  } catch (error) {
    next(error);
  }
});

// router.post("/", // requireAuth, async (req: Request, res: Response, next: NextFunction) => {
router.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = await resolveCapsuleUserIdForWrite(req);
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

router.post("/judge-access", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const payload = parseOrThrow(createJudgeAccessCapsuleSchema, req.body);

    const unlockDateIso =
      payload.deliveryType === "scheduled"
        ? payload.unlockDate || new Date(Date.now() + 60 * 60 * 1000).toISOString()
        : new Date().toISOString();

    const envelope = createJudgeAccessEnvelope(getAuditEntryBaseUrl(req));
    const metadata = buildJudgeAccessMetadata({
      recipient: {
        recipientName: payload.recipientName,
        recipientEmail: payload.recipientEmail,
        recipientWhatsapp: payload.recipientWhatsapp,
      },
      channel: payload.channel,
      deliveryType: payload.deliveryType,
      envelope,
      unlockDateIso,
    });

    const capsule = await prisma.timeCapsule.create({
      data: {
        userId,
        name: payload.name,
        content: payload.content,
        unlockDate: new Date(unlockDateIso),
        metadata: metadata as Prisma.InputJsonValue,
      },
    });

    let dispatchStatus: "scheduled" | "sent" | "pending-webhook" = "scheduled";
    let dispatchResult = { emailSent: false, whatsappSent: false };

    if (payload.deliveryType === "immediate") {
      dispatchResult = await dispatchJudgeAccess({
        recipient: {
          recipientName: payload.recipientName,
          recipientEmail: payload.recipientEmail,
          recipientWhatsapp: payload.recipientWhatsapp,
        },
        channel: payload.channel,
        envelope,
        capsuleId: capsule.id,
      });

      dispatchStatus = dispatchResult.emailSent || dispatchResult.whatsappSent ? "sent" : "pending-webhook";

      const currentMetadata = assertJudgeCapsuleMetadata(capsule.metadata);
      const nextMetadata: JudgeCapsuleMetadata = {
        ...currentMetadata,
        delivery: {
          ...currentMetadata.delivery,
          status: dispatchStatus,
          dispatchedAt: dispatchStatus === "sent" ? new Date().toISOString() : null,
        },
      };

      await prisma.timeCapsule.update({
        where: { id: capsule.id },
        data: { metadata: nextMetadata as Prisma.InputJsonValue },
      });
    }

    const inviteLink = `${envelope.dashboardUrl}?cid=${encodeURIComponent(capsule.id)}&jt=${encodeURIComponent(envelope.inviteToken)}`;

    res.status(201).json({
      id: capsule.id,
      name: capsule.name,
      unlockDate: capsule.unlockDate,
      deliveryType: payload.deliveryType,
      channel: payload.channel,
      dispatchStatus,
      dispatchResult,
      judgeAccess: {
        inviteLink,
        accessCode: envelope.accessCode,
        temporaryWalletAddress: envelope.temporaryWalletAddress,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post(
  "/judge-access/:id/consume",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = parseOrThrow(consumeJudgeAccessCapsuleSchema, req.body);

      const capsule = await prisma.timeCapsule.findUnique({
        where: { id: req.params.id },
      });

      if (!capsule) {
        throw new AppError(404, "Capsule not found", "CAPSULE_NOT_FOUND");
      }

      const metadata = assertJudgeCapsuleMetadata(capsule.metadata);
      const access = metadata.access;
      const tempWallet = metadata.temporaryWallet;
      const judge = metadata.judge;

      if (!access?.inviteTokenHash || !access?.accessCodeHash || !tempWallet?.address) {
        throw new AppError(400, "Capsule access metadata is incomplete", "INVALID_JUDGE_CAPSULE");
      }

      if (access.consumedAt) {
        throw new AppError(410, "Judge capsule already consumed", "JUDGE_CAPSULE_CONSUMED");
      }

      if (new Date(capsule.unlockDate).getTime() > Date.now()) {
        throw new AppError(423, "Capsule is still locked", "JUDGE_CAPSULE_LOCKED");
      }

      if (!verifyInviteToken(access.inviteTokenHash, payload.inviteToken)) {
        throw new AppError(401, "Invalid invitation token", "INVALID_JUDGE_INVITE_TOKEN");
      }

      if (!verifyAccessCode(access.accessCodeHash, payload.accessCode)) {
        throw new AppError(401, "Invalid access code", "INVALID_JUDGE_ACCESS_CODE");
      }

      const nowIso = new Date().toISOString();
      const nextMetadata: JudgeCapsuleMetadata = {
        ...metadata,
        access: {
          ...access,
          consumedAt: nowIso,
        },
        temporaryWallet: {
          ...tempWallet,
          discardedAt: nowIso,
        },
      };

      await prisma.timeCapsule.update({
        where: { id: capsule.id },
        data: {
          metadata: nextMetadata as Prisma.InputJsonValue,
        },
      });

      const judgeAccessToken = signJudgeAccessToken({
        capsuleId: capsule.id,
        temporaryWalletAddress: tempWallet.address,
        recipientName: judge?.recipientName || "Judge",
      });

      res.status(200).json({
        judgeAccessToken,
        temporaryWalletAddress: tempWallet.address,
        recipientName: judge?.recipientName || "Judge",
        capsuleId: capsule.id,
        auditDashboardUrl: "/audit",
      });
    } catch (error) {
      next(error);
    }
  },
);

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
