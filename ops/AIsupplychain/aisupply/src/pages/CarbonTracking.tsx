import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Leaf, TrendingDown, Award, Target, Zap, Cpu, Network, BarChart3, Brain,
  AlertTriangle, CheckCircle, Loader2, Flame, ArrowRight, Truck,
  Download, RefreshCw, Wifi, WifiOff, ChevronUp, ChevronDown,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell,
} from 'recharts';

// ── Types ─────────────────────────────────────────────────────────────────────
interface ShipmentResult {
  id: string; lane: string; dist_km: number; weight_kg: number; max_kg: number;
  truck: string; load_factor_pct: number; co2_kg: number; co2_baseline_kg: number;
  co2_saved_kg: number; risk: 'HIGH' | 'MEDIUM' | 'LOW';
  emission_factor?: number; co2_intensity_g_tkm?: number;
  fuel_saved_liters?: number; fuel_saved_inr?: number;
}
interface LaneEmission { lane: string; co2_kg: number; risk: 'HIGH' | 'MEDIUM' | 'LOW'; }
interface ReductionOpp  { lane: string; type: string; finding: string; saving_kg: number; effort: 'Low' | 'Medium' | 'High'; saving_inr?: number; }
interface CarbonSummary {
  totalCo2Kg: number; baselineCo2Kg: number; savedCo2Kg: number; savingsPct: number;
  highRiskCount: number; carbonCreditUSD: number; shipmentCount: number;
  carbonCreditINR?: number; fuelSavedLiters?: number; fuelSavedINR?: number;
  treesEquivalent?: number; fleetEfficiencyPct?: number; emissionIntensity?: number;
}
interface CarbonApiData {
  shipments: ShipmentResult[]; highEmissionLanes: LaneEmission[];
  reductionOpportunities: ReductionOpp[]; summary: CarbonSummary; aiInsight: string;
}
type SortKey = 'co2_kg' | 'lane' | 'risk' | 'load_factor_pct';
type SortDir = 'asc' | 'desc';

// ── Constants ─────────────────────────────────────────────────────────────────
const BRAIN_URL = 'https://fairrelay-brain-gdm1.onrender.com';

const DEFAULT_SHIPMENTS = [
  { id: 'SH-001', lane: 'Mumbai → Pune',           dist_km: 149, weight_kg: 800,  max_kg: 2000, truck: 'Tata Ace Gold'   },
  { id: 'SH-002', lane: 'Mumbai JNPT → Pune Ind.', dist_km: 152, weight_kg: 600,  max_kg: 2000, truck: 'Tata Ace Gold'   },
  { id: 'SH-003', lane: 'Blr → Chennai',           dist_km: 347, weight_kg: 1200, max_kg: 5000, truck: 'Eicher Pro 2049' },
  { id: 'SH-004', lane: 'Delhi NCR → Jaipur',      dist_km: 281, weight_kg: 1500, max_kg: 5000, truck: 'Eicher Pro 2049' },
  { id: 'SH-005', lane: 'Hyderabad → Kurnool',     dist_km: 215, weight_kg: 1800, max_kg: 3000, truck: 'BharatBenz'      },
  { id: 'SH-006', lane: 'Mumbai → Surat',          dist_km: 284, weight_kg: 950,  max_kg: 3500, truck: 'Tata Ultra T.7'  },
  { id: 'SH-007', lane: 'Delhi → Gurgaon',         dist_km: 32,  weight_kg: 300,  max_kg: 1500, truck: 'Mahindra Bolero' },
];

const AGENT_STEPS = [
  { key: 'ingest',   label: 'Data Ingestion',        desc: 'Pull shipment & route data',           ms: 120  },
  { key: 'estimate', label: 'Emission Estimation',    desc: 'Truck-specific EF (0.12–0.26 kg/km) × load factor',  ms: 85   },
  { key: 'lane',     label: 'Lane Profiling',         desc: 'Rank corridors by emission intensity', ms: 45   },
  { key: 'opps',     label: 'Opportunity Detection',  desc: 'Identify consolidation + mode shifts', ms: 200  },
  { key: 'insights', label: 'AI Insight Generation',  desc: 'Gemini 2.5 Flash sustainability brief', ms: 1800 },
];

// ── Static chart data ─────────────────────────────────────────────────────────
const emissionTrend = [
  { month: 'Aug', actual: 45, baseline: 58 },
  { month: 'Sep', actual: 42, baseline: 57 },
  { month: 'Oct', actual: 38, baseline: 56 },
  { month: 'Nov', actual: 35, baseline: 55 },
  { month: 'Dec', actual: 32, baseline: 54 },
  { month: 'Jan', actual: 28, baseline: 53 },
];
const efficiencyData = [
  { route: 'Mumbai–Delhi', value: 85 },
  { route: 'Ahmd–Mumbai',  value: 92 },
  { route: 'Bang–Chennai', value: 78 },
  { route: 'Delhi–Kolkata',value: 88 },
  { route: 'Pune–Hyd',     value: 80 },
];
const esgData = [
  { subject: 'Fuel Efficiency', A: 120, fullMark: 150 },
  { subject: 'Route Opti',      A: 98,  fullMark: 150 },
  { subject: 'Load Capacity',   A: 86,  fullMark: 150 },
  { subject: 'Idle Time',       A: 99,  fullMark: 150 },
  { subject: 'Maintenance',     A: 85,  fullMark: 150 },
  { subject: 'Driver Training', A: 65,  fullMark: 150 },
];
const initiatives = [
  { title: 'Electric Fleet Integration',  desc: '15% of fleet transitioning to EVs — prioritised in city-centre routes',   progress: 65, impact: '3.2 Tons', status: 'In Progress', icon: Zap     },
  { title: 'Route Optimization AI',       desc: 'AI-powered fair dispatch reducing fuel consumption per delivery',            progress: 85, impact: '5.8 Tons', status: 'Active',      icon: Cpu     },
  { title: 'Virtual Hub Network',         desc: 'Collaborative absorption logistics reducing empty miles by 34%',             progress: 72, impact: '4.1 Tons', status: 'In Progress', icon: Network },
];
const SDG_BADGES = [
  { number: 8,  title: 'Decent Work',          color: '#A21942', desc: 'Fair wages for gig workers'    },
  { number: 10, title: 'Reduced Inequalities', color: '#DD1367', desc: 'Gini fairness scoring'         },
  { number: 13, title: 'Climate Action',        color: '#3F7E44', desc: 'CO₂ reduction via AI routing' },
];

// ── Local fallback computation ─────────────────────────────────────────────────
function computeLocalData(): CarbonApiData {
  const EF_MAP:  Record<string, number> = {
    'Tata Ace Gold': 0.12, 'Mahindra Bolero': 0.12, 'Tata Ultra T.7': 0.21,
    'Eicher Pro 2049': 0.21, 'BharatBenz': 0.26,
  };
  const LPK_MAP: Record<string, number> = {
    'Tata Ace Gold': 0.09, 'Mahindra Bolero': 0.09, 'Tata Ultra T.7': 0.18,
    'Eicher Pro 2049': 0.18, 'BharatBenz': 0.22,
  };
  const DIESEL_INR = 92.0;
  const shipments: ShipmentResult[] = DEFAULT_SHIPMENTS.map(s => {
    const ef   = EF_MAP[s.truck]  ?? 0.21;
    const lpk  = LPK_MAP[s.truck] ?? 0.18;
    const lf   = s.weight_kg / s.max_kg;
    const co2  = parseFloat((s.dist_km * lf * ef).toFixed(1));
    const base = parseFloat((s.dist_km * ef).toFixed(1));
    const fuel_saved_liters = parseFloat((s.dist_km * lpk * (1 - lf)).toFixed(2));
    const fuel_saved_inr    = parseFloat((fuel_saved_liters * DIESEL_INR).toFixed(0));
    const tonne_km           = (s.weight_kg / 1000) * s.dist_km;
    const intensity          = tonne_km > 0 ? parseFloat(((co2 * 1000) / tonne_km).toFixed(1)) : 0;
    return {
      ...s, load_factor_pct: Math.round(lf * 100),
      co2_kg: co2, co2_baseline_kg: base,
      co2_saved_kg: parseFloat((base - co2).toFixed(1)),
      risk: co2 > 50 ? 'HIGH' : co2 > 25 ? 'MEDIUM' : 'LOW',
      emission_factor: ef, co2_intensity_g_tkm: intensity,
      fuel_saved_liters, fuel_saved_inr,
    };
  });
  const total         = parseFloat(shipments.reduce((s, r) => s + r.co2_kg, 0).toFixed(1));
  const base          = parseFloat(shipments.reduce((s, r) => s + r.co2_baseline_kg, 0).toFixed(1));
  const saved         = parseFloat((base - total).toFixed(1));
  const hc            = shipments.filter(s => s.risk === 'HIGH').length;
  const fuelSavedL    = parseFloat(shipments.reduce((s, r) => s + (r.fuel_saved_liters ?? 0), 0).toFixed(1));
  const fuelSavedINR  = Math.round(fuelSavedL * DIESEL_INR);
  const treesEquiv    = Math.floor(saved / 21);
  const totalTonneKm  = shipments.reduce((s, r) => s + (r.weight_kg / 1000) * r.dist_km, 0);
  const emitIntensity = parseFloat(((total * 1000) / Math.max(totalTonneKm, 0.001)).toFixed(1));
  return {
    shipments,
    highEmissionLanes: [...shipments]
      .sort((a, b) => b.co2_kg - a.co2_kg)
      .map(s => ({ lane: s.lane, co2_kg: s.co2_kg, risk: s.risk })),
    reductionOpportunities: [
      { lane: 'Delhi → Gurgaon',     type: 'ev_route',        finding: 'Urban short-haul 32 km — EV switch saves 76% CO₂ vs diesel on this corridor.', saving_kg: 1.0,  effort: 'Medium', saving_inr: 130  },
      { lane: 'Hyderabad → Kurnool', type: 'consolidation',   finding: 'Load factor 60% — consolidation can save 7.4 kg CO₂/run.', saving_kg: 7.4, effort: 'Low',    saving_inr: 870  },
      { lane: 'Delhi NCR → Jaipur',  type: 'scheduling',      finding: 'Night-window dispatch (22:00–05:00) reduces fuel burn ~12% → saves 7.6 kg CO₂.', saving_kg: 7.6, effort: 'Low',   saving_inr: 480  },
      { lane: 'Blr → Chennai',       type: 'vehicle_upgrade', finding: 'Upgrade to BS6 Euro-6 saves 17.4 kg CO₂ on highest-emission corridor.', saving_kg: 17.4, effort: 'Medium', saving_inr: 1420 },
    ],
    summary: {
      totalCo2Kg: total, baselineCo2Kg: base, savedCo2Kg: saved,
      savingsPct: parseFloat((saved / base * 100).toFixed(1)),
      highRiskCount: hc,
      carbonCreditUSD: parseFloat((saved * 0.015).toFixed(2)),
      carbonCreditINR: Math.round(saved * 0.015 * 84),
      shipmentCount: shipments.length,
      fuelSavedLiters: fuelSavedL, fuelSavedINR,
      treesEquivalent: treesEquiv,
      fleetEfficiencyPct: parseFloat(((1 - total / Math.max(base, 1)) * 100).toFixed(1)),
      emissionIntensity: emitIntensity,
    },
    aiInsight: `Fleet emitting ${total} kg CO₂ across ${shipments.length} shipments — ${saved} kg saved vs full-load baseline. Fuel savings: ₹${fuelSavedINR.toLocaleString()} (${fuelSavedL} L). Emission intensity: ${emitIntensity} g/tonne-km. Consolidation and night-window scheduling are highest-ROI actions.`,
  };
}

// ── Hooks & helpers ───────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1400, decimals = 1) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    let current = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) { setValue(target); clearInterval(timer); }
      else setValue(parseFloat(current.toFixed(decimals)));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration, decimals]);
  return value;
}

const riskColor = (r: string) =>
  r === 'HIGH'   ? 'text-red-400 bg-red-500/10 border-red-500/20' :
  r === 'MEDIUM' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                   'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

const effortColor = (e: string) =>
  e === 'Low'    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
  e === 'Medium' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
                   'text-red-400 bg-red-500/10 border-red-500/20';

const typeIcon = (t: string) =>
  t === 'consolidation' ? '📦' : t === 'scheduling' ? '🌙' :
  t === 'intermodal'    ? '🚂' : t === 'ev_route'   ? '⚡' : '🚛';

// ── Component ─────────────────────────────────────────────────────────────────
export function CarbonTracking() {
  const [apiData,      setApiData]      = useState<CarbonApiData | null>(null);
  const [dataSource,   setDataSource]   = useState<'api' | 'local' | null>(null);
  const [agentRunning, setAgentRunning] = useState(false);
  const [agentDone,    setAgentDone]    = useState(false);
  const [activeStep,   setActiveStep]   = useState(-1);
  const [stepTimes,    setStepTimes]    = useState<(number | null)[]>(AGENT_STEPS.map(() => null));
  const [lastUpdated,  setLastUpdated]  = useState<Date | null>(null);
  const [aiText,       setAiText]       = useState('');
  const [sortKey,      setSortKey]      = useState<SortKey>('co2_kg');
  const [sortDir,      setSortDir]      = useState<SortDir>('desc');
  const hasAutoRun = useRef(false);

  // Count-up animations (re-trigger when apiData loads)
  const totalCo2Disp  = useCountUp(apiData?.summary.totalCo2Kg      ?? 0, 1400, 1);
  const savedCo2Disp  = useCountUp(apiData?.summary.savedCo2Kg      ?? 0, 1400, 1);
  const creditDisp    = useCountUp(apiData?.summary.carbonCreditUSD  ?? 0, 1400, 2);
  const fuelSavedDisp = useCountUp(apiData?.summary.fuelSavedINR     ?? 0, 1600, 0);
  const treesDisp     = useCountUp(apiData?.summary.treesEquivalent  ?? 0, 1600, 0);
  const greenMiles    = useCountUp(45678, 2000, 0);
  const esgScore      = useCountUp(87,    1200, 0);

  // Typewriter for AI insight
  useEffect(() => {
    if (!apiData?.aiInsight || !agentDone) return;
    let i = 0;
    setAiText('');
    const t = setInterval(() => {
      i++;
      setAiText(apiData.aiInsight.slice(0, i));
      if (i >= apiData.aiInsight.length) clearInterval(t);
    }, 18);
    return () => clearInterval(t);
  }, [apiData?.aiInsight, agentDone]);

  const runAgent = useCallback(async () => {
    if (agentRunning) return;
    setAgentRunning(true);
    setAgentDone(false);
    setActiveStep(0);
    setStepTimes(AGENT_STEPS.map(() => null));
    setAiText('');

    // Fire the real API call immediately (parallel with animation)
    const controller = new AbortController();
    const tid = setTimeout(() => controller.abort(), 15000);
    const apiPromise = fetch(`${BRAIN_URL}/lorri/carbon/estimate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shipments: DEFAULT_SHIPMENTS,
        date: new Date().toISOString().split('T')[0],
      }),
      signal: controller.signal,
    })
      .then(r => (r.ok ? r.json() : null))
      .catch(() => null)
      .finally(() => clearTimeout(tid));

    // Animate steps 0–3 with realistic timing
    const times: (number | null)[] = AGENT_STEPS.map(() => null);
    for (let i = 0; i < AGENT_STEPS.length - 1; i++) {
      setActiveStep(i);
      const t0 = Date.now();
      await new Promise(r => setTimeout(r, AGENT_STEPS[i].ms));
      times[i] = Date.now() - t0;
      setStepTimes([...times]);
    }

    // Step 4: wait for API response
    setActiveStep(AGENT_STEPS.length - 1);
    const t5 = Date.now();
    const result = await apiPromise;
    times[AGENT_STEPS.length - 1] = Date.now() - t5;
    setStepTimes([...times]);

    if (result?.success && result?.data) {
      setApiData(result.data as CarbonApiData);
      setDataSource('api');
    } else {
      setApiData(computeLocalData());
      setDataSource('local');
    }

    setAgentRunning(false);
    setAgentDone(true);
    setActiveStep(-1);
    setLastUpdated(new Date());
  }, [agentRunning]);

  // Auto-run on mount (demo: page loads already analysed)
  useEffect(() => {
    if (hasAutoRun.current) return;
    hasAutoRun.current = true;
    runAgent();
  }, [runAgent]);

  // Sortable shipment table
  const sortedShipments = useMemo(() => {
    if (!apiData?.shipments) return [];
    const riskOrder: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
    return [...apiData.shipments].sort((a, b) => {
      let diff = 0;
      if (sortKey === 'lane') {
        diff = a.lane.localeCompare(b.lane);
      } else if (sortKey === 'risk') {
        diff = (riskOrder[a.risk] ?? 0) - (riskOrder[b.risk] ?? 0);
      } else {
        diff = (a[sortKey] as number) - (b[sortKey] as number);
      }
      return sortDir === 'desc' ? -diff : diff;
    });
  }, [apiData, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => (d === 'desc' ? 'asc' : 'desc'));
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ col }: { col: SortKey }) =>
    sortKey !== col ? <ChevronDown className="w-3 h-3 opacity-20 inline ml-1" /> :
    sortDir === 'desc' ? <ChevronDown className="w-3 h-3 text-green-400 inline ml-1" /> :
                         <ChevronUp   className="w-3 h-3 text-green-400 inline ml-1" />;

  const exportData = useCallback(() => {
    if (!apiData) return;
    const blob = new Blob(
      [JSON.stringify({ generatedAt: lastUpdated?.toISOString(), source: dataSource, ...apiData }, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href     = url;
    a.download = `carbon-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [apiData, lastUpdated, dataSource]);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center text-sm text-eco-text-secondary mb-2">
        Dashboard <span className="mx-2">&gt;</span>
        <span className="text-white font-semibold">Carbon Tracking</span>
      </div>

      {/* SDG Badges */}
      <div className="flex flex-wrap gap-3">
        {SDG_BADGES.map(sdg => (
          <div key={sdg.number} className="flex items-center gap-2.5 px-4 py-2 rounded-xl border border-white/10 bg-white/3 hover:border-white/20 transition-all">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: sdg.color }}>
              {sdg.number}
            </div>
            <div>
              <p className="text-white text-xs font-semibold">{sdg.title}</p>
              <p className="text-gray-500 text-xs">{sdg.desc}</p>
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl border border-green-500/20 bg-green-500/5">
          <Leaf className="w-4 h-4 text-green-400" />
          <span className="text-green-400 text-xs font-medium">UN Sustainable Development Goals alignment</span>
        </div>
      </div>

      {/* ── CARBON INTELLIGENCE AGENT ──────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-green-900/20 via-eco-card to-emerald-900/10 border border-green-500/20 rounded-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h2 className="text-white font-bold text-lg flex items-center gap-2">
              <div className="p-2 bg-green-500/10 rounded-xl border border-green-500/20">
                <Brain className="w-5 h-5 text-green-400" />
              </div>
              Carbon Intelligence Agent
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Real-time emission estimation · High-risk lane detection · AI reduction opportunities
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Live / Local badge */}
            {agentDone && (
              <div className={`flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                dataSource === 'api'
                  ? 'text-green-400 bg-green-500/10 border-green-500/20'
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
              }`}>
                {dataSource === 'api'
                  ? <Wifi    className="w-3 h-3" />
                  : <WifiOff className="w-3 h-3" />}
                {dataSource === 'api' ? 'LIVE API' : 'LOCAL COMPUTE'}
              </div>
            )}
            {lastUpdated && (
              <span className="text-[10px] text-gray-500 hidden sm:inline">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {agentDone && (
              <button
                onClick={exportData}
                className="p-2 rounded-lg border border-white/10 hover:border-white/20 text-gray-400 hover:text-white transition-all"
                title="Export JSON report"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={runAgent}
              disabled={agentRunning}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green-600 to-emerald-500 text-white font-semibold text-sm hover:from-green-500 hover:to-emerald-400 disabled:opacity-50 transition-all shadow-lg shadow-green-600/20"
            >
              {agentRunning
                ? <Loader2  className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
              {agentRunning ? 'Analysing…' : agentDone ? 'Re-run Agent' : 'Run Carbon Agent'}
            </button>
          </div>
        </div>

        {/* Agent pipeline steps */}
        <div className="flex items-start gap-1 overflow-x-auto pb-1">
          {AGENT_STEPS.map((step, i) => {
            const isDone    = stepTimes[i] != null;
            const isRunning = agentRunning && activeStep === i;
            return (
              <div key={step.key} className="flex items-center gap-1 flex-shrink-0">
                <div className={`rounded-xl border p-3 min-w-[130px] transition-all duration-300 ${
                  isDone    ? 'border-green-500/30 bg-green-500/8'  :
                  isRunning ? 'border-green-400/50 bg-green-500/10 animate-pulse' :
                              'border-white/5 bg-white/2'
                }`}>
                  <div className="flex items-center gap-1.5 mb-1">
                    {isDone    ? <CheckCircle className="w-3.5 h-3.5 text-green-400 flex-shrink-0" /> :
                     isRunning ? <Loader2 className="w-3.5 h-3.5 text-green-400 animate-spin flex-shrink-0" /> :
                                 <div className="w-3.5 h-3.5 rounded-full border border-white/20 flex-shrink-0" />}
                    <span className={`text-[10px] font-bold leading-tight ${isDone || isRunning ? 'text-green-400' : 'text-gray-600'}`}>
                      {step.label}
                    </span>
                  </div>
                  <div className="text-[9px] text-gray-500 leading-tight">{step.desc}</div>
                  {isDone && (
                    <div className="text-[9px] font-mono text-green-400 mt-1">{stepTimes[i]}ms</div>
                  )}
                </div>
                {i < AGENT_STEPS.length - 1 && (
                  <ArrowRight className="w-3.5 h-3.5 text-gray-700 flex-shrink-0" />
                )}
              </div>
            );
          })}
        </div>

        {/* AI Insight typewriter */}
        {agentDone && aiText && (
          <div className="mt-4 rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-start gap-3">
            <Brain className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-300 text-sm leading-relaxed">
              {aiText}
              {aiText.length < (apiData?.aiInsight.length ?? 0) && (
                <span className="animate-pulse">|</span>
              )}
            </p>
          </div>
        )}
      </div>

      {/* ── LIVE AGENT KPI CARDS (appear once agent finishes) ──────────────── */}
      {agentDone && apiData && (
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div className="bg-eco-card rounded-xl p-4 border border-red-500/20 flex items-start justify-between shadow-sm">
            <div>
              <div className="text-eco-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">Fleet CO₂</div>
              <div className="text-2xl font-bold text-red-400">{totalCo2Disp} <span className="text-sm">kg</span></div>
              <div className="text-xs text-gray-500 mt-1">{apiData.summary.shipmentCount} shipments</div>
            </div>
            <div className="p-2 rounded-xl bg-red-500/10"><Flame className="w-4 h-4 text-red-400" /></div>
          </div>

          <div className="bg-eco-card rounded-xl p-4 border border-emerald-500/20 flex items-start justify-between shadow-sm">
            <div>
              <div className="text-eco-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">CO₂ Saved</div>
              <div className="text-2xl font-bold text-emerald-400">{savedCo2Disp} <span className="text-sm">kg</span></div>
              <div className="text-xs text-emerald-500 mt-1 font-semibold">↓ {apiData.summary.savingsPct}% vs full-load</div>
            </div>
            <div className="p-2 rounded-xl bg-emerald-500/10"><Leaf className="w-4 h-4 text-emerald-400" /></div>
          </div>

          <div className="bg-eco-card rounded-xl p-4 border border-blue-500/20 flex items-start justify-between shadow-sm">
            <div>
              <div className="text-eco-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">Carbon Credits</div>
              <div className="text-2xl font-bold text-blue-400">${creditDisp}</div>
              <div className="text-xs text-blue-400 mt-1">≈ ₹{(apiData.summary.carbonCreditINR ?? Math.round(apiData.summary.carbonCreditUSD * 84)).toLocaleString()}</div>
            </div>
            <div className="p-2 rounded-xl bg-blue-500/10"><Award className="w-4 h-4 text-blue-400" /></div>
          </div>

          <div className="bg-eco-card rounded-xl p-4 border border-amber-500/20 flex items-start justify-between shadow-sm">
            <div>
              <div className="text-eco-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">High-Risk Lanes</div>
              <div className="text-2xl font-bold text-amber-400">{apiData.summary.highRiskCount}</div>
              <div className="text-xs text-amber-400 mt-1">Priority action needed</div>
            </div>
            <div className="p-2 rounded-xl bg-amber-500/10"><AlertTriangle className="w-4 h-4 text-amber-400" /></div>
          </div>

          <div className="bg-eco-card rounded-xl p-4 border border-cyan-500/20 flex items-start justify-between shadow-sm">
            <div>
              <div className="text-eco-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">Fuel Saved</div>
              <div className="text-2xl font-bold text-cyan-400">₹{fuelSavedDisp.toLocaleString()}</div>
              <div className="text-xs text-cyan-500 mt-1">{apiData.summary.fuelSavedLiters ?? 0} L diesel</div>
            </div>
            <div className="p-2 rounded-xl bg-cyan-500/10"><Zap className="w-4 h-4 text-cyan-400" /></div>
          </div>

          <div className="bg-eco-card rounded-xl p-4 border border-green-500/20 flex items-start justify-between shadow-sm">
            <div>
              <div className="text-eco-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">Trees Equiv.</div>
              <div className="text-2xl font-bold text-green-400">{treesDisp}</div>
              <div className="text-xs text-green-500 mt-1">CO₂ absorbed/yr</div>
            </div>
            <div className="p-2 rounded-xl bg-green-500/10"><Leaf className="w-4 h-4 text-green-400" /></div>
          </div>
        </div>
      )}

      {/* ── SHIPMENT-LEVEL EMISSION ESTIMATOR ─────────────────────────────── */}
      <div className="bg-eco-card border border-eco-card-border rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-eco-card-border flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold flex items-center gap-2">
              <Truck className="w-4 h-4 text-green-400" /> Shipment-Level Emission Estimator
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Model: CO₂ (kg) = Distance × Load Factor × Truck EF (0.12–0.26 kg/km) · Click columns to sort
            </p>
          </div>
          <span className={`text-[10px] px-2 py-1 rounded-lg border font-semibold ${
            dataSource === 'api'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : agentDone
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                : 'bg-gray-500/10 border-gray-500/20 text-gray-400'
          }`}>
            {dataSource === 'api' ? 'LIVE MODEL' : agentDone ? 'LOCAL MODEL' : 'PENDING'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-eco-card-border">
                {[
                  { label: 'Shipment',  key: null          },
                  { label: 'Lane',      key: 'lane'        },
                  { label: 'Dist (km)', key: null          },
                  { label: 'Weight',    key: null          },
                  { label: 'Load %',    key: 'load_factor_pct' },
                  { label: 'CO₂ Est.',  key: 'co2_kg'     },
                  { label: 'Baseline',  key: null          },
                  { label: 'Saved',     key: null          },
                  { label: 'Risk',      key: 'risk'        },
                ].map(col => (
                  <th
                    key={col.label}
                    className={`px-4 py-3 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${col.key ? 'cursor-pointer hover:text-gray-300 transition-colors' : ''}`}
                    onClick={() => col.key && toggleSort(col.key as SortKey)}
                  >
                    {col.label}
                    {col.key && <SortIcon col={col.key as SortKey} />}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sortedShipments.length > 0 ? sortedShipments : DEFAULT_SHIPMENTS.map(s => ({
                ...s, load_factor_pct: Math.round(s.weight_kg / s.max_kg * 100),
                co2_kg: 0, co2_baseline_kg: 0, co2_saved_kg: 0, risk: 'LOW' as const,
              }))).map((s, i) => (
                <tr key={s.id} className={`border-b border-eco-card-border/50 hover:bg-white/2 transition-colors ${i % 2 === 0 ? 'bg-white/1' : ''}`}>
                  <td className="px-4 py-3 font-mono text-orange-400 text-xs font-semibold">{s.id}</td>
                  <td className="px-4 py-3 text-white text-xs whitespace-nowrap">{s.lane}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{s.dist_km}</td>
                  <td className="px-4 py-3 text-gray-300 text-xs">{s.weight_kg.toLocaleString()} kg</td>
                  <td className="px-4 py-3 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-16 bg-gray-700/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${s.load_factor_pct}%` }}
                        />
                      </div>
                      <span className="text-gray-300">{s.load_factor_pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-bold text-white text-xs">
                    {agentDone ? `${s.co2_kg} kg` : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3 text-red-400/70 text-xs line-through">
                    {agentDone ? `${s.co2_baseline_kg} kg` : <span className="text-gray-600 no-underline">—</span>}
                  </td>
                  <td className="px-4 py-3 text-emerald-400 font-semibold text-xs">
                    {agentDone ? `↓${s.co2_saved_kg} kg` : <span className="text-gray-600">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {agentDone
                      ? <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${riskColor(s.risk)}`}>{s.risk}</span>
                      : <span className="text-[10px] px-2 py-0.5 rounded border font-semibold text-gray-600 border-gray-700">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── HIGH-EMISSION LANES + REDUCTION OPPORTUNITIES ─────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* High-emission lane chart */}
        <div className="bg-eco-card border border-eco-card-border rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
            <Flame className="w-4 h-4 text-red-400" /> High-Emission Lane Identification
          </h3>
          <p className="text-xs text-gray-500 mb-4">CO₂ kg per shipment — agent flags corridors above threshold</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={apiData?.highEmissionLanes ?? []}
              layout="vertical"
              margin={{ left: 10, right: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2438" horizontal={false} />
              <XAxis type="number" stroke="#4B5563" tickLine={false} axisLine={false} fontSize={10} />
              <YAxis type="category" dataKey="lane" stroke="#4B5563" tickLine={false} axisLine={false} fontSize={9} width={130} />
              <Tooltip
                cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                contentStyle={{ backgroundColor: '#0f1117', borderColor: '#1e2438', color: '#fff', borderRadius: 8 }}
                formatter={(v: unknown) => [`${v} kg CO₂`, 'Emission']}
              />
              <Bar dataKey="co2_kg" radius={[0, 4, 4, 0]} barSize={18}>
                {(apiData?.highEmissionLanes ?? []).map((entry, i) => (
                  <Cell key={i} fill={entry.risk === 'HIGH' ? '#ef4444' : entry.risk === 'MEDIUM' ? '#f59e0b' : '#10b981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 justify-end">
            {([['HIGH', '#ef4444'], ['MEDIUM', '#f59e0b'], ['LOW', '#10b981']] as [string, string][]).map(([label, color]) => (
              <div key={label} className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Reduction opportunities */}
        <div className="bg-eco-card border border-eco-card-border rounded-2xl p-5">
          <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" /> AI Reduction Opportunities
          </h3>
          <p className="text-xs text-gray-500 mb-4">Agent-identified optimisation actions ranked by CO₂ savings</p>
          <div className="space-y-3">
            {(apiData?.reductionOpportunities ?? []).map((opp, i) => (
              <div key={i} className="rounded-xl border border-white/5 bg-white/2 p-4 hover:border-white/10 transition-all">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>{typeIcon(opp.type)}</span> {opp.lane}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${effortColor(opp.effort)}`}>
                      {opp.effort} effort
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400">↓{opp.saving_kg} kg CO₂</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed">{opp.finding}</p>
                {opp.saving_inr != null && opp.saving_inr > 0 && (
                  <p className="text-[10px] text-cyan-400 mt-1.5 font-medium">
                    💰 ₹{opp.saving_inr.toLocaleString()} est. fuel savings
                  </p>
                )}
                <div className="mt-2 h-1 w-full bg-gray-700/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${Math.min((opp.saving_kg / 25) * 100, 100)}%` }}
                  />
                </div>
              </div>
            ))}
            {!agentDone && (
              <div className="rounded-xl border border-white/5 bg-white/2 p-8 flex items-center justify-center text-gray-600 text-sm">
                Run the Carbon Agent to see opportunities
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Per-Allocation Impact Banner */}
      <div className="bg-gradient-to-r from-green-900/30 via-emerald-900/20 to-green-900/30 border border-green-500/20 rounded-xl p-4 flex flex-wrap items-center gap-4">
        <BarChart3 className="w-5 h-5 text-green-400 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-green-300 font-semibold text-sm">Per-Allocation Carbon Impact</p>
          <p className="text-gray-400 text-sm mt-0.5">
            Each AI dispatch saves avg <span className="text-white font-bold">1.8 kg CO₂</span> vs naive dispatch ·
            EV-first routing prevents direct emissions in city centre ·
            Empty miles reduced by <span className="text-white font-bold">34%</span> via absorption routes
          </p>
        </div>
      </div>

      {/* ── MTD OVERVIEW KPI CARDS ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-eco-card rounded-xl p-5 border border-emerald-500/20 flex items-start justify-between shadow-sm">
          <div>
            <div className="text-eco-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">Carbon Saved (MTD)</div>
            <div className="text-3xl font-bold text-emerald-400">12.4 <span className="text-lg">Tons</span></div>
            <div className="text-xs text-emerald-500 mt-1 font-semibold">↓ 15.2% vs last month</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10"><Leaf className="w-5 h-5 text-emerald-400" /></div>
        </div>
        <div className="bg-eco-card rounded-xl p-5 border border-blue-500/20 flex items-start justify-between shadow-sm">
          <div>
            <div className="text-eco-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">Emission Reduction</div>
            <div className="text-3xl font-bold text-blue-400">23.6<span className="text-lg">%</span></div>
            <div className="text-xs text-blue-400 mt-1 font-semibold">↑ 5.3% vs last month</div>
          </div>
          <div className="p-2.5 rounded-xl bg-blue-500/10"><TrendingDown className="w-5 h-5 text-blue-400" /></div>
        </div>
        <div className="bg-eco-card rounded-xl p-5 border border-orange-500/20 flex items-start justify-between shadow-sm">
          <div>
            <div className="text-eco-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">ESG Score</div>
            <div className="text-3xl font-bold text-orange-400">{esgScore}<span className="text-lg">/100</span></div>
            <div className="text-xs text-emerald-400 mt-1 font-semibold">↑ +3.2 this quarter</div>
          </div>
          <div className="p-2.5 rounded-xl bg-orange-500/10"><Award className="w-5 h-5 text-orange-400" /></div>
        </div>
        <div className="bg-eco-card rounded-xl p-5 border border-eco-brand-orange/10 flex items-start justify-between shadow-sm">
          <div>
            <div className="text-eco-text-secondary text-xs font-medium mb-1 uppercase tracking-wider">Green Miles</div>
            <div className="text-3xl font-bold text-eco-brand-orange">{greenMiles.toLocaleString()}<span className="text-sm ml-1">km</span></div>
            <div className="text-xs text-emerald-400 mt-1 font-semibold">↑ 12.1% vs last month</div>
          </div>
          <div className="p-2.5 rounded-xl bg-eco-brand-orange/10"><Target className="w-5 h-5 text-eco-brand-orange" /></div>
        </div>
      </div>

      {/* ── CHARTS ROW ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-eco-card rounded-xl border border-eco-card-border p-6 h-[350px]">
          <h3 className="text-white font-semibold mb-1">Carbon Emissions Trend</h3>
          <p className="text-xs text-gray-500 mb-4">Actual (CO₂ tons) vs baseline without FairRelay</p>
          <ResponsiveContainer width="100%" height="82%">
            <AreaChart data={emissionTrend}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2438" vertical={false} />
              <XAxis dataKey="month" stroke="#4B5563" tickLine={false} axisLine={false} dy={10} fontSize={11} />
              <YAxis stroke="#4B5563" tickLine={false} axisLine={false} dx={-5} fontSize={11} />
              <Tooltip contentStyle={{ backgroundColor: '#0f1117', borderColor: '#1e2438', color: '#fff', borderRadius: 8 }} />
              <Area type="monotone" dataKey="baseline" stroke="#f87171" strokeWidth={1.5} strokeDasharray="5 3" fillOpacity={1} fill="url(#colorBaseline)" name="Without AI" />
              <Area type="monotone" dataKey="actual"   stroke="#10B981" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActual)"   name="With FairRelay" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-eco-card rounded-xl border border-eco-card-border p-6 h-[350px]">
          <h3 className="text-white font-semibold mb-1">Route Carbon Efficiency</h3>
          <p className="text-xs text-gray-500 mb-4">% efficiency score per major route</p>
          <ResponsiveContainer width="100%" height="82%">
            <BarChart data={efficiencyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e2438" vertical={false} />
              <XAxis dataKey="route" stroke="#4B5563" tickLine={false} axisLine={false} dy={10} fontSize={10} />
              <YAxis stroke="#4B5563" tickLine={false} axisLine={false} dx={-5} domain={[60, 100]} />
              <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: '#0f1117', borderColor: '#1e2438', color: '#fff', borderRadius: 8 }} />
              <Bar dataKey="value" fill="#10B981" radius={[5, 5, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── ESG + INITIATIVES ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 bg-eco-card rounded-xl border border-eco-card-border p-6 h-[380px]">
          <h3 className="text-white font-semibold mb-2">ESG Performance</h3>
          <p className="text-xs text-gray-500 mb-2">Multi-dimensional sustainability score</p>
          <ResponsiveContainer width="100%" height="90%">
            <RadarChart cx="50%" cy="50%" outerRadius="70%" data={esgData}>
              <PolarGrid stroke="#1e2438" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#6B7280', fontSize: 10 }} />
              <PolarRadiusAxis angle={30} domain={[0, 150]} tick={false} axisLine={false} />
              <Radar name="ESG" dataKey="A" stroke="#f97316" fill="#f97316" fillOpacity={0.2} />
              <Tooltip contentStyle={{ backgroundColor: '#0f1117', borderColor: '#1e2438', color: '#fff', borderRadius: 8 }} />
            </RadarChart>
          </ResponsiveContainer>
        </div>

        <div className="lg:col-span-2 bg-eco-card rounded-xl border border-eco-card-border p-6 space-y-4 h-[380px] overflow-y-auto">
          <h3 className="text-white font-semibold">Sustainability Initiatives</h3>
          {initiatives.map((item, idx) => (
            <div key={idx} className="bg-eco-secondary/50 p-5 rounded-xl border border-eco-card-border hover:border-eco-brand-orange/30 transition-all">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="text-white font-medium">{item.title}</h4>
                  <p className="text-eco-text-secondary text-xs mt-1">{item.desc}</p>
                </div>
                <span className={`px-3 py-1 text-xs font-semibold rounded flex-shrink-0 ml-4 ${
                  item.status === 'Active'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                }`}>{item.status}</span>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-400">Progress</span>
                  <span className="text-white font-bold">{item.progress}%</span>
                </div>
                <div className="h-1.5 w-full bg-gray-700/30 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${item.progress}%` }} />
                </div>
              </div>
              <div className="mt-3 flex items-center text-xs text-emerald-400 font-medium">
                <Leaf className="w-3.5 h-3.5 mr-1.5" />
                Impact: <span className="text-white ml-1">{item.impact} CO₂ saved/month</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
