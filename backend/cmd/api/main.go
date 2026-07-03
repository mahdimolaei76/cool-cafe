package main

import (
	"fmt"
	"log"
	"net/http"
	"os"
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

		// Protected
		r.Group(func(r chi.Router) {
			r.Use(authMW.Authenticate)

			r.Get("/auth/me", authHandler.Me)
			r.Post("/auth/logout", authHandler.Logout)

			r.Post("/categories", categoryHandler.Create)
			r.Put("/categories/{id}", categoryHandler.Update)
			r.Delete("/categories/{id}", categoryHandler.Delete)

			r.Post("/menu", menuItemHandler.Create)
			r.Put("/menu/{id}", menuItemHandler.Update)
			r.Delete("/menu/{id}", menuItemHandler.Delete)

			r.Get("/orders", orderHandler.List)
			r.Get("/orders/{id}", orderHandler.Get)
			r.Patch("/orders/{id}/status", orderHandler.UpdateStatus)

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
