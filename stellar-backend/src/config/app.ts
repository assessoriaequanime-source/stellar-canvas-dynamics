import express, { Express, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

import { setupMiddlewares } from "./express-setup";
import setupRoutes from "../api/routes";
import errorHandler from "../api/middlewares/errorHandler";

/**
 * Create and configure Express application
 */
function createApp(): Express {
  const app = express();

  // Trust proxy (important for rate limiting behind Nginx)
  app.set("trust proxy", 1);

  // Security: Helmet
  app.use(helmet());

  // CORS: Allow only configured origins
  app.use(
    cors({
      origin: process.env.CORS_ORIGIN?.split(",") || "http://localhost:5173",
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );

  // Rate limiting: 10 requests per second per IP (per .env config)
  const limiter = rateLimit({
    windowMs: 1 * 1000, // 1 second
    max: 10, // 10 requests per windowMs
    message: "Too many requests from this IP, please try again later.",
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req: Request) => {
      // Skip rate limiting for health checks
      return req.path === "/health";
    },
  });
  if (process.env.NODE_ENV !== "test") {
    app.use(limiter);
  }

  // Body parsing
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Custom middlewares (logging, etc)
  setupMiddlewares(app);

  // Health check endpoint (no logging)
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    });
  });

  // Metrics endpoint (IP-restricted, optional)
  app.get("/metrics", (_req: Request, res: Response) => {
    // TODO: Implement Prometheus metrics
    res.status(200).json({
      message: "Metrics endpoint (coming soon)",
    });
  });

  // API Routes
  setupRoutes(app);

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: "Not Found",
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString(),
    });
  });

  // Global error handler (always last)
  app.use(errorHandler);

  return app;
}

export default createApp();
