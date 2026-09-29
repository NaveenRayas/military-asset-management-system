import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import StatCard from '../components/common/StatCard';
import DashboardFilters from '../components/dashboard/DashboardFilters';
import TrendCharts from '../components/dashboard/TrendCharts';
import NetMovementModal from '../components/dashboard/NetMovementModal';
import LoadingSpinner from '../components/common/LoadingSpinner';
import {
  Package,
  ShoppingCart,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  CheckCircle2,
  UserCheck,
  Flame,
} from 'lucide-react';

const DashboardPage = () => {
  const { user, isCommander, assignedBase } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ kpis: {}, charts: {} });
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [isNetMovementOpen, setIsNetMovementOpen] = useState(false);

  // Filters state
  const [filters, setFilters] = useState({
    base_id: isCommander ? assignedBase?.id || '' : 'all',
    equipment_type_id: 'all',
    date_from: '',
    date_to: '',
  });

  // Load Bases & Equipment dropdowns
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [basesRes, eqRes] = await Promise.all([
          apiClient.get('/bases/'),
          apiClient.get('/equipment/'),
        ]);
        setBases(basesRes.data?.results || basesRes.data || []);
        setEquipmentTypes(eqRes.data?.results || eqRes.data || []);
      } catch (err) {
        console.error('Error fetching filter options:', err);
      }
    };
    fetchOptions();
  }, []);

  // Fetch Dashboard summary data
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.base_id && filters.base_id !== 'all') params.append('base_id', filters.base_id);
      if (filters.equipment_type_id && filters.equipment_type_id !== 'all') params.append('equipment_type_id', filters.equipment_type_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const res = await apiClient.get(`/dashboard/summary/?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      console.error('Error fetching dashboard summary:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleFilterReset = () => {
    setFilters({
      base_id: isCommander ? assignedBase?.id || '' : 'all',
      equipment_type_id: 'all',
      date_from: '',
      date_to: '',
    });
  };

  const { kpis = {}, charts = {} } = data;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono flex items-center gap-2">
            <span>OPERATIONAL COMMAND DASHBOARD</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            {isCommander
              ? `Base Command Sector: ${assignedBase?.name || 'Assigned Post'} (Restricted Access)`
              : 'Global Asset Movement, Inventory Accounting & Balance Analysis'}
          </p>
        </div>
      </div>

      {/* Filter Component */}
      <DashboardFilters
        filters={filters}
        onChange={handleFilterChange}
        onReset={handleFilterReset}
        bases={bases}
        equipmentTypes={equipmentTypes}
      />

      {loading ? (
        <div className="py-20">
          <LoadingSpinner text="Calculating dynamic inventory balances & analytics..." />
        </div>
      ) : (
        <>
          {/* KPI Stat Cards Grid (8 Cards as requested) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Opening Balance */}
            <StatCard
              title="Opening Balance"
              value={kpis.opening_balance || 0}
              icon={Package}
              variant="default"
              subtitle="Stock prior to period"
            />

            {/* 2. Purchases */}
            <StatCard
              title="Purchases (+)"
              value={kpis.purchases || 0}
              icon={ShoppingCart}
              variant="success"
              subtitle="Procured acquisitions"
            />

            {/* 3. Transfer In */}
            <StatCard
              title="Transfer In (+)"
              value={kpis.transfer_in || 0}
              icon={ArrowDownLeft}
              variant="primary"
              subtitle="Inbound base arrivals"
            />

            {/* 4. Transfer Out */}
            <StatCard
              title="Transfer Out (-)"
              value={kpis.transfer_out || 0}
              icon={ArrowUpRight}
              variant="amber"
              subtitle="Outbound base dispatches"
            />

            {/* 5. Net Movement (Interactive modal on click!) */}
            <StatCard
              title="Net Movement"
              value={kpis.net_movement > 0 ? `+${kpis.net_movement}` : kpis.net_movement || 0}
              icon={Repeat}
              variant="indigo"
              badgeText="Interactive"
              clickable={true}
              onClick={() => setIsNetMovementOpen(true)}
              subtitle="Purchases + In - Out"
            />

            {/* 6. Closing Balance */}
            <StatCard
              title="Closing Balance"
              value={kpis.closing_balance || 0}
              icon={CheckCircle2}
              variant="success"
              subtitle="Opening + Net - Expended"
            />

            {/* 7. Assigned */}
            <StatCard
              title="Assigned to Personnel"
              value={kpis.assigned || 0}
              icon={UserCheck}
              variant="primary"
              subtitle="In active field deployment"
            />

            {/* 8. Expended */}
            <StatCard
              title="Expended / Consumed"
              value={kpis.expended || 0}
              icon={Flame}
              variant="rose"
              subtitle="Total consumed or written-off"
            />
          </div>

          {/* Visual Trends & Breakdown Charts */}
          <TrendCharts charts={charts} />
        </>
      )}

      {/* Net Movement Analysis Modal */}
      <NetMovementModal
        isOpen={isNetMovementOpen}
        onClose={() => setIsNetMovementOpen(false)}
        filters={filters}
      />
    </div>
  );
};

export default DashboardPage;
