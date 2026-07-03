# Clustered Workforce Access Control Platform

**Stack:** Express.js · Sequelize · MySQL · Redis · Docker

---

## Project Overview

A mission-critical Workforce Management & Access Control backend designed for high-security environments. The system handles gate access logs, employee registries, and integrates with physical access control hardware (RFID scanners, biometric prints, and camera face triggers).

### Core Features

1. **Clustered Architecture**: Spawns HTTP worker threads based on available CPU cores to handle incoming REST API requests concurrently, backed by a master process connection manager.
2. **Low-Level TCP Listener**: Master process hosts a native TCP socket server on port `9000` to process raw streams from physical scanners. Includes custom **line-buffer decoding** to prevent packet fragmentation.
3. **Distributed Redis Caching**: Validates employee badges in sub-milliseconds by caching registry lookups in Redis (10s TTL), with a resilient automatic fallback to MySQL if Redis is offline.
4. **Automated Testing Suite**: Full unit and integration coverage using **Vitest** and **Supertest** running under 5 seconds.

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
│   │   ├── employee.controller.ts # Employee management & access toggle
│   │   ├── health.controller.ts# Health diagnostics
│   │   └── iot.controller.ts   # Device triggers & paginated logs API
│   ├── middleware/
│   │   ├── error.middleware.ts  # Global JSON exception handler
│   │   ├── logger.middleware.ts # Request logger
│   │   └── validate.middleware.ts # AJV request payload validator
│   ├── models/                 # Sequelize MySQL models
│   │   ├── index.ts            # Association registry
│   │   ├── employee.model.ts   # Workforce Personnel registry
│   │   └── access_log.model.ts # Gateway check-in logs
│   ├── routes/                 # Versioned API routes
│   │   ├── v1/
│   │   │   ├── employee.routes.ts # Employee management routes
│   │   │   ├── health.routes.ts
│   │   │   ├── iot.routes.ts
│   │   │   └── index.ts        # V1 router aggregator
│   │   └── index.ts            # Main router (/api/v1 prefix)
│   ├── schemas/                # AJV validation schemas
│   │   ├── employee.schema.ts  # Employee query & body schemas
│   │   └── iot.schema.ts
│   ├── services/               # Core business services
│   │   ├── iot.service.ts      # Card lookups & logs logic
│   │   └── tcp.service.ts      # Native TCP socket hardware server
│   ├── scripts/
│   │   └── seed.ts             # Safe database seeder (findOrCreate)
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
