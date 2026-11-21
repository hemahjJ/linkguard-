# 🛡️ AegisLoom Security Lab — Training Simulation Backend

**Made by Rishi Jha**

> **Authorized Cybersecurity Awareness Training Simulation Only**  
> **Strict Privacy Charter**: Never collect, store, transmit, validate, or log real passwords, OTPs, payment data, session tokens, or personal credentials.

---

## 📌 Executive Overview

**AegisLoom Security Lab** is an enterprise-grade cybersecurity awareness and phishing defense training platform backend. It empowers organizations to simulate social engineering threats in an isolated, educational environment with zero security risk to participants.

### 🔒 Non-Negotiable Safety & Privacy Guarantees

1. **Zero Credential Capture**: Any request to simulated login endpoints (`/api/v1/simulation/login-intercept`) immediately discards all form fields without inspection, parsing, or persistence. A fixed educational response is returned:  
   `"This was a training simulation. Never enter credentials on unverified websites."`
2. **Minimal Anonymous Metadata**: The system stores only non-PII training metrics: anonymous learner identifier (pseudonymous UUID/hash), module completion state, safe quiz scores, and timestamps.
3. **No External Communications**: Strictly **no** email delivery services (SMTP/SES/SendGrid), no tracking pixels, and no real-brand impersonation. All scenario brands (*AegisLoom*, *AuraGrid Cloud*, *KestrelDynamics*) are 100% fictional.
4. **Admin-Only Authentication**: Authentication is restricted solely to authorized training administrators. Learners interact anonymously.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v20+ / v22+ / v24+)
- **Framework**: Express.js with TypeScript (strict mode enabled)
- **Database**: PostgreSQL 15+ (with automatic in-memory fallback for offline development & tests)
- **Validation**: Zod schema validation
- **Security Hardening**:
  - `bcryptjs` for administrator password hashing (cost factor 10)
  - Native Node.js `crypto` RFC 6238 TOTP engine for Multi-Factor Authentication (MFA)
  - `helmet` for strict Content-Security-Policy (CSP), HSTS, and framing controls
  - `express-rate-limit` for DDoS and brute-force mitigation
  - `cors` with configurable origin allowlists
  - Centralized audit logging for administrative oversight

---

## 📁 Repository Structure

```
.
├── migrations/
│   ├── 001_initial_schema.sql        # Database schema (admin users, modules, scenarios, quizzes, completions)
│   ├── 002_seed_training_data.sql    # Seed data (fictional modules, scenarios, questions, default admin)
│   └── migrate.ts                    # Migration runner script
├── src/
│   ├── config/
│   │   ├── env.ts                    # Type-safe environment validation via Zod
│   │   └── database.ts               # PostgreSQL pool & connection manager
│   ├── middleware/
│   │   ├── auth.ts                   # JWT bearer token verification
│   │   ├── rbac.ts                   # Role-based access control (super_admin, training_manager, analyst)
│   │   ├── rateLimiter.ts            # Rate limiting policies (general, auth, simulation)
│   │   ├── securityHeaders.ts        # Helmet CSP, HSTS, no-cache headers, Request-ID injection
│   │   ├── validation.ts             # Generic Zod request validator
│   │   └── errorHandler.ts           # Centralized structured error handler
│   ├── modules/
│   │   ├── auth/                     # Administrator login, MFA setup/confirm, token refresh
│   │   ├── simulation/               # Zero-credential login trap & simulated phish reporting
│   │   ├── training/                 # Modules, scenarios, safe quizzes, verifiable certificates
│   │   └── admin/                    # Scenario authoring, analytics, anonymized export, audit logs
│   ├── utils/
│   │   ├── logger.ts                 # JSON structured logger with auto-redaction
│   │   ├── auditLogger.ts            # Administrator audit trail
│   │   ├── token.ts                  # JWT signing & verification
│   │   ├── totp.ts                   # RFC 6238 TOTP generator & verifier
│   │   └── certificateGenerator.ts   # Cryptographic verification & SVG certificate generator
│   ├── app.ts                        # Express application configuration
│   └── server.ts                     # HTTP server bootstrap & graceful shutdown
├── tests/
│   ├── auth.test.ts                  # Administrator authentication & lockout tests
│   ├── simulation.test.ts            # Credential discard & trap response tests
│   ├── training.test.ts              # Modules, safe quiz evaluation, certificate tests
│   ├── rbac.test.ts                  # Role hierarchy & access enforcement tests
│   └── security.test.ts              # Security headers, CSP, health diagnostics tests
├── docs/
│   └── openapi.json                  # Complete OpenAPI 3.0.3 specification
├── .env.example                      # Configuration template
├── tsconfig.json                     # TypeScript compiler configuration
└── package.json
```

---

## 🚀 Quick Start & Local Setup

### 1. Prerequisites
- Node.js v20.x or higher
- npm or pnpm
- PostgreSQL (optional for local testing; an in-memory repository is active by default when PostgreSQL is offline)

### 2. Environment Configuration
Copy the template configuration:
```bash
cp .env.example .env
```

Review and adjust variables in `.env`:
```env
PORT=4000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/aegisloom_training
JWT_SECRET=super_secret_aegisloom_jwt_key_minimum_32_characters_random_hex
CORS_ORIGIN=*
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Database Setup & Migrations (Optional if PostgreSQL is running)
Create your PostgreSQL database:
```sql
CREATE DATABASE aegisloom_training;
```
Run the migrations:
```bash
npm run migrate
```
*(Default seed admin user: `aegis_secops` / `AegisLoom#Admin2026!Secure`)*

### 5. Start the Development Server
```bash
npm run dev
```
The server will start at: `http://localhost:4000`

---

## 🧪 Running Unit Tests

The backend includes a comprehensive unit test suite covering authentication, RBAC, simulation interception, safe quiz evaluations, and security headers:

```bash
npm test
```

### Test Coverage Highlights:
- ✅ **Simulation Trap**: Confirms passwords/credentials are never saved and returns fixed educational text.
- ✅ **MFA & Auth**: Tests bcrypt verification, brute-force lockout (5 failed attempts), and step-up TOTP challenges.
- ✅ **RBAC Enforce**: Verifies analysts cannot create scenarios and unauthenticated calls receive 401.
- ✅ **Safe Quizzes**: Ensures correct answer indicators (`is_correct`) are never leaked to client before submission.
- ✅ **Certificates**: Tests cryptographic HMAC hash verification and downloadable SVG certificate rendering.

---

## 📡 API Reference Overview

Base path: `/api/v1`

### Simulation & Safe Traps (Public)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` / `GET` | `/simulation/login-intercept` | **Trap Endpoint**: Discards credentials, returns fixed educational notice |
| `POST` | `/simulation/report-phish` | Simulates user reporting suspicious email to corporate SOC |
| `GET` | `/simulation/risk-score-guide` | Educational risk calculation guide and red flag checklist |

### Training & Certificates (Public)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/training/modules` | List active training modules |
| `GET` | `/training/modules/:id` | Get module detail & associated published scenarios |
| `GET` | `/training/scenarios/:id` | View fictional scenario email headers, body, and clues |
| `GET` | `/training/quizzes/:moduleId` | Fetch safe quiz questions (answers masked) |
| `POST` | `/training/quizzes/:moduleId/evaluate` | Submit answers, calculate score, receive explanations |
| `GET` | `/training/certificate/:completionId` | Download certificate (JSON or SVG vector format) |
| `GET` | `/training/verify-certificate/:certId`| Public verification of certificate authenticity |

### Administrator Authentication (Admin)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/auth/login` | Administrator login (rate-limited, bcrypt password check) |
| `POST` | `/auth/refresh` | Refresh expired access token |
| `GET` | `/auth/me` | Current authenticated admin profile |
| `POST` | `/auth/mfa/setup` | Generate TOTP secret and `otpauth://` QR URI |
| `POST` | `/auth/mfa/confirm` | Activate MFA using 6-digit TOTP code |

### Administrator Dashboard & Oversight (Protected via RBAC)
| Method | Endpoint | Required Role | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/admin/scenarios` | `training_manager` | Create new fictional training scenario |
| `PUT` | `/admin/scenarios/:id` | `training_manager` | Edit scenario content |
| `PATCH` | `/admin/scenarios/:id/publish` | `training_manager` | Publish or archive scenario |
| `GET` | `/admin/analytics/completion` | `analyst` | Review aggregate training completion metrics |
| `GET` | `/admin/analytics/export` | `analyst` | Export anonymized compliance report (JSON/CSV) |
| `GET` | `/admin/audit-logs` | `super_admin` | Inspect administrative audit trail |

---

## 🛡️ Security Architecture & Headers

All responses include hardened HTTP headers configured via `helmet`:
- **Content-Security-Policy (CSP)**: Disallows object/flash plugins, limits script origins.
- **Strict-Transport-Security (HSTS)**: `max-age=31536000; includeSubDomains; preload` (in production).
- **X-Frame-Options**: `DENY` to prevent clickjacking.
- **X-Content-Type-Options**: `nosniff` preventing MIME confusion.
- **X-Simulation-Notice**: `AegisLoom-Authorized-Training-Only` stamped on every response.
- **Cache-Control**: `no-store, no-cache` enforced on simulation, auth, and quiz routes.

---

## 📜 Ethical & Compliance Charter

1. **Fictional Entities Only**: All organizations in scenarios (*AegisLoom*, *AuraGrid*, *KestrelDynamics*) are strictly fictional.
2. **Defensive Awareness**: Built exclusively for non-adversarial enterprise cyber-defense education.
3. **Auditability**: Administrative actions are tracked in `audit_logs` for non-repudiation.
4. **License**: Apache-2.0
