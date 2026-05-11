'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Clock, MessageSquare, RefreshCw } from 'lucide-react';

interface LogEntry {
  id: string;
  channel: string;
  templateName: string;
  recipientPhone: string;
  recipientName: string | null;
  status: string;
  messageId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface Summary { status: string; _count: { _all: number } }

const STATUS_BADGE: Record<string, string> = {
  SENT:      'bg-green/10 text-green',
  FAILED:    'bg-coral/10 text-coral',
  DELIVERED: 'bg-teal/10 text-teal',
  READ:      'bg-purple/10 text-purple',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  SENT:      <CheckCircle2 className="w-3.5 h-3.5" />,
  FAILED:    <XCircle className="w-3.5 h-3.5" />,
  DELIVERED: <CheckCircle2 className="w-3.5 h-3.5" />,
  READ:      <CheckCircle2 className="w-3.5 h-3.5" />,
};

export default function OutboundLogTable() {
  const [logs, setLogs]         = useState<LogEntry[]>([]);
  const [summary, setSummary]   = useState<Summary[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [channel, setChannel]   = useState('');
  const [status, setStatus]     = useState('');
  const [page, setPage]         = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '50' });
    if (channel) params.set('channel', channel);
    if (status)  params.set('status', status);
    const res = await fetch(`/api/notifications/log?${params}`);
    const json = await res.json();
    setLogs(json.data ?? []);
    setTotal(json.total ?? 0);
    setSummary(json.summary ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [channel, status, page]);

  const countFor = (s: string) => summary.find((x) => x.status === s)?._count._all ?? 0;

  return (
    <div className="space-y-5">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Sent',      key: 'SENT',      color: 'text-green',  bg: 'bg-green/5'  },
          { label: 'Delivered', key: 'DELIVERED',  color: 'text-teal',   bg: 'bg-teal/5'   },
          { label: 'Read',      key: 'READ',       color: 'text-purple', bg: 'bg-purple/5' },
          { label: 'Failed',    key: 'FAILED',     color: 'text-coral',  bg: 'bg-coral/5'  },
        ].map((s) => (
          <div key={s.key} className={`${s.bg} rounded-xl p-4 border border-gray-100`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-sora font-semibold ${s.color}`}>{countFor(s.key)}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <select
          value={channel}
          onChange={(e) => { setChannel(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">All Channels</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="SMS">SMS</option>
        </select>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
        >
          <option value="">All Status</option>
          <option value="SENT">Sent</option>
          <option value="DELIVERED">Delivered</option>
          <option value="READ">Read</option>
          <option value="FAILED">Failed</option>
        </select>
        <button
          onClick={fetchLogs}
          className="ml-auto flex items-center gap-1.5 text-sm text-gray-500 hover:text-navy transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
        <p className="text-xs text-gray-400">{total} total messages</p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Time', 'Channel', 'Template', 'Recipient', 'Status', 'Message ID'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-24" />
                    </td>
                  ))}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <MessageSquare className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No messages sent yet</p>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('en-IN', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-medium bg-iceLight text-navy px-2 py-0.5 rounded-full">
                      {log.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{log.templateName}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-gray-800">{log.recipientName ?? '—'}</p>
                    <p className="text-xs text-gray-400">{log.recipientPhone}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[log.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_ICON[log.status]}
                      {log.status}
                    </span>
                    {log.errorMessage && (
                      <p className="text-xs text-coral mt-0.5 max-w-xs truncate">{log.errorMessage}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400 truncate max-w-[120px]">
                    {log.messageId ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {total > 50 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="text-sm text-gray-500 hover:text-navy disabled:opacity-30"
            >
              ← Previous
            </button>
            <span className="text-xs text-gray-400">Page {page} of {Math.ceil(total / 50)}</span>
            <button
              disabled={page >= Math.ceil(total / 50)}
              onClick={() => setPage((p) => p + 1)}
              className="text-sm text-gray-500 hover:text-navy disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
