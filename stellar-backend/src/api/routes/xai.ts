import { Router, Request, Response } from "express";

const router = Router();

/**
 * POST /api/xai/token
 * Mint ephemeral session token for browser-based WebSocket connection
 * Valid for 5 minutes (300 seconds)
 */
router.post("/token", async (_req: Request, res: Response): Promise<void> => {
  const xaiApiKey = process.env.XAI_API_KEY;

  if (!xaiApiKey) {
    res.status(503).json({ error: "Voice Agent offline, use text chat" });
    return;
  }

  try {
    const response = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${xaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 }, // 5 minutes
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`xAI token error: ${response.status} ${err}`);
      res.status(503).json({ error: "Voice Agent offline, use text chat" });
      return;
    }

    const data = (await response.json()) as {
      value: string;
      expires_at: number;
    };

    res.json({
      token: data.value,
      expiresAt: data.expires_at,
      expiresIn: data.expires_at - Date.now() / 1000,
    });
  } catch (err) {
    console.error("xAI token endpoint error:", err);
    res.status(503).json({ error: "Voice Agent offline, use text chat" });
  }
});

export default router;
