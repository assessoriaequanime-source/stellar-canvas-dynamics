const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api/v1").replace(/\/$/, "");

export class AvatarProApiError extends Error {
  status?: number;
  code: string;

  constructor(message: string, code = "AVATARPRO_API_ERROR", status?: number) {
    super(message);
    this.name = "AvatarProApiError";
    this.code = code;
    this.status = status;
  }
}

interface RequestOptions {
  method?: "GET" | "POST";
  body?: unknown;
  token?: string | null;
}

export function getApiBase(): string {
  return API_BASE;
}

export function getSessionToken(): string | null {
  if (typeof window === "undefined") return null;
  return (
    localStorage.getItem("singulai_access_token") ||
    localStorage.getItem("singulai_session") ||
    null
  );
}

export async function requestJson<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const token = options.token ?? getSessionToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new AvatarProApiError("Backend unavailable", "BACKEND_UNAVAILABLE");
  }

  const text = await response.text();
  const parsed = text ? safeParse(text) : {};

  if (!response.ok) {
    const message =
      (parsed as Record<string, unknown>)?.message?.toString() ||
      (parsed as Record<string, unknown>)?.error?.toString() ||
      `Request failed (${response.status})`;
    throw new AvatarProApiError(message, "REQUEST_FAILED", response.status);
  }

  return parsed as T;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return { raw };
  }
}
