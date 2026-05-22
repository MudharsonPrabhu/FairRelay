import {
  LayoutDashboard, BarChart3, Brain, Route,
  Users, Package, Navigation, Repeat2,
  Leaf, FileText, Key, Settings, Search,
  LogOut, Shield,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { NavLink } from 'react-router-dom';

type NavItem = {
  icon: React.ElementType;
  label: string;
  to: string;
  shortcut?: string;
  aiTag?: boolean;
};

type NavSection = {
  title: string;
  items: NavItem[];
};

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'OVERVIEW',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard',  to: '/',          shortcut: '⌘1' },
      { icon: BarChart3,       label: 'Analytics',  to: '/analytics', shortcut: '⌘5' },
    ],
  },
  {
    title: 'AI ENGINES',
    items: [
      { icon: Brain,  label: 'Fair Dispatch',      to: '/fair-dispatch',      shortcut: '⌘2', aiTag: true },
      { icon: Route,  label: 'Load Consolidation', to: '/route-optimization', shortcut: '⌘3', aiTag: true },
    ],
  },
  {
    title: 'OPERATIONS',
    items: [
      { icon: Users,         label: 'Drivers',         to: '/drivers',            shortcut: '⌘6' },
      { icon: Package,       label: 'Packages',        to: '/packages'                           },
      { icon: Navigation,    label: 'Allocate Routes', to: '/allocate-routes'                    },
      { icon: Repeat2,       label: 'Absorption',      to: '/absorption-requests'                },
    ],
  },
  {
    title: 'COMPLIANCE & ESG',
    items: [
      { icon: Leaf,     label: 'Carbon Tracking', to: '/carbon-tracking' },
      { icon: FileText, label: 'e-Way Bills',     to: '/eway-bill'       },
    ],
  },
  {
    title: 'SYSTEM',
    items: [
      { icon: Key,      label: 'API Keys', to: '/api-keys' },
      { icon: Settings, label: 'Admin',    to: '/admin'    },
    ],
  },
];

function AiBadge() {
  return (
    <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/30 leading-none tracking-wide flex-shrink-0">
      AI
    </span>
  );
}

function ShortcutHint({ label }: { label: string }) {
  return (
    <span className="ml-auto text-[9px] font-mono text-gray-600 leading-none flex-shrink-0 hidden xl:block">
      {label}
    </span>
  );
}

export function Sidebar() {
  return (
    <div className="h-screen w-[260px] bg-eco-dark border-r border-eco-card-border flex flex-col fixed left-0 top-0 z-50">

      {/* Logo */}
      <div className="px-5 pt-5 pb-4 flex items-center gap-3 border-b border-eco-card-border">
        <div className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 p-2 rounded-xl border border-orange-500/30 flex-shrink-0">
          <Shield className="w-4.5 h-4.5 text-orange-400" />
        </div>
        <span className="text-lg font-bold text-white tracking-wide">
          Fair<span className="text-eco-brand-orange">Relay</span>
        </span>
      </div>

      {/* Ctrl+K Search */}
      <div className="px-4 pt-3 pb-2">
        <button
          onClick={() => {
            const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
            window.dispatchEvent(event);
          }}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/4 border border-white/6 text-gray-500 hover:text-gray-300 hover:border-white/12 hover:bg-white/6 transition-all duration-150 text-xs cursor-pointer"
        >
          <Search className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="flex-1 text-left">Search…</span>
          <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/8 border border-white/10 font-mono text-gray-600">⌘K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto custom-scrollbar space-y-4">
        {NAV_SECTIONS.map(section => (
          <div key={section.title}>
            <p className="px-3 mb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium group cursor-pointer',
                    isActive
                      ? 'bg-gradient-to-r from-orange-600 to-amber-500 text-white shadow-lg shadow-orange-600/15'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white',
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0 transition-colors" />
                  <span className="flex-1 truncate">{item.label}</span>
                  {item.aiTag && <AiBadge />}
                  {item.shortcut && !item.aiTag && <ShortcutHint label={item.shortcut} />}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Brain connectivity + user footer */}
      <div className="p-4 border-t border-eco-card-border space-y-3">
        {/* Brain status */}
        <div className="flex items-center gap-2 px-2">
          <span className="relative flex h-2 w-2 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[10px] text-gray-500 font-medium tracking-wide uppercase">Brain Online</span>
          <span className="ml-auto text-[10px] font-mono text-emerald-600">8 agents</span>
        </div>

        {/* Admin profile link */}
        <NavLink
          to="/admin"
          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5 transition-colors group cursor-pointer"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-600 to-amber-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 group-hover:shadow-lg group-hover:shadow-orange-600/20 transition-all">
            A
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate group-hover:text-orange-400 transition-colors">Admin User</div>
            <div className="text-[10px] text-gray-500">System Admin</div>
          </div>
        </NavLink>

        <button className="flex items-center gap-2.5 text-gray-500 hover:text-white transition-colors px-2 py-1.5 w-full hover:bg-white/5 rounded-lg cursor-pointer text-xs font-medium">
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign out</span>
        </button>
      </div>
    </div>
  );
}
