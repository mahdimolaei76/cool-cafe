// Small utility — run: go run cmd/hashpw/main.go <password>
// Outputs the bcrypt hash to use in SQL seed files.
package main

import (
	"fmt"
	"os"

	"golang.org/x/crypto/bcrypt"
)

func main() {
	pw := "admin123"
	if len(os.Args) > 1 {
		pw = os.Args[1]
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(pw), 10)
	if err != nil {
		fmt.Fprintf(os.Stderr, "error: %v\n", err)
		os.Exit(1)
	}
	fmt.Println(string(hash))
}
