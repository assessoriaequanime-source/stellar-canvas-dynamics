import { requestJson } from "./http";

export function getCurrentUser() {
  return requestJson<{ authenticated?: boolean; user?: Record<string, unknown> }>("/auth/me");
}

export function getProfile() {
  return requestJson<Record<string, unknown>>("/user/profile");
}

export function getWalletStatus() {
  return requestJson<Record<string, unknown>>("/avatarpro/wallet");
}

export function getAvatarProStatus() {
  return requestJson<Record<string, unknown>>("/avatarpro/status");
}
