package main

import (
	"context"
	"log"
	"os"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.26.0"
)

// initTracing wires up the global OTEL TracerProvider if OTEL_EXPORTER_OTLP_ENDPOINT is set
// (Tempo, reached over a host-published port - see self-host/infra/observability/docker-compose.yml).
// The gRPC exporter is lazy and doesn't error synchronously if the endpoint is unreachable, so
// this is a no-op fallback for local dev without the observability stack running, not an error.
func initTracing() func(context.Context) error {
	// The Go SDK's global propagator defaults to a no-op - unlike Node's SDK, it does NOT
	// default to W3C tracecontext+baggage. Without this, otelfiber never extracts the incoming
	// traceparent header from the frontend's fetch calls, so every request would start its own
	// disconnected root trace instead of continuing the frontend's trace.
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		return func(context.Context) error { return nil }
	}

	exp, err := otlptracegrpc.New(context.Background(),
		otlptracegrpc.WithEndpointURL(endpoint),
		otlptracegrpc.WithInsecure(),
	)
	if err != nil {
		log.Printf("⚠️ Could not init OTLP exporter: %v", err)
		return func(context.Context) error { return nil }
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exp),
		sdktrace.WithResource(resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName("portfolio-backend"),
		)),
	)
	otel.SetTracerProvider(tp)
	return tp.Shutdown
}
