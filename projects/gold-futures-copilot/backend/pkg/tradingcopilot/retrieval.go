package tradingcopilot

import "context"

type RetrievalContext struct {
	ID      string `json:"id"`
	Summary string `json:"summary"`
}

type Retriever interface {
	FindSimilarPlans(ctx context.Context, plan TradePlan, k int) ([]RetrievalContext, error)
}

type NoopRetriever struct{}

func (n NoopRetriever) FindSimilarPlans(_ context.Context, _ TradePlan, _ int) ([]RetrievalContext, error) {
	return []RetrievalContext{}, nil
}

type MemoryChunk struct {
	Index   int    `json:"index"`
	Content string `json:"content"`
}

func ChunkMemoryContent(raw string, chunkSize int) []MemoryChunk {
	if chunkSize <= 0 {
		chunkSize = 240
	}
	runes := []rune(raw)
	if len(runes) == 0 {
		return nil
	}

	chunks := make([]MemoryChunk, 0)
	idx := 0
	for start := 0; start < len(runes); start += chunkSize {
		end := start + chunkSize
		if end > len(runes) {
			end = len(runes)
		}
		chunks = append(chunks, MemoryChunk{Index: idx, Content: string(runes[start:end])})
		idx++
	}
	return chunks
}
