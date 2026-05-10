package main

import (
	"log"
	"os"
)

func main() {
	InitRedis()
	InitPostgres() // Fire up pgvector
	startAISetupGradeWorker()
	startAlertWorker()

	app := newApp()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8088"
	}

	log.Printf("Starting MVP backend on :%s", port)
	log.Fatal(app.Listen(":" + port))
}
