# Feature Flag Gateway Service

This project is a high-performance feature flag gateway service secured by a centralized **Keycloak** authentication system, supporting both **REST API** and **gRPC** protocols.

---

## 🛠 Tech Stack

- **Node.js & TypeScript**
- **Express.js** (for Admin REST API)
- **PostgreSQL** (Database)
- **gRPC** (for protocol communication)
- **Keycloak** (for Identity & Access Management)
- **Docker** (Containerization)

---

## 🚀 Setup & Initialization

**1. Clone the repository**

```
git clone https://github.com/umuterarslan/feature-flag-gateway
cd feature-flag-gateway
```

---

**2. Launch with Docker**

```
docker-compose down -v
docker-compose up -d --build
```

## 🧪 Testing & API Documentation

**1. Authentication (REST API)**

- To access protected endpoints, you must obtain a JWT from Keycloak.

- Request: POST /realms/feature-flag-realm/protocol/openid-connect/token

- Body (x-www-form-urlencoded):

- client_id: feature-flag-client

- grant_type: password

- username: demo

- password: 123123

**2. REST API (Admin Operations)**

- **Create Flag (POST /api/flags/):**

```
{
  "key": "TestKeyt",
  "enabled": false,
  "conditions": { "location": "EN", "percentage": 10 }
}
```

- **List Flags (`GET /api/flags?limit=10&cursor=<cursor_id>`):** Retrieve flags with pagination.
    - The `cursor` parameter is an opaque string representing the last seen flag ID.
    - Using a cursor is more performant than standard offset-based pagination as it allows the database to jump directly to the next set of records without scanning the skipped items.

- **Get Flag by ID (GET /api/flags/:id):** Fetch specific details by ID.

- **Update Flag (PATCH /api/flags/:id):** Toggle status or modify conditions.

**3. gRPC Service (Consumption)**

- The service listens on port 50051.

- Streaming Updates (FlagService/StreamFlags):
  Open a persistent connection to listen for live changes.

```
{ "key": "new_navbar" }
```
