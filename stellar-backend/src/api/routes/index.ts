import { Express, Router } from "express";
import logger from "../../lib/logger.js";
import authRoutes from "./auth.js";
import userRoutes from "./user.js";
import avatarRoutes from "./avatar.js";
import capsuleRoutes from "./capsule.js";
import legacyRoutes from "./legacy.js";
import consentRoutes from "./consent.js";
import transactionRoutes from "./transaction.js";
import auditRoutes from "./audit.js";
import aiModelsRoutes from "./ai-models.js";
import avatarProRoutes from "./avatarpro.js";
import capsulesRoutes from "./capsules.js";
import legacyRulesRoutes from "./legacy-rules.js";
import sglRoutes from "./sgl.js";
import walletsRoutes from "./wallets.js";
import xaiRoutes from "./xai.js";

/**
 * Setup all API routes
 * Attach routes to Express app
 */
function setupRoutes(app: Express): void {
  const apiV1Router = Router();

  // Prefix for all routes: /api/v1
  const apiVersion = "/api/v1";

  // ─── Authentication Routes ────────────────────────────────────────────
  apiV1Router.use("/auth", authRoutes);

  // ─── User Routes ──────────────────────────────────────────────────────
  apiV1Router.use("/user", userRoutes);

  // ─── Avatar Routes ────────────────────────────────────────────────────
  apiV1Router.use("/avatar", avatarRoutes);

  // ─── Capsule Routes ───────────────────────────────────────────────────
  apiV1Router.use("/capsule", capsuleRoutes);

  // ─── Legacy Routes ────────────────────────────────────────────────────
  apiV1Router.use("/legacy", legacyRoutes);

  // ─── Consent Routes ───────────────────────────────────────────────────
  apiV1Router.use("/consent", consentRoutes);

  // ─── Transaction Routes ───────────────────────────────────────────────
  apiV1Router.use("/transaction", transactionRoutes);

  // ─── Audit Routes ─────────────────────────────────────────────────────
  apiV1Router.use("/audit", auditRoutes);

  // ─── AI Models Routes ─────────────────────────────────────────────────
  apiV1Router.use("/ai-models", aiModelsRoutes);

  // ─── AvatarPro Integration Routes ─────────────────────────────────────
  apiV1Router.use("/avatarpro", avatarProRoutes);
  apiV1Router.use("/capsules", capsulesRoutes);
  apiV1Router.use("/legacy-rules", legacyRulesRoutes);
  apiV1Router.use("/sgl", sglRoutes);
  apiV1Router.use("/wallets", walletsRoutes);
  apiV1Router.use("/xai", xaiRoutes);

  // Attach all routes under /api/v1 prefix
  app.use(apiVersion, apiV1Router);

  logger.info(`✅ API v1 routes configured under ${apiVersion}`);
}

export default setupRoutes;
