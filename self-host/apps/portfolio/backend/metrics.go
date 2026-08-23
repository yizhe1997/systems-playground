package main

import (
	"strconv"
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
		start := time.Now()
		err := c.Next()

		route := c.Route().Path
		status := strconv.Itoa(c.Response().StatusCode())
		httpRequestsTotal.WithLabelValues(c.Method(), route, status).Inc()
		httpRequestDuration.WithLabelValues(c.Method(), route).Observe(time.Since(start).Seconds())

		return err
	}
}

// RegisterMetricsRoute exposes /metrics unauthenticated, same trust model as /health -
// Prometheus has no way to send X-Admin-Token, and this is only reachable via the internal
// host-port path in practice (see self-host/infra/observability/prometheus.yml).
func RegisterMetricsRoute(app *fiber.App) {
	app.Get("/metrics", adaptor.HTTPHandler(promhttp.Handler()))
}
