import React from 'react';
import { RefundRecord, ChartConfig } from '../../types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts';
import { Maximize2 } from 'lucide-react';

interface DynamicChartRendererProps {
  config: ChartConfig;
  records: RefundRecord[];
  onExpandChart?: (chartId: string, title: string, description?: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export const DynamicChartRenderer: React.FC<DynamicChartRendererProps> = ({
  config,
  records,
  onExpandChart,
}) => {
  // Filter records based on config.dataType, excluding Reactive records
  const filtered = records.filter(r => {
    if (r.reactive) return false;
    const s = (r.status || '').toLowerCase();
    const isCancelledOrCheque = s === 'cancelled' || s === 'cheque pending' || s.includes('cancelled') || s.includes('cheque');
    if (!isCancelledOrCheque) return false;
    if (config.dataType === 'ALL') return true;
    return r.type.toLowerCase() === config.dataType.toLowerCase();
  });

  // Group data by Company or Status
  const groupMap: Record<string, { company: string; amount: number; count: number }> = {};

  filtered.forEach(r => {
    const key = r.company || 'Unknown';
    if (!groupMap[key]) {
      groupMap[key] = { company: key, amount: 0, count: 0 };
    }
    groupMap[key].amount += r.amount;
    groupMap[key].count += 1;
  });

  const chartData = Object.values(groupMap);

  const valueKey = config.metricType === 'amount' ? 'amount' : 'count';
  const formatVal = (val: number) =>
    config.metricType === 'amount'
      ? `${(val / 1000).toFixed(1)}k EGP`
      : `${val} items`;

  return (
    <div className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all group relative">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {config.title}
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
              {config.dataType}
            </span>
          </h3>
        </div>

        {onExpandChart && (
          <button
            onClick={() => onExpandChart(config.id, config.title, config.description)}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            title="Expand Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          {config.chartType === 'pie' || config.chartType === 'donut' ? (
            <PieChart>
              <Pie
                data={chartData}
                dataKey={valueKey}
                nameKey="company"
                cx="50%"
                cy="50%"
                innerRadius={config.chartType === 'donut' ? 55 : 0}
                outerRadius={80}
                paddingAngle={3}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => [formatVal(Number(value)), config.metricType.toUpperCase()]}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
            </PieChart>
          ) : config.chartType === 'line' ? (
            <LineChart data={chartData}>
              <XAxis dataKey="company" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => (v > 1000 ? `${v / 1000}k` : v)} />
              <Tooltip
                formatter={(value: any) => [formatVal(Number(value)), config.metricType.toUpperCase()]}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
              />
              <Line type="monotone" dataKey={valueKey} stroke="#3b82f6" strokeWidth={3} dot={{ r: 5 }} />
            </LineChart>
          ) : (
            <BarChart data={chartData}>
              <XAxis dataKey="company" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => (v > 1000 ? `${v / 1000}k` : v)} />
              <Tooltip
                formatter={(value: any) => [formatVal(Number(value)), config.metricType.toUpperCase()]}
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
              />
              <Bar dataKey={valueKey} radius={[6, 6, 0, 0]}>
                {chartData.map((_, index) => (
                  <Cell key={`bar-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
};
