import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import app from "./config/app";
import logger from "./lib/logger";

const parsedPort = Number(process.env.PORT);
const PORT = Number.isInteger(parsedPort) ? parsedPort : 9200;
const HOST = process.env.HOST || "127.0.0.1";

/**
 * Start Express server
 */
async function startServer() {
  try {
    // Start listening on configured port
    const server = app.listen(PORT, HOST, () => {
      logger.info(`🚀 Stellar Backend API listening on http://${HOST}:${PORT}`);
      logger.info(`📡 Environment: ${process.env.NODE_ENV || "development"}`);
      logger.info(`♻️  Health check available at http://${HOST}:${PORT}/health`);
    });

    // Graceful shutdown
    const shutdown = (signal: string) => {
      logger.info(`\n⏹️  ${signal} received, shutting down gracefully...`);

      server.close(() => {
        logger.info("✅ Server closed");
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error("⚠️  Force shutdown after 10 seconds");
        process.exit(1);
      }, 10000);
    };

    process.on("SIGTERM", () => shutdown("SIGTERM"));
    process.on("SIGINT", () => shutdown("SIGINT"));

    // Unhandled rejection
    process.on("unhandledRejection", (reason, promise) => {
      logger.error("Unhandled Rejection at:", promise, "reason:", reason);
    });

    // Uncaught exception
    process.on("uncaughtException", (error) => {
      logger.error("Uncaught Exception:", error);
      process.exit(1);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

// Only start server if this is the main module
if (require.main === module) {
  startServer();
}

export default startServer;
