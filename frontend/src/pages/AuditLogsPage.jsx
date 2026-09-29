import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';
import { History, Search, ShieldCheck, Eye, Terminal } from 'lucide-react';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Selected Log for JSON Metadata inspection
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page);
      if (search) params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);
      if (entityFilter) params.append('entity_type', entityFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const res = await apiClient.get(`/audit-logs/?${params.toString()}`);
      if (res.data.results) {
        setLogs(res.data.results);
        setTotalCount(res.data.count);
        setTotalPages(Math.ceil(res.data.count / 20) || 1);
      } else {
        setLogs(res.data);
        setTotalCount(res.data.length);
        setTotalPages(1);
      }
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, actionFilter, entityFilter, dateFrom, dateTo]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns = [
    {
      header: 'Timestamp (UTC)',
      accessor: 'timestamp',
      render: (row) => (
        <span className="font-mono text-xs text-slate-400">
          {new Date(row.timestamp).toLocaleString()}
        </span>
      ),
    },
    {
      header: 'Officer / Operator',
      accessor: 'user_name',
      render: (row) => (
        <div>
          <span className="font-bold text-slate-200">{row.user_name || 'System Daemon'}</span>
          <span className="block text-[11px] font-mono text-slate-500">{row.user_email || 'automated'}</span>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: 'user_role',
      render: (row) => (row.user_role ? <Badge>{row.user_role}</Badge> : <Badge>SYSTEM</Badge>),
    },
    {
      header: 'Action',
      accessor: 'action',
      render: (row) => <Badge>{row.action}</Badge>,
    },
    {
      header: 'Entity',
      accessor: 'entity_type',
      render: (row) => (
        <span className="font-mono text-xs text-sky-400 font-semibold">
          {row.entity_type} {row.entity_id ? `#${row.entity_id}` : ''}
        </span>
      ),
    },
    {
      header: 'Description',
      accessor: 'description',
      render: (row) => (
        <span className="text-slate-300 text-xs truncate max-w-md block" title={row.description}>
          {row.description}
        </span>
      ),
    },
    {
      header: 'IP Address',
      accessor: 'ip_address',
      render: (row) => (
        <span className="font-mono text-[11px] text-slate-500">{row.ip_address || '127.0.0.1'}</span>
      ),
    },
    {
      header: 'Metadata',
      render: (row) => (
        <button
          onClick={() => setSelectedLog(row)}
          className="p-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-sky-400 hover:text-sky-300 transition-colors"
          title="Inspect Raw Metadata"
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
            <History className="w-6 h-6 text-sky-400" />
            <span>IMMUTABLE AUDIT LOGS & TRAILS</span>
          </h1>
          <p className="text-xs text-slate-400 font-mono">
            Append-only cryptographic security audit trail. Read-only records with tamper detection
          </p>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-700/60 text-emerald-400 text-xs font-mono">
          <ShieldCheck className="w-4 h-4" />
          <span>Append-Only Ledger Active</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search description, operator..."
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
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            >
              <option value="">All Actions</option>
              <option value="LOGIN">LOGIN</option>
              <option value="LOGOUT">LOGOUT</option>
              <option value="PURCHASE">PURCHASE</option>
              <option value="TRANSFER">TRANSFER</option>
              <option value="ASSIGN">ASSIGN</option>
              <option value="EXPEND">EXPEND</option>
              <option value="CREATE">CREATE</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
              <option value="USER_ROLE_CHANGE">USER_ROLE_CHANGE</option>
            </select>
          </div>

          <div>
            <select
              value={entityFilter}
              onChange={(e) => {
                setEntityFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500 font-mono"
            >
              <option value="">All Entities</option>
              <option value="Purchase">Purchase</option>
              <option value="Transfer">Transfer</option>
              <option value="Assignment">Assignment</option>
              <option value="Expenditure">Expenditure</option>
              <option value="EquipmentType">EquipmentType</option>
              <option value="Base">Base</option>
              <option value="User">User</option>
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

      {/* Audit Logs Table */}
      <DataTable
        columns={columns}
        data={logs}
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

      {/* RAW METADATA INSPECTOR MODAL */}
      <Modal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title={`Audit Trail Ledger Record #${selectedLog?.id}`}
        maxWidth="max-w-xl"
      >
        {selectedLog && (
          <div className="space-y-4 text-xs font-mono">
            <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">ACTION:</span>
                <span className="text-sky-400 font-bold">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">OPERATOR:</span>
                <span className="text-slate-200">{selectedLog.user_email || 'System'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">TIMESTAMP:</span>
                <span className="text-slate-200">{new Date(selectedLog.timestamp).toISOString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">IP ADDRESS:</span>
                <span className="text-slate-200">{selectedLog.ip_address || '127.0.0.1'}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-semibold uppercase">Description</span>
              <p className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-slate-200 leading-relaxed">
                {selectedLog.description}
              </p>
            </div>

            <div>
              <span className="text-slate-400 block mb-1 font-semibold uppercase flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-sky-400" />
                Raw Payload Metadata (JSON)
              </span>
              <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-emerald-400 overflow-x-auto text-[11px] leading-relaxed">
                {JSON.stringify(selectedLog.metadata, null, 2)}
              </pre>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs uppercase"
              >
                Close Audit View
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AuditLogsPage;
