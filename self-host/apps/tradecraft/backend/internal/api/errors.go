package api

import (
	"errors"
	"fmt"
	"log"
	"net/http"

	"github.com/gofiber/fiber/v2"
)

type fieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

type apiError struct {
	status  int
	Code    string       `json:"code"`
	Message string       `json:"message"`
	Fields  []fieldError `json:"fields,omitempty"`
}

func (e *apiError) Error() string { return e.Message }

// invalid is the 422 answer. what names the thing being saved ("trade", "account").
func invalid(what string, fields []fieldError) *apiError {
	n := len(fields)
	noun := "things"
	if n == 1 {
		noun = "thing"
	}
	return &apiError{status: http.StatusUnprocessableEntity, Code: "invalid", Fields: fields,
		Message: fmt.Sprintf("%d %s to fix before this %s can be saved.", n, noun, what)}
}

func notFound(what string) *apiError {
	return &apiError{status: http.StatusNotFound, Code: "not_found", Message: "That " + what + " does not exist."}
}

func badRequest(msg string) *apiError {
	return &apiError{status: http.StatusBadRequest, Code: "bad_request", Message: msg}
}

// errorHandler turns every error into the shared shape { code, message, fields[] }.
func errorHandler(c *fiber.Ctx, err error) error {
	var ae *apiError
	if errors.As(err, &ae) {
		return c.Status(ae.status).JSON(ae)
	}
	var fe *fiber.Error
	if errors.As(err, &fe) {
		return c.Status(fe.Code).JSON(&apiError{Code: "error", Message: fe.Message})
	}
	log.Printf("internal error: %v", err) // never includes request bodies or connection strings
	return c.Status(http.StatusInternalServerError).JSON(&apiError{Code: "internal", Message: "Something went wrong. Nothing was changed."})
}
