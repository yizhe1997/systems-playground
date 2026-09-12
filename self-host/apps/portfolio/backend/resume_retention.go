package main

import (
	"context"
	"log"
	"time"
)

// startRetentionSweep runs an immediate sweep, then repeats daily. The
// retention window is 30 days from CreatedAt for every request regardless of
// status — a failed or never-resolved request is anonymized on the same
// clock as a resolved one, since a stale pending request is either spam or
// something forgotten, not something worth holding identifiable data on
// indefinitely.
func startRetentionSweep() {
	go func() {
		runRetentionSweep(context.Background())
		ticker := time.NewTicker(24 * time.Hour)
		for range ticker.C {
			runRetentionSweep(context.Background())
		}
	}()
}

// runRetentionSweep anonymizes (not deletes) requests older than 30 days:
// name and email — the two fields that directly identify the requester —
// are cleared, while company, reason, status, and the triage/legitimacy
// verdict survive so conversion/volume trends (and *why* people are asking,
// e.g. which roles/industries) stay analyzable. Reason deliberately isn't
// cleared here: like company, it's operational context ("hiring for a
// backend role"), not identity data - the same judgment call already made
// for company. The WHERE clause doubles as the idempotency check: email is
// required at submission time (see the POST handler), so `email != ''` is
// exactly "not yet anonymized" and re-running this daily against
// already-anonymized rows is a no-op.
//
// A request that's still "pending" when it hits this cutoff also flips to
// "expired" (with DecidedAt stamped, so its review duration on the status
// page stops ticking forever instead of quietly showing "in review" for a
// request whose contact info is already gone and can no longer be approved
// - see the "This request's contact info was anonymized..." check in the
// approve handler above). A request that was already approved/rejected
// keeps its real status - a genuine human decision isn't overwritten by
// retention just because it's also past 30 days old.
func runRetentionSweep(ctx context.Context) {
	if db == nil {
		return
	}

	now := time.Now().UnixMilli()
	cutoff := time.Now().AddDate(0, 0, -30).UnixMilli()
	res, err := db.ExecContext(ctx, `
		UPDATE resume_requests SET
			name = '', email = '',
			status = CASE WHEN status = 'pending' THEN 'expired' ELSE status END,
			decided_at = CASE WHEN status = 'pending' AND decided_at = 0 THEN ? ELSE decided_at END
		WHERE created_at < ? AND email != ''`, now, cutoff)
	if err != nil {
		log.Printf("⚠️ Retention sweep: failed to anonymize resume_requests: %v", err)
		return
	}

	anonymized, err := res.RowsAffected()
	if err != nil || anonymized == 0 {
		return
	}

	log.Printf("🧹 Retention sweep: anonymized %d resume request(s) older than 30 days (still-pending ones also marked expired)", anonymized)
}
