import { useState, useEffect } from "react";
import { CheckCircle, XCircle, AlertCircle, Clock, Repeat2, Star, Brain } from "lucide-react";
import { AbsorptionMap } from "../components/AbsorptionMap";
import { useToast } from "../context/ToastContext";
import {
  getAllRequests,
  getRecommendedDrivers,
  updateRequestStatus,
} from "../services/apiClient";

// ── Mock data shown when backend is offline ────────────────────────────────────
const MOCK_REQUESTS = [
  { id: 'abs-001', displayId: 'ABS-001', status: 'PENDING',     truck1: 'MH-12-AB-1234', truck2: 'KA-05-XY-9876', weight: '2.4T', type: 'BACKHAUL', priority: 'HIGH',   distanceSaved: 47, carbonSaved: 18.6, route: 'Mumbai → Pune' },
  { id: 'abs-002', displayId: 'ABS-002', status: 'PENDING',     truck1: 'DL-01-GH-5678', truck2: 'MH-43-PQ-3322', weight: '1.1T', type: 'PARTIAL',  priority: 'MEDIUM', distanceSaved: 23, carbonSaved: 9.2,  route: 'Delhi → Jaipur' },
  { id: 'abs-003', displayId: 'ABS-003', status: 'PENDING',     truck1: 'TN-09-CD-4411', truck2: 'AP-28-MN-7755', weight: '3.0T', type: 'FULL',     priority: 'HIGH',   distanceSaved: 61, carbonSaved: 24.4, route: 'Chennai → Bangalore' },
  { id: 'abs-004', displayId: 'ABS-004', status: 'IN_TRANSIT',  truck1: 'GJ-05-BC-7731', truck2: 'RJ-14-KL-4422', weight: '1.8T', type: 'BACKHAUL', priority: 'MEDIUM', distanceSaved: 35, carbonSaved: 13.9, route: 'Surat → Ahmedabad' },
  { id: 'abs-005', displayId: 'ABS-005', status: 'IN_TRANSIT',  truck1: 'KA-01-MN-8855', truck2: 'TN-07-PQ-2211', weight: '2.2T', type: 'PARTIAL',  priority: 'LOW',    distanceSaved: 28, carbonSaved: 11.1, route: 'Mysore → Salem' },
  { id: 'abs-006', displayId: 'ABS-006', status: 'AWAITING',    truck1: 'MH-02-XY-9944', truck2: 'MH-12-AB-3366', weight: '0.9T', type: 'FULL',     priority: 'HIGH',   distanceSaved: 19, carbonSaved: 7.6,  route: 'Thane → Nashik' },
  { id: 'abs-007', displayId: 'ABS-007', status: 'COMPLETED',   truck1: 'UP-80-GH-1122', truck2: 'HR-26-CD-7789', weight: '3.5T', type: 'BACKHAUL', priority: 'HIGH',   distanceSaved: 82, carbonSaved: 32.8, route: 'Noida → Gurugram' },
  { id: 'abs-008', displayId: 'ABS-008', status: 'COMPLETED',   truck1: 'WB-06-EF-3344', truck2: 'BR-01-MN-6677', weight: '1.4T', type: 'PARTIAL',  priority: 'MEDIUM', distanceSaved: 44, carbonSaved: 17.6, route: 'Kolkata → Patna' },
];

const MOCK_DRIVERS = [
  { id: 'd1', name: 'Arjun Kumar', vehicleType: 'DIESEL', rating: 4.8 },
  { id: 'd2', name: 'Priya Sharma', vehicleType: 'ELECTRIC', rating: 4.9 },
];

const STATUS_TABS = [
  { key: 'PENDING',    label: 'Pending',      Icon: Clock,      color: 'text-amber-400',  bg: 'bg-amber-500/10',   border: 'border-amber-500/30' },
  { key: 'IN_TRANSIT', label: 'In Transit',   Icon: Repeat2,    color: 'text-blue-400',   bg: 'bg-blue-500/10',    border: 'border-blue-500/30'  },
  { key: 'AWAITING',   label: 'Awaiting Scan',Icon: AlertCircle,color: 'text-orange-400', bg: 'bg-orange-500/10',  border: 'border-orange-500/30'},
  { key: 'COMPLETED',  label: 'Completed',    Icon: CheckCircle,color: 'text-emerald-400',bg: 'bg-emerald-500/10', border: 'border-emerald-500/30'},
];

export function AbsorptionRequests() {
  const { showToast } = useToast();
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<string>('PENDING');
  const [activeRequest, setActiveRequest] = useState<any | null>(null);
  const [recommendedDrivers, setRecommendedDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requests = allRequests.filter(r => r.status === activeTab);

  // Helper to refresh data
  const fetchData = async () => {
    try {
      setLoading(true);
      const requestsData = await getAllRequests();
      const validRequests = requestsData.length > 0 ? requestsData : MOCK_REQUESTS;
      setAllRequests(validRequests);
      const firstPending = validRequests.find((r: any) => r.status === 'PENDING') || validRequests[0];
      setActiveRequest(firstPending || null);
      if (firstPending?.id) {
        try {
          const drivers = await getRecommendedDrivers(firstPending.id);
          setRecommendedDrivers(drivers.length > 0 ? drivers : MOCK_DRIVERS);
        } catch {
          setRecommendedDrivers(MOCK_DRIVERS);
        }
      }
      setError(null);
    } catch (err: any) {
      setAllRequests(MOCK_REQUESTS);
      setActiveRequest(MOCK_REQUESTS[0]);
      setRecommendedDrivers(MOCK_DRIVERS);
      setError(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [showToast]);

  const handleStatusUpdate = async (action: "APPROVED" | "REJECTED") => {
    if (!activeRequest) return;
    const newStatus = action === "APPROVED" ? "COMPLETED" : "PENDING";
    const snapshot = [...allRequests];
    const remaining = allRequests.filter(r => r.id !== activeRequest.id && r.status === activeTab);

    try {
      await updateRequestStatus(activeRequest.id, action);
      setAllRequests(prev => prev.map(r => r.id === activeRequest.id ? { ...r, status: newStatus } : r));
      setActiveRequest(remaining[0] || null);
      showToast("Success", `Request ${action === "APPROVED" ? "Approved" : "Rejected"}`, "success");
    } catch (err: any) {
      if (err?.response?.status) {
        // Real backend error — rollback optimistic update
        setAllRequests(snapshot);
        showToast("Error", err.friendlyMessage || "Action failed. Please try again.", "error");
      } else {
        // Offline / demo — simulate success without rollback
        setAllRequests(prev => prev.map(r => r.id === activeRequest.id ? { ...r, status: newStatus } : r));
        setActiveRequest(remaining[0] || null);
        showToast("Success", `Request ${action === "APPROVED" ? "Approved" : "Rejected"}`, "success");
      }
    }
  };



  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-eco-brand-orange"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <AlertCircle className="w-12 h-12 text-eco-error mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Unavailable</h3>
        <p className="text-eco-text-secondary">{error}</p>
      </div>
    );
  }

  if (!activeRequest) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4 text-eco-text-secondary">
        <CheckCircle className="w-16 h-16 text-eco-success mb-4 opacity-50" />
        <h3 className="text-xl font-semibold text-white mb-2">All Caught Up</h3>
        <p>No pending absorption requests from the last 24 hours.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-orange-500/20 to-amber-500/20 rounded-xl border border-orange-500/30">
              <Repeat2 className="w-6 h-6 text-orange-400" />
            </div>
            Absorption Requests
          </h1>
          <p className="text-eco-text-secondary text-sm mt-1">Track and manage load absorption opportunities across fleet</p>
        </div>
        {/* Kanban tab counts */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map(tab => {
            const count = allRequests.filter(r => r.status === tab.key).length;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key);
                  const first = allRequests.find(r => r.status === tab.key);
                  setActiveRequest(first || null);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-sm font-medium transition-all ${
                  isActive
                    ? `${tab.bg} ${tab.border} ${tab.color}`
                    : 'bg-white/3 border-white/8 text-gray-400 hover:text-white hover:border-white/15'
                }`}
              >
                <tab.Icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${isActive ? tab.bg : 'bg-white/8'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* Requests List */}
        <div className="bg-eco-card rounded-xl border border-eco-card-border p-4 overflow-y-auto custom-scrollbar">
          <h3 className="text-white font-semibold mb-4">
            {STATUS_TABS.find(t => t.key === activeTab)?.label} ({requests.length})
          </h3>
          <div className="space-y-3">
            {requests.map((request: any) => (
              <div
                key={request.id}
                onClick={() => {
                  setActiveRequest(request);
                  if (request.id) {
                    getRecommendedDrivers(request.id)
                      .then(setRecommendedDrivers)
                      .catch(() => setRecommendedDrivers([]));
                  }
                }}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  activeRequest?.id === request.id
                    ? "bg-eco-brand-orange/20 border-eco-brand-orange/50 shadow-neon-orange"
                    : "border-eco-card-border hover:border-eco-brand-orange/30 hover:bg-eco-secondary/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-eco-brand-orange">{request.displayId}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                    request.priority === "HIGH" ? "bg-red-500/20 text-red-400"
                    : request.priority === "MEDIUM" ? "bg-orange-500/20 text-orange-400"
                    : "bg-gray-500/20 text-gray-400"
                  }`}>{request.priority || "MEDIUM"}</span>
                </div>
                <div className="text-xs text-white font-medium mt-1">{request.route || `${request.truck1} → ${request.truck2}`}</div>
                <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                  <span>{request.weight}</span>
                  <span>·</span>
                  <span>{request.type}</span>
                  {request.distanceSaved && <><span>·</span><span className="text-emerald-400">↓{request.distanceSaved}km</span></>}
                </div>
              </div>
            ))}
            {requests.length === 0 && (
              <div className="text-center text-gray-400 text-sm py-8">
                No pending requests
              </div>
            )}
          </div>
        </div>

        {/* Map and Details */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
          {/* Map Area */}
          <div className="bg-eco-card rounded-xl border border-eco-card-border p-6 relative overflow-hidden flex flex-col flex-1">
            <h2 className="text-lg font-semibold text-white mb-4">
              Live Route Visualization
            </h2>
            <div className="flex-1 rounded-xl overflow-hidden border border-eco-card-border">
              <AbsorptionMap />
            </div>
          </div>

          {/* Details Panel */}
          <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar flex-1">
            {/* Request Card */}
            <div className="bg-eco-card rounded-xl border border-eco-brand-orange/30 p-6 shadow-neon-orange relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-eco-brand-orange/5 rounded-full blur-2xl transform translate-x-8 -translate-y-8"></div>

              <div className="flex justify-between items-start mb-4 relative">
                <div>
                  <h3 className="text-eco-brand-orange font-bold text-lg">
                    Active Absorption Request
                  </h3>
                  <div className="text-eco-text-secondary text-sm">
                    {activeRequest?.displayId || "N/A"}
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    activeRequest?.status?.toUpperCase() === "PENDING"
                      ? "bg-eco-brand-orange/10 text-eco-brand-orange border-eco-brand-orange/20 animate-pulse"
                      : "bg-gray-700/50 text-gray-400 border-gray-600"
                  }`}
                >
                  {activeRequest?.status || "N/A"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4 relative">
                <div className="bg-eco-secondary/50 p-2 rounded-lg">
                  <div className="text-xs text-gray-500">Weight</div>
                  <div className="text-white font-semibold">
                    {activeRequest?.weight || "-"}
                  </div>
                </div>
                <div className="bg-eco-secondary/50 p-2 rounded-lg">
                  <div className="text-xs text-gray-500">Type</div>
                  <div className="text-white font-semibold">
                    {activeRequest?.type || "-"}
                  </div>
                </div>
                <div className="bg-eco-secondary/50 p-2 rounded-lg">
                  <div className="text-xs text-gray-500">Truck 1</div>
                  <div className="text-white font-semibold text-sm">
                    {activeRequest?.truck1 || "-"}
                  </div>
                </div>
                <div className="bg-eco-secondary/50 p-2 rounded-lg">
                  <div className="text-xs text-gray-500">Truck 2</div>
                  <div className="text-white font-semibold text-sm">
                    {activeRequest?.truck2 || "-"}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-center text-eco-brand-orange text-xs font-medium bg-eco-brand-orange/10 p-3 rounded-lg border border-eco-brand-orange/20 relative">
                <div className="text-center w-full">
                  <div>
                    Distance Saved:{" "}
                    <span className="text-white">
                      {activeRequest?.distanceSaved || 0}km
                    </span>
                  </div>
                  <div>
                    Carbon Saved:{" "}
                    <span className="text-white">
                      {activeRequest?.carbonSaved || 0}kg
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Drivers */}
            {recommendedDrivers.length > 0 && (
              <div className="bg-eco-card rounded-xl border border-eco-card-border p-4">
                <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-violet-400" />
                  AI Recommended Drivers
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">AI</span>
                </h4>
                <div className="space-y-2">
                  {recommendedDrivers.slice(0, 3).map((driver: any) => (
                    <div key={driver.id} className="flex items-center justify-between bg-eco-secondary/40 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-600 to-amber-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {driver.name?.[0] || 'D'}
                        </div>
                        <span className="text-white text-sm font-medium">{driver.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-eco-text-secondary px-1.5 py-0.5 rounded bg-white/5">{driver.vehicleType}</span>
                        {driver.rating && (
                          <span className="text-xs text-amber-400 font-bold flex items-center gap-0.5">
                            <Star className="w-3 h-3 fill-current" /> {driver.rating}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => handleStatusUpdate("APPROVED")}
                className="bg-eco-success hover:bg-emerald-600 text-white text-sm font-semibold py-3 rounded-lg shadow-neon flex items-center justify-center transition-all active:scale-[0.98]"
              >
                <CheckCircle className="w-4 h-4 mr-2" /> Approve
              </button>
              <button
                onClick={() => handleStatusUpdate("REJECTED")}
                className="bg-transparent border border-eco-error/30 text-eco-error hover:bg-eco-error/10 text-sm font-semibold py-3 rounded-lg flex items-center justify-center transition-colors active:scale-[0.98]"
              >
                <XCircle className="w-4 h-4 mr-2" /> Reject
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

