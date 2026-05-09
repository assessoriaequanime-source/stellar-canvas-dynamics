import crypto from "crypto";
import { Keypair } from "@solana/web3.js";
import logger from "../lib/logger.js";
import { AppError } from "../api/middlewares/errorHandler.js";

export type DeliveryChannel = "email" | "whatsapp" | "both";
export type DeliveryType = "immediate" | "scheduled";

export interface JudgeAccessRecipient {
  recipientName: string;
  recipientEmail?: string;
  recipientWhatsapp?: string;
}

export interface JudgeAccessEnvelope {
  accessCode: string;
  inviteToken: string;
  temporaryWalletAddress: string;
  dashboardUrl: string;
}

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function normalizePhone(value: string): string {
  return value.replace(/[^\d+]/g, "").trim();
}

function parseList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function parsePhoneList(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((item) => normalizePhone(item).toLowerCase())
    .filter(Boolean);
}

function ensureRecipientAllowed(recipient: JudgeAccessRecipient): void {
  const allowedEmails = parseList(process.env.JUDGE_AUDITORS_EMAIL_ALLOWLIST);
  const allowedPhones = parsePhoneList(process.env.JUDGE_AUDITORS_WHATSAPP_ALLOWLIST);

  const providedEmail = recipient.recipientEmail?.trim().toLowerCase() || "";
  const providedPhone = recipient.recipientWhatsapp ? normalizePhone(recipient.recipientWhatsapp).toLowerCase() : "";

  const emailAllowed = providedEmail ? allowedEmails.includes(providedEmail) : false;
  const phoneAllowed = providedPhone ? allowedPhones.includes(providedPhone) : false;

  if (!allowedEmails.length && !allowedPhones.length) {
    throw new AppError(
      503,
      "Judge allowlist is not configured",
      "JUDGE_ALLOWLIST_NOT_CONFIGURED",
    );
  }

  if (!emailAllowed && !phoneAllowed) {
    throw new AppError(403, "Recipient is not authorized as judge", "JUDGE_NOT_ALLOWED");
  }
}

export function createJudgeAccessEnvelope(baseAuditUrl: string): JudgeAccessEnvelope {
  const accessCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const inviteToken = crypto.randomBytes(24).toString("base64url");
  const temporaryWalletAddress = Keypair.generate().publicKey.toBase58();

  return {
    accessCode,
    inviteToken,
    temporaryWalletAddress,
    dashboardUrl: baseAuditUrl,
  };
}

export function buildJudgeAccessMetadata(params: {
  recipient: JudgeAccessRecipient;
  channel: DeliveryChannel;
  deliveryType: DeliveryType;
  envelope: JudgeAccessEnvelope;
  unlockDateIso: string;
}): Record<string, unknown> {
  const now = new Date().toISOString();

  return {
    capsuleType: "JUDGE_AUDIT_ENTRY",
    version: 1,
    judge: {
      recipientName: params.recipient.recipientName,
      recipientEmail: params.recipient.recipientEmail || null,
      recipientWhatsapp: params.recipient.recipientWhatsapp || null,
    },
    delivery: {
      channel: params.channel,
      type: params.deliveryType,
      status: params.deliveryType === "immediate" ? "dispatch-pending" : "scheduled",
      scheduledFor: params.unlockDateIso,
      dispatchedAt: null,
    },
    temporaryWallet: {
      address: params.envelope.temporaryWalletAddress,
      issuedAt: now,
      discardedAt: null,
    },
    access: {
      inviteTokenHash: hashValue(params.envelope.inviteToken),
      accessCodeHash: hashValue(params.envelope.accessCode),
      issuedAt: now,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
  };
}

async function dispatchToWebhook(url: string, payload: Record<string, unknown>): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.warn("Judge dispatch webhook returned non-2xx", {
        status: response.status,
        url,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.warn("Judge dispatch webhook failed", { url, error });
    return false;
  }
}

export async function dispatchJudgeAccess(params: {
  recipient: JudgeAccessRecipient;
  channel: DeliveryChannel;
  envelope: JudgeAccessEnvelope;
  capsuleId: string;
}): Promise<{ emailSent: boolean; whatsappSent: boolean }> {
  ensureRecipientAllowed(params.recipient);

  const inviteLink = `${params.envelope.dashboardUrl}?cid=${encodeURIComponent(params.capsuleId)}&jt=${encodeURIComponent(params.envelope.inviteToken)}`;
  const message = [
    "SingulAI Audit Invitation",
    `Recipient: ${params.recipient.recipientName}`,
    `Link: ${inviteLink}`,
    `Access code: ${params.envelope.accessCode}`,
    "This invitation is single-use and restricted to authorized judges.",
  ].join("\n");

  const emailWebhook = process.env.EMAIL_DISPATCH_WEBHOOK_URL;
  const whatsappWebhook = process.env.WHATSAPP_DISPATCH_WEBHOOK_URL;

  let emailSent = false;
  let whatsappSent = false;

  if ((params.channel === "email" || params.channel === "both") && params.recipient.recipientEmail) {
    if (emailWebhook) {
      emailSent = await dispatchToWebhook(emailWebhook, {
        provider: "email",
        to: params.recipient.recipientEmail,
        subject: "SingulAI Audit Access",
        message,
        inviteLink,
        accessCode: params.envelope.accessCode,
        capsuleId: params.capsuleId,
      });
    } else {
      logger.warn("EMAIL_DISPATCH_WEBHOOK_URL is not configured");
    }
  }

  if ((params.channel === "whatsapp" || params.channel === "both") && params.recipient.recipientWhatsapp) {
    if (whatsappWebhook) {
      whatsappSent = await dispatchToWebhook(whatsappWebhook, {
        provider: "whatsapp",
        to: params.recipient.recipientWhatsapp,
        message,
        inviteLink,
        accessCode: params.envelope.accessCode,
        capsuleId: params.capsuleId,
      });
    } else {
      logger.warn("WHATSAPP_DISPATCH_WEBHOOK_URL is not configured");
    }
  }

  return { emailSent, whatsappSent };
}

export function verifyInviteToken(hash: string, token: string): boolean {
  return hashValue(token) === hash;
}

export function verifyAccessCode(hash: string, code: string): boolean {
  return hashValue(code.toUpperCase()) === hash;
}
