# Clustered Workforce Access Control Platform

**Stack:** Express.js · Sequelize · MySQL · Redis · Docker

---

## Project Overview

A mission-critical Workforce Management & Access Control backend designed for high-security environments. The system handles gate access logs, employee registries, and integrates with physical access control hardware (RFID scanners, biometric prints, and camera face triggers).

### Core Features

1. **Clustered Architecture**: Spawns HTTP worker threads based on available CPU cores to handle incoming REST API requests concurrently, backed by a master process connection manager.
2. **Low-Level TCP Listener**: Master process hosts a native TCP socket server on port `9000` to process raw streams from physical scanners. Includes custom **line-buffer decoding** to prevent packet fragmentation.
3. **Distributed Redis Caching**: Validates employee badges in sub-milliseconds by caching registry lookups in Redis (10s TTL), with a resilient automatic fallback to MySQL if Redis is offline.
4. **JWT Authentication & Token Rotation**: Full auth system supporting registration, secure login, and strict refresh token rotation (old tokens revoked immediately on usage, and stored securely hashed in the database).
5. **Role-Based Access Control (RBAC)**: Fine-grained access control middleware to restrict route actions to specific authorization roles (`admin`, `manager`, `staff`).
6. **Product Inventory REST API**: Complete CRUD REST API with AJV validation, pagination, keyword searching, soft deletes (paranoid mode), and total metrics headers.
7. **Centralized Error Handling**: Standardized error management pattern using a customized `AppError` class and global error middleware to enforce uniform JSON error payloads.
8. **Automated Testing Suite**: Full unit and integration coverage using **Vitest** and **Supertest** running under 5 seconds.

---

## Project Structure

```
cidroy-backend-assessment/
├── src/
│   ├── config/
│   │   ├── database.ts         # Sequelize connection pool
│   │   ├── env.ts              # AJV environment variable validator
│   │   ├── logger.ts           # Winston logger config
│   │   └── redis.ts            # Redis client connection manager
│   ├── controllers/
│   │   ├── auth.controller.ts     # User registry, login, rotation, logout
│   │   ├── employee.controller.ts # Employee management & access toggle
│   │   ├── health.controller.ts   # Health diagnostics
│   │   ├── iot.controller.ts      # Device triggers & paginated logs API
│   │   └── product.controller.ts  # Product CRUD operations
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT authentication verifier
│   │   ├── error.middleware.ts    # Global exception handler & AppError class
│   │   ├── logger.middleware.ts   # Request logger
│   │   ├── rbac.middleware.ts     # Role-based access control blocks
│   │   └── validate.middleware.ts # AJV request payload validator
│   ├── models/                 # Sequelize MySQL models
│   │   ├── index.ts            # Association registry
│   │   ├── employee.model.ts   # Workforce Personnel registry
│   │   ├── access_log.model.ts # Gateway check-in logs
│   │   ├── user.model.ts       # Authenticated Users (bcrypt hash hooks)
│   │   ├── refresh_token.model.ts # Hashed Refresh Token registry
│   │   └── product.model.ts    # Products inventory (paranoid soft delete)
│   ├── routes/                 # Versioned API routes
│   │   ├── v1/
│   │   │   ├── auth.routes.ts     # Authentication & registration routes
│   │   │   ├── employee.routes.ts # Employee management routes
│   │   │   ├── health.routes.ts
│   │   │   ├── iot.routes.ts
│   │   │   ├── product.routes.ts  # Products inventory CRUD routes
│   │   │   └── index.ts        # V1 router aggregator
│   │   └── index.ts            # Main router (/api/v1 prefix)
│   ├── schemas/                # AJV validation schemas
│   │   ├── auth.schema.ts      # Auth validation schemas
│   │   ├── employee.schema.ts  # Employee query & body schemas
│   │   ├── iot.schema.ts
│   │   └── product.schema.ts   # Product CRUD schemas
│   ├── services/               # Core business services
│   │   ├── iot.service.ts      # Card lookups & logs logic
│   │   └── tcp.service.ts      # Native TCP socket hardware server
│   ├── scripts/
│   │   ├── seed.ts             # Safe database seeder (findOrCreate)
│   │   └── seed_auth.ts        # User credentials & mock products seeder
│   ├── app.ts                  # Express server app setup
│   └── server.ts               # Cluster master orchestrator
├── database/
│   └── raw-queries.sql         # Raw MySQL query optimizations
├── Dockerfile                  # Production Docker file
├── docker-compose.yml          # Container orchestrator
├── .env.example
├── .env
├── tsconfig.json
├── package.json
└── README.md
```

---

## Third-Party Packages Used & Rationale

- **`sequelize` & `mysql2`**: Object-Relational Mapper (ORM) and driver for MySQL database. Simplifies model schema definition, migrations, and manages the database connection pool.
- **`ajv` & `ajv-formats`**: High-performance JSON Schema Validator. Used to validate environment configurations at startup and parse/coerce incoming REST request payloads, replacing Zod.
- **`winston` & `winston-daily-rotate-file`**: Multi-transport logging system. Configured for structured console logging and daily file rotation, essential for auditing security gate logs.
- **`helmet`**: Enhances API security by setting HTTP response headers (e.g., DNS prefetching, clickjacking protection, XSS filtering).
- **`compression`**: Middleware that GZip-compresses Express server response payloads to reduce network bandwidth usage and latency.
- **`express-rate-limit`**: Rate limiter for Express. Prevents DDoS attacks and protects API endpoints from being spammed by malfunctioning IoT card scanners.
- **`dotenv`**: Loads environment variables from a `.env` file into `process.env`.
- **`cors`**: Enables Cross-Origin Resource Sharing (CORS) rules.

---

## Step-by-Step Setup Guide

1. **Environment Configuration**:
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
2. **Build and Run Containers**:
   Spin up the MySQL database, Redis cache, and clustered Express backend:
   ```bash
   docker-compose up --build
   ```
3. **Database Seeding (Automatic)**:
   Seeder data runs automatically on server startup. To trigger seeding manually, run:
   ```bash
   docker-compose exec app node dist/scripts/seed.js
   ```
4. **Run Tests**:
   Run the unit and integration test suite:
   ```bash
   npm run test
   ```

---

## Environment Variables

- `PORT`: HTTP Server port (default `3000`).
- `NODE_ENV`: Execution mode (`development` / `production` / `test`).
- `DB_HOST`: MySQL database host (default `127.0.0.1`).
- `DB_PORT`: MySQL database port (default `3306`).
- `DB_USER`: MySQL database user (default `root`).
- `DB_PASSWORD`: MySQL database password.
- `DB_NAME`: MySQL database name.
- `REDIS_HOST`: Redis server host (default `127.0.0.1`).
- `REDIS_PORT`: Redis server port (default `6379`).
- `JWT_SECRET`: Secret key for signing JWT Access Tokens.
- `JWT_REFRESH_SECRET`: Secret key for signing Refresh Tokens.

---

## API Endpoints

### Health Diagnostics
- **`GET /api/v1/health`**: Check application server status, uptime, and timestamp.

### IoT Access Scanners
- **`POST /api/v1/iot/rfid-scan`**: Simulate scanning an RFID card.
  - Body: `{ cardUid: string, deviceId: string, direction: 'in' | 'out' }`
- **`POST /api/v1/iot/biometric-scan`**: Simulate checking a biometric fingerprint print.
  - Body: `{ biometricId: number, deviceId: string, direction: 'in' | 'out' }`
- **`POST /api/v1/iot/camera-trigger`**: Simulate face recognition CCTV cameras triggering entry.
  - Body: `{ deviceId: string, direction: 'in' | 'out', email: string, rtspSnapshot: string }`
- **`GET /api/v1/iot/logs`**: Get paginated access logs filtered by status or deviceType.
  - Query params: `page`, `limit`, `status`, `deviceType`

### Authentication & Access Control
- **`POST /api/v1/auth/register`**: Register a new user profile with standard passwords and roles.
  - Body: `{ email: string, password: string, role: 'admin' | 'manager' | 'staff' }`
- **`POST /api/v1/auth/login`**: Perform credential checks and acquire fresh access (JWT) and refresh tokens.
  - Body: `{ email: string, password: string }`
- **`POST /api/v1/auth/refresh`**: Rotate the active refresh token and acquire a new token pair.
  - Body: `{ refreshToken: string }`
- **`POST /api/v1/auth/logout`**: Terminate the session and revoke the active refresh token.
  - Body: `{ refreshToken: string }`
- **`GET /api/v1/auth/admin/users`**: List all user records (Allowed roles: `admin`).

### Product Inventory REST API
- **`GET /api/v1/products`**: Fetch products with pagination, search, and category filters (Allowed: all authenticated).
  - Query params: `page`, `limit`, `search`, `category`, `isActive`
  - Headers returned: `X-Total-Count`
- **`GET /api/v1/products/:id`**: Fetch a single product by ID (Allowed: all authenticated).
- **`POST /api/v1/products`**: Create a new product (Allowed roles: `admin`, `manager`).
  - Body: `{ name: string, description: string, price: number, stock: number, category: 'electronics' | 'clothing' | 'food' | 'other' }`
- **`PUT /api/v1/products/:id`**: Full product update (Allowed roles: `admin`, `manager`).
- **`PATCH /api/v1/products/:id`**: Partial product update (Allowed roles: `admin`, `manager`).
- **`DELETE /api/v1/products/:id`**: Soft-delete a product record (Allowed roles: `admin`, `manager`).

### Workforce Personnel & Access Control
- **`GET /api/v1/employees`**: Retrieve all employees with paginated options, search (by name, email, employee code, department), and filter by access status.
  - Query params: `page` (default `1`), `limit` (default `20`), `hasAccess` (`true` | `false`), `search` (string)
- **`PATCH /api/v1/employees/:id/access`**: Grant or revoke building/gate access to an employee.
  - Body: `{ hasAccess: boolean }`

---

## Architectural & Design Decisions

1. **Low-Level TCP Buffer Decoder**:
   Physical scanner terminals stream data over raw TCP. If multiple scans arrive merged in one packet (TCP fragmentation), standard socket listeners truncate or misread inputs. We implemented a line-based buffer decoder that splits streams on the newline character (`\n`), ensuring zero lost events.
2. **Skip ORM Hydration**:
   By default, Sequelize converts every query row into a full Model class instance. We applied `{ raw: true }` and `{ raw: true, nest: true }` to read-only queries, returning simple JavaScript objects directly from the driver and boosting search performance.
3. **Resilient Connection Loop**:
   If the MySQL database container is starting up slowly, backend boot fails. We implemented an exponential backoff retry connection loop on primary server boot, guaranteeing startup safety.
4. **Redis Cache Resiliency**:
   Employee lookups cache for 10 seconds. In case the Redis container goes down under load, we implemented a try-catch query guard that falls back to MySQL dynamically, preventing any downtime.
5. **Immediate Cache Invalidation on Access Revocation/Grant**:
   If an employee's access status changes (`PATCH /api/v1/employees/:id/access`), their cached lookup keys (`rfid_*`, `bio_*`, `face_*`) are immediately invalidated in Redis. This prevents the "authorization lag" where a deactivated card would still grant access for up to 10 seconds due to TTL caching.
6. **Centralized Error Handling Framework**:
   Error handling is completely centralized. Controllers never send custom inline error JSON responses; instead, they instantiate `AppError` (custom class inheriting `Error` that accepts a `statusCode` and optional validation details) and pass it down to `next(new AppError(...))`. The global error middleware captures the event, logs the error stack trace internally using the Winston logger, and sends a standardized error JSON structure.
7. **Hashed Refresh Token Rotation**:
   Refresh tokens are signed JWT keys. To prevent session hijacking and replay attacks, we hash refresh tokens in the database using SHA256 before validation. Invoking the refresh endpoint rotates the token by immediately revoking the old entry in the database and creating a new record.
8. **Paranoid Soft Deletes**:
   To preserve catalog change logs and history, the `Product` model utilizes Sequelize paranoid soft-delete settings, mapping deletions to `deleted_at` timestamps instead of executing destructive queries.
