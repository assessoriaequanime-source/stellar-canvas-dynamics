import { Express, Request, Response, NextFunction } from "express";
import morgan from "morgan";
import logger from "../lib/logger";

type RequestWithId = Request & { id?: string };

/**
 * Setup custom middlewares
 */
export function setupMiddlewares(app: Express): void {
  // Morgan HTTP request logging
  const morganFormat = process.env.NODE_ENV === "development" ? "dev" : "combined";

  app.use(
    morgan(morganFormat, {
      stream: {
        write: (message: string) => {
          logger.info(message.trim());
        },
      },
      skip: (req: Request) => {
        // Skip logging for health checks
        return req.path === "/health" || req.path === "/metrics";
      },
    })
  );

  // Request ID middleware (useful for tracing)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const headerValue = req.headers["x-request-id"];
    const requestId = Array.isArray(headerValue)
      ? headerValue[0]
      : headerValue || `${Date.now()}-${Math.random()}`;
    (req as RequestWithId).id = requestId;
    res.setHeader("X-Request-ID", requestId);
    next();
  });

  // Catch request body parsing errors
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof SyntaxError && "body" in err) {
      logger.error("Invalid JSON in request body:", err.message);
      return res.status(400).json({
        error: "Invalid JSON",
        message: err.message,
      });
    }
    return next(err);
  });
}
