package main

import (
	"log"
	"os"
	"os/exec"
)

const legacyServerBinary = "/usr/local/bin/futures-copilot-backend-legacy"

func main() {
	cmd := exec.Command(legacyServerBinary, os.Args[1:]...)
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr
	cmd.Stdin = os.Stdin
	cmd.Env = os.Environ()

	if err := cmd.Run(); err != nil {
		log.Fatal(err)
	}
}
