export const ALT_API_BASE: string =
  import.meta.env.VITE_ALT_API_BASE || "https://singulai.live/alt-api";

export interface SimpleLoginResponse {
  ok: boolean;
  valid?: boolean;
  authKind?: string;
  session?: string;
  sessionToken?: string;
  user?: Record<string, unknown>;
  wallet?: Record<string, unknown>;
  sglBalance?: number;
  message?: string;
}

export interface VerifySessionResponse {
  ok: boolean;
  valid: boolean;
  user?: Record<string, unknown>;
  wallet?: Record<string, unknown>;
}

export interface AvatarMessageResponse {
  ok: boolean;
  message?: string;
  reply?: string;
  text?: string;
  balance?: number;
  sglBalance?: number;
}

export async function simpleLogin(identifier: string): Promise<SimpleLoginResponse> {
  const res = await fetch(`${ALT_API_BASE}/auth/simple`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function verifyAltSession(
  sessionToken: string,
): Promise<VerifySessionResponse | null> {
  try {
    const res = await fetch(`${ALT_API_BASE}/auth/verify-session`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionToken }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function sendAvatarMessage(
  sessionToken: string,
  message: string,
  modelId: string,
): Promise<AvatarMessageResponse> {
  const res = await fetch(`${ALT_API_BASE}/avatar/message`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${sessionToken}`,
    },
    body: JSON.stringify({ message, modelId }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}
