import React from 'react';
import { RefundRecord } from '../../types';
import { calculateTypeAmountDonut, formatEGP, formatEGPFull } from '../../utils/dataProcessor';
import { Maximize2, DollarSign, AlertCircle, FileCheck } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface AmountTypeDonutChartProps {
  records: RefundRecord[];
  onExpandChart: (chartId: string, title: string, desc?: string) => void;
  customTitle?: string;
  customDescription?: string;
  isLight?: boolean;
  isFullscreen?: boolean;
}

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
  if (!percentage || percentage <= 0) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className={`${outerRadius > 130 ? 'text-sm font-black' : 'text-xs font-black'} drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none`}
    >
      {`${percentage.toFixed(1)}%`}
    </text>
  );
};

export const AmountTypeDonutChart: React.FC<AmountTypeDonutChartProps> = ({
  records,
  onExpandChart,
  customTitle,
  customDescription,
  isLight,
  isFullscreen = false,
}) => {
  const data = calculateTypeAmountDonut(records);
  const title = customTitle ?? 'Refund Amount Distribution by Type';
  const description = customDescription ?? 'Total EGP Amount split between Default vs Request Type Refunds';

  // Compact viewport-optimized heights so fullscreen fits without scrolling
  const chartHeightClass = isFullscreen ? 'h-[280px] sm:h-[320px] md:h-[340px]' : 'h-64';
  const innerRadiusVal = isFullscreen ? 75 : 55;
  const outerRadiusVal = isFullscreen ? 130 : 92;

  return (
    <div className={`rounded-2xl ${isFullscreen ? 'p-4 sm:p-5 w-full h-full' : 'p-5'} border transition-all relative flex flex-col justify-between h-full shadow-md ${isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'}`}>
      <div>
        {/* Header with Title & Action Controls */}
        <div className={`flex flex-wrap items-center justify-between gap-2.5 mb-2.5 ${isFullscreen ? 'pr-12' : ''}`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              {title && (
                <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {title}
                </h3>
              )}
            </div>
          </div>
          {!isFullscreen && (
            <button
              onClick={() => onExpandChart('amount_type_donut', title || 'Refund Type Amount Share', description)}
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

        {/* Donut Chart & Side Details Layout (Amount behind / beside the chart) */}
        <div className={`grid grid-cols-1 ${isFullscreen ? 'lg:grid-cols-12 gap-5' : 'md:grid-cols-12 gap-4'} items-center mt-1`}>
          {/* Donut Chart Container with Percentage on Chart */}
          <div className={`${isFullscreen ? 'lg:col-span-6' : 'md:col-span-6'} ${chartHeightClass} relative flex items-center justify-center`}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={innerRadiusVal}
                  outerRadius={outerRadiusVal}
                  paddingAngle={4}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomizedLabel}
                >
                  {data.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={isLight ? '#ffffff' : '#0f172a'} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item: any = payload[0].payload;
                      return (
                        <div className="bg-slate-900/95 p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1 min-w-[170px]">
                          <div className="flex items-center gap-1.5 font-bold text-white">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.fill }} />
                            <span>{item.name} Refunds</span>
                          </div>
                          <div className="text-amber-400 font-mono font-black text-sm">
                            {formatEGPFull(item.value)}
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

            {/* Text in the Middle of Circle */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center">
              <span className={`${isFullscreen ? 'text-2xl' : 'text-base'} font-black ${isLight ? 'text-slate-900' : 'text-white'}`}>{formatEGP(data.totalAmount)}</span>
              <span className={`${isFullscreen ? 'text-xs' : 'text-[8px]'} uppercase tracking-wider font-bold ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total Refunds</span>
            </div>
          </div>

          {/* Structured Amount & Percentage Behind/Beside the Chart */}
          <div className={`${isFullscreen ? 'lg:col-span-6' : 'md:col-span-6'} flex flex-col justify-center space-y-2.5`}>
            <div className={`text-[11px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-wider flex items-center justify-between pb-1 border-b ${isLight ? 'border-slate-200' : 'border-slate-800/60'}`}>
              <span>Amount & Share Details</span>
              <span className={`font-mono text-xs font-bold ${isLight ? 'text-indigo-700' : 'text-slate-400'}`}>Total: {formatEGP(data.totalAmount)}</span>
            </div>
            
            <div className="flex flex-col space-y-2.5">
              {/* Default Breakdown */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.01] ${isLight ? 'bg-red-50/70 border-red-200 shadow-xs' : 'bg-red-950/40 border-red-900/50'}`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Default Refunds
                  </span>
                  <span className="font-black text-xs px-2 py-0.5 rounded-md bg-red-500/20 text-red-600 dark:text-red-300 font-mono">
                    {data.defaultPct.toFixed(1)}%
                  </span>
                </div>
                <div className={`font-black font-mono ${isFullscreen ? 'text-xl' : 'text-base'} text-red-600 dark:text-red-300`}>
                  {formatEGP(data.defaultAmt)}
                </div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'} font-mono mt-0.5 flex justify-between`}>
                  <span className="font-semibold">{data.defaultCount} cases</span>
                  <span>{formatEGPFull(data.defaultAmt)}</span>
                </div>
              </div>

              {/* Request Breakdown */}
              <div className={`p-3 rounded-xl border flex flex-col justify-between transition-all hover:scale-[1.01] ${isLight ? 'bg-blue-50/70 border-blue-200 shadow-xs' : 'bg-blue-950/40 border-blue-900/50'}`}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                    <FileCheck className="w-3.5 h-3.5" /> Request Refunds
                  </span>
                  <span className="font-black text-xs px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-600 dark:text-blue-300 font-mono">
                    {data.requestPct.toFixed(1)}%
                  </span>
                </div>
                <div className={`font-black font-mono ${isFullscreen ? 'text-xl' : 'text-base'} text-blue-600 dark:text-blue-300`}>
                  {formatEGP(data.requestAmt)}
                </div>
                <div className={`text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'} font-mono mt-0.5 flex justify-between`}>
                  <span className="font-semibold">{data.requestCount} cases</span>
                  <span>{formatEGPFull(data.requestAmt)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
