'use client';

import { useEffect } from 'react';
import { X, AlertTriangle, CheckCircle, Sparkles, Tag, MapPin, Briefcase, Shield, Loader2 } from 'lucide-react';

interface ReportDetailDrawerProps {
  report: any;
  onClose: () => void;
}

export function ReportDetailDrawer({ report, onClose }: ReportDetailDrawerProps) {
  const [details, setDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  useEffect(() => {
    async function fetchDetails() {
      try {
        const res = await fetch(`${API_URL}/api/reports/${report.id}`);
        if (res.ok) {
          const data = await res.json();
          setDetails(data);
        }
      } catch (e) {
        console.error('Failed to fetch details:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchDetails();
  }, [report.id]);

  const getSIFBadge = (flag: boolean | null, prob: number | null) => {
    if (flag === null) return <span className="text-gray-400">Not analyzed</span>;
    return flag ? (
      <span className="flex items-center gap-2 px-3 py-1 bg-danger-100 text-danger-700 rounded-full">
        <AlertTriangle className="w-4 h-4" />
        <span>SIF-POTENTIAL ({(prob || 0) * 100}%)</span>
      </span>
    ) : (
      <span className="flex items-center gap-2 px-3 py-1 bg-success-100 text-success-700 rounded-full">
        <CheckCircle className="w-4 h-4" />
        <span>NON-SIF ({(prob || 0) * 100}%)</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
        <div className="bg-white rounded-xl p-8 w-full max-w-md">
          <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto" />
          <p className="text-center text-gray-500 mt-4">Loading details...</p>
        </div>
      </div>
    );
  }

  const d = details || report;

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div className="relative w-full max-w-2xl h-full bg-white flex flex-col overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div>
            <p className="text-sm font-mono text-gray-500">{d.report_id}</p>
            <h2 className="text-xl font-bold text-gray-900 mt-1">{d.activity || 'Untitled Report'}</h2>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <MapPin className="w-4 h-4" /> {d.site || 'Unknown site'}
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* SIF Status */}
          <div className="p-4 rounded-xl border border-gray-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">SIF Classification</h3>
              {getSIFBadge(d.sif_flag, d.sif_probability)}
            </div>
            {d.sif_probability !== null && (
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-success-500 via-yellow-500 to-danger-500"
                  style={{ width: `${Math.round((d.sif_probability || 0) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Narrative */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">Report Narrative</h3>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 font-mono text-sm whitespace-pre-wrap text-gray-700">
              {d.narrative}
            </div>
          </div>

          {/* LSR Tags */}
          {d.lsr_tags && d.lsr_tags.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Tag className="w-5 h-5 text-primary-600" />
                IOGP Life-Saving Rules
              </h3>
              <div className="flex flex-wrap gap-2">
                {d.lsr_tags.map((tag: any, i: number) => (
                  <span key={i} className="px-3 py-1.5 bg-primary-50 text-primary-700 border border-primary-200 rounded-lg text-sm font-medium">
                    {typeof tag === 'string' ? tag : tag.rule_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Entities */}
          {d.entities && d.entities.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary-600" />
                Extracted Entities
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {d.entities.map((ent: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                    <span className="text-xs text-gray-500 uppercase tracking-wider">{ent.entity_type?.replace('_', ' ')}</span>
                    <p className="font-medium text-gray-900 mt-1">{ent.entity_value}</p>
                    <p className="text-xs text-gray-400">Confidence: {(ent.confidence * 100).toFixed(0)}%</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500">Report Type</p>
              <p className="font-medium">{d.report_type || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Report Date</p>
              <p className="font-medium">{d.report_date || '—'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 sticky bottom-0">
          <button onClick={onClose} className="btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}