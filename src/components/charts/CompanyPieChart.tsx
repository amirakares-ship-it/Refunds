import React, { useState } from 'react';
import { RefundRecord } from '../../types';
import { calculateCompanyPie, formatEGP, formatEGPFull } from '../../utils/dataProcessor';
import { Maximize2, PieChart as PieIcon, Building2, Filter } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface CompanyPieChartProps {
  records: RefundRecord[];
  onExpandChart: (chartId: string, title: string, desc?: string) => void;
  customTitle?: string;
  customDescription?: string;
  isLight?: boolean;
  isFullscreen?: boolean;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
  if (!percentage || percentage < 4) return null; // Avoid overlapping tiny slices
  // Optimal positioning for solid circle (innerRadius = 0)
  const radius = innerRadius === 0 ? outerRadius * 0.62 : innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className={`${outerRadius > 120 ? 'text-xs md:text-sm font-black' : 'text-[11px] font-black'} drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none`}
    >
      {`${percentage.toFixed(1)}%`}
    </text>
  );
};

export const CompanyPieChart: React.FC<CompanyPieChartProps> = ({
  records,
  onExpandChart,
  customTitle,
  customDescription,
  isLight,
  isFullscreen = false,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'default' | 'Request'>('ALL');

  // Filter records by Type
  const filteredRecords = typeFilter === 'ALL'
    ? records
    : records.filter(r => r.type.toLowerCase() === typeFilter.toLowerCase());

  const pieData = calculateCompanyPie(filteredRecords);
  const totalAmount = pieData.reduce((sum, item) => sum + item.amount, 0);
  const title = customTitle ?? 'Refund Distribution by Company';
  const description = customDescription ?? 'Total Refund Amount & Percentage Share by Financing Partner';

  // Compact viewport-optimized heights so fullscreen fits without scrolling
  const chartHeightClass = isFullscreen ? 'h-[280px] sm:h-[320px] md:h-[340px]' : 'h-64';
  const outerRadiusVal = isFullscreen ? 130 : 100;

  return (
    <div className={`rounded-2xl ${isFullscreen ? 'p-4 sm:p-5 w-full h-full' : 'p-5'} border transition-all relative flex flex-col justify-between h-full shadow-md ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
    }`}>
      <div>
        {/* Header with Title, Type Filter & Action Controls */}
        <div className={`flex flex-wrap items-center justify-between gap-2.5 mb-2.5 ${isFullscreen ? 'pr-12' : ''}`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
              <PieIcon className="w-4 h-4" />
            </div>
            <div>
              {title && (
                <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {title}
                </h3>
              )}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Type Filter Buttons (ALL, Default, Request) */}
            <div className={`flex p-0.5 rounded-xl border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
                <Filter className="w-3 h-3 text-emerald-500" />
                Type:
              </span>
              {(['ALL', 'default', 'Request'] as const).map((t) => {
                const isActive = typeFilter === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTypeFilter(t)}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all text-xs cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    {t === 'ALL' ? 'ALL' : t === 'default' ? 'Default' : 'Request'}
                  </button>
                );
              })}
            </div>

            {/* Expand Fullscreen Button (only when not already fullscreen) */}
            {!isFullscreen && (
              <button
                onClick={() => onExpandChart('company_pie', title || 'Refund Distribution by Company', description)}
                className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                  isLight
                    ? 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                title="View Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Solid Circle Pie Chart & Side Details Layout */}
        <div className={`grid grid-cols-1 ${isFullscreen ? 'lg:grid-cols-12 gap-5' : 'md:grid-cols-12 gap-4'} items-center mt-1`}>
          {/* Solid Circle Chart without total in center */}
          <div className={`${isFullscreen ? 'lg:col-span-6' : 'md:col-span-6'} ${chartHeightClass} relative flex items-center justify-center`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={0}
                  outerRadius={outerRadiusVal}
                  paddingAngle={2}
                  dataKey="amount"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={isLight ? '#ffffff' : '#0f172a'} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item: any = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1 min-w-[180px]">
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span>{item.name}</span>
                          </div>
                          <div className="text-emerald-400 font-mono font-black text-sm">
                            {formatEGPFull(item.amount)}
                          </div>
                          <div className="text-slate-300 text-[11px] flex justify-between pt-1 border-t border-slate-800">
                            <span>Share: <strong>{item.percentage.toFixed(1)}%</strong></span>
                            <span>Cases: <strong>{item.count}</strong></span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Structured Company Amount & % Behind/Beside the Chart */}
          <div className={`${isFullscreen ? 'lg:col-span-6' : 'md:col-span-6'} flex flex-col justify-center space-y-2`}>
            <div className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-wider flex items-center justify-between pb-1.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800/80'}`}>
              <span className="flex items-center gap-1.5 font-bold">
                <Building2 className="w-4 h-4 text-emerald-500" /> Company Breakdown {typeFilter !== 'ALL' && `(${typeFilter})`}
              </span>
              <span className={`font-mono text-xs font-bold ${isLight ? 'text-emerald-700' : 'text-emerald-400'}`}>Total: {formatEGP(totalAmount)}</span>
            </div>
            
            <div className={`grid grid-cols-1 sm:grid-cols-2 ${isFullscreen ? 'gap-2.5' : 'gap-2'}`}>
              {pieData.map((comp) => (
                <div
                  key={comp.name}
                  className={`p-2.5 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.01] ${
                    isLight ? 'bg-slate-50 border-slate-200 shadow-xs' : 'bg-slate-950/70 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span className="flex items-center gap-2 text-xs font-bold truncate">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: comp.fill }} />
                      <span className={isLight ? 'text-slate-900 font-bold' : 'text-slate-200'}>{comp.name}</span>
                    </span>
                    <span 
                      className="text-xs font-black px-1.5 py-0.5 rounded-md font-mono"
                      style={{ backgroundColor: `${comp.fill}20`, color: comp.fill }}
                    >
                      {comp.percentage.toFixed(1)}%
                    </span>
                  </div>
                  <div className={`font-black font-mono ${isFullscreen ? 'text-sm sm:text-base' : 'text-sm'} ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {formatEGP(comp.amount)}
                  </div>
                  <div className={`text-[10px] sm:text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'} font-mono mt-0.5 flex justify-between items-center`}>
                    <span className="font-semibold">{comp.count} records</span>
                    <span className="opacity-90">{formatEGPFull(comp.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
