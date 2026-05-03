import { Router, Request, Response, NextFunction } from "express";
import {
  createChallenge,
  logout,
  refreshAccessToken,
  verifyChallengeAndIssueTokens,
} from "../../services/auth";
import { requireAuth } from "../middlewares/auth";
import { parseOrThrow } from "../../lib/validation";
import {
  authChallengeSchema,
  authLogoutSchema,
  authRefreshSchema,
  authVerifySchema,
} from "../validators/auth";

const router = Router();

type RequestWithUser = Request & {
  user?: {
    userId: string;
    walletAddress: string;
  };
};

router.post("/challenge", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress } = parseOrThrow(authChallengeSchema, req.body);
    const payload = await createChallenge(walletAddress);
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

router.post("/verify", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { walletAddress, signature } = parseOrThrow(authVerifySchema, req.body);

    const payload = await verifyChallengeAndIssueTokens(walletAddress, signature, {
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

router.post("/refresh", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = parseOrThrow(authRefreshSchema, req.body);
    const payload = await refreshAccessToken(refreshToken);
    res.status(200).json(payload);
  } catch (error) {
    next(error);
  }
});

router.post("/logout", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = parseOrThrow(authLogoutSchema, req.body);
    await logout(refreshToken);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.get("/me", requireAuth, (req: Request, res: Response) => {
  const requestWithUser = req as RequestWithUser;
  res.status(200).json({
    authenticated: true,
    user: requestWithUser.user,
  });
});

export default router;
