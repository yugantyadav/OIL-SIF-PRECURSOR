'use client';

import { useMemo } from 'react';
import {
  BarChart3, AlertTriangle, CheckCircle, TrendingUp, Building2, Briefcase, PieChart
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface Stats {
  total_reports: number;
  sif_count: number;
  sif_percentage: number;
  sites: Array<{ site: string; total: number; sif_count: number }>;
  lsr_distribution: Array<{ rule_name: string; count: number }>;
  activities: Array<{ activity: string; total: number; sif_count: number }>;
}

const COLORS = ['#0ea5e9', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];

export function Dashboard({ stats }: { stats: Stats }) {
  const topSites = useMemo(() => stats.sites.slice(0, 8).reverse(), [stats.sites]);
  const topActivities = useMemo(() => stats.activities.slice(0, 8).reverse(), [stats.activities]);
  const lsrData = useMemo(() => stats.lsr_distribution.slice(0, 9), [stats.lsr_distribution]);

  const kpiCards = [
    { label: 'Total Reports', value: stats.total_reports.toLocaleString(), icon: FileText, color: 'primary' },
    { label: 'SIF-Potential', value: stats.sif_count.toLocaleString(), icon: AlertTriangle, color: 'danger' },
    { label: 'SIF Rate', value: `${stats.sif_percentage}%`, icon: TrendingUp, color: stats.sif_percentage > 30 ? 'danger' : 'success' },
    { label: 'Sites Covered', value: stats.sites.length.toString(), icon: Building2, color: 'success' },
  ];

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card, i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`p-3 rounded-xl bg-${card.color}-100`}>
                <card.icon className={`w-6 h-6 text-${card.color}-600`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sites by SIF Density */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary-600" />
            Sites Ranked by SIF-Precursor Density
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topSites} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="site" type="category" width={140} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [value, 'reports']} />
                <Bar dataKey="sif_count" name="SIF Reports" fill="#ef4444" radius={[0, 4, 4, 0]} />
                <Bar dataKey="total" name="Total Reports" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* LSR Distribution */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-primary-600" />
            IOGP Life-Saving Rule Distribution
          </h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={lsrData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="count"
                  nameKey="rule_name"
                  label={({ rule_name, percent }) => `${rule_name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {lsrData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [value, 'reports']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activities by SIF Density */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary-600" />
            Activities Ranked by SIF-Precursor Density
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topActivities} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="activity" type="category" width={160} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(value: number) => [value, 'reports']} />
                <Bar dataKey="sif_count" name="SIF Reports" fill="#ef4444" radius={[0, 4, 4, 0]} />
                <Bar dataKey="total" name="Total Reports" fill="#e5e7eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Key Insight */}
        <div className="card bg-gradient-to-br from-primary-50 to-primary-100 border-primary-200">
          <h3 className="text-lg font-semibold text-primary-900 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Key Insight
          </h3>
          <div className="space-y-3 text-primary-800">
            <p className="text-base leading-relaxed">
              <strong>{stats.sif_count}</strong> of <strong>{stats.total_reports}</strong> reports
              ({stats.sif_percentage}%) carry genuine fatal potential.
            </p>
            {stats.sites.length > 0 && stats.sites[0] && (
              <p className="text-base leading-relaxed">
                Highest risk site: <strong>{stats.sites[0].site}</strong> with{' '}
                <strong>{stats.sites[0].sif_count}</strong> SIF-potential reports.
              </p>
            )}
            {stats.activities.length > 0 && stats.activities[0] && (
              <p className="text-base leading-relaxed">
                Highest risk activity: <strong>{stats.activities[0].activity}</strong> with{' '}
                <strong>{stats.activities[0].sif_count}</strong> SIF-potential reports.
              </p>
            )}
            {stats.lsr_distribution.length > 0 && stats.lsr_distribution[0] && (
              <p className="text-base leading-relaxed">
                Most violated Life-Saving Rule: <strong>{stats.lsr_distribution[0].rule_name}</strong> 
                ({stats.lsr_distribution[0].count} occurrences).
              </p>
            )}
            <p className="text-sm text-primary-600 mt-4">
              → Focus interventions on these areas to prevent serious injuries and fatalities.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}