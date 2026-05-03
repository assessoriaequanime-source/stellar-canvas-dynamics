import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../middlewares/errorHandler";
import { parseOrThrow } from "../../lib/validation";
import { updateUserSchema } from "../validators/user";

const router = Router();

type RequestWithUser = Request & {
  user?: {
    userId: string;
    walletAddress: string;
  };
};

router.get("/profile", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestWithUser = req as RequestWithUser;
    const userId = requestWithUser.user?.userId;

    if (!userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        walletAddress: true,
        nickname: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found", "USER_NOT_FOUND");
    }

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
});

router.patch("/profile", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requestWithUser = req as RequestWithUser;
    const userId = requestWithUser.user?.userId;

    if (!userId) {
      throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
    }

    const payload = parseOrThrow(updateUserSchema, req.body);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: payload,
      select: {
        id: true,
        walletAddress: true,
        nickname: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
});

export default router;
