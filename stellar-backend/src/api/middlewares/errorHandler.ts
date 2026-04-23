import { Request, Response, NextFunction } from "express";
import logger from "../../lib/logger";

type RequestWithId = Request & { id?: string };

type ErrorWithCodeAndArray = {
  code?: string;
  stack?: string;
  array?: () => unknown;
};

/**
 * Custom error class
 */
export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Global error handler middleware
 * Should be the last middleware registered
 */
function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const requestId = (req as RequestWithId).id;
  const normalizedError = err as ErrorWithCodeAndArray;

  // Default to 500 Server Error
  let statusCode = 500;
  let message = "Internal Server Error";
  let code = "INTERNAL_ERROR";

  // Handle custom AppError
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || "CUSTOM_ERROR";
  }
  // Handle ValidationError (from express-validator or class-validator)
  else if (normalizedError.array && typeof normalizedError.array === "function") {
    statusCode = 400;
    message = "Validation Error";
    code = "VALIDATION_ERROR";
  }
  // Handle Prisma errors
  else if (normalizedError.code === "P2002") {
    statusCode = 409;
    message = "Unique constraint violation";
    code = "UNIQUE_CONSTRAINT";
  } else if (normalizedError.code === "P2025") {
    statusCode = 404;
    message = "Record not found";
    code = "NOT_FOUND";
  }

  // Log error
  const logLevel = statusCode >= 500 ? "error" : "warn";
  logger[logLevel as "error" | "warn"](`[${requestId}] ${statusCode} ${code}: ${message}`, {
    error: err,
    stack: normalizedError.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Send response
  res.status(statusCode).json({
    error: code,
    message,
    requestId,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === "development" && { stack: normalizedError.stack }),
  });
}

export default errorHandler;
