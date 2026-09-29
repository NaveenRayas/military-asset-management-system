import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { Building2, Plus, Edit, Trash2, Search, MapPin, Users, Box } from 'lucide-react';

const BasesPage = () => {
  const { isAdmin } = useAuth();
  const { success, error: toastError } = useToast();

  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBase, setEditingBase] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    description: '',
    is_active: true,
  });

  const fetchBases = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/bases/');
      setBases(res.data?.results || res.data || []);
    } catch (err) {
      console.error('Failed to fetch bases:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBases();
  }, [fetchBases]);

  const handleOpenCreate = () => {
    setEditingBase(null);
    setFormData({
      name: '',
      code: '',
      location: '',
      description: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (base) => {
    setEditingBase(base);
    setFormData({
      name: base.name,
      code: base.code,
      location: base.location,
      description: base.description || '',
      is_active: base.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingBase) {
        await apiClient.put(`/bases/${editingBase.id}/`, formData);
        success(`Military Base '${formData.name}' updated!`);
      } else {
        await apiClient.post('/bases/', formData);
        success(`Military Base '${formData.name}' commissioned!`);
      }
      setIsModalOpen(false);
      fetchBases();
    } catch (err) {
      const msg =
        err.response?.data?.name?.[0] ||
        err.response?.data?.code?.[0] ||
        err.response?.data?.detail ||
        'Failed to save base information.';
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsSubmitting(true);
    try {
      const res = await apiClient.delete(`/bases/${deleteTarget.id}/`);
      if (res.data?.detail) {
        success(res.data.detail);
      } else {
        success(`Military base '${deleteTarget.name}' removed.`);
      }
      setDeleteTarget(null);
      fetchBases();
    } catch (err) {
      toastError('Failed to decommission base.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredBases = bases.filter((b) => {
    const term = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(term) ||
      b.code.toLowerCase().includes(term) ||
      b.location.toLowerCase().includes(term)
    );
  });

  const columns = [
    {
      header: 'Base Name',
      accessor: 'name',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-100 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-sky-400" />
            {row.name}
          </span>
          <span className="text-[11px] text-slate-400 font-mono block pl-5">{row.description || 'No description'}</span>
        </div>
      ),
    },
    {
      header: 'Station Code',
      accessor: 'code',
      render: (row) => (
        <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-400 border border-slate-700">
          {row.code}
        </span>
      ),
    },
    {
      header: 'Geographic Location',
      accessor: 'location',
      render: (row) => (
        <span className="text-slate-300 flex items-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          {row.location}
        </span>
      ),
    },
    {
      header: 'Personnel Stationed',
      accessor: 'personnel_count',
      render: (row) => (
        <span className="font-mono text-slate-300 flex items-center gap-1">
          <Users className="w-3.5 h-3.5 text-slate-500" />
          {row.personnel_count || 0} officers
        </span>
      ),
    },
    {
      header: 'Stocked Items',
      accessor: 'inventory_items_count',
      render: (row) => (
        <span className="font-mono text-slate-300 flex items-center gap-1">
          <Box className="w-3.5 h-3.5 text-slate-500" />
          {row.inventory_items_count || 0} equipment lines
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'is_active',
      render: (row) => (
        <Badge variant={row.is_active ? 'success' : 'danger'}>
          {row.is_active ? 'ACTIVE' : 'DEACTIVATED'}
        </Badge>
      ),
    },
    ...(isAdmin
      ? [
          {
            header: 'Actions',
            render: (row) => (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleOpenEdit(row)}
                  className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-sky-400 transition-colors"
                  title="Edit Base Info"
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
            <Building2 className="w-6 h-6 text-sky-400" />
            <span>MILITARY BASES & OUTPOSTS</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Command headquarters, forward operating bases, and logistics supply depots
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-sky-950/40 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Commission New Base</span>
          </button>
        )}
      </div>

      {/* Search Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search base name, code, or sector..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>
      </div>

      {/* Bases Table */}
      <DataTable columns={columns} data={filteredBases} loading={loading} />

      {/* CREATE / EDIT BASE MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingBase ? `Update Base: ${editingBase.name}` : 'Commission New Military Base'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Base Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="e.g. Delta Command Outpost"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Station Code *
            </label>
            <input
              type="text"
              required
              value={formData.code}
              onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))}
              placeholder="e.g. BASE-DELTA"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Geographic Location / Coordinates *
            </label>
            <input
              type="text"
              required
              value={formData.location}
              onChange={(e) => setFormData((p) => ({ ...p, location: e.target.value }))}
              placeholder="e.g. Sector 14, Western Plateau"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Base Description & Strategic Purpose
            </label>
            <textarea
              rows="3"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              placeholder="Operational specialization, defense infrastructure..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
              className="rounded bg-slate-950 border-slate-800 text-sky-500 focus:ring-0"
            />
            <label htmlFor="is_active" className="text-xs font-mono text-slate-300">
              Operational Status: Base is actively commissioned
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
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
              <span>Save Base Record</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DELETE DIALOG */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Confirm Base Decommissioning"
        message={`Are you sure you want to delete '${deleteTarget?.name}'? If active inventory or transactions exist, it will be safely deactivated to preserve audit trails.`}
        confirmText="Confirm Deactivate"
        danger={true}
        loading={isSubmitting}
      />
    </div>
  );
};

export default BasesPage;
