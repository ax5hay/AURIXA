import { config as dotenvConfig } from "dotenv";
import { z, ZodSchema, ZodError } from "zod";

// ---------------------------------------------------------------------------
// Load .env files (call early so process.env is populated before validation)
// ---------------------------------------------------------------------------
dotenvConfig(); // loads .env from cwd
dotenvConfig({ path: "../../.env", override: false }); // monorepo root fallback

// ---------------------------------------------------------------------------
// Service names (canonical, used across the entire platform)
// ---------------------------------------------------------------------------
export const SERVICE_NAMES = {
  API_GATEWAY: "api-gateway",
  WEB_APP: "web-app",
  AI_ORCHESTRATOR: "ai-orchestrator",
  MARKET_DATA: "market-data",
  PORTFOLIO_SERVICE: "portfolio-service",
  RISK_ENGINE: "risk-engine",
  TRADE_EXECUTOR: "trade-executor",
  NOTIFICATION_SERVICE: "notification-service",
  AUTH_SERVICE: "auth-service",
  USER_SERVICE: "user-service",
  STRATEGY_SERVICE: "strategy-service",
  BACKTESTING_SERVICE: "backtesting-service",
} as const;

export type ServiceName = (typeof SERVICE_NAMES)[keyof typeof SERVICE_NAMES];

// ---------------------------------------------------------------------------
// Default ports — deterministic mapping so services can discover each other
// ---------------------------------------------------------------------------
export const DEFAULT_PORTS: Record<ServiceName, number> = {
  [SERVICE_NAMES.API_GATEWAY]: 3000,
  [SERVICE_NAMES.WEB_APP]: 3001,
  [SERVICE_NAMES.AI_ORCHESTRATOR]: 4000,
  [SERVICE_NAMES.MARKET_DATA]: 4001,
  [SERVICE_NAMES.PORTFOLIO_SERVICE]: 4002,
  [SERVICE_NAMES.RISK_ENGINE]: 4003,
  [SERVICE_NAMES.TRADE_EXECUTOR]: 4004,
  [SERVICE_NAMES.NOTIFICATION_SERVICE]: 4005,
  [SERVICE_NAMES.AUTH_SERVICE]: 4006,
  [SERVICE_NAMES.USER_SERVICE]: 4007,
  [SERVICE_NAMES.STRATEGY_SERVICE]: 4008,
  [SERVICE_NAMES.BACKTESTING_SERVICE]: 4009,
};

// ---------------------------------------------------------------------------
// Service Registry – maps service names to host:port for inter-service calls
// ---------------------------------------------------------------------------
export interface ServiceEndpoint {
  host: string;
  port: number;
}

export type ServiceRegistry = Record<ServiceName, ServiceEndpoint>;

/**
 * Build a ServiceRegistry from environment variables or fall back to defaults.
 *
 * Env convention:  `<SERVICE_KEY>_HOST` / `<SERVICE_KEY>_PORT`
 * e.g. `API_GATEWAY_HOST=0.0.0.0`, `API_GATEWAY_PORT=3000`
 */
export function buildServiceRegistry(): ServiceRegistry {
  const registry = {} as Record<string, ServiceEndpoint>;

  for (const [key, name] of Object.entries(SERVICE_NAMES)) {
    const envHost = process.env[`${key}_HOST`];
    const envPort = process.env[`${key}_PORT`];

    registry[name] = {
      host: envHost ?? "127.0.0.1",
      port: envPort ? parseInt(envPort, 10) : DEFAULT_PORTS[name as ServiceName],
    };
  }

  return registry as ServiceRegistry;
}

/**
 * Convenience: get the URL for a service (http://host:port).
 */
export function getServiceUrl(
  service: ServiceName,
  registry?: ServiceRegistry,
): string {
  const reg = registry ?? buildServiceRegistry();
  const { host, port } = reg[service];
  return `http://${host}:${port}`;
}

// ---------------------------------------------------------------------------
// Generic env config loader with Zod validation
// ---------------------------------------------------------------------------

export interface LoadConfigOptions<T extends ZodSchema> {
  /** Zod schema that describes the expected shape */
  schema: T;
  /**
   * Optional mapping from schema keys to env var names.
   * If omitted, keys are converted to SCREAMING_SNAKE_CASE automatically.
   *  e.g. `databaseUrl` -> `DATABASE_URL`
   */
  envMap?: Partial<Record<keyof z.infer<T>, string>>;
  /**
   * Extra values merged *before* validation (useful for injecting defaults
   * that don't live in process.env).
   */
  defaults?: Partial<z.infer<T>>;
}

/**
 * Convert a camelCase / PascalCase key to SCREAMING_SNAKE_CASE.
 *
 * Examples:
 *   databaseUrl  -> DATABASE_URL
 *   jwtSecret    -> JWT_SECRET
 *   logLevel     -> LOG_LEVEL
 */
function toScreamingSnake(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1_$2")
    .toUpperCase();
}

/**
 * Load and validate configuration from `process.env` using a Zod schema.
 *
 * ```ts
 * const AppConfig = z.object({
 *   port: z.coerce.number().default(3000),
 *   databaseUrl: z.string().url(),
 *   logLevel: z.enum(["debug","info","warn","error"]).default("info"),
 * });
 *
 * const config = loadConfig({ schema: AppConfig });
 * // config.port      -> number
 * // config.databaseUrl -> string
 * ```
 */
export function loadConfig<T extends ZodSchema>(
  options: LoadConfigOptions<T>,
): z.infer<T> {
  const { schema, envMap = {}, defaults = {} } = options;

  // Derive the expected keys from the schema (works for ZodObject)
  const shape =
    "shape" in schema ? (schema as unknown as { shape: Record<string, unknown> }).shape : {};

  const raw: Record<string, unknown> = { ...defaults };

  for (const key of Object.keys(shape)) {
    const envKey =
      (envMap as Record<string, string | undefined>)[key] ?? toScreamingSnake(key);
    const envVal = process.env[envKey];
    if (envVal !== undefined) {
      raw[key] = envVal;
    }
  }

  const result = schema.safeParse(raw);

  if (!result.success) {
    const formatted = formatZodError(result.error);
    throw new ConfigValidationError(
      `Configuration validation failed:\n${formatted}`,
      result.error,
    );
  }

  return result.data as z.infer<T>;
}

// ---------------------------------------------------------------------------
// Shared / common config schemas (re-usable across services)
// ---------------------------------------------------------------------------

/** Shared database connection config */
export const DatabaseConfigSchema = z.object({
  databaseUrl: z.string().min(1, "DATABASE_URL is required"),
  databasePoolMin: z.coerce.number().int().nonnegative().default(2),
  databasePoolMax: z.coerce.number().int().positive().default(10),
});

/** Shared Redis config */
export const RedisConfigSchema = z.object({
  redisUrl: z.string().default("redis://127.0.0.1:6379"),
});

/** Shared JWT / auth config */
export const AuthConfigSchema = z.object({
  jwtSecret: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  jwtIssuer: z.string().default("aurixa"),
  jwtExpiresIn: z.string().default("1h"),
});

/** Shared server config (every HTTP service needs this) */
export const ServerConfigSchema = z.object({
  port: z.coerce.number().int().positive().default(3000),
  host: z.string().default("0.0.0.0"),
  nodeEnv: z.enum(["development", "production", "test"]).default("development"),
  logLevel: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
});

// ---------------------------------------------------------------------------
// Error helpers
// ---------------------------------------------------------------------------

export class ConfigValidationError extends Error {
  public readonly zodError: ZodError;

  constructor(message: string, zodError: ZodError) {
    super(message);
    this.name = "ConfigValidationError";
    this.zodError = zodError;
  }
}

function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
      return `  - ${path}: ${issue.message}`;
    })
    .join("\n");
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------
export { z } from "zod";
