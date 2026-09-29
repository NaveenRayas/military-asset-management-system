import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { ArrowLeftRight, Plus, Search, Eye, AlertCircle, ArrowRight } from 'lucide-react';

const TransfersPage = () => {
  const { user, isCommander, assignedBase } = useAuth();
  const { success, error: toastError } = useToast();

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [fromBase, setFromBase] = useState('');
  const [toBase, setToBase] = useState('');
  const [equipmentType, setEquipmentType] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dropdown lists
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [sourceStock, setSourceStock] = useState(null);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedTransfer, setSelectedTransfer] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Transfer Form
  const [formData, setFormData] = useState({
    from_base: isCommander ? assignedBase?.id || '' : '',
    to_base: '',
    equipment_type: '',
    quantity: '',
    transfer_date: new Date().toISOString().split('T')[0],
    reference_number: `TRF-${Date.now().toString().slice(-6)}`,
    status: 'COMPLETED',
    notes: '',
  });

  // Fetch dropdowns
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [bRes, eqRes] = await Promise.all([
          apiClient.get('/bases/'),
          apiClient.get('/equipment/'),
        ]);
        setBases(bRes.data?.results || bRes.data || []);
        setEquipmentTypes(eqRes.data?.results || eqRes.data || []);
      } catch (err) {
        console.error('Failed to load bases/equipment:', err);
      }
    };
    fetchOptions();
  }, []);

  // Check available inventory at source base when from_base and equipment_type change
  useEffect(() => {
    const checkStock = async () => {
      if (formData.from_base && formData.equipment_type) {
        try {
          const res = await apiClient.get(
            `/inventory/?base_id=${formData.from_base}&equipment_type_id=${formData.equipment_type}`
          );
          const items = res.data?.results || res.data || [];
          if (items.length > 0) {
            setSourceStock(items[0].available_quantity);
          } else {
            setSourceStock(0);
          }
        } catch {
          setSourceStock(null);
        }
      } else {
        setSourceStock(null);
      }
    };
    checkStock();
  }, [formData.from_base, formData.equipment_type]);

  // Fetch transfers list
  const fetchTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (fromBase) params.append('from_base_id', fromBase);
      if (toBase) params.append('to_base_id', toBase);
      if (equipmentType) params.append('equipment_type_id', equipmentType);
      if (statusFilter) params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const res = await apiClient.get(`/transfers/?${params.toString()}`);
      setTransfers(res.data?.results || res.data || []);
    } catch (err) {
      console.error('Error fetching transfers:', err);
    } finally {
      setLoading(false);
    }
  }, [search, fromBase, toBase, equipmentType, statusFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchTransfers();
  }, [fetchTransfers]);

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();

    if (formData.from_base === formData.to_base) {
      toastError('Source base and destination base cannot be identical.');
      return;
    }

    if (sourceStock !== null && parseInt(formData.quantity, 10) > sourceStock) {
      toastError(`Insufficient available stock at source base! Only ${sourceStock} available.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.post('/transfers/', {
        ...formData,
        quantity: parseInt(formData.quantity, 10),
      });

      success(`Transfer ${formData.reference_number} dispatched & recorded!`);
      setIsCreateOpen(false);
      setFormData({
        from_base: isCommander ? assignedBase?.id || '' : '',
        to_base: '',
        equipment_type: '',
        quantity: '',
        transfer_date: new Date().toISOString().split('T')[0],
        reference_number: `TRF-${Date.now().toString().slice(-6)}`,
        status: 'COMPLETED',
        notes: '',
      });
      fetchTransfers();
    } catch (err) {
      const msg =
        err.response?.data?.quantity?.[0] ||
        err.response?.data?.to_base?.[0] ||
        err.response?.data?.non_field_errors?.[0] ||
        err.response?.data?.detail ||
        'Failed to execute transfer. Verify sufficient inventory at source base.';
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns = [
    {
      header: 'Reference',
      accessor: 'reference_number',
      render: (row) => (
        <span className="font-mono font-bold text-sky-400">{row.reference_number}</span>
      ),
    },
    {
      header: 'Date',
      accessor: 'transfer_date',
      render: (row) => <span className="font-mono text-slate-400">{row.transfer_date}</span>,
    },
    {
      header: 'Route (From → To)',
      render: (row) => (
        <div className="flex items-center gap-1.5 font-medium text-slate-200">
          <span className="text-amber-400">{row.from_base_details?.name}</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-sky-400">{row.to_base_details?.name}</span>
        </div>
      ),
    },
    {
      header: 'Equipment',
      accessor: 'equipment_type',
      render: (row) => (
        <span className="font-semibold text-slate-200">
          {row.equipment_type_details?.name}
        </span>
      ),
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (row) => (
        <span className="font-mono font-bold text-white">
          {row.quantity.toLocaleString()} {row.equipment_type_details?.unit || 'units'}
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <Badge>{row.status}</Badge>,
    },
    {
      header: 'Timestamp',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-[11px] font-mono text-slate-500">
          {new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() => setSelectedTransfer(row)}
          className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition-colors"
          title="Inspect Details"
        >
          <Eye className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-sky-400" />
            <span>INTER-BASE TRANSFERS</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Relocate military equipment between bases with atomic inventory reconciliation
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-sky-950/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Initiate Transfer</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div>
            <select
              value={fromBase}
              onChange={(e) => setFromBase(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="">Source: All Bases</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  From: {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={toBase}
              onChange={(e) => setToBase(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="">Destination: All Bases</option>
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  To: {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={equipmentType}
              onChange={(e) => setEquipmentType(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Equipment</option>
              {equipmentTypes.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            >
              <option value="">Status: All</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="PENDING">PENDING</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              placeholder="From Date"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Transfers Data Table */}
      <DataTable columns={columns} data={transfers} loading={loading} />

      {/* INITIATE TRANSFER MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Execute Equipment Transfer Dispatch"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Source Base (From) *
              </label>
              <select
                required
                name="from_base"
                value={formData.from_base}
                onChange={handleFormChange}
                disabled={isCommander}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-60"
              >
                <option value="">Select Origin Base</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Destination Base (To) *
              </label>
              <select
                required
                name="to_base"
                value={formData.to_base}
                onChange={handleFormChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">Select Destination Base</option>
                {bases
                  .filter((b) => b.id.toString() !== formData.from_base.toString())
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.code})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Equipment Type *
              </label>
              <select
                required
                name="equipment_type"
                value={formData.equipment_type}
                onChange={handleFormChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">Select Equipment</option>
                {equipmentTypes.map((eq) => (
                  <option key={eq.id} value={eq.id}>
                    {eq.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-mono uppercase text-slate-300">
                  Transfer Quantity *
                </label>
                {sourceStock !== null && (
                  <span className="text-[10px] font-mono text-sky-400">
                    Avail Stock: <span className="font-bold text-white">{sourceStock}</span>
                  </span>
                )}
              </div>
              <input
                type="number"
                min="1"
                required
                name="quantity"
                value={formData.quantity}
                onChange={handleFormChange}
                placeholder="Units to transfer"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Transfer Date *
              </label>
              <input
                type="date"
                required
                name="transfer_date"
                value={formData.transfer_date}
                onChange={handleFormChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Reference / Manifest # *
              </label>
              <input
                type="text"
                required
                name="reference_number"
                value={formData.reference_number}
                onChange={handleFormChange}
                placeholder="e.g. TRF-2026-001"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Transfer Mission Notes & Escort
            </label>
            <textarea
              rows="2"
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              placeholder="Convoy details, transport vehicle ID, or authorization code..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-mono uppercase rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-mono font-bold uppercase rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-950/50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>}
              <span>Execute Transfer</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* INSPECT TRANSFER MODAL */}
      <Modal
        isOpen={!!selectedTransfer}
        onClose={() => setSelectedTransfer(null)}
        title={`Transfer Manifest: ${selectedTransfer?.reference_number}`}
        maxWidth="max-w-lg"
      >
        {selectedTransfer && (
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block uppercase">Reference</span>
                <span className="text-sky-400 font-bold">{selectedTransfer.reference_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Status</span>
                <Badge>{selectedTransfer.status}</Badge>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Source Base</span>
                <span className="text-amber-400 font-semibold">{selectedTransfer.from_base_details?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Destination Base</span>
                <span className="text-sky-400 font-semibold">{selectedTransfer.to_base_details?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Equipment</span>
                <span className="text-slate-200">{selectedTransfer.equipment_type_details?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Quantity</span>
                <span className="text-white font-bold">{selectedTransfer.quantity.toLocaleString()} units</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block uppercase mb-1">Initiated By</span>
              <p className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300">
                {selectedTransfer.created_by_email || 'Officer'} on {selectedTransfer.transfer_date}
              </p>
            </div>

            {selectedTransfer.notes && (
              <div>
                <span className="text-slate-500 block uppercase mb-1">Operational Notes</span>
                <p className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 whitespace-pre-wrap">
                  {selectedTransfer.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTransfer(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs uppercase"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TransfersPage;
