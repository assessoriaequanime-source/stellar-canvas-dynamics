import { requestJson } from "./http";
import { DEMO_AVATAR_ID, DEMO_WALLET_ADDRESS, isExplicitAvatarProDemoMode } from "./demoMode";

export function getCurrentUser() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      authenticated: true,
      user: {
        id: "demo-user-avatarpro",
        name: "Hackathon Reviewer",
        email: "reviewer@singulai.live",
        role: "AvatarPro Demo User",
        walletAddress: DEMO_WALLET_ADDRESS,
      },
    });
  }
  return requestJson<{ authenticated?: boolean; user?: Record<string, unknown> }>("/auth/me");
}

export function getProfile() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      name: "Hackathon Reviewer",
      email: "reviewer@singulai.live",
      role: "AvatarPro Demo User",
    });
  }
  return requestJson<Record<string, unknown>>("/user/profile");
}

export function getWalletStatus() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      walletAddress: DEMO_WALLET_ADDRESS,
      network: "Solana Devnet / Demo",
      sglBalance: 10000,
      status: "provisioned",
    });
  }
  return requestJson<Record<string, unknown>>("/avatarpro/wallet");
}

export function getAvatarProStatus() {
  if (isExplicitAvatarProDemoMode()) {
    return Promise.resolve({
      avatarId: DEMO_AVATAR_ID,
      status: "active",
      mode: "Safe Quantum",
      absorptionScore: 0.72,
      omegaScore: 0.68,
    });
  }
  return requestJson<Record<string, unknown>>("/avatarpro/status");
}
