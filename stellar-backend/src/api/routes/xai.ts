import { Router, Request, Response } from 'express';

const router = Router();

const XAI_API_KEY = process.env.XAI_API_KEY;

if (!XAI_API_KEY) {
  console.warn(`⚠️ XAI_API_KEY not set. Voice Agent will not work.`);
}

/**
 * POST /api/xai/token
 * Mint ephemeral session token for browser-based WebSocket connection
 * Valid for 5 minutes (300 seconds)
 */
router.post('/token', async (_req: Request, res: Response): Promise<void> => {
  if (!XAI_API_KEY) {
    res.status(503).json({ error: 'XAI_API_KEY not configured' });
    return;
  }

  try {
    const response = await fetch('https://api.x.ai/v1/realtime/client_secrets', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${XAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        expires_after: { seconds: 300 }, // 5 minutes
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`xAI token error: ${response.status} ${err}`);
      res.status(response.status).json({ error: 'Failed to mint token' });
      return;
    }

    const data = (await response.json()) as {
      value: string;
      expires_at: number;
    };

    res.json({
      token: data.value,
      expiresAt: data.expires_at,
      expiresIn: (data.expires_at - Date.now() / 1000),
    });
  } catch (err) {
    console.error('xAI token endpoint error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
