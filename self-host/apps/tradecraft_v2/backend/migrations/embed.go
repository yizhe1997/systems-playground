// Package migrations holds the database migrations, compiled into the API binary.
package migrations

import "embed"

//go:embed *.sql
var FS embed.FS
