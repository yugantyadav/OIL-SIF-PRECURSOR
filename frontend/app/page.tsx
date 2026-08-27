'use client';

import { useState } from 'react';
import { Upload, FileText, AlertTriangle, CheckCircle, BarChart3, Loader2, ChevronDown, ChevronUp, Eye, Download } from 'lucide-react';
import { Dashboard } from '@/components/Dashboard';
import { ReportTable } from '@/components/ReportTable';
import { UploadZone } from '@/components/UploadZone';
import { AnalyzeSingle } from '@/components/AnalyzeSingle';

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

interface Stats {
  total_reports: number;
  sif_count: number;
  sif_percentage: number;
  sites: Array<{ site: string; total: number; sif_count: number }>;
  lsr_distribution: Array<{ rule_name: string; count: number }>;
  activities: Array<{ activity: string; total: number; sif_count: number }>;
}

export default function Home() {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'reports' | 'analyze'>('dashboard');
  const [showAllReports, setShowAllReports] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/dashboard/stats`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  const fetchReports = async (sifOnly = false) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/reports?${new URLSearchParams({ sif_only: String(sifOnly), limit: '200' })}`);
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      }
    } catch (e) {
      console.error('Failed to fetch reports:', e);
    }
  };

  const handleAnalyzeComplete = async (newReport: Report) => {
    setReports(prev => [newReport, ...prev]);
    await fetchStats();
    setActiveTab('reports');
  };

  const handleBulkAnalyzeComplete = async () => {
    await fetchStats();
    await fetchReports();
    setActiveTab('reports');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">SIF Precursor Detection</h1>
                <p className="text-xs text-gray-500">Oil India Limited · HSSE Platform</p>
              </div>
            </div>
            <nav className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'reports', label: 'Reports', icon: FileText },
                { id: 'analyze', label: 'Analyze', icon: Upload },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id as any); fetchReports(); fetchStats(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition ${
                    activeTab === tab.id
                      ? 'bg-white text-primary-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-danger-500 hover:text-danger-700">×</button>
          </div>
        )}

        {activeTab === 'dashboard' && stats && (
          <Dashboard stats={stats} />
        )}

        {activeTab === 'reports' && (
          <ReportTable
            reports={reports}
            loading={loading}
            showAll={showAllReports}
            onToggleShowAll={setShowAllReports}
            onRefresh={fetchReports}
          />
        )}

        {activeTab === 'analyze' && (
          <AnalyzeSingle
            onComplete={handleAnalyzeComplete}
            onBulkComplete={handleBulkAnalyzeComplete}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}
      </main>
    </div>
  );
}