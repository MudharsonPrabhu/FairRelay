const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ─── Haversine distance (km) ────────────────────────────────────────────────
function haversine(lat1, lng1, lat2, lng2) {
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

// ─── Geographic clustering (simple K-Means-style) ───────────────────────────
function clusterShipments(shipments, maxGroupRadiusKm = 30) {
  const clusters = [];
  const assigned = new Set();

  for (let i = 0; i < shipments.length; i++) {
    if (assigned.has(i)) continue;
    const seed = shipments[i];
    const cluster = [seed];
    assigned.add(i);

    for (let j = i + 1; j < shipments.length; j++) {
      if (assigned.has(j)) continue;
      const s = shipments[j];
      const pickupDist = haversine(seed.pickupLat, seed.pickupLng, s.pickupLat, s.pickupLng);
      const dropDist = haversine(seed.dropLat, seed.dropLng, s.dropLat, s.dropLng);
      if (pickupDist <= maxGroupRadiusKm && dropDist <= maxGroupRadiusKm) {
        cluster.push(s);
        assigned.add(j);
      }
    }
    clusters.push(cluster);
  }
  return clusters;
}

// ─── Time window compatibility filter ───────────────────────────────────────
function filterByTimeWindow(cluster, toleranceMinutes = 120) {
  if (!cluster[0].timeWindowStart) return cluster;
  const toleranceMs = toleranceMinutes * 60 * 1000;
  const groups = [];
  const used = new Set();

  for (let i = 0; i < cluster.length; i++) {
    if (used.has(i)) continue;
    const group = [cluster[i]];
    used.add(i);
    const refStart = new Date(cluster[i].timeWindowStart).getTime();
    const refEnd = cluster[i].timeWindowEnd
      ? new Date(cluster[i].timeWindowEnd).getTime()
      : refStart + 4 * 3600000;

    for (let j = i + 1; j < cluster.length; j++) {
      if (used.has(j)) continue;
      const s = cluster[j];
      const sStart = new Date(s.timeWindowStart || 0).getTime();
      const sEnd = s.timeWindowEnd ? new Date(s.timeWindowEnd).getTime() : sStart + 4 * 3600000;
      if (sStart <= refEnd + toleranceMs && sEnd >= refStart - toleranceMs) {
        group.push(s);
        used.add(j);
      }
    }
    groups.push(group);
  }
  return groups;
}

// ─── First-fit-decreasing bin-packing ───────────────────────────────────────
function binPack(shipmentGroup, trucks) {
  const sorted = [...shipmentGroup].sort(
    (a, b) => (b.weight || 0) - (a.weight || 0)
  );
  const bins = trucks.map((t) => ({
    truck: t,
    shipments: [],
    usedWeight: 0,
    usedVolume: 0,
  }));

  for (const s of sorted) {
    const w = s.weight || 0;
    const v = s.volume || 0;
    let placed = false;
    for (const bin of bins) {
      if (
        bin.usedWeight + w <= bin.truck.maxWeight &&
        bin.usedVolume + v <= bin.truck.maxVolume
      ) {
        bin.shipments.push(s);
        bin.usedWeight += w;
        bin.usedVolume += v;
        placed = true;
        break;
      }
    }
    if (!placed && bins.length > 0) {
      const last = bins[bins.length - 1];
      last.shipments.push(s);
      last.usedWeight += w;
      last.usedVolume += v;
    }
  }
  return bins.filter((b) => b.shipments.length > 0);
}

// ─── Compute per-group route distance (Haversine sum) ───────────────────────
function groupRouteDistance(shipments) {
  if (shipments.length === 0) return 0;
  let dist = 0;
  for (const s of shipments) {
    dist += haversine(s.pickupLat, s.pickupLng, s.dropLat, s.dropLng);
  }
  return dist;
}

function naiveDistance(shipments) {
  return shipments.reduce(
    (sum, s) => sum + haversine(s.pickupLat, s.pickupLng, s.dropLat, s.dropLng),
    0
  );
}

// ─── Core consolidation algorithm ───────────────────────────────────────────
function runConsolidation(shipments, trucks, options = {}) {
  const maxGroupRadius = options.maxGroupRadiusKm || 30;
  const timeWindowTolerance = options.timeWindowToleranceMinutes || 120;

  const naiveTotalDist = naiveDistance(shipments);
  const naiveTrips = shipments.length;
  const naiveUtilization =
    trucks.length > 0
      ? shipments.reduce((s, sh) => s + (sh.weight || 0), 0) /
        (trucks.reduce((s, t) => s + t.maxWeight, 0) / trucks.length) /
        naiveTrips *
        100
      : 0;

  const geoClusters = clusterShipments(shipments, maxGroupRadius);

  const allGroups = [];
  for (const cluster of geoClusters) {
    const timeGroups = filterByTimeWindow(cluster, timeWindowTolerance);
    for (const tg of timeGroups) {
      allGroups.push(tg);
    }
  }

  const packedBins = [];
  let truckPool = [...trucks];
  for (const group of allGroups) {
    if (truckPool.length === 0) truckPool = [...trucks];
    const bins = binPack(group, truckPool);
    packedBins.push(...bins);
    const usedIds = new Set(bins.map((b) => b.truck.id));
    truckPool = truckPool.filter((t) => !usedIds.has(t.id));
  }

  let consolidatedDist = 0;
  for (const bin of packedBins) {
    consolidatedDist += groupRouteDistance(bin.shipments);
  }

  const totalWeight = shipments.reduce((s, sh) => s + (sh.weight || 0), 0);
  const avgTruckCap =
    trucks.length > 0
      ? trucks.reduce((s, t) => s + t.maxWeight, 0) / trucks.length
      : 1;
  const consolidatedTrips = packedBins.length;
  const consolidatedUtil =
    consolidatedTrips > 0
      ? (totalWeight / (consolidatedTrips * avgTruckCap)) * 100
      : 0;

  const distSaved = Math.max(0, naiveTotalDist - consolidatedDist);
  const co2Factor = 0.21;
  const carbonSaved = distSaved * co2Factor;
  const tripsReduced = Math.max(0, naiveTrips - consolidatedTrips);
  const costSavedPercent =
    naiveTrips > 0 ? (tripsReduced / naiveTrips) * 100 : 0;

  const groups = packedBins.map((bin, idx) => ({
    groupId: idx + 1,
    truckId: bin.truck.id,
    truckName: bin.truck.name || bin.truck.licensePlate || `Truck-${idx + 1}`,
    truckCapacity: { maxWeight: bin.truck.maxWeight, maxVolume: bin.truck.maxVolume },
    shipmentCount: bin.shipments.length,
    shipments: bin.shipments.map((s) => ({
      id: s.id,
      pickupLocation: s.pickupLocation,
      dropLocation: s.dropLocation,
      weight: s.weight,
      volume: s.volume,
      // ── Geospatial fields (required for map rendering) ──────────────────
      pickupLat: s.pickupLat,
      pickupLng: s.pickupLng,
      dropLat: s.dropLat,
      dropLng: s.dropLng,
      // ── Optional scheduling / priority fields ────────────────────────────
      priority: s.priority || null,
      timeWindowStart: s.timeWindowStart || null,
      timeWindowEnd: s.timeWindowEnd || null,
    })),
    totalWeight: bin.usedWeight,
    totalVolume: bin.usedVolume,
    utilizationWeight: (bin.usedWeight / bin.truck.maxWeight) * 100,
    utilizationVolume: (bin.usedVolume / bin.truck.maxVolume) * 100,
    routeDistanceKm: parseFloat(groupRouteDistance(bin.shipments).toFixed(1)),
  }));

  return {
    groups,
    metrics: {
      totalShipments: shipments.length,
      totalGroups: groups.length,
      totalTrucks: trucks.length,
      utilizationBefore: parseFloat(Math.min(naiveUtilization, 100).toFixed(1)),
      utilizationAfter: parseFloat(Math.min(consolidatedUtil, 100).toFixed(1)),
      utilizationImprovement: parseFloat(
        Math.min(consolidatedUtil - naiveUtilization, 100).toFixed(1)
      ),
      tripsReduced,
      tripReductionPercent: parseFloat(
        (naiveTrips > 0 ? (tripsReduced / naiveTrips) * 100 : 0).toFixed(1)
      ),
      distanceSavedKm: parseFloat(distSaved.toFixed(1)),
      carbonSavedKg: parseFloat(carbonSaved.toFixed(1)),
      costSavedPercent: parseFloat(costSavedPercent.toFixed(1)),
      naiveTotalDistanceKm: parseFloat(naiveTotalDist.toFixed(1)),
      consolidatedDistanceKm: parseFloat(consolidatedDist.toFixed(1)),
    },
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// Controller endpoints
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * POST /api/consolidation/optimize
 */
exports.optimize = async (req, res) => {
  try {
    const { shipments = [], trucks = [], options = {} } = req.body;

    if (!shipments.length) {
      return res.status(400).json({ success: false, message: 'shipments array is required' });
    }
    if (!trucks.length) {
      return res.status(400).json({ success: false, message: 'trucks array is required' });
    }

    const result = runConsolidation(shipments, trucks, options);

    try {
      await prisma.consolidationRun.create({
        data: {
          totalShipments: result.metrics.totalShipments,
          totalGroups: result.metrics.totalGroups,
          totalTrucks: result.metrics.totalTrucks,
          utilizationBefore: result.metrics.utilizationBefore,
          utilizationAfter: result.metrics.utilizationAfter,
          tripsReduced: result.metrics.tripsReduced,
          distanceSavedKm: result.metrics.distanceSavedKm,
          carbonSavedKg: result.metrics.carbonSavedKg,
          costSavedPercent: result.metrics.costSavedPercent,
          scenarioName: options.scenarioName || null,
          inputPayload: { shipmentCount: shipments.length, truckCount: trucks.length, options },
          resultPayload: result,
        },
      });
    } catch (dbErr) {
      console.warn('Could not persist consolidation run:', dbErr.message);
    }

    return res.json({ success: true, data: result });
  } catch (err) {
    console.error('Consolidation optimize error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/consolidation/simulate
 */
exports.simulate = async (req, res) => {
  try {
    const { shipments = [], trucks = [], scenarios = [] } = req.body;

    if (!shipments.length || !trucks.length) {
      return res.status(400).json({
        success: false,
        message: 'shipments and trucks arrays are required',
      });
    }

    if (!scenarios.length) {
      return res.status(400).json({
        success: false,
        message: 'scenarios array is required (at least one scenario)',
      });
    }

    const results = scenarios.map((scenario) => ({
      name: scenario.name || 'Unnamed',
      ...runConsolidation(shipments, trucks, {
        maxGroupRadiusKm: scenario.maxGroupRadiusKm,
        timeWindowToleranceMinutes: scenario.timeWindowToleranceMinutes,
        scenarioName: scenario.name,
      }),
    }));

    const best = results.reduce((a, b) =>
      b.metrics.utilizationAfter > a.metrics.utilizationAfter ? b : a
    );

    return res.json({
      success: true,
      data: { scenarios: results, recommendation: best.name },
    });
  } catch (err) {
    console.error('Consolidation simulate error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/consolidation/history
 */
exports.history = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const runs = await prisma.consolidationRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return res.json({ success: true, data: runs });
  } catch (err) {
    console.warn('Could not fetch consolidation history:', err.message);
    return res.json({ success: true, data: [] });
  }
};

/**
 * POST /api/consolidation/demo
 * Returns a pre-built demo consolidation with realistic Indian logistics data
 */
exports.demo = async (req, res) => {
  const demoShipments = [
    { id: 'SH-001', pickupLat: 19.076, pickupLng: 72.877, dropLat: 18.520, dropLng: 73.856, pickupLocation: 'Mumbai Port', dropLocation: 'Pune Warehouse', weight: 800, volume: 3.2, timeWindowStart: '2026-02-20T06:00:00Z', timeWindowEnd: '2026-02-20T12:00:00Z' },
    { id: 'SH-002', pickupLat: 19.098, pickupLng: 72.890, dropLat: 18.532, dropLng: 73.870, pickupLocation: 'Mumbai JNPT', dropLocation: 'Pune Industrial', weight: 600, volume: 2.5, timeWindowStart: '2026-02-20T07:00:00Z', timeWindowEnd: '2026-02-20T13:00:00Z' },
    { id: 'SH-003', pickupLat: 19.060, pickupLng: 72.868, dropLat: 18.540, dropLng: 73.880, pickupLocation: 'Mumbai Dock', dropLocation: 'Pune Hub', weight: 450, volume: 1.8, timeWindowStart: '2026-02-20T06:30:00Z', timeWindowEnd: '2026-02-20T11:00:00Z' },
    { id: 'SH-004', pickupLat: 12.971, pickupLng: 77.594, dropLat: 13.083, dropLng: 80.270, pickupLocation: 'Bangalore Warehouse', dropLocation: 'Chennai Central', weight: 1200, volume: 5.0, timeWindowStart: '2026-02-20T08:00:00Z', timeWindowEnd: '2026-02-20T18:00:00Z' },
    { id: 'SH-005', pickupLat: 12.985, pickupLng: 77.610, dropLat: 13.060, dropLng: 80.250, pickupLocation: 'Bangalore Tech Park', dropLocation: 'Chennai Port', weight: 900, volume: 3.8, timeWindowStart: '2026-02-20T09:00:00Z', timeWindowEnd: '2026-02-20T19:00:00Z' },
    { id: 'SH-006', pickupLat: 12.960, pickupLng: 77.580, dropLat: 13.070, dropLng: 80.260, pickupLocation: 'Bangalore South', dropLocation: 'Chennai North', weight: 700, volume: 2.9, timeWindowStart: '2026-02-20T08:30:00Z', timeWindowEnd: '2026-02-20T17:00:00Z' },
    { id: 'SH-007', pickupLat: 28.704, pickupLng: 77.102, dropLat: 26.912, dropLng: 75.787, pickupLocation: 'Delhi NCR Hub', dropLocation: 'Jaipur Depot', weight: 1500, volume: 6.0, timeWindowStart: '2026-02-20T05:00:00Z', timeWindowEnd: '2026-02-20T14:00:00Z' },
    { id: 'SH-008', pickupLat: 28.720, pickupLng: 77.120, dropLat: 26.930, dropLng: 75.800, pickupLocation: 'Delhi Warehouse', dropLocation: 'Jaipur Industrial', weight: 1100, volume: 4.5, timeWindowStart: '2026-02-20T05:30:00Z', timeWindowEnd: '2026-02-20T13:00:00Z' },
    { id: 'SH-009', pickupLat: 28.690, pickupLng: 77.090, dropLat: 26.900, dropLng: 75.770, pickupLocation: 'Delhi Logistics Park', dropLocation: 'Jaipur Hub', weight: 500, volume: 2.0, timeWindowStart: '2026-02-20T06:00:00Z', timeWindowEnd: '2026-02-20T15:00:00Z' },
    { id: 'SH-010', pickupLat: 19.090, pickupLng: 72.870, dropLat: 21.170, dropLng: 72.831, pickupLocation: 'Mumbai Central', dropLocation: 'Surat Hub', weight: 950, volume: 4.0, timeWindowStart: '2026-02-20T07:00:00Z', timeWindowEnd: '2026-02-20T16:00:00Z' },
    { id: 'SH-011', pickupLat: 19.070, pickupLng: 72.860, dropLat: 21.180, dropLng: 72.840, pickupLocation: 'Mumbai West', dropLocation: 'Surat Depot', weight: 650, volume: 2.7, timeWindowStart: '2026-02-20T07:30:00Z', timeWindowEnd: '2026-02-20T16:00:00Z' },
    { id: 'SH-012', pickupLat: 17.385, pickupLng: 78.486, dropLat: 15.828, dropLng: 78.037, pickupLocation: 'Hyderabad Hub', dropLocation: 'Kurnool Depot', weight: 1800, volume: 7.2, timeWindowStart: '2026-02-20T06:00:00Z', timeWindowEnd: '2026-02-20T14:00:00Z' },
    { id: 'SH-013', pickupLat: 17.400, pickupLng: 78.500, dropLat: 15.840, dropLng: 78.050, pickupLocation: 'Hyderabad HITEC', dropLocation: 'Kurnool Industrial', weight: 400, volume: 1.6, timeWindowStart: '2026-02-20T06:30:00Z', timeWindowEnd: '2026-02-20T13:00:00Z' },
    { id: 'SH-014', pickupLat: 28.680, pickupLng: 77.080, dropLat: 28.460, dropLng: 77.026, pickupLocation: 'Delhi South', dropLocation: 'Gurgaon Hub', weight: 300, volume: 1.2, timeWindowStart: '2026-02-20T10:00:00Z', timeWindowEnd: '2026-02-20T14:00:00Z' },
    { id: 'SH-015', pickupLat: 28.700, pickupLng: 77.100, dropLat: 28.470, dropLng: 77.030, pickupLocation: 'Delhi Central', dropLocation: 'Gurgaon Cyber City', weight: 350, volume: 1.4, timeWindowStart: '2026-02-20T10:30:00Z', timeWindowEnd: '2026-02-20T15:00:00Z' },
  ];

  const demoTrucks = [
    { id: 'TRK-001', name: 'Tata Ace Gold', maxWeight: 2000, maxVolume: 8.0, licensePlate: 'MH-12-AB-1234', co2PerKm: 0.21 },
    { id: 'TRK-002', name: 'Ashok Leyland Dost', maxWeight: 2500, maxVolume: 10.0, licensePlate: 'KA-05-CD-5678', co2PerKm: 0.23 },
    { id: 'TRK-003', name: 'Mahindra Bolero Pickup', maxWeight: 1500, maxVolume: 6.0, licensePlate: 'DL-01-EF-9012', co2PerKm: 0.19 },
    { id: 'TRK-004', name: 'Eicher Pro 2049', maxWeight: 5000, maxVolume: 20.0, licensePlate: 'GJ-06-GH-3456', co2PerKm: 0.25 },
    { id: 'TRK-005', name: 'BharatBenz 1015R', maxWeight: 3000, maxVolume: 12.0, licensePlate: 'TN-09-IJ-7890', co2PerKm: 0.22 },
    { id: 'TRK-006', name: 'Tata Ultra T.7', maxWeight: 3500, maxVolume: 14.0, licensePlate: 'TS-08-KL-2345', co2PerKm: 0.20 },
  ];

  const result = runConsolidation(demoShipments, demoTrucks, {
    maxGroupRadiusKm: 30,
    timeWindowToleranceMinutes: 120,
  });

  return res.json({ success: true, data: result, demo: true });
};

// Export the core function for V1 route usage
exports.runConsolidation = runConsolidation;
