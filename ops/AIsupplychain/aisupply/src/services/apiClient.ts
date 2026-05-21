import axios from "axios";

// In production, use VITE_API_URL (Render backend URL)
// In development, use /api (Vite proxy -> localhost:3000)
const BASE_URL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

// Add request interceptor to include auth token
apiClient.interceptors.request.use((config) => {
  // Try to get token from localStorage
  const token = localStorage.getItem("authToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 403: clear invalid token and allow UI to show login message
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 403) {
      const msg = String(error.response?.data?.message ?? "");
      const isInvalidToken =
        /invalid token|token expired/i.test(msg) || !error.config?.headers?.Authorization;
      if (isInvalidToken) {
        localStorage.removeItem("authToken");
      }
      // Attach a friendly message for UI
      error.friendlyMessage =
        isInvalidToken
          ? "Session expired or invalid. Please log in again."
          : "You don’t have permission for this action. Assign Tasks and Absorption require a Dispatcher account.";
    }
    return Promise.reject(error);
  },
);

// --- Authentication ---
export const sendOTP = async (
  phone: string,
  role: "DRIVER" | "SHIPPER" | "DISPATCHER" = "DISPATCHER",
) => {
  const response = await apiClient.post("/otp/send", {
    phone,
    role,
  });
  return response.data;
};

export const verifyOTP = async (
  phone: string,
  otp: string,
  role: "DRIVER" | "SHIPPER" | "DISPATCHER" = "DISPATCHER",
) => {
  const response = await apiClient.post("/otp/verify", {
    phone,
    otp,
    role,
  });
  return response.data;
};

export const getProfile = async () => {
  const response = await apiClient.get("/auth/profile");
  return response.data;
};

export const refreshToken = async (refreshToken: string) => {
  const response = await apiClient.post("/auth/refresh-token", {
    refreshToken,
  });
  return response.data;
};

// --- Dashboard ---
export const getDashboardStats = async () => {
  const response = await apiClient.get("/dashboard/stats");
  return response.data;
};

export const getDashboardActivity = async () => {
  const response = await apiClient.get("/dashboard/activity");
  return response.data;
};

export const getLiveTracking = async () => {
  const response = await apiClient.get("/dashboard/live-tracking-web");
  return response.data;
};

export const getLiveTrackingGPS = async () => {
  const response = await apiClient.get("/dashboard/live-tracking-gps");
  return response.data;
};

export const getActiveRoute = async (truckId: string) => {
  const response = await apiClient.get(`/drivers/${truckId}/active-route`);
  return response.data;
};

export const getRecentAbsorptions = async () => {
  const response = await apiClient.get("/dashboard/recent-absorptions");
  return response.data;
};

// --- Drivers
export const getAllDrivers = async () => {
  const response = await apiClient.get("/drivers");
  return response.data;
};

export const getDriverById = async (id: string) => {
  const response = await apiClient.get(`/drivers/${id}`);
  return response.data;
};

export const createDriver = async (driverData: any) => {
  const response = await apiClient.post("/drivers", driverData);
  return response.data;
};

export const updateDriver = async (id: string, driverData: any) => {
  const response = await apiClient.put(`/drivers/${id}`, driverData);
  return response.data;
};

export const deleteDriver = async (id: string) => {
  const response = await apiClient.delete(`/drivers/${id}`);
  return response.data;
};

// --- Absorption Requests ---
export const getAllRequests = async () => {
  const response = await apiClient.get("/absorption/active");
  return response.data;
};

export const updateRequestStatus = async (
  id: string,
  action: "APPROVED" | "REJECTED",
) => {
  const endpoint =
    action === "APPROVED"
      ? "/synergy/dispatcher-accept"
      : "/synergy/dispatcher-reject";
  const response = await apiClient.post(endpoint, {
    opportunityId: id,
    dispatcherId: localStorage.getItem("userId") || "",
  });
  return response.data;
};

export const getRecommendedDrivers = async (id: string) => {
  const response = await apiClient.get(
    `/absorption-requests/${id}/recommendations`,
  );
  return response.data;
};

// --- Absorption (New) ---
export const getAbsorptionMapData = async () => {
  const response = await apiClient.get("/absorption/map-data");
  return response.data;
};

export const getActiveAbsorptions = async () => {
  const response = await apiClient.get("/absorption/active");
  return response.data;
};

// --- E-Way Bills ---
export const getAllBills = async () => {
  const response = await apiClient.get("/eway-bills");
  return response.data;
};

export const createBill = async (billData: any) => {
  const response = await apiClient.post("/eway-bills", billData);
  return response.data;
};

export const getEWayBillsStats = async () => {
  const response = await apiClient.get("/eway-bills/stats");
  return response.data;
};

export const updateEWayBill = async (id: string, billData: any) => {
  const response = await apiClient.put(`/eway-bills/${id}`, billData);
  return response.data;
};

export const deleteEWayBill = async (id: string) => {
  const response = await apiClient.delete(`/eway-bills/${id}`);
  return response.data;
};

// --- Packages ---
export const getPackageHistory = async () => {
  const response = await apiClient.get("/packages/history-web");
  return response.data;
};

export const getPackages = async () => {
  const response = await apiClient.get("/packages");
  return response.data;
};


// --- Shipments (Packages) ---
export const createShipment = async (shipmentData: any) => {
  const response = await apiClient.post("/shipments/create", shipmentData);
  return response.data;
};

export const getMyShipments = async () => {
  const response = await apiClient.get("/shipments/my-shipments");
  return response.data;
};

// --- Deliveries ---
export const createDelivery = async (deliveryData: any) => {
  const response = await apiClient.post("/deliveries/create", deliveryData);
  return response.data;
};

export const getUnassignedDeliveries = async (courierCompanyId: string) => {
  const response = await apiClient.get(
    `/deliveries/unassigned?courierCompanyId=${courierCompanyId}`,
  );
  return response.data;
};

export const assignMultiStopTask = async (payload: any) => {
  const response = await apiClient.post("/routes/assign-multi-stop", payload);
  return response.data;
};

// --- Virtual Hubs ---
export const getAllVirtualHubs = async () => {
  const response = await apiClient.get("/virtual-hubs");
  return response.data;
};

export const createVirtualHub = async (hubData: any) => {
  const response = await apiClient.post("/virtual-hubs", hubData);
  return response.data;
};

export const deleteVirtualHub = async (id: string) => {
  const response = await apiClient.delete(`/virtual-hubs/${id}`);
  return response.data;
};

// ====== AI Dispatch (Brain) ======
export const runFairAllocation = async (allocationData: any) => {
  const response = await apiClient.post("/dispatch/allocate", allocationData);
  return response.data;
};

export const getDispatchRuns = async () => {
  const response = await apiClient.get("/dispatch/runs");
  return response.data;
};

export const getDispatchRun = async (runId: string) => {
  const response = await apiClient.get(`/dispatch/runs/${runId}`);
  return response.data;
};

export const getDispatchDrivers = async () => {
  const response = await apiClient.get("/dispatch/drivers");
  return response.data;
};

export const getDispatchDriverById = async (id: string) => {
  const response = await apiClient.get(`/dispatch/drivers/${id}`);
  return response.data;
};

export const getDispatchRouteById = async (id: string) => {
  const response = await apiClient.get(`/dispatch/routes/${id}`);
  return response.data;
};

export const submitDriverFeedback = async (feedbackData: any) => {
  const response = await apiClient.post("/dispatch/feedback", feedbackData);
  return response.data;
};

export const getDispatchHealth = async () => {
  const response = await apiClient.get("/dispatch/health");
  return response.data;
};

// ====== Wellness Scoring ======
export const checkDriverWellness = async (drivers: any[]) => {
  const response = await apiClient.post("/dispatch/wellness-check", { drivers });
  return response.data;
};

// ====== Carbon Calculation ======
export const calculateCarbon = async (routes: any[]) => {
  const response = await apiClient.post("/dispatch/carbon-calculate", { routes });
  return response.data;
};

// ====== Night Safety ======
export const checkNightSafety = async (drivers: any[], currentHour?: number) => {
  const response = await apiClient.post("/dispatch/night-safety-filter", { drivers, currentHour });
  return response.data;
};

// ====== Cognitive Load Index ======
export const getDriverCognitive = async (driverId: string) => {
  const response = await apiClient.get(`/wellness/cognitive/${driverId}`);
  return response.data;
};

export const getFleetCognitiveSummary = async () => {
  const response = await apiClient.get("/wellness/cognitive-fleet");
  return response.data;
};

// ====== Load Consolidation ======
export const runConsolidationOptimize = async (payload: {
  shipments: any[];
  trucks: any[];
  options?: any;
}) => {
  const response = await apiClient.post("/consolidation/optimize", payload);
  return response.data;
};

export const runConsolidationSimulate = async (payload: {
  shipments: any[];
  trucks: any[];
  scenarios: any[];
}) => {
  const response = await apiClient.post("/consolidation/simulate", payload);
  return response.data;
};

export const getConsolidationHistory = async () => {
  const response = await apiClient.get("/consolidation/history");
  return response.data;
};

export const getConsolidationDemo = async () => {
  const response = await apiClient.get("/consolidation/demo");
  return response.data;
};

// ====== Route Optimization (direct brain call) ======
const BRAIN_URL = 'https://fairrelay-brain-gdm1.onrender.com';

export const runRouteOptimize = async (payload: {
  routes: { id: string; stops: { id: string; latitude: number; longitude: number; weight_kg?: number }[] }[];
  warehouse_lat: number;
  warehouse_lng: number;
  speed_kmh?: number;
}) => {
  const res = await fetch(`${BRAIN_URL}/api/v1/routes/optimize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`Brain optimize ${res.status}`);
  return res.json();
};

// ====== Dynamic Route Insertion ======
export const dynamicInsertStop = async (payload: {
  route_stops: { id: string; latitude: number; longitude: number }[];
  new_stop: { id: string; latitude: number; longitude: number };
  warehouse_lat: number;
  warehouse_lng: number;
}) => {
  const response = await apiClient.post("/routes/dynamic-insert", payload);
  return response.data;
};

export default apiClient;
