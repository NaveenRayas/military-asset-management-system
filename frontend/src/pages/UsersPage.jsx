import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import { Users, Plus, Edit, UserX, Search, ShieldAlert, Key, Building2 } from 'lucide-react';

const UsersPage = () => {
  const { user: currentUser } = useAuth();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState([]);
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'LOGISTICS_OFFICER',
    base: '',
    is_active: true,
  });

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, bRes] = await Promise.all([
        apiClient.get('/users/'),
        apiClient.get('/bases/'),
      ]);
      setUsers(uRes.data?.results || uRes.data || []);
      setBases(bRes.data?.results || bRes.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      username: '',
      password: '',
      first_name: '',
      last_name: '',
      role: 'LOGISTICS_OFFICER',
      base: '',
      is_active: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user) => {
    setEditingUser(user);
    setFormData({
      email: user.email,
      username: user.username || '',
      password: '', // Leave blank unless resetting
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      role: user.role,
      base: user.base || '',
      is_active: user.is_active,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.role === 'BASE_COMMANDER' && !formData.base) {
      toastError('A Base Commander MUST be assigned to an operational base.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = { ...formData };
      if (!payload.base) payload.base = null;
      if (editingUser && !payload.password) delete payload.password;

      if (editingUser) {
        await apiClient.put(`/users/${editingUser.id}/`, payload);
        success(`User ${formData.email} profile updated!`);
      } else {
        await apiClient.post('/users/', payload);
        success(`User ${formData.email} registered successfully!`);
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      const msg =
        err.response?.data?.email?.[0] ||
        err.response?.data?.base?.[0] ||
        err.response?.data?.password?.[0] ||
        err.response?.data?.detail ||
        'Failed to save user account.';
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeactivate = async () => {
    if (!deactivateTarget) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/users/${deactivateTarget.id}/`);
      success(`User ${deactivateTarget.email} deactivated.`);
      setDeactivateTarget(null);
      fetchUsers();
    } catch (err) {
      const msg = err.response?.data?.detail || 'Failed to deactivate user.';
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.email.toLowerCase().includes(term) ||
      u.full_name?.toLowerCase().includes(term) ||
      u.role.toLowerCase().includes(term) ||
      (u.base_details?.name && u.base_details.name.toLowerCase().includes(term))
    );
  });

  const columns = [
    {
      header: 'Officer / Personnel Name',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-100">{row.full_name || 'Anonymous Officer'}</span>
          <span className="block text-[11px] font-mono text-slate-400">{row.email}</span>
        </div>
      ),
    },
    {
      header: 'Security Role',
      accessor: 'role',
      render: (row) => <Badge>{row.role}</Badge>,
    },
    {
      header: 'Assigned Command Base',
      accessor: 'base',
      render: (row) => (
        row.base_details ? (
          <span className="text-slate-300 font-medium flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-sky-400" />
            {row.base_details.name} ({row.base_details.code})
          </span>
        ) : (
          <span className="text-slate-500 font-mono text-xs italic">HQ Central (All Bases)</span>
        )
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
    {
      header: 'Registered',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-xs font-mono text-slate-400">
          {new Date(row.created_at).toLocaleDateString()}
        </span>
      ),
    },
    {
      header: 'Actions',
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-sky-400 transition-colors"
            title="Edit User Role / Base"
          >
            <Edit className="w-4 h-4" />
          </button>
          {row.id !== currentUser?.id && row.is_active && (
            <button
              onClick={() => setDeactivateTarget(row)}
              className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-rose-400 transition-colors"
              title="Deactivate Account"
            >
              <UserX className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono flex items-center gap-2">
            <Users className="w-6 h-6 text-sky-400" />
            <span>PERSONNEL & ROLE MANAGEMENT</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Provision user accounts, enforce Role-Based Access Control (RBAC), and assign commanders
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-sky-950/40 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Provision New Officer</span>
        </button>
      </div>

      {/* Search Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email, name, or role..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
          />
        </div>
      </div>

      {/* Users Table */}
      <DataTable columns={columns} data={filteredUsers} loading={loading} />

      {/* CREATE / EDIT USER MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingUser ? `Update Account: ${editingUser.email}` : 'Provision New Officer Account'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                First Name
              </label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData((p) => ({ ...p, first_name: e.target.value }))}
                placeholder="Marcus"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Last Name
              </label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData((p) => ({ ...p, last_name: e.target.value }))}
                placeholder="Vance"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Official Email Address *
              </label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
                placeholder="officer@military.defense.mil"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                {editingUser ? 'Reset Password (Leave blank to keep current)' : 'Password *'}
              </label>
              <input
                type="password"
                required={!editingUser}
                value={formData.password}
                onChange={(e) => setFormData((p) => ({ ...p, password: e.target.value }))}
                placeholder={editingUser ? '••••••••••••' : 'Min 8 chars required'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                System Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData((p) => ({ ...p, role: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              >
                <option value="ADMIN">ADMIN (Full Access)</option>
                <option value="BASE_COMMANDER">BASE COMMANDER</option>
                <option value="LOGISTICS_OFFICER">LOGISTICS OFFICER</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Assigned Command Base {formData.role === 'BASE_COMMANDER' && '*'}
              </label>
              <select
                value={formData.base}
                onChange={(e) => setFormData((p) => ({ ...p, base: e.target.value }))}
                required={formData.role === 'BASE_COMMANDER'}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              >
                <option value="">None (HQ / System Wide)</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {editingUser && (
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="user_active"
                checked={formData.is_active}
                onChange={(e) => setFormData((p) => ({ ...p, is_active: e.target.checked }))}
                className="rounded bg-slate-950 border-slate-800 text-sky-500"
              />
              <label htmlFor="user_active" className="text-xs font-mono text-slate-300">
                Account Status: Active
              </label>
            </div>
          )}

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
              <span>Save Account</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* DEACTIVATE CONFIRMATION DIALOG */}
      <ConfirmDialog
        isOpen={!!deactivateTarget}
        onClose={() => setDeactivateTarget(null)}
        onConfirm={handleDeactivate}
        title="Confirm Account Deactivation"
        message={`Are you sure you want to deactivate officer account '${deactivateTarget?.email}'? The user will immediately lose system login access.`}
        confirmText="Confirm Deactivation"
        danger={true}
        loading={isSubmitting}
      />
    </div>
  );
};

export default UsersPage;
