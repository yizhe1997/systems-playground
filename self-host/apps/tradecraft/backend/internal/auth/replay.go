package auth

import (
	"sync"
	"time"
)

// replayGuard remembers the ids (jti) of the tokens it has accepted until they expire, so a captured token, one
// carrying a fresh step_up_at included, cannot be replayed inside its window. In memory is enough for one API
// instance; a second instance needs a shared store (docs/security-review.md, accepted risks).
//
// Every proxied request mints a token with a fresh jti, so first-use-only never rejects legitimate traffic.
type replayGuard struct {
	mu        sync.Mutex
	seen      map[string]int64 // jti -> exp (unix seconds)
	lastPrune time.Time
}

func newReplayGuard() *replayGuard { return &replayGuard{seen: map[string]int64{}} }

// firstUse reports whether jti is new. Expired entries are pruned at most once a second, so the map stays bounded
// by the requests of one token lifetime.
func (g *replayGuard) firstUse(jti string, exp int64, now time.Time) bool {
	g.mu.Lock()
	defer g.mu.Unlock()
	if now.Sub(g.lastPrune) > time.Second {
		for id, e := range g.seen {
			if e <= now.Unix() {
				delete(g.seen, id)
			}
		}
		g.lastPrune = now
	}
	if _, dup := g.seen[jti]; dup {
		return false
	}
	g.seen[jti] = exp
	return true
}
