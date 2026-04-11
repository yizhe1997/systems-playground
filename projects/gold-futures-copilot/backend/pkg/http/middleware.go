package http

import (
	"fmt"
	"log"
	"runtime/debug"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

type APIError struct {
	Code      string         `json:"code"`
	Message   string         `json:"message"`
	Status    int            `json:"-"`
	Details   map[string]any `json:"details,omitempty"`
	RequestID string         `json:"requestId,omitempty"`
}

func WriteError(c *fiber.Ctx, err APIError) error {
	requestID := fmt.Sprint(c.Locals("requestId"))
	if requestID != "" {
		err.RequestID = requestID
	}
	status := err.Status
	if status == 0 {
		status = fiber.StatusBadRequest
	}
	return c.Status(status).JSON(err)
}

func FiberErrorHandler(c *fiber.Ctx, err error) error {
	if ferr, ok := err.(*fiber.Error); ok {
		return WriteError(c, APIError{
			Code:    "HTTP_ERROR",
			Message: ferr.Message,
			Status:  ferr.Code,
		})
	}

	return WriteError(c, APIError{
		Code:    "INTERNAL_ERROR",
		Message: "internal server error",
		Status:  fiber.StatusInternalServerError,
	})
}

func RequestContextMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		requestID := c.Get("X-Request-Id")
		if requestID == "" {
			requestID = uuid.NewString()
		}
		c.Set("X-Request-Id", requestID)
		c.Locals("requestId", requestID)
		c.Locals("requestStart", time.Now())
		return c.Next()
	}
}

func RequestLoggingMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		start := time.Now()
		err := c.Next()
		latency := time.Since(start)
		status := c.Response().StatusCode()
		requestID := fmt.Sprint(c.Locals("requestId"))

		log.Printf("request_id=%s method=%s path=%s status=%d latency_ms=%d", requestID, c.Method(), c.Path(), status, latency.Milliseconds())
		return err
	}
}

func RecoveryMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) (err error) {
		defer func() {
			if r := recover(); r != nil {
				log.Printf("panic recovered request_id=%v error=%v stack=%s", c.Locals("requestId"), r, string(debug.Stack()))
				err = WriteError(c, APIError{
					Code:    "PANIC_RECOVERED",
					Message: "unexpected server error",
					Status:  fiber.StatusInternalServerError,
				})
			}
		}()
		return c.Next()
	}
}
