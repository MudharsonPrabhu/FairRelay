import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";
import {
  Layers,
  Play,
  Truck,
  TrendingUp,
  Leaf,
  Route,
  Package,
  Zap,
  FlaskConical,
  Check,
  ArrowRight,
  Brain,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Lightbulb,
  DollarSign,
  Target,
  Award,
  BookOpen,
} from "lucide-react";
import { useToast } from "../context/ToastContext";
import { useAuth } from "../context/AuthContext";
import { runConsolidationOptimize } from "../services/apiClient";
import { AIInsightCard } from "../components/AIInsightCard";

// ── Leaflet icon fix ────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as L.Icon & { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const GROUP_COLORS = [
  "#f97316", "#3b82f6", "#10b981", "#f59e0b", "#ec4899",
  "#8b5cf6", "#06b6d4", "#ef4444", "#84cc16", "#e11d48",
];

function createGroupIcon(color: string, label: string) {
  return L.divIcon({
    className: "custom-marker",
    html: `<div style="background:${color}" class="w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-[9px] font-bold text-white">${label}</div>`,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 12 });
    }
  }, [map, positions]);
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSOLIDATION ENGINE (client-side, mirrors backend algorithm)
// ═══════════════════════════════════════════════════════════════════════════════

function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Shipment {
  id: string; pickupLat: number; pickupLng: number; dropLat: number; dropLng: number;
  pickupLocation: string; dropLocation: string; weight: number; volume: number;
  timeWindowStart?: string; timeWindowEnd?: string; priority?: "HIGH" | "MEDIUM" | "LOW";
}
interface TruckDef { id: string; name: string; maxWeight: number; maxVolume: number; }

function runLocalConsolidation(
  shipments: Shipment[],
  trucks: TruckDef[],
  opts: { maxGroupRadiusKm?: number; timeWindowToleranceMinutes?: number } = {}
) {
  const maxR = opts.maxGroupRadiusKm ?? 30;
  const tolMs = (opts.timeWindowToleranceMinutes ?? 120) * 60000;

  // Geographic clustering
  const clusters: Shipment[][] = [];
  const used = new Set<number>();
  for (let i = 0; i < shipments.length; i++) {
    if (used.has(i)) continue;
    const c = [shipments[i]]; used.add(i);
    for (let j = i + 1; j < shipments.length; j++) {
      if (used.has(j)) continue;
      if (
        haversine(shipments[i].pickupLat, shipments[i].pickupLng, shipments[j].pickupLat, shipments[j].pickupLng) <= maxR &&
        haversine(shipments[i].dropLat, shipments[i].dropLng, shipments[j].dropLat, shipments[j].dropLng) <= maxR
      ) {
        c.push(shipments[j]); used.add(j);
      }
    }
    clusters.push(c);
  }

  // Time window compatibility
  const timeGroups: Shipment[][] = [];
  for (const cl of clusters) {
    if (!cl[0].timeWindowStart) { timeGroups.push(cl); continue; }
    const tUsed = new Set<number>();
    for (let i = 0; i < cl.length; i++) {
      if (tUsed.has(i)) continue;
      const g = [cl[i]]; tUsed.add(i);
      const rS = new Date(cl[i].timeWindowStart!).getTime();
      const rE = cl[i].timeWindowEnd ? new Date(cl[i].timeWindowEnd!).getTime() : rS + 14400000;
      for (let j = i + 1; j < cl.length; j++) {
        if (tUsed.has(j)) continue;
        const sS = new Date(cl[j].timeWindowStart || "").getTime();
        const sE = cl[j].timeWindowEnd ? new Date(cl[j].timeWindowEnd!).getTime() : sS + 14400000;
        if (sS <= rE + tolMs && sE >= rS - tolMs) { g.push(cl[j]); tUsed.add(j); }
      }
      timeGroups.push(g);
    }
  }

  // FFD bin-packing
  type Bin = { truck: TruckDef; shipments: Shipment[]; usedW: number; usedV: number };
  const bins: Bin[] = [];
  let pool = [...trucks];
  for (const grp of timeGroups) {
    if (!pool.length) pool = [...trucks];
    const sorted = [...grp].sort((a, b) => b.weight - a.weight);
    const localBins: Bin[] = pool.map(t => ({ truck: t, shipments: [], usedW: 0, usedV: 0 }));
    for (const s of sorted) {
      let placed = false;
      for (const b of localBins) {
        if (b.usedW + s.weight <= b.truck.maxWeight && b.usedV + s.volume <= b.truck.maxVolume) {
          b.shipments.push(s); b.usedW += s.weight; b.usedV += s.volume; placed = true; break;
        }
      }
      if (!placed && localBins.length) {
        const last = localBins[localBins.length - 1];
        last.shipments.push(s); last.usedW += s.weight; last.usedV += s.volume;
      }
    }
    const filled = localBins.filter(b => b.shipments.length > 0);
    bins.push(...filled);
    const usedIds = new Set(filled.map(b => b.truck.id));
    pool = pool.filter(t => !usedIds.has(t.id));
  }

  // Metrics
  const naiveDist = shipments.reduce((s, sh) => s + haversine(sh.pickupLat, sh.pickupLng, sh.dropLat, sh.dropLng), 0);
  const consDist = bins.reduce((s, b) => s + b.shipments.reduce((d, sh) => d + haversine(sh.pickupLat, sh.pickupLng, sh.dropLat, sh.dropLng), 0), 0);
  const totalW = shipments.reduce((s, sh) => s + sh.weight, 0);
  const avgCap = trucks.length ? trucks.reduce((s, t) => s + t.maxWeight, 0) / trucks.length : 1;
  const naiveUtil = shipments.length ? (totalW / (shipments.length * avgCap)) * 100 : 0;
  const consUtil = bins.length ? (totalW / (bins.length * avgCap)) * 100 : 0;
  const distSaved = Math.max(0, naiveDist - consDist);
  const tripsReduced = Math.max(0, shipments.length - bins.length);

  // Per-group data with AI confidence
  const groups = bins.map((b, i) => {
    const gDist = b.shipments.reduce((d, sh) => d + haversine(sh.pickupLat, sh.pickupLng, sh.dropLat, sh.dropLng), 0);

    // AI confidence: blend of capacity fit, geographic density, time window overlap
    const capFit = Math.min((b.usedW / b.truck.maxWeight) * 100, 100);
    const avgPickupSpread = b.shipments.length > 1
      ? b.shipments.reduce((sum, sh, _, arr) =>
          sum + arr.reduce((s2, sh2) => s2 + haversine(sh.pickupLat, sh.pickupLng, sh2.pickupLat, sh2.pickupLng), 0), 0
        ) / (b.shipments.length * b.shipments.length)
      : 0;
    const geoScore = Math.max(0, 100 - avgPickupSpread * 3);
    const timeWindows = b.shipments.filter(s => s.timeWindowStart);
    let timeScore = 100;
    if (timeWindows.length > 1) {
      const starts = timeWindows.map(s => new Date(s.timeWindowStart!).getTime());
      const spread = (Math.max(...starts) - Math.min(...starts)) / 3600000;
      timeScore = Math.max(0, 100 - spread * 15);
    }
    const confidence = Math.round(capFit * 0.4 + geoScore * 0.35 + timeScore * 0.25);

    return {
      groupId: i + 1,
      truckId: b.truck.id,
      truckName: b.truck.name,
      truckCapacity: { maxWeight: b.truck.maxWeight, maxVolume: b.truck.maxVolume },
      shipmentCount: b.shipments.length,
      shipments: b.shipments.map(s => ({
        id: s.id, pickupLocation: s.pickupLocation, dropLocation: s.dropLocation,
        weight: s.weight, volume: s.volume,
        pickupLat: s.pickupLat, pickupLng: s.pickupLng, dropLat: s.dropLat, dropLng: s.dropLng,
      })),
      totalWeight: b.usedW,
      totalVolume: b.usedV,
      utilizationWeight: (b.usedW / b.truck.maxWeight) * 100,
      utilizationVolume: (b.usedV / b.truck.maxVolume) * 100,
      routeDistanceKm: +gDist.toFixed(1),
      confidence,
      capFit: +capFit.toFixed(1),
      geoScore: +geoScore.toFixed(1),
      timeScore: +timeScore.toFixed(1),
    };
  });

  // Overall AI optimization score (0-100)
  const avgConfidence = groups.length ? groups.reduce((s, g) => s + g.confidence, 0) / groups.length : 0;
  const utilGain = Math.min(consUtil - naiveUtil, 50);
  const tripGain = shipments.length ? (tripsReduced / shipments.length) * 100 : 0;
  const optimizationScore = Math.round(
    avgConfidence * 0.35 + Math.min(consUtil, 100) * 0.25 + tripGain * 0.2 + Math.min(utilGain * 2, 20)
  );

  // Carbon credit monetization ($25/ton CO2)
  const carbonCreditRate = 25;
  const carbonSavedKg = +(distSaved * 0.21).toFixed(1);
  const carbonCreditUSD = +((carbonSavedKg / 1000) * carbonCreditRate).toFixed(2);

  // Fuel cost savings (avg diesel ₹90/L, 4km/L for trucks)
  const fuelPricePerKm = 90 / 4;
  const fuelSavedINR = +(distSaved * fuelPricePerKm).toFixed(0);

  return {
    groups,
    metrics: {
      totalShipments: shipments.length,
      totalGroups: groups.length,
      totalTrucks: trucks.length,
      utilizationBefore: +Math.min(naiveUtil, 100).toFixed(1),
      utilizationAfter: +Math.min(consUtil, 100).toFixed(1),
      utilizationImprovement: +Math.min(consUtil - naiveUtil, 100).toFixed(1),
      tripsReduced,
      tripReductionPercent: +(shipments.length ? (tripsReduced / shipments.length) * 100 : 0).toFixed(1),
      distanceSavedKm: +distSaved.toFixed(1),
      carbonSavedKg,
      carbonCreditUSD,
      fuelSavedINR,
      costSavedPercent: +(shipments.length ? (tripsReduced / shipments.length) * 100 : 0).toFixed(1),
      naiveTotalDistanceKm: +naiveDist.toFixed(1),
      consolidatedDistanceKm: +consDist.toFixed(1),
      optimizationScore,
      avgConfidence: +avgConfidence.toFixed(0),
    },
    // Learning insights generated from this run
    insights: generateInsights(shipments, groups, {
      tripsReduced, distSaved, carbonSavedKg, consUtil, naiveUtil, optimizationScore,
    }),
  };
}

// ── Continuous Learning: generate insights from each run ─────────────────────
function generateInsights(
  shipments: Shipment[],
  groups: any[],
  m: { tripsReduced: number; distSaved: number; carbonSavedKg: number; consUtil: number; naiveUtil: number; optimizationScore: number }
) {
  const insights: { type: "pattern" | "recommendation" | "learning"; text: string; impact: "high" | "medium" | "low" }[] = [];

  // Detect geographic corridors
  const corridors = new Map<string, number>();
  groups.forEach((g: any) => {
    if (g.shipments.length > 1) {
      const key = `${g.shipments[0].pickupLocation?.split(" ")[0]} → ${g.shipments[0].dropLocation?.split(" ")[0]}`;
      corridors.set(key, (corridors.get(key) || 0) + g.shipmentCount);
    }
  });
  const topCorridor = [...corridors.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCorridor) {
    insights.push({
      type: "pattern",
      text: `High-density corridor detected: ${topCorridor[0]} (${topCorridor[1]} shipments). Schedule fixed consolidation runs on this route.`,
      impact: "high",
    });
  }

  // Capacity utilization insight
  const underutilized = groups.filter((g: any) => g.utilizationWeight < 50);
  if (underutilized.length > 0) {
    insights.push({
      type: "recommendation",
      text: `${underutilized.length} group(s) below 50% capacity. Consider widening the time window or geo-radius to merge these with nearby shipments.`,
      impact: "medium",
    });
  }

  const overutilized = groups.filter((g: any) => g.utilizationWeight > 90);
  if (overutilized.length > 0) {
    insights.push({
      type: "learning",
      text: `${overutilized.length} group(s) at >90% capacity — optimal bin-packing achieved. This configuration can be saved as a template.`,
      impact: "high",
    });
  }

  // Time window clustering insight
  const timeGrouped = shipments.filter(s => s.timeWindowStart);
  if (timeGrouped.length > shipments.length * 0.7) {
    insights.push({
      type: "learning",
      text: `${Math.round((timeGrouped.length / shipments.length) * 100)}% of shipments have time windows. The engine is leveraging temporal proximity for better grouping.`,
      impact: "medium",
    });
  }

  // Carbon impact
  if (m.carbonSavedKg > 50) {
    insights.push({
      type: "pattern",
      text: `${m.carbonSavedKg} kg CO₂ reduction identified. At current carbon credit rates ($25/ton), this generates $${((m.carbonSavedKg / 1000) * 25).toFixed(2)} in tradeable credits per run.`,
      impact: "high",
    });
  }

  // Trip reduction pattern
  if (m.tripsReduced > 3) {
    insights.push({
      type: "recommendation",
      text: `${m.tripsReduced} trips eliminated through consolidation. Running this optimization daily could save ${m.tripsReduced * 30} trips/month and ₹${(m.distSaved * 22.5 * 30).toFixed(0)} in fuel costs.`,
      impact: "high",
    });
  }

  // Overall optimization quality
  if (m.optimizationScore >= 70) {
    insights.push({
      type: "learning",
      text: `Optimization score of ${m.optimizationScore}/100 indicates strong consolidation quality. The algorithm has found efficient groupings for this shipment pattern.`,
      impact: "low",
    });
  } else {
    insights.push({
      type: "recommendation",
      text: `Optimization score of ${m.optimizationScore}/100 — try adjusting the geographic radius or adding more shipments to improve consolidation density.`,
      impact: "medium",
    });
  }

  return insights;
}

// ── Compatibility matrix computation ─────────────────────────────────────────
function computeCompatibilityMatrix(shipments: Shipment[], maxR: number, tolMin: number) {
  const n = shipments.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const tolMs = tolMin * 60000;

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) { matrix[i][j] = 100; continue; }
      const pickDist = haversine(shipments[i].pickupLat, shipments[i].pickupLng, shipments[j].pickupLat, shipments[j].pickupLng);
      const dropDist = haversine(shipments[i].dropLat, shipments[i].dropLng, shipments[j].dropLat, shipments[j].dropLng);
      const geoCompat = Math.max(0, 100 - ((pickDist + dropDist) / (maxR * 2)) * 100);

      let timeCompat = 100;
      if (shipments[i].timeWindowStart && shipments[j].timeWindowStart) {
        const iS = new Date(shipments[i].timeWindowStart!).getTime();
        const jS = new Date(shipments[j].timeWindowStart!).getTime();
        const gap = Math.abs(iS - jS);
        timeCompat = Math.max(0, 100 - (gap / tolMs) * 100);
      }

      const score = Math.round(geoCompat * 0.6 + timeCompat * 0.4);
      matrix[i][j] = score;
      matrix[j][i] = score;
    }
  }
  return matrix;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UI COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function KpiCard({
  icon: Icon, label, value, sub, color,
}: {
  icon: typeof TrendingUp; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-eco-card border border-eco-card-border rounded-xl p-4 flex items-start space-x-3">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-gray-400 uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-white mt-0.5">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function OptimizationGrade({ score }: { score: number }) {
  const grade = score >= 85 ? "A+" : score >= 75 ? "A" : score >= 60 ? "B+" : score >= 50 ? "B" : "C";
  const gradeColor =
    score >= 85 ? "text-emerald-400" : score >= 75 ? "text-green-400" : score >= 60 ? "text-yellow-400" : score >= 50 ? "text-orange-400" : "text-red-400";
  const ringColor =
    score >= 85 ? "border-emerald-400" : score >= 75 ? "border-green-400" : score >= 60 ? "border-yellow-400" : score >= 50 ? "border-orange-400" : "border-red-400";

  return (
    <div className="flex items-center gap-4">
      <div className={`w-16 h-16 rounded-full border-4 ${ringColor} flex items-center justify-center`}>
        <span className={`text-2xl font-black ${gradeColor}`}>{grade}</span>
      </div>
      <div>
        <div className="text-sm font-semibold text-white">AI Optimization Score</div>
        <div className="text-xs text-gray-400">{score}/100 — {
          score >= 85 ? "Excellent consolidation" : score >= 75 ? "Strong optimization" : score >= 60 ? "Good, room to improve" : "Needs parameter tuning"
        }</div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCENARIOS
// ═══════════════════════════════════════════════════════════════════════════════

const SCENARIOS = [
  { name: "Tight Clustering", desc: "15 km radius, 1 hr tolerance", maxGroupRadiusKm: 15, timeWindowToleranceMinutes: 60 },
  { name: "Balanced (Default)", desc: "30 km radius, 2 hr tolerance", maxGroupRadiusKm: 30, timeWindowToleranceMinutes: 120 },
  { name: "Aggressive Merge", desc: "60 km radius, 4 hr tolerance", maxGroupRadiusKm: 60, timeWindowToleranceMinutes: 240 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// DEMO DATA — realistic Indian logistics corridors
// ═══════════════════════════════════════════════════════════════════════════════

const DEMO_SHIPMENTS: Shipment[] = [
  { id: "SH-001", pickupLat: 19.076, pickupLng: 72.877, dropLat: 18.52, dropLng: 73.856, pickupLocation: "Mumbai Port", dropLocation: "Pune Warehouse", weight: 800, volume: 3.2, timeWindowStart: "2026-02-20T06:00:00Z", timeWindowEnd: "2026-02-20T12:00:00Z", priority: "HIGH" },
  { id: "SH-002", pickupLat: 19.098, pickupLng: 72.89, dropLat: 18.532, dropLng: 73.87, pickupLocation: "Mumbai JNPT", dropLocation: "Pune Industrial", weight: 600, volume: 2.5, timeWindowStart: "2026-02-20T07:00:00Z", timeWindowEnd: "2026-02-20T13:00:00Z", priority: "MEDIUM" },
  { id: "SH-003", pickupLat: 19.06, pickupLng: 72.868, dropLat: 18.54, dropLng: 73.88, pickupLocation: "Mumbai Dock", dropLocation: "Pune Hub", weight: 450, volume: 1.8, timeWindowStart: "2026-02-20T06:30:00Z", timeWindowEnd: "2026-02-20T11:00:00Z", priority: "LOW" },
  { id: "SH-004", pickupLat: 12.971, pickupLng: 77.594, dropLat: 13.083, dropLng: 80.27, pickupLocation: "Bangalore Warehouse", dropLocation: "Chennai Central", weight: 1200, volume: 5.0, timeWindowStart: "2026-02-20T08:00:00Z", timeWindowEnd: "2026-02-20T18:00:00Z", priority: "HIGH" },
  { id: "SH-005", pickupLat: 12.985, pickupLng: 77.61, dropLat: 13.06, dropLng: 80.25, pickupLocation: "Bangalore Tech Park", dropLocation: "Chennai Port", weight: 900, volume: 3.8, timeWindowStart: "2026-02-20T09:00:00Z", timeWindowEnd: "2026-02-20T19:00:00Z", priority: "MEDIUM" },
  { id: "SH-006", pickupLat: 12.96, pickupLng: 77.58, dropLat: 13.07, dropLng: 80.26, pickupLocation: "Bangalore South", dropLocation: "Chennai North", weight: 700, volume: 2.9, timeWindowStart: "2026-02-20T08:30:00Z", timeWindowEnd: "2026-02-20T17:00:00Z", priority: "LOW" },
  { id: "SH-007", pickupLat: 28.704, pickupLng: 77.102, dropLat: 26.912, dropLng: 75.787, pickupLocation: "Delhi NCR Hub", dropLocation: "Jaipur Depot", weight: 1500, volume: 6.0, timeWindowStart: "2026-02-20T05:00:00Z", timeWindowEnd: "2026-02-20T14:00:00Z", priority: "HIGH" },
  { id: "SH-008", pickupLat: 28.72, pickupLng: 77.12, dropLat: 26.93, dropLng: 75.8, pickupLocation: "Delhi Warehouse", dropLocation: "Jaipur Industrial", weight: 1100, volume: 4.5, timeWindowStart: "2026-02-20T05:30:00Z", timeWindowEnd: "2026-02-20T13:00:00Z", priority: "MEDIUM" },
  { id: "SH-009", pickupLat: 28.69, pickupLng: 77.09, dropLat: 26.9, dropLng: 75.77, pickupLocation: "Delhi Logistics Park", dropLocation: "Jaipur Hub", weight: 500, volume: 2.0, timeWindowStart: "2026-02-20T06:00:00Z", timeWindowEnd: "2026-02-20T15:00:00Z", priority: "LOW" },
  { id: "SH-010", pickupLat: 19.09, pickupLng: 72.87, dropLat: 21.17, dropLng: 72.831, pickupLocation: "Mumbai Central", dropLocation: "Surat Hub", weight: 950, volume: 4.0, timeWindowStart: "2026-02-20T07:00:00Z", timeWindowEnd: "2026-02-20T16:00:00Z", priority: "MEDIUM" },
  { id: "SH-011", pickupLat: 19.07, pickupLng: 72.86, dropLat: 21.18, dropLng: 72.84, pickupLocation: "Mumbai West", dropLocation: "Surat Depot", weight: 650, volume: 2.7, timeWindowStart: "2026-02-20T07:30:00Z", timeWindowEnd: "2026-02-20T16:00:00Z", priority: "LOW" },
  { id: "SH-012", pickupLat: 17.385, pickupLng: 78.486, dropLat: 15.828, dropLng: 78.037, pickupLocation: "Hyderabad Hub", dropLocation: "Kurnool Depot", weight: 1800, volume: 7.2, timeWindowStart: "2026-02-20T06:00:00Z", timeWindowEnd: "2026-02-20T14:00:00Z", priority: "HIGH" },
  { id: "SH-013", pickupLat: 17.4, pickupLng: 78.5, dropLat: 15.84, dropLng: 78.05, pickupLocation: "Hyderabad HITEC", dropLocation: "Kurnool Industrial", weight: 400, volume: 1.6, timeWindowStart: "2026-02-20T06:30:00Z", timeWindowEnd: "2026-02-20T13:00:00Z", priority: "MEDIUM" },
  { id: "SH-014", pickupLat: 28.68, pickupLng: 77.08, dropLat: 28.46, dropLng: 77.026, pickupLocation: "Delhi South", dropLocation: "Gurgaon Hub", weight: 300, volume: 1.2, timeWindowStart: "2026-02-20T10:00:00Z", timeWindowEnd: "2026-02-20T14:00:00Z", priority: "LOW" },
  { id: "SH-015", pickupLat: 28.7, pickupLng: 77.1, dropLat: 28.47, dropLng: 77.03, pickupLocation: "Delhi Central", dropLocation: "Gurgaon Cyber City", weight: 350, volume: 1.4, timeWindowStart: "2026-02-20T10:30:00Z", timeWindowEnd: "2026-02-20T15:00:00Z", priority: "MEDIUM" },
];

const DEMO_TRUCKS: TruckDef[] = [
  { id: "TRK-001", name: "Tata Ace Gold", maxWeight: 2000, maxVolume: 8.0 },
  { id: "TRK-002", name: "Ashok Leyland Dost", maxWeight: 2500, maxVolume: 10.0 },
  { id: "TRK-003", name: "Mahindra Bolero", maxWeight: 1500, maxVolume: 6.0 },
  { id: "TRK-004", name: "Eicher Pro 2049", maxWeight: 5000, maxVolume: 20.0 },
  { id: "TRK-005", name: "BharatBenz 1015R", maxWeight: 3000, maxVolume: 12.0 },
  { id: "TRK-006", name: "Tata Ultra T.7", maxWeight: 3500, maxVolume: 14.0 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PAGE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function LoadConsolidation() {
  const { showToast } = useToast();
  const { isDemo } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [apiUsed, setApiUsed] = useState<'brain' | 'local' | null>(null);

  // Parameter controls
  const [radiusKm, setRadiusKm] = useState(30);
  const [timeTolerance, setTimeTolerance] = useState(120);

  // Scenario simulation
  const [scenarioResults, setScenarioResults] = useState<any[]>([]);
  const [showSimPanel, setShowSimPanel] = useState(false);

  // Before/After map toggle
  const [mapMode, setMapMode] = useState<"optimized" | "before">("optimized");

  // Compatibility heatmap
  const [showHeatmap, setShowHeatmap] = useState(false);

  // Run with current slider parameters — calls real API in non-demo mode
  const runConsolidation = useCallback(async () => {
    setLoading(true);
    if (!isDemo) {
      try {
        const apiResult = await runConsolidationOptimize({
          shipments: DEMO_SHIPMENTS,
          trucks: DEMO_TRUCKS,
          options: { maxGroupRadiusKm: radiusKm, timeWindowToleranceMinutes: timeTolerance },
        });
        if (apiResult?.success && apiResult?.data) {
          setResult(apiResult.data);
          setApiUsed('brain');
          setLoading(false);
          showToast('AI Consolidation', 'Results from FairRelay Brain', 'success');
          return;
        }
      } catch {
        // API unreachable — fall through to local engine
      }
    }
    const r = runLocalConsolidation(DEMO_SHIPMENTS, DEMO_TRUCKS, {
      maxGroupRadiusKm: radiusKm,
      timeWindowToleranceMinutes: timeTolerance,
    });
    setResult(r);
    setApiUsed('local');
    setLoading(false);
  }, [radiusKm, timeTolerance, isDemo, showToast]);

  // Scenario comparison
  const runScenarios = () => {
    const results = SCENARIOS.map((sc) => ({
      name: sc.name,
      ...runLocalConsolidation(DEMO_SHIPMENTS, DEMO_TRUCKS, {
        maxGroupRadiusKm: sc.maxGroupRadiusKm,
        timeWindowToleranceMinutes: sc.timeWindowToleranceMinutes,
      }),
    }));
    setScenarioResults(results);
    setShowSimPanel(true);
  };

  const applyScenario = (idx: number) => {
    const sc = SCENARIOS[idx];
    setRadiusKm(sc.maxGroupRadiusKm);
    setTimeTolerance(sc.timeWindowToleranceMinutes);
    setResult(
      runLocalConsolidation(DEMO_SHIPMENTS, DEMO_TRUCKS, {
        maxGroupRadiusKm: sc.maxGroupRadiusKm,
        timeWindowToleranceMinutes: sc.timeWindowToleranceMinutes,
      })
    );
    showToast("Success", `Applied "${sc.name}" strategy`, "success");
  };

  useEffect(() => { runConsolidation(); }, []);

  // Compatibility matrix
  const compatMatrix = useMemo(
    () => showHeatmap ? computeCompatibilityMatrix(DEMO_SHIPMENTS, radiusKm, timeTolerance) : [],
    [showHeatmap, radiusKm, timeTolerance]
  );

  const metrics = result?.metrics;
  const groups: any[] = result?.groups || [];
  const insights: any[] = result?.insights || [];

  const allPositions: [number, number][] = useMemo(() => {
    if (mapMode === "before") {
      return DEMO_SHIPMENTS.flatMap(s => [[s.pickupLat, s.pickupLng], [s.dropLat, s.dropLng]] as [number, number][]);
    }
    const pts: [number, number][] = [];
    groups.forEach((g: any) =>
      g.shipments?.forEach((s: any) => {
        if (s.pickupLat) pts.push([s.pickupLat, s.pickupLng]);
        if (s.dropLat) pts.push([s.dropLat, s.dropLng]);
      })
    );
    return pts;
  }, [groups, mapMode]);

  const utilizationChartData = groups.map((g: any, i: number) => ({
    name: g.truckName || `Group ${g.groupId}`,
    utilization: parseFloat(g.utilizationWeight?.toFixed(1) || "0"),
    confidence: g.confidence,
    fill: GROUP_COLORS[i % GROUP_COLORS.length],
  }));

  const tripPieData = metrics
    ? [
        { name: "Eliminated", value: metrics.tripsReduced, color: "#10b981" },
        { name: "Remaining", value: metrics.totalShipments - metrics.tripsReduced, color: "#f97316" },
      ]
    : [];

  // Radar chart for multi-dimensional scoring
  const radarData = metrics
    ? [
        { subject: "Utilization", value: metrics.utilizationAfter, fullMark: 100 },
        { subject: "Trip Reduction", value: metrics.tripReductionPercent, fullMark: 100 },
        { subject: "Cost Saving", value: metrics.costSavedPercent, fullMark: 100 },
        { subject: "Geo Density", value: metrics.avgConfidence, fullMark: 100 },
        { subject: "Carbon Impact", value: Math.min((metrics.carbonSavedKg / 100) * 100, 100), fullMark: 100 },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-600/20">
              <Layers className="w-6 h-6 text-orange-400" />
            </div>
            AI Load Consolidation Engine
          </h1>
          <p className="text-eco-text-secondary text-sm mt-1">
            Intelligent shipment grouping &middot; Capacity optimization &middot; Scenario simulation
          </p>
        </div>
        <div className="flex items-center gap-3">
          {apiUsed && (
            <div className={`px-2.5 py-1 rounded-lg text-xs font-medium border flex items-center gap-1.5 ${
              apiUsed === 'brain'
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${apiUsed === 'brain' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {apiUsed === 'brain' ? 'AI Brain' : isDemo ? 'Demo Engine' : 'Local Engine'}
            </div>
          )}
          <button
            onClick={() => { runScenarios(); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-purple-500/40 bg-purple-600/10 text-purple-300 font-semibold hover:bg-purple-600/20 transition-all active:scale-[0.98]"
          >
            <FlaskConical className="w-4 h-4" />
            Simulate Scenarios
          </button>
          <button
            onClick={runConsolidation}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 text-white font-semibold hover:from-orange-500 hover:to-amber-400 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {!isDemo ? 'Run AI Optimization' : 'Run Optimization'}
          </button>
        </div>
      </div>

      {/* AI Score + Parameter Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Optimization Score */}
        {metrics && (
          <div className="bg-eco-card border border-eco-card-border rounded-xl p-5 flex items-center">
            <OptimizationGrade score={metrics.optimizationScore} />
          </div>
        )}

        {/* Real-time Parameter Tuning */}
        <div className="lg:col-span-2 bg-eco-card border border-eco-card-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-orange-400" />
            Real-time Parameter Tuning
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">Geographic Radius</span>
                <span className="text-orange-400 font-semibold">{radiusKm} km</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={radiusKm}
                onChange={(e) => setRadiusKm(+e.target.value)}
                onMouseUp={runConsolidation}
                onTouchEnd={runConsolidation}
                className="w-full accent-orange-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>5 km (tight)</span>
                <span>100 km (wide)</span>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-gray-400">Time Window Tolerance</span>
                <span className="text-orange-400 font-semibold">{timeTolerance} min</span>
              </div>
              <input
                type="range"
                min={15}
                max={480}
                step={15}
                value={timeTolerance}
                onChange={(e) => setTimeTolerance(+e.target.value)}
                onMouseUp={runConsolidation}
                onTouchEnd={runConsolidation}
                className="w-full accent-orange-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>15 min (strict)</span>
                <span>8 hr (flexible)</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <KpiCard icon={TrendingUp} label="Utilization" value={`${metrics.utilizationAfter}%`} sub={`+${metrics.utilizationImprovement}% vs naive`} color="#10b981" />
          <KpiCard icon={Truck} label="Trips Reduced" value={`${metrics.tripsReduced}`} sub={`${metrics.tripReductionPercent}% fewer`} color="#3b82f6" />
          <KpiCard icon={Route} label="Distance Saved" value={`${metrics.distanceSavedKm} km`} sub={`${metrics.consolidatedDistanceKm} km total`} color="#f59e0b" />
          <KpiCard icon={Leaf} label="CO₂ Reduced" value={`${metrics.carbonSavedKg} kg`} sub="emissions avoided" color="#10b981" />
          <KpiCard icon={DollarSign} label="Carbon Credits" value={`$${metrics.carbonCreditUSD}`} sub={`@ $25/ton CO₂`} color="#8b5cf6" />
          <KpiCard icon={Zap} label="Fuel Saved" value={`₹${metrics.fuelSavedINR}`} sub={`${metrics.costSavedPercent}% cost reduction`} color="#ec4899" />
        </div>
      )}

      {/* Map + Groups */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Map with Before/After toggle */}
        <div className="lg:col-span-3 bg-eco-card border border-eco-card-border rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-3 border-b border-eco-card-border">
            <span className="text-xs font-semibold text-gray-400 uppercase">Consolidation Map</span>
            <button
              onClick={() => setMapMode(m => m === "optimized" ? "before" : "optimized")}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-orange-500/30 transition-all text-gray-300 hover:text-white"
            >
              {mapMode === "optimized" ? <ToggleRight className="w-4 h-4 text-orange-400" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
              {mapMode === "optimized" ? "Optimized View" : "Before (Naive)"}
            </button>
          </div>
          <div className="h-[440px]">
            <MapContainer
              center={[20.5, 78.9]}
              zoom={5}
              style={{ height: "100%", width: "100%", background: "#111620" }}
              zoomControl={false}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
                url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              />
              {allPositions.length > 0 && <FitBounds positions={allPositions} />}

              {mapMode === "before" ? (
                /* BEFORE: all shipments as individual gray routes */
                DEMO_SHIPMENTS.map((s) => (
                  <Fragment key={s.id}>
                    <CircleMarker center={[s.pickupLat, s.pickupLng]} radius={4} pathOptions={{ color: "#6b7280", fillColor: "#6b7280", fillOpacity: 0.8 }}>
                      <Popup><b>{s.pickupLocation}</b><br />{s.weight} kg — individual trip</Popup>
                    </CircleMarker>
                    <CircleMarker center={[s.dropLat, s.dropLng]} radius={4} pathOptions={{ color: "#9ca3af", fillColor: "#9ca3af", fillOpacity: 0.8 }}>
                      <Popup><b>{s.dropLocation}</b></Popup>
                    </CircleMarker>
                    <Polyline positions={[[s.pickupLat, s.pickupLng], [s.dropLat, s.dropLng]]} pathOptions={{ color: "#4b5563", weight: 1.5, opacity: 0.5 }} />
                  </Fragment>
                ))
              ) : (
                /* AFTER: color-coded consolidated groups */
                groups.map((g: any, gi: number) => {
                  const color = GROUP_COLORS[gi % GROUP_COLORS.length];
                  return (
                    <Fragment key={g.groupId}>
                      {g.shipments?.map((s: any) => (
                        <Fragment key={s.id}>
                          <Marker position={[s.pickupLat, s.pickupLng] as [number, number]} icon={createGroupIcon(color, "P")}>
                            <Popup><b>Pickup</b>: {s.pickupLocation}<br />Group {g.groupId} — {s.weight} kg<br />Confidence: {g.confidence}%</Popup>
                          </Marker>
                          <Marker position={[s.dropLat, s.dropLng] as [number, number]} icon={createGroupIcon(color, "D")}>
                            <Popup><b>Drop</b>: {s.dropLocation}<br />Group {g.groupId}</Popup>
                          </Marker>
                          <Polyline positions={[[s.pickupLat, s.pickupLng], [s.dropLat, s.dropLng]]} pathOptions={{ color, weight: 2.5, opacity: 0.7, dashArray: "6 4" }} />
                        </Fragment>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </MapContainer>
          </div>
        </div>

        {/* Groups with confidence scores */}
        <div className="lg:col-span-2 bg-eco-card border border-eco-card-border rounded-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-eco-card-border flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-orange-400" />
              Consolidated Groups ({groups.length})
            </h3>
            <span className="text-[10px] text-gray-500">AI Confidence shown</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-3 max-h-[420px]">
            {groups.length === 0 && !loading && (
              <div className="text-center text-gray-500 py-8">Run consolidation to see groups</div>
            )}
            {groups.map((g: any, gi: number) => {
              const color = GROUP_COLORS[gi % GROUP_COLORS.length];
              const pct = g.utilizationWeight || 0;
              const confColor = g.confidence >= 80 ? "text-emerald-400" : g.confidence >= 60 ? "text-yellow-400" : "text-red-400";
              return (
                <div key={g.groupId} className="bg-white/5 rounded-lg p-3 border border-white/5">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                      <span className="text-sm font-semibold text-white">Group {g.groupId}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${confColor}`}>
                        <Brain className="w-3 h-3 inline mr-0.5" />{g.confidence}%
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mb-1">{g.truckName}</div>
                  <div className="text-xs text-gray-400 mb-2">
                    {g.shipmentCount} shipments &middot; {g.totalWeight} kg &middot; {g.routeDistanceKm} km
                  </div>
                  <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                    <span>Fill: {pct.toFixed(1)}%</span>
                    <span>Geo: {g.geoScore}% &middot; Time: {g.timeScore}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scenario Simulation */}
      {showSimPanel && scenarioResults.length > 0 && (
        <div className="bg-eco-card border border-purple-500/20 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-purple-400" />
            Scenario Simulation — Compare Consolidation Strategies
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-gray-400 py-2 pr-4 font-medium">Strategy</th>
                  <th className="text-center text-gray-400 py-2 px-2 font-medium">Score</th>
                  <th className="text-center text-gray-400 py-2 px-2 font-medium">Groups</th>
                  <th className="text-center text-gray-400 py-2 px-2 font-medium">Utilization</th>
                  <th className="text-center text-gray-400 py-2 px-2 font-medium">Trips Saved</th>
                  <th className="text-center text-gray-400 py-2 px-2 font-medium">CO₂ Saved</th>
                  <th className="text-center text-gray-400 py-2 px-2 font-medium">Carbon $</th>
                  <th className="text-center text-gray-400 py-2 px-2 font-medium">Fuel ₹</th>
                  <th className="text-center text-gray-400 py-2 px-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {scenarioResults.map((sr: any, idx: number) => {
                  const isBest = scenarioResults.reduce(
                    (b, s, i) => s.metrics.optimizationScore > scenarioResults[b].metrics.optimizationScore ? i : b, 0
                  ) === idx;
                  const isActive = radiusKm === SCENARIOS[idx].maxGroupRadiusKm && timeTolerance === SCENARIOS[idx].timeWindowToleranceMinutes;
                  return (
                    <tr key={sr.name} className={`border-b border-white/5 transition-colors ${isActive ? "bg-orange-600/10" : "hover:bg-white/5"}`}>
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{sr.name}</span>
                          {isBest && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-400 font-semibold">RECOMMENDED</span>}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">{SCENARIOS[idx].desc}</div>
                      </td>
                      <td className="text-center py-3 px-2">
                        <span className={`font-bold ${sr.metrics.optimizationScore >= 75 ? "text-emerald-400" : sr.metrics.optimizationScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                          {sr.metrics.optimizationScore}
                        </span>
                      </td>
                      <td className="text-center text-white py-3 px-2">{sr.metrics.totalGroups}</td>
                      <td className="text-center text-emerald-400 py-3 px-2 font-semibold">{sr.metrics.utilizationAfter}%</td>
                      <td className="text-center text-blue-400 py-3 px-2">{sr.metrics.tripsReduced} ({sr.metrics.tripReductionPercent}%)</td>
                      <td className="text-center text-green-400 py-3 px-2">{sr.metrics.carbonSavedKg} kg</td>
                      <td className="text-center text-purple-400 py-3 px-2">${sr.metrics.carbonCreditUSD}</td>
                      <td className="text-center text-pink-400 py-3 px-2">₹{sr.metrics.fuelSavedINR}</td>
                      <td className="text-center py-3 px-2">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 text-xs text-orange-400 font-semibold"><Check className="w-3.5 h-3.5" /> Active</span>
                        ) : (
                          <button onClick={() => applyScenario(idx)} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors">
                            Apply <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts: Utilization + Radar + Pie */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Utilization Bar */}
          <div className="bg-eco-card border border-eco-card-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Vehicle Utilization by Group</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={utilizationChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 9 }} angle={-25} textAnchor="end" height={50} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} domain={[0, 100]} unit="%" />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
                <Bar dataKey="utilization" radius={[6, 6, 0, 0]}>
                  {utilizationChartData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Multi-dimension Radar */}
          <div className="bg-eco-card border border-eco-card-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-cyan-400" />
              Optimization Radar
            </h3>
            <ResponsiveContainer width="100%" height={240}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#333" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#9ca3af", fontSize: 10 }} />
                <PolarRadiusAxis angle={90} tick={{ fill: "#666", fontSize: 9 }} domain={[0, 100]} />
                <Radar dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.25} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Trip Pie */}
          <div className="bg-eco-card border border-eco-card-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Trip Reduction</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={tripPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {tripPieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Legend verticalAlign="bottom" iconType="circle" formatter={(val) => <span style={{ color: "#d1d5db", fontSize: 12 }}>{val}</span>} />
                <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8, color: "#fff" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Continuous Learning Insights */}
      {insights.length > 0 && (
        <AIInsightCard title="Continuous Learning — AI Insights from This Run" confidence={metrics?.avgConfidence}>
          <div className="space-y-3">
            {insights.map((ins: any, i: number) => {
              const iconMap = { pattern: BookOpen, recommendation: Award, learning: Brain };
              const colorMap = { pattern: "text-blue-400 bg-blue-600/10 border-blue-500/20", recommendation: "text-amber-400 bg-amber-600/10 border-amber-500/20", learning: "text-emerald-400 bg-emerald-600/10 border-emerald-500/20" };
              const Icon = iconMap[ins.type as keyof typeof iconMap] || Lightbulb;
              const cls = colorMap[ins.type as keyof typeof colorMap] || "text-gray-400 bg-gray-600/10 border-gray-500/20";
              const impactBadge = ins.impact === "high" ? "bg-red-600/20 text-red-400" : ins.impact === "medium" ? "bg-yellow-600/20 text-yellow-400" : "bg-gray-600/20 text-gray-400";
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${cls}`}>
                  <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-xs font-semibold uppercase tracking-wide">{ins.type}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${impactBadge}`}>
                        {ins.impact} impact
                      </span>
                    </div>
                    <p className="text-sm text-gray-300">{ins.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </AIInsightCard>
      )}

      {/* Shipment Compatibility Heatmap */}
      <div className="bg-eco-card border border-eco-card-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-400" />
            Shipment Compatibility Matrix
          </h3>
          <button
            onClick={() => setShowHeatmap(h => !h)}
            className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-orange-500/30 transition-all"
          >
            {showHeatmap ? "Hide" : "Generate"} Heatmap
          </button>
        </div>
        {showHeatmap && compatMatrix.length > 0 && (
          <div className="overflow-x-auto">
            <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `40px repeat(${DEMO_SHIPMENTS.length}, 32px)` }}>
              <div />
              {DEMO_SHIPMENTS.map((s) => (
                <div key={s.id} className="text-[8px] text-gray-500 text-center truncate" title={s.id}>{s.id.slice(-3)}</div>
              ))}
              {compatMatrix.map((row, i) => (
                <Fragment key={i}>
                  <div className="text-[8px] text-gray-500 flex items-center justify-end pr-1" title={DEMO_SHIPMENTS[i].id}>{DEMO_SHIPMENTS[i].id.slice(-3)}</div>
                  {row.map((val, j) => {
                    const bg = i === j ? "bg-white/20" : val >= 70 ? "bg-emerald-600" : val >= 40 ? "bg-yellow-600" : val >= 15 ? "bg-orange-700" : "bg-red-900";
                    return (
                      <div
                        key={j}
                        className={`w-8 h-7 ${bg} rounded-sm flex items-center justify-center text-[8px] font-bold text-white cursor-default`}
                        style={{ opacity: i === j ? 0.3 : Math.max(0.3, val / 100) }}
                        title={`${DEMO_SHIPMENTS[i].id} ↔ ${DEMO_SHIPMENTS[j].id}: ${val}% compatible`}
                      >
                        {i !== j ? val : ""}
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-600 inline-block" /> High (&gt;70%)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-600 inline-block" /> Medium (40-70%)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-700 inline-block" /> Low (15-40%)</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-900 inline-block" /> Incompatible (&lt;15%)</span>
            </div>
          </div>
        )}
        {!showHeatmap && (
          <p className="text-xs text-gray-500">Click "Generate" to compute pairwise shipment compatibility based on geographic proximity and time window overlap.</p>
        )}
      </div>

      {/* Impact Summary */}
      {metrics && (
        <div className="bg-eco-card border border-eco-card-border rounded-xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">Consolidation Impact Summary</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
            <div>
              <div className="text-xs text-gray-400 mb-1">Naive Distance</div>
              <div className="text-lg font-bold text-gray-300">{metrics.naiveTotalDistanceKm} km</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Optimized Distance</div>
              <div className="text-lg font-bold text-emerald-400">{metrics.consolidatedDistanceKm} km</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Trips: Before</div>
              <div className="text-lg font-bold text-gray-300">{metrics.totalShipments}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Trips: After</div>
              <div className="text-lg font-bold text-emerald-400">{metrics.totalGroups}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Monthly Projection</div>
              <div className="text-lg font-bold text-cyan-400">₹{(metrics.fuelSavedINR * 30).toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Annual CO₂ Impact</div>
              <div className="text-lg font-bold text-green-400">{((metrics.carbonSavedKg * 365) / 1000).toFixed(1)} tons</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
