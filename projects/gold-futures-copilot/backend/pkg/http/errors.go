package http

import "github.com/gofiber/fiber/v2"

func BadRequest(message string) APIError {
	return APIError{Code: "BAD_REQUEST", Message: message, Status: fiber.StatusBadRequest}
}

func NotFound(message string) APIError {
	return APIError{Code: "NOT_FOUND", Message: message, Status: fiber.StatusNotFound}
}

func Internal(message string) APIError {
	return APIError{Code: "INTERNAL_ERROR", Message: message, Status: fiber.StatusInternalServerError}
}
