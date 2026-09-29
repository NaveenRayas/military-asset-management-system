import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { Shield, Plus, Edit, Trash2, Search, Layers, Box } from 'lucide-react';

const EquipmentPage = () => {
  const { isAdmin, isCommander, assignedBase } = useAuth();
  const { success, error: toastError } = useToast();

  const [viewMode, setViewMode] = useState('inventory'); // 'inventory' | 'types'
  const [inventoryList, setInventoryList] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedBase, setSelectedBase] = useState(isCommander ? assignedBase?.id || '' : '');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals for Equipment Type CRUD (Admin only)
  const [isTypeModalOpen, setIsTypeModalOpen] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [typeForm, setTypeForm] = useState({
    name: '',
    category: 'Weapon',
    unit: 'units',
    description: '',
  });

  // Fetch dropdowns & data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, eqRes, bRes] = await Promise.all([
        apiClient.get(
          `/inventory/?${selectedBase ? `base_id=${selectedBase}&` : ''}${categoryFilter ? `category=${categoryFilter}` : ''}`
        ),
        apiClient.get(`/equipment/?${categoryFilter ? `category=${categoryFilter}` : ''}`),
        apiClient.get('/bases/'),
      ]);
      setInventoryList(invRes.data?.results || invRes.data || []);
      setEquipmentTypes(eqRes.data?.results || eqRes.data || []);
      setBases(bRes.data?.results || bRes.data || []);
    } catch (err) {
      console.error('Error fetching equipment data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedBase, categoryFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleOpenCreateType = () => {
    setEditingType(null);
    setTypeForm({ name: '', category: 'Weapon', unit: 'units', description: '' });
    setIsTypeModalOpen(true);
  };

  const handleOpenEditType = (eq) => {
    setEditingType(eq);
    setTypeForm({
      name: eq.name,
      category: eq.category,
      unit: eq.unit,
      description: eq.description || '',
    });
    setIsTypeModalOpen(true);
  };

  const handleTypeSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingType) {
        await apiClient.put(`/equipment/${editingType.id}/`, typeForm);
        success(`Equipment type '${typeForm.name}' updated!`);
      } else {
        await apiClient.post('/equipment/', typeForm);
        success(`Equipment type '${typeForm.name}' registered!`);
      }
      setIsTypeModalOpen(false);
      fetchData();
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || 'Failed to save equipment type.';
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteType = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.delete(`/equipment/${deleteTarget.id}/`);
      if (res.data?.detail) {
        success(res.data.detail);
      } else {
        success(`Equipment type '${deleteTarget.name}' deleted.`);
      }
      setDeleteTarget(null);
      fetchData();
    } catch (err) {
      toastError('Cannot delete equipment type with active dependencies.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter lists based on search
  const filteredInventory = inventoryList.filter((item) => {
    const term = search.toLowerCase();
    return (
      item.equipment_type_details?.name.toLowerCase().includes(term) ||
      item.base_details?.name.toLowerCase().includes(term) ||
      item.equipment_type_details?.category.toLowerCase().includes(term)
    );
  });

  const filteredTypes = equipmentTypes.filter((t) => {
    const term = search.toLowerCase();
    return t.name.toLowerCase().includes(term) || t.category.toLowerCase().includes(term);
  });

  // Table Columns for Live Inventory
  const inventoryColumns = [
    {
      header: 'Equipment Name',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-100">{row.equipment_type_details?.name}</span>
          <span className="block text-[11px] font-mono text-slate-500">
            {row.equipment_type_details?.unit}
          </span>
        </div>
      ),
    },
    {
      header: 'Category',
      render: (row) => <Badge>{row.equipment_type_details?.category}</Badge>,
    },
    {
      header: 'Base Station',
      render: (row) => <span className="text-slate-300 font-medium">{row.base_details?.name}</span>,
    },
    {
      header: 'Total Quantity',
      accessor: 'quantity',
      render: (row) => (
        <span className="font-mono font-bold text-white text-base">
          {row.quantity.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Assigned in Field',
      accessor: 'assigned_quantity',
      render: (row) => (
        <span className="font-mono font-semibold text-amber-400">
          {row.assigned_quantity.toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Available in Armory',
      accessor: 'available_quantity',
      render: (row) => (
        <span className="font-mono font-bold text-emerald-400 text-base">
          {row.available_quantity.toLocaleString()}
        </span>
      ),
    },
  ];

  // Table Columns for Equipment Catalog
  const typeColumns = [
    {
      header: 'Name',
      accessor: 'name',
      render: (row) => <span className="font-bold text-slate-100">{row.name}</span>,
    },
    {
      header: 'Category',
      accessor: 'category',
      render: (row) => <Badge>{row.category}</Badge>,
    },
    {
      header: 'Standard Unit',
      accessor: 'unit',
      render: (row) => <span className="font-mono text-slate-400">{row.unit}</span>,
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => <span className="text-xs text-slate-400 truncate max-w-sm block">{row.description || '-'}</span>,
    },
    ...(isAdmin
      ? [
          {
            header: 'Actions',
            render: (row) => (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEditType(row)}
                  className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-sky-400 transition-colors"
                  title="Edit Equipment Type"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(row)}
                  className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-rose-400 transition-colors"
                  title="Deactivate / Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono flex items-center gap-2">
            <Shield className="w-6 h-6 text-sky-400" />
            <span>EQUIPMENT & BASE INVENTORIES</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Armament catalog, stationed stock balances, and armory availability tracking
          </p>
        </div>

        {isAdmin && viewMode === 'types' && (
          <button
            onClick={handleOpenCreateType}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-sky-950/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>New Equipment Type</span>
          </button>
        )}
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setViewMode('inventory')}
          className={`flex items-center gap-2 px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
            viewMode === 'inventory'
              ? 'border-sky-500 text-sky-400 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-4 h-4" />
          <span>Base Inventory Levels</span>
        </button>

        <button
          onClick={() => setViewMode('types')}
          className={`flex items-center gap-2 px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
            viewMode === 'types'
              ? 'border-sky-500 text-sky-400 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Equipment Catalog</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search equipment name or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="">All Categories</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Weapon">Weapon</option>
              <option value="Ammunition">Ammunition</option>
              <option value="Communication">Communication</option>
              <option value="Protective Equipment">Protective Equipment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          {viewMode === 'inventory' && (
            <div>
              <select
                value={selectedBase}
                onChange={(e) => setSelectedBase(e.target.value)}
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
          )}
        </div>
      </div>

      {/* Main Table */}
      {viewMode === 'inventory' ? (
        <DataTable
          columns={inventoryColumns}
          data={filteredInventory}
          loading={loading}
          emptyMessage="No inventory registered for selected bases."
        />
      ) : (
        <DataTable
          columns={typeColumns}
          data={filteredTypes}
          loading={loading}
          emptyMessage="No equipment types defined."
        />
      )}

      {/* CREATE / EDIT EQUIPMENT TYPE MODAL */}
      <Modal
        isOpen={isTypeModalOpen}
        onClose={() => setIsTypeModalOpen(false)}
        title={editingType ? `Edit Equipment: ${editingType.name}` : 'Register New Equipment Type'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleTypeSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Equipment Name *
            </label>
            <input
              type="text"
              required
              value={typeForm.name}
              onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Tactical Drone Recon X-1"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Category *
            </label>
            <select
              value={typeForm.category}
              onChange={(e) => setTypeForm((p) => ({ ...p, category: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            >
              <option value="Vehicle">Vehicle</option>
              <option value="Weapon">Weapon</option>
              <option value="Ammunition">Ammunition</option>
              <option value="Communication">Communication</option>
              <option value="Protective Equipment">Protective Equipment</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Unit of Measure *
            </label>
            <input
              type="text"
              required
              value={typeForm.unit}
              onChange={(e) => setTypeForm((p) => ({ ...p, unit: e.target.value }))}
              placeholder="e.g. units, crates, rifles, vehicles"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Technical Description
            </label>
            <textarea
              rows="3"
              value={typeForm.description}
              onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Specifications, caliber, or payload details..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsTypeModalOpen(false)}
              className="px-4 py-2 text-xs font-mono uppercase rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-mono font-bold uppercase rounded-lg bg-sky-600 hover:bg-sky-500 text-white shadow-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>}
              <span>Save Equipment Type</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteType}
        title="Confirm Equipment Deletion / Deactivation"
        message={`Are you sure you want to delete equipment type '${deleteTarget?.name}'? If records exist, it will be safely deactivated.`}
        confirmText="Confirm Deactivate"
        danger={true}
        loading={isSubmitting}
      />
    </div>
  );
};

export default EquipmentPage;
