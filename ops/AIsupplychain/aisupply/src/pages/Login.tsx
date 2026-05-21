import { useState, useEffect } from "react";
import { Phone, Lock, CheckCircle, AlertCircle, FlaskConical, Brain, Zap, Leaf, BarChart3, Shield, TrendingUp } from "lucide-react";
import { useAuth, DEMO_TOKEN } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { sendOTP, verifyOTP } from "../services/apiClient";
import { useToast } from "../context/ToastContext";

function useCountUp(target: number, duration = 1800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
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

function HeroPanel() {
  const dispatches = useCountUp(48294, 2200);
  const giniImprove = useCountUp(86, 2000);
  const co2Saved = useCountUp(1420, 1800);
  const drivers = useCountUp(15000000, 2400);

  const stats = [
    { icon: Brain, label: "AI Dispatches", value: dispatches.toLocaleString(), suffix: "", color: "text-orange-400", bg: "from-orange-500/10" },
    { icon: BarChart3, label: "Gini Improvement", value: giniImprove, suffix: "%", color: "text-emerald-400", bg: "from-emerald-500/10" },
    { icon: Leaf, label: "CO₂ Saved", value: co2Saved.toLocaleString(), suffix: " kg", color: "text-green-400", bg: "from-green-500/10" },
    { icon: Shield, label: "Gig Workers Protected", value: `${(drivers / 1000000).toFixed(1)}M+`, suffix: "", color: "text-violet-400", bg: "from-violet-500/10" },
  ];

  const features = [
    { icon: Zap, text: "Fair routes. Optimized loads. Explainable by default." },
    { icon: TrendingUp, text: "Gini coefficient from 0.85 → 0.12 every dispatch run" },
    { icon: Shield, text: "Wellness guard • Night safety routing • EV-first dispatch" },
  ];

  return (
    <div className="relative flex flex-col justify-between h-full p-12 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(234,88,12,0.12),transparent_60%)]" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl" />

      {/* Logo */}
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 p-2.5 rounded-xl border border-orange-500/30">
            <Shield className="w-5 h-5 text-orange-400" />
          </div>
          <span className="text-2xl font-bold text-white tracking-wide">
            Fair<span className="text-eco-brand-orange">Relay</span>
          </span>
        </div>
        <p className="text-gray-500 text-sm ml-[52px]">AI Logistics Command Center</p>
      </div>

      {/* Headline */}
      <div className="relative z-10 space-y-4">
        <h1 className="text-4xl font-bold text-white leading-tight">
          Fair routes.<br />
          Optimized loads.<br />
          <span className="text-eco-brand-orange">Explainable by default.</span>
        </h1>
        <p className="text-gray-400 text-base leading-relaxed max-w-sm">
          India's first fairness-aware AI dispatch engine — protecting 15M+ gig workers with equitable income distribution and wellness-first routing.
        </p>
        <div className="space-y-2.5 pt-2">
          {features.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div className="w-5 h-5 rounded-full bg-eco-brand-orange/15 border border-eco-brand-orange/30 flex items-center justify-center flex-shrink-0">
                <f.icon className="w-3 h-3 text-eco-brand-orange" />
              </div>
              <span className="text-sm text-gray-300">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI counters */}
      <div className="relative z-10 grid grid-cols-2 gap-3">
        {stats.map((s, i) => (
          <div key={i} className={`bg-gradient-to-br ${s.bg} to-transparent border border-white/5 rounded-xl p-4 backdrop-blur-sm`}>
            <div className="flex items-center gap-2 mb-1.5">
              <s.icon className={`w-4 h-4 ${s.color}`} />
              <span className="text-xs text-gray-500 uppercase tracking-wide">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold font-data ${s.color}`}>
              {s.value}{s.suffix}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

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
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [otpTimer]);

  const validatePhone = (value: string) => /^\+91\d{10}$/.test(value);

  const handleTestingMode = () => {
    login(DEMO_TOKEN, {
      id: "test-001",
      name: "Test Dispatcher",
      phone: "+910000000000",
      role: "DISPATCHER",
      status: "active",
      rating: 5,
      deliveriesCount: 42,
      totalEarnings: 50000,
      weeklyEarnings: 8000,
      trucks: [],
      courierCompanyId: "20c97585-a16d-45e7-8d5f-0ef5ce85b896",
    });
    showToast("Testing Mode", "Bypassed login — welcome!", "success");
    navigate("/dashboard");
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError("");
    if (!validatePhone(phone)) {
      setPhoneError("Please enter a valid 10-digit phone number");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await sendOTP(phone, "DISPATCHER");
      if (response.success) {
        setOtpTimer(60);
        setStep("otp");
        showToast("Success", "OTP sent to your phone", "success");
      } else {
        showToast("Error", response.message || "Failed to send OTP", "error");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to send OTP. Please try again.";
      setPhoneError(message);
      showToast("Error", message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    if (otp.length !== 6) {
      setOtpError("Please enter a 6-digit OTP");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await verifyOTP(phone, otp, "DISPATCHER");
      if (response.success && response.data) {
        const { token, user } = response.data;
        login(token, user);
        showToast("Success", "Login successful!", "success");
        setLoading(false);
        navigate("/dashboard");
      } else {
        showToast("Error", response.message || "Invalid OTP", "error");
      }
    } catch (error: any) {
      const message = error.response?.data?.message || "Failed to verify OTP. Please try again.";
      setOtpError(message);
      showToast("Error", message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-eco-dark flex">
      {/* Left hero — hidden on mobile */}
      <div className="hidden lg:flex lg:w-[60%] bg-gradient-to-br from-eco-dark via-[#0d1420] to-eco-dark border-r border-white/5">
        <HeroPanel />
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 relative">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 p-2 rounded-xl border border-orange-500/30">
            <Shield className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-xl font-bold text-white tracking-wide">
            Fair<span className="text-eco-brand-orange">Relay</span>
          </span>
        </div>

        <div className="w-full max-w-sm">
          {/* Card */}
          <div className="bg-white/3 border border-white/8 rounded-2xl p-8 shadow-2xl backdrop-blur-sm">
            {step === "phone" ? (
              <>
                <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
                <p className="text-gray-400 mb-7 text-sm">Enter your phone number to continue</p>

                <form onSubmit={handleSendOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      Phone Number
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3.5 w-4 h-4 text-eco-brand-orange" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                        placeholder="+91XXXXXXXXXX"
                        className={`glass-input w-full pl-10 pr-4 py-3 rounded-lg text-sm ${
                          phoneError ? "border-eco-error" : ""
                        }`}
                      />
                    </div>
                    {phoneError && (
                      <p className="text-eco-error text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {phoneError}
                      </p>
                    )}
                    <p className="text-gray-600 text-xs mt-1.5">Format: +91 followed by 10 digits</p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold py-3 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-600/20 text-sm"
                  >
                    {isSubmitting ? "Sending OTP..." : "Send OTP →"}
                  </button>

                  <div className="relative flex items-center">
                    <div className="flex-grow border-t border-white/6" />
                    <span className="mx-3 text-xs text-gray-600">or</span>
                    <div className="flex-grow border-t border-white/6" />
                  </div>

                  <button
                    type="button"
                    onClick={handleTestingMode}
                    className="w-full flex items-center justify-center gap-2 bg-white/3 hover:bg-white/6 border border-dashed border-yellow-500/40 hover:border-yellow-400/60 text-yellow-400 hover:text-yellow-300 font-medium py-3 rounded-lg transition-all active:scale-[0.98] text-sm"
                  >
                    <FlaskConical className="w-4 h-4" />
                    Demo / Testing Mode
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white mb-1">Verify OTP</h2>
                <p className="text-gray-400 mb-7 text-sm">
                  Enter the 6-digit code sent to <span className="text-white font-medium">{phone}</span>
                </p>

                <form onSubmit={handleVerifyOTP} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                      OTP Code
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3.5 w-4 h-4 text-eco-brand-orange" />
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                          setOtp(value);
                          setOtpError("");
                        }}
                        placeholder="000000"
                        maxLength={6}
                        className={`glass-input w-full pl-10 pr-4 py-3 rounded-lg text-center text-xl tracking-[0.5em] font-data ${
                          otpError ? "border-eco-error" : ""
                        }`}
                      />
                    </div>
                    {otpError && (
                      <p className="text-eco-error text-xs mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {otpError}
                      </p>
                    )}
                    <div className="mt-1.5">
                      {otpTimer > 0 ? (
                        <p className="text-gray-600 text-xs">Resend OTP in {otpTimer}s</p>
                      ) : (
                        <button
                          type="button"
                          onClick={() => { setStep("phone"); setOtp(""); }}
                          className="text-eco-brand-orange text-xs hover:underline"
                        >
                          Change number or resend OTP
                        </button>
                      )}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || otp.length < 6}
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-semibold py-3 rounded-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-orange-600/20 text-sm"
                  >
                    {isSubmitting ? "Verifying..." : "Verify & Sign In →"}
                  </button>
                </form>
              </>
            )}

            <div className="mt-6 p-3 bg-eco-success/8 border border-eco-success/15 rounded-lg flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-eco-success flex-shrink-0 mt-0.5" />
              <p className="text-xs text-gray-400">Secure login. Your data is never shared.</p>
            </div>
          </div>

          <p className="text-center text-gray-600 text-xs mt-6">
            FairRelay Dispatcher Portal · v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
