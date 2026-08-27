'use client';

import { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, Filter, Download, Eye, AlertTriangle, CheckCircle } from 'lucide-react';
import { ReportDetailDrawer } from './ReportDetailDrawer';

interface Report {
  id: string;
  report_id: string;
  site: string | null;
  activity: string | null;
  report_type: string | null;
  sif_flag: boolean | null;
  sif_probability: number | null;
  lsr_tags: string[];
}

interface ReportTableProps {
  reports: Report[];
  loading: boolean;
  showAll: boolean;
  onToggleShowAll: (show: boolean) => void;
  onRefresh: () => void;
}

export function ReportTable({ reports, loading, showAll, onToggleShowAll, onRefresh }: ReportTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);
  const [filters, setFilters] = useState({ site: '', sifOnly: false, search: '' });
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

  const displayReports = useMemo(() => {
    let filtered = [...reports];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(r =>
        r.report_id.toLowerCase().includes(search) ||
        r.site?.toLowerCase().includes(search) ||
        r.activity?.toLowerCase().includes(search)
      );
    }
    if (filters.site) {
      filtered = filtered.filter(r => r.site === filters.site);
    }
    if (filters.sifOnly) {
      filtered = filtered.filter(r => r.sif_flag === true);
    }

    if (sortConfig) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof Report];
        const bVal = b[sortConfig.key as keyof Report];
        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sortConfig.direction === 'asc' ? cmp : -cmp;
      });
    }

    return showAll ? filtered : filtered.slice(0, 20);
  }, [reports, filters, sortConfig, showAll]);

  const sites = useMemo(() => [...new Set(reports.map(r => r.site).filter(Boolean))] as string[], [reports]);

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const SortIcon = ({ key }: { key: string }) => {
    if (sortConfig?.key !== key) return <span className="text-gray-300">⇅</span>;
    return sortConfig.direction === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search reports..."
              value={filters.search}
              onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filters.site}
              onChange={e => setFilters(prev => ({ ...prev, site: e.target.value }))}
              className="input-field w-48"
            >
              <option value="">All Sites</option>
              {sites.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.sifOnly}
                onChange={e => setFilters(prev => ({ ...prev, sifOnly: e.target.checked }))}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">SIF only</span>
            </label>
            <button onClick={onRefresh} disabled={loading} className="btn-secondary">
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                {[
                  { key: 'report_id', label: 'Report ID' },
                  { key: 'site', label: 'Site' },
                  { key: 'activity', label: 'Activity' },
                  { key: 'report_type', label: 'Type' },
                  { key: 'sif_flag', label: 'SIF', sortable: true },
                  { key: 'sif_probability', label: 'Prob.', sortable: true },
                  { key: 'lsr_tags', label: 'LSR Tags' },
                ].map(col => (
                  <th key={col.key} className="table-header" style={{ cursor: col.sortable ? 'pointer' : 'default' }}>
                    <div className="flex items-center gap-1" onClick={() => col.sortable && handleSort(col.key)}>
                      {col.label}
                      {col.sortable && <SortIcon key={col.key} />}
                    </div>
                  </th>
                ))}
                <th className="table-header w-12"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">Loading...</td>
                </tr>
              ) : displayReports.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">No reports found</td>
                </tr>
              ) : (
                displayReports.map(report => (
                  <tr key={report.id} className="hover:bg-gray-50" onClick={() => setSelectedReport(report)}>
                    <td className="table-cell font-mono text-xs">{report.report_id}</td>
                    <td className="table-cell">{report.site || '—'}</td>
                    <td className="table-cell">{report.activity || '—'}</td>
                    <td className="table-cell">
                      {report.report_type && (
                        <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-medium">{report.report_type}</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {report.sif_flag === true ? (
                        <span className="flex items-center gap-1 text-danger-600 font-medium">
                          <AlertTriangle className="w-4 h-4" /> YES
                        </span>
                      ) : report.sif_flag === false ? (
                        <span className="flex items-center gap-1 text-success-600">
                          <CheckCircle className="w-4 h-4" /> NO
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="table-cell">
                      {report.sif_probability !== null && (
                        <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-success-500 via-yellow-500 to-danger-500"
                            style={{ width: `${Math.round(report.sif_probability * 100)}%` }}
                          />
                        </div>
                      )}
                    </td>
                    <td className="table-cell">
                      <div className="flex flex-wrap gap-1">
                        {report.lsr_tags.slice(0, 3).map(tag => (
                          <span key={tag} className="badge-warning text-[10px] px-1.5 py-0.5">{tag}</span>
                        ))}
                        {report.lsr_tags.length > 3 && (
                          <span className="badge-warning text-[10px] px-1.5 py-0.5">+{report.lsr_tags.length - 3}</span>
                        )}
                      </div>
                    </td>
                    <td className="table-cell">
                      <button
                        onClick={e => { e.stopPropagation(); setSelectedReport(report); }}
                        className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {!showAll && reports.length > 20 && (
          <div className="p-4 border-t border-gray-100 text-center">
            <button
              onClick={() => onToggleShowAll(true)}
              className="text-primary-600 hover:text-primary-800 font-medium"
            >
              Show all {reports.length} reports
            </button>
          </div>
        )}
      </div>

      {/* Detail Drawer */}
      {selectedReport && (
        <ReportDetailDrawer
          report={selectedReport}
          onClose={() => setSelectedReport(null)}
        />
      )}
    </div>
  );
}