import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import ConfirmDialog from '../components/common/ConfirmDialog';
import {
  ClipboardList,
  Flame,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  UserCheck,
  Building2,
  Calendar,
} from 'lucide-react';

const AssignmentsExpendituresPage = () => {
  const { user, isCommander, assignedBase } = useAuth();
  const { success, error: toastError } = useToast();

  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments' | 'expenditures'
  const [loading, setLoading] = useState(true);

  // Data states
  const [assignments, setAssignments] = useState([]);
  const [expenditures, setExpenditures] = useState([]);

  // Filter dropdowns
  const [bases, setBases] = useState([]);
  const [equipmentTypes, setEquipmentTypes] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedBase, setSelectedBase] = useState(isCommander ? assignedBase?.id || '' : '');

  // Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isExpendModalOpen, setIsExpendModalOpen] = useState(false);
  const [returnConfirmTarget, setReturnConfirmTarget] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [assignForm, setAssignForm] = useState({
    base: isCommander ? assignedBase?.id || '' : '',
    equipment_type: '',
    quantity: '1',
    personnel_name: '',
    personnel_identifier: '',
    assignment_date: new Date().toISOString().split('T')[0],
    notes: '',
  });

  const [expendForm, setExpendForm] = useState({
    base: isCommander ? assignedBase?.id || '' : '',
    equipment_type: '',
    quantity: '1',
    expenditure_date: new Date().toISOString().split('T')[0],
    reason: '',
    reference_number: `EXP-${Date.now().toString().slice(-6)}`,
    notes: '',
  });

  // Load Base & Equipment options
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

  // Fetch Assignments
  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedBase) params.append('base_id', selectedBase);
      const res = await apiClient.get(`/assignments/?${params.toString()}`);
      setAssignments(res.data?.results || res.data || []);
    } catch (err) {
      console.error('Error fetching assignments:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedBase]);

  // Fetch Expenditures
  const fetchExpenditures = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedBase) params.append('base_id', selectedBase);
      const res = await apiClient.get(`/expenditures/?${params.toString()}`);
      setExpenditures(res.data?.results || res.data || []);
    } catch (err) {
      console.error('Error fetching expenditures:', err);
    } finally {
      setLoading(false);
    }
  }, [search, selectedBase]);

  useEffect(() => {
    if (activeTab === 'assignments') {
      fetchAssignments();
    } else {
      fetchExpenditures();
    }
  }, [activeTab, fetchAssignments, fetchExpenditures]);

  // Create Assignment
  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/assignments/', {
        ...assignForm,
        quantity: parseInt(assignForm.quantity, 10),
      });
      success(`Asset assigned to ${assignForm.personnel_name} (${assignForm.personnel_identifier})!`);
      setIsAssignModalOpen(false);
      setAssignForm({
        base: isCommander ? assignedBase?.id || '' : '',
        equipment_type: '',
        quantity: '1',
        personnel_name: '',
        personnel_identifier: '',
        assignment_date: new Date().toISOString().split('T')[0],
        notes: '',
      });
      fetchAssignments();
    } catch (err) {
      const msg =
        err.response?.data?.quantity?.[0] ||
        err.response?.data?.detail ||
        'Failed to create assignment. Verify sufficient unassigned inventory.';
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Mark Assignment as Returned
  const handleMarkReturned = async () => {
    if (!returnConfirmTarget) return;
    setIsSubmitting(true);
    try {
      await apiClient.patch(`/assignments/${returnConfirmTarget.id}/`, {
        status: 'RETURNED',
      });
      success(`Asset marked as RETURNED to base inventory.`);
      setReturnConfirmTarget(null);
      fetchAssignments();
    } catch (err) {
      toastError('Failed to update assignment status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Record Expenditure
  const handleExpendSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await apiClient.post('/expenditures/', {
        ...expendForm,
        quantity: parseInt(expendForm.quantity, 10),
      });
      success(`Expenditure ${expendForm.reference_number} recorded & inventory reduced!`);
      setIsExpendModalOpen(false);
      setExpendForm({
        base: isCommander ? assignedBase?.id || '' : '',
        equipment_type: '',
        quantity: '1',
        expenditure_date: new Date().toISOString().split('T')[0],
        reason: '',
        reference_number: `EXP-${Date.now().toString().slice(-6)}`,
        notes: '',
      });
      fetchExpenditures();
    } catch (err) {
      const msg =
        err.response?.data?.quantity?.[0] ||
        err.response?.data?.detail ||
        'Failed to record expenditure. Check available inventory.';
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Columns for Assignments
  const assignmentColumns = [
    {
      header: 'Personnel / Recipient',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-100">{row.personnel_name}</span>
          <span className="block text-[11px] font-mono text-sky-400">ID: {row.personnel_identifier}</span>
        </div>
      ),
    },
    {
      header: 'Equipment',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-200">{row.equipment_type_details?.name}</span>
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
        <span className="font-mono font-bold text-sky-400">
          {row.quantity} {row.equipment_type_details?.unit || 'units'}
        </span>
      ),
    },
    {
      header: 'Base',
      render: (row) => <span className="text-slate-300">{row.base_details?.name}</span>,
    },
    {
      header: 'Assigned Date',
      accessor: 'assignment_date',
      render: (row) => <span className="font-mono text-slate-400">{row.assignment_date}</span>,
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (row) => <Badge>{row.status}</Badge>,
    },
    {
      header: 'Actions',
      render: (row) => (
        row.status === 'ACTIVE' ? (
          <button
            onClick={() => setReturnConfirmTarget(row)}
            className="px-2.5 py-1 text-xs font-mono rounded bg-emerald-950/60 border border-emerald-700 text-emerald-300 hover:bg-emerald-900/60 transition-colors flex items-center gap-1"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Return</span>
          </button>
        ) : (
          <span className="text-slate-500 text-xs font-mono italic">Archived</span>
        )
      ),
    },
  ];

  // Columns for Expenditures
  const expenditureColumns = [
    {
      header: 'Reference',
      accessor: 'reference_number',
      render: (row) => <span className="font-mono font-bold text-rose-400">{row.reference_number}</span>,
    },
    {
      header: 'Date',
      accessor: 'expenditure_date',
      render: (row) => <span className="font-mono text-slate-400">{row.expenditure_date}</span>,
    },
    {
      header: 'Base',
      render: (row) => <span className="text-slate-300">{row.base_details?.name}</span>,
    },
    {
      header: 'Equipment',
      render: (row) => (
        <span className="font-semibold text-slate-200">{row.equipment_type_details?.name}</span>
      ),
    },
    {
      header: 'Quantity Expended',
      accessor: 'quantity',
      render: (row) => (
        <span className="font-mono font-bold text-rose-400">
          -{row.quantity.toLocaleString()} {row.equipment_type_details?.unit || 'units'}
        </span>
      ),
    },
    {
      header: 'Reason / Incident',
      accessor: 'reason',
      render: (row) => (
        <div>
          <span className="text-slate-200 font-medium">{row.reason}</span>
          {row.notes && <span className="block text-[11px] text-slate-500 truncate max-w-xs">{row.notes}</span>}
        </div>
      ),
    },
    {
      header: 'Officer',
      render: (row) => (
        <span className="font-mono text-[11px] text-slate-400">{row.recorded_by_email || 'Officer'}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-sky-400" />
            <span>FIELD ASSIGNMENTS & CONSUMPTION</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Track individual personnel equipment issues and record authorized ammunition/material expenditures
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'assignments' ? (
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-sky-950/40 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Assignment</span>
            </button>
          ) : (
            <button
              onClick={() => setIsExpendModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold uppercase tracking-wider shadow-lg shadow-rose-950/40 transition-colors"
            >
              <Flame className="w-4 h-4" />
              <span>Record Expenditure</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs Selector */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('assignments')}
          className={`flex items-center gap-2 px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
            activeTab === 'assignments'
              ? 'border-sky-500 text-sky-400 bg-sky-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Personnel Assignments</span>
        </button>

        <button
          onClick={() => setActiveTab('expenditures')}
          className={`flex items-center gap-2 px-5 py-3 font-mono text-xs font-bold tracking-wider uppercase border-b-2 transition-all ${
            activeTab === 'expenditures'
              ? 'border-rose-500 text-rose-400 bg-rose-500/10'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Inventory Expenditures</span>
        </button>
      </div>

      {/* Search & Base Filter */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="relative sm:col-span-2">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === 'assignments'
                  ? 'Search personnel name, ID, or equipment...'
                  : 'Search reference, reason, or equipment...'
              }
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

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
        </div>
      </div>

      {/* Table according to active tab */}
      {activeTab === 'assignments' ? (
        <DataTable
          columns={assignmentColumns}
          data={assignments}
          loading={loading}
          emptyMessage="No active or returned assignments on record."
        />
      ) : (
        <DataTable
          columns={expenditureColumns}
          data={expenditures}
          loading={loading}
          emptyMessage="No expenditure records logged."
        />
      )}

      {/* ISSUE ASSIGNMENT MODAL */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Issue Equipment Assignment to Personnel"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleAssignSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Command Base *
              </label>
              <select
                required
                name="base"
                value={assignForm.base}
                onChange={(e) => setAssignForm((p) => ({ ...p, base: e.target.value }))}
                disabled={isCommander}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-60"
              >
                <option value="">Select Base</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
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
                value={assignForm.equipment_type}
                onChange={(e) => setAssignForm((p) => ({ ...p, equipment_type: e.target.value }))}
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
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Personnel Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sgt. Marcus Vance"
                value={assignForm.personnel_name}
                onChange={(e) => setAssignForm((p) => ({ ...p, personnel_name: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Personnel Identifier / Service ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ID-40912"
                value={assignForm.personnel_identifier}
                onChange={(e) => setAssignForm((p) => ({ ...p, personnel_identifier: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Quantity *
              </label>
              <input
                type="number"
                min="1"
                required
                value={assignForm.quantity}
                onChange={(e) => setAssignForm((p) => ({ ...p, quantity: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Assignment Date *
              </label>
              <input
                type="date"
                required
                value={assignForm.assignment_date}
                onChange={(e) => setAssignForm((p) => ({ ...p, assignment_date: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Assignment Notes / Orders
            </label>
            <textarea
              rows="2"
              value={assignForm.notes}
              onChange={(e) => setAssignForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Deployment assignment, operation name, or serial numbers..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
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
              <span>Issue Assignment</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* RECORD EXPENDITURE MODAL */}
      <Modal
        isOpen={isExpendModalOpen}
        onClose={() => setIsExpendModalOpen(false)}
        title="Record Inventory Expenditure / Consumption"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleExpendSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Command Base *
              </label>
              <select
                required
                value={expendForm.base}
                onChange={(e) => setExpendForm((p) => ({ ...p, base: e.target.value }))}
                disabled={isCommander}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 disabled:opacity-60"
              >
                <option value="">Select Base</option>
                {bases.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
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
                value={expendForm.equipment_type}
                onChange={(e) => setExpendForm((p) => ({ ...p, equipment_type: e.target.value }))}
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
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Quantity Expended *
              </label>
              <input
                type="number"
                min="1"
                required
                value={expendForm.quantity}
                onChange={(e) => setExpendForm((p) => ({ ...p, quantity: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Expenditure Date *
              </label>
              <input
                type="date"
                required
                value={expendForm.expenditure_date}
                onChange={(e) => setExpendForm((p) => ({ ...p, expenditure_date: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Expenditure Reference # *
              </label>
              <input
                type="text"
                required
                value={expendForm.reference_number}
                onChange={(e) => setExpendForm((p) => ({ ...p, reference_number: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
                Reason / Purpose *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Combat Training Exercise / Range Qualification"
                value={expendForm.reason}
                onChange={(e) => setExpendForm((p) => ({ ...p, reason: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-slate-300 mb-1">
              Incident / Consumed Equipment Report
            </label>
            <textarea
              rows="2"
              value={expendForm.notes}
              onChange={(e) => setExpendForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="After-action incident summary or disposal authorization..."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsExpendModalOpen(false)}
              className="px-4 py-2 text-xs font-mono uppercase rounded-lg border border-slate-700 hover:bg-slate-800 text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-mono font-bold uppercase rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-lg transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting && <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>}
              <span>Commit & Reduce Inventory</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM RETURN DIALOG */}
      <ConfirmDialog
        isOpen={!!returnConfirmTarget}
        onClose={() => setReturnConfirmTarget(null)}
        onConfirm={handleMarkReturned}
        title="Confirm Equipment Return"
        message={`Confirm return of ${returnConfirmTarget?.quantity} x ${returnConfirmTarget?.equipment_type_details?.name} from ${returnConfirmTarget?.personnel_name}? The asset will be marked as RETURNED and returned to available inventory.`}
        confirmText="Confirm Return"
        danger={false}
        loading={isSubmitting}
      />
    </div>
  );
};

export default AssignmentsExpendituresPage;
