package main

import "sync"

// statusHub is a minimal in-process pub/sub keyed by resume request ID,
// backing the SSE stream at GET /api/resume/status/:id/stream. This exists
// specifically to replace ResumeStatusTracker.tsx's old client-side polling
// (a setTimeout loop re-fetching every 2s while triage was in flight) - the
// data flow here is genuinely one-directional (backend state -> viewer), so
// every mutation to a resume_requests row (runTriage's transitions in
// triage.go, an admin's approve/reject/retriage in this file) publishes the
// fresh snapshot here instead of the frontend re-fetching on a timer.
//
// In-process only, by design - this deployment is a single backend
// instance (see docker-compose.yml), so there's no second instance that a
// publish could miss. A multi-instance deployment would need a shared bus
// instead (Redis pub/sub, already a dependency here, would be the natural
// choice) - not built now since it would be speculative for a topology this
// app doesn't have.
type statusHub struct {
	mu   sync.Mutex
	subs map[string]map[chan string]struct{}
}

func newStatusHub() *statusHub {
	return &statusHub{subs: make(map[string]map[chan string]struct{})}
}

// subscribe registers a new listener for id. Buffered by 4 so a publish
// during a slow write doesn't block the publisher - see publish's comment.
func (h *statusHub) subscribe(id string) chan string {
	ch := make(chan string, 4)
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.subs[id] == nil {
		h.subs[id] = make(map[chan string]struct{})
	}
	h.subs[id][ch] = struct{}{}
	return ch
}

func (h *statusHub) unsubscribe(id string, ch chan string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if subs, ok := h.subs[id]; ok {
		delete(subs, ch)
		if len(subs) == 0 {
			delete(h.subs, id)
		}
	}
	close(ch)
}

// publish is best-effort: a subscriber whose buffered channel is already
// full gets this update dropped rather than blocking the publisher (which
// runs on the request-handling goroutine for an admin action, or the
// triage goroutine) - the next publish, or a plain page reload, carries
// fresher data anyway, so there's nothing worth blocking a mutation for.
func (h *statusHub) publish(id string, payload string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	for ch := range h.subs[id] {
		select {
		case ch <- payload:
		default:
		}
	}
}

var resumeStatusHub = newStatusHub()
