import { registerOTel } from '@vercel/otel';

export async function register() {
  // Node's fetch runs on undici. Next.js's own built-in "fetch GET ..." spans (patch-fetch.js)
  // are for Next's internal telemetry only and do NOT inject W3C traceparent headers into the
  // outgoing request - without UndiciInstrumentation, every proxy-route/SSR fetch to the Go
  // backend would start a brand new disconnected trace instead of continuing this one.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { UndiciInstrumentation } = await import('@opentelemetry/instrumentation-undici');
    registerOTel({
      serviceName: 'portfolio-frontend',
      traceExporter: 'auto', // reads OTEL_EXPORTER_OTLP_ENDPOINT from env
      instrumentations: ['fetch', new UndiciInstrumentation()],
    });
  }
}
