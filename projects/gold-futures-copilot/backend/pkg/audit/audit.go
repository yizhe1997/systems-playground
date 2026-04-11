package audit

import (
	"log"
	"time"
)

func LogAction(actor string, action string, resource string, details map[string]any) {
	log.Printf("audit actor=%s action=%s resource=%s details=%v at=%s", actor, action, resource, details, time.Now().UTC().Format(time.RFC3339))
}
