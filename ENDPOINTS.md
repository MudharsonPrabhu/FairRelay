# FairRelay — Complete API Reference

> **Live Brain:** `https://fairrelay-brain-gdm1.onrender.com`  
> **Live Backend:** `https://fairrelay-backend.onrender.com`  
> **Dashboard:** `https://fair-relay.vercel.app`  
> **API Docs (interactive):** `https://fairrelay-brain-gdm1.onrender.com/docs`

---

## LoRRI — Integration at a Glance

> **LoRRI doesn't need to rebuild anything. Three API calls — that's the entire integration.**

---

### Call 1 — Fair Dispatch

```
POST https://fairrelay-brain-gdm1.onrender.com/api/v1/allocate/langgraph
```

```json
// Send
{
  "drivers":  [ { "id": "drv_001", "name": "Rajan", "vehicle_capacity_kg": 2000 } ],
  "packages": [ { "id": "pkg_001", "weight_kg": 5.0, "latitude": 18.52, "longitude": 73.85, "address": "Pune Industrial", "fragility_level": 2 } ],
  "date":     "2026-05-16",
  "warehouse": { "lat": 19.076, "lng": 72.877 }
}
```

```json
// Get back
{
  "global_fairness": { "gini_index": 0.034, "fairness_grade": "A+" },
  "assignments": [
    {
      "driver_name": "Rajan",
      "route_summary": { "num_packages": 12, "estimated_time_minutes": 145 },
      "explanation": "Rajan gets the shorter Mumbai-Pune corridor — keeps workload balanced across the fleet.",
      "fairness_score": 0.92
    }
  ],
  "agent_events": [
    { "agent": "ml_effort_agent",  "message": "Effort matrix built"             },
    { "agent": "route_planner",    "message": "OR-Tools assignment proposed"     },
    { "agent": "fairness_manager", "message": "ACCEPT — Gini 0.034 below 0.25"  },
    { "agent": "driver_liaison",   "message": "No appeals raised"                },
    { "agent": "explainability",   "message": "Natural language explanations done" }
  ]
}
```

**8 agents. Fair assignments + Gini score + per-driver explanations + full agent trace.**

---

### Call 2 — Load Consolidation

```
POST https://fairrelay-brain-gdm1.onrender.com/api/v1/consolidate
```

```json
// Send
{
  "shipments": [
    { "id": "SH-001", "pickupLat": 19.076, "pickupLng": 72.877, "dropLat": 18.52, "dropLng": 73.856, "weight": 800  },
    { "id": "SH-002", "pickupLat": 19.113, "pickupLng": 72.869, "dropLat": 18.58, "dropLng": 73.724, "weight": 600  },
    { "id": "SH-003", "pickupLat": 19.033, "pickupLng": 72.855, "dropLat": 18.46, "dropLng": 73.850, "weight": 500  }
  ],
  "trucks":  [ { "id": "TRK-001", "maxWeight": 2000 }, { "id": "TRK-002", "maxWeight": 5000 } ],
  "options": { "maxGroupRadiusKm": 30, "timeWindowToleranceMinutes": 120 }
}
```

```json
// Get back
{
  "data": {
    "groups": [
      {
        "groupId": "G1", "truck": "TRK-001",
        "shipments": ["SH-001", "SH-002"],
        "utilizationPct": 70,
        "co2SavedKg": 22.5,
        "carbonCreditUSD": 0.34
      }
    ],
    "metrics": {
      "tripsBefore": 3, "tripsAfter": 2, "tripsReduced": 1,
      "distanceSavedKm": 137, "totalCo2SavedKg": 22.5, "fuelSavedINR": 3150
    }
  },
  "agentSteps": [
    { "agent": "GeoClusteringAgent",       "ms": 120 },
    { "agent": "TimeWindowAgent",          "ms": 85  },
    { "agent": "CapacityOptimizationAgent","ms": 340 },
    { "agent": "ScoringConfidenceAgent",   "ms": 45  },
    { "agent": "ContinuousLearningAgent",  "ms": 90  }
  ],
  "insights": [ "Consolidating SH-001+SH-002 reduces trips by 33% and saves 22.5 kg CO₂ on this corridor." ]
}
```

**5 agents. Consolidated groups + utilization metrics + CO₂ saved + Gemini AI insights.**

---

### Call 3 — Carbon Intelligence

```
POST https://fairrelay-brain-gdm1.onrender.com/lorri/carbon/estimate
```

```json
// Send
{
  "shipments": [
    { "id": "SH-001", "lane": "Mumbai → Pune",  "dist_km": 149, "weight_kg": 800,  "max_kg": 2000, "truck": "Tata Ace Gold"   },
    { "id": "SH-002", "lane": "Delhi → Jaipur", "dist_km": 281, "weight_kg": 1500, "max_kg": 5000, "truck": "Eicher Pro 2049" },
    { "id": "SH-003", "lane": "Hyd → Kurnool",  "dist_km": 215, "weight_kg": 1800, "max_kg": 3000, "truck": "BharatBenz"      }
  ]
}
```

```json
// Get back
{
  "data": {
    "summary": {
      "totalCo2Kg": 57.3,  "savedCo2Kg": 78.2, "savingsPct": 57.7,
      "highRiskCount": 0,   "carbonCreditUSD": 1.17, "carbonCreditINR": 98,
      "fuelSavedLiters": 47.3, "fuelSavedINR": 4352,
      "treesEquivalent": 3, "fleetEfficiencyPct": 57.7,
      "emissionIntensity": 84.2
    },
    "highEmissionLanes": [
      { "lane": "Hyd → Kurnool", "co2_kg": 27.1, "risk": "MEDIUM" }
    ],
    "reductionOpportunities": [
      { "lane": "Delhi → Jaipur", "type": "consolidation", "saving_kg": 16.5, "effort": "Low", "saving_inr": 1530 },
      { "lane": "Hyd → Kurnool",  "type": "ev_route",      "saving_kg": 15.1, "effort": "Medium", "saving_inr": 890 }
    ],
    "aiInsight": "Fleet emitting 57.3 kg CO₂ — 78.2 kg (57.7%) saved vs full-load baseline. Fuel savings: ₹4,352 (47 L). Emission intensity: 84.2 g/tonne-km. Consolidating the Delhi-Jaipur corridor delivers fastest reduction with zero disruption."
  }
}
```

**5-step agent pipeline. Truck-specific CO₂ model (0.12–0.26 kg/km) + fuel ₹ savings + intermodal/EV opportunities + Gemini AI sustainability insight.**

---

> **"LoRRI sends us their data. We run 8 + 5 + 5 agents. They get back optimized assignments, fairness scores, consolidated loads, carbon impact, and AI narratives — in under 3 seconds."**

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [LoRRI Integration Guide](#2-lorri-integration-guide) ⭐ **Start here**
3. [Core AI Endpoints (Brain)](#3-core-ai-endpoints-brain)
   - [Allocation — LangGraph Pipeline](#31-allocation--langgraph-pipeline)
   - [Load Consolidation](#32-load-consolidation)
   - [Route Optimization](#33-route-optimization)
   - [Carbon Intelligence Agent](#34-carbon-intelligence-agent)
   - [Driver APIs](#35-driver-apis)
   - [Admin & Analytics](#36-admin--analytics)
   - [Real-time Events (SSE)](#37-real-time-events-sse)
4. [Node.js Backend Endpoints](#4-nodejs-backend-endpoints)
   - [Authentication & OTP](#41-authentication--otp)
   - [Drivers](#42-drivers)
   - [Shipments](#43-shipments)
   - [Deliveries](#44-deliveries)
   - [Wellness](#45-wellness)
   - [Consolidation & Route Proxy](#46-consolidation-proxy)
   - [V1 API Gateway](#47-v1-api-gateway)
   - [Absorption & Synergy](#48-absorption--synergy)
   - [Virtual Hubs & E-Way Bills](#49-virtual-hubs--e-way-bills)
   - [API Keys](#410-api-keys)
   - [Dashboard](#411-dashboard)
   - [Dispatch (AI Proxy)](#412-dispatch-ai-proxy)
5. [Error Codes Reference](#5-error-codes-reference)
6. [Rate Limits](#6-rate-limits)

---

## 1. Architecture Overview

```
LoRRI TMS (logisticsnow.in)
        │
        │ HTTPS — /lorri/* endpoints (dedicated LoRRI namespace)
        │
        ▼
AI Brain — FastAPI + LangGraph            (fairrelay-brain-gdm1.onrender.com)
  ├── /lorri/*     ← LoRRI integration adapter (API-key auth, webhook callbacks)
  ├── /api/v1/*    ← Core AI endpoints (allocation, consolidation, carbon)
  └── /health      ← Health check

Node.js Backend — Express + Prisma        (fairrelay-backend.onrender.com)
  ├── /api/*       ← CRUD: drivers, shipments, deliveries, wellness
  ├── /v1/*        ← API gateway (proxies to Brain, with fallback)
  └── Socket.IO    ← Real-time push events

Ops Dashboard — React + Vite              (fair-relay.vercel.app)
  └── Embeddable via iframe
```

**Key auth methods:**

| Service | Method | Header |
|---------|--------|--------|
| Brain `/lorri/*` | API Key | `x-api-key: fr_live_demo_key_2026` |
| Brain `/lorri/health` | None | — |
| Brain `/api/v1/*` | None | — |
| Backend `/v1/*` | API Key | `x-api-key: <your-key>` |
| Backend `/api/auth/*` | OTP → JWT | `Authorization: Bearer <token>` |

---

## 2. LoRRI Integration Guide

The `/lorri/*` namespace is purpose-built for LoRRI TMS integration. It accepts LoRRI-native payload formats, handles fallbacks internally, and can push webhook callbacks on completion.

### Quick-start: 3 API calls for full integration

```
Step 1 — Check FairRelay health before dispatch:
  GET /lorri/health

Step 2 — Score driver wellness (optional but recommended):
  POST /lorri/wellness

Step 3 — Run fair allocation:
  POST /lorri/allocate

Bonus — Carbon reporting for ESG:
  POST /lorri/carbon/estimate
```

---

### 2.1 `GET /lorri/health`

Health check designed for LoRRI uptime monitoring (UptimeRobot, Pingdom, etc.). No auth required.

**Request:**
```bash
curl https://fairrelay-brain-gdm1.onrender.com/lorri/health
```

**Response `200 OK`:**
```json
{
  "status": "operational",
  "brain": "connected",
  "version": "1.0.0",
  "agents_available": 6,
  "avg_latency_ms": 312,
  "uptime_seconds": 86423.7
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `"operational"` \| `"degraded"` | `degraded` means SQLite fallback active |
| `brain` | `"connected"` \| `"sqlite_fallback"` | DB connection status |
| `agents_available` | int | Number of LangGraph agents ready |
| `avg_latency_ms` | int \| null | Rolling average of last 100 requests |
| `uptime_seconds` | float | Seconds since last cold start |

---

### 2.2 `POST /lorri/allocate`

**The primary LoRRI integration endpoint.** Accepts LoRRI-native driver/route format, runs the full 8-agent LangGraph fairness pipeline, and optionally calls your webhook on completion.

**Auth:** `x-api-key` header required  
**Demo key:** `fr_live_demo_key_2026`  
**Rate limit:** 100 requests/min per key

**Request:**
```bash
curl -X POST https://fairrelay-brain-gdm1.onrender.com/lorri/allocate \
  -H "Content-Type: application/json" \
  -H "x-api-key: fr_live_demo_key_2026" \
  -d '{
    "drivers": [
      {
        "id": "drv_001",
        "name": "Rajan Kumar",
        "vehicle_capacity_kg": 2000,
        "preferred_language": "ta",
        "hours_today": 3.5
      },
      {
        "id": "drv_002",
        "name": "Suresh Pillai",
        "vehicle_capacity_kg": 5000,
        "preferred_language": "ml",
        "hours_today": 6.0
      }
    ],
    "routes": [
      {
        "id": "rt_001",
        "destination": "Pune Industrial Area",
        "distance_km": 149,
        "weight_kg": 800,
        "drop_lat": 18.5204,
        "drop_lng": 73.8567,
        "priority": "high"
      },
      {
        "id": "rt_002",
        "destination": "Nashik Depot",
        "distance_km": 167,
        "weight_kg": 1200,
        "drop_lat": 19.9975,
        "drop_lng": 73.7898,
        "priority": "normal"
      }
    ],
    "options": {
      "warehouse_lat": 19.0760,
      "warehouse_lng": 72.8777,
      "date": "2026-05-16"
    },
    "callback_url": "https://logisticsnow.in/webhooks/fairrelay"
  }'
```

**Request schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `drivers` | array | Yes | Array of driver objects |
| `drivers[].id` | string | Yes | LoRRI driver ID |
| `drivers[].name` | string | Yes | Driver name |
| `drivers[].vehicle_capacity_kg` | float | No | Default: 500 |
| `drivers[].preferred_language` | string | No | `en`, `ta`, `ml`, `hi`, `te` |
| `drivers[].hours_today` | float | No | Hours worked today (for fairness) |
| `routes` | array | Yes | Array of route/delivery objects |
| `routes[].id` | string | Yes | LoRRI route ID |
| `routes[].destination` | string | No | Destination name |
| `routes[].distance_km` | float | No | Route distance |
| `routes[].weight_kg` | float | No | Cargo weight |
| `routes[].drop_lat` | float | No | Drop latitude |
| `routes[].drop_lng` | float | No | Drop longitude |
| `routes[].priority` | string | No | `"high"`, `"normal"`, `"low"` |
| `options` | object | No | Optional configuration |
| `options.warehouse_lat` | float | No | Pickup depot latitude |
| `options.warehouse_lng` | float | No | Pickup depot longitude |
| `options.date` | string | No | ISO date (default: today) |
| `callback_url` | string | No | Webhook URL for async notification. **Must be `https://` and a public IP/domain — private IPs and localhost are blocked (SSRF protection).** |

**Response `200 OK` (live mode):**
```json
{
  "success": true,
  "data": {
    "id": "run_a3f2b1c0-e29b-41d4-a716-446655440abc",
    "allocations": [
      {
        "driver": "drv_001",
        "driver_name": "Rajan Kumar",
        "route": "rt_001",
        "wellness_score": 72,
        "workload_score": 61.4,
        "explanation": "Rajan has completed 3.5 hours today — assigning the shorter Pune route keeps workload balanced. Estimated completion by 14:30.",
        "route_summary": {
          "packages": 4,
          "weight_kg": 800,
          "stops": 3,
          "time_minutes": 185
        }
      },
      {
        "driver": "drv_002",
        "driver_name": "Suresh Pillai",
        "route": "rt_002",
        "wellness_score": 52,
        "workload_score": 64.2,
        "explanation": "Suresh's larger vehicle handles the Nashik load efficiently. Wellness flag: 6 hours on duty — short break recommended before departure.",
        "route_summary": {
          "packages": 6,
          "weight_kg": 1200,
          "stops": 4,
          "time_minutes": 220
        }
      }
    ]
  },
  "meta": {
    "gini_index": 0.034,
    "fairness_grade": "A+",
    "avg_workload": 62.8,
    "carbon_note": "Use POST /lorri/carbon/estimate for accurate CO₂ figures",
    "latency_ms": 387,
    "mode": "live",
    "agents_used": [
      "ml_effort",
      "route_planner",
      "fairness_manager",
      "driver_liaison",
      "final_resolution",
      "explainability"
    ]
  }
}
```

**Response `503 Service Unavailable` (pipeline failure — DB unavailable or LangGraph error):**
```json
{
  "success": false,
  "error": "Allocation pipeline failed",
  "detail": "Database connection timeout",
  "mode": "error"
}
```
> The server no longer silently falls back to a deterministic heuristic and returns `200 success:true`. Any pipeline failure returns **HTTP 503** so LoRRI clients can implement proper retry/fallback logic.

**Meta fields:**

| Field | Type | Description |
|-------|------|-------------|
| `gini_index` | float [0–1] | Gini coefficient of workload distribution. `< 0.1` = A+, `< 0.2` = A, else B |
| `fairness_grade` | `"A+"` \| `"A"` \| `"B"` | Human-readable fairness grade |
| `avg_workload` | float | Mean workload score across all drivers |
| `carbon_note` | string | Pointer to `/lorri/carbon/estimate` for accurate per-shipment CO₂ (removed inline estimate) |
| `latency_ms` | int | Total server-side processing time |
| `mode` | `"live"` \| `"fallback"` | Live = full LangGraph pipeline; fallback = deterministic heuristic |

**Webhook payload** (sent to `callback_url` on completion):
```json
{
  "event": "allocation.completed",
  "timestamp": "2026-05-16T08:23:45Z",
  "data": {
    "run_id": "run_a3f2b1c0-e29b-41d4-a716-446655440abc",
    "gini_index": 0.034,
    "num_drivers": 2,
    "latency_ms": 387
  }
}
```
Header: `X-FairRelay-Signature: sha256=<hmac>` (if `LORRI_WEBHOOK_SECRET` env is set)

---

### 2.3 `POST /lorri/wellness`

Score driver fitness before dispatch. Returns wellness score, risk level, and dispatch recommendation.

**Auth:** `x-api-key` header required

**Request:**
```bash
curl -X POST https://fairrelay-brain-gdm1.onrender.com/lorri/wellness \
  -H "Content-Type: application/json" \
  -H "x-api-key: fr_live_demo_key_2026" \
  -d '{
    "drivers": [
      {
        "id": "drv_001",
        "name": "Rajan Kumar",
        "hours_today": 8.5,
        "hours_since_rest": 7,
        "is_ill": false
      },
      {
        "id": "drv_002",
        "name": "Suresh Pillai",
        "hours_today": 4.0,
        "hours_since_rest": 3,
        "is_ill": true
      }
    ]
  }'
```

**Request schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `drivers[].id` | string | Yes | Driver ID |
| `drivers[].name` | string | No | Driver name |
| `drivers[].hours_today` | float | Yes | Hours on duty today |
| `drivers[].hours_since_rest` | float | Yes | Hours since last rest break |
| `drivers[].is_ill` | bool | Yes | Active illness flag |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "drivers": [
      {
        "id": "drv_001",
        "name": "Rajan Kumar",
        "wellness_score": 24,
        "risk_level": "HIGH",
        "recommendation": "Mandatory rest required",
        "fit_for_dispatch": false
      },
      {
        "id": "drv_002",
        "name": "Suresh Pillai",
        "wellness_score": 8,
        "risk_level": "HIGH",
        "recommendation": "Remove from duty — illness active",
        "fit_for_dispatch": false
      }
    ]
  }
}
```

**Wellness score formula:**
```
score = 100
  - (hours_today × 8)
  - (30 if is_ill)
  - (15 if hours_since_rest >= 6)

risk_level:
  score < 40  → HIGH
  score < 70  → MEDIUM
  score >= 70 → LOW
```

---

### 2.4 `POST /lorri/carbon/estimate`

**Carbon Intelligence Agent v2.0.** **Auth:** `x-api-key` header required. Runs a 5-step server-side pipeline with truck-specific IPCC AR6/CPCB emission factors, per-shipment CO₂ and fuel ₹ savings, five opportunity types (consolidation, scheduling, intermodal, EV route, vehicle upgrade), and a Gemini 2.5 Flash AI insight.

**Request:**
```bash
curl -X POST https://fairrelay-brain-gdm1.onrender.com/lorri/carbon/estimate \
  -H "Content-Type: application/json" \
  -H "x-api-key: fr_live_demo_key_2026" \
  -d '{
    "shipments": [
      {
        "id": "SH-001",
        "lane": "Mumbai → Pune",
        "dist_km": 149,
        "weight_kg": 800,
        "max_kg": 2000,
        "truck": "Tata Ace Gold"
      },
      {
        "id": "SH-002",
        "lane": "Delhi NCR → Jaipur",
        "dist_km": 281,
        "weight_kg": 1500,
        "max_kg": 5000,
        "truck": "Eicher Pro 2049"
      },
      {
        "id": "SH-003",
        "lane": "Hyderabad → Kurnool",
        "dist_km": 215,
        "weight_kg": 1800,
        "max_kg": 3000,
        "truck": "BharatBenz"
      }
    ],
    "date": "2026-05-16"
  }'
```

**Request schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shipments` | array | Yes | Array of shipment objects. **Max 100 items per request.** |
| `shipments[].id` | string | Yes | Shipment ID |
| `shipments[].lane` | string | Yes | Route label (e.g. "Mumbai → Pune") |
| `shipments[].dist_km` | float | Yes | Route distance in km. **Range: 0–50,000 km.** |
| `shipments[].weight_kg` | float | Yes | Cargo weight kg. **Range: 0–100,000 kg.** |
| `shipments[].max_kg` | float | Yes | Vehicle max capacity kg. **Range: 0–100,000 kg.** |
| `shipments[].truck` | string | No | Truck model label — used to select truck-specific emission factor. Falls back to 0.21 kg/km if omitted or unrecognised. |
| `date` | string | No | ISO date for the report |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "date": "2026-05-16",
    "shipments": [
      {
        "id": "SH-001",
        "lane": "Mumbai → Pune",
        "dist_km": 149,
        "weight_kg": 800,
        "max_kg": 2000,
        "truck": "Tata Ace Gold",
        "load_factor_pct": 40,
        "emission_factor": 0.12,
        "co2_kg": 7.2,
        "co2_baseline_kg": 17.9,
        "co2_saved_kg": 10.7,
        "co2_intensity_g_tkm": 60.4,
        "fuel_saved_liters": 8.1,
        "fuel_saved_inr": 745,
        "risk": "LOW"
      },
      {
        "id": "SH-002",
        "lane": "Delhi NCR → Jaipur",
        "dist_km": 281,
        "weight_kg": 1500,
        "max_kg": 5000,
        "truck": "Eicher Pro 2049",
        "load_factor_pct": 30,
        "emission_factor": 0.21,
        "co2_kg": 17.7,
        "co2_baseline_kg": 59.0,
        "co2_saved_kg": 41.3,
        "co2_intensity_g_tkm": 41.9,
        "fuel_saved_liters": 29.8,
        "fuel_saved_inr": 2742,
        "risk": "LOW"
      },
      {
        "id": "SH-003",
        "lane": "Hyderabad → Kurnool",
        "dist_km": 215,
        "weight_kg": 1800,
        "max_kg": 3000,
        "truck": "BharatBenz",
        "load_factor_pct": 60,
        "emission_factor": 0.26,
        "co2_kg": 33.5,
        "co2_baseline_kg": 55.9,
        "co2_saved_kg": 22.4,
        "co2_intensity_g_tkm": 103.4,
        "fuel_saved_liters": 9.5,
        "fuel_saved_inr": 874,
        "risk": "MEDIUM"
      }
    ],
    "highEmissionLanes": [
      { "lane": "Hyderabad → Kurnool", "co2_kg": 33.5, "risk": "MEDIUM" },
      { "lane": "Delhi NCR → Jaipur",  "co2_kg": 17.7, "risk": "LOW"    },
      { "lane": "Mumbai → Pune",        "co2_kg": 7.2,  "risk": "LOW"    }
    ],
    "reductionOpportunities": [
      {
        "lane": "Delhi NCR → Jaipur",
        "type": "consolidation",
        "finding": "Load factor 30% — consolidation can save 29.5 kg CO₂/run.",
        "saving_kg": 29.5,
        "saving_inr": 2742,
        "effort": "Low"
      },
      {
        "lane": "Mumbai → Pune",
        "type": "ev_route",
        "finding": "Urban short-haul 149 km — EV switch saves 76% CO₂ vs diesel on this corridor.",
        "saving_kg": 5.5,
        "saving_inr": 565,
        "effort": "Medium"
      },
      {
        "lane": "Hyderabad → Kurnool",
        "type": "vehicle_upgrade",
        "finding": "Upgrade to BS6 Euro-6 (0.26→0.21 kg/km) saves 6.5 kg CO₂ on highest-emission corridor.",
        "saving_kg": 6.5,
        "saving_inr": 598,
        "effort": "Medium"
      },
      {
        "lane": "Hyderabad → Kurnool",
        "type": "scheduling",
        "finding": "Night-window dispatch (22:00–05:00) reduces fuel burn ~12% → saves 4.0 kg CO₂.",
        "saving_kg": 4.0,
        "saving_inr": 368,
        "effort": "Low"
      }
    ],
    "summary": {
      "totalCo2Kg": 58.4,
      "baselineCo2Kg": 132.8,
      "savedCo2Kg": 74.4,
      "savingsPct": 56.0,
      "highRiskCount": 0,
      "carbonCreditUSD": 1.12,
      "carbonCreditINR": 94,
      "fuelSavedLiters": 47.4,
      "fuelSavedINR": 4361,
      "treesEquivalent": 3,
      "fleetEfficiencyPct": 56.0,
      "emissionIntensity": 76.8,
      "shipmentCount": 3
    },
    "aiInsight": "Fleet emitting 58.4 kg CO₂ across 3 shipments — 74.4 kg (56%) saved vs full-load baseline. Fuel savings: ₹4,361 (47 L). Emission intensity: 76.8 g/tonne-km (target: <80). Consolidating Delhi-Jaipur corridor and night-window departures deliver fastest ROI with zero operational disruption."
  },
  "meta": {
    "model": "CO₂ = dist_km × (weight/capacity) × truck_ef — truck-specific IPCC AR6/CPCB factors",
    "latency_ms": 1843,
    "agent": "CarbonIntelligenceAgent/2.0"
  }
}
```

**Emission model:** `CO₂ (kg) = distance_km × (weight_kg / max_kg) × truck_emission_factor`

**Truck emission factors (IPCC AR6 + CPCB India):**

| Truck type | Example models | EF (kg CO₂/km) |
|------------|---------------|-----------------|
| Mini LCV   | Tata Ace Gold, Mahindra Bolero Pickup | 0.12 |
| Medium     | Eicher Pro 2049, Tata Ultra T.7 | 0.21 |
| Heavy      | BharatBenz, Ashok Leyland 2518 | 0.26 |
| EV         | Any electric model | 0.05 |
| Default    | Unknown / not provided | 0.21 |

**Opportunity types:**

| `type` | Trigger | CO₂ saving |
|--------|---------|-----------|
| `consolidation` | Load factor < 75% | Proportional to empty capacity |
| `scheduling` | HIGH-risk night window | ~12% fuel reduction |
| `intermodal` | Distance > 500 km | ~70% CO₂ vs road |
| `ev_route` | Urban < 150 km | ~76% CO₂ vs diesel |
| `vehicle_upgrade` | Top emitter, BS6 eligible | ~19% CO₂ reduction |

**Risk thresholds:**

| Risk | CO₂ threshold |
|------|--------------|
| `LOW` | < 25 kg |
| `MEDIUM` | 25–50 kg |
| `HIGH` | > 50 kg |

---

### 2.5 `GET /lorri/stats`

FairRelay performance statistics for displaying in LoRRI's monitoring dashboard.

**Auth:** `x-api-key` header required

**Request:**
```bash
curl https://fairrelay-brain-gdm1.onrender.com/lorri/stats \
  -H "x-api-key: fr_live_demo_key_2026"
```

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "total_allocations": 142,
    "avg_latency_ms": 387,
    "avg_gini_index": 0.08,
    "agents": [
      { "name": "ML Effort Agent",          "status": "active", "type": "ml"           },
      { "name": "Route Planner (OR-Tools)", "status": "active", "type": "optimization" },
      { "name": "Fairness Manager",         "status": "active", "type": "evaluation"   },
      { "name": "Driver Liaison",           "status": "active", "type": "negotiation"  },
      { "name": "Final Resolution",         "status": "active", "type": "resolution"   },
      { "name": "Explainability Agent",     "status": "active", "type": "explanation"  }
    ],
    "uptime_seconds": 86423.7
  }
}
```

---

### 2.6 LoRRI Integration — Code Examples

#### Node.js / TypeScript
```typescript
const FAIRRELAY_BRAIN = 'https://fairrelay-brain-gdm1.onrender.com';
const API_KEY = process.env.FAIRRELAY_API_KEY || 'fr_live_demo_key_2026';

async function fairDispatch(drivers: any[], routes: any[]) {
  const res = await fetch(`${FAIRRELAY_BRAIN}/lorri/allocate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
    },
    body: JSON.stringify({ drivers, routes, options: { date: new Date().toISOString().split('T')[0] } }),
  });

  if (!res.ok) throw new Error(`FairRelay error: ${res.status}`);
  return res.json();
}

async function carbonReport(shipments: any[]) {
  const res = await fetch(`${FAIRRELAY_BRAIN}/lorri/carbon/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': API_KEY },
    body: JSON.stringify({ shipments }),
  });
  return res.json();
}
```

#### Python
```python
import httpx

BRAIN_URL = "https://fairrelay-brain-gdm1.onrender.com"
API_KEY   = "fr_live_demo_key_2026"

async def fair_dispatch(drivers: list, routes: list) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{BRAIN_URL}/lorri/allocate",
            headers={"x-api-key": API_KEY},
            json={"drivers": drivers, "routes": routes},
        )
        resp.raise_for_status()
        return resp.json()

async def carbon_report(shipments: list) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{BRAIN_URL}/lorri/carbon/estimate",
            headers={"x-api-key": API_KEY},
            json={"shipments": shipments},
        )
        return resp.json()
```

#### Webhook Receiver (Express)
```javascript
const crypto = require('crypto');

app.post('/webhooks/fairrelay', express.raw({ type: 'application/json' }), (req, res) => {
  const sig     = req.headers['x-fairrelay-signature'];
  const secret  = process.env.LORRI_WEBHOOK_SECRET;

  if (secret) {
    const expected = 'sha256=' + crypto
      .createHmac('sha256', secret)
      .update(req.body)
      .digest('hex');
    if (sig !== expected) return res.status(401).send('Invalid signature');
  }

  const event = JSON.parse(req.body);
  // event.event === "allocation.completed"
  // event.data.run_id, event.data.gini_index, event.data.latency_ms
  console.log('FairRelay allocation done:', event.data);
  res.sendStatus(200);
});
```

---

## 3. Core AI Endpoints (Brain)

Base URL: `https://fairrelay-brain-gdm1.onrender.com`  
No auth required unless noted.

---

### 3.1 Allocation — LangGraph Pipeline

#### `POST /api/v1/allocate/langgraph`

Full 8-agent LangGraph pipeline. This is the canonical allocation endpoint.

**Request:**
```json
{
  "date": "2026-05-16",
  "warehouse": { "lat": 19.0760, "lng": 72.8777 },
  "drivers": [
    {
      "id": "driver_001",
      "name": "Raju",
      "vehicle_capacity_kg": 150,
      "preferred_language": "en",
      "vehicle_type": "PETROL"
    },
    {
      "id": "driver_002",
      "name": "Kumar",
      "vehicle_capacity_kg": 200,
      "preferred_language": "ta",
      "vehicle_type": "EV",
      "ev_range_km": 120
    }
  ],
  "packages": [
    {
      "id": "pkg_001",
      "weight_kg": 2.5,
      "fragility_level": 3,
      "address": "Koramangala 4th Block, Bangalore",
      "latitude": 12.9352,
      "longitude": 77.6245,
      "priority": "HIGH"
    },
    {
      "id": "pkg_002",
      "weight_kg": 1.0,
      "fragility_level": 1,
      "address": "Indiranagar 100ft Road, Bangalore",
      "latitude": 12.9784,
      "longitude": 77.6408,
      "priority": "NORMAL"
    }
  ]
}
```

**Request schema:**

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `date` | string (ISO) | Yes | Allocation date |
| `warehouse` | object | Yes | `{lat, lng}` — pickup depot |
| `drivers[].id` | string | Yes | Unique driver ID |
| `drivers[].name` | string | Yes | Display name |
| `drivers[].vehicle_capacity_kg` | float | Yes | Max load capacity |
| `drivers[].preferred_language` | string | No | `en`, `ta`, `hi`, `ml`, `te` |
| `drivers[].vehicle_type` | string | No | `"PETROL"`, `"DIESEL"`, `"EV"` |
| `drivers[].ev_range_km` | float | No | EV range (EV vehicles only) |
| `packages[].id` | string | Yes | Unique package ID |
| `packages[].weight_kg` | float | Yes | Weight in kg |
| `packages[].fragility_level` | int [1–5] | Yes | 1=robust, 5=very fragile |
| `packages[].address` | string | Yes | Delivery address |
| `packages[].latitude` | float | Yes | Drop latitude |
| `packages[].longitude` | float | Yes | Drop longitude |
| `packages[].priority` | string | No | `"HIGH"`, `"NORMAL"`, `"LOW"` |

**Response `200 OK`:**
```json
{
  "allocation_run_id": "550e8400-e29b-41d4-a716-446655440000",
  "allocation_date": "2026-05-16",
  "status": "SUCCESS",
  "global_fairness": {
    "avg_workload": 63.2,
    "std_dev": 5.4,
    "gini_index": 0.084,
    "max_gap": 8.3
  },
  "assignments": [
    {
      "driver_external_id": "driver_001",
      "driver_name": "Raju",
      "route_id": "route-uuid-here",
      "workload_score": 65.3,
      "fairness_score": 0.92,
      "explanation": "Your route covers Koramangala with 12 packages. Expected 2.5 hours with moderate traffic.",
      "route_summary": {
        "num_packages": 12,
        "total_weight_kg": 28.5,
        "num_stops": 8,
        "estimated_time_minutes": 145
      }
    }
  ],
  "agent_events": [
    { "agent": "ml_effort_agent",    "status": "completed", "message": "Effort matrix built for 2 drivers × 2 routes" },
    { "agent": "route_planner",      "status": "completed", "message": "OR-Tools assignment proposed" },
    { "agent": "fairness_manager",   "status": "completed", "message": "ACCEPT — Gini 0.084 below threshold 0.25" },
    { "agent": "driver_liaison",     "status": "completed", "message": "No appeals raised" },
    { "agent": "final_resolution",   "status": "completed", "message": "All assignments confirmed" },
    { "agent": "explainability",     "status": "completed", "message": "Natural language explanations generated" }
  ]
}
```

#### `POST /api/v1/allocate`

Same as above — alternative path, same pipeline.

---

### 3.2 Load Consolidation

#### `POST /api/v1/consolidate`

5-agent LangGraph consolidation pipeline. Groups multiple shipments into shared trucks to reduce trips, distance, and CO₂.

**Request:**
```json
{
  "shipments": [
    {
      "id": "SH-001",
      "pickupLat": 19.0760,
      "pickupLng": 72.8777,
      "dropLat": 18.5204,
      "dropLng": 73.8567,
      "weight": 800,
      "volume": 3.2,
      "timeWindowStart": "08:00",
      "timeWindowEnd": "14:00"
    },
    {
      "id": "SH-002",
      "pickupLat": 19.1136,
      "pickupLng": 72.8697,
      "dropLat": 18.5893,
      "dropLng": 73.7241,
      "weight": 600,
      "volume": 2.8,
      "timeWindowStart": "09:00",
      "timeWindowEnd": "15:00"
    },
    {
      "id": "SH-003",
      "pickupLat": 19.0330,
      "pickupLng": 72.8554,
      "dropLat": 18.4655,
      "dropLng": 73.8503,
      "weight": 500,
      "volume": 2.1,
      "timeWindowStart": "07:00",
      "timeWindowEnd": "13:00"
    }
  ],
  "trucks": [
    { "id": "TRK-001", "name": "Tata Ace Gold",   "maxWeight": 2000, "maxVolume": 8.0 },
    { "id": "TRK-002", "name": "Eicher Pro 2049", "maxWeight": 5000, "maxVolume": 18.0 }
  ],
  "options": {
    "maxGroupRadiusKm": 30,
    "timeWindowToleranceMinutes": 120
  }
}
```

**Request schema:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `shipments[].id` | string | Yes | Shipment identifier |
| `shipments[].pickupLat/Lng` | float | Yes | Pickup coordinates |
| `shipments[].dropLat/Lng` | float | Yes | Drop coordinates |
| `shipments[].weight` | float | Yes | Cargo weight kg |
| `shipments[].volume` | float | No | Cargo volume m³ |
| `shipments[].timeWindowStart` | string | No | `"HH:MM"` earliest delivery |
| `shipments[].timeWindowEnd` | string | No | `"HH:MM"` latest delivery |
| `trucks[].id` | string | Yes | Truck identifier |
| `trucks[].maxWeight` | float | Yes | Max load capacity kg |
| `trucks[].maxVolume` | float | No | Max volume m³ |
| `options.maxGroupRadiusKm` | float | No | Max cluster radius (default 30) |
| `options.timeWindowToleranceMinutes` | int | No | Time window flex (default 120) |

**Response `200 OK`:**
```json
{
  "success": true,
  "data": {
    "id": "cons_a3b2c1d0",
    "groups": [
      {
        "groupId": "G1",
        "truck": "TRK-001",
        "shipments": ["SH-001", "SH-002"],
        "totalWeight": 1400,
        "totalVolume": 6.0,
        "utilizationPct": 70,
        "naiveDistKm": 149,
        "optimizedDistKm": 161,
        "co2SavedKg": 22.5,
        "carbonCreditUSD": 0.34,
        "confidenceScore": 0.87,
        "route": {
          "stops": [
            { "type": "pickup", "shipmentId": "SH-001", "lat": 19.0760, "lng": 72.8777 },
            { "type": "pickup", "shipmentId": "SH-002", "lat": 19.1136, "lng": 72.8697 },
            { "type": "drop",   "shipmentId": "SH-001", "lat": 18.5204, "lng": 73.8567 },
            { "type": "drop",   "shipmentId": "SH-002", "lat": 18.5893, "lng": 73.7241 }
          ]
        }
      },
      {
        "groupId": "G2",
        "truck": "TRK-002",
        "shipments": ["SH-003"],
        "totalWeight": 500,
        "utilizationPct": 10,
        "co2SavedKg": 0,
        "confidenceScore": 0.42
      }
    ],
    "metrics": {
      "shipmentCount": 3,
      "groupCount": 2,
      "tripsReduced": 1,
      "tripsBefore": 3,
      "tripsAfter": 2,
      "distanceSavedKm": 137,
      "totalCo2SavedKg": 22.5,
      "carbonCreditUSD": 0.34,
      "fuelSavedINR": 3150,
      "vehicleUtilizationPct": 40,
      "processingTimeMs": 2240
    }
  },
  "agentSteps": [
    { "agent": "GeoClusteringAgent",      "status": "done", "ms": 120, "detail": "2 clusters formed (silhouette 0.74)" },
    { "agent": "TimeWindowAgent",         "status": "done", "ms": 85,  "detail": "SH-001+SH-002 windows overlap 5h" },
    { "agent": "CapacityOptimizationAgent","status": "done", "ms": 340, "detail": "OR-Tools CP-SAT: 1 bin saved" },
    { "agent": "ScoringConfidenceAgent",  "status": "done", "ms": 45,  "detail": "Confidence: G1=0.87, G2=0.42" },
    { "agent": "ContinuousLearningAgent", "status": "done", "ms": 90,  "detail": "Q-table updated, episode stored" }
  ],
  "insights": [
    "Consolidating SH-001 and SH-002 reduces trips by 33% and saves 22.5 kg CO₂ on this corridor.",
    "SH-003 runs at only 10% utilisation — consider holding for the next Mumbai→Pune batch window."
  ]
}
```

#### `POST /api/v1/consolidate/sync`

Same consolidation pipeline but runs synchronously (no LangGraph overhead). Use as a fallback if LangGraph times out.

Same request/response shape as `/api/v1/consolidate`.

#### `POST /api/v1/consolidate/simulate`

Compare multiple consolidation strategies side-by-side.

**Request:**
```json
{
  "shipments": [ ... ],
  "trucks": [ ... ],
  "scenarios": [
    { "name": "Conservative", "maxGroupRadiusKm": 20, "timeWindowToleranceMinutes": 60  },
    { "name": "Balanced",     "maxGroupRadiusKm": 30, "timeWindowToleranceMinutes": 120 },
    { "name": "Aggressive",   "maxGroupRadiusKm": 50, "timeWindowToleranceMinutes": 240 }
  ]
}
```

**Response `200 OK`:**
```json
{
  "scenarios": [
    {
      "name": "Conservative",
      "groups": 4,
      "tripsReduced": 0,
      "co2SavedKg": 0,
      "processingTimeMs": 1200
    },
    {
      "name": "Balanced",
      "groups": 2,
      "tripsReduced": 2,
      "co2SavedKg": 22.5,
      "processingTimeMs": 2240
    },
    {
      "name": "Aggressive",
      "groups": 1,
      "tripsReduced": 3,
      "co2SavedKg": 41.2,
      "processingTimeMs": 2800
    }
  ],
  "recommendation": "Balanced — best CO₂/complexity trade-off for this shipment mix."
}
```

---

### 3.3 Route Optimization

#### `POST /api/v1/routes/optimize`

TSP/VRP route optimization using nearest-neighbour greedy + 2-opt local search. Returns before/after distance and CO₂ comparison.

**Request:**
```json
{
  "routes": [
    {
      "id": "route_001",
      "stops": [
        {
          "id": "stop_001",
          "latitude": 19.0760,
          "longitude": 72.8777,
          "address": "JNPT, Nhava Sheva",
          "weight_kg": 200,
          "service_time_min": 15,
          "time_window_start": "08:00",
          "time_window_end": "18:00",
          "priority": "HIGH"
        },
        {
          "id": "stop_002",
          "latitude": 18.5204,
          "longitude": 73.8567,
          "address": "Pune Phursungi Industrial",
          "weight_kg": 150,
          "service_time_min": 20
        }
      ]
    }
  ],
  "warehouse_lat": 19.0760,
  "warehouse_lng": 72.8777,
  "speed_kmh": 45,
  "use_time_windows": true
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "routes": [
    {
      "route_id": "route_001",
      "run_id": "r_a3f2b1c0-e29b-41d4-a716-446655440abc",
      "before": {
        "order": ["stop_001", "stop_002"],
        "distance_km": 149,
        "time_minutes": 198
      },
      "after": {
        "order": ["stop_002", "stop_001"],
        "distance_km": 108,
        "time_minutes": 144,
        "method": "2-opt local search"
      },
      "improvement": {
        "distance_saved_km": 41,
        "distance_saved_pct": 27.5,
        "time_saved_min": 54
      }
    }
  ],
  "summary": {
    "total_routes": 1,
    "total_distance_before_km": 149,
    "total_distance_after_km": 108,
    "total_distance_saved_km": 41,
    "total_distance_saved_pct": 27.5,
    "total_time_before_min": 198,
    "total_time_after_min": 144,
    "total_time_saved_min": 54,
    "total_co2_saved_kg": 8.6,
    "optimization_methods": ["2-opt local search"],
    "road_factor_used": 1.35
  }
}
```

> **`run_id`** — unique ID for each optimized route. Pass it to `POST /routes/feedback` after the delivery completes to submit the actual GPS distance and improve future estimates.
>
> **`road_factor_used`** — the current adaptive road-distance multiplier (starts at 1.35; adapts automatically after 5+ feedback entries via continuous learning).

#### `POST /api/v1/routes/cluster`

Cluster packages geographically before routing.

**Request:**
```json
{
  "packages": [
    { "id": "pkg_001", "latitude": 19.076, "longitude": 72.877, "weight_kg": 5.0 },
    { "id": "pkg_002", "latitude": 19.113, "longitude": 72.869, "weight_kg": 3.0 }
  ],
  "method": "kmeans",
  "num_drivers": 3
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "method": "kmeans",
  "num_clusters": 3,
  "clusters": [
    {
      "cluster_id": 0,
      "num_packages": 4,
      "total_weight_kg": 12.5,
      "centroid": { "lat": 19.082, "lng": 72.881 },
      "packages": ["pkg_001", "pkg_003", "pkg_005", "pkg_007"]
    }
  ]
}
```

#### `POST /api/v1/routes/dynamic-insert`

Insert a new stop into an existing route at the cheapest position.

**Request:**
```json
{
  "route_stops": [
    { "id": "s1", "latitude": 19.076, "longitude": 72.877 },
    { "id": "s2", "latitude": 18.520, "longitude": 73.856 }
  ],
  "new_stop": { "id": "new_s", "latitude": 18.990, "longitude": 73.120 },
  "warehouse_lat": 19.076,
  "warehouse_lng": 72.877
}
```

**Response `200 OK`:**
```json
{
  "success": true,
  "new_order": ["s1", "new_s", "s2"],
  "insertion_position": 1,
  "distance_before_km": 149.2,
  "distance_after_km": 162.7,
  "additional_distance_km": 13.5
}
```

---

#### `POST /api/v1/routes/feedback`

**Route continuous learning.** After a delivery is completed, submit the actual GPS-measured distance for a route. FairRelay computes the ratio `actual_km / haversine_km` and, once 5+ feedback entries are collected, adapts the road-distance multiplier used in all future optimizations.

**Request:**
```json
{
  "run_id": "r_a3f2b1c0-e29b-41d4-a716-446655440abc",
  "actual_distance_km": 118.4
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `run_id` | string | Yes | The `run_id` returned by `POST /routes/optimize` |
| `actual_distance_km` | float | Yes | GPS-measured actual distance driven (must be > 0) |

**Response `200 OK`:**
```json
{
  "success": true,
  "run_id": "r_a3f2b1c0-e29b-41d4-a716-446655440abc",
  "actual_distance_km": 118.4,
  "updated_road_factor": 1.38,
  "adapted": false,
  "samples_collected": 3,
  "samples_needed_to_adapt": 2,
  "learning_stats": {
    "current_road_factor": 1.38,
    "adapted": false,
    "completed_feedback": 3,
    "pending_runs": 1
  }
}
```

**Error responses:**
- `400` — `actual_distance_km` ≤ 0
- `404` — `run_id` not found (route was not recorded or already expired)

---

#### `GET /api/v1/routes/learning-stats`

Returns the current state of the route continuous learning system — the adaptive road factor, number of feedback samples collected, and whether the system has adapted from default.

**Response `200 OK`:**
```json
{
  "success": true,
  "learning": {
    "current_road_factor": 1.38,
    "adapted": true,
    "completed_feedback": 7,
    "pending_runs": 2,
    "history": [
      { "run_id": "r_abc...", "ratio": 1.31 },
      { "run_id": "r_def...", "ratio": 1.42 }
    ]
  },
  "explanation": "Default road factor: 1.35. After 5 actual-distance feedback entries, FairRelay adapts this multiplier from real observed ratios (actual km / straight-line km). Current factor: 1.38 (adapted from 7 samples)."
}
```

> The road factor is clamped to `[1.1, 2.0]` and cached for 60 seconds. It improves haversine → road-distance accuracy for all routes globally.

---

### 3.4 Carbon Intelligence Agent

See [Section 2.4](#24-post-lorricarbonestimat) for the full LoRRI-facing endpoint documentation.

The same endpoint is also available via the LoRRI namespace at: `POST /lorri/carbon/estimate` (requires `x-api-key`)

**v2.0 additions:** truck-specific EFs, `fuel_saved_inr`, `co2_intensity_g_tkm` per shipment; `fuelSavedINR`, `treesEquivalent`, `emissionIntensity`, `carbonCreditINR` in summary; `saving_inr` on opportunities; `intermodal` and `ev_route` opportunity types.

---

### 3.5 Driver APIs

#### `GET /api/v1/drivers/{driver_id}`

```bash
curl https://fairrelay-brain-gdm1.onrender.com/api/v1/drivers/550e8400-e29b-41d4-a716-446655440000
```

**Response `200 OK`:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "external_id": "drv_001",
  "name": "Rajan Kumar",
  "phone": "+919876543210",
  "preferred_language": "ta",
  "vehicle_type": "PETROL",
  "vehicle_capacity_kg": 2000,
  "license_number": "TN01AB1234",
  "created_at": "2026-01-15T08:00:00Z",
  "recent_stats": [
    {
      "date": "2026-05-15",
      "num_packages": 18,
      "total_weight_kg": 42.3,
      "workload_score": 64.1,
      "fairness_score": 0.91
    }
  ]
}
```

#### `GET /api/v1/drivers/external/{external_id}`

Same response — look up by LoRRI's driver ID string instead of internal UUID.

#### `POST /api/v1/feedback`

Driver submits feedback after completing a route.

**Request:**
```json
{
  "driver_id": "550e8400-e29b-41d4-a716-446655440000",
  "assignment_id": "assign-uuid",
  "fairness_rating": 4,
  "stress_level": 3,
  "tiredness_level": 4,
  "hardest_aspect": "traffic",
  "comments": "Route was good but heavy traffic on the expressway."
}
```

**Response `201 Created`:**
```json
{
  "id": "feedback-uuid",
  "driver_id": "550e8400-...",
  "assignment_id": "assign-uuid",
  "fairness_rating": 4,
  "created_at": "2026-05-16T14:30:00Z",
  "message": "Feedback recorded. Thank you!"
}
```

---

### 3.6 Admin & Analytics

**Auth note:** `GET` endpoints are public. `POST` endpoints under `/api/v1/admin/learning/` require the `x-admin-key` header matching the `ADMIN_API_KEY` environment variable. Returns `503` if `ADMIN_API_KEY` is not configured on the server; `403` if the key is wrong.

```bash
# Example
curl -X POST https://fairrelay-brain-gdm1.onrender.com/api/v1/admin/learning/trigger \
  -H "x-admin-key: your-admin-key" \
  -H "Content-Type: application/json" \
  -d '{"process_episodes": true, "select_config": true, "update_models": true}'
```

#### `GET /api/v1/admin/metrics/fairness?start_date=2026-05-01&end_date=2026-05-16`

```json
{
  "time_series": [
    { "date": "2026-05-01", "gini_index": 0.12, "std_dev": 8.4, "num_allocations": 3 },
    { "date": "2026-05-02", "gini_index": 0.09, "std_dev": 6.1, "num_allocations": 5 }
  ]
}
```

#### `GET /api/v1/admin/learning/status` _(no auth)_

```json
{
  "current_config": { "gini_threshold": 0.25, "stddev_threshold": 15 },
  "top_performing_configs": [ ... ],
  "driver_models_active": 8,
  "avg_prediction_mse": 0.034,
  "recent_episodes_7d": 42,
  "total_arms": 81
}
```

#### `POST /api/v1/admin/learning/force_config` _(requires `x-admin-key`)_

Override bandit config selection with a specific fairness config — for emergency rollbacks or A/B testing.

#### `POST /api/v1/admin/learning/trigger` _(requires `x-admin-key`)_

Manually trigger the daily learning pipeline (process episodes, select config, update driver models).

#### `POST /api/v1/admin/learning/models/{driver_id}/retrain` _(requires `x-admin-key`)_

Manually trigger retraining of a specific driver's effort prediction model.

#### `POST /api/v1/admin/manual_override`

Reassign a route from one driver to another.

**Request:**
```json
{
  "allocation_run_id": "run-uuid",
  "old_driver_id": "drv-uuid-1",
  "new_driver_id": "drv-uuid-2",
  "route_id": "route-uuid",
  "reason": "Driver reported illness"
}
```

#### `POST /api/v1/admin/fairness_config`

Create a new fairness configuration (immediately active).

**Request:**
```json
{
  "workload_weight_packages": 1.0,
  "workload_weight_weight_kg": 0.5,
  "workload_weight_difficulty": 10.0,
  "workload_weight_time": 0.2,
  "gini_threshold": 0.25,
  "stddev_threshold": 15.0,
  "max_gap_threshold": 30.0,
  "recovery_mode_enabled": false
}
```

---

### 3.7 Real-time Events (SSE)

#### `GET /api/v1/agent-events/stream?run_id=<uuid>`

Subscribe to live agent progress during an allocation run. Use this to build a real-time progress indicator in LoRRI.

```javascript
const es = new EventSource(
  'https://fairrelay-brain-gdm1.onrender.com/api/v1/agent-events/stream?run_id=abc-123'
);
es.onmessage = (e) => {
  const event = JSON.parse(e.data);
  console.log(event.agent, event.status, event.message);
  // { agent: "fairness_manager", status: "completed", message: "ACCEPT — Gini 0.08" }
};
```

#### `GET /api/v1/agent-events/recent?run_id=<uuid>&limit=50`

Get recent cached events for a run (for clients that connected late).

```json
{
  "events": [
    { "agent": "ml_effort_agent", "status": "completed", "message": "Matrix built", "timestamp": "2026-05-16T08:23:41Z" }
  ],
  "count": 6
}
```

---

## 4. Node.js Backend Endpoints

Base URL: `https://fairrelay-backend.onrender.com`

---

### 4.1 Authentication & OTP

#### `POST /api/otp/send`

```json
// Request
{ "phone": "+919876543210" }

// Response 200
{ "otp_sent": true, "expires_in_seconds": 300 }
```

#### `POST /api/otp/verify`

```json
// Request
{ "phone": "+919876543210", "otp": "482916" }

// Response 200
{ "verified": true, "token": "<jwt>" }
```

#### `POST /api/auth/register`

```json
// Request
{ "phone": "+919876543210", "name": "Rajan Kumar" }

// Response 200
{ "otp_sent": true, "phone": "+919876543210" }
```

#### `POST /api/auth/verify-otp`

```json
// Request
{ "phone": "+919876543210", "otp": "482916", "role": "DRIVER" }

// Response 200
{ "token": "<jwt>", "user": { "id": "usr_001", "name": "Rajan Kumar", "role": "DRIVER" } }
```

#### `GET /api/auth/profile`
**Auth:** `Authorization: Bearer <token>`

```json
// Response 200
{ "id": "usr_001", "name": "Rajan Kumar", "phone": "+919876543210", "role": "DRIVER" }
```

---

### 4.2 Drivers

#### `GET /api/drivers`
```json
// Response 200
{
  "drivers": [
    { "id": "drv_001", "name": "Rajan Kumar", "phone": "+91...", "vehicle_type": "PETROL", "status": "ACTIVE" }
  ]
}
```

#### `POST /api/drivers`
```json
// Request
{ "name": "Suresh Pillai", "phone": "+919988776655", "vehicle_type": "EV", "vehicle_capacity_kg": 5000 }

// Response 201
{ "id": "drv_002", "name": "Suresh Pillai", ... }
```

#### `PUT /api/drivers/:id`
```json
// Request
{ "vehicle_capacity_kg": 3000, "status": "INACTIVE" }

// Response 200
{ "id": "drv_001", "vehicle_capacity_kg": 3000, "updated_at": "2026-05-16T09:00:00Z" }
```

#### `DELETE /api/drivers/:id`
```json
// Response 200
{ "success": true }
```

#### `GET /api/drivers/:truckId/active-route`
```json
// Response 200
{
  "route": { "id": "rt_001", "status": "IN_PROGRESS" },
  "stops": [
    { "order": 1, "address": "Pune Industrial", "status": "PENDING", "lat": 18.52, "lng": 73.85 }
  ]
}
```

---

### 4.3 Shipments

#### `POST /api/shipments/create`
**Auth:** JWT (SHIPPER role)
```json
// Request
{
  "pickup_address": "JNPT, Nhava Sheva, Mumbai",
  "drop_address": "Pune Phursungi Industrial Estate",
  "weight_kg": 800,
  "volume_m3": 3.2,
  "priority": "HIGH",
  "time_window_start": "08:00",
  "time_window_end": "14:00"
}

// Response 201
{ "id": "SH-001", "status": "PENDING", "created_at": "2026-05-16T07:00:00Z" }
```

#### `GET /api/shipments/my-shipments`
**Auth:** JWT (SHIPPER role)
```json
// Response 200
{ "shipments": [ { "id": "SH-001", "status": "IN_TRANSIT", "driver_id": "drv_001" } ] }
```

#### `POST /api/shipments/:id/accept`
**Auth:** JWT (DRIVER role)
```json
// Request
{ "driver_id": "drv_001" }

// Response 200
{ "shipment_id": "SH-001", "status": "ACCEPTED", "driver_id": "drv_001" }
```

---

### 4.4 Deliveries

#### `POST /api/deliveries/create`
```json
// Request
{
  "pickupLocation": "Mumbai JNPT",
  "pickupLat": 19.076,
  "pickupLng": 72.877,
  "pickupTime": "2026-05-21T08:00:00Z",
  "deliveryLocation": "Pune Industrial",
  "deliveryLat": 18.52,
  "deliveryLng": 73.856,
  "deliveryTime": "2026-05-21T14:00:00Z",
  "cargoType": "General",
  "cargoWeight": 800,
  "dispatcherId": "usr_001",
  "timeWindowStart": "2026-05-21T08:00:00Z",
  "timeWindowEnd": "2026-05-21T12:00:00Z"
}

// Response 201
{ "success": true, "id": "dlv_001", "status": "PENDING" }
```

#### `GET /api/deliveries/unassigned`
Returns deliveries not yet assigned to a driver, scoped to a courier company.

```bash
GET /api/deliveries/unassigned?courierCompanyId=20c97585-a16d-45e7-8d5f-0ef5ce85b896
```
**Auth:** JWT required

```json
// Response 200
[
  {
    "id": "dlv_001",
    "pickupLocation": "Mumbai JNPT",
    "pickupLat": 19.076,
    "pickupLng": 72.877,
    "deliveryLocation": "Pune Industrial",
    "deliveryLat": 18.52,
    "deliveryLng": 73.856,
    "cargoWeight": 800,
    "status": "PENDING"
  }
]
```

#### `POST /api/routes/assign-multi-stop`
Assign multiple deliveries to a driver as a single multi-stop route.

**Auth:** JWT required

```json
// Request
{
  "driverId": "drv_001",
  "deliveryIds": ["dlv_001", "dlv_002", "dlv_003"],
  "routeOrder": ["dlv_001", "dlv_003", "dlv_002"]
}

// Response 200
{ "success": true, "routeId": "rt_001", "assignedCount": 3 }
```

#### `POST /api/deliveries/:id/start`
**Auth:** JWT (DRIVER role)
```json
// Response 200
{ "id": "dlv_001", "status": "EN_ROUTE", "started_at": "2026-05-16T08:30:00Z" }
```

#### `POST /api/deliveries/:id/pickup`
**Auth:** JWT (DRIVER role)
```json
// Request
{ "cargo_details": { "verified_weight_kg": 798, "condition": "GOOD" } }

// Response 200
{ "id": "dlv_001", "status": "PICKED_UP" }
```

#### `POST /api/deliveries/:id/complete`
**Auth:** JWT (DRIVER role)
```json
// Request
{ "delivery_time": "2026-05-16T13:45:00Z", "signature": "<base64>", "photo": "<base64>" }

// Response 200
{ "id": "dlv_001", "status": "COMPLETED", "proof_url": "https://..." }
```

---

### 4.5 Wellness

#### `GET /api/wellness/summary`
```json
// Response 200
{
  "fleet_wellness": {
    "avg_score": 72,
    "at_risk_drivers": 2,
    "fit_for_duty": 8,
    "total_drivers": 10
  }
}
```

#### `GET /api/wellness/drivers`
```json
// Response 200
{
  "drivers": [
    { "id": "drv_001", "name": "Rajan", "wellness_score": 82, "status": "FIT", "risk_level": "LOW" },
    { "id": "drv_002", "name": "Suresh", "wellness_score": 38, "status": "AT_RISK", "risk_level": "HIGH" }
  ]
}
```

#### `PUT /api/wellness/drivers/:driverId`
```json
// Request
{ "hours_today": 5.5, "hours_since_rest": 4, "is_ill": false }

// Response 200
{ "driver_id": "drv_001", "wellness_score": 68, "risk_level": "MEDIUM" }
```

#### `GET /api/wellness/cognitive/:driverId`
```json
// Response 200
{
  "driver_id": "drv_001",
  "cognitive_load_score": 62,
  "fatigue_level": "MODERATE",
  "stress_level": "LOW",
  "recommendation": "Short break recommended in 90 minutes"
}
```

#### `GET /api/wellness/cognitive-fleet`
Fleet-wide cognitive load summary across all drivers.

```json
// Response 200
{
  "fleet": [
    { "driver_id": "drv_001", "name": "Rajan Kumar", "cognitive_load_score": 62, "fatigue_level": "MODERATE" },
    { "driver_id": "drv_002", "name": "Suresh Pillai", "cognitive_load_score": 88, "fatigue_level": "HIGH" }
  ],
  "summary": {
    "avg_cognitive_load": 75,
    "high_risk_count": 1,
    "fit_count": 1
  }
}
```

#### `GET /api/packages`
```json
// Response 200
[
  { "id": "PKG-1234", "cargoType": "General", "status": "PENDING", "pickupLocation": "Mumbai JNPT", "deliveryLocation": "Pune Industrial" }
]
```

#### `GET /api/packages/history-web`
Package delivery history formatted for the web dashboard.

```json
// Response 200
[
  {
    "id": "PKG-1234",
    "cargoType": "General",
    "status": "DELIVERED",
    "pickupLocation": "Mumbai JNPT",
    "deliveryLocation": "Pune Industrial",
    "deliveredAt": "2026-05-20T14:30:00Z",
    "driverName": "Rajan Kumar"
  }
]
```

---

### 4.6 Consolidation (Proxy)

The backend proxies consolidation requests to the Brain. Same request/response as Brain `/api/v1/consolidate`.

#### `POST /api/consolidation/optimize`
Proxies to `https://fairrelay-brain-gdm1.onrender.com/api/v1/consolidate` with local FFD fallback.

#### `POST /api/consolidation/simulate`
Proxies to Brain `/api/v1/consolidate/simulate`.

#### `POST /api/routes/dynamic-insert`
Proxies to Brain `POST /api/v1/routes/dynamic-insert`. Insert a new stop into an existing route at the cheapest position. Full request/response schema in [Section 3.3](#33-route-optimization).

```json
// Request
{
  "route_stops": [
    { "id": "s1", "latitude": 19.076, "longitude": 72.877 },
    { "id": "s2", "latitude": 18.520, "longitude": 73.856 }
  ],
  "new_stop": { "id": "new_s", "latitude": 18.990, "longitude": 73.120 },
  "warehouse_lat": 19.076,
  "warehouse_lng": 72.877
}

// Response 200
{
  "success": true,
  "new_order": ["s1", "new_s", "s2"],
  "insertion_position": 1,
  "additional_distance_km": 13.5
}
```

#### `GET /api/consolidation/history`
```json
// Response 200
{
  "past_consolidations": [
    { "id": "cons_001", "date": "2026-05-15", "trips_reduced": 2, "co2_saved_kg": 22.5 }
  ]
}
```

---

### 4.7 V1 API Gateway

The `/v1` namespace is a production-hardened gateway that proxies requests to the Brain with demo-mode fallback. Requires API key.

**Auth:** `x-api-key` header  
**Demo key for testing:** `fr_live_demo_key_2026`

#### `GET /v1/health`
```bash
curl https://fairrelay-backend.onrender.com/v1/health \
  -H "x-api-key: fr_live_demo_key_2026"
```
```json
{
  "success": true,
  "data": {
    "api": "operational",
    "brain": "connected",
    "version": "1.0.0"
  },
  "meta": { "brain_latency_ms": 245, "mode": "live", "timestamp": "2026-05-16T08:00:00Z" }
}
```

#### `POST /v1/allocate`
Same schema as `/lorri/allocate`. Returns `mode: "live"` or `mode: "demo"`.

#### `POST /v1/wellness`
Same schema as `/lorri/wellness`.

#### `POST /v1/carbon`
Simplified carbon estimate (route-level, not shipment-level).

```json
// Request
{
  "routes": [
    { "id": "rt_001", "distance_km": 149, "weight_kg": 800 }
  ],
  "vehicle_type": "diesel"
}

// Response 200
{
  "success": true,
  "data": {
    "routes": [
      { "id": "rt_001", "co2_kg": 12.5, "saved_vs_baseline_kg": 18.8 }
    ],
    "total_co2_kg": 12.5,
    "total_saved_vs_diesel_kg": 18.8
  }
}
```

#### `POST /v1/gini`
Compute Gini coefficient for any set of values.

```json
// Request
{ "values": [65.3, 64.2, 58.1, 72.4], "labels": ["Rajan", "Suresh", "Kumar", "Priya"] }

// Response 200
{
  "success": true,
  "data": {
    "gini_index": 0.072,
    "fairness_grade": "A+",
    "interpretation": "Excellent workload balance — all drivers within 15% of mean.",
    "breakdown": [
      { "label": "Rajan", "value": 65.3, "deviation_from_mean": 0.3 }
    ]
  }
}
```

#### `POST /v1/night-safety`
Apply night-time wellness constraints to a driver roster.

```json
// Request
{ "drivers": [ { "id": "drv_001", "hours_today": 8 } ], "current_hour": 22 }

// Response 200
{
  "success": true,
  "data": {
    "is_night_mode": true,
    "drivers": [
      { "id": "drv_001", "fit_for_night": false, "reason": "Exceeded 8 hours on duty" }
    ]
  }
}
```

#### `POST /v1/consolidate`
Proxies to Brain. Same schema as `/api/v1/consolidate`.

---

### 4.8 Absorption & Synergy

Absorption = peer-to-peer truck handover when a driver cannot complete a delivery.

#### `GET /api/absorption/map-data`
**Auth:** JWT required
```json
// Response 200
{
  "map_data": {
    "clusters": [
      { "id": "cl_001", "center": { "lat": 19.076, "lng": 72.877 }, "size": 3 }
    ],
    "hubs": [
      { "id": "hub_001", "name": "Andheri Virtual Hub", "lat": 19.113, "lng": 72.869, "active": true }
    ],
    "live_absorptions": [
      { "id": "abs_001", "from_driver": "drv_001", "to_driver": "drv_003", "status": "IN_PROGRESS" }
    ]
  }
}
```

#### `POST /api/synergy/generate-qr`
**Auth:** JWT required
```json
// Request
{ "synergy_id": "syn_001", "receiver_driver_id": "drv_003" }

// Response 201
{ "qr_code": "<base64-png>", "expires_at": "2026-05-16T10:00:00Z" }
```

#### `POST /api/synergy/verify-qr`
**Auth:** JWT required
```json
// Request
{ "qr_data": "<scanned-qr-string>" }

// Response 200
{ "qr_valid": true, "synergy_id": "syn_001" }
```

#### `POST /api/synergy/complete`
**Auth:** JWT required
```json
// Request
{ "synergy_id": "syn_001" }

// Response 200
{ "status": "COMPLETED", "handover_time": "2026-05-16T09:45:00Z" }
```

---

### 4.9 Virtual Hubs & E-Way Bills

#### `GET /api/virtual-hubs`
```json
// Response 200
{
  "hubs": [
    { "id": "hub_001", "name": "Andheri Hub", "lat": 19.113, "lng": 72.869, "capacity": 50, "active": true }
  ]
}
```

#### `POST /api/virtual-hubs`
```json
// Request
{ "name": "Thane East Hub", "location": { "lat": 19.218, "lng": 72.978 }, "capacity": 30 }

// Response 201
{ "id": "hub_003", "name": "Thane East Hub", "created_at": "2026-05-16T09:00:00Z" }
```

#### `GET /api/eway-bills`
```json
// Response 200
{
  "bills": [
    { "id": "ewb_001", "shipment_id": "SH-001", "status": "VALID", "expiry": "2026-05-23" }
  ]
}
```

#### `POST /api/eway-bills`
```json
// Request
{
  "shipment_id": "SH-001",
  "from_location": "Mumbai JNPT",
  "to_location": "Pune Industrial",
  "weight_kg": 800,
  "value_inr": 125000,
  "hsn_code": "8471"
}

// Response 201
{ "id": "ewb_002", "ewb_number": "EWB2026051600123", "valid_until": "2026-05-23" }
```

#### `PUT /api/eway-bills/:id`
```json
// Request — partial update, send only fields to change
{
  "vehicle": "MH-12-AB-9999",
  "valid": "2026-06-30",
  "status": "Active"
}

// Response 200
{ "id": "ewb_001", "updated_at": "2026-05-21T10:00:00Z" }
```

#### `DELETE /api/eway-bills/:id`
```json
// Response 200
{ "success": true, "message": "E-Way Bill deleted." }
```

#### `GET /api/eway-bills/stats`
```json
// Response 200
{ "active": 6, "expireSoon": 1, "expired": 1 }
```

#### `DELETE /api/virtual-hubs/:id`
```json
// Response 200
{ "success": true }
```

---

### 4.10 API Keys

#### `POST /api/keys`
```json
// Request
{ "user_id": "usr_001", "name": "LoRRI Production Key", "scopes": ["allocate", "wellness", "carbon"] }

// Response 201
{ "id": "key_001", "name": "LoRRI Production Key", "api_key": "fr_live_abc123xyz", "created_at": "2026-05-16T09:00:00Z" }
```

> **Important:** The `api_key` value is shown only once at creation. Store it securely.

#### `GET /api/keys`
**Auth:** `Authorization: Bearer <token>`
```json
// Response 200
{
  "keys": [
    { "id": "key_001", "name": "LoRRI Production Key", "last_used": "2026-05-16T08:30:00Z", "active": true }
  ]
}
```

#### `DELETE /api/keys/:id`
```json
// Response 200
{ "success": true, "message": "API key revoked." }
```

---

## 5. Error Codes Reference

All errors follow this shape:

```json
{
  "detail": "Human-readable error message",
  "status_code": 422
}
```

| HTTP Status | Meaning | Common cause |
|-------------|---------|--------------|
| `400` | Bad Request | Missing required field, invalid JSON |
| `401` | Unauthorized | Missing `x-api-key` or `Authorization` header |
| `403` | Forbidden | Invalid API key |
| `404` | Not Found | Driver/route/run UUID doesn't exist |
| `422` | Unprocessable Entity | Schema validation failed (Pydantic) |
| `429` | Too Many Requests | Rate limit hit (100 req/min per key) |
| `500` | Internal Server Error | Brain pipeline failure (check `/health`) |
| `503` | Service Unavailable | Brain cold-starting on Render (wait 30s and retry) |

**Render cold-start:** Free-tier Render services spin down after 15 min of inactivity. First request after a spin-down takes 30–60s. Subsequent requests are fast. Use UptimeRobot to ping `/health` every 5 min to prevent cold starts.

---

## 6. Rate Limits

| Endpoint group | Limit | Window |
|----------------|-------|--------|
| `/lorri/allocate`, `/lorri/wellness`, `/lorri/stats`, `/lorri/carbon/estimate` | 100 req | per API key per minute |
| `/api/auth/*`, `/api/otp/*` | 30 req | per IP per minute |
| `/api/v1/*` (Brain core) | No limit | — |
| `/lorri/health` | No limit | — |
| `/v1/*` (Backend gateway) | No limit | — |

Rate limit exceeded returns `429` with header `Retry-After: 60`.

---

### 4.11 Dashboard

Ops dashboard KPI and activity endpoints. All require JWT.

#### `GET /api/dashboard/stats`
```json
// Response 200
{
  "pendingRequests": 12,
  "activeShipments": 47,
  "drivers": 8,
  "fleetUtilization": 73
}
```

#### `GET /api/dashboard/activity`
Weekly shipment activity (last 7 days).

```json
// Response 200
[
  { "day": "Mon", "requests": 14 },
  { "day": "Tue", "requests": 21 },
  { "day": "Wed", "requests": 18 }
]
```

#### `GET /api/dashboard/live-tracking-web`
Live vehicle positions formatted for the web dashboard.

```json
// Response 200
[
  {
    "id": "drv_001",
    "name": "Rajan Kumar",
    "plate": "MH-12-AB-3456",
    "lat": 19.076,
    "lng": 72.877,
    "status": "EN_ROUTE",
    "speed": 48
  }
]
```

#### `GET /api/dashboard/live-tracking-gps`
Raw GPS telemetry (higher frequency, for native mobile clients).

```json
// Response 200
[
  { "driverId": "drv_001", "lat": 19.076, "lng": 72.877, "heading": 245, "timestamp": "2026-05-21T09:12:00Z" }
]
```

#### `GET /api/dashboard/recent-absorptions`
Most recent absorption (peer handover) events for the dashboard feed.

```json
// Response 200
[
  {
    "id": "abs_001",
    "from_driver": "Rajan Kumar",
    "to_driver": "Suresh Pillai",
    "route": "Mumbai → Pune",
    "weight_kg": 800,
    "status": "COMPLETED",
    "created_at": "2026-05-21T08:45:00Z"
  }
]
```

---

### 4.12 Dispatch (AI Proxy)

The backend's `/api/dispatch/*` namespace wraps the Brain's allocation pipeline and exposes it to the dashboard with JWT auth. Use these endpoints from the ops dashboard; use `/lorri/allocate` for LoRRI TMS integration.

#### `GET /api/dispatch/health`
Brain connectivity check. Returns connected/offline status.

```json
// Response 200
{
  "status": "connected",
  "brain_url": "https://fairrelay-brain-gdm1.onrender.com",
  "latency_ms": 312,
  "agents_available": 8
}
```

#### `POST /api/dispatch/allocate`
Proxies to Brain `POST /api/v1/allocate/langgraph`. Full request/response schema in [Section 3.1](#31-allocation--langgraph-pipeline).

**Auth:** JWT required

#### `GET /api/dispatch/runs`
List all allocation runs.

```json
// Response 200
[
  {
    "id": "run_abc123",
    "createdAt": "2026-05-21T08:00:00Z",
    "status": "SUCCESS",
    "finalGini": 0.034,
    "fairnessGrade": "A+",
    "driverCount": 5,
    "packageCount": 8
  }
]
```

#### `GET /api/dispatch/runs/:runId`
Single allocation run detail including per-driver assignments.

```json
// Response 200
{
  "id": "run_abc123",
  "createdAt": "2026-05-21T08:00:00Z",
  "status": "SUCCESS",
  "finalGini": 0.034,
  "allocations": [
    { "driverName": "Rajan Kumar", "packages": 4, "workloadScore": 65.3, "explanation": "..." }
  ],
  "agentEvents": [
    { "agent": "fairness_manager", "message": "ACCEPT — Gini 0.034" }
  ]
}
```

#### `GET /api/dispatch/drivers`
Drivers enriched with dispatch history (workload scores, recent run stats).

```json
// Response 200
[
  {
    "id": "drv_001",
    "name": "Rajan Kumar",
    "recentWorkloadScore": 65.3,
    "totalRuns": 14,
    "avgFairnessScore": 0.91
  }
]
```

#### `GET /api/dispatch/drivers/:id`
Single driver dispatch profile.

#### `GET /api/dispatch/routes/:id`
Route detail for a specific dispatch run assignment.

#### `POST /api/dispatch/feedback`
Submit dispatcher feedback on an allocation run.

```json
// Request
{
  "runId": "run_abc123",
  "rating": 4,
  "notes": "Good distribution, Rajan's route was slightly heavy"
}

// Response 201
{ "success": true }
```

#### `POST /api/dispatch/wellness-check`
Run wellness scoring on a list of drivers before dispatch.

```json
// Request
{ "drivers": [ { "id": "drv_001", "name": "Rajan", "hoursToday": 5, "hoursSinceRest": 4, "isIll": false } ] }

// Response 200
{
  "drivers": [
    { "id": "drv_001", "wellnessScore": 68, "riskLevel": "MEDIUM", "fitForDispatch": true, "recommendation": "Monitor — 5h on duty" }
  ]
}
```

#### `POST /api/dispatch/carbon-calculate`
Calculate carbon impact for a set of routes.

```json
// Request
{ "routes": [ { "id": "rt_001", "distance_km": 149, "weight_kg": 800 } ] }

// Response 200
{
  "routes": [
    { "id": "rt_001", "co2_kg": 12.5, "saved_vs_baseline_kg": 18.8 }
  ],
  "total_co2_kg": 12.5,
  "total_saved_kg": 18.8
}
```

#### `POST /api/dispatch/night-safety-filter`
Apply night-time wellness constraints to a driver roster.

```json
// Request
{ "drivers": [ { "id": "drv_001", "hoursToday": 8 } ], "currentHour": 22 }

// Response 200
{
  "isNightMode": true,
  "drivers": [
    { "id": "drv_001", "fitForNight": false, "reason": "Exceeded 8h on duty" }
  ]
}
```

---

*Generated: 2026-05-21 · FairRelay v1.0 · Brain: `fairrelay-brain-gdm1.onrender.com` · Backend: `fairrelay-backend.onrender.com` · CarbonIntelligenceAgent/2.0*
