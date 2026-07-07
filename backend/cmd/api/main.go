package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/jmoiron/sqlx"
	"github.com/joho/godotenv"
	_ "github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"

	"github.com/coolcafe/backend/internal/handler"
	appMiddleware "github.com/coolcafe/backend/internal/middleware"
	"github.com/coolcafe/backend/internal/repository"
	"github.com/coolcafe/backend/internal/service"
)

func main() {
	_ = godotenv.Load()

	// Connect to DB with retries
	db, err := connectDBWithRetry(15)
	if err != nil {
		log.Fatalf("❌ Database connection failed: %v", err)
	}
	defer db.Close()
	log.Println("✅ Database connected")

	// `./api migrate` applies any .sql files in migrations/ that haven't
	// run yet, then exits — this is what docker-compose.yml invokes before
	// starting the API. Previously this subcommand didn't exist: main()
	// ignored os.Args entirely, so "migrate" was silently treated as a
	// normal server start and no migration ever actually ran. Any schema
	// change added after the database's first boot (e.g. the tracking_code
	// column) would then be missing forever, and every INSERT that touches
	// it would fail — exactly the "order creation doesn't reach the
	// backend" symptom this fixes.
	if len(os.Args) > 1 && os.Args[1] == "migrate" {
		if err := runMigrations(db); err != nil {
			log.Fatalf("❌ Migration failed: %v", err)
		}
		log.Println("✅ Migrations up to date")
		return
	}

	// Also apply any pending migrations on normal startup (not just when
	// invoked as `./api migrate`). This is a safety net: if the migrate
	// step is ever skipped or fails silently, the server won't come up
	// against a stale schema and quietly break every write that touches
	// a newer column.
	if err := runMigrations(db); err != nil {
		log.Fatalf("❌ Migration failed: %v", err)
	}

	// Seed default passwords (safe to run multiple times)
	seedDefaultPasswords(db)

	// Repositories
	userRepo := repository.NewUserRepository(db)
	categoryRepo := repository.NewCategoryRepository(db)
	menuItemRepo := repository.NewMenuItemRepository(db)
	orderRepo := repository.NewOrderRepository(db)

	// Services
	jwtSecret := getEnv("JWT_SECRET", "default-secret-change-me")
	authService := service.NewAuthService(userRepo, jwtSecret)
	categoryService := service.NewCategoryService(categoryRepo)
	menuItemService := service.NewMenuItemService(menuItemRepo)
	orderService := service.NewOrderService(orderRepo)

	// Handlers
	authHandler := handler.NewAuthHandler(authService)
	categoryHandler := handler.NewCategoryHandler(categoryService)
	menuItemHandler := handler.NewMenuItemHandler(menuItemService)
	orderHandler := handler.NewOrderHandler(orderService)
	uploadHandler := handler.NewUploadHandler(getEnv("UPLOAD_DIR", "./uploads"))

	authMW := appMiddleware.NewAuthMiddleware(jwtSecret)

	// Router
	r := chi.NewRouter()
	r.Use(middleware.RealIP)
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.Timeout(30 * time.Second))
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	// Routes
	r.Route("/api", func(r chi.Router) {
		// Public
		r.Post("/auth/login", authHandler.Login)
		r.Get("/categories", categoryHandler.List)
		r.Get("/menu", menuItemHandler.List)
		r.Get("/menu/{id}", menuItemHandler.Get)
		r.Post("/orders", orderHandler.Create)
		r.Post("/orders/track", orderHandler.Track)

		// Protected
		r.Group(func(r chi.Router) {
			r.Use(authMW.Authenticate)

			r.Get("/auth/me", authHandler.Me)
			r.Post("/auth/logout", authHandler.Logout)

			r.Post("/categories", categoryHandler.Create)
			r.Put("/categories/{id}", categoryHandler.Update)
			r.Delete("/categories/{id}", categoryHandler.Delete)
			r.Post("/categories/reorder", categoryHandler.Reorder)

			r.Post("/menu", menuItemHandler.Create)
			r.Put("/menu/{id}", menuItemHandler.Update)
			r.Delete("/menu/{id}", menuItemHandler.Delete)

			r.Get("/orders", orderHandler.List)
			r.Get("/orders/{id}", orderHandler.Get)
			r.Patch("/orders/{id}/status", orderHandler.UpdateStatus)
			r.Patch("/orders/{id}/items/{itemId}/price", orderHandler.UpdateItemPrice)

			r.Post("/upload", uploadHandler.Upload)
		})
	})

	// Static uploads
	r.Handle("/uploads/*", http.StripPrefix("/uploads/",
		http.FileServer(http.Dir(getEnv("UPLOAD_DIR", "./uploads")))))

	// Health
	r.Get("/health", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status":"ok"}`))
	})

	port := getEnv("PORT", "8080")
	log.Printf("🚀 COOL Café API → :%s", port)
	log.Fatal(http.ListenAndServe(":"+port, r))
}

// runMigrations applies every .sql file under migrations/ that hasn't
// been recorded as applied yet, in filename order (hence the numeric
// prefixes like 001_, 002_). Each migration runs in its own transaction
// and is recorded in schema_migrations only on success, so a failed
// migration doesn't get silently marked as done and re-running this
// function is always safe.
func runMigrations(db *sqlx.DB) error {
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			filename   TEXT PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`); err != nil {
		return fmt.Errorf("creating schema_migrations table: %w", err)
	}

	dir := getEnv("MIGRATIONS_DIR", "./migrations")
	entries, err := os.ReadDir(dir)
	if err != nil {
		// No migrations directory (e.g. a stripped-down deploy image) is
		// not fatal — there's simply nothing to apply.
		log.Printf("⚠️  Migrations directory %q not found, skipping: %v", dir, err)
		return nil
	}

	var files []string
	for _, e := range entries {
		if !e.IsDir() && strings.HasSuffix(e.Name(), ".sql") {
			files = append(files, e.Name())
		}
	}
	sort.Strings(files)

	for _, name := range files {
		var alreadyApplied bool
		if err := db.Get(&alreadyApplied, `SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE filename = $1)`, name); err != nil {
			return fmt.Errorf("checking migration status for %s: %w", name, err)
		}
		if alreadyApplied {
			continue
		}

		path := filepath.Join(dir, name)
		sqlBytes, err := os.ReadFile(path)
		if err != nil {
			return fmt.Errorf("reading %s: %w", name, err)
		}

		tx, err := db.Beginx()
		if err != nil {
			return fmt.Errorf("beginning transaction for %s: %w", name, err)
		}

		if _, err := tx.Exec(string(sqlBytes)); err != nil {
			tx.Rollback()
			return fmt.Errorf("applying %s: %w", name, err)
		}
		if _, err := tx.Exec(`INSERT INTO schema_migrations (filename) VALUES ($1)`, name); err != nil {
			tx.Rollback()
			return fmt.Errorf("recording %s as applied: %w", name, err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("committing %s: %w", name, err)
		}

		log.Printf("✅ Applied migration: %s", name)
	}

	return nil
}

// seedDefaultPasswords hashes and stores passwords for seed users.
// Only updates users whose password_hash is the placeholder "NEEDS_RESET".
func seedDefaultPasswords(db *sqlx.DB) {
	type seedUser struct {
		username string
		password string
	}
	users := []seedUser{
		{"admin", "admin123"},
		{"cashier", "cash123"},
	}
	for _, u := range users {
		hash, err := bcrypt.GenerateFromPassword([]byte(u.password), 10)
		if err != nil {
			log.Printf("⚠️  Failed to hash password for %s: %v", u.username, err)
			continue
		}
		res, err := db.Exec(
			`UPDATE users SET password_hash = $1 WHERE username = $2 AND password_hash = 'NEEDS_RESET'`,
			string(hash), u.username,
		)
		if err != nil {
			log.Printf("⚠️  Failed to seed %s: %v", u.username, err)
			continue
		}
		if n, _ := res.RowsAffected(); n > 0 {
			log.Printf("✅ Seeded password for user: %s", u.username)
		}
	}
}

func connectDBWithRetry(maxAttempts int) (*sqlx.DB, error) {
	dsn := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		getEnv("DB_HOST", "localhost"),
		getEnv("DB_PORT", "5432"),
		getEnv("DB_USER", "postgres"),
		getEnv("DB_PASSWORD", ""),
		getEnv("DB_NAME", "coolcafe"),
		getEnv("DB_SSLMODE", "disable"),
	)

	var db *sqlx.DB
	var err error
	for i := 1; i <= maxAttempts; i++ {
		db, err = sqlx.Connect("postgres", dsn)
		if err == nil {
			db.SetMaxOpenConns(25)
			db.SetMaxIdleConns(5)
			db.SetConnMaxLifetime(5 * time.Minute)
			return db, nil
		}
		log.Printf("⏳ DB attempt %d/%d: %v", i, maxAttempts, err)
		time.Sleep(2 * time.Second)
	}
	return nil, fmt.Errorf("failed after %d attempts: %w", maxAttempts, err)
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
