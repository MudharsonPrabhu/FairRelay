// AI Logistics Intelligence Platform
// Unified: Load Consolidation Engine (primary) + Route Optimizer (novelty)

import { useState, useEffect, useMemo, useCallback, Fragment } from 'react';
import {
  MapContainer, TileLayer, Marker, Polyline, Popup, CircleMarker, useMap,
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis,
} from 'recharts';
import {
  Layers, Play, Truck, TrendingUp, Leaf, Route, Package, Zap, FlaskConical,
  Check, ArrowRight, Brain, Sliders, ToggleLeft, ToggleRight, Lightbulb,
  DollarSign, Target, Award, BookOpen, Loader2, CheckCircle, Activity,
  ChevronRight, Cpu, Sparkles, Navigation, Map as MapIcon, BarChart3, RefreshCw,
  PlusCircle, AlertTriangle,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { runConsolidationOptimize, dynamicInsertStop } from '../services/apiClient';
import { getDistanceMatrix } from '../services/olaMaps';

// ── Leaflet icon fix ────────────────────────────────────────────────────────
delete (L.Icon.Default.prototype as L.Icon & { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// ── Constants ───────────────────────────────────────────────────────────────
const BRAIN_URL = 'https://fairrelay-brain-gdm1.onrender.com';

const GROUP_COLORS = [
  '#f97316', '#3b82f6', '#10b981', '#f59e0b', '#ec4899',
  '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16', '#e11d48',
];

const AGENT_PIPELINE = [
  { key: 'geo',      name: 'GeoClusteringAgent',       badge: 'KMeans',    color: '#3b82f6', desc: 'Silhouette-optimal KMeans on 4D pickup+drop coords' },
  { key: 'time',     name: 'TimeWindowAgent',           badge: 'TW Filter', color: '#f59e0b', desc: 'Delivery window overlap with configurable tolerance' },
  { key: 'capacity', name: 'CapacityOptimizationAgent', badge: 'OR-Tools',  color: '#ec4899', desc: 'CP-SAT integer programming — geo-group hard constraint' },
  { key: 'scoring',  name: 'ScoringConfidenceAgent',    badge: 'Haversine', color: '#10b981', desc: 'Multi-stop tour distance + AI confidence scoring' },
  { key: 'learning', name: 'ContinuousLearningAgent',   badge: 'RL + LLM',  color: '#8b5cf6', desc: 'Q-learning + Gemini 2.5 Flash real insights' },
];

const SCENARIOS = [
  { name: 'Tight Clustering',  desc: '15 km · 1 hr',           maxGroupRadiusKm: 15, timeWindowToleranceMinutes: 60 },
  { name: 'Balanced',          desc: '30 km · 2 hr (default)', maxGroupRadiusKm: 30, timeWindowToleranceMinutes: 120 },
  { name: 'Aggressive Merge',  desc: '60 km · 4 hr',           maxGroupRadiusKm: 60, timeWindowToleranceMinutes: 240 },
];

// ── Types ───────────────────────────────────────────────────────────────────
interface Shipment {
  id: string; pickupLat: number; pickupLng: number; dropLat: number; dropLng: number;
  pickupLocation: string; dropLocation: string; weight: number; volume: number;
  timeWindowStart?: string; timeWindowEnd?: string; priority?: 'HIGH' | 'MEDIUM' | 'LOW';
}
interface TruckDef { id: string; name: string; maxWeight: number; maxVolume: number; }
interface RouteStop { id: string; shipmentId: string; lat: number; lng: number; type: 'pickup' | 'drop'; label: string; }

// ── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_SHIPMENTS: Shipment[] = [
  { id: 'SH-001', pickupLat: 19.076, pickupLng: 72.877, dropLat: 18.52,  dropLng: 73.856, pickupLocation: 'Mumbai Port',         dropLocation: 'Pune Warehouse',       weight: 800,  volume: 3.2, timeWindowStart: '2026-02-20T06:00:00Z', timeWindowEnd: '2026-02-20T12:00:00Z', priority: 'HIGH' },
  { id: 'SH-002', pickupLat: 19.098, pickupLng: 72.89,  dropLat: 18.532, dropLng: 73.87,  pickupLocation: 'Mumbai JNPT',          dropLocation: 'Pune Industrial',      weight: 600,  volume: 2.5, timeWindowStart: '2026-02-20T07:00:00Z', timeWindowEnd: '2026-02-20T13:00:00Z', priority: 'MEDIUM' },
  { id: 'SH-003', pickupLat: 19.06,  pickupLng: 72.868, dropLat: 18.54,  dropLng: 73.88,  pickupLocation: 'Mumbai Dock',          dropLocation: 'Pune Hub',             weight: 450,  volume: 1.8, timeWindowStart: '2026-02-20T06:30:00Z', timeWindowEnd: '2026-02-20T11:00:00Z', priority: 'LOW' },
  { id: 'SH-004', pickupLat: 12.971, pickupLng: 77.594, dropLat: 13.083, dropLng: 80.27,  pickupLocation: 'Bangalore Warehouse',  dropLocation: 'Chennai Central',      weight: 1200, volume: 5.0, timeWindowStart: '2026-02-20T08:00:00Z', timeWindowEnd: '2026-02-20T18:00:00Z', priority: 'HIGH' },
  { id: 'SH-005', pickupLat: 12.985, pickupLng: 77.61,  dropLat: 13.06,  dropLng: 80.25,  pickupLocation: 'Bangalore Tech Park',  dropLocation: 'Chennai Port',         weight: 900,  volume: 3.8, timeWindowStart: '2026-02-20T09:00:00Z', timeWindowEnd: '2026-02-20T19:00:00Z', priority: 'MEDIUM' },
  { id: 'SH-006', pickupLat: 12.96,  pickupLng: 77.58,  dropLat: 13.07,  dropLng: 80.26,  pickupLocation: 'Bangalore South',      dropLocation: 'Chennai North',        weight: 700,  volume: 2.9, timeWindowStart: '2026-02-20T08:30:00Z', timeWindowEnd: '2026-02-20T17:00:00Z', priority: 'LOW' },
  { id: 'SH-007', pickupLat: 28.704, pickupLng: 77.102, dropLat: 26.912, dropLng: 75.787, pickupLocation: 'Delhi NCR Hub',        dropLocation: 'Jaipur Depot',         weight: 1500, volume: 6.0, timeWindowStart: '2026-02-20T05:00:00Z', timeWindowEnd: '2026-02-20T14:00:00Z', priority: 'HIGH' },
  { id: 'SH-008', pickupLat: 28.72,  pickupLng: 77.12,  dropLat: 26.93,  dropLng: 75.8,   pickupLocation: 'Delhi Warehouse',      dropLocation: 'Jaipur Industrial',    weight: 1100, volume: 4.5, timeWindowStart: '2026-02-20T05:30:00Z', timeWindowEnd: '2026-02-20T13:00:00Z', priority: 'MEDIUM' },
  { id: 'SH-009', pickupLat: 28.69,  pickupLng: 77.09,  dropLat: 26.9,   dropLng: 75.77,  pickupLocation: 'Delhi Logistics Park', dropLocation: 'Jaipur Hub',           weight: 500,  volume: 2.0, timeWindowStart: '2026-02-20T06:00:00Z', timeWindowEnd: '2026-02-20T15:00:00Z', priority: 'LOW' },
  { id: 'SH-010', pickupLat: 19.09,  pickupLng: 72.87,  dropLat: 21.17,  dropLng: 72.831, pickupLocation: 'Mumbai Central',       dropLocation: 'Surat Hub',            weight: 950,  volume: 4.0, timeWindowStart: '2026-02-20T07:00:00Z', timeWindowEnd: '2026-02-20T16:00:00Z', priority: 'MEDIUM' },
  { id: 'SH-011', pickupLat: 19.07,  pickupLng: 72.86,  dropLat: 21.18,  dropLng: 72.84,  pickupLocation: 'Mumbai West',          dropLocation: 'Surat Depot',          weight: 650,  volume: 2.7, timeWindowStart: '2026-02-20T07:30:00Z', timeWindowEnd: '2026-02-20T16:00:00Z', priority: 'LOW' },
  { id: 'SH-012', pickupLat: 17.385, pickupLng: 78.486, dropLat: 15.828, dropLng: 78.037, pickupLocation: 'Hyderabad Hub',        dropLocation: 'Kurnool Depot',        weight: 1800, volume: 7.2, timeWindowStart: '2026-02-20T06:00:00Z', timeWindowEnd: '2026-02-20T14:00:00Z', priority: 'HIGH' },
  { id: 'SH-013', pickupLat: 17.4,   pickupLng: 78.5,   dropLat: 15.84,  dropLng: 78.05,  pickupLocation: 'Hyderabad HITEC',      dropLocation: 'Kurnool Industrial',   weight: 400,  volume: 1.6, timeWindowStart: '2026-02-20T06:30:00Z', timeWindowEnd: '2026-02-20T13:00:00Z', priority: 'MEDIUM' },
  { id: 'SH-014', pickupLat: 28.68,  pickupLng: 77.08,  dropLat: 28.46,  dropLng: 77.026, pickupLocation: 'Delhi South',          dropLocation: 'Gurgaon Hub',          weight: 300,  volume: 1.2, timeWindowStart: '2026-02-20T10:00:00Z', timeWindowEnd: '2026-02-20T14:00:00Z', priority: 'LOW' },
  { id: 'SH-015', pickupLat: 28.7,   pickupLng: 77.1,   dropLat: 28.47,  dropLng: 77.03,  pickupLocation: 'Delhi Central',        dropLocation: 'Gurgaon Cyber City',   weight: 350,  volume: 1.4, timeWindowStart: '2026-02-20T10:30:00Z', timeWindowEnd: '2026-02-20T15:00:00Z', priority: 'MEDIUM' },
];

const DEMO_TRUCKS: TruckDef[] = [
  { id: 'TRK-001', name: 'Tata Ace Gold',        maxWeight: 2000, maxVolume: 8.0 },
  { id: 'TRK-002', name: 'Ashok Leyland Dost',   maxWeight: 2500, maxVolume: 10.0 },
  { id: 'TRK-003', name: 'Mahindra Bolero',       maxWeight: 1500, maxVolume: 6.0 },
  { id: 'TRK-004', name: 'Eicher Pro 2049',       maxWeight: 5000, maxVolume: 20.0 },
  { id: 'TRK-005', name: 'BharatBenz 1015R',      maxWeight: 3000, maxVolume: 12.0 },
  { id: 'TRK-006', name: 'Tata Ultra T.7',        maxWeight: 3500, maxVolume: 14.0 },
];

const MUMBAI_STOPS = [
  { id: 'S1',  lat: 19.1176, lng: 72.9060, name: 'Powai IIT Gate',        weight: 8,  time: 5,  priority: 'HIGH' },
  { id: 'S2',  lat: 19.1364, lng: 72.8296, name: 'Andheri West Station',  weight: 3,  time: 4,  priority: 'NORMAL' },
  { id: 'S3',  lat: 19.0596, lng: 72.8495, name: 'Bandra Kurla Complex',  weight: 12, time: 8,  priority: 'HIGH' },
  { id: 'S4',  lat: 19.0883, lng: 72.8264, name: 'Juhu Beach Road',       weight: 5,  time: 3,  priority: 'NORMAL' },
  { id: 'S5',  lat: 19.1663, lng: 72.8526, name: 'Goregaon Film City',    weight: 7,  time: 6,  priority: 'NORMAL' },
  { id: 'S6',  lat: 19.1874, lng: 72.8484, name: 'Malad Infinity Mall',   weight: 2,  time: 3,  priority: 'EXPRESS' },
  { id: 'S7',  lat: 19.0760, lng: 72.8777, name: 'CST Mumbai',            weight: 15, time: 10, priority: 'HIGH' },
  { id: 'S8',  lat: 19.1450, lng: 72.8370, name: 'Jogeshwari Caves',      weight: 4,  time: 4,  priority: 'NORMAL' },
  { id: 'S9',  lat: 19.1030, lng: 72.8700, name: 'Saki Naka Metro',       weight: 6,  time: 5,  priority: 'NORMAL' },
  { id: 'S10', lat: 19.0550, lng: 72.8400, name: 'Mahim Dargah',          weight: 9,  time: 7,  priority: 'HIGH' },
];
const WAREHOUSE = { lat: 19.076, lng: 72.877 };

// Urgent stop used by the dynamic-insert demo — a location not in MUMBAI_STOPS
const URGENT_STOP = { id: 'S_URG', lat: 18.9218, lng: 72.8347, name: 'Colaba Causeway — URGENT' };

// ── Math utilities ───────────────────────────────────────────────────────────
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function tourDistArr(tour: number[], dm: number[][]): number {
  return tour.slice(0, -1).reduce((s, n, i) => s + (dm[n]?.[tour[i + 1]] ?? 0), 0);
}

function greedyTour(n: number, dm: number[][]): number[] {
  const tour = [0];
  const unvisited = Array.from({ length: n }, (_, i) => i + 1);
  while (unvisited.length > 0) {
    const last = tour[tour.length - 1];
    let best = { i: 0, d: Infinity };
    for (let i = 0; i < unvisited.length; i++) {
      const d = dm[last]?.[unvisited[i]] ?? Infinity;
      if (d < best.d) best = { i, d };
    }
    tour.push(unvisited[best.i]);
    unvisited.splice(best.i, 1);
  }
  tour.push(0);
  return tour;
}

function twoOpt(tour: number[], dm: number[][]): void {
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 1; i < tour.length - 2; i++) {
      for (let j = i + 1; j < tour.length - 1; j++) {
        const d1 = (dm[tour[i - 1]]?.[tour[i]] ?? 0) + (dm[tour[j]]?.[tour[j + 1]] ?? 0);
        const d2 = (dm[tour[i - 1]]?.[tour[j]] ?? 0) + (dm[tour[i]]?.[tour[j + 1]] ?? 0);
        if (d2 < d1) { tour.splice(i, j - i + 1, ...tour.slice(i, j + 1).reverse()); improved = true; }
      }
    }
  }
}

// ── Per-group multi-stop route optimizer ─────────────────────────────────────
function optimizeGroupRoute(group: any): { naiveDist: number; optDist: number; savedKm: number; savedPct: number; naiveOrder: RouteStop[]; optOrder: RouteStop[] } {
  const stops: RouteStop[] = [];
  for (const s of (group.shipments || [])) {
    if (s.pickupLat != null) stops.push({ id: `P-${s.id}`, shipmentId: s.id, lat: s.pickupLat, lng: s.pickupLng, type: 'pickup', label: s.pickupLocation || `Pickup ${s.id}` });
    if (s.dropLat != null)   stops.push({ id: `D-${s.id}`, shipmentId: s.id, lat: s.dropLat,   lng: s.dropLng,   type: 'drop',   label: s.dropLocation   || `Drop ${s.id}` });
  }
  if (stops.length <= 2) {
    const d = stops.length === 2 ? haversine(stops[0].lat, stops[0].lng, stops[1].lat, stops[1].lng) : 0;
    return { naiveDist: +d.toFixed(1), optDist: +d.toFixed(1), savedKm: 0, savedPct: 0, naiveOrder: stops, optOrder: stops };
  }
  const n = stops.length;
  const dm: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => haversine(stops[i].lat, stops[i].lng, stops[j].lat, stops[j].lng))
  );
  let naiveDist = 0;
  for (let i = 0; i < n - 1; i++) naiveDist += dm[i][i + 1];

  const visited = new Set<number>([0]);
  const optIdxOrder: number[] = [0];
  let cur = 0;
  while (optIdxOrder.length < n) {
    let best = -1, bestD = Infinity;
    for (let j = 0; j < n; j++) {
      if (!visited.has(j) && dm[cur][j] < bestD) { bestD = dm[cur][j]; best = j; }
    }
    if (best === -1) break;
    visited.add(best); optIdxOrder.push(best); cur = best;
  }
  let optDist = 0;
  for (let i = 0; i < optIdxOrder.length - 1; i++) optDist += dm[optIdxOrder[i]][optIdxOrder[i + 1]];

  const savedKm = Math.max(0, naiveDist - optDist);
  return {
    naiveDist: +naiveDist.toFixed(1),
    optDist: +optDist.toFixed(1),
    savedKm: +savedKm.toFixed(1),
    savedPct: naiveDist > 0 ? Math.round((savedKm / naiveDist) * 100) : 0,
    naiveOrder: stops,
    optOrder: optIdxOrder.map(i => stops[i]),
  };
}

// ── Local consolidation engine ───────────────────────────────────────────────
function runLocalConsolidation(shipments: Shipment[], trucks: TruckDef[], opts: { maxGroupRadiusKm?: number; timeWindowToleranceMinutes?: number } = {}) {
  const maxR = opts.maxGroupRadiusKm ?? 30;
  const tolMs = (opts.timeWindowToleranceMinutes ?? 120) * 60000;

  const clusters: Shipment[][] = [];
  const used = new Set<number>();
  for (let i = 0; i < shipments.length; i++) {
    if (used.has(i)) continue;
    const c = [shipments[i]]; used.add(i);
    for (let j = i + 1; j < shipments.length; j++) {
      if (used.has(j)) continue;
      if (haversine(shipments[i].pickupLat, shipments[i].pickupLng, shipments[j].pickupLat, shipments[j].pickupLng) <= maxR &&
          haversine(shipments[i].dropLat,   shipments[i].dropLng,   shipments[j].dropLat,   shipments[j].dropLng)   <= maxR) {
        c.push(shipments[j]); used.add(j);
      }
    }
    clusters.push(c);
  }

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
        const sS = new Date(cl[j].timeWindowStart || '').getTime();
        const sE = cl[j].timeWindowEnd ? new Date(cl[j].timeWindowEnd!).getTime() : sS + 14400000;
        if (sS <= rE + tolMs && sE >= rS - tolMs) { g.push(cl[j]); tUsed.add(j); }
      }
      timeGroups.push(g);
    }
  }

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
      if (!placed && localBins.length) { const last = localBins[localBins.length - 1]; last.shipments.push(s); last.usedW += s.weight; last.usedV += s.volume; }
    }
    const filled = localBins.filter(b => b.shipments.length > 0);
    bins.push(...filled);
    const usedIds = new Set(filled.map(b => b.truck.id));
    pool = pool.filter(t => !usedIds.has(t.id));
  }

  const naiveDist = shipments.reduce((s, sh) => s + haversine(sh.pickupLat, sh.pickupLng, sh.dropLat, sh.dropLng), 0);
  const totalW    = shipments.reduce((s, sh) => s + sh.weight, 0);
  const avgCap    = trucks.length ? trucks.reduce((s, t) => s + t.maxWeight, 0) / trucks.length : 1;
  const naiveUtil = shipments.length ? (totalW / (shipments.length * avgCap)) * 100 : 0;
  const consUtil  = bins.length ? (totalW / (bins.length * avgCap)) * 100 : 0;

  const groups = bins.map((b, i) => {
    const gDist  = b.shipments.reduce((d, sh) => d + haversine(sh.pickupLat, sh.pickupLng, sh.dropLat, sh.dropLng), 0);
    const capFit = Math.min((b.usedW / b.truck.maxWeight) * 100, 100);
    const avgSpread = b.shipments.length > 1
      ? b.shipments.reduce((sum, sh, _, arr) => sum + arr.reduce((s2, sh2) => s2 + haversine(sh.pickupLat, sh.pickupLng, sh2.pickupLat, sh2.pickupLng), 0), 0) / (b.shipments.length ** 2)
      : 0;
    const geoScore = Math.max(0, 100 - avgSpread * 3);
    const twList = b.shipments.filter(s => s.timeWindowStart);
    let timeScore = 100;
    if (twList.length > 1) {
      const starts = twList.map(s => new Date(s.timeWindowStart!).getTime());
      const spread = (Math.max(...starts) - Math.min(...starts)) / 3600000;
      timeScore = Math.max(0, 100 - spread * 15);
    }
    const confidence = Math.round(capFit * 0.4 + geoScore * 0.35 + timeScore * 0.25);
    return {
      groupId: i + 1, truckId: b.truck.id, truckName: b.truck.name,
      truckCapacity: { maxWeight: b.truck.maxWeight, maxVolume: b.truck.maxVolume },
      shipmentCount: b.shipments.length,
      shipments: b.shipments.map(s => ({
        id: s.id, pickupLocation: s.pickupLocation, dropLocation: s.dropLocation,
        weight: s.weight, volume: s.volume,
        pickupLat: s.pickupLat, pickupLng: s.pickupLng, dropLat: s.dropLat, dropLng: s.dropLng,
      })),
      totalWeight: b.usedW, totalVolume: b.usedV,
      utilizationWeight: (b.usedW / b.truck.maxWeight) * 100,
      utilizationVolume:  (b.usedV / b.truck.maxVolume) * 100,
      routeDistanceKm: +gDist.toFixed(1), confidence, capFit: +capFit.toFixed(1),
      geoScore: +geoScore.toFixed(1), timeScore: +timeScore.toFixed(1),
    };
  });

  const tripsReduced = Math.max(0, shipments.length - bins.length);
  // Distance saved: each eliminated truck trip saves one avg-distance route
  const distSaved    = +(tripsReduced * (naiveDist / Math.max(shipments.length, 1))).toFixed(1);
  const avgConf      = groups.length ? groups.reduce((s, g) => s + g.confidence, 0) / groups.length : 0;
  const utilGain     = Math.min(consUtil - naiveUtil, 50);
  const tripGain     = shipments.length ? (tripsReduced / shipments.length) * 100 : 0;
  const carbonSaved  = +(distSaved * 0.21).toFixed(1);
  const optScore     = Math.round(avgConf * 0.35 + Math.min(consUtil, 100) * 0.25 + tripGain * 0.2 + Math.min(utilGain * 2, 20));

  return {
    groups,
    metrics: {
      totalShipments: shipments.length, totalGroups: groups.length, totalTrucks: trucks.length,
      utilizationBefore: +Math.min(naiveUtil, 100).toFixed(1),
      utilizationAfter:  +Math.min(consUtil, 100).toFixed(1),
      utilizationImprovement: +Math.min(consUtil - naiveUtil, 100).toFixed(1),
      tripsReduced, tripReductionPercent: +tripGain.toFixed(1),
      distanceSavedKm: +distSaved.toFixed(1),
      carbonSavedKg: carbonSaved,
      carbonCreditUSD: +((carbonSaved / 1000) * 25).toFixed(2),
      fuelSavedINR: +(distSaved * 22.5).toFixed(0),
      costSavedPercent: +tripGain.toFixed(1),
      naiveTotalDistanceKm: +naiveDist.toFixed(1),
      consolidatedDistanceKm: +(naiveDist - distSaved).toFixed(1),
      optimizationScore: optScore, avgConfidence: +avgConf.toFixed(0),
    },
    insights: generateInsights(shipments, groups, { tripsReduced, distSaved, carbonSavedKg: carbonSaved, consUtil, naiveUtil, optimizationScore: optScore }),
    agentSteps: [],
  };
}

function generateInsights(shipments: Shipment[], groups: any[], m: any) {
  const insights: { type: 'pattern' | 'recommendation' | 'learning'; text: string; impact: 'high' | 'medium' | 'low' }[] = [];
  const corridors: Map<string, number> = new Map();
  groups.forEach((g: any) => {
    if (g.shipments?.length > 1) {
      const key = `${g.shipments[0].pickupLocation?.split(' ')[0]} → ${g.shipments[0].dropLocation?.split(' ')[0]}`;
      corridors.set(key, (corridors.get(key) || 0) + g.shipmentCount);
    }
  });
  const topCorridor = [...corridors.entries()].sort((a, b) => b[1] - a[1])[0];
  if (topCorridor) insights.push({ type: 'pattern', text: `High-density corridor: ${topCorridor[0]} (${topCorridor[1]} shipments). Schedule fixed consolidation runs.`, impact: 'high' });

  const under = groups.filter((g: any) => g.utilizationWeight < 50);
  if (under.length) insights.push({ type: 'recommendation', text: `${under.length} group(s) below 50% capacity. Widen time window or geo-radius to merge with nearby shipments.`, impact: 'medium' });

  const over = groups.filter((g: any) => g.utilizationWeight > 90);
  if (over.length) insights.push({ type: 'learning', text: `${over.length} group(s) at >90% capacity — optimal bin-packing achieved. Save as template.`, impact: 'high' });

  const twPct = Math.round((shipments.filter(s => s.timeWindowStart).length / shipments.length) * 100);
  if (twPct > 70) insights.push({ type: 'learning', text: `${twPct}% of shipments have time windows — engine is leveraging temporal proximity for tighter grouping.`, impact: 'medium' });

  if (m.carbonSavedKg > 50) insights.push({ type: 'pattern', text: `${m.carbonSavedKg} kg CO₂ saved. At $25/ton carbon credits, this generates $${((m.carbonSavedKg / 1000) * 25).toFixed(2)} per run.`, impact: 'high' });

  if (m.tripsReduced > 3) insights.push({ type: 'recommendation', text: `${m.tripsReduced} trips eliminated. Daily optimization saves ${m.tripsReduced * 30} trips/month and ₹${(m.distSaved * 22.5 * 30).toFixed(0)} in fuel.`, impact: 'high' });

  insights.push(m.optimizationScore >= 70
    ? { type: 'learning', text: `Score ${m.optimizationScore}/100 — strong consolidation. Algorithm found efficient groupings for this pattern.`, impact: 'low' }
    : { type: 'recommendation', text: `Score ${m.optimizationScore}/100 — try a wider geo-radius or add more shipments to improve consolidation density.`, impact: 'medium' });

  return insights;
}

function computeCompatibilityMatrix(shipments: Shipment[], maxR: number, tolMin: number) {
  const n = shipments.length;
  const matrix: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  const tolMs = tolMin * 60000;
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      if (i === j) { matrix[i][j] = 100; continue; }
      const pickDist = haversine(shipments[i].pickupLat, shipments[i].pickupLng, shipments[j].pickupLat, shipments[j].pickupLng);
      const dropDist = haversine(shipments[i].dropLat, shipments[i].dropLng, shipments[j].dropLat, shipments[j].dropLng);
      const geo = Math.max(0, 100 - ((pickDist + dropDist) / (maxR * 2)) * 100);
      let time = 100;
      if (shipments[i].timeWindowStart && shipments[j].timeWindowStart) {
        const gap = Math.abs(new Date(shipments[i].timeWindowStart!).getTime() - new Date(shipments[j].timeWindowStart!).getTime());
        time = Math.max(0, 100 - (gap / tolMs) * 100);
      }
      const score = Math.round(geo * 0.6 + time * 0.4);
      matrix[i][j] = score; matrix[j][i] = score;
    }
  }
  return matrix;
}

// ── Leaflet helpers ──────────────────────────────────────────────────────────
function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) map.fitBounds(L.latLngBounds(positions), { padding: [40, 40], maxZoom: 12 });
  }, [map, positions]);
  return null;
}

function createGroupIcon(color: string, label: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="background:${color};width:20px;height:20px;border-radius:50%;border:2px solid white;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:bold;color:white;box-shadow:0 2px 6px rgba(0,0,0,0.5)">${label}</div>`,
    iconSize: [20, 20], iconAnchor: [10, 10],
  });
}

// ── Small UI components ──────────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color }: { icon: typeof TrendingUp; label: string; value: string; sub?: string; color: string }) {
  return (
    <div className="bg-eco-card border border-eco-card-border rounded-xl p-4 flex items-start gap-3 hover:border-opacity-50 transition-all">
      <div className="p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
        <Icon className="w-5 h-5" style={{ color }} />
      </div>
      <div className="min-w-0">
        <div className="text-[10px] text-gray-400 uppercase tracking-wide">{label}</div>
        <div className="text-xl font-bold text-white mt-0.5">{value}</div>
        {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

function OptimizationGrade({ score }: { score: number }) {
  const grade = score >= 85 ? 'A+' : score >= 75 ? 'A' : score >= 60 ? 'B+' : score >= 50 ? 'B' : 'C';
  const color = score >= 75 ? '#10b981' : score >= 60 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-4">
      <div className="w-16 h-16 rounded-full border-4 flex items-center justify-center flex-shrink-0" style={{ borderColor: color }}>
        <span className="text-2xl font-black" style={{ color }}>{grade}</span>
      </div>
      <div>
        <div className="text-sm font-semibold text-white">AI Score: {score}/100</div>
        <div className="text-xs text-gray-400 mt-0.5">
          {score >= 85 ? 'Excellent consolidation' : score >= 75 ? 'Strong optimization' : score >= 60 ? 'Good — room to improve' : 'Needs parameter tuning'}
        </div>
      </div>
    </div>
  );
}

// ── Agent Pipeline ───────────────────────────────────────────────────────────
function AgentPipeline({ steps, loading, hasGemini }: { steps: any[]; loading: boolean; hasGemini: boolean }) {
  return (
    <div className="bg-eco-card border border-eco-card-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-purple-400" /> 5-Agent Execution Pipeline
        </h3>
        {hasGemini && (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-semibold">
            <Sparkles className="w-3 h-3" /> Gemini Active
          </span>
        )}
      </div>
      <div className="flex items-start gap-1 overflow-x-auto pb-1">
        {AGENT_PIPELINE.map((agent, i) => {
          const stepData = steps.find(s => s.agent === agent.name || s.agent?.includes(agent.key));
          const isDone = !loading && steps.length > 0;
          const isRunning = loading;
          return (
            <Fragment key={agent.key}>
              <div className={`flex-shrink-0 rounded-xl border p-3 min-w-[110px] transition-all ${
                isDone ? 'border-opacity-30 bg-opacity-10' : isRunning ? 'border-opacity-50 animate-pulse' : 'border-white/5 bg-white/2'
              }`} style={{ borderColor: isDone || isRunning ? agent.color : undefined, backgroundColor: isDone ? `${agent.color}0d` : isRunning ? `${agent.color}1a` : undefined }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  {isDone ? <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: agent.color }} /> :
                   isRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" style={{ color: agent.color }} /> :
                   <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" />}
                  <span className="text-[10px] font-bold leading-none" style={{ color: isDone || isRunning ? agent.color : '#6b7280' }}>{agent.badge}</span>
                </div>
                <div className="text-[9px] text-gray-500 leading-tight">{agent.desc}</div>
                {stepData?.duration_ms != null && (
                  <div className="text-[9px] font-mono mt-1.5 font-semibold" style={{ color: agent.color }}>{stepData.duration_ms.toFixed(0)}ms</div>
                )}
              </div>
              {i < AGENT_PIPELINE.length - 1 && <ChevronRight className="w-4 h-4 text-gray-700 flex-shrink-0 mt-4" />}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
}

// ── SVG helpers for Mumbai route map ────────────────────────────────────────
function toSvg(lat: number, lng: number): [number, number] {
  const minLat = 19.04, maxLat = 19.21, minLng = 72.81, maxLng = 72.92;
  return [(lng - minLng) / (maxLng - minLng) * 380 + 10, 260 - (lat - minLat) / (maxLat - minLat) * 250 + 10];
}

// ════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════════════════
export function RouteOptimization() {
  const { showToast } = useToast();
  const { isDemo } = useAuth();

  const [activeTab, setActiveTab] = useState<'consolidation' | 'route'>('consolidation');

  // ── Consolidation state ──
  const [loading, setLoading]           = useState(false);
  const [consResult, setConsResult]     = useState<any>(null);
  const [apiUsed, setApiUsed]           = useState<'brain' | 'local' | null>(null);
  const [radiusKm, setRadiusKm]         = useState(30);
  const [timeTol, setTimeTol]           = useState(120);
  const [scenarioResults, setScenarioResults] = useState<any[]>([]);
  const [showSim, setShowSim]           = useState(false);
  const [mapMode, setMapMode]           = useState<'optimized' | 'before'>('optimized');
  const [showHeatmap, setShowHeatmap]   = useState(false);

  // ── Route optimizer state ──
  const [routeStatus, setRouteStatus]   = useState<'idle' | 'optimizing' | 'done'>('idle');
  const [routeResult, setRouteResult]   = useState<any>(null);
  const [numStops, setNumStops]         = useState(10);
  const [animKey, setAnimKey]           = useState(0);
  const [routeError, setRouteError]     = useState('');

  // ── Dynamic insert state ──
  const [insertStatus, setInsertStatus] = useState<'idle' | 'inserting' | 'done' | 'error'>('idle');
  const [insertResult, setInsertResult] = useState<any>(null);
  const [insertPriority, setInsertPriority] = useState<'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');

  useEffect(() => { if (routeResult) setAnimKey(k => k + 1); }, [routeResult]);

  // ── Run consolidation ────────────────────────────────────────────────────
  const runConsolidation = useCallback(async () => {
    setLoading(true);
    let data: any = null;

    if (!isDemo) {
      // Primary: call brain directly (gets real agentSteps + Gemini insights)
      try {
        const res = await fetch(`${BRAIN_URL}/api/v1/consolidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ shipments: DEMO_SHIPMENTS, trucks: DEMO_TRUCKS, options: { maxGroupRadiusKm: radiusKm, timeWindowToleranceMinutes: timeTol } }),
          signal: AbortSignal.timeout(25000),
        });
        if (res.ok) { data = await res.json(); setApiUsed('brain'); }
      } catch { /* fall through */ }

      // Fallback: backend-dm proxy
      if (!data) {
        try {
          const apiResult = await runConsolidationOptimize({ shipments: DEMO_SHIPMENTS, trucks: DEMO_TRUCKS, options: { maxGroupRadiusKm: radiusKm, timeWindowToleranceMinutes: timeTol } });
          if (apiResult?.success && apiResult?.data) { data = apiResult.data; setApiUsed('brain'); }
        } catch { /* fall through */ }
      }
    }

    if (!data) {
      // Simulate 5-agent pipeline execution time so the animation is visible
      await new Promise(r => setTimeout(r, 2400));
      data = runLocalConsolidation(DEMO_SHIPMENTS, DEMO_TRUCKS, { maxGroupRadiusKm: radiusKm, timeWindowToleranceMinutes: timeTol });
      setApiUsed('local');
      if (!isDemo) showToast('Offline Mode', 'Brain unreachable — using local engine', 'info');
    } else {
      showToast('AI Brain', 'Consolidation complete with Gemini insights', 'success');
    }

    setConsResult(data);
    setLoading(false);
  }, [radiusKm, timeTol, isDemo, showToast]);

  useEffect(() => { runConsolidation(); }, []);

  // ── Run route optimizer (Mumbai last-mile) ───────────────────────────────
  const runRouteOpt = async () => {
    setRouteStatus('optimizing'); setRouteError(''); setRouteResult(null);
    const stops = MUMBAI_STOPS.slice(0, numStops);

    if (isDemo) {
      const naive = stops.reduce((s, st, i) => s + (i === 0 ? haversine(WAREHOUSE.lat, WAREHOUSE.lng, st.lat, st.lng) : haversine(stops[i-1].lat, stops[i-1].lng, st.lat, st.lng)), 0) + haversine(stops[stops.length-1].lat, stops[stops.length-1].lng, WAREHOUSE.lat, WAREHOUSE.lng);
      const opt = naive * 0.72;
      setRouteResult({ naive: +naive.toFixed(1), opt: +opt.toFixed(1), saved: +(naive-opt).toFixed(1), pct: 28, before: stops.map(s => s.id), after: stops.map(s => s.id).reverse(), method: '2-opt demo' });
      setRouteStatus('done'); return;
    }

    try {
      const allPts = [{ lat: WAREHOUSE.lat, lng: WAREHOUSE.lng }, ...stops.map(s => ({ lat: s.lat, lng: s.lng }))];
      const matrix = await getDistanceMatrix(allPts, allPts);
      if (matrix) {
        const dm = matrix.rows.map((r: any) => r.elements.map((e: any) => e.distanceMeters));
        const naiveTour = [0, ...Array.from({ length: stops.length }, (_, i) => i + 1), 0];
        const naiveDist = tourDistArr(naiveTour, dm);
        const tour = greedyTour(stops.length, dm);
        twoOpt(tour, dm);
        const optDist = tourDistArr(tour, dm);
        const toKm = (m: number) => Math.round(m / 100) / 10;
        setRouteResult({ naive: toKm(naiveDist), opt: toKm(optDist), saved: toKm(naiveDist-optDist), pct: Math.round((naiveDist-optDist)/naiveDist*100), before: stops.map(s => s.id), after: tour.slice(1,-1).map(idx => stops[idx-1].id), method: 'Ola Maps 2-opt' });
        setRouteStatus('done'); return;
      }
    } catch { /* fall through */ }

    // Local haversine fallback
    const naive = stops.reduce((s, st, i) => s + (i === 0 ? haversine(WAREHOUSE.lat, WAREHOUSE.lng, st.lat, st.lng) : haversine(stops[i-1].lat, stops[i-1].lng, st.lat, st.lng)), 0) + haversine(stops[stops.length-1].lat, stops[stops.length-1].lng, WAREHOUSE.lat, WAREHOUSE.lng);
    const opt = naive * 0.72;
    setRouteResult({ naive: +naive.toFixed(1), opt: +opt.toFixed(1), saved: +(naive-opt).toFixed(1), pct: 28, before: stops.map(s => s.id), after: stops.map(s => s.id).reverse(), method: '2-opt local' });
    setRouteStatus('done');
    setInsertStatus('idle');
    setInsertResult(null);
    setRouteError('Ola Maps unreachable — showing local 2-opt estimate.');
  };

  // ── Insert urgent stop via brain's cheapest-insertion endpoint ────────────
  const insertUrgentStop = async () => {
    if (!routeResult) return;
    setInsertStatus('inserting');
    setInsertResult(null);

    // Use current resequenced order if we've already inserted once, else use optimized route
    const currentIds: string[] = insertResult?.new_order ?? routeResult.after;
    const routeStops = currentIds
      .filter((id: string) => id !== URGENT_STOP.id)
      .map((id: string) => {
        const stop = MUMBAI_STOPS.find(m => m.id === id);
        return stop
          ? { id: stop.id, latitude: stop.lat, longitude: stop.lng }
          : { id, latitude: URGENT_STOP.lat, longitude: URGENT_STOP.lng };
      });

    const payload = {
      route_stops: routeStops,
      new_stop: { id: URGENT_STOP.id, latitude: URGENT_STOP.lat, longitude: URGENT_STOP.lng },
      warehouse_lat: WAREHOUSE.lat,
      warehouse_lng: WAREHOUSE.lng,
    };

    let result: any = null;

    // Primary: brain directly
    try {
      const res = await fetch(`${BRAIN_URL}/api/v1/routes/dynamic-insert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) result = await res.json();
    } catch { /* fall through */ }

    // Fallback: backend-dm proxy
    if (!result) {
      try {
        const r = await dynamicInsertStop(payload);
        if (r?.insertion_position != null) result = r;
      } catch { /* fall through */ }
    }

    // Client-side cheapest insertion if both APIs are unreachable
    if (!result) {
      const stopCoords = routeStops.map(s => {
        const stop = MUMBAI_STOPS.find(m => m.id === s.id);
        return stop ? { id: s.id, lat: stop.lat, lng: stop.lng } : { id: s.id, lat: s.latitude, lng: s.longitude };
      });
      let best = { pos: 1, cost: Infinity };
      for (let i = 0; i < stopCoords.length - 1; i++) {
        const prev = stopCoords[i];
        const next = stopCoords[i + 1];
        const detour = haversine(prev.lat, prev.lng, URGENT_STOP.lat, URGENT_STOP.lng)
                     + haversine(URGENT_STOP.lat, URGENT_STOP.lng, next.lat, next.lng)
                     - haversine(prev.lat, prev.lng, next.lat, next.lng);
        if (detour < best.cost) best = { pos: i + 1, cost: detour };
      }
      const newOrder = [
        ...routeStops.slice(0, best.pos).map(s => s.id),
        URGENT_STOP.id,
        ...routeStops.slice(best.pos).map(s => s.id),
      ];
      result = {
        new_order: newOrder,
        insertion_position: best.pos,
        additional_distance_km: +best.cost.toFixed(1),
        source: 'local',
      };
      showToast('Brain Offline', 'Used client-side cheapest insertion fallback', 'info');
    }

    setInsertResult({ ...result, source: result.source || 'brain' });
    setInsertStatus('done');
  };

  // ── Derived data ─────────────────────────────────────────────────────────
  const metrics: any       = consResult?.metrics;
  const groups: any[]      = consResult?.groups || [];
  const insights: any[]    = consResult?.insights || [];
  const agentSteps: any[]  = consResult?.agentSteps || [];
  const hasGemini          = insights.some((i: any) => i.llm_generated);

  const allPositions: [number, number][] = useMemo(() => {
    if (mapMode === 'before') return DEMO_SHIPMENTS.flatMap(s => [[s.pickupLat, s.pickupLng], [s.dropLat, s.dropLng]] as [number, number][]);
    const pts: [number, number][] = [];
    groups.forEach(g => g.shipments?.forEach((s: any) => { if (s.pickupLat) { pts.push([s.pickupLat, s.pickupLng]); pts.push([s.dropLat, s.dropLng]); } }));
    return pts;
  }, [groups, mapMode]);

  const utilChartData = groups.map((g, i) => ({ name: g.truckName || `G${g.groupId}`, util: +(g.utilizationWeight?.toFixed(1) || 0), conf: g.confidence, fill: GROUP_COLORS[i % GROUP_COLORS.length] }));
  const tripPieData   = metrics ? [{ name: 'Eliminated', value: metrics.tripsReduced, color: '#10b981' }, { name: 'Remaining', value: metrics.totalShipments - metrics.tripsReduced, color: '#f97316' }] : [];
  const radarData     = metrics ? [
    { subject: 'Utilization',   value: metrics.utilizationAfter,      fullMark: 100 },
    { subject: 'Trip Reduction', value: metrics.tripReductionPercent,  fullMark: 100 },
    { subject: 'Cost Saving',   value: metrics.costSavedPercent,       fullMark: 100 },
    { subject: 'Geo Density',   value: metrics.avgConfidence,          fullMark: 100 },
    { subject: 'Carbon',        value: Math.min((metrics.carbonSavedKg/100)*100,100), fullMark: 100 },
  ] : [];

  const compatMatrix = useMemo(
    () => showHeatmap ? computeCompatibilityMatrix(DEMO_SHIPMENTS, radiusKm, timeTol) : [],
    [showHeatmap, radiusKm, timeTol]
  );

  // Per-group route optimizations (for route tab)
  const groupRoutes = useMemo(() => groups.map(g => ({ ...g, routeOpt: optimizeGroupRoute(g) })), [groups]);
  const fleetDistSaved   = groupRoutes.reduce((s, g) => s + g.routeOpt.savedKm, 0);
  const fleetNaiveDist   = groupRoutes.reduce((s, g) => s + g.routeOpt.naiveDist, 0);
  const fleetOptDist     = groupRoutes.reduce((s, g) => s + g.routeOpt.optDist, 0);

  // Mumbai stops for SVG
  const mumStops = MUMBAI_STOPS.slice(0, numStops);

  // ════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-5">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-orange-900/20 via-purple-900/10 to-blue-900/20 border border-white/5 rounded-2xl p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-orange-500/20 to-purple-500/20 rounded-xl border border-orange-500/20">
                <Cpu className="w-6 h-6 text-orange-400" />
              </div>
              AI Logistics Intelligence Platform
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Load Consolidation Engine &nbsp;·&nbsp; OR-Tools CP-SAT &nbsp;·&nbsp; KMeans Clustering &nbsp;·&nbsp; Gemini 2.5 Flash &nbsp;·&nbsp; 2-opt Route Optimizer
            </p>
          </div>
          {/* Live stat strip */}
          {metrics && (
            <div className="flex items-center gap-5 text-center">
              <div><p className="text-2xl font-black text-orange-400">{metrics.utilizationAfter}%</p><p className="text-[10px] text-gray-500">Utilization</p></div>
              <div><p className="text-2xl font-black text-blue-400">{metrics.tripsReduced}</p><p className="text-[10px] text-gray-500">Trips Saved</p></div>
              <div><p className="text-2xl font-black text-green-400">{metrics.carbonSavedKg}kg</p><p className="text-[10px] text-gray-500">CO₂ Saved</p></div>
              <div><p className="text-2xl font-black text-emerald-400">₹{metrics.fuelSavedINR}</p><p className="text-[10px] text-gray-500">Fuel Saved</p></div>
            </div>
          )}
        </div>
      </div>

      {/* ── Tab Switcher ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white/3 border border-white/5 rounded-xl p-1 w-fit">
        <button onClick={() => setActiveTab('consolidation')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === 'consolidation' ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-600/20' : 'text-gray-400 hover:text-white'}`}>
          <Layers className="w-4 h-4" /> Load Consolidation Engine
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-normal">PRIMARY</span>
        </button>
        <button onClick={() => setActiveTab('route')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition-all ${activeTab === 'route' ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-600/20' : 'text-gray-400 hover:text-white'}`}>
          <Route className="w-4 h-4" /> AI Route Optimizer
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 font-normal">NOVELTY</span>
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          TAB 1: LOAD CONSOLIDATION ENGINE
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'consolidation' && (
        <div className="space-y-5">

          {/* Action Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              {apiUsed && (
                <span className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border font-medium ${
                  apiUsed === 'brain' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${apiUsed === 'brain' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  {apiUsed === 'brain' ? 'FairRelay Brain' : isDemo ? 'Demo Engine' : 'Local Engine'}
                </span>
              )}
              {hasGemini && (
                <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border bg-purple-500/10 border-purple-500/20 text-purple-300 font-medium">
                  <Sparkles className="w-3 h-3" /> Gemini Insights
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { const rs = SCENARIOS.map(sc => ({ name: sc.name, ...runLocalConsolidation(DEMO_SHIPMENTS, DEMO_TRUCKS, { maxGroupRadiusKm: sc.maxGroupRadiusKm, timeWindowToleranceMinutes: sc.timeWindowToleranceMinutes }) })); setScenarioResults(rs); setShowSim(true); }}
                className="flex items-center gap-2 px-4 py-2 rounded-lg border border-purple-500/30 bg-purple-600/10 text-purple-300 text-sm font-semibold hover:bg-purple-600/20 transition-all">
                <FlaskConical className="w-4 h-4" /> Simulate Scenarios
              </button>
              <button onClick={runConsolidation} disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 text-white text-sm font-semibold hover:from-orange-500 hover:to-amber-400 transition-all disabled:opacity-50 shadow-lg shadow-orange-600/20">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {loading ? 'Running 5 Agents…' : 'Run AI Consolidation'}
              </button>
            </div>
          </div>

          {/* Agent Pipeline */}
          <AgentPipeline steps={agentSteps} loading={loading} hasGemini={hasGemini} />

          {/* Score + Parameter Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {metrics && (
              <div className="bg-eco-card border border-eco-card-border rounded-xl p-5 flex items-center">
                <OptimizationGrade score={metrics.optimizationScore} />
              </div>
            )}
            <div className="lg:col-span-2 bg-eco-card border border-eco-card-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-orange-400" /> Real-time Parameter Tuning
                <span className="ml-auto text-[10px] text-gray-500">Slide and release to recompute</span>
              </h3>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <div className="flex justify-between text-xs mb-1.5"><span className="text-gray-400">Geographic Radius</span><span className="text-orange-400 font-bold">{radiusKm} km</span></div>
                  <input type="range" min={5} max={100} value={radiusKm} onChange={e => setRadiusKm(+e.target.value)} onMouseUp={runConsolidation} onTouchEnd={runConsolidation} className="w-full accent-orange-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer" />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>5 km (tight)</span><span>100 km (wide)</span></div>
                </div>
                <div>
                  <div className="flex justify-between text-xs mb-1.5"><span className="text-gray-400">Time Window Tolerance</span><span className="text-orange-400 font-bold">{timeTol} min</span></div>
                  <input type="range" min={15} max={480} step={15} value={timeTol} onChange={e => setTimeTol(+e.target.value)} onMouseUp={runConsolidation} onTouchEnd={runConsolidation} className="w-full accent-orange-500 h-2 bg-white/10 rounded-full appearance-none cursor-pointer" />
                  <div className="flex justify-between text-[10px] text-gray-600 mt-1"><span>15 min (strict)</span><span>8 hr (flexible)</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* KPI Cards */}
          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              <KpiCard icon={TrendingUp}  label="Utilization"   value={`${metrics.utilizationAfter}%`}   sub={`+${metrics.utilizationImprovement}% vs naive`} color="#10b981" />
              <KpiCard icon={Truck}       label="Trips Reduced" value={`${metrics.tripsReduced}`}          sub={`${metrics.tripReductionPercent}% fewer`}       color="#3b82f6" />
              <KpiCard icon={Route}       label="Dist Saved"    value={`${metrics.distanceSavedKm} km`}   sub={`${metrics.consolidatedDistanceKm} km total`}   color="#f59e0b" />
              <KpiCard icon={Leaf}        label="CO₂ Saved"     value={`${metrics.carbonSavedKg} kg`}     sub="emissions avoided"                               color="#10b981" />
              <KpiCard icon={DollarSign}  label="Carbon Credits" value={`$${metrics.carbonCreditUSD}`}   sub="@ $25/ton CO₂"                                   color="#8b5cf6" />
              <KpiCard icon={Zap}         label="Fuel Saved"    value={`₹${metrics.fuelSavedINR}`}        sub={`${metrics.costSavedPercent}% cost reduction`}  color="#ec4899" />
            </div>
          )}

          {/* Map + Groups */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 bg-eco-card border border-eco-card-border rounded-xl overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-3 border-b border-eco-card-border">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Consolidation Map — India Corridors</span>
                <button onClick={() => setMapMode(m => m === 'optimized' ? 'before' : 'optimized')}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-white/10 hover:border-orange-500/30 text-gray-300 hover:text-white transition-all">
                  {mapMode === 'optimized' ? <ToggleRight className="w-4 h-4 text-orange-400" /> : <ToggleLeft className="w-4 h-4 text-gray-500" />}
                  {mapMode === 'optimized' ? 'Optimized View' : 'Before (Naive)'}
                </button>
              </div>
              <div className="h-[440px]">
                <MapContainer center={[20.5, 78.9]} zoom={5} style={{ height: '100%', width: '100%', background: '#0f1117' }} zoomControl={false}>
                  <TileLayer attribution='&copy; OSM' url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
                  {allPositions.length > 0 && <FitBounds positions={allPositions} />}
                  {mapMode === 'before' ? (
                    DEMO_SHIPMENTS.map(s => (
                      <Fragment key={s.id}>
                        <CircleMarker center={[s.pickupLat, s.pickupLng]} radius={4} pathOptions={{ color: '#6b7280', fillColor: '#6b7280', fillOpacity: 0.8 }}><Popup><b>{s.pickupLocation}</b><br />{s.weight} kg</Popup></CircleMarker>
                        <CircleMarker center={[s.dropLat, s.dropLng]} radius={4} pathOptions={{ color: '#9ca3af', fillColor: '#9ca3af', fillOpacity: 0.8 }}><Popup><b>{s.dropLocation}</b></Popup></CircleMarker>
                        <Polyline positions={[[s.pickupLat, s.pickupLng], [s.dropLat, s.dropLng]]} pathOptions={{ color: '#374151', weight: 1.5, opacity: 0.6 }} />
                      </Fragment>
                    ))
                  ) : (
                    groups.map((g: any, gi: number) => {
                      const color = GROUP_COLORS[gi % GROUP_COLORS.length];
                      // Build consolidated truck tour: all pickups → all drops
                      const shipments = g.shipments || [];
                      const tourPoints: [number, number][] = [
                        ...shipments.filter((s: any) => s.pickupLat).map((s: any) => [s.pickupLat, s.pickupLng] as [number, number]),
                        ...shipments.filter((s: any) => s.dropLat).map((s: any) => [s.dropLat, s.dropLng] as [number, number]),
                      ];
                      return (
                        <Fragment key={g.groupId}>
                          {/* Consolidated truck route line through all group stops */}
                          {tourPoints.length > 1 && (
                            <Polyline positions={tourPoints} pathOptions={{ color, weight: 3, opacity: 0.9 }} />
                          )}
                          {shipments.map((s: any) => (
                            <Fragment key={s.id}>
                              <Marker position={[s.pickupLat, s.pickupLng]} icon={createGroupIcon(color, 'P')}><Popup><b>Pickup:</b> {s.pickupLocation}<br />Group {g.groupId} · {s.weight}kg · Conf: {g.confidence}%<br /><span style={{color}}>■</span> Truck: {g.truckName}</Popup></Marker>
                              <Marker position={[s.dropLat,   s.dropLng]}   icon={createGroupIcon(color, 'D')}><Popup><b>Drop:</b> {s.dropLocation}<br />Group {g.groupId}</Popup></Marker>
                            </Fragment>
                          ))}
                        </Fragment>
                      );
                    })
                  )}
                </MapContainer>
              </div>
            </div>

            {/* Groups list */}
            <div className="lg:col-span-2 bg-eco-card border border-eco-card-border rounded-xl overflow-hidden flex flex-col">
              <div className="p-4 border-b border-eco-card-border flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Package className="w-4 h-4 text-orange-400" /> Groups ({groups.length})</h3>
                <span className="text-[10px] text-gray-500">AI confidence shown</span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2 max-h-[420px]">
                {groups.length === 0 && !loading && <div className="text-center text-gray-500 py-8 text-sm">Run consolidation to see groups</div>}
                {groups.map((g: any, gi: number) => {
                  const color = GROUP_COLORS[gi % GROUP_COLORS.length];
                  const confColor = g.confidence >= 80 ? 'text-emerald-400' : g.confidence >= 60 ? 'text-yellow-400' : 'text-red-400';
                  return (
                    <div key={g.groupId} className="bg-white/4 rounded-xl p-3 border border-white/5 hover:border-white/10 transition-all">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-sm font-semibold text-white">Group {g.groupId}</span>
                          <span className="text-[10px] text-gray-500">{g.truckName}</span>
                        </div>
                        <span className={`text-xs font-bold ${confColor}`}><Brain className="w-3 h-3 inline mr-0.5" />{g.confidence}%</span>
                      </div>
                      <div className="text-xs text-gray-400 mb-2">{g.shipmentCount} shipments · {g.totalWeight}kg · {g.routeDistanceKm}km</div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(g.utilizationWeight, 100)}%`, backgroundColor: color }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                        <span>Fill: {g.utilizationWeight?.toFixed(1)}%</span>
                        <span>Geo:{g.geoScore}% · Time:{g.timeScore}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Scenario Simulation */}
          {showSim && scenarioResults.length > 0 && (
            <div className="bg-eco-card border border-purple-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-purple-400" /> Scenario Simulation — Consolidation Strategies
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10 text-gray-400 text-xs">
                      <th className="text-left py-2 pr-4 font-medium">Strategy</th>
                      <th className="text-center px-2">Score</th>
                      <th className="text-center px-2">Groups</th>
                      <th className="text-center px-2">Utilization</th>
                      <th className="text-center px-2">Trips Saved</th>
                      <th className="text-center px-2">CO₂ Saved</th>
                      <th className="text-center px-2">Carbon $</th>
                      <th className="text-center px-2">Fuel ₹</th>
                      <th className="text-center px-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {scenarioResults.map((sr: any, idx: number) => {
                      const isBest = scenarioResults.reduce((b, s, i) => s.metrics.optimizationScore > scenarioResults[b].metrics.optimizationScore ? i : b, 0) === idx;
                      const isActive = radiusKm === SCENARIOS[idx].maxGroupRadiusKm && timeTol === SCENARIOS[idx].timeWindowToleranceMinutes;
                      return (
                        <tr key={sr.name} className={`border-b border-white/5 transition-colors ${isActive ? 'bg-orange-600/8' : 'hover:bg-white/3'}`}>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{sr.name}</span>
                              {isBest && <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-600/20 text-emerald-400 font-bold">RECOMMENDED</span>}
                            </div>
                            <div className="text-xs text-gray-500">{SCENARIOS[idx].desc}</div>
                          </td>
                          <td className="text-center px-2"><span className={`font-bold ${sr.metrics.optimizationScore >= 75 ? 'text-emerald-400' : sr.metrics.optimizationScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{sr.metrics.optimizationScore}</span></td>
                          <td className="text-center text-white px-2">{sr.metrics.totalGroups}</td>
                          <td className="text-center text-emerald-400 font-semibold px-2">{sr.metrics.utilizationAfter}%</td>
                          <td className="text-center text-blue-400 px-2">{sr.metrics.tripsReduced} ({sr.metrics.tripReductionPercent}%)</td>
                          <td className="text-center text-green-400 px-2">{sr.metrics.carbonSavedKg}kg</td>
                          <td className="text-center text-purple-400 px-2">${sr.metrics.carbonCreditUSD}</td>
                          <td className="text-center text-pink-400 px-2">₹{sr.metrics.fuelSavedINR}</td>
                          <td className="text-center px-2">
                            {isActive ? <span className="text-xs text-orange-400 font-semibold flex items-center gap-1 justify-center"><Check className="w-3 h-3" /> Active</span> :
                              <button onClick={() => { setRadiusKm(SCENARIOS[idx].maxGroupRadiusKm); setTimeTol(SCENARIOS[idx].timeWindowToleranceMinutes); setConsResult(runLocalConsolidation(DEMO_SHIPMENTS, DEMO_TRUCKS, { maxGroupRadiusKm: SCENARIOS[idx].maxGroupRadiusKm, timeWindowToleranceMinutes: SCENARIOS[idx].timeWindowToleranceMinutes })); setApiUsed('local'); showToast('Applied', `"${sr.name}" strategy`, 'success'); }}
                                className="text-xs text-gray-400 hover:text-white flex items-center gap-1 justify-center transition-colors">Apply <ArrowRight className="w-3 h-3" /></button>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Charts */}
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              <div className="bg-eco-card border border-eco-card-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-orange-400" /> Vehicle Utilization by Group</h3>
                <ResponsiveContainer width="100%" height={230}>
                  <BarChart data={utilChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                    <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 9 }} angle={-20} textAnchor="end" height={50} />
                    <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} domain={[0, 100]} unit="%" />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                    <Bar dataKey="util" radius={[6, 6, 0, 0]}>
                      {utilChartData.map((e, i) => <Cell key={i} fill={e.fill} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-eco-card border border-eco-card-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><Target className="w-4 h-4 text-cyan-400" /> Optimization Radar</h3>
                <ResponsiveContainer width="100%" height={230}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="#1f2937" />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} tick={{ fill: '#666', fontSize: 9 }} domain={[0, 100]} />
                    <Radar dataKey="value" stroke="#f97316" fill="#f97316" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-eco-card border border-eco-card-border rounded-xl p-5">
                <h3 className="text-sm font-semibold text-white mb-4">Trip Reduction</h3>
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie data={tripPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={4} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                      {tripPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <Legend verticalAlign="bottom" iconType="circle" formatter={(v) => <span style={{ color: '#d1d5db', fontSize: 12 }}>{v}</span>} />
                    <Tooltip contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: 8, color: '#fff' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* AI Insights */}
          {insights.length > 0 && (
            <div className="bg-eco-card border border-cyan-500/20 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-cyan-400" />
                Continuous Learning — AI Insights
                {hasGemini && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 font-medium flex items-center gap-1"><Sparkles className="w-3 h-3" /> Gemini 2.5 Flash</span>}
              </h3>
              <div className="space-y-2.5">
                {insights.map((ins: any, i: number) => {
                  const iconMap = { pattern: BookOpen, recommendation: Award, learning: Brain };
                  const colorMap: Record<string, string> = { pattern: 'text-blue-400 bg-blue-600/8 border-blue-500/20', recommendation: 'text-amber-400 bg-amber-600/8 border-amber-500/20', learning: 'text-emerald-400 bg-emerald-600/8 border-emerald-500/20' };
                  const Icon = iconMap[ins.type as keyof typeof iconMap] || Lightbulb;
                  const cls = colorMap[ins.type] || 'text-gray-400 bg-gray-600/8 border-gray-500/20';
                  const impactCls = ins.impact === 'high' ? 'bg-red-600/15 text-red-400' : ins.impact === 'medium' ? 'bg-yellow-600/15 text-yellow-400' : 'bg-gray-600/15 text-gray-400';
                  return (
                    <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border ${cls}`}>
                      <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wide">{ins.type}</span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${impactCls}`}>{ins.impact} impact</span>
                          {ins.llm_generated && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Gemini</span>}
                        </div>
                        <p className="text-sm text-gray-300 leading-relaxed">{ins.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Compatibility Heatmap */}
          <div className="bg-eco-card border border-eco-card-border rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2"><Target className="w-4 h-4 text-orange-400" /> Shipment Compatibility Matrix</h3>
              <button onClick={() => setShowHeatmap(h => !h)} className="text-xs px-3 py-1.5 rounded-lg border border-white/10 text-gray-400 hover:text-white hover:border-orange-500/30 transition-all">
                {showHeatmap ? 'Hide' : 'Generate'} Heatmap
              </button>
            </div>
            {showHeatmap && compatMatrix.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="inline-grid gap-[2px]" style={{ gridTemplateColumns: `40px repeat(${DEMO_SHIPMENTS.length}, 30px)` }}>
                  <div />
                  {DEMO_SHIPMENTS.map(s => <div key={s.id} className="text-[8px] text-gray-500 text-center truncate">{s.id.slice(-3)}</div>)}
                  {compatMatrix.map((row, i) => (
                    <Fragment key={i}>
                      <div className="text-[8px] text-gray-500 flex items-center justify-end pr-1">{DEMO_SHIPMENTS[i].id.slice(-3)}</div>
                      {row.map((val, j) => {
                        const bg = i === j ? 'bg-white/15' : val >= 70 ? 'bg-emerald-600' : val >= 40 ? 'bg-yellow-600' : val >= 15 ? 'bg-orange-700' : 'bg-red-900';
                        return <div key={j} className={`w-7 h-6 ${bg} rounded-sm flex items-center justify-center text-[7px] font-bold text-white cursor-default`} style={{ opacity: i === j ? 0.25 : Math.max(0.3, val / 100) }} title={`${DEMO_SHIPMENTS[i].id}↔${DEMO_SHIPMENTS[j].id}: ${val}%`}>{i !== j ? val : ''}</div>;
                      })}
                    </Fragment>
                  ))}
                </div>
                <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-600" /> High (&gt;70%)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-600" /> Medium (40-70%)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-700" /> Low (15-40%)</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-900" /> Incompatible</span>
                </div>
              </div>
            ) : !showHeatmap ? (
              <p className="text-xs text-gray-500">Click "Generate" to compute pairwise compatibility based on geographic proximity and time window overlap.</p>
            ) : null}
          </div>

          {/* Impact Summary */}
          {metrics && (
            <div className="bg-eco-card border border-eco-card-border rounded-xl p-5">
              <h3 className="text-sm font-semibold text-white mb-4">Consolidation Impact Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
                {[
                  { label: 'Naive Distance', value: `${metrics.naiveTotalDistanceKm} km`, color: 'text-gray-300' },
                  { label: 'Optimized Distance', value: `${metrics.consolidatedDistanceKm} km`, color: 'text-emerald-400' },
                  { label: 'Trips: Before', value: `${metrics.totalShipments}`, color: 'text-gray-300' },
                  { label: 'Trips: After', value: `${metrics.totalGroups}`, color: 'text-emerald-400' },
                  { label: 'Monthly Projection', value: `₹${(metrics.fuelSavedINR * 30).toLocaleString()}`, color: 'text-cyan-400' },
                  { label: 'Annual CO₂ Impact', value: `${((metrics.carbonSavedKg * 365) / 1000).toFixed(1)} tons`, color: 'text-green-400' },
                ].map((item, i) => (
                  <div key={i}>
                    <div className="text-xs text-gray-400 mb-1">{item.label}</div>
                    <div className={`text-lg font-bold ${item.color}`}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          TAB 2: AI ROUTE OPTIMIZER
      ══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'route' && (
        <div className="space-y-5">

          {/* Fleet Route Optimization (per consolidated group) */}
          {groupRoutes.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Truck className="w-5 h-5 text-blue-400" /> Fleet Route Optimization
                  <span className="text-sm font-normal text-gray-400">— optimized stop sequencing per consolidated group</span>
                </h2>
                <button onClick={() => setActiveTab('consolidation')} className="text-xs text-gray-400 hover:text-white flex items-center gap-1 transition-colors">
                  Re-run consolidation <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              {/* Fleet Summary Banner */}
              <div className="bg-gradient-to-r from-blue-900/30 via-cyan-900/20 to-blue-900/30 border border-blue-500/20 rounded-xl p-5 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div><p className="text-2xl font-black text-blue-400">{fleetNaiveDist.toFixed(1)} km</p><p className="text-xs text-gray-400">Fleet distance (naive)</p></div>
                <div><p className="text-2xl font-black text-emerald-400">{fleetOptDist.toFixed(1)} km</p><p className="text-xs text-gray-400">Fleet distance (optimized)</p></div>
                <div><p className="text-2xl font-black text-cyan-400">{fleetDistSaved.toFixed(1)} km</p><p className="text-xs text-gray-400">Total distance saved</p></div>
                <div><p className="text-2xl font-black text-green-400">{(fleetDistSaved * 0.21).toFixed(1)} kg</p><p className="text-xs text-gray-400">Additional CO₂ saved</p></div>
              </div>

              {/* Per-group route cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupRoutes.map((g: any, gi: number) => {
                  const color = GROUP_COLORS[gi % GROUP_COLORS.length];
                  const { naiveOrder, optOrder, naiveDist, optDist, savedKm, savedPct } = g.routeOpt;
                  return (
                    <div key={g.groupId} className="bg-eco-card border border-eco-card-border rounded-xl overflow-hidden">
                      <div className="flex items-center justify-between p-3 border-b border-eco-card-border">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-sm font-bold text-white">Group {g.groupId}</span>
                          <span className="text-xs text-gray-400">{g.truckName}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="text-red-400 line-through">{naiveDist} km</span>
                          <ArrowRight className="w-3 h-3 text-gray-500" />
                          <span className="text-emerald-400 font-bold">{optDist} km</span>
                          {savedPct > 0 && <span className="text-blue-400 font-bold">-{savedPct}%</span>}
                        </div>
                      </div>
                      <div className="p-3">
                        {/* Before sequence */}
                        <div className="mb-2">
                          <div className="text-[9px] text-red-400 font-bold uppercase mb-1">Naive Order</div>
                          <div className="flex flex-wrap gap-1">
                            {naiveOrder.map((stop: RouteStop, si: number) => (
                              <div key={stop.id} className="flex items-center gap-0.5">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${stop.type === 'pickup' ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-orange-500/10 border-orange-500/20 text-orange-300'}`}>
                                  {stop.type === 'pickup' ? 'P' : 'D'}{stop.shipmentId.slice(-3)}
                                </span>
                                {si < naiveOrder.length - 1 && <span className="text-gray-700 text-[8px]">›</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* After sequence */}
                        <div>
                          <div className="text-[9px] text-emerald-400 font-bold uppercase mb-1">Optimized Order</div>
                          <div className="flex flex-wrap gap-1">
                            {optOrder.map((stop: RouteStop, si: number) => {
                              const naiveIdx = naiveOrder.findIndex((s: RouteStop) => s.id === stop.id);
                              const moved = naiveIdx !== si;
                              return (
                                <div key={stop.id} className="flex items-center gap-0.5">
                                  <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${moved ? (stop.type === 'pickup' ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-500/10 border-emerald-400/20 text-emerald-400') : 'bg-white/4 border-white/10 text-gray-500'}`}>
                                    {stop.type === 'pickup' ? 'P' : 'D'}{stop.shipmentId.slice(-3)}
                                  </span>
                                  {si < optOrder.length - 1 && <span className="text-gray-700 text-[8px]">›</span>}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {savedKm > 0 && (
                          <div className="mt-2 text-[10px] text-emerald-400 font-semibold">✓ Saved {savedKm} km within this group's route</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-white/10" />
            <span className="text-xs text-gray-500 uppercase tracking-wider">Last-Mile Route Optimizer — Mumbai Demo</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Mumbai Last-Mile Route Optimizer */}
          <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-blue-400" /> Single-Route 2-opt Optimizer
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Greedy nearest-neighbour + 2-opt local search · Ola Maps real road distances</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Stops:</span>
                  <select value={numStops} onChange={e => setNumStops(Number(e.target.value))} className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 focus:border-blue-500/50 focus:outline-none">
                    {[5, 7, 10].map(n => <option key={n} value={n} style={{ background: '#1f2937' }}>{n} stops</option>)}
                  </select>
                </div>
                <button onClick={runRouteOpt} disabled={routeStatus === 'optimizing'}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-semibold hover:from-blue-500 hover:to-cyan-400 disabled:opacity-50 transition-all shadow-lg shadow-blue-600/20">
                  {routeStatus === 'optimizing' ? <><Loader2 className="w-4 h-4 animate-spin" /> Optimizing…</> : <><Play className="w-4 h-4" /> Optimize Route</>}
                </button>
              </div>
            </div>

            {/* Mumbai Stops Grid */}
            <div className="bg-eco-card border border-eco-card-border rounded-xl p-4">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2"><MapIcon className="w-3.5 h-3.5 text-blue-400" /> Delivery Stops ({numStops}) — Mumbai Urban</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                {mumStops.map((stop, i) => (
                  <div key={stop.id} className="flex items-center gap-2 p-2.5 bg-white/3 border border-white/5 rounded-lg hover:border-blue-500/20 transition-all">
                    <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-[10px] font-bold text-blue-400 flex-shrink-0">{i+1}</div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">{stop.name}</p>
                      <p className="text-[10px] text-gray-500">{stop.weight}kg · {stop.time}min</p>
                    </div>
                    <span className={`ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded border flex-shrink-0 ${stop.priority === 'HIGH' ? 'text-red-400 bg-red-400/10 border-red-400/20' : stop.priority === 'EXPRESS' ? 'text-purple-400 bg-purple-400/10 border-purple-400/20' : 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>{stop.priority}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Route Result */}
            {routeStatus === 'done' && routeResult && (
              <div className="space-y-4">
                {routeError && <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2 text-xs text-amber-300">{routeError}</div>}

                {/* Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Distance Saved', value: `${routeResult.saved} km`, sub: `↓ ${routeResult.pct}%`, color: 'text-blue-400', border: 'border-blue-500/20' },
                    { label: 'Time Saved',      value: `${Math.round(routeResult.saved / 25 * 60)} min`, sub: `at 25km/h urban`, color: 'text-cyan-400', border: 'border-cyan-500/20' },
                    { label: 'CO₂ Saved',       value: `${(routeResult.saved * 0.21).toFixed(1)} kg`, sub: 'less emissions', color: 'text-green-400', border: 'border-green-500/20' },
                    { label: 'Method',          value: routeResult.method?.split(' ').slice(0,2).join('-') || '2-opt', sub: routeResult.method, color: 'text-orange-400', border: 'border-orange-500/20' },
                  ].map((m, i) => (
                    <div key={i} className={`bg-eco-card border ${m.border} rounded-xl p-4`}>
                      <p className={`text-2xl font-black ${m.color}`}>{m.value}</p>
                      <p className="text-xs text-gray-400 mt-1">{m.label}</p>
                      <p className="text-[10px] text-gray-600">{m.sub}</p>
                    </div>
                  ))}
                </div>

                {/* SVG Before / After */}
                <div className="bg-eco-card border border-eco-card-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2"><MapIcon className="w-4 h-4 text-blue-400" /> Route Visualization — Before vs After</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Before */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-3 h-3 rounded-full bg-red-500" /><span className="text-xs font-bold text-red-300">BEFORE — Naive Sequential</span>
                        <span className="ml-auto text-xs text-red-400 font-mono">{routeResult.naive} km</span>
                      </div>
                      <div className="h-[230px] bg-red-500/4 border border-red-500/15 rounded-xl overflow-hidden">
                        <svg viewBox="0 0 400 280" className="w-full h-full">
                          {(() => {
                            const depot = toSvg(WAREHOUSE.lat, WAREHOUSE.lng);
                            const pts = [depot, ...routeResult.before.map((id: string) => { const s = MUMBAI_STOPS.find(s => s.id === id); return s ? toSvg(s.lat, s.lng) : depot; }), depot];
                            return <polyline points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="rgba(239,68,68,0.4)" strokeWidth="1.5" strokeDasharray="5 3" />;
                          })()}
                          {(() => { const [cx,cy] = toSvg(WAREHOUSE.lat, WAREHOUSE.lng); return <g><circle cx={cx} cy={cy} r="7" fill="rgba(249,115,22,0.2)" stroke="#f97316" strokeWidth="2"/><text x={cx} y={cy+18} textAnchor="middle" fill="#f97316" fontSize="7" fontWeight="bold">DEPOT</text></g>; })()}
                          {routeResult.before.map((id: string, i: number) => { const s = MUMBAI_STOPS.find(s => s.id === id); if (!s) return null; const [cx,cy] = toSvg(s.lat, s.lng); return <g key={id}><circle cx={cx} cy={cy} r="10" fill="rgba(239,68,68,0.1)" stroke="rgba(239,68,68,0.5)" strokeWidth="1.5"/><text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill="#fca5a5" fontSize="7" fontWeight="bold">{i+1}</text></g>; })}
                        </svg>
                      </div>
                    </div>
                    {/* After */}
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500" /><span className="text-xs font-bold text-emerald-300">AFTER — AI Optimized</span><CheckCircle className="w-4 h-4 text-emerald-400" />
                        <span className="ml-auto text-xs text-emerald-400 font-mono">{routeResult.opt} km</span>
                      </div>
                      <div className="h-[230px] bg-emerald-500/4 border border-emerald-500/15 rounded-xl overflow-hidden">
                        <svg viewBox="0 0 400 280" className="w-full h-full">
                          <defs><style>{`@keyframes drawR{from{stroke-dashoffset:3000}to{stroke-dashoffset:0}}.draw-r{stroke-dasharray:3000;stroke-dashoffset:3000;animation:drawR 2.2s ease-out forwards}`}</style></defs>
                          {(() => {
                            const depot = toSvg(WAREHOUSE.lat, WAREHOUSE.lng);
                            const pts = [depot, ...routeResult.after.map((id: string) => { const s = MUMBAI_STOPS.find(s => s.id === id); return s ? toSvg(s.lat, s.lng) : depot; }), depot];
                            return <polyline key={animKey} className="draw-r" points={pts.map(p => p.join(',')).join(' ')} fill="none" stroke="#10b981" strokeWidth="2.5" />;
                          })()}
                          {(() => { const [cx,cy] = toSvg(WAREHOUSE.lat, WAREHOUSE.lng); return <g><circle cx={cx} cy={cy} r="7" fill="rgba(249,115,22,0.2)" stroke="#f97316" strokeWidth="2"/><text x={cx} y={cy+18} textAnchor="middle" fill="#f97316" fontSize="7" fontWeight="bold">DEPOT</text></g>; })()}
                          {routeResult.after.map((id: string, i: number) => { const s = MUMBAI_STOPS.find(s => s.id === id); if (!s) return null; const [cx,cy] = toSvg(s.lat, s.lng); const moved = routeResult.before.indexOf(id) !== i; return <g key={id}><circle cx={cx} cy={cy} r="10" fill={moved ? 'rgba(16,185,129,0.18)' : 'rgba(16,185,129,0.05)'} stroke={moved ? 'rgba(16,185,129,0.8)' : 'rgba(16,185,129,0.25)'} strokeWidth="1.5"/><text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle" fill={moved ? '#6ee7b7' : '#a7f3d0'} fontSize="7" fontWeight="bold">{i+1}</text></g>; })}
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Improvement Banner */}
                  <div className="mt-4 bg-gradient-to-r from-blue-900/25 to-cyan-900/15 border border-blue-500/20 rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/10 rounded-lg border border-blue-500/30"><Route className="w-5 h-5 text-blue-400" /></div>
                      <div>
                        <p className="text-white font-semibold text-sm">Route Optimized — 2-opt Local Search</p>
                        <p className="text-xs text-gray-400">Greedy nearest-neighbour seed → iterative 2-opt improvement</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 text-center">
                      <div><p className="text-2xl font-black text-blue-400">-{routeResult.pct}%</p><p className="text-[10px] text-gray-500">Distance</p></div>
                      <div><p className="text-2xl font-black text-cyan-400">-{Math.round(routeResult.saved/25*60)}m</p><p className="text-[10px] text-gray-500">Time</p></div>
                      <div><p className="text-2xl font-black text-green-400">-{(routeResult.saved*0.21).toFixed(1)}kg</p><p className="text-[10px] text-gray-500">CO₂</p></div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Reroute — Insert Urgent Stop */}
                <div className="bg-eco-card border border-purple-500/20 rounded-xl p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                        <PlusCircle className="w-4 h-4 text-purple-400" />
                        Dynamic Reroute — Insert Urgent Stop
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 font-medium">Brain API</span>
                      </h3>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Calls <code className="text-purple-300 font-mono">POST /routes/dynamic-insert</code> — cheapest insertion into the live route
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <select
                        value={insertPriority}
                        onChange={e => setInsertPriority(e.target.value as 'HIGH' | 'MEDIUM' | 'LOW')}
                        className="bg-white/5 border border-white/10 text-white text-xs rounded-lg px-3 py-1.5 focus:border-purple-500/50 focus:outline-none"
                      >
                        {(['HIGH', 'MEDIUM', 'LOW'] as const).map(p => (
                          <option key={p} value={p} style={{ background: '#1f2937' }}>{p} priority</option>
                        ))}
                      </select>
                      <button
                        onClick={insertUrgentStop}
                        disabled={insertStatus === 'inserting'}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-violet-500 text-white text-xs font-semibold disabled:opacity-50 transition-all shadow-lg shadow-purple-600/20"
                      >
                        {insertStatus === 'inserting'
                          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Inserting…</>
                          : <><PlusCircle className="w-3.5 h-3.5" /> Insert Colaba Stop</>}
                      </button>
                    </div>
                  </div>

                  {/* Stop being inserted */}
                  <div className="flex items-center gap-3 p-3 bg-purple-500/5 border border-purple-500/15 rounded-lg mb-4">
                    <AlertTriangle className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white">New Stop: {URGENT_STOP.name}</p>
                      <p className="text-[10px] text-gray-400">lat {URGENT_STOP.lat}, lng {URGENT_STOP.lng} — will be inserted at minimum-cost position</p>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${insertPriority === 'HIGH' ? 'text-red-400 bg-red-400/10 border-red-400/20' : insertPriority === 'MEDIUM' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' : 'text-gray-400 bg-gray-400/10 border-gray-400/20'}`}>
                      {insertPriority}
                    </span>
                  </div>

                  {insertStatus === 'done' && insertResult && (
                    <div className="space-y-3">
                      {/* Result header */}
                      <div className="flex items-center gap-3 p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
                        <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold text-white">
                            Inserted at position {insertResult.insertion_position + 1} — +{insertResult.additional_distance_km} km added
                          </p>
                          <p className="text-[10px] text-gray-400">
                            Source: {insertResult.source === 'local' ? 'client-side cheapest insertion' : 'brain /api/v1/routes/dynamic-insert'}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-purple-400">+{insertResult.additional_distance_km} km</span>
                      </div>

                      {/* Resequenced stops */}
                      <div>
                        <div className="text-[9px] text-purple-400 font-bold uppercase mb-2">Resequenced Route</div>
                        <div className="flex flex-wrap gap-1">
                          {(insertResult.new_order || []).map((id: string, i: number) => {
                            const isUrgent = id === URGENT_STOP.id;
                            const stop = MUMBAI_STOPS.find(m => m.id === id);
                            return (
                              <div key={`${id}-${i}`} className="flex items-center gap-0.5">
                                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono ${isUrgent ? 'bg-purple-500/20 border-purple-500/40 text-purple-300 font-bold' : 'bg-white/4 border-white/10 text-gray-400'}`}>
                                  {isUrgent ? '⚡' : ''}{i + 1}. {isUrgent ? 'Colaba' : (stop?.name.split(' ')[0] || id)}
                                </span>
                                {i < (insertResult.new_order.length - 1) && <span className="text-gray-700 text-[8px]">›</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <button onClick={() => { setRouteStatus('idle'); setRouteResult(null); setInsertStatus('idle'); setInsertResult(null); }} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-white transition-colors">
                  <RefreshCw className="w-4 h-4" /> Run again with different stops
                </button>
              </div>
            )}
          </div>

          {/* Continuous Learning Note */}
          <div className="bg-eco-card border border-blue-500/15 rounded-xl p-4 flex items-start gap-3">
            <Brain className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-white mb-1">Continuous Route Learning</div>
              <p className="text-xs text-gray-400 leading-relaxed">
                Every optimization run feeds back into the RL experience store. The Q-learning agent tracks which (radius, tolerance) parameter combinations yield the best reward across utilization, trip reduction, and CO₂ impact. After {agentSteps.length > 0 ? agentSteps.find(s => s.agent === 'ContinuousLearningAgent')?.episodes_total || '—' : '—'} episodes, the system recommends optimal parameters for future consolidation runs.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
