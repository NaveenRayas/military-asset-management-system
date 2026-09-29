import React from 'react';
import { ArrowUpRight } from 'lucide-react';

const StatCard = ({
  title,
  value,
  icon: Icon,
  variant = 'default',
  subtitle,
  onClick,
  clickable = false,
  badgeText,
}) => {
  const variantThemes = {
    default: {
      border: 'border-slate-800 hover:border-slate-700',
      bg: 'bg-slate-900/60',
      iconBg: 'bg-slate-800 text-slate-300',
      accent: 'text-slate-100',
    },
    primary: {
      border: 'border-sky-900/50 hover:border-sky-700/60',
      bg: 'bg-sky-950/20',
      iconBg: 'bg-sky-900/50 text-sky-400',
      accent: 'text-sky-300',
    },
    success: {
      border: 'border-emerald-900/50 hover:border-emerald-700/60',
      bg: 'bg-emerald-950/20',
      iconBg: 'bg-emerald-900/50 text-emerald-400',
      accent: 'text-emerald-300',
    },
    amber: {
      border: 'border-amber-900/50 hover:border-amber-700/60',
      bg: 'bg-amber-950/20',
      iconBg: 'bg-amber-900/50 text-amber-400',
      accent: 'text-amber-300',
    },
    rose: {
      border: 'border-rose-900/50 hover:border-rose-700/60',
      bg: 'bg-rose-950/20',
      iconBg: 'bg-rose-900/50 text-rose-400',
      accent: 'text-rose-300',
    },
    indigo: {
      border: 'border-indigo-900/50 hover:border-indigo-700/60',
      bg: 'bg-indigo-950/20',
      iconBg: 'bg-indigo-900/50 text-indigo-400',
      accent: 'text-indigo-300',
    },
  };

  const theme = variantThemes[variant] || variantThemes.default;

  return (
    <div
      onClick={onClick}
      className={`relative p-5 rounded-xl border backdrop-blur-md transition-all duration-200 shadow-lg ${theme.bg} ${theme.border} ${
        clickable || onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.99] group' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 font-mono">
              {title}
            </span>
            {badgeText && (
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                {badgeText}
              </span>
            )}
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-mono flex items-baseline gap-2">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
        </div>

        <div className={`p-3 rounded-lg flex-shrink-0 ${theme.iconBg}`}>
          {Icon && <Icon className="w-5 h-5" />}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/80 pt-2.5">
        <span className="truncate">{subtitle || 'Updated in real-time'}</span>
        {(clickable || onClick) && (
          <span className="inline-flex items-center gap-1 text-sky-400 group-hover:text-sky-300 font-medium">
            Inspect <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;
