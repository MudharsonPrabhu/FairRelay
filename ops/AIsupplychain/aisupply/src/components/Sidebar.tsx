import {
  LayoutDashboard, BarChart3, FileSpreadsheet, LogOut, Leaf,
  Package, Navigation, Brain, Shield, Key, Layers, Route,
  Receipt, Truck, ClipboardList, Zap, Users, WifiOff, Wifi,
  ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

// ── Nav data ─────────────────────────────────────────────────────────────────

interface NavItem {
  icon: React.ElementType;
  label: string;
  to: string;
  aiPowered?: boolean;
  shortcut?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',  to: '/',          shortcut: '⌃1' },
      { icon: BarChart3,       label: 'Analytics',  to: '/analytics', shortcut: '⌃5' },
    ],
  },
  {
    label: 'AI Engines',
    items: [
      { icon: Brain,   label: 'Fair Dispatch',      to: '/fair-dispatch',      aiPowered: true,  shortcut: '⌃2' },
      { icon: Layers,  label: 'Load Consolidation', to: '/load-consolidation', aiPowered: true,  shortcut: '⌃4' },
      { icon: Route,   label: 'Route Optimizer',    to: '/route-optimization', aiPowered: true,  shortcut: '⌃3' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { icon: Users,           label: 'Drivers',           to: '/drivers',            shortcut: '⌃6' },
      { icon: Package,         label: 'Packages',          to: '/packages' },
      { icon: ClipboardList,   label: 'Assign Tasks',      to: '/assign-tasks' },
      { icon: Navigation,      label: 'Allocate Routes',   to: '/allocate-routes' },
      { icon: FileSpreadsheet, label: 'Absorption',        to: '/absorption-requests' },
    ],
  },
  {
    label: 'Compliance & ESG',
    items: [
      { icon: Leaf,    label: 'Carbon Tracking', to: '/carbon-tracking' },
      { icon: Truck,   label: 'e-Way Bills',     to: '/eway-bill' },
      { icon: Receipt, label: 'Invoice AI',      to: '/invoice',  aiPowered: true },
    ],
  },
  {
    label: 'System',
    items: [
      { icon: Key,    label: 'API Keys', to: '/api-keys' },
      { icon: Shield, label: 'Admin',    to: '/admin' },
    ],
  },
];

// ── Brain connectivity status ─────────────────────────────────────────────────

function BrainStatus() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/v1/consolidate/health', { signal: AbortSignal.timeout(3000) });
        setStatus(res.ok ? 'online' : 'offline');
      } catch {
        setStatus('offline');
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);

  const cfg = {
    checking: { dot: 'bg-yellow-400 animate-pulse', text: 'Checking…',   label: 'text-yellow-400' },
    online:   { dot: 'bg-emerald-400 animate-glow-green', text: 'AI Brain Online', label: 'text-emerald-400' },
    offline:  { dot: 'bg-red-500',   text: 'AI Offline',    label: 'text-red-400'  },
  }[status];

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/3 border border-white/5">
      {status === 'online'
        ? <Wifi    className="w-3 h-3 text-emerald-400 shrink-0" />
        : <WifiOff className="w-3 h-3 text-red-400 shrink-0" />}
      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      <span className={`text-[10px] font-medium truncate ${cfg.label}`}>{cfg.text}</span>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Sidebar() {
  const { user, logout } = useAuth() as any;
  const navigate = useNavigate();

  const initials = user?.name
    ? user.name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()
    : 'U';

  return (
    <div className="h-screen w-[260px] flex flex-col fixed left-0 top-0 z-50"
         style={{ background: '#0c1220', borderRight: '1px solid rgba(255,255,255,0.06)' }}>

      {/* ── Logo ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-amber-400
                        flex items-center justify-center shadow-lg shadow-orange-500/25 shrink-0">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <span className="text-[17px] font-bold tracking-tight text-white">
            Fair<span className="text-orange-400">Relay</span>
          </span>
          <p className="text-[9px] text-gray-500 font-medium tracking-widest uppercase leading-none mt-0.5">
            AI Logistics Platform
          </p>
        </div>
      </div>

      {/* ── Search hint ───────────────────────────────────────── */}
      <button
        onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
        className="mx-3 mb-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/4
                   border border-white/6 text-gray-500 hover:text-gray-300 hover:bg-white/6
                   transition-all duration-150 text-xs group"
        aria-label="Open search (Ctrl+K)"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="flex-1 text-left">Search…</span>
        <kbd className="text-[9px] bg-white/8 border border-white/10 rounded px-1 py-0.5
                        text-gray-500 group-hover:text-gray-400 font-mono">⌃K</kbd>
      </button>

      {/* ── Navigation ────────────────────────────────────────── */}
      <nav className="flex-1 px-2 overflow-y-auto custom-scrollbar pb-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="nav-group-label">{group.label}</p>

            {group.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) => cn(
                  'relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg',
                  'transition-all duration-150 group text-sm font-medium mb-0.5',
                  isActive
                    ? 'bg-gradient-to-r from-orange-600/90 to-amber-500/80 text-white shadow-lg shadow-orange-600/20'
                    : 'text-gray-400 hover:text-white hover:bg-white/5',
                )}
              >
                {/* Icon */}
                <item.icon className="w-[17px] h-[17px] shrink-0 transition-colors" />

                {/* Label */}
                <span className="flex-1 truncate">{item.label}</span>

                {/* AI Badge */}
                {item.aiPowered && (
                  <span className="ai-badge shrink-0">AI</span>
                )}

                {/* Keyboard shortcut */}
                {item.shortcut && (
                  <kbd className="hidden group-hover:inline-flex text-[9px] bg-white/8
                                  border border-white/10 rounded px-1 font-mono text-gray-500
                                  shrink-0 transition-all">
                    {item.shortcut}
                  </kbd>
                )}

                {/* Active chevron indicator */}
                <ChevronRight className={cn(
                  'w-3 h-3 shrink-0 transition-all duration-150 opacity-0',
                  'group-[&.active]:opacity-100',
                )} />
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* ── Footer ────────────────────────────────────────────── */}
      <div className="p-3 shrink-0 border-t border-white/5 space-y-2">
        {/* Brain status */}
        <BrainStatus />

        {/* User row */}
        <button
          onClick={() => navigate('/admin')}
          className="w-full flex items-center gap-3 px-2 py-2 rounded-lg
                     hover:bg-white/5 transition-colors group"
          aria-label="Go to admin profile"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-amber-500
                          flex items-center justify-center text-white font-bold text-[11px] shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0 text-left">
            <p className="text-xs font-semibold text-white truncate group-hover:text-orange-400 transition-colors">
              {user?.name || 'Admin User'}
            </p>
            <p className="text-[10px] text-gray-500 truncate capitalize">
              {user?.role?.toLowerCase().replace('_', ' ') || 'System Admin'}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); logout?.(); navigate('/login'); }}
            className="p-1.5 rounded-md text-gray-500 hover:text-red-400 hover:bg-red-500/10
                       transition-all opacity-0 group-hover:opacity-100"
            aria-label="Logout"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </button>
      </div>
    </div>
  );
}
