import pino, { Logger, LoggerOptions, Level } from "pino";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PerformanceTimer {
  /** Call when the operation is done. Logs elapsed time at "info" level. */
  done: (message: string, extra?: Record<string, unknown>) => void;
}

export interface AurixaLogger extends Logger {
  /**
   * Return a child logger that includes the given correlation ID in every
   * log entry.  Useful for tracing a single request across services.
   */
  withCorrelationId(correlationId: string): AurixaLogger;

  /**
   * Start a high-resolution performance timer.
   *
   * ```ts
   * const timer = logger.startTimer();
   * await doExpensiveWork();
   * timer.done("expensive work finished");
   * ```
   */
  startTimer(): PerformanceTimer;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_LEVELS: Set<string> = new Set([
  "trace",
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
  "silent",
]);

function resolveLevel(): Level | "silent" {
  const env = (process.env.LOG_LEVEL ?? "info").toLowerCase();
  return VALID_LEVELS.has(env) ? (env as Level | "silent") : "info";
}

function isDevEnvironment(): boolean {
  const env = process.env.NODE_ENV ?? "development";
  return env === "development" || env === "test";
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export interface CreateLoggerOptions {
  /** Logical service name, bound to every log entry. */
  service: string;
  /** Override the log level (default: from `LOG_LEVEL` env var, or "info"). */
  level?: Level | "silent";
  /** Extra bindings merged into every log entry. */
  bindings?: Record<string, unknown>;
  /** Force pretty-printing on or off (default: auto-detect from NODE_ENV). */
  pretty?: boolean;
}

/**
 * Create a structured Pino logger pre-configured for AURIXA services.
 *
 * Features:
 *  - Service name bound to every entry
 *  - Correlation-ID propagation via `logger.withCorrelationId(id)`
 *  - Built-in performance timer via `logger.startTimer()`
 *  - Pretty printing in development, JSON in production
 *  - Log level driven by `LOG_LEVEL` env var
 */
export function createLogger(options: CreateLoggerOptions | string): AurixaLogger {
  const opts: CreateLoggerOptions =
    typeof options === "string" ? { service: options } : options;

  const {
    service,
    level = resolveLevel(),
    bindings = {},
    pretty = isDevEnvironment(),
  } = opts;

  const pinoOpts: LoggerOptions = {
    level,
    // Include ISO timestamp in every entry
    timestamp: pino.stdTimeFunctions.isoTime,
    // Base bindings present in every log line
    base: {
      service,
      ...bindings,
    },
    // Format options for message key (keep "msg" default in JSON)
    ...(pretty
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss.l",
              ignore: "pid,hostname",
              singleLine: false,
            },
          },
        }
      : {}),
  };

  const baseLogger = pino(pinoOpts);

  // Extend the logger with AURIXA-specific methods
  return extendLogger(baseLogger);
}

/**
 * Attach `withCorrelationId` and `startTimer` to any Pino logger instance.
 */
function extendLogger(logger: Logger): AurixaLogger {
  const extended = logger as AurixaLogger;

  extended.withCorrelationId = function (correlationId: string): AurixaLogger {
    const child = this.child({ correlationId });
    return extendLogger(child);
  };

  extended.startTimer = function (): PerformanceTimer {
    const start = process.hrtime.bigint();
    const self = this;

    return {
      done(message: string, extra?: Record<string, unknown>) {
        const elapsed = Number(process.hrtime.bigint() - start) / 1_000_000; // ms
        self.info({ durationMs: Math.round(elapsed * 100) / 100, ...extra }, message);
      },
    };
  };

  return extended;
}

// ---------------------------------------------------------------------------
// Convenience: pre-built "root" logger for quick scripts
// ---------------------------------------------------------------------------

export const rootLogger: AurixaLogger = createLogger({
  service: "aurixa",
  level: resolveLevel(),
});

// ---------------------------------------------------------------------------
// Re-exports so consumers don't need to depend on pino directly
// ---------------------------------------------------------------------------
export type { Logger, Level } from "pino";
