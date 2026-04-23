import winston from "winston";
import path from "path";
import { fileURLToPath } from "url";

const currentFilePath = fileURLToPath(import.meta.url);
const currentDir = path.dirname(currentFilePath);
const logsDir = path.resolve(currentDir, "../../logs");

/**
 * Configure Winston Logger
 */
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: "stellar-backend" },
  transports: [
    // Console transport (always)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : "";
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),

    // File transports (only in production or if LOG_TO_FILE is set)
    ...(process.env.NODE_ENV === "production" || process.env.LOG_TO_FILE === "true"
      ? [
          new winston.transports.File({
            filename: path.join(logsDir, "error.log"),
            level: "error",
          }),
          new winston.transports.File({
            filename: path.join(logsDir, "combined.log"),
          }),
        ]
      : []),
  ],
});

export default logger;
