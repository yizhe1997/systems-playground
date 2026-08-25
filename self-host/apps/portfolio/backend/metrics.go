package main

import (
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/adaptor"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promauto"
	"github.com/prometheus/client_golang/prometheus/promhttp"
)

var (
	httpRequestsTotal = promauto.NewCounterVec(prometheus.CounterOpts{
		Name: "portfolio_http_requests_total",
		Help: "Total HTTP requests, by method/route/status.",
	}, []string{"method", "route", "status"})

	httpRequestDuration = promauto.NewHistogramVec(prometheus.HistogramOpts{
		Name:    "portfolio_http_request_duration_seconds",
		Help:    "HTTP request latency in seconds.",
		Buckets: prometheus.DefBuckets,
	}, []string{"method", "route"})
)

// metricsMiddleware labels by the registered route pattern (c.Route().Path, e.g.
// "/api/posts/:id/rate"), not the raw request path - using the raw path would give every
// resume-request UUID its own label value, an unbounded-cardinality footgun for Prometheus.
func metricsMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		// Method captured (and deep-copied) before c.Next(), route captured after: c.Route()
		// only reflects the actual matched endpoint once routing has run the chain down to it
		// (reading it before c.Next(), inside this global middleware, returns this middleware's
		// own "/" registration instead). c.Method() returns an unsafe string backed by fasthttp's
		// request buffer, not a real copy - routes using adaptor.HTTPHandler (/mcp, /metrics
		// itself) were observed to corrupt that buffer WHILE c.Next() runs (truncated labels like
		// "GETT"/"GETIONS"), so capturing the raw string before Next() isn't enough; it has to be
		// strings.Clone'd into independent memory that can't be mutated out from under it.
		method := strings.Clone(c.Method())

		start := time.Now()
		err := c.Next()

		route := c.Route().Path
		status := strconv.Itoa(c.Response().StatusCode())
		httpRequestsTotal.WithLabelValues(method, route, status).Inc()
		httpRequestDuration.WithLabelValues(method, route).Observe(time.Since(start).Seconds())

		return err
	}
}

// RegisterMetricsRoute exposes /metrics unauthenticated, same trust model as /health -
// Prometheus has no way to send X-Admin-Token, and this is only reachable via the internal
// host-port path in practice (see self-host/infra/observability/prometheus.yml).
func RegisterMetricsRoute(app *fiber.App) {
	app.Get("/metrics", adaptor.HTTPHandler(promhttp.Handler()))
}
