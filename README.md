<div align="center">

# 🚩 Feature Flag Gateway

**A high-performance feature flag service with centralized Keycloak authentication, exposed over REST and gRPC.**

[![Node.js](https://img.shields.io/badge/Node.js-22-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![gRPC](https://img.shields.io/badge/gRPC-enabled-4285F4?logo=googlecloud&logoColor=white)](https://grpc.io)
[![Keycloak](https://img.shields.io/badge/Keycloak-25.0-00B8E3?logo=keycloak&logoColor=white)](https://www.keycloak.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com)

</div>

---

## Overview

Feature Flag Gateway is a self-hosted service for managing feature flags across applications. Flags are administered through a REST API and consumed by client applications in real time over a streaming gRPC connection. Access to admin endpoints is secured by Keycloak, with JWT-based authentication and realm-scoped clients.

## 🛠 Tech Stack

| Layer             | Technology                 |
| ----------------- | -------------------------- |
| Runtime           | Node.js 22 + TypeScript    |
| Admin API         | Express.js (REST)          |
| Client API        | gRPC (streaming)           |
| Database          | PostgreSQL 15 + Prisma ORM |
| Cache             | Redis 7                    |
| Identity & Access | Keycloak 25                |
| Containerization  | Docker Compose             |

## 📦 Architecture

```
┌─────────────┐      REST (JWT)      ┌──────────────────────┐           ┌────────────┐
│   Admin UI  │ ────────────────────▶│                      │ ◀───────▶ │ PostgreSQL │
└─────────────┘                      │ Feature Flag Gateway │           └────────────┘
                                     │  (Express + gRPC)    │           ┌────────────┐
┌─────────────┐      gRPC (JWT)      │                      │ ◀───────▶ │   Redis    │
│   Clients   │ ────────────────────▶│                      │           └────────────┘
└─────────────┘                      └───────────┬──────────┘
                                                 │
                                      JWKS / Token Validation
                                                 │
                                                 ▼
                                         ┌───────────────┐
                                         │   Keycloak    │
                                         └───────────────┘
```

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/umuterarslan/feature-flag-gateway
cd feature-flag-gateway
```

### 2. Launch with Docker

```bash
docker compose down -v
docker compose up -d --build
```

This spins up Postgres, Redis, Keycloak (with its own database and pre-configured realm), runs pending Prisma migrations, and starts the gateway on:

- **REST API** → `http://localhost:3000`
- **gRPC** → `localhost:50051`
- **Keycloak Admin Console** → `http://localhost:8080`

## 🔐 Authentication

Protected REST endpoints require a JWT issued by Keycloak.

**Request a token:**

```
POST /realms/feature-flag-realm/protocol/openid-connect/token
Content-Type: application/x-www-form-urlencoded
```

| Field        | Value                 |
| ------------ | --------------------- |
| `client_id`  | `feature-flag-client` |
| `grant_type` | `password`            |
| `username`   | `test`                |
| `password`   | `123123`              |

Include the returned `access_token` as a `Bearer` token in the `Authorization` header of subsequent requests.

## 🧪 REST API (Admin Operations)

### Create a flag

```
POST /api/flags/
Content-Type: application/json
```

```json
{
    "key": "new_navbar",
    "enabled": false,
    "conditions": {
        "percentage": 10,
        "location": "EN"
    }
}
```

### List flags (cursor-based pagination)

```
GET /api/flags?limit=10&cursor=<cursor_id>
```

The `cursor` parameter is an opaque string representing the last seen flag ID. Cursor-based pagination lets the database jump directly to the next page instead of scanning and discarding skipped rows, which keeps performance stable as the table grows — unlike offset-based pagination.

### Get a flag by ID

```
GET /api/flags/:id
```

### Update a flag

```
PATCH /api/flags/:id
```

```json
{
    "key": "new_navbar",
    "enabled": true,
    "conditions": {
        "percentage": 20,
        "location": "EN"
    }
}
```

Use this to toggle a flag's status or modify its any field.

## 📡 gRPC Service

The gateway listens on port `50051` for client connections. It supports two modes of operation:

**1. Context-Aware Evaluation (Unary) - `FlagService/IsFeatureEnabled`**

Evaluate a flag against a specific user context. The server calculates conditions (e.g., rollout percentage, location) and returns a simple boolean result:

**Request:**

```json
{
    "key": "new_navbar",
    "context": {
        "userId": "123",
        "location": "EN"
    }
}
```

**Response:**

`true or false`

**2. Streaming Updates (Stream) — `FlagService/StreamFlags`**

Open a persistent connection to receive live flag changes as they happen:

```json
{ "key": "new_navbar" }
```

**Response:**

```json
{
    "key": "new_navbar",
    "enabled": true,
    "conditions": {
        "percentage": 20,
        "location": "EN"
    }
}
```
