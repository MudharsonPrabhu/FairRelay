import { useState, useEffect, useRef } from "react";
import { Phone, Lock, CheckCircle, AlertCircle, FlaskConical, Zap, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { sendOTP, verifyOTP } from "../services/apiClient";
import { useToast } from "../context/ToastContext";

// ── Animated KPI counter for the hero panel ──────────────────────────────────

function useCountUp(target: number, duration = 2000, start = true) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (!start || started.current) return;
    started.current = true;
    const step = target / (duration / 16);
    let cur = 0;
    const id = setInterval(() => {
      cur += step;
      if (cur >= target) { setValue(target); clearInterval(id); }
      else setValue(Math.floor(cur));
    }, 16);
    return () => clearInterval(id);
  }, [target, duration, start]);
  return value;
}

// ── Live metrics panel (left side) ───────────────────────────────────────────

const STATS = [
  { label: 'Trips Eliminated',   value: 12840, suffix: '',    color: 'text-orange-400',  icon: '🚛' },
  { label: 'CO₂ Saved (kg)',     value: 96800, suffix: '',    color: 'text-emerald-400', icon: '🌿' },
  { label: 'Gini Index Today',   value: 12,    suffix: '%',   color: 'text-violet-400',  icon: '⚖️' },
  { label: 'Fuel Saved (₹ Lakh)',value: 218,   suffix: 'L',   color: 'text-amber-400',   icon: '⛽' },
];

const AGENTS = [
  'Validation', 'Compatibility', 'Clustering',
  'Optimization', '3D Packing', 'Explainability', 'Feedback',
];

function HeroPanel() {
  const [tick, setTick] = useState(0);
  const [activeAgent, setActiveAgent] = useState(0);

  // Cycle active agent
  useEffect(() => {
    const id = setInterval(() => setActiveAgent(a => (a + 1) % AGENTS.length), 900);
    return () => clearInterval(id);
  }, []);

  // Tick for subtle updates
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3500);
    return () => clearInterval(id);
  }, []);

  const s0 = useCountUp(STATS[0].value, 2200);
  const s1 = useCountUp(STATS[1].value, 2400);
  const s2 = useCountUp(STATS[2].value, 1600);
  const s3 = useCountUp(STATS[3].value, 2000);
  const counters = [s0, s1, s2, s3];

  return (
    <div className="relative flex flex-col justify-between h-full px-12 py-14 overflow-hidden select-none">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-orange-500/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-violet-600/6 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Logo + tagline */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400
                          flex items-center justify-center shadow-xl shadow-orange-500/30">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold text-white tracking-tight">
            Fair<span className="text-orange-400">Relay</span>
          </span>
        </div>

        <h1 className="text-4xl font-bold text-white leading-tight mb-3">
          AI-Powered<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
            Logistics Intelligence
          </span>
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
          Fair routes. Optimized loads. Explainable by default.
          The only logistics platform that mathematically guarantees driver equity.
        </p>
      </div>

      {/* KPI cards */}
      <div className="relative z-10 grid grid-cols-2 gap-3 my-8">
        {STATS.map((s, i) => (
          <div key={s.label}
               className="rounded-xl p-4 border transition-all duration-300"
               style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}>
            <span className="text-lg">{s.icon}</span>
            <p className={`text-2xl font-bold mt-1 font-mono-data ${s.color}`}>
              {counters[i].toLocaleString()}{s.suffix}
            </p>
            <p className="text-[11px] text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Live 8-agent pipeline viz */}
      <div className="relative z-10">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-3 font-semibold">
          8-Agent Pipeline — Live
        </p>
        <div className="flex flex-wrap gap-1.5">
          {AGENTS.map((agent, i) => (
            <span key={agent}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-full border transition-all duration-500 ${
                    i === activeAgent
                      ? 'bg-violet-600/25 border-violet-500/50 text-violet-300 shadow-lg shadow-violet-500/20 scale-105'
                      : 'bg-white/3 border-white/8 text-gray-500'
                  }`}>
              {agent}
            </span>
          ))}
        </div>

        {/* SDG badges */}
        <div className="flex gap-2 mt-5">
          {['SDG 8 — Decent Work', 'SDG 10 — Equality', 'SDG 13 — Climate'].map(sdg => (
            <span key={sdg}
                  className="text-[9px] font-semibold px-2 py-0.5 rounded-full
                             bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              {sdg}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Login form (right side) ───────────────────────────────────────────────────

export function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, setLoading } = useAuth();
  const { showToast } = useToast();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("+91");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard");
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    if (otpTimer > 0) {
      const t = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [otpTimer]);

  const validatePhone = (v: string) => /^\+91\d{10}$/.test(v);

  const handleTestingMode = () => {
    login("test-token-dev", {
      id: "test-001", name: "Demo Dispatcher", phone: "+910000000000",
      role: "DISPATCHER", status: "active", rating: 5, deliveriesCount: 42,
      totalEarnings: 50000, weeklyEarnings: 8000, trucks: [],
      courierCompanyId: "20c97585-a16d-45e7-8d5f-0ef5ce85b896",
    });
    showToast("Demo Mode Active", "Explore FairRelay with sample data.", "success");
    navigate("/dashboard");
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    if (!validatePhone(phone)) { setPhoneError("Enter a valid +91 number (10 digits)"); return; }
    try {
      setIsSubmitting(true);
      const res = await sendOTP(phone, "DISPATCHER");
      if (res.success) { setOtpTimer(60); setStep("otp"); showToast("OTP Sent", "Check your phone.", "success"); }
      else showToast("Error", res.message || "Failed to send OTP", "error");
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to send OTP.";
      setPhoneError(msg);
    } finally { setIsSubmitting(false); }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (otp.length !== 6) { setOtpError("Enter the 6-digit OTP"); return; }
    try {
      setIsSubmitting(true);
      const res = await verifyOTP(phone, otp, "DISPATCHER");
      if (res.success && res.data) {
        login(res.data.token, res.data.user);
        setLoading(false);
        showToast("Welcome!", "Login successful.", "success");
        navigate("/dashboard");
      } else showToast("Error", res.message || "Invalid OTP", "error");
    } catch (err: any) {
      setOtpError(err.response?.data?.message || "Failed to verify OTP.");
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen flex" style={{ background: '#080d18' }}>

      {/* ── Left: Hero panel ── */}
      <div className="hidden lg:flex w-[58%] flex-col"
           style={{ background: 'linear-gradient(135deg, #0c1322 0%, #0f1a2e 50%, #0c1322 100%)',
                    borderRight: '1px solid rgba(255,255,255,0.05)' }}>
        <HeroPanel />
      </div>

      {/* ── Right: Login form ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 lg:px-14 py-12">

        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="text-xl font-bold text-white">Fair<span className="text-orange-400">Relay</span></span>
        </div>

        <div className="w-full max-w-[380px]">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-white mb-1.5">
              {step === 'phone' ? 'Sign in' : 'Verify OTP'}
            </h2>
            <p className="text-sm text-gray-400">
              {step === 'phone'
                ? 'Enter your phone number to receive a one-time code.'
                : `Enter the 6-digit code sent to ${phone}`}
            </p>
          </div>

          {/* Phone step */}
          {step === 'phone' && (
            <form onSubmit={handleSendOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wide">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => { setPhone(e.target.value); setPhoneError(""); }}
                    placeholder="+91XXXXXXXXXX"
                    autoFocus
                    aria-label="Phone number"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm
                                bg-white/5 border transition-all duration-150 outline-none
                                focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60
                                placeholder-gray-600 ${phoneError ? 'border-red-500/60' : 'border-white/10'}`}
                  />
                </div>
                {phoneError && (
                  <p className="flex items-center gap-1 text-red-400 text-xs mt-1.5">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {phoneError}
                  </p>
                )}
                <p className="text-gray-600 text-[11px] mt-1.5">Format: +91 followed by 10 digits</p>
              </div>

              <button
                type="submit" disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm
                           bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400
                           text-white shadow-lg shadow-orange-600/25 active:scale-[0.98]
                           transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Sending…' : <>Send OTP <ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="relative flex items-center gap-3 my-1">
                <div className="flex-1 h-px bg-white/8" />
                <span className="text-[11px] text-gray-600">or</span>
                <div className="flex-1 h-px bg-white/8" />
              </div>

              <button
                type="button" onClick={handleTestingMode}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                           border border-dashed border-yellow-500/35 hover:border-yellow-400/60
                           bg-yellow-500/5 hover:bg-yellow-500/10 text-yellow-400 hover:text-yellow-300
                           font-medium text-sm transition-all duration-150 active:scale-[0.98]"
                aria-label="Enter demo mode"
              >
                <FlaskConical className="w-4 h-4" />
                Explore with demo data →
              </button>
            </form>
          )}

          {/* OTP step */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase tracking-wide">
                  6-Digit OTP
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-400" />
                  <input
                    type="text" value={otp}
                    onChange={e => { setOtp(e.target.value.replace(/\D/g, '').slice(0, 6)); setOtpError(''); }}
                    placeholder="000000" maxLength={6} autoFocus
                    aria-label="OTP code"
                    className={`w-full pl-10 pr-4 py-3 rounded-xl text-white text-center text-xl
                                tracking-[0.4em] font-mono bg-white/5 border transition-all duration-150
                                outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/60
                                placeholder-gray-700 ${otpError ? 'border-red-500/60' : 'border-white/10'}`}
                  />
                </div>
                {otpError && (
                  <p className="flex items-center gap-1 text-red-400 text-xs mt-1.5">
                    <AlertCircle className="w-3 h-3 shrink-0" /> {otpError}
                  </p>
                )}
                <div className="mt-2 text-[11px] text-gray-500">
                  {otpTimer > 0
                    ? `Resend available in ${otpTimer}s`
                    : (
                      <button type="button" onClick={() => { setStep('phone'); setOtp(''); }}
                              className="text-orange-400 hover:underline">
                        Change number or resend OTP
                      </button>
                    )}
                </div>
              </div>

              <button
                type="submit" disabled={isSubmitting || otp.length < 6}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm
                           bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400
                           text-white shadow-lg shadow-orange-600/25 active:scale-[0.98]
                           transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Verifying…' : <>Verify & Enter <ArrowRight className="w-4 h-4" /></>}
              </button>
            </form>
          )}

          {/* Trust footer */}
          <div className="mt-6 flex items-start gap-2 p-3 rounded-xl bg-emerald-500/6 border border-emerald-500/15">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-400 leading-relaxed">
              Secure OTP login — no password stored. Your data is encrypted end-to-end.
            </p>
          </div>

          <p className="text-center text-gray-600 text-[11px] mt-6">
            FairRelay v2.0 · LogisticsNow Hackathon 2026
          </p>
        </div>
      </div>
    </div>
  );
}
