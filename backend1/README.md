# COOL Café — Backend API

Go + PostgreSQL backend for the COOL Café management system.

## Quick Start (Docker)

```bash
cd backend
docker-compose up -d --build
```

That's it. This will:
1. Start PostgreSQL 16
2. Auto-run `migrations/001_init.sql` (creates all tables + seed data)
3. Build & start the Go API on port `8080`
4. The Go app auto-seeds bcrypt password hashes on first run

### Default Users

| Role     | Username  | Password   |
|----------|-----------|------------|
| Admin    | `admin`   | `admin123` |
| Cashier  | `cashier` | `cash123`  |

### Test

```bash
# Health check
curl http://localhost:8080/health

# Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'

# Get menu (public)
curl http://localhost:8080/api/menu

# Get categories (public)
curl http://localhost:8080/api/categories
```

## Without Docker (local dev)

```bash
# 1. Create database
createdb coolcafe

# 2. Run migrations
psql -d coolcafe -f migrations/001_init.sql

# 3. Create .env
cp .env.example .env
# Edit .env with your DB credentials

# 4. Run
go run cmd/api/main.go
```

## API Endpoints

### Public (no auth required)
| Method | Path              | Description          |
|--------|-------------------|----------------------|
| POST   | `/api/auth/login` | Login                |
| GET    | `/api/categories` | List categories      |
| GET    | `/api/menu`       | List menu items      |
| GET    | `/api/menu/:id`   | Get menu item        |
| POST   | `/api/orders`     | Create order (online)|
| GET    | `/health`         | Health check         |

### Protected (Bearer token required)
| Method | Path                       | Description         |
|--------|----------------------------|---------------------|
| GET    | `/api/auth/me`             | Current user info   |
| POST   | `/api/categories`          | Create category     |
| PUT    | `/api/categories/:id`      | Update category     |
| DELETE | `/api/categories/:id`      | Delete category     |
| POST   | `/api/menu`                | Create menu item    |
| PUT    | `/api/menu/:id`            | Update menu item    |
| DELETE | `/api/menu/:id`            | Delete menu item    |
| GET    | `/api/orders`              | List orders         |
| GET    | `/api/orders/:id`          | Get order           |
| PATCH  | `/api/orders/:id/status`   | Update order status |
| POST   | `/api/upload`              | Upload image        |

## Project Structure

```
backend/
├── cmd/api/main.go            # Entry point + DB seed
├── internal/
│   ├── domain/entities.go     # All domain models
│   ├── repository/            # Database layer
│   ├── service/               # Business logic
│   ├── handler/               # HTTP handlers
│   └── middleware/            # Auth JWT middleware
├── migrations/001_init.sql    # Full database schema
├── Dockerfile                 # Multi-stage Go build
├── docker-compose.yml         # DB + API orchestration
└── .env.example               # Config template
```

## Troubleshooting

### "Failed to connect to database"
- Check DB is running: `docker-compose ps`
- Check logs: `docker-compose logs db`
- The API retries 15 times (2s apart) so give DB time to start

### "Invalid credentials"
- On first run, the Go app seeds bcrypt hashes
- If you reset the DB, restart the API too: `docker-compose restart api`

### Reset everything
```bash
docker-compose down -v   # removes volumes (DB data)
docker-compose up -d --build
```
