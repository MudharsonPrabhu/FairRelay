import { useState } from 'react';
import { Brain, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';

interface AIInsightCardProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  confidence?: number;
}

export function AIInsightCard({ title, children, defaultExpanded = true, className = '', confidence }: AIInsightCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className={`border border-violet-500/25 rounded-xl bg-gradient-to-br from-violet-500/8 to-transparent backdrop-blur-sm ${className}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left"
      >
        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-violet-500/15 border border-violet-500/30 flex-shrink-0">
          <Brain className="w-3.5 h-3.5 text-violet-400" />
        </div>
        <span className="flex-1 text-sm font-semibold text-white">{title}</span>
        <div className="flex items-center gap-2">
          {confidence !== undefined && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25">
              {confidence}% conf
            </span>
          )}
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-400 border border-violet-500/25 flex items-center gap-0.5 leading-none">
            <Sparkles className="w-2.5 h-2.5" /> AI
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-violet-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-violet-400 flex-shrink-0" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-5 pb-5 pt-0 border-t border-violet-500/10">
          <div className="pt-4 text-sm text-gray-300 leading-relaxed">{children}</div>
        </div>
      )}
    </div>
  );
}
