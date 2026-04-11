package observability

import (
	"sync"
	"time"
)

type metricState struct {
	mu sync.Mutex

	gradingLatenciesMs []int64
	alertLatenciesMs   []int64
	showroomSuccess    int
	showroomFailure    int
}

var state = &metricState{}

func RecordGradingLatency(start time.Time) {
	state.mu.Lock()
	defer state.mu.Unlock()
	state.gradingLatenciesMs = append(state.gradingLatenciesMs, time.Since(start).Milliseconds())
}

func RecordAlertDispatchLatency(start time.Time) {
	state.mu.Lock()
	defer state.mu.Unlock()
	state.alertLatenciesMs = append(state.alertLatenciesMs, time.Since(start).Milliseconds())
}

func RecordShowroomResult(success bool) {
	state.mu.Lock()
	defer state.mu.Unlock()
	if success {
		state.showroomSuccess++
	} else {
		state.showroomFailure++
	}
}

func Snapshot() map[string]any {
	state.mu.Lock()
	defer state.mu.Unlock()
	return map[string]any{
		"gradingLatencyCount": len(state.gradingLatenciesMs),
		"alertLatencyCount":   len(state.alertLatenciesMs),
		"showroomSuccess":     state.showroomSuccess,
		"showroomFailure":     state.showroomFailure,
	}
}
