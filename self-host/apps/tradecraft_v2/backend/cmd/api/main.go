// Command api serves the journal API. Local only until sign-in exists (constitution IV, written exception):
// inside the container it listens on all interfaces, and docker-compose.yml publishes the port on 127.0.0.1 only.
package main

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"tradecraft/internal/api"
	"tradecraft/internal/store"
)

func main() {
	ctx := context.Background()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("DATABASE_URL is not set.")
	}
	if err := store.Migrate(ctx, url); err != nil {
		// nothing from the failing step was applied; stop rather than run on a half-built database (FR-025)
		log.Fatalf("Stopping: %v", err)
	}
	pool, err := pgxpool.New(ctx, url)
	if err != nil {
		log.Fatalf("Stopping: could not connect to the database: %v", err)
	}
	defer pool.Close()
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Journal API listening on :%s", port)
	log.Fatal(api.New(pool, nil).Listen(":" + port))
}
