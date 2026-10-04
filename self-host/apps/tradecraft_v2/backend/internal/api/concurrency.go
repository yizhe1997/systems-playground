package api

import "net/http"

// updated_at is the version token. A PUT that carries an expectedUpdatedAt different from the stored one
// matches no row in the UPDATE (see queries) and is answered with these (FR-022).
func conflict(what string) *apiError {
	return &apiError{status: http.StatusConflict, Code: "conflict",
		Message: "This " + what + " was changed elsewhere. Reload to see the latest version."}
}
