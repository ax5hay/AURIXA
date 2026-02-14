import { NodeSDK } from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import {
  BatchSpanProcessor,
  SimpleSpanProcessor,
  ConsoleSpanExporter,
} from "@opentelemetry/sdk-trace-node";
import { Resource } from "@opentelemetry/resources";
import {
  SEMRESATTRS_SERVICE_NAME,
  SEMRESATTRS_SERVICE_VERSION,
  SEMRESATTRS_DEPLOYMENT_ENVIRONMENT,
} from "@opentelemetry/semantic-conventions";
import {
  trace,
  context,
  SpanStatusCode,
  SpanKind,
  type Tracer,
  type Span,
  type SpanOptions,
} from "@opentelemetry/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TelemetryOptions {
  /** Logical service name, used as the OTEL resource attribute. */
  serviceName: string;
  /** Service version string (default: "0.1.0"). */
  serviceVersion?: string;
  /** OTLP collector endpoint (default: `OTEL_EXPORTER_OTLP_ENDPOINT` env or "http://localhost:4318"). */
  otlpEndpoint?: string;
  /** Set to true to also log spans to the console (useful in dev). */
  consoleExporter?: boolean;
  /** Environment name (default: `NODE_ENV` or "development"). */
  environment?: string;
}

// ---------------------------------------------------------------------------
// Module-level state
// ---------------------------------------------------------------------------

let sdk: NodeSDK | null = null;
let activeTracer: Tracer | null = null;
let serviceName: string = "unknown";

// ---------------------------------------------------------------------------
// Initialisation
// ---------------------------------------------------------------------------

/**
 * Initialize OpenTelemetry tracing for this process.
 *
 * Call this **once**, as early as possible (before importing other libraries
 * that should be auto-instrumented).
 *
 * ```ts
 * import { initTelemetry } from "@aurixa/telemetry";
 * initTelemetry({ serviceName: "api-gateway" });
 * ```
 */
export function initTelemetry(options: TelemetryOptions): NodeSDK {
  if (sdk) {
    return sdk; // already initialised — return existing instance
  }

  const {
    serviceVersion = process.env.SERVICE_VERSION ?? "0.1.0",
    otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? "http://localhost:4318",
    consoleExporter = process.env.NODE_ENV === "development",
    environment = process.env.NODE_ENV ?? "development",
  } = options;

  serviceName = options.serviceName;

  // Build resource attributes
  const resource = new Resource({
    [SEMRESATTRS_SERVICE_NAME]: serviceName,
    [SEMRESATTRS_SERVICE_VERSION]: serviceVersion,
    [SEMRESATTRS_DEPLOYMENT_ENVIRONMENT]: environment,
  });

  // OTLP exporter (sends spans over HTTP to the collector)
  const otlpExporter = new OTLPTraceExporter({
    url: `${otlpEndpoint}/v1/traces`,
  });

  // Span processors
  const spanProcessors = [new BatchSpanProcessor(otlpExporter)];

  if (consoleExporter) {
    spanProcessors.push(
      new SimpleSpanProcessor(new ConsoleSpanExporter()) as unknown as BatchSpanProcessor,
    );
  }

  sdk = new NodeSDK({
    resource,
    spanProcessors,
  });

  sdk.start();

  // Cache a tracer instance for convenience helpers
  activeTracer = trace.getTracer(serviceName, serviceVersion);

  // Graceful shutdown
  const shutdown = async () => {
    try {
      await sdk?.shutdown();
    } catch {
      // ignore shutdown errors
    }
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  return sdk;
}

// ---------------------------------------------------------------------------
// Tracer access
// ---------------------------------------------------------------------------

/**
 * Get the cached Tracer instance. Falls back to a no-op tracer if
 * `initTelemetry` has not been called.
 */
export function getTracer(): Tracer {
  if (activeTracer) return activeTracer;
  return trace.getTracer(serviceName);
}

// ---------------------------------------------------------------------------
// Span helpers
// ---------------------------------------------------------------------------

/**
 * Wrap an async function in a trace span. The span is automatically ended
 * when the function resolves or rejects.
 *
 * ```ts
 * const result = await createSpan("fetchMarketData", async () => {
 *   return fetch("https://...");
 * });
 * ```
 */
export async function createSpan<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
  options?: SpanOptions,
): Promise<T> {
  const tracer = getTracer();

  return tracer.startActiveSpan(
    name,
    { kind: SpanKind.INTERNAL, ...options },
    async (span: Span) => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        if (error instanceof Error) {
          span.recordException(error);
        }
        throw error;
      } finally {
        span.end();
      }
    },
  );
}

/**
 * Like `createSpan` but for synchronous functions.
 */
export function createSpanSync<T>(
  name: string,
  fn: (span: Span) => T,
  options?: SpanOptions,
): T {
  const tracer = getTracer();
  const span = tracer.startSpan(name, { kind: SpanKind.INTERNAL, ...options });
  const ctx = trace.setSpan(context.active(), span);

  return context.with(ctx, () => {
    try {
      const result = fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      if (error instanceof Error) {
        span.recordException(error);
      }
      throw error;
    } finally {
      span.end();
    }
  });
}

// ---------------------------------------------------------------------------
// Trace / Span ID accessors
// ---------------------------------------------------------------------------

/**
 * Return the current trace ID, or an empty string if no active span exists.
 */
export function getTraceId(): string {
  const span = trace.getActiveSpan();
  if (!span) return "";
  return span.spanContext().traceId;
}

/**
 * Return the current span ID, or an empty string if no active span exists.
 */
export function getSpanId(): string {
  const span = trace.getActiveSpan();
  if (!span) return "";
  return span.spanContext().spanId;
}

/**
 * Add attributes to the currently-active span (no-op if none is active).
 */
export function setSpanAttributes(
  attributes: Record<string, string | number | boolean>,
): void {
  const span = trace.getActiveSpan();
  if (span) {
    span.setAttributes(attributes);
  }
}

// ---------------------------------------------------------------------------
// Shutdown
// ---------------------------------------------------------------------------

/**
 * Flush pending spans and shut down the SDK gracefully.
 */
export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    activeTracer = null;
  }
}

// ---------------------------------------------------------------------------
// Re-exports for convenience
// ---------------------------------------------------------------------------
export {
  trace,
  context,
  SpanStatusCode,
  SpanKind,
  type Tracer,
  type Span,
  type SpanOptions,
} from "@opentelemetry/api";
