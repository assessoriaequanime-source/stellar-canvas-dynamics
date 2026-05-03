import { Router, Request, Response, NextFunction } from "express";
import { requireAuth } from "../middlewares/auth";
import { AppError } from "../middlewares/errorHandler";
import { parseOrThrow } from "../../lib/validation";
import {
  aiModelCatalogQuerySchema,
  aiModelPreferenceGetQuerySchema,
  aiModelPreferenceUpsertSchema,
} from "../validators/ai-models";
import {
  getProviderPlan,
  getTenantPolicy,
  getProviderModel,
  listProviderModels,
} from "../../integrations/avatar-interaction";

const router = Router();

type RequestWithUser = Request & {
  user?: {
    userId: string;
    walletAddress: string;
  };
};

type InMemoryPreference = {
  tenantId: string;
  userId: string;
  activePlanId: string;
  userPlanTier: "essential" | "professional" | "curator_digital";
  preferredModelId?: string;
};

const userPreferences = new Map<string, InMemoryPreference>();

function ensureUserId(req: Request): string {
  const userId = (req as RequestWithUser).user?.userId;
  if (!userId) {
    throw new AppError(401, "Unauthorized", "UNAUTHORIZED");
  }
  return userId;
}

function readEnvFlag(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];
  if (!raw) return defaultValue;
  return raw.toLowerCase() === "true";
}

function preferenceKey(tenantId: string, userId: string): string {
  return `${tenantId}:${userId}`;
}

router.get("/catalog", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = parseOrThrow(aiModelCatalogQuerySchema, req.query);

    const tenantPolicy = getTenantPolicy(query.tenantId);
    const plan = query.activePlanId ? getProviderPlan(query.activePlanId) : undefined;

    let models = listProviderModels().filter((m) => m.enabled);

    if (tenantPolicy) {
      models = models.filter(
        (m) =>
          tenantPolicy.enabledProviders.includes(m.provider) &&
          !tenantPolicy.blockedModelIds.includes(m.id),
      );
    }

    if (plan) {
      if (!plan.enabled || !plan.allowedUserPlans.includes(query.userPlanTier)) {
        models = [];
      } else {
        const allowedSet = new Set(plan.allowedModelIds);
        models = models.filter((m) => allowedSet.has(m.id));
      }
    }

    res.status(200).json({
      selectionEnabled: readEnvFlag("AI_PROVIDER_ALLOW_USER_MODEL_CHOICE", false),
      models,
    });
  } catch (error) {
    next(error);
  }
});

router.get("/preference", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const query = parseOrThrow(aiModelPreferenceGetQuerySchema, req.query);

    const existing = userPreferences.get(preferenceKey(query.tenantId, userId));

    res.status(200).json({
      found: Boolean(existing),
      preference: existing ?? null,
      selectionEnabled: readEnvFlag("AI_PROVIDER_ALLOW_USER_MODEL_CHOICE", false),
    });
  } catch (error) {
    next(error);
  }
});

router.put("/preference", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = ensureUserId(req);
    const payload = parseOrThrow(aiModelPreferenceUpsertSchema, req.body);

    const plan = getProviderPlan(payload.activePlanId);
    if (!plan || !plan.enabled) {
      throw new AppError(400, "Active plan is not available", "PLAN_INVALID");
    }

    if (!plan.allowedUserPlans.includes(payload.userPlanTier)) {
      throw new AppError(400, "User plan tier is not allowed for selected plan", "PLAN_TIER_NOT_ALLOWED");
    }

    const selectionEnabled = readEnvFlag("AI_PROVIDER_ALLOW_USER_MODEL_CHOICE", false);

    let preferredModelId = payload.preferredModelId;
    if (!selectionEnabled) {
      preferredModelId = undefined;
    }

    if (preferredModelId) {
      if (!plan.allowedModelIds.includes(preferredModelId)) {
        throw new AppError(400, "Preferred model is not allowed by plan", "MODEL_NOT_ALLOWED_BY_PLAN");
      }

      const model = getProviderModel(preferredModelId);
      if (!model || !model.enabled) {
        throw new AppError(400, "Preferred model is not available", "MODEL_UNAVAILABLE");
      }

      const tenantPolicy = getTenantPolicy(payload.tenantId);
      if (tenantPolicy) {
        if (!tenantPolicy.enabledProviders.includes(model.provider)) {
          throw new AppError(400, "Preferred model provider not enabled for tenant", "MODEL_PROVIDER_NOT_ENABLED");
        }
        if (tenantPolicy.blockedModelIds.includes(model.id)) {
          throw new AppError(400, "Preferred model blocked by tenant policy", "MODEL_BLOCKED");
        }
      }
    }

    const saved: InMemoryPreference = {
      tenantId: payload.tenantId,
      userId,
      activePlanId: payload.activePlanId,
      userPlanTier: payload.userPlanTier,
      preferredModelId,
    };

    userPreferences.set(preferenceKey(payload.tenantId, userId), saved);

    res.status(200).json({
      success: true,
      preference: saved,
      selectionEnabled,
      message: selectionEnabled
        ? "Plan and model preference saved"
        : "Plan saved; model selection is currently disabled",
    });
  } catch (error) {
    next(error);
  }
});

export default router;
