import { Express, Router } from "express";
import logger from "../../lib/logger";
import authRoutes from "./auth";
import userRoutes from "./user";
import avatarRoutes from "./avatar";
import capsuleRoutes from "./capsule";
import legacyRoutes from "./legacy";
import consentRoutes from "./consent";
import transactionRoutes from "./transaction";
import auditRoutes from "./audit";

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

  // Attach all routes under /api/v1 prefix
  app.use(apiVersion, apiV1Router);

  logger.info(`✅ API v1 routes configured under ${apiVersion}`);
}

export default setupRoutes;
