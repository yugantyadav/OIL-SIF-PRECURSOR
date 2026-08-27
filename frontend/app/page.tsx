'use client';

import { AlertTriangle, BarChart3, FileText, Upload, CheckCircle, Construction } from 'lucide-react';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'reports', label: 'Reports', icon: FileText },
  { id: 'analyze', label: 'Analyze', icon: Upload },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
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
              {tabs.map(tab => (
                <button key={tab.id} className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <Construction className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Frontend Scaffold Ready</h2>
          <p className="text-gray-500 mb-8 max-w-2xl mx-auto">
            Team: Implement Dashboard, ReportTable, UploadZone, AnalyzeSingle components in <code className="bg-gray-100 px-2 py-1 rounded">frontend/components/</code>
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { icon: BarChart3, title: 'Dashboard', desc: 'KPI cards, SIF density charts, LSR distribution' },
              { icon: FileText, title: 'Reports Table', desc: 'Filterable, sortable, drill-down drawer' },
              { icon: Upload, title: 'Analyze', desc: 'Single report + bulk CSV upload' },
            ].map(item => (
              <div key={item.title} className="card text-center">
                <item.icon className="w-10 h-10 mx-auto text-primary-600 mb-3" />
                <h3 className="font-semibold text-gray-900">{item.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}