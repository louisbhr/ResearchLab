import { useState, useEffect } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import { BarChart2, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import * as api from '../services/tauriApi';
import { Card, CardHeader, CardTitle } from '../components/ui/Card';
import { cn } from '../utils/cn';
import type { AnalyticsData } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Color palettes
// ─────────────────────────────────────────────────────────────────────────────

const CYAN_PALETTE = ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#164e63'];
const STATUS_COLORS: Record<string, string> = {
  Unread: '#9ca3af',
  'In Progress': '#60a5fa',
  Read: '#34d399',
};
const LINE_COLORS = [
  '#06b6d4', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#ec4899', '#84cc16', '#f97316', '#6366f1',
];

// ─────────────────────────────────────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return <div className="h-56 rounded-lg bg-gray-100 animate-pulse" />;
}

// ─────────────────────────────────────────────────────────────────────────────
// Custom tooltip
// ─────────────────────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-3 py-2 text-xs">
      {label !== undefined && <p className="font-semibold text-gray-700 mb-1">{label}</p>}
      {payload.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: item.color }} />
          <span className="text-gray-600">{item.name}:</span>
          <span className="font-medium text-gray-800">{item.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Analytics Page
// ─────────────────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { projects, activeProjectId, loadProjects } = useAppStore();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<string>('all');

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    fetchAnalytics(selectedProject);
  }, [selectedProject]);

  async function fetchAnalytics(projectId: string) {
    setLoading(true);
    setError(null);
    try {
      const result = await api.getAnalytics(projectId === 'all' ? undefined : projectId);
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  // ── Derived chart data ────────────────────────────────────────────────────

  const topTopics = data?.papers_per_topic.slice(0, 10) ?? [];
  const topTopicRatings = data?.topic_avg_rating.slice(0, 10) ?? [];

  const pieData = (data?.papers_by_reading_status ?? []).map((s) => ({
    name: s.status,
    value: s.count,
  }));

  // Build topic development lines
  const topicDevelopmentMap: Record<string, Record<number, number>> = {};
  const allYears = new Set<number>();
  (data?.topic_development ?? []).forEach((td) => {
    allYears.add(td.year);
    if (!topicDevelopmentMap[td.tag_name]) topicDevelopmentMap[td.tag_name] = {};
    topicDevelopmentMap[td.tag_name][td.year] = td.count;
  });
  const topTopicNames = Object.keys(topicDevelopmentMap).slice(0, 6);
  const sortedYears = Array.from(allYears).sort((a, b) => a - b);
  const topicLineData = sortedYears.map((year) => {
    const row: Record<string, number | string> = { year };
    topTopicNames.forEach((name) => {
      row[name] = topicDevelopmentMap[name]?.[year] ?? 0;
    });
    return row;
  });

  return (
    <div className="flex flex-col h-full overflow-auto bg-gray-50">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Analytics</h1>
            <p className="text-xs text-gray-500 mt-0.5">Visual overview of your research library</p>
          </div>
          <button
            onClick={() => fetchAnalytics(selectedProject)}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-200 text-gray-500 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
        </div>

        {/* Filter bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">Project</label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:border-cyan-400 outline-none bg-white"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Charts grid */}
      <div className="flex-1 px-6 pb-6">
        {!data && !loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <BarChart2 className="w-12 h-12 mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">No data available</p>
            <p className="text-sm mt-1">Add papers to your library to see analytics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* 1. Papers per Year */}
            <Card>
              <CardHeader>
                <CardTitle>Papers per Year</CardTitle>
              </CardHeader>
              {loading ? <ChartSkeleton /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data?.papers_per_year ?? []} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Papers" fill="#06b6d4" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* 2. Papers per Topic (horizontal) */}
            <Card>
              <CardHeader>
                <CardTitle>Top Topics by Paper Count</CardTitle>
              </CardHeader>
              {loading ? <ChartSkeleton /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    layout="vertical"
                    data={topTopics}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="tag_name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={90}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Papers" fill="#0891b2" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* 3. Topic Strength (avg rating per topic) */}
            <Card>
              <CardHeader>
                <CardTitle>Topic Strength (Avg Rating)</CardTitle>
              </CardHeader>
              {loading ? <ChartSkeleton /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    layout="vertical"
                    data={topTopicRatings}
                    margin={{ top: 4, right: 24, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis
                      type="category"
                      dataKey="tag_name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={90}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="avg_rating" name="Avg Rating" fill="#0e7490" radius={[0, 3, 3, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* 4. Papers by Reading Status (Pie) */}
            <Card>
              <CardHeader>
                <CardTitle>Reading Status Distribution</CardTitle>
              </CardHeader>
              {loading ? <ChartSkeleton /> : (
                <div className="flex items-center gap-4">
                  <ResponsiveContainer width="55%" height={220}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry) => (
                          <Cell
                            key={entry.name}
                            fill={STATUS_COLORS[entry.name] ?? '#94a3b8'}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {pieData.map((entry) => (
                      <div key={entry.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: STATUS_COLORS[entry.name] ?? '#94a3b8' }}
                        />
                        <span className="text-gray-600">{entry.name}</span>
                        <span className="font-semibold text-gray-800">{entry.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>

            {/* 5. Papers by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Papers by Type</CardTitle>
              </CardHeader>
              {loading ? <ChartSkeleton /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data?.papers_by_type ?? []}
                    margin={{ top: 4, right: 8, left: -10, bottom: 40 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis
                      dataKey="paper_type"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      angle={-35}
                      textAnchor="end"
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Papers" radius={[3, 3, 0, 0]}>
                      {(data?.papers_by_type ?? []).map((_, idx) => (
                        <Cell key={idx} fill={CYAN_PALETTE[idx % CYAN_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* 6. Relevance Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Relevance Distribution</CardTitle>
              </CardHeader>
              {loading ? <ChartSkeleton /> : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={data?.relevance_distribution ?? []}
                    margin={{ top: 4, right: 8, left: -10, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="rating" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" name="Papers" fill="#155e75" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            {/* 7. Topic Development Over Time (full width) */}
            {topTopicNames.length > 0 && (
              <Card className="col-span-1 md:col-span-2">
                <CardHeader>
                  <CardTitle>Topic Development Over Time</CardTitle>
                </CardHeader>
                {loading ? <ChartSkeleton /> : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart
                      data={topicLineData}
                      margin={{ top: 4, right: 16, left: -10, bottom: 4 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} allowDecimals={false} />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      />
                      {topTopicNames.map((name, idx) => (
                        <Line
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={LINE_COLORS[idx % LINE_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Card>
            )}

          </div>
        )}
      </div>
    </div>
  );
}
