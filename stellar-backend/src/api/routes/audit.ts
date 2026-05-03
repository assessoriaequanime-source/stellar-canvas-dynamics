import { Router, Request, Response, NextFunction } from "express";
import prisma from "../../lib/prisma";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../middlewares/errorHandler";
import { parseOrThrow } from "../../lib/validation";
import { auditQuerySchema } from "../validators/audit";

const router = Router();

type RequestWithUser = Request & {
  user?: {
    userId: string;
    walletAddress: string;
  };
};

function ensureUserId(req: Request): string {
  const userId = (req as RequestWithUser).user?.userId;
  if (!userId) {
    throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
  }
  return userId;
}

router.get("/", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const query = parseOrThrow(auditQuerySchema, req.query);

    const logs = await prisma.auditLog.findMany({
      where: {
        userId,
        action: query.action,
        resource: query.resource,
      },
      orderBy: { createdAt: "desc" },
      take: query.limit || 50,
    });

    res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
});

export default router;
