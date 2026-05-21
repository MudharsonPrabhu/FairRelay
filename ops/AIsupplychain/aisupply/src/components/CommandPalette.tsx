import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, LayoutDashboard, Brain, Layers, Route, BarChart3, Users, Package,
  ClipboardList, Navigation, Repeat2, Leaf, FileText, Receipt, Key, Settings,
  Zap, ArrowRight, X,
} from 'lucide-react';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon: React.ElementType;
  path?: string;
  action?: () => void;
  category: string;
  shortcut?: string;
  aiTag?: boolean;
}

const COMMANDS: Command[] = [
  // Navigation
  { id: 'dashboard',     label: 'Dashboard',           description: 'Overview & live stats',         icon: LayoutDashboard, path: '/',                    category: 'Navigate',       shortcut: '⌘1' },
  { id: 'analytics',     label: 'Analytics',           description: 'Charts & reporting',            icon: BarChart3,       path: '/analytics',           category: 'Navigate',       shortcut: '⌘5' },
  { id: 'fair-dispatch', label: 'Fair Dispatch',        description: '8-agent LangGraph allocation',  icon: Brain,           path: '/fair-dispatch',        category: 'AI Engines',     shortcut: '⌘2', aiTag: true },
  { id: 'consolidation', label: 'Load Consolidation',  description: 'Shipment grouping engine',      icon: Layers,          path: '/load-consolidation',   category: 'AI Engines',     shortcut: '⌘4', aiTag: true },
  { id: 'route-opt',     label: 'Route Optimizer',     description: 'AI multi-stop routing',         icon: Route,           path: '/route-optimization',   category: 'AI Engines',     shortcut: '⌘3', aiTag: true },
  { id: 'drivers',       label: 'Drivers',             description: 'Fleet & wellness management',   icon: Users,           path: '/drivers',              category: 'Operations',     shortcut: '⌘6' },
  { id: 'packages',      label: 'Packages',            description: 'Shipment inventory',            icon: Package,         path: '/packages',             category: 'Operations'      },
  { id: 'assign-tasks',  label: 'Assign Tasks',        description: 'Manual task assignment',        icon: ClipboardList,   path: '/assign-tasks',         category: 'Operations'      },
  { id: 'alloc-routes',  label: 'Allocate Routes',     description: 'Map-based route allocation',    icon: Navigation,      path: '/allocate-routes',      category: 'Operations'      },
  { id: 'absorption',    label: 'Absorption Requests', description: 'Load absorption opportunities', icon: Repeat2,         path: '/absorption-requests',  category: 'Operations'      },
  { id: 'carbon',        label: 'Carbon Tracking',     description: 'CO₂ intelligence & ESG',        icon: Leaf,            path: '/carbon-tracking',      category: 'Compliance & ESG'},
  { id: 'eway-bill',     label: 'e-Way Bills',         description: 'GSTIN compliance bills',        icon: FileText,        path: '/eway-bill',            category: 'Compliance & ESG'},
  { id: 'invoice',       label: 'Invoice AI',          description: 'AI discrepancy detection',      icon: Receipt,         path: '/invoice',              category: 'Compliance & ESG', aiTag: true },
  { id: 'api-keys',      label: 'API Keys',            description: 'Manage access credentials',     icon: Key,             path: '/api-keys',             category: 'System'          },
  { id: 'admin',         label: 'Admin Settings',      description: 'Org, team & system config',     icon: Settings,        path: '/admin',                category: 'System'          },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? COMMANDS.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.description?.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : COMMANDS;

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelected(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selected}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [selected]);

  const execute = (cmd: Command) => {
    onClose();
    if (cmd.action) { cmd.action(); return; }
    if (cmd.path) navigate(cmd.path);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { onClose(); return; }
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, filtered.length - 1)); return; }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); return; }
    if (e.key === 'Enter' && filtered[selected]) { execute(filtered[selected]); return; }
  };

  if (!isOpen) return null;

  // Group filtered results by category
  const grouped = filtered.reduce<Record<string, Command[]>>((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Panel */}
      <div
        className="relative w-full max-w-xl bg-[#0f1117] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/8">
          <Search className="w-4 h-4 text-gray-500 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, actions…"
            className="flex-1 bg-transparent text-white text-sm placeholder-gray-600 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-gray-600 hover:text-gray-400 transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-white/8 border border-white/10 font-mono text-gray-600 ml-1">ESC</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[400px] overflow-y-auto custom-scrollbar py-2">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-600">No results for "{query}"</div>
          ) : (
            Object.entries(grouped).map(([category, cmds]) => (
              <div key={category}>
                <div className="px-4 pt-3 pb-1 text-[10px] font-semibold text-gray-600 uppercase tracking-widest">
                  {category}
                </div>
                {cmds.map(cmd => {
                  const idx = globalIdx++;
                  const isSelected = idx === selected;
                  return (
                    <button
                      key={cmd.id}
                      data-idx={idx}
                      onClick={() => execute(cmd)}
                      onMouseEnter={() => setSelected(idx)}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        isSelected ? 'bg-orange-500/12 text-white' : 'text-gray-300 hover:bg-white/3'
                      }`}
                    >
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-orange-500/20' : 'bg-white/5'
                      }`}>
                        <cmd.icon className={`w-3.5 h-3.5 ${isSelected ? 'text-orange-400' : 'text-gray-400'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{cmd.label}</span>
                          {cmd.aiTag && (
                            <span className="text-[9px] font-bold px-1 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 leading-none flex-shrink-0">
                              AI
                            </span>
                          )}
                        </div>
                        {cmd.description && (
                          <div className="text-xs text-gray-600 truncate mt-0.5">{cmd.description}</div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {cmd.shortcut && (
                          <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/6 border border-white/8 font-mono text-gray-600">
                            {cmd.shortcut}
                          </kbd>
                        )}
                        {isSelected && <ArrowRight className="w-3.5 h-3.5 text-orange-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-white/6 flex items-center gap-4 text-[10px] text-gray-700">
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/8 font-mono">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/8 font-mono">↵</kbd> open</span>
          <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-white/5 border border-white/8 font-mono">ESC</kbd> close</span>
          <span className="ml-auto flex items-center gap-1"><Zap className="w-3 h-3 text-orange-500" /> FairRelay Command</span>
        </div>
      </div>
    </div>
  );
}
