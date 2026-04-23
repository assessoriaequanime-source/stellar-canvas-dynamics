import { z } from "zod";

const walletAddressRegex = /^0x[a-fA-F0-9]{40}$/;

export const authChallengeSchema = z.object({
  walletAddress: z.string().regex(walletAddressRegex, "walletAddress must be a valid EVM address"),
});

export const authVerifySchema = z.object({
  walletAddress: z.string().regex(walletAddressRegex, "walletAddress must be a valid EVM address"),
  signature: z.string().min(64, "signature is required"),
});

export const authRefreshSchema = z.object({
  refreshToken: z.string().min(20, "refreshToken is required"),
});

export const authLogoutSchema = z.object({
  refreshToken: z.string().min(20, "refreshToken is required"),
});
