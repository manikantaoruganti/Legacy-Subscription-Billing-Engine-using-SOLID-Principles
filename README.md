# Subscription Billing Engine - SOLID Refactoring

A complete, production-ready refactoring of a legacy subscription billing engine using **SOLID principles**, **Hexagonal Architecture (Ports & Adapters)**, and **Dependency Injection** in TypeScript.

---

## Table of Contents
1. [Problem Statement](#problem-statement)
2. [Architecture Comparison](#architecture-comparison)
3. [SOLID Principles Applied](#solid-principles-applied)
4. [Folder Structure](#folder-structure)
5. [Business Rules](#business-rules)
6. [Database Schema & Seed Data](#database-schema--seed-data)
7. [API Documentation](#api-documentation)
8. [Local Setup & Installation](#local-setup--installation)
9. [Docker Setup](#docker-setup)
10. [Running Tests & Coverage](#running-tests--coverage)
11. [Verification Commands](#verification-commands)

---

## Problem Statement

The legacy `LegacySubscriptionManager` was a tightly coupled "God Class" that mixed database queries, external payment API calls, system clock access, and business rules in a single file. This made the system fragile, impossible to unit test without live infrastructure, and extremely difficult to maintain or extend.

---

## Architecture Comparison

### Legacy Architecture (Tightly Coupled)
```
[Express API] ──> [LegacySubscriptionManager]
                         ├── Direct SQL Queries (PostgreSQL)
                         ├── Direct HTTP Calls (Stripe API)
                         └── Direct System Clock (new Date())
```

### Refactored Architecture (Hexagonal / Ports & Adapters)
```
                 [Express API / Controller]
                             │
                             ▼ (Uses)
┌─────────────────────── Domain Layer ───────────────────────┐
│                                                            │
│               [SubscriptionBillingService]                 │
│                            │                               │
│       ┌────────────────────┼────────────────────┐          │
│       ▼ (Depends on)       ▼ (Depends on)       ▼          │
│  [IUserRepository]  [ISubscriptionRepo]  [IPaymentGateway] │
└───────┬────────────────────┬────────────────────┬──────────┘
        ▲                    ▲                    ▲
        │ (Implements)       │ (Implements)       │ (Implements)
┌───────┴────────────── Infrastructure Layer ─────┴──────────┐
│                                                            │
│  [PostgresUserRepo] [PostgresSubRepo]  [MockStripeGateway] │
│        │                   │                    │          │
│        ▼                   ▼                    ▼          │
│   [PostgreSQL]        [PostgreSQL]         [Mock API]      │
└────────────────────────────────────────────────────────────┘
```

---

## SOLID Principles Applied

- **Single Responsibility Principle (SRP)**: The core domain service (`SubscriptionBillingService`) is only responsible for coordinating business rules. Database access, payment processing, and HTTP routing are delegated to dedicated classes.
- **Open/Closed Principle (OCP)**: The system is open for extension but closed for modification. For example, we can add a PayPal payment gateway by implementing `IPaymentGateway` without modifying the domain service.
- **Liskov Substitution Principle (LSP)**: Any implementation of a port (e.g., `PostgresUserRepository` or an in-memory mock repository) can be substituted without breaking the system.
- **Interface Segregation Principle (ISP)**: Ports are small, focused, and client-specific (e.g., `ITimeProvider` only has `getCurrentTime()`).
- **Dependency Inversion Principle (DIP)**: High-level domain modules do not depend on low-level infrastructure modules. Both depend on abstractions (Ports).

---

## Folder Structure

```
subscription-billing-refactor/
├── .env.example
├── .gitignore
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── jest.config.ts
├── README.md
├── submission.json
├── legacy/
│   └── LegacySubscriptionManager.ts
├── docs/
│   └── ADR-001-Refactoring-God-Class.md
├── src/
│   ├── domain/
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   └── Subscription.ts
│   │   ├── ports/
│   │   │   ├── ISubscriptionRepository.ts
│   │   │   ├── IUserRepository.ts
│   │   │   ├── IPaymentGateway.ts
│   │   │   └── ITimeProvider.ts
│   │   └── services/
│   │       └── SubscriptionBillingService.ts
│   ├── infrastructure/
│   │   ├── adapters/
│   │   │   ├── PostgresSubscriptionRepository.ts
│   │   │   ├── PostgresUserRepository.ts
│   │   │   ├── MockStripePaymentGateway.ts
│   │   │   └── SystemTimeProvider.ts
│   │   └── database/
│   │       ├── init.sql
│   │       └── seed.sql
│   └── api/
│       ├── controllers/
│       │   └── RenewalController.ts
│       └── server.ts
└── tests/
    ├── unit/
    │   └── SubscriptionBillingService.test.ts
    └── integration/
        └── api.integration.test.ts
```

---

## Business Rules

1. **User Validation**: Verify user exists. If not, return `User not found`.
2. **Subscription Validation**: Verify subscription exists. If not, return `Subscription not found`.
3. **Expiration Check**: Subscription must be expired (`expiresAt <= now`). If not, return `Subscription is not yet expired`.
4. **December Discount**: If the current month is December, apply a 10% discount to the base price.
5. **Payment Processing**: Charge the customer via the payment gateway. If payment fails, return `Payment failed`. If an exception occurs, return `Payment gateway error`.
6. **Successful Renewal**: Upon successful payment, update the subscription expiration date to exactly **1 year from the current injected time**.

---

## Database Schema & Seed Data

### Schema
- **`users`**: `id` (PK), `stripe_customer_id` (Unique)
- **`subscriptions`**: `id` (PK), `user_id` (FK, Unique), `base_price`, `expires_at`

### Seed Data
1. **Expired User (`user-expired-001`)**: Subscription expired on Dec 1, 2024.
2. **Active User (`user-active-001`)**: Subscription expires on Dec 1, 2035.
3. **December Discount User (`user-december-001`)**: Subscription expired on Dec 1, 2024.

---

## API Documentation

### 1. Health Check
- **Endpoint**: `GET /health`
- **Response (200)**:
```json
{
  "status": "ok",
  "database": "connected"
}
```

### 2. Process Renewal
- **Endpoint**: `POST /api/renew`
- **Request Body**:
```json
{
  "userId": "user-expired-001"
}
```
- **Success Response (200)**:
```json
{
  "success": true,
  "message": "Renewal successful"
}
```
- **Error Response (400)**:
```json
{
  "success": false,
  "message": "Subscription is not yet expired"
}
```

---

## Local Setup & Installation

### Prerequisites
- Node.js 20+
- PostgreSQL (if running locally without Docker)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Build the TypeScript code:
   ```bash
   npm run build
   ```

---

## Docker Setup

The easiest way to run the entire stack (API + Database + Seeding) is using Docker Compose.

1. Start the services:
   ```bash
   docker compose up -d
   ```
2. Verify the services are running:
   ```bash
   docker compose ps
   ```
3. View logs:
   ```bash
   docker compose logs -f api
   ```

---

## Running Tests & Coverage

### Run Unit Tests
Unit tests run in complete isolation without requiring Docker or PostgreSQL.
```bash
npm run test:unit
```

### Run Integration Tests
Integration tests require a running PostgreSQL database.
```bash
npm run test:integration
```

### Run All Tests with Coverage
```bash
npm run test:coverage
```

---

## Verification Commands

Once Docker Compose is running, you can verify the API using `curl`:

### 1. Verify Health Check
```bash
curl -X GET http://localhost:3000/health
```

### 2. Renew Expired Subscription (Should Succeed)
```bash
curl -X POST http://localhost:3000/api/renew \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"user-expired-001\"}"
```

### 3. Renew Active Subscription (Should Fail)
```bash
curl -X POST http://localhost:3000/api/renew \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"user-active-001\"}"
```

### 4. Renew Non-Existent User (Should Fail)
```bash
curl -X POST http://localhost:3000/api/renew \
  -H "Content-Type: application/json" \
  -d "{\"userId\":\"user-does-not-exist-999\"}"
```
