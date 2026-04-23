import crypto from "crypto";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma";
import { verifyWalletSignature } from "../lib/web3";
import { AppError } from "../api/middlewares/errorHandler";
import type {
  ChallengeResponse,
  JwtAccessPayload,
  JwtRefreshPayload,
  VerifyResponse,
} from "../types/auth";

type ChallengeEntry = {
  message: string;
  expiresAt: number;
};

const challengeStore = new Map<string, ChallengeEntry>();
const CHALLENGE_TTL_MS = 5 * 60 * 1000;
const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new AppError(500, "JWT secret not configured", "JWT_SECRET_MISSING");
  }
  return secret;
}

function buildChallengeMessage(walletAddress: string, nonce: string): string {
  return [
    "Sign in to Stellar Backend",
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");
}

function signAccessToken(payload: JwtAccessPayload): string {
  const options: jwt.SignOptions = {
    expiresIn: (process.env.JWT_EXPIRATION || "15m") as jwt.SignOptions["expiresIn"],
  };

  return jwt.sign(payload, getJwtSecret() as jwt.Secret, options);
}

function signRefreshToken(payload: JwtRefreshPayload): string {
  return jwt.sign(payload, getJwtSecret() as jwt.Secret, {
    expiresIn: "7d",
  });
}

function verifyRefreshToken(refreshToken: string): JwtRefreshPayload {
  const decoded = jwt.verify(refreshToken, getJwtSecret()) as JwtRefreshPayload;

  if (decoded.type !== "refresh") {
    throw new AppError(401, "Invalid refresh token type", "INVALID_REFRESH_TOKEN");
  }

  return decoded;
}

export async function createChallenge(walletAddress: string): Promise<ChallengeResponse> {
  if (!walletAddress) {
    throw new AppError(400, "walletAddress is required", "WALLET_REQUIRED");
  }

  const nonce = crypto.randomBytes(16).toString("hex");
  const normalizedWallet = walletAddress.toLowerCase();
  const message = buildChallengeMessage(walletAddress, nonce);
  const expiresAt = Date.now() + CHALLENGE_TTL_MS;

  challengeStore.set(normalizedWallet, { message, expiresAt });

  return {
    walletAddress,
    challenge: message,
    expiresAt: new Date(expiresAt).toISOString(),
  };
}

export async function verifyChallengeAndIssueTokens(
  walletAddress: string,
  signature: string,
  meta?: { ipAddress?: string; userAgent?: string },
): Promise<VerifyResponse> {
  if (!walletAddress || !signature) {
    throw new AppError(400, "walletAddress and signature are required", "AUTH_FIELDS_REQUIRED");
  }

  const normalizedWallet = walletAddress.toLowerCase();
  const challengeEntry = challengeStore.get(normalizedWallet);

  if (!challengeEntry || challengeEntry.expiresAt < Date.now()) {
    challengeStore.delete(normalizedWallet);
    throw new AppError(401, "Challenge expired or not found", "CHALLENGE_INVALID");
  }

  const isValid = verifyWalletSignature(challengeEntry.message, signature, walletAddress);
  if (!isValid) {
    throw new AppError(401, "Invalid wallet signature", "INVALID_SIGNATURE");
  }

  challengeStore.delete(normalizedWallet);

  const user = await prisma.user.upsert({
    where: { walletAddress: normalizedWallet },
    update: {},
    create: { walletAddress: normalizedWallet },
  });

  const accessToken = signAccessToken({
    sub: user.id,
    walletAddress: user.walletAddress,
    type: "access",
  });

  const provisionalSessionId = crypto.randomUUID();
  const refreshToken = signRefreshToken({
    sub: user.id,
    type: "refresh",
    sessionId: provisionalSessionId,
  });

  const expiresAt = new Date(Date.now() + REFRESH_TTL_MS);

  await prisma.session.create({
    data: {
      id: provisionalSessionId,
      userId: user.id,
      refreshToken,
      expiresAt,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
    },
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string }> {
  if (!refreshToken) {
    throw new AppError(400, "refreshToken is required", "REFRESH_REQUIRED");
  }

  const payload = verifyRefreshToken(refreshToken);

  const session = await prisma.session.findUnique({
    where: { id: payload.sessionId },
    include: { user: true },
  });

  if (!session || session.refreshToken !== refreshToken || session.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, "Refresh session invalid or expired", "REFRESH_INVALID");
  }

  const accessToken = signAccessToken({
    sub: session.user.id,
    walletAddress: session.user.walletAddress,
    type: "access",
  });

  return { accessToken };
}

export async function logout(refreshToken: string): Promise<void> {
  if (!refreshToken) {
    throw new AppError(400, "refreshToken is required", "REFRESH_REQUIRED");
  }

  const payload = verifyRefreshToken(refreshToken);

  await prisma.session.deleteMany({
    where: {
      id: payload.sessionId,
      refreshToken,
    },
  });
}
