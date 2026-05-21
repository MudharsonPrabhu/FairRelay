# FairRelay Operations Backend (Backend-DM)

The **Backend-DM** is the core operational server for the FairRelay platform. It bridges the AI optimization engine (Brain), the AI Supply Chain dashboard, the Driver mobile application, and the live database. Built with Node.js, Express, and Prisma, it handles real-time logistics, driver assignments, absorption handshakes, and e-Way bill generation.

## 🌟 Key Features

* **Real-time Dispatch & Monitoring**: Uses Socket.io to manage live connections, driver tracking, and real-time dashboard updates.
* **Absorption Handshake System**: Supports peer-to-peer digital handovers for shipments at virtual hubs. Includes cryptographic offline QR code generation.
* **Dynamic e-Way Bill Mimicry**: Uses Puppeteer to generate high-fidelity, professional PDF e-Way Bills matching government layouts without external APIs.
* **Brain Proxy & Orchestration**: Seamlessly communicates with the Python-based FairRelay Brain (AI Engine) to trigger load consolidation and fairness optimization pipelines.
* **Driver Wellness & Synergy**: Monitors driver workload and manages team synergy.
* **Role-Based Access Control (RBAC)**: Comprehensive JWT-based authentication for Administrators, Dispatchers, and Drivers.

---

## 🏗️ Technical Architecture

* **Framework**: Node.js, Express.js
* **Database**: PostgreSQL
* **ORM**: Prisma Client (`@prisma/client` v6.19.0)
* **Real-time Engine**: Socket.IO
* **Virtual Printer**: Puppeteer (for generating PDFs from HTML templates)
* **Authentication**: JSON Web Tokens (JWT) & bcrypt
* **Documentation**: Swagger UI (`swagger-jsdoc`, `swagger-ui-express`)

---

## 📂 Project Structure

```text
ops/backend-dm/
├── config/              # Swagger config, Prisma instantiation
├── controllers/         # Request handlers for all routes
├── middleware/          # JWT Auth, RBAC, Error handling
├── prisma/              # schema.prisma and seeders
├── routes/              # Express API route definitions
├── scripts/             # Utility and migration scripts
├── services/            # Core business logic (Puppeteer, QR, Brain Proxy, Synergy Monitor)
├── templates/           # HTML templates for e-Way Bills
├── public/              # Static assets (CSS for PDFs)
└── index.js             # Application entry point
```

---

## 🔌 API Modules Overview

The API is structured into several core modules, accessible under `/api/*`:

* **Authentication & OTP** (`/auth`, `/otp`): User registration, login, JWT issuance, and OTP verification.
* **Dispatch & Routing** (`/dispatch`, `/routes`, `/consolidation`): Interfaces with the AI Brain to optimize routes, assign missions, and consolidate loads.
* **Shipments & Deliveries** (`/shipments`, `/deliveries`, `/packages`): CRUD and state management for logistics items.
* **Relay & Absorption** (`/absorption`, `/virtual-hubs`, `/backhaul`): Manages the driver relay system, virtual hub check-ins, and peer-to-peer load transfers.
* **Driver Wellness & Synergy** (`/wellness`, `/synergy`): Tracks driver metrics, rest periods, and team performance matching.
* **e-Way Bills** (`/eway-bill`): Automated PDF generation and downloading of e-Way bills.
* **Fleet Management** (`/trucks`): Truck capacity and assignment tracking.
* **System Administration** (`/keys`): API key management for integrations.

*For complete interactive API documentation, run the server and visit `/api/docs`.*

---

## 🚀 Getting Started

### Prerequisites

* Node.js v18+
* PostgreSQL (Local or Cloud like Neon)
* Python AI Brain (Running locally or deployed, required for AI endpoints)

### 1. Installation

```bash
cd ops/backend-dm
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

**Key Environment Variables:**
* `PORT`: Server port (default: 3000)
* `DATABASE_URL`: PostgreSQL connection string
* `JWT_SECRET`: Secret key for token generation
* `BRAIN_URL`: URL of the Python AI Engine (e.g., `http://localhost:8000`)
* `CORS_ORIGINS`: Comma-separated list of allowed frontend origins

### 3. Database Setup

Generate the Prisma client and push the schema to your database:

```bash
npx prisma generate
npx prisma db push
```

*(Optional) Run the seed script to populate initial data:*
```bash
npm run seed  # If configured in package.json
```

### 4. Running the Server

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

---

## 🛠️ Built-in Scripts & Tools

* **`verify_api.js`**: A comprehensive test script that pings key endpoints to verify system health. Run via `node verify_api.js`.
* **`test_db.js`**: Simple database connection verification script.

---

## ☁️ Deployment

The project includes a `render.yaml` file for seamless deployment to [Render](https://render.com).

1. Connect your repository to Render.
2. Select the `Backend-DM` service defined in the blueprint.
3. Ensure `DATABASE_URL`, `JWT_SECRET`, and `BRAIN_URL` environment variables are securely set in the Render dashboard.

---

## 🔒 Security Notes

* **Rate Limiting**: Built-in rate limiting protects `/api/auth` and `/api/otp` endpoints from brute-force attacks.
* **Helmet**: Configured to secure HTTP headers.
* **CORS**: Dynamically configured to allow specific origins in production, while permitting local development domains.
