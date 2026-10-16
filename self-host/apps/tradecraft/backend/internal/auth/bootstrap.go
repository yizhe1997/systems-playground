package auth

import (
	"context"
	"errors"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"

	"tradecraft/internal/store"
)

// BootstrapOwner makes sure somebody can sign in (FR-013). It does nothing while at least one identity is active.
// Otherwise it creates the first identity from OWNER_BOOTSTRAP_EMAIL, or, when every identity is disabled (a manual
// database edit, or a lock-out), enables the one with that address again and records it as a system action. It is
// also the documented recovery: set the variable and restart.
func BootstrapOwner(ctx context.Context, q *store.Queries, bootstrapEmail string) error {
	counts, err := q.IdentityCounts(ctx)
	if err != nil {
		return fmt.Errorf("count identities: %w", err)
	}
	if counts.Active > 0 {
		return nil
	}
	email := NormaliseEmail(bootstrapEmail)
	if email == "" {
		if counts.Total == 0 {
			return errors.New("there is no identity and OWNER_BOOTSTRAP_EMAIL is not set, so nobody could ever sign in")
		}
		return errors.New("every identity is disabled and OWNER_BOOTSTRAP_EMAIL is not set: set it to the address to enable again")
	}
	existing, err := q.IdentityByEmail(ctx, email)
	switch {
	case err == nil:
		if _, err := q.EnableIdentity(ctx, existing.ID); err != nil {
			return fmt.Errorf("enable the bootstrap identity: %w", err)
		}
		if err := q.InsertAuditEntry(ctx, store.InsertAuditEntryParams{
			ActorKind: "system", Kind: "identity_enabled", Subject: email, ChangedFields: []string{"status"},
		}); err != nil {
			return fmt.Errorf("record the enable: %w", err)
		}
		slog.Warn("no identity was active; enabled the OWNER_BOOTSTRAP_EMAIL identity again")
	case errors.Is(err, pgx.ErrNoRows):
		if _, err := q.CreateIdentity(ctx, email); err != nil {
			return fmt.Errorf("create the first identity (is OWNER_BOOTSTRAP_EMAIL an email address?): %w", err)
		}
	default:
		return fmt.Errorf("look up the bootstrap identity: %w", err)
	}
	return nil
}
