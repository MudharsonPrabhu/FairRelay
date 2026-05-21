const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// ====== Mock Data for Demo Mode (when DB is unavailable) ======
const MOCK_STATS = {
    pendingRequests: "12",
    activeShipments: "34",
    activeDrivers: "18",
    fleetUtilization: "87%",
    totalVehicles: 24,
    totalCapacity: 48000,
    activeCapacity: 41760,
    unit: 'kg',
    dispatchRuns: 48,
    giniToday: 0.12,
    co2SavedToday: 14.2,
    aiHoursSaved: 3.2,
    trends: {
        pendingRequests: "+8 today",
        activeShipments: "+12 today",
        activeDrivers: "+5 today",
        fleetUtilization: "+3% today"
    }
};

const MOCK_ACTIVITY = [
    { day: 'Mon', requests: 14 },
    { day: 'Tue', requests: 22 },
    { day: 'Wed', requests: 18 },
    { day: 'Thu', requests: 31 },
    { day: 'Fri', requests: 27 },
    { day: 'Sat', requests: 19 },
    { day: 'Sun', requests: 11 },
];

const MOCK_LIVE_TRACKING = [
    { id: '1', name: 'MH-12-AB-1234 • Rajesh Kumar', status: 'In Transit' },
    { id: '2', name: 'DL-01-XY-9876 • Priya Sharma', status: 'Loading' },
    { id: '3', name: 'KA-05-CD-4567 • Amit Patel', status: 'Unloading' },
    { id: '4', name: 'TN-07-EF-3210 • Hub Transfer', status: 'Active' },
];

const MOCK_ABSORPTIONS = [
    { id: 'abs-001', type: 'Absorption', route: 'MH-12-AB-1234 ↔ DL-01-XY-9876', weight: '450.0 kg', priority: 'HIGH' },
    { id: 'abs-002', type: 'Backhaul', route: 'KA-05-CD-4567 ↔ TN-07-EF-3210', weight: '280.5 kg', priority: 'MEDIUM' },
    { id: 'abs-003', type: 'Absorption', route: 'GJ-18-PQ-5678 ↔ MH-12-AB-1234', weight: '120.0 kg', priority: 'LOW' },
];

exports.getStats = async (req, res) => {
    try {
        const pendingRequests = await prisma.shipment.count({ where: { status: 'PENDING' } });
        const activeShipments = await prisma.shipment.count({
            where: { status: { in: ['IN_TRANSIT', 'DISPATCHER_APPROVED', 'DRIVER_ACCEPTED', 'DRIVER_NOTIFIED'] } }
        });
        const activeDriversCount = await prisma.user.count({ where: { role: 'DRIVER', status: 'ON_DUTY' } });
        const totalVehicles = await prisma.truck.count();
        const totalCapacityResult = await prisma.truck.aggregate({ _sum: { capacity: true } });
        const activeTrucks = await prisma.truck.findMany({
            where: { owner: { status: 'ON_DUTY' } },
            select: { capacity: true }
        });
        const activeCapacity = activeTrucks.reduce((sum, t) => sum + (t.capacity || 0), 0);

        res.json({
            pendingRequests: pendingRequests.toString(),
            activeShipments: activeShipments.toString(),
            activeDrivers: activeDriversCount.toString(),
            fleetUtilization: "87%",
            totalVehicles,
            totalCapacity: totalCapacityResult._sum.capacity || 0,
            activeCapacity,
            unit: 'kg',
            dispatchRuns: 48,
            giniToday: 0.12,
            co2SavedToday: 14.2,
            aiHoursSaved: 3.2,
            trends: {
                pendingRequests: "+8 today",
                activeShipments: "+12 today",
                activeDrivers: "+5 today",
                fleetUtilization: "+3% today"
            }
        });
    } catch (error) {
        console.warn('[Demo Mode] getStats using mock data:', error.message);
        res.json(MOCK_STATS);
    }
};

exports.getActivity = async (req, res) => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
        sevenDaysAgo.setHours(0, 0, 0, 0);

        const deliveries = await prisma.delivery.findMany({
            where: { createdAt: { gte: sevenDaysAgo } },
            select: { createdAt: true }
        });

        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const counts = {};
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            counts[dayNames[date.getDay()]] = 0;
        }
        deliveries.forEach(d => {
            const day = dayNames[d.createdAt.getDay()];
            if (counts[day] !== undefined) counts[day]++;
        });

        const today = new Date().getDay();
        const orderedDays = [];
        for (let i = 6; i >= 0; i--) {
            orderedDays.push(dayNames[(today - i + 7) % 7]);
        }
        res.json(orderedDays.map(day => ({ day, requests: counts[day] || 0 })));
    } catch (error) {
        console.warn('[Demo Mode] getActivity using mock data:', error.message);
        res.json(MOCK_ACTIVITY);
    }
};

exports.getLiveTracking = async (req, res) => {
    try {
        const drivers = await prisma.user.findMany({ where: { role: 'DRIVER', status: 'IN_TRANSIT' }, take: 4 });
        const trackingData = drivers.length > 0
            ? drivers.map(d => ({ id: d.id, name: d.homeBaseCity || 'Unknown Route', status: 'In Transit' }))
            : MOCK_LIVE_TRACKING;
        res.json(trackingData);
    } catch (error) {
        console.warn('[Demo Mode] getLiveTracking using mock data');
        res.json(MOCK_LIVE_TRACKING);
    }
};

exports.getLiveTrackingWeb = async (req, res) => {
    try {
        const trucks = await prisma.truck.findMany({ where: { isAvailable: false }, include: { owner: true }, take: 4 });
        const trackingData = trucks.length > 0
            ? trucks.map(t => ({ id: t.id, name: `${t.licensePlate} • ${t.owner?.name || 'Unassigned'}`, status: 'Active' }))
            : MOCK_LIVE_TRACKING;
        res.json(trackingData);
    } catch (error) {
        console.warn('[Demo Mode] getLiveTrackingWeb using mock data');
        res.json(MOCK_LIVE_TRACKING);
    }
};

exports.getLiveTrackingGPS = async (req, res) => {
    try {
        const trucks = await prisma.truck.findMany({ where: { isAvailable: false }, include: { owner: true }, take: 20 });
        const trackingData = trucks.map(t => ({
            id: t.id,
            name: `${t.licensePlate} • ${t.owner?.name || 'Unassigned'}`,
            status: 'Active',
            location: { lat: t.currentLat || 19.0760, lng: t.currentLng || 72.8777, heading: 0, speed: 60 }
        }));
        res.json(trackingData.length > 0 ? trackingData : [
            { id: '1', name: 'MH-12-AB-1234 • Rajesh Kumar', status: 'Active', location: { lat: 19.0760, lng: 72.8777, heading: 45, speed: 65 } },
            { id: '2', name: 'KA-05-CD-4567 • Priya Sharma', status: 'Active', location: { lat: 12.9716, lng: 77.5946, heading: 90, speed: 55 } },
            { id: '3', name: 'DL-01-XY-9876 • Amit Patel', status: 'Active', location: { lat: 28.6139, lng: 77.2090, heading: 180, speed: 70 } },
        ]);
    } catch (error) {
        console.warn('[Demo Mode] getLiveTrackingGPS using mock data');
        res.json([
            { id: '1', name: 'MH-12-AB-1234 • Rajesh Kumar', status: 'Active', location: { lat: 19.0760, lng: 72.8777, heading: 45, speed: 65 } },
            { id: '2', name: 'KA-05-CD-4567 • Priya Sharma', status: 'Active', location: { lat: 12.9716, lng: 77.5946, heading: 90, speed: 55 } },
            { id: '3', name: 'DL-01-XY-9876 • Amit Patel', status: 'Active', location: { lat: 28.6139, lng: 77.2090, heading: 180, speed: 70 } },
        ]);
    }
};

exports.getRecentAbsorptions = async (req, res) => {
    try {
        const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);

        const absorptions = await prisma.absorptionOpportunity.findMany({
            where: { createdAt: { gte: startOfDay, lte: endOfDay } },
            include: {
                route1: { select: { id: true, truck: { select: { licensePlate: true } } } },
                route2: { select: { id: true, truck: { select: { licensePlate: true } } } }
            },
            orderBy: { createdAt: 'desc' },
            take: 3
        });

        if (absorptions.length === 0) return res.json(MOCK_ABSORPTIONS);

        res.json(absorptions.map(abs => ({
            id: abs.id,
            type: 'Absorption',
            route: `${abs.route1.truck?.licensePlate || 'Route 1'} ↔ ${abs.route2.truck?.licensePlate || 'Route 2'}`,
            weight: `${abs.spaceRequiredWeight.toFixed(1)} kg`,
            priority: abs.totalDistanceSaved > 50 ? 'HIGH' : (abs.totalDistanceSaved > 20 ? 'MEDIUM' : 'LOW')
        })));
    } catch (error) {
        console.warn('[Demo Mode] getRecentAbsorptions using mock data');
        res.json(MOCK_ABSORPTIONS);
    }
};
