// Simple structured logger for Next.js that works with Turbopack
// In production, logs are captured by Vercel and can be sent to external services

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  [key: string]: unknown;
}

// Fields to redact from logs
const REDACT_FIELDS = [
  "access_token",
  "plaid_access_token",
  "stripe_secret_key",
  "authorization",
  "password",
  "secret",
];

function redactSensitiveData(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(redactSensitiveData);
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    const lowerKey = key.toLowerCase();
    if (REDACT_FIELDS.some((field) => lowerKey.includes(field))) {
      result[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      result[key] = redactSensitiveData(value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

function formatLog(
  level: LogLevel,
  context: LogContext,
  message: string
): string {
  const timestamp = new Date().toISOString();
  const redactedContext = redactSensitiveData(context) as Record<string, unknown>;
  return JSON.stringify({
    timestamp,
    level: level.toUpperCase(),
    message,
    ...(redactedContext ?? {}),
  });
}

const isProduction = process.env.NODE_ENV === "production";
const logLevel = isProduction ? "info" : "debug";

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return levels[level] >= levels[logLevel];
}

const logger = {
  debug(context: LogContext, message: string): void {
    if (shouldLog("debug")) {
      console.debug(formatLog("debug", context, message));
    }
  },

  info(context: LogContext, message: string): void {
    if (shouldLog("info")) {
      console.info(formatLog("info", context, message));
    }
  },

  warn(context: LogContext, message: string): void {
    if (shouldLog("warn")) {
      console.warn(formatLog("warn", context, message));
    }
  },

  error(context: LogContext, message: string): void {
    if (shouldLog("error")) {
      console.error(formatLog("error", context, message));
    }
  },
};

export default logger;

// Convenience exports
export const logInfo = (context: LogContext, message: string): void => {
  logger.info(context, message);
};

export const logError = (context: LogContext, message: string): void => {
  logger.error(context, message);
};

export const logWarn = (context: LogContext, message: string): void => {
  logger.warn(context, message);
};

export const logDebug = (context: LogContext, message: string): void => {
  logger.debug(context, message);
};
