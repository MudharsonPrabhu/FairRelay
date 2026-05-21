"""
Fair Dispatch System - FastAPI Application
Main entry point for the API server.
"""

import logging

# Configure logging FIRST so module-level loggers in imported modules work
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse

from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.api import (
    allocation_router,
    drivers_router,
    routes_router,
    feedback_router,
    driver_api_router,
    admin_router,
    admin_learning_router,
    allocation_langgraph_router,
    consolidation_router,
)
from app.api.agent_events import router as agent_events_router
from app.api.runs import router as runs_router
from app.api.route_optimization import router as route_optimization_router
logger = logging.getLogger("fairrelay.brain")

settings = get_settings()

# Path to frontend directory
FRONTEND_DIR = Path(__file__).parent.parent / "frontend"


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan handler for startup and shutdown events."""
    # Startup
    import os
    _db_env = os.environ.get("DATABASE_URL", "")
    logger.info(f"Starting {settings.app_title} v{settings.app_version} (env={settings.app_env})")
    logger.info(f"DATABASE_URL env: {'SET (' + _db_env[:30] + '...)' if _db_env else 'NOT SET - SQLite fallback'}")

    # Always initialize DB (creates tables for SQLite fallback)
    try:
        from app.database import init_db, check_db_health
        await init_db()
        healthy = await check_db_health()
        if healthy:
            logger.info("✓ Database initialized and connected")
        else:
            logger.warning("Database init succeeded but health check failed")
    except Exception as e:
        logger.warning(f"Database initialization failed - running degraded: {e}")

    yield
    # Shutdown
    logger.info("Shutting down...")


# Create FastAPI application
app = FastAPI(
    title=settings.app_title,
    version=settings.app_version,
    description="""
    ## FairRelay — AI-Powered Fair Dispatch System

    Production API for fairness-focused route allocation in logistics.
    Integrates with LoRRI TMS (logisticsnow.in) as an AI intelligence layer.

    ### Architecture: 6-Agent LangGraph Pipeline
    1. **ML Effort Agent** — Computes driver-route effort matrix
    2. **Route Planner** — OR-Tools optimal assignment
    3. **Fairness Manager** — Gini index evaluation, may trigger re-optimization
    4. **Driver Liaison** — Per-driver negotiation (accept/counter)
    5. **Final Resolution** — Resolves counter-proposals via swaps
    6. **Explainability** — Human-readable allocation explanations

    ### Route Optimization (VRP/TSP)
    - `POST /api/v1/routes/optimize` — Multi-stop TSP with 2-opt (before/after comparison)
    - `POST /api/v1/routes/cluster` — DBSCAN or KMeans clustering
    - `POST /api/v1/routes/dynamic-insert` — Cheapest-insertion re-routing

    ### LoRRI Integration
    - `POST /lorri/allocate` — Production endpoint with API key auth
    - `POST /lorri/wellness` — Driver wellness scoring
    - `GET /lorri/health` — Integration health monitoring
    - Webhook callbacks on allocation completion
    """,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)


# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"},
    )


# CORS — allow all for demo/hackathon, restrict in production
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ═══ API Routers ══════════════════════════════════════════════════════════════

# Core allocation
app.include_router(allocation_router, prefix=settings.api_prefix)
app.include_router(allocation_langgraph_router, prefix=settings.api_prefix)

# Route optimization (VRP/TSP + DBSCAN clustering + dynamic re-routing)
app.include_router(route_optimization_router, prefix=settings.api_prefix)

# Resources
app.include_router(drivers_router, prefix=settings.api_prefix)
app.include_router(routes_router, prefix=settings.api_prefix)
app.include_router(feedback_router, prefix=settings.api_prefix)
app.include_router(driver_api_router, prefix=settings.api_prefix)

# Admin
app.include_router(admin_router, prefix=settings.api_prefix)
app.include_router(admin_learning_router, prefix=settings.api_prefix)

# Consolidation (8-agent pipeline)
app.include_router(consolidation_router, prefix=settings.api_prefix)

# SSE agent events
app.include_router(agent_events_router)

# Run-scoped endpoints
app.include_router(runs_router, prefix=settings.api_prefix)

# ═══ LoRRI Integration (Option C) ════════════════════════════════════════════
try:
    from app.integrations.lorri import router as lorri_router
    app.include_router(lorri_router, prefix="/lorri", tags=["LoRRI Integration"])
    logger.info("✓ LoRRI integration router mounted at /lorri")
except ImportError as e:
    logger.warning(f"LoRRI integration not available: {e}")


# ═══ Health & Status ══════════════════════════════════════════════════════════

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint."""
    return {
        "status": "healthy",
        "service": settings.app_title,
        "version": settings.app_version,
        "docs": "/docs",
        "lorri_integration": "/lorri/health",
    }


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
async def health_check():
    """Health check with DB verification."""
    from app.database import check_db_health
    db_ok = await check_db_health()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "disconnected",
        "version": settings.app_version,
    }


@app.get("/api/v1/health", tags=["Health"])
async def api_health():
    """API health for frontend connectivity."""
    from app.database import check_db_health
    db_ok = await check_db_health()
    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "sqlite_fallback",
        "version": settings.app_version,
        "agents": ["ml_effort", "route_planner", "fairness_manager", "driver_liaison", "final_resolution", "explainability"],
        "optimization": ["vrp_tsp", "2_opt", "dbscan_clustering", "time_windows", "dynamic_reroute"],
        "langgraph": True,
        "lorri_integration": True,
    }


# ═══ Static Files & Demo Pages ════════════════════════════════════════════════

if FRONTEND_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_DIR)), name="static")

    NO_CACHE = {"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache", "Expires": "0"}

    @app.get("/demo/allocate", tags=["Demo"])
    async def demo_allocate():
        """Serve the API demo page."""
        return FileResponse(FRONTEND_DIR / "demo.html", media_type="text/html", headers=NO_CACHE)

    @app.get("/demo/visualization", tags=["Demo"])
    async def demo_visualization():
        """Serve the agent visualization page."""
        return FileResponse(FRONTEND_DIR / "visualization.html", media_type="text/html", headers=NO_CACHE)

    @app.get("/demo/consolidation", tags=["Demo"])
    async def demo_consolidation():
        """Serve the consolidation pipeline visualization."""
        return FileResponse(FRONTEND_DIR / "consolidation.html", media_type="text/html", headers=NO_CACHE)
