import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import LoadingSpinner from '../common/LoadingSpinner';
import Badge from '../common/Badge';
import apiClient from '../../api/client';
import { ArrowDownRight, ArrowUpRight, Repeat, Search } from 'lucide-react';

const NetMovementModal = ({ isOpen, onClose, filters }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({ summary: {}, transactions: [] });
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchNetMovement();
    }
  }, [isOpen, filters]);

  const fetchNetMovement = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.base_id && filters.base_id !== 'all') params.append('base_id', filters.base_id);
      if (filters.equipment_type_id && filters.equipment_type_id !== 'all') params.append('equipment_type_id', filters.equipment_type_id);
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);

      const res = await apiClient.get(`/dashboard/net-movement/?${params.toString()}`);
      setData(res.data);
    } catch (err) {
      console.error('Failed to fetch net movement details:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = (data.transactions || []).filter((tx) => {
    const term = search.toLowerCase();
    return (
      tx.reference.toLowerCase().includes(term) ||
      tx.equipment_type.toLowerCase().includes(term) ||
      tx.base.toLowerCase().includes(term) ||
      tx.transaction_type.toLowerCase().includes(term)
    );
  });

  const { summary = {} } = data;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Net Asset Movement Analysis" maxWidth="max-w-4xl">
      {loading ? (
        <LoadingSpinner text="Computing inventory transaction logs..." />
      ) : (
        <div className="space-y-6">
          {/* Top Formula & Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            {/* Purchases */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Purchases</span>
                <ArrowDownRight className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-400 mt-1">
                +{summary.purchases_total || 0}
              </div>
              <span className="text-[10px] text-slate-500">Inbound new stock</span>
            </div>

            {/* Transfer In */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Transfer In</span>
                <ArrowDownRight className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-sky-400 mt-1">
                +{summary.transfer_in_total || 0}
              </div>
              <span className="text-[10px] text-slate-500">Inter-base arrivals</span>
            </div>

            {/* Transfer Out */}
            <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Transfer Out</span>
                <ArrowUpRight className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-400 mt-1">
                -{summary.transfer_out_total || 0}
              </div>
              <span className="text-[10px] text-slate-500">Dispatched transfers</span>
            </div>

            {/* Net Total */}
            <div className="p-4 rounded-xl bg-sky-950/40 border border-sky-600/50">
              <div className="flex items-center justify-between text-xs text-sky-300">
                <span>Net Movement</span>
                <Repeat className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-xl sm:text-2xl font-bold text-sky-200 mt-1">
                {summary.net_movement > 0 ? `+${summary.net_movement}` : summary.net_movement || 0}
              </div>
              <span className="text-[10px] text-sky-400/80">Period net change</span>
            </div>
          </div>

          {/* Equation Banner */}
          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono text-center text-slate-400">
            Formula: <span className="text-slate-200 font-semibold">{summary.display_equation}</span>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 rounded-lg px-3 py-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, base, or equipment..."
              className="bg-transparent text-sm text-slate-200 placeholder-slate-500 focus:outline-none w-full font-mono"
            />
          </div>

          {/* Transaction Table */}
          <div className="border border-slate-800 rounded-lg overflow-x-auto max-h-72">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 bg-slate-950 border-b border-slate-800 text-slate-400 font-mono uppercase">
                <tr>
                  <th className="p-2.5">Date</th>
                  <th className="p-2.5">Reference</th>
                  <th className="p-2.5">Type</th>
                  <th className="p-2.5">Equipment</th>
                  <th className="p-2.5">Base</th>
                  <th className="p-2.5 text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-6 text-center text-slate-500">
                      No transaction records in this period.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-2.5 text-slate-400">{tx.date}</td>
                      <td className="p-2.5 font-semibold text-slate-200">{tx.reference}</td>
                      <td className="p-2.5">
                        <Badge
                          variant={
                            tx.transaction_type === 'PURCHASE'
                              ? 'success'
                              : tx.transaction_type === 'TRANSFER_IN'
                              ? 'primary'
                              : 'warning'
                          }
                        >
                          {tx.transaction_type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="p-2.5 text-slate-300">{tx.equipment_type}</td>
                      <td className="p-2.5 text-slate-400">{tx.base}</td>
                      <td
                        className={`p-2.5 text-right font-bold ${
                          tx.raw_quantity > 0 ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {tx.signed_quantity}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer Close */}
          <div className="flex justify-end pt-2">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
            >
              Close Analysis
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default NetMovementModal;
