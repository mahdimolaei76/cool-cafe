# COOL Café — Backend API

Go + PostgreSQL backend for the COOL Café management system.

## Quick Start (Docker)

```bash
cd backend
docker-compose up -d --build
```

That's it. This will:
1. Start PostgreSQL 16
2. Postgres auto-runs everything in `migrations/*.sql` **only on a brand-new, empty database volume** (this is Postgres's own `docker-entrypoint-initdb.d` behavior, not something this app controls)
3. The Go API additionally applies any migration file not yet recorded in the `schema_migrations` table, every time it starts — so migrations added *after* your database already existed (like `002_tracking_code.sql`) still get applied automatically, instead of silently never running
4. Build & start the Go API on port `8080`
5. The Go app auto-seeds bcrypt password hashes on first run

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

# 2. Create .env
cp .env.example .env
# Edit .env with your DB credentials

# 3. Apply migrations (safe to re-run any time — already-applied files are skipped)
go run ./cmd/api migrate

# 4. Run
go run ./cmd/api
```

## Migrations

Every `.sql` file in `migrations/` is applied automatically, in filename
order, the first time the API connects to a database that hasn't seen
it yet — tracked in a `schema_migrations` table so each file only runs
once. This happens both via `./api migrate` (a one-shot command that
applies pending migrations then exits) and automatically every time the
API starts normally, as a safety net.

**If you already had this project running before `002_tracking_code.sql`
(or any migration) was added**, your existing database's data volume was
initialized before that file existed, so Postgres's own auto-init never
ran it — and older versions of this backend had no code that would run
it later either. If orders started failing after pulling new backend
code, this is the most likely cause: the `orders` table is missing a
column the Go code now expects.

**Fix — pick one:**

```bash
# Docker: rebuild and let the API apply pending migrations on startup
docker-compose up -d --build

# Or run the one-shot migrate command directly:
docker-compose run --rm api ./api migrate

# Without Docker:
go run ./cmd/api migrate

# Or apply a specific file by hand if you don't want to touch the Go binary:
psql -d coolcafe -f migrations/002_tracking_code.sql
```

To check what's actually been applied:
```sql
SELECT * FROM schema_migrations ORDER BY filename;
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
├── migrations/                # 001_init.sql (schema+seed), 002_tracking_code.sql, ...
├── Dockerfile                 # Multi-stage Go build
├── docker-compose.yml         # DB + API orchestration
└── .env.example               # Config template
```

## Troubleshooting

### "Order creation fails" / "orders never reach the backend"
- Check the API logs right after startup for `✅ Applied migration: ...` lines — if you don't see `002_tracking_code.sql` listed and your database predates it, run `docker-compose run --rm api ./api migrate` (see Migrations section above)
- A Postgres error like `column "tracking_code" of relation "orders" does not exist` in the API logs confirms this exact cause
- Also check the browser console (F12): if the frontend is served over HTTPS but `VITE_API_URL` points to a plain `http://` address, the browser blocks the request entirely as "mixed content" before it ever reaches the network — the API's own logs will show nothing because the request never arrived. Serve the backend over HTTPS (e.g. behind an nginx/Caddy reverse proxy) or match protocols.

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
