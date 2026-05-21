import { useEffect, useState, useRef, useCallback } from 'react';
import { FileText, Box, Truck, MapPin, Star, ArrowUpRight, TrendingUp, TrendingDown, AlertCircle, Brain, Zap, RefreshCw, BarChart3, Leaf, Shield, Layers, Route } from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, getDashboardActivity, getLiveTracking, getRecentAbsorptions, getAllDrivers, getDispatchHealth } from '../services/apiClient';

// ── Demo data shown in Testing Mode ────────────────────────────────────────────
const DEMO_STATS = {
  pendingRequests: 12, activeShipments: 47, activeDrivers: 8,
  fleetUtilization: "73%", dispatchRuns: 48,
  trends: {
    pendingRequests: "+3 today", activeShipments: "+5 today",
    activeDrivers: "+2 on-shift", fleetUtilization: "+4% this week",
  },
};
const DEMO_ACTIVITY = [
  { day: 'Mon', requests: 12 }, { day: 'Tue', requests: 19 },
  { day: 'Wed', requests: 15 }, { day: 'Thu', requests: 27 },
  { day: 'Fri', requests: 24 }, { day: 'Sat', requests: 18 },
  { day: 'Sun', requests: 22 },
];
const DEMO_TRACKING = [
  { id: 't1', name: 'Truck MH-12-AB-1234', status: 'Active' },
  { id: 't2', name: 'Truck KA-05-XY-9876', status: 'Loading' },
  { id: 't3', name: 'Truck DL-01-GH-5678', status: 'Active' },
  { id: 't4', name: 'Truck TN-09-CD-4411', status: 'Active' },
];
const DEMO_ABSORPTIONS = [
  { id: 'abs001', type: 'BACKHAUL', route: 'Mumbai → Pune', weight: '2.4T', priority: 'HIGH', color: 'text-eco-error bg-eco-error/10 border-eco-error/20' },
  { id: 'abs002', type: 'PARTIAL', route: 'Delhi → Jaipur', weight: '1.1T', priority: 'MEDIUM', color: 'text-eco-brand-orange bg-eco-brand-orange/10 border-eco-brand-orange/20' },
  { id: 'abs003', type: 'FULL', route: 'Bangalore → Chennai', weight: '3.0T', priority: 'HIGH', color: 'text-eco-error bg-eco-error/10 border-eco-error/20' },
];
const DEMO_TOP_DRIVERS = [
  { name: 'Rajesh Kumar', id: 'drv-001', deliveries: 142, rating: 4.9, initials: 'RK', color: 'bg-gradient-to-br from-orange-600 to-amber-500' },
  { name: 'Priya Sharma', id: 'drv-002', deliveries: 128, rating: 4.8, initials: 'PS', color: 'bg-gradient-to-br from-orange-600 to-amber-500' },
  { name: 'Amit Patel', id: 'drv-003', deliveries: 118, rating: 4.7, initials: 'AP', color: 'bg-gradient-to-br from-orange-600 to-amber-500' },
];

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const startedRef = useRef(false);
  useEffect(() => {
    if (startedRef.current || target === 0) return;
    startedRef.current = true;
    let current = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setValue(target); clearInterval(timer); }
      else setValue(Math.floor(current));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return value;
}

export function Dashboard() {
  const { showToast } = useToast();
  const { isDemo } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [activityData, setActivityData] = useState<any[]>([]);
  const [liveTracking, setLiveTracking] = useState<any[]>([]);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [topDrivers, setTopDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brainStatus, setBrainStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  const loadDemoData = useCallback(() => {
    setStats(DEMO_STATS);
    setActivityData(DEMO_ACTIVITY);
    setLiveTracking(DEMO_TRACKING.map(t => ({
      ...t,
      icon: t.status === 'Active' ? MapPin : Box,
      color: t.status === 'Active' ? 'text-eco-brand-orange' : 'text-eco-info',
    })));
    setRecentRequests(DEMO_ABSORPTIONS);
    setTopDrivers(DEMO_TOP_DRIVERS);
    setBrainStatus('disconnected');
    setLoading(false);
    setError(null);
  }, []);

  const fetchRealData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      getDispatchHealth()
        .then(data => setBrainStatus(data.brain_status === 'connected' ? 'connected' : 'disconnected'))
        .catch(() => setBrainStatus('disconnected'));

      const [statsData, activity, tracking, absorptions, drivers] = await Promise.all([
        getDashboardStats(),
        getDashboardActivity(),
        getLiveTracking(),
        getRecentAbsorptions(),
        getAllDrivers(),
      ]);

      setStats(statsData);
      setActivityData(activity);
      setLiveTracking(tracking.map((item: any) => ({
        ...item,
        icon: item.status === 'Active' ? MapPin : (item.status === 'Loading' ? Box : Truck),
        color: item.status === 'Active' ? 'text-eco-brand-orange' : 'text-eco-info',
      })));
      setRecentRequests(absorptions.map((abs: any) => ({
        id: abs.id.substring(0, 8), fullId: abs.id,
        type: abs.type, route: abs.route, weight: abs.weight, priority: abs.priority,
        color: abs.priority === 'HIGH'
          ? 'text-eco-error bg-eco-error/10 border-eco-error/20'
          : abs.priority === 'MEDIUM'
            ? 'text-eco-brand-orange bg-eco-brand-orange/10 border-eco-brand-orange/20'
            : 'text-eco-success bg-eco-success/10 border-eco-success/20',
      })));
      setTopDrivers(
        drivers
          .filter((d: any) => d.rating !== undefined)
          .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
          .slice(0, 3)
          .map((d: any) => ({
            name: d.name, id: d.id,
            deliveries: d.deliveriesCount || 0, rating: d.rating || 0,
            initials: d.initials || d.name.substring(0, 2).toUpperCase(),
            color: 'bg-gradient-to-br from-orange-600 to-amber-500',
          }))
      );
    } catch {
      setError("Failed to load dashboard data. Check backend connection.");
      showToast("Connection Error", "Is the backend server running?", "error");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (isDemo) loadDemoData();
    else fetchRealData();
  }, [isDemo, loadDemoData, fetchRealData]);

  const handleTrackingClick = (item: any) => {
    showToast(`Tracking ${item.name}`, `Status: ${item.status}`, 'info');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Skeleton banner */}
        <div className="h-24 bg-white/3 rounded-xl border border-white/5 animate-pulse" />
        {/* Skeleton strip */}
        <div className="flex gap-4">
          {[1,2,3,4].map(i => <div key={i} className="flex-1 h-16 bg-white/3 rounded-xl border border-white/5 animate-pulse" />)}
        </div>
        {/* Skeleton stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-32 bg-white/3 rounded-xl border border-white/5 animate-pulse" />)}
        </div>
        {/* Skeleton chart row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-[340px] bg-white/3 rounded-xl border border-white/5 animate-pulse" />
          <div className="h-[340px] bg-white/3 rounded-xl border border-white/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
        <AlertCircle className="w-12 h-12 text-eco-error mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">Unavailable</h3>
        <p className="text-eco-text-secondary mb-6">{error}</p>
        <button
          onClick={fetchRealData}
          className="flex items-center gap-2 px-4 py-2 bg-eco-brand-orange hover:bg-orange-600 text-white rounded-lg font-semibold transition-all"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isDemo && (
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
          <span className="text-base">🧪</span>
          <span className="font-medium">Testing Mode — all data is mocked. Log in with OTP for live data.</span>
        </div>
      )}

      {/* AI Status Bar */}
      <div className="bg-gradient-to-r from-orange-900/40 via-amber-900/30 to-orange-900/40 rounded-xl border border-orange-500/20 p-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/10 rounded-xl border border-orange-500/30">
              <Brain className="w-7 h-7 text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">FairRelay AI Dispatch Engine</h2>
              <p className="text-sm text-eco-text-secondary">8-agent LangGraph pipeline · Fairness-aware routing · Wellness-first dispatch</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 ${
              brainStatus === 'connected'
                ? 'bg-emerald-400/10 border-emerald-400/30 text-emerald-400'
                : 'bg-amber-400/10 border-amber-400/30 text-amber-400'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-pulse ${brainStatus === 'connected' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
              {brainStatus === 'connected' ? 'Brain Online' : isDemo ? 'Demo Mode' : 'Brain Offline'}
            </div>
            <Link to="/load-consolidation" className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-all">
              <Layers className="w-3.5 h-3.5 text-violet-400" /> Consolidate
            </Link>
            <Link to="/route-optimization" className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/8 text-gray-300 text-xs font-medium flex items-center gap-1.5 transition-all">
              <Route className="w-3.5 h-3.5 text-blue-400" /> Optimize
            </Link>
            <Link
              to="/fair-dispatch"
              className="bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 shadow-lg shadow-orange-600/20 transition-all"
            >
              <Zap className="w-4 h-4" /> Run Fair Dispatch
            </Link>
          </div>
        </div>
      </div>

      {/* AI Intelligence Strip */}
      <div className="flex flex-wrap gap-3">
        {[
          { Icon: BarChart3, label: 'Gini Today', value: '0.12', sub: 'Excellent fairness', color: 'text-emerald-400', bg: 'border-emerald-500/15 hover:border-emerald-500/30' },
          { Icon: Leaf,      label: 'CO₂ Saved',  value: '14.2 kg', sub: 'This run', color: 'text-green-400', bg: 'border-green-500/15 hover:border-green-500/30' },
          { Icon: Brain,     label: 'AI Dispatches', value: String(stats?.dispatchRuns || '48'), sub: 'Today', color: 'text-orange-400', bg: 'border-orange-500/15 hover:border-orange-500/30' },
          { Icon: Shield,    label: 'Time Saved', value: '3.2 hrs', sub: 'vs manual dispatch', color: 'text-blue-400', bg: 'border-blue-500/15 hover:border-blue-500/30' },
        ].map((item, i) => (
          <div key={i} className={`flex items-center gap-3 px-4 py-2.5 bg-white/3 border ${item.bg} rounded-xl transition-all`}>
            <item.Icon className={`w-5 h-5 flex-shrink-0 ${item.color}`} />
            <div>
              <p className={`text-lg font-bold font-data leading-none ${item.color}`}>{item.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.label} · {item.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center text-sm text-eco-text-secondary mb-2">
        <span className="text-white font-semibold">Dashboard</span>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatWidget title="Pending Requests" value={stats?.pendingRequests || "0"} change={stats?.trends?.pendingRequests || "-"} positive={true} icon={FileText} iconColor="text-eco-brand-orange" iconBg="bg-eco-brand-orange/10" />
        <StatWidget title="Active Shipments" value={stats?.activeShipments || "0"} change={stats?.trends?.activeShipments || "-"} positive={true} icon={Box} iconColor="text-eco-info" iconBg="bg-eco-info/10" />
        <StatWidget title="Active Drivers" value={stats?.activeDrivers || "0"} change={stats?.trends?.activeDrivers || "-"} positive={true} icon={Truck} iconColor="text-eco-success" iconBg="bg-eco-success/10" pulse={true} />
        <StatWidget title="Fleet Utilization" value={stats?.fleetUtilization || "0%"} change={stats?.trends?.fleetUtilization || "-"} positive={false} icon={TrendingUp} iconColor="text-eco-brand-orange" iconBg="bg-eco-brand-orange/10" />
      </div>

      {/* Middle Section: Chart + Live Tracking */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-eco-card rounded-xl border border-eco-card-border p-6 h-[340px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-semibold text-lg">Weekly Request Activity</h3>
            <Link to="/analytics" className="flex items-center text-eco-brand-orange text-sm cursor-pointer hover:underline">
              Analytics <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={activityData}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3A2820" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3142" vertical={false} />
              <XAxis dataKey="day" stroke="#8B92A8" tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="#8B92A8" tickLine={false} axisLine={false} dx={-10} interval={0} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#151B28', borderColor: '#2A3142', borderRadius: '8px', color: '#fff' }} itemStyle={{ color: '#FF6B35' }} cursor={{ stroke: '#FF6B35', strokeDasharray: '5 5' }} />
              <Area type="monotone" dataKey="requests" stroke="#FF6B35" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-eco-card rounded-xl border border-eco-card-border p-6 h-[340px] overflow-hidden flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white font-semibold text-lg">Live Tracking</h3>
            <MapPin className="w-5 h-5 text-eco-brand-orange" />
          </div>
          <div className="space-y-3 overflow-y-auto pr-2 custom-scrollbar">
            {liveTracking.map((item) => (
              <div
                key={item.id}
                className="bg-eco-secondary p-3 rounded-lg border border-eco-card-border flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
                onClick={() => handleTrackingClick(item)}
              >
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/5 rounded-md text-gray-400">
                    {item.icon ? <item.icon className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{item.name}</div>
                    <div className={`text-xs ${item.status === 'Active' ? 'text-eco-brand-orange' : 'text-eco-info'}`}>{item.status}</div>
                  </div>
                </div>
                <div className={`w-2 h-2 rounded-full animate-pulse ${item.status === 'Active' ? 'bg-eco-brand-orange' : 'bg-eco-info'}`}></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Recent Requests + Top Drivers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-eco-card rounded-xl border border-eco-card-border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-semibold text-lg">Recent Absorption Requests</h3>
            <Link to="/absorption-requests" className="flex items-center text-eco-brand-orange text-sm cursor-pointer hover:underline">
              View All <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-4">
            {recentRequests.map((req) => (
              <div key={req.id} className="bg-eco-secondary p-4 rounded-xl border border-eco-card-border flex justify-between items-center group hover:border-white/10 transition-all cursor-pointer" onClick={() => showToast(`Opening Request ${req.id}`, 'Redirecting to details...', 'info')}>
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-eco-brand-orange font-bold text-sm">#{req.id}</span>
                    <span className="text-eco-text-secondary text-sm">{req.type}</span>
                  </div>
                  <div className="text-gray-300 text-sm">{req.route}</div>
                </div>
                <div className="flex flex-col items-end space-y-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium border ${req.color}`}>{req.priority}</span>
                  <span className="text-white text-sm font-semibold">{req.weight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-eco-card rounded-xl border border-eco-card-border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white font-semibold text-lg">Top Performing Drivers</h3>
            <Link to="/drivers" className="flex items-center text-eco-brand-orange text-sm cursor-pointer hover:underline">
              View All <ArrowUpRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="space-y-4">
            {topDrivers.map((driver) => (
              <div key={driver.id} className="bg-eco-secondary p-4 rounded-xl border border-eco-card-border flex items-center justify-between hover:bg-white/5 transition-colors cursor-pointer" onClick={() => showToast(`Driver ${driver.initials}`, 'View performance profile', 'info')}>
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-full ${driver.color} text-white flex items-center justify-center font-bold text-sm`}>{driver.initials}</div>
                  <div>
                    <div className="text-white font-medium text-sm">{driver.name}</div>
                    <div className="text-eco-text-secondary text-xs">{driver.id}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center text-yellow-500 font-bold text-sm justify-end">
                    <Star className="w-4 h-4 fill-current mr-1" /> {driver.rating}
                  </div>
                  <div className="text-eco-text-secondary text-xs mt-1">{driver.deliveries} deliveries completed</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatWidget({ title, value, change, positive, icon: Icon, iconColor, iconBg, pulse = false }: any) {
  const parsed = typeof value === 'string' ? parseInt(value.replace(/[^0-9]/g, '')) || 0 : (value || 0);
  const animated = useCountUp(parsed);
  const displayValue = typeof value === 'string' && /[^0-9]/.test(value)
    ? value
    : animated.toLocaleString();
  return (
    <div className="bg-eco-card rounded-xl p-6 border border-eco-card-border flex items-start justify-between shadow-lg hover-lift cursor-default hover:border-eco-brand-orange/20">
      <div>
        <div className="text-eco-text-secondary text-sm font-medium mb-1">{title}</div>
        <div className="text-3xl font-bold text-white mb-1">{displayValue}</div>
        <div className={`flex items-center text-xs font-semibold ${positive ? 'text-eco-success' : 'text-eco-warning'}`}>
          {positive ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
          {change}
        </div>
      </div>
      <div className={`p-4 rounded-full ${iconBg} relative`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
        {pulse && <span className="absolute top-0 right-0 w-3 h-3 rounded-full bg-emerald-400 animate-ping border-2 border-gray-900" />}
      </div>
    </div>
  );
}
