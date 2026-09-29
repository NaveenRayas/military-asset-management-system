import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import { Plus, Search, ShoppingCart, Eye, DollarSign } from 'lucide-react';

const PurchasesPage = () => {
  const { user, isCommander, assignedBase } = useAuth();
  const { success, error: toastError } = useToast();

  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBase, setSelectedBase] = useState(isCommander ? assignedBase?.id || '' : '');
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Dropdown options
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New Purchase Form
  const [formData, setFormData] = useState({
    base: isCommander ? assignedBase?.id || '' : '',
    equipment_type: '',
    quantity: '',
    purchase_date: new Date().toISOString().split('T')[0],
    reference_number: `PUR-${Date.now().toString().slice(-6)}`,
    supplier: '',
    unit_cost: '',
    notes: '',
  });

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [bRes, eqRes] = await Promise.all([
          apiClient.get('/bases/'),
          apiClient.get('/equipment/'),
        ]);
        setBases(bRes.data?.results || bRes.data || []);
        setEquipmentTypes(eqRes.data?.results || eqRes.data || []);
      } catch (err) {
        console.error('Failed to load filter options:', err);
      }
    };
    fetchDropdowns();
  }, []);

  // Fetch purchases list
  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (search) params.append('search', search);
      if (selectedBase) params.append('base_id', selectedBase);
      if (selectedEquipment) params.append('equipment_type_id', selectedEquipment);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const res = await apiClient.get(`/purchases/?${params.toString()}`);
      if (res.data.results) {
        setPurchases(res.data.results);
        setTotalCount(res.data.count);
        setTotalPages(Math.ceil(res.data.count / 20) || 1);
      } else {
        setPurchases(res.data);
        setTotalCount(res.data.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Error fetching purchases:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, selectedBase, selectedEquipment, dateFrom, dateTo]);

  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);

  // Handle Form Change with automatic total cost preview
  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const calculatedTotalCost = () => {
    const q = parseFloat(formData.quantity) || 0;
    const u = parseFloat(formData.unit_cost) || 0;
    return (q * u).toFixed(2);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/purchases/', {
        ...formData,
        quantity: parseInt(formData.quantity, 10),
        unit_cost: parseFloat(formData.unit_cost),
      });

      success(`Purchase ${formData.reference_number} recorded & inventory updated!`);
      setIsCreateOpen(false);
      setFormData({
        base: isCommander ? assignedBase?.id || '' : '',
        equipment_type: '',
        quantity: '',
        purchase_date: new Date().toISOString().split('T')[0],
        reference_number: `PUR-${Date.now().toString().slice(-6)}`,
        supplier: '',
        unit_cost: '',
        notes: '',
      });
      fetchPurchases();
    } catch (err) {
      const msg =
        err.response?.data?.quantity?.[0] ||
        err.response?.data?.unit_cost?.[0] ||
        err.response?.data?.reference_number?.[0] ||
        err.response?.data?.detail ||
        'Failed to record purchase. Please check all fields.';
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
      accessor: 'purchase_date',
      render: (row) => <span className="font-mono text-slate-400">{row.purchase_date}</span>,
    },
    {
      header: 'Base',
      accessor: 'base',
      render: (row) => (
        <span className="font-medium text-slate-200">
          {row.base_details?.name || `Base #${row.base}`}
        </span>
      ),
    },
    {
      header: 'Equipment',
      accessor: 'equipment_type',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-200">
            {row.equipment_type_details?.name}
          </span>
          <span className="block text-[11px] text-slate-500 font-mono">
            {row.equipment_type_details?.category}
          </span>
        </div>
      ),
    },
    {
      header: 'Quantity',
      accessor: 'quantity',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-400">
          +{row.quantity.toLocaleString()} {row.equipment_type_details?.unit || 'units'}
        </span>
      ),
    },
    {
      header: 'Unit Cost',
      accessor: 'unit_cost',
      render: (row) => (
        <span className="font-mono text-slate-300">${parseFloat(row.unit_cost).toLocaleString()}</span>
      ),
    },
    {
      header: 'Total Cost',
      accessor: 'total_cost',
      render: (row) => (
        <span className="font-mono font-bold text-white">
          ${parseFloat(row.total_cost).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Supplier',
      accessor: 'supplier',
      render: (row) => <span className="text-slate-400 truncate max-w-xs">{row.supplier}</span>,
    },
    {
      header: 'Actions',
      render: (row) => (
        <button
          onClick={() => setSelectedPurchase(row)}
          className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition-colors"
          title="Inspect Purchase"
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
            <ShoppingCart className="w-6 h-6 text-emerald-400" />
            <span>PURCHASES & REQUISITIONS</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Procure stock, record vendor invoices, and increase base inventory atomically
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-950/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Requisition</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference or supplier..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div>
            <select
              value={selectedBase}
              onChange={(e) => {
                setSelectedBase(e.target.value);
                setPage(1);
              }}
              disabled={isCommander}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-60"
            >
              {!isCommander && <option value="">All Bases</option>}
              {bases.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={selectedEquipment}
              onChange={(e) => {
                setSelectedEquipment(e.target.value);
                setPage(1);
              }}
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
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Purchases Data Table */}
      <DataTable
        columns={columns}
        data={purchases}
        loading={loading}
        pagination={{
          current: page,
          totalPages: totalPages,
          count: totalCount,
          hasNext: page < totalPages,
          hasPrevious: page > 1,
        }}
        onPageChange={(p) => setPage(p)}
      />

      {/* CREATE PURCHASE MODAL */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Record New Asset Purchase Requisition"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Command Base *
              </label>
              <select
                required
                name="base"
                value={formData.base}
                onChange={handleFormChange}
                disabled={isCommander}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-60"
              >
                <option value="">Select Destination Base</option>
                {bases.map((b) => (
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
                    {eq.name} ({eq.category})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                name="quantity"
                value={formData.quantity}
                onChange={handleFormChange}
                placeholder="e.g. 50"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Purchase Date *
              </label>
              <input
                type="date"
                required
                name="purchase_date"
                value={formData.purchase_date}
                onChange={handleFormChange}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Reference Number *
              </label>
              <input
                type="text"
                required
                name="reference_number"
                value={formData.reference_number}
                onChange={handleFormChange}
                placeholder="e.g. PUR-2026-001"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Supplier / Contractor *
              </label>
              <input
                type="text"
                required
                name="supplier"
                value={formData.supplier}
                onChange={handleFormChange}
                placeholder="e.g. Arsenal Dynamics Inc."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Unit Cost ($ USD) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                name="unit_cost"
                value={formData.unit_cost}
                onChange={handleFormChange}
                placeholder="e.g. 850.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            {/* Calculated Total Cost Display */}
            <div>
              <label className="block text-xs font-mono uppercase text-slate-400 mb-1">
                Computed Total Cost
              </label>
              <div className="w-full bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-emerald-400 font-bold flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{calculatedTotalCost()}</span>
                <span className="text-[10px] text-slate-500 ml-auto">Qty × Unit</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Requisition Notes & Authority
            </label>
            <textarea
              rows="2"
              name="notes"
              value={formData.notes}
              onChange={handleFormChange}
              placeholder="Batch tracking number, contract code, or special instructions..."
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
              className="px-5 py-2 text-xs font-mono font-bold uppercase rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>}
              <span>Save & Commit Requisition</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* INSPECT PURCHASE MODAL */}
      <Modal
        isOpen={!!selectedPurchase}
        onClose={() => setSelectedPurchase(null)}
        title={`Purchase Details: ${selectedPurchase?.reference_number}`}
        maxWidth="max-w-lg"
      >
        {selectedPurchase && (
          <div className="space-y-4 text-xs font-mono">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-lg border border-slate-800">
              <div>
                <span className="text-slate-500 block uppercase">Reference</span>
                <span className="text-sky-400 font-bold">{selectedPurchase.reference_number}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Date</span>
                <span className="text-slate-200">{selectedPurchase.purchase_date}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Base</span>
                <span className="text-slate-200">{selectedPurchase.base_details?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Equipment</span>
                <span className="text-slate-200">{selectedPurchase.equipment_type_details?.name}</span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Quantity</span>
                <span className="text-emerald-400 font-bold">
                  +{selectedPurchase.quantity} {selectedPurchase.equipment_type_details?.unit}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block uppercase">Total Cost</span>
                <span className="text-white font-bold">${parseFloat(selectedPurchase.total_cost).toLocaleString()}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block uppercase mb-1">Supplier</span>
              <p className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-200">
                {selectedPurchase.supplier}
              </p>
            </div>

            <div>
              <span className="text-slate-500 block uppercase mb-1">Recorded By</span>
              <p className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300">
                {selectedPurchase.created_by_email || 'System'} at {new Date(selectedPurchase.created_at).toLocaleString()}
              </p>
            </div>

            {selectedPurchase.notes && (
              <div>
                <span className="text-slate-500 block uppercase mb-1">Requisition Notes</span>
                <p className="p-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-300 whitespace-pre-wrap">
                  {selectedPurchase.notes}
                </p>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPurchase(null)}
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

export default PurchasesPage;
