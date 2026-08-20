import React from 'react';
import { RefundRecord } from '../../types';
import { calculateDefaultFunnel, formatEGP, formatEGPFull } from '../../utils/dataProcessor';
import { Maximize2, Filter } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';

interface DefaultFunnelChartProps {
  records: RefundRecord[];
  onExpandChart: (chartId: string, title: string, desc?: string) => void;
  customTitle?: string;
  customDescription?: string;
}

export const DefaultFunnelChart: React.FC<DefaultFunnelChartProps> = ({
  records,
  onExpandChart,
  customTitle,
  customDescription,
}) => {
  const funnelData = calculateDefaultFunnel(records);
  const title = customTitle ?? 'Default Funnel Stage Analysis';
  const description = customDescription ?? 'Default (All Status) → Reachable → Retained → Reactive';

  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md hover:border-slate-700 transition-all relative flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
              <Filter className="w-4 h-4" />
            </div>
            <div>
              {title && <h3 className="text-sm font-bold text-white">{title}</h3>}
            </div>
          </div>
          <button
            onClick={() => onExpandChart('default_funnel', title || 'Default Funnel Stage Analysis', description)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="View Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Funnel Chart */}
        <div className="h-64 mt-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={funnelData}
              margin={{ top: 10, right: 30, left: 20, bottom: 10 }}
            >
              <XAxis type="number" tickFormatter={(val) => formatEGP(val)} tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <YAxis dataKey="step" type="category" width={140} tick={{ fill: '#f8fafc', fontSize: 11, fontWeight: 600 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }}
                itemStyle={{ color: '#f8fafc' }}
                formatter={(val: any, name: any, item: any) => [
                  `${formatEGPFull(Number(val))} (${item.payload.count} Members, ${item.payload.percentage.toFixed(1)}%)`,
                  'Amount'
                ]}
              />
              <Bar dataKey="amount" radius={[0, 8, 8, 0]}>
                {funnelData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
                <LabelList 
                  dataKey="percentage" 
                  position="insideRight" 
                  formatter={(val: any) => `${Number(val).toFixed(1)}%`}
                  style={{ fill: '#ffffff', fontWeight: 'bold', fontSize: 11 }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Grid of Steps */}
      <div className="mt-2 pt-3 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        {funnelData.map((step) => (
          <div key={step.step} className="bg-slate-950 p-2 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 font-semibold block truncate uppercase">{step.step}</span>
            <span className="font-bold text-white block mt-0.5">{formatEGP(step.amount)}</span>
            <span className="text-[10px] text-blue-400 font-bold block">{step.percentage.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};
