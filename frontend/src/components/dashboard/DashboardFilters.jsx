import React from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DashboardFilters = ({
  filters,
  onChange,
  onReset,
  bases = [],
  equipmentTypes = [],
}) => {
  const { isCommander, assignedBase } = useAuth();

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Title / Filter badge */}
        <div className="flex items-center gap-2 text-slate-300 font-semibold text-sm">
          <Filter className="w-4 h-4 text-sky-400" />
          <span>Operational Filters</span>
        </div>

        {/* Filter Inputs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 flex-1 lg:max-w-4xl">
          {/* Base Filter */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Command Base
            </label>
            <select
              value={isCommander ? assignedBase?.id || '' : filters.base_id || 'all'}
              onChange={(e) => onChange('base_id', e.target.value)}
              disabled={isCommander}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-60 disabled:cursor-not-allowed font-medium"
            >
              {!isCommander && <option value="all">All Operational Bases</option>}
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          {/* Equipment Type Filter */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Asset Category / Type
            </label>
            <select
              value={filters.equipment_type_id || 'all'}
              onChange={(e) => onChange('equipment_type_id', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-medium"
            >
              <option value="all">All Equipment Types</option>
              {equipmentTypes.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => onChange('date_from', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-mono uppercase text-slate-400 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => onChange('date_to', e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
        </div>

        {/* Reset Filter Button */}
        <div className="flex items-end justify-end">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs font-mono transition-colors"
            title="Reset to default operational window"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DashboardFilters;
