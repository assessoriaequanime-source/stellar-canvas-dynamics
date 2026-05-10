// Use VITE_API_BASE_URL when available; otherwise default to production host root.
export const ALT_API_BASE: string =
  import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_ALT_API_BASE || "https://singulai.live";

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
  const payload = JSON.stringify({ message, modelId, avatar: modelId });
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${sessionToken}`,
  };

  // Prefer new production route; fall back to legacy route for compatibility.
  const primary = await fetch(`/api/v1/avatarpro/message`, {
    method: "POST",
    headers,
    body: payload,
  });

  if (primary.ok) return primary.json();
  if (primary.status !== 404) throw new Error(`HTTP ${primary.status}`);

  const legacy = await fetch(`/api/v1/avatar/message`, {
    method: "POST",
    headers,
    body: payload,
  });
  if (!legacy.ok) throw new Error(`HTTP ${legacy.status}`);
  return legacy.json();
}
