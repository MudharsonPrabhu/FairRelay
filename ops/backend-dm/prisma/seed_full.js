/**
 * FairRelay — Full Database Seed
 * Seeds: 1 CourierCompany, 1 Dispatcher, 10 Drivers, 10 Trucks,
 *        4 VirtualHubs, 15 Deliveries, 5 OptimizedRoutes,
 *        5 EWayBills, 5 Transactions, 3 ConsolidationRuns, 2 Shipments
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('\n🌱 FairRelay Full Seed — Starting...\n');

  // ── 1. COURIER COMPANY ──────────────────────────────────────────────────
  console.log('📦 Creating Courier Company...');
  const company = await prisma.courierCompany.upsert({
    where: { code: 'FRL-001' },
    update: {},
    create: {
      name: 'FairRelay Logistics Pvt Ltd',
      code: 'FRL-001',
      isActive: true,
      adminEmail: 'admin@fairrelay.in',
      adminPhone: '+919876543210',
      gstin: '27AABCF1234A1Z5',
    },
  });
  console.log(`   ✅ Company: ${company.name} (${company.id})`);

  // ── 2. DISPATCHER ────────────────────────────────────────────────────────
  console.log('👤 Creating Dispatcher...');
  const dispatcher = await prisma.user.upsert({
    where: { phone: '+919876543210' },
    update: {},
    create: {
      name: 'Arjun Singh',
      phone: '+919876543210',
      role: 'DISPATCHER',
      status: 'ON_DUTY',
      registrationStatus: 'APPROVED',
      courierCompanyId: company.id,
    },
  });
  console.log(`   ✅ Dispatcher: ${dispatcher.name}`);

  // ── 3. DRIVERS ───────────────────────────────────────────────────────────
  console.log('🚚 Creating 10 Drivers...');
  const driverData = [
    { name: 'Rahul Kumar',    phone: '+919000000001', dist: 1200, hours: 148, gender: 'M', hoursToday: 6,  hoursSinceRest: 8,  wellnessScore: 72, totalEarnings: 45000, weeklyEarnings: 8200,  homeBaseCity: 'Mumbai' },
    { name: 'Amit Sharma',    phone: '+919000000002', dist: 80,   hours: 12,  gender: 'M', hoursToday: 2,  hoursSinceRest: 18, wellnessScore: 95, totalEarnings: 8000,  weeklyEarnings: 2100,  homeBaseCity: 'Mumbai' },
    { name: 'Suresh Patel',   phone: '+919000000003', dist: 520,  hours: 64,  gender: 'M', hoursToday: 4,  hoursSinceRest: 12, wellnessScore: 85, totalEarnings: 22000, weeklyEarnings: 4800,  homeBaseCity: 'Pune'   },
    { name: 'Vikram Nair',    phone: '+919000000004', dist: 810,  hours: 95,  gender: 'M', hoursToday: 7,  hoursSinceRest: 9,  wellnessScore: 68, totalEarnings: 33000, weeklyEarnings: 6500,  homeBaseCity: 'Pune'   },
    { name: 'Priya Reddy',    phone: '+919000000005', dist: 110,  hours: 18,  gender: 'F', hoursToday: 3,  hoursSinceRest: 20, wellnessScore: 97, totalEarnings: 11000, weeklyEarnings: 3200,  homeBaseCity: 'Mumbai' },
    { name: 'Deepak Yadav',   phone: '+919000000006', dist: 340,  hours: 42,  gender: 'M', hoursToday: 5,  hoursSinceRest: 14, wellnessScore: 88, totalEarnings: 16500, weeklyEarnings: 3900,  homeBaseCity: 'Nashik' },
    { name: 'Anil Gupta',     phone: '+919000000007', dist: 960,  hours: 112, gender: 'M', hoursToday: 8,  hoursSinceRest: 7,  wellnessScore: 60, totalEarnings: 38000, weeklyEarnings: 7100,  homeBaseCity: 'Mumbai' },
    { name: 'Sunil Tiwari',   phone: '+919000000008', dist: 25,   hours: 6,   gender: 'M', hoursToday: 1,  hoursSinceRest: 22, wellnessScore: 99, totalEarnings: 4000,  weeklyEarnings: 1100,  homeBaseCity: 'Thane'  },
    { name: 'Raj Malhotra',   phone: '+919000000009', dist: 430,  hours: 58,  gender: 'M', hoursToday: 4,  hoursSinceRest: 16, wellnessScore: 90, totalEarnings: 19000, weeklyEarnings: 4200,  homeBaseCity: 'Pune'   },
    { name: 'Vijay Bhosale',  phone: '+919000000010', dist: 670,  hours: 78,  gender: 'M', hoursToday: 6,  hoursSinceRest: 11, wellnessScore: 75, totalEarnings: 27500, weeklyEarnings: 5600,  homeBaseCity: 'Nashik' },
  ];

  const drivers = [];
  for (const d of driverData) {
    const driver = await prisma.user.upsert({
      where: { phone: d.phone },
      update: {},
      create: {
        name: d.name,
        phone: d.phone,
        role: 'DRIVER',
        status: d.dist > 500 ? 'IN_TRANSIT' : 'ON_DUTY',
        totalDistanceKm: d.dist,
        totalHoursWorked: d.hours,
        hoursToday: d.hoursToday,
        hoursSinceRest: d.hoursSinceRest,
        wellnessScore: d.wellnessScore,
        gender: d.gender,
        totalEarnings: d.totalEarnings,
        weeklyEarnings: d.weeklyEarnings,
        homeBaseCity: d.homeBaseCity,
        courierCompanyId: company.id,
        registrationStatus: 'APPROVED',
        rating: 3.5 + Math.random() * 1.5,
        deliveriesCount: Math.floor(d.dist / 25),
        credits: Math.floor(d.totalEarnings / 500),
        totalCreditsEarned: Math.floor(d.totalEarnings / 400),
      },
    });
    drivers.push(driver);
    process.stdout.write(`   ✅ ${driver.name}\n`);
    await sleep(200);
  }

  // ── 4. TRUCKS ────────────────────────────────────────────────────────────
  console.log('\n🚛 Creating 10 Trucks...');
  const truckSpecs = [
    { plate: 'MH-01-AB-1001', model: 'Tata Ultra 1918',   maxW: 6000, maxV: 2400, fuel: 'DIESEL',   lat: 19.1234, lng: 72.8765, co2: 0.28 },
    { plate: 'MH-01-AB-1002', model: 'Mahindra Blazo X28', maxW: 2800, maxV: 900,  fuel: 'DIESEL',   lat: 19.0760, lng: 72.8777, co2: 0.22 },
    { plate: 'MH-12-CD-2001', model: 'Tata Ace Gold',      maxW: 750,  maxV: 280,  fuel: 'CNG',      lat: 18.5204, lng: 73.8567, co2: 0.10 },
    { plate: 'MH-12-CD-2002', model: 'Ashok Leyland Dost', maxW: 1500, maxV: 520,  fuel: 'DIESEL',   lat: 18.5204, lng: 73.8567, co2: 0.18 },
    { plate: 'MH-15-EF-3001', model: 'Tata LPT 1615',     maxW: 8000, maxV: 3200, fuel: 'DIESEL',   lat: 20.0059, lng: 73.7898, co2: 0.32 },
    { plate: 'MH-15-EF-3002', model: 'BharatBenz 1415R',   maxW: 5000, maxV: 2000, fuel: 'DIESEL',   lat: 19.9975, lng: 73.7898, co2: 0.26 },
    { plate: 'MH-04-GH-4001', model: 'Tata Ace EV',        maxW: 600,  maxV: 200,  fuel: 'ELECTRIC', lat: 19.0176, lng: 72.8562, co2: 0.00 },
    { plate: 'MH-04-GH-4002', model: 'Piaggio Ape E-City', maxW: 450,  maxV: 150,  fuel: 'ELECTRIC', lat: 19.0330, lng: 73.0297, co2: 0.00 },
    { plate: 'MH-43-IJ-5001', model: 'Eicher Pro 3015',    maxW: 3500, maxV: 1400, fuel: 'DIESEL',   lat: 18.5971, lng: 73.7412, co2: 0.21 },
    { plate: 'MH-43-IJ-5002', model: 'Force Traveller 26', maxW: 2000, maxV: 750,  fuel: 'CNG',      lat: 18.6298, lng: 73.7997, co2: 0.12 },
  ];

  const trucks = [];
  for (let i = 0; i < truckSpecs.length; i++) {
    const spec = truckSpecs[i];
    const truck = await prisma.truck.upsert({
      where: { licensePlate: spec.plate },
      update: {},
      create: {
        licensePlate: spec.plate,
        model: spec.model,
        maxWeight: spec.maxW,
        maxVolume: spec.maxV,
        currentWeight: 0,
        currentVolume: 0,
        fuelType: spec.fuel,
        co2PerKm: spec.co2,
        fuelConsumption: spec.co2 > 0 ? 12 + Math.random() * 6 : 0,
        isAvailable: true,
        currentLat: spec.lat,
        currentLng: spec.lng,
        ownerId: drivers[i].id,
        courierCompanyId: company.id,
        registrationStatus: 'APPROVED',
        gstin: company.gstin,
      },
    });
    trucks.push(truck);
    process.stdout.write(`   ✅ ${truck.licensePlate} — ${spec.model}\n`);
    await sleep(200);
  }

  // ── 5. VIRTUAL HUBS ──────────────────────────────────────────────────────
  console.log('\n📍 Creating Virtual Hubs...');
  const hubsData = [
    { name: 'Mumbai North Hub',    lat: 19.1234, lng: 72.8765, type: 'VIRTUAL',  radius: 5  },
    { name: 'Navi Mumbai Hub',     lat: 19.0330, lng: 73.0297, type: 'VIRTUAL',  radius: 4  },
    { name: 'Lonavala Midpoint',   lat: 18.7481, lng: 73.4072, type: 'VIRTUAL',  radius: 3  },
    { name: 'Pune West Hub',       lat: 18.5204, lng: 73.8567, type: 'PHYSICAL', radius: 6  },
    { name: 'Nashik Distribution', lat: 20.0059, lng: 73.7898, type: 'PHYSICAL', radius: 7  },
  ];
  const hubs = [];
  for (const h of hubsData) {
    const hub = await prisma.virtualHub.create({
      data: { name: h.name, latitude: h.lat, longitude: h.lng, type: h.type, radius: h.radius },
    });
    hubs.push(hub);
    process.stdout.write(`   ✅ ${hub.name}\n`);
    await sleep(100);
  }

  // ── 6. OPTIMIZED ROUTES ──────────────────────────────────────────────────
  console.log('\n🗺️  Creating Optimized Routes...');
  const routeStatuses = ['ACTIVE', 'ACTIVE', 'COMPLETED', 'PENDING', 'COMPLETED'];
  const routes = [];
  for (let i = 0; i < 5; i++) {
    const baseline = 150 + i * 20;
    const actual   = Math.round(baseline * 0.82);
    const weight   = 1200 + i * 350;
    const truck    = trucks[i];
    const driver   = drivers[i];
    const util     = Math.min((weight / truck.maxWeight) * 100, 98);

    const route = await prisma.optimizedRoute.create({
      data: {
        courierCompanyId: company.id,
        truckId: truck.id,
        driverId: driver.id,
        status: routeStatuses[i],
        routePolyline: 'a~l~Fjk_uOnud@u_q@h{m@pzh@v_u@~_q@',
        totalDistance: actual,
        totalDuration: 160 + i * 20,
        baselineDistance: baseline,
        carbonSaved: parseFloat(((baseline - actual) * (truck.co2PerKm || 0.22)).toFixed(2)),
        emptyMilesSaved: baseline - actual,
        totalPackages: 4 + i,
        totalWeight: weight,
        totalVolume: Math.round(weight * 0.4),
        utilizationPercent: parseFloat(util.toFixed(1)),
        estimatedStartTime: new Date(Date.now() - i * 3600000),
        estimatedEndTime: new Date(Date.now() + (4 - i) * 3600000),
        isTSPOptimized: true,
        waypoints: [
          { name: 'Mumbai Hub',   lat: 19.1234, lng: 72.8765 },
          { name: 'Lonavala',     lat: 18.7481, lng: 73.4072 },
          { name: 'Pune',         lat: 18.5204, lng: 73.8567 },
        ],
        ...(routeStatuses[i] === 'ACTIVE'    ? { startedAt: new Date(Date.now() - 3600000) } : {}),
        ...(routeStatuses[i] === 'COMPLETED' ? { startedAt: new Date(Date.now() - 7200000), completedAt: new Date(Date.now() - 3600000) } : {}),
      },
    });
    routes.push(route);
    process.stdout.write(`   ✅ Route ${i + 1}: ${driver.name} → ${actual} km (${util.toFixed(0)}% util, saved ${route.carbonSaved} kg CO₂)\n`);
    await sleep(200);
  }

  // ── 7. DELIVERIES ────────────────────────────────────────────────────────
  console.log('\n📦 Creating 15 Deliveries...');
  const cargoTypes  = ['ELECTRONICS', 'PHARMA', 'FOOD', 'TEXTILES', 'CHEMICALS', 'AUTO_PARTS', 'FMCG'];
  const origins     = [
    { loc: 'Mumbai Central Warehouse', lat: 18.9712, lng: 72.8202 },
    { loc: 'Thane Industrial Area',    lat: 19.2183, lng: 72.9781 },
    { loc: 'Navi Mumbai Depot',        lat: 19.0330, lng: 73.0297 },
  ];
  const destinations = [
    { loc: 'Pune Kothrud Hub',         lat: 18.5089, lng: 73.8148 },
    { loc: 'Nashik Road Depot',        lat: 19.9975, lng: 73.7898 },
    { loc: 'Lonavala Distribution',    lat: 18.7481, lng: 73.4072 },
    { loc: 'Kolhapur Warehouse',       lat: 16.7050, lng: 74.2433 },
  ];
  const delivStatuses = ['IN_TRANSIT','IN_TRANSIT','IN_TRANSIT','PENDING','PENDING','PENDING','PENDING','ALLOCATED','ALLOCATED','COMPLETED','COMPLETED','COMPLETED','COMPLETED','CARGO_LOADED','EN_ROUTE_TO_PICKUP'];

  const deliveries = [];
  for (let i = 0; i < 15; i++) {
    const orig = origins[i % origins.length];
    const dest = destinations[i % destinations.length];
    const cargo = cargoTypes[i % cargoTypes.length];
    const weight = 80 + i * 60;
    const volume = weight * 0.35;
    const dist   = 120 + i * 15;

    const delivery = await prisma.delivery.create({
      data: {
        dispatcherId: dispatcher.id,
        driverId: drivers[i % 8].id,
        truckId: trucks[i % 8].id,
        courierCompanyId: company.id,
        packageId: `PKG-FRL-${2025 + i}`,
        pickupLocation: orig.loc,
        pickupLat: orig.lat,
        pickupLng: orig.lng,
        dropLocation: dest.loc,
        dropLat: dest.lat,
        dropLng: dest.lng,
        cargoType: cargo,
        cargoWeight: weight,
        cargoVolumeLtrs: volume,
        distanceKm: dist,
        status: delivStatuses[i],
        baseEarnings: dist * 8,
        totalEarnings: dist * 8,
        carbonEmitted: parseFloat((dist * 0.22).toFixed(2)),
        baselineDistance: dist * 1.18,
        packageCount: 1 + (i % 4),
        ...(delivStatuses[i] === 'COMPLETED' ? {
          completedAt: new Date(Date.now() - (i * 3600000)),
          dropTime: new Date(Date.now() - (i * 3600000)),
        } : {}),
      },
    });
    deliveries.push(delivery);
    process.stdout.write(`   ✅ ${delivery.packageId}: ${cargo} — ${orig.loc.split(' ')[0]} → ${dest.loc.split(' ')[0]} [${delivStatuses[i]}]\n`);
    await sleep(150);
  }

  // ── 8. E-WAY BILLS ───────────────────────────────────────────────────────
  console.log('\n📋 Creating E-Way Bills...');
  const ewbStatuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'EXPIRING_SOON', 'INACTIVE'];
  for (let i = 0; i < 5; i++) {
    await prisma.eWayBill.create({
      data: {
        billNo: `EWB-${700000 + i * 111}`,
        vehicleNo: trucks[i].licensePlate,
        from: i % 2 === 0 ? 'Mumbai' : 'Pune',
        to: i % 2 === 0 ? 'Pune' : 'Nashik',
        distance: `${130 + i * 20} km`,
        driverId: drivers[i].id,
        cargoValue: `₹${(2 + i * 0.5).toFixed(1)} Lakh`,
        validUntil: new Date(Date.now() + (i === 3 ? 1 : 7) * 86400000),
        status: ewbStatuses[i],
      },
    });
    process.stdout.write(`   ✅ EWB-${700000 + i * 111}: ${trucks[i].licensePlate}\n`);
    await sleep(150);
  }

  // ── 9. TRANSACTIONS ──────────────────────────────────────────────────────
  console.log('\n💰 Creating Transactions...');
  const txTypes = ['BASE_DELIVERY', 'MARKETPLACE_BONUS', 'ABSORPTION_BONUS', 'FUEL_SURCHARGE', 'BONUS'];
  for (let i = 0; i < 5; i++) {
    await prisma.transaction.create({
      data: {
        driverId: drivers[i].id,
        deliveryId: deliveries[i + 9].id,  // completed deliveries
        amount: 500 + i * 120,
        type: txTypes[i],
        description: `Payment for delivery ${deliveries[i + 9].packageId}`,
        route: `${origins[i % 3].loc.split(' ')[0]} → ${destinations[i % 4].loc.split(' ')[0]}`,
      },
    });
    process.stdout.write(`   ✅ ${txTypes[i]}: ₹${500 + i * 120} → ${drivers[i].name}\n`);
    await sleep(150);
  }

  // ── 10. CONSOLIDATION RUNS ───────────────────────────────────────────────
  console.log('\n🤖 Creating ConsolidationRuns...');
  const consolidations = [
    { shipments: 8,  groups: 3, trucks: 3, uBefore: 52, uAfter: 81, trips: 5, distSaved: 210, co2Saved: 46, costSaved: 18.2, scenario: 'Balanced' },
    { shipments: 12, groups: 4, trucks: 4, uBefore: 48, uAfter: 79, trips: 8, distSaved: 340, co2Saved: 74, costSaved: 22.5, scenario: 'Aggressive' },
    { shipments: 6,  groups: 2, trucks: 2, uBefore: 60, uAfter: 88, trips: 4, distSaved: 150, co2Saved: 33, costSaved: 14.8, scenario: 'Tight' },
  ];
  for (const c of consolidations) {
    await prisma.consolidationRun.create({
      data: {
        totalShipments: c.shipments,
        totalGroups: c.groups,
        totalTrucks: c.trucks,
        utilizationBefore: c.uBefore,
        utilizationAfter: c.uAfter,
        tripsReduced: c.trips,
        distanceSavedKm: c.distSaved,
        carbonSavedKg: c.co2Saved,
        costSavedPercent: c.costSaved,
        scenarioName: c.scenario,
        inputPayload: { shipmentCount: c.shipments },
        resultPayload: { groups: c.groups, efficiency: c.uAfter },
      },
    });
    process.stdout.write(`   ✅ ${c.scenario}: ${c.shipments} shipments → ${c.groups} groups, ${c.distSaved} km saved\n`);
    await sleep(150);
  }

  // ── SUMMARY ──────────────────────────────────────────────────────────────
  console.log('\n' + '═'.repeat(60));
  console.log('🎉 FairRelay Database Seeded Successfully!\n');
  console.log('  📊 Summary:');
  console.log(`     1  Courier Company`);
  console.log(`     1  Dispatcher`);
  console.log(`     ${drivers.length}  Drivers (varied wellness scores & workloads)`);
  console.log(`     ${trucks.length}  Trucks (Diesel, CNG & Electric)`);
  console.log(`     ${hubs.length}  Virtual Hubs`);
  console.log(`     ${routes.length}  Optimized Routes`);
  console.log(`     ${deliveries.length}  Deliveries (mixed statuses)`);
  console.log(`     5  E-Way Bills`);
  console.log(`     5  Transactions`);
  console.log(`     3  Consolidation Runs`);
  console.log('\n  Open the dashboard at http://localhost:5174/\n');
  console.log('═'.repeat(60) + '\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
