// Command api serves the journal API. Every route but /health needs a signed service token (feature 002). Inside the
// container it listens on all interfaces, and docker-compose.yml publishes the port on 127.0.0.1 only: nothing is
// exposed beyond this computer until CI has been proven on GitHub (constitution IV).
package main

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v5/pgxpool"

	"tradecraft/internal/api"
	"tradecraft/internal/auth"
	"tradecraft/internal/store"
)

func main() {
	ctx := context.Background()
	url := os.Getenv("DATABASE_URL")
	if url == "" {
		log.Fatal("DATABASE_URL is not set.")
	}

	// The gates first: a start that cannot be safe stops here with a plain message and no secret in it.
	env, err := auth.EnvironmentFrom(os.Getenv("TRADECRAFT_ENV"))
	if err != nil {
		log.Fatalf("Stopping: %v", err)
	}
	if err := auth.RefuseDevSecret(env, os.Getenv("DEV_SESSION_SECRET")); err != nil {
		log.Fatalf("Stopping: %v", err)
	}
	secret := os.Getenv("SERVICE_TOKEN_SECRET")
	if err := auth.CheckSecret("SERVICE_TOKEN_SECRET", secret); err != nil {
		log.Fatalf("Stopping: %v", err)
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

	// there is always a way in: the first identity comes from the owner's own configuration, never from a request
	if err := auth.BootstrapOwner(ctx, store.New(pool), os.Getenv("OWNER_BOOTSTRAP_EMAIL")); err != nil {
		log.Fatalf("Stopping: %v", err)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("Journal API listening on :%s", port)
	log.Fatal(api.New(pool, nil, secret).Listen(":" + port))
}
