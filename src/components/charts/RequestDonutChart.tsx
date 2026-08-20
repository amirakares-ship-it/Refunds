import React from 'react';
import { RefundRecord } from '../../types';
import { calculateRequestDonut } from '../../utils/dataProcessor';
import { Maximize2, FileCheck } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface RequestDonutChartProps {
  records: RefundRecord[];
  manualTotalCancellations?: number | null;
  onExpandChart: (chartId: string, title: string, desc?: string) => void;
  customTitle?: string;
  customDescription?: string;
}

export const RequestDonutChart: React.FC<RequestDonutChartProps> = ({
  records,
  manualTotalCancellations,
  onExpandChart,
  customTitle,
  customDescription,
}) => {
  const data = calculateRequestDonut(records, manualTotalCancellations ?? undefined);
  const title = customTitle ?? 'Request Type Cancellations';
  const description = customDescription ?? 'Count & % share of Total Cancellations';

  return (
    <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-md hover:border-slate-700 transition-all relative flex flex-col justify-between h-full">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              {title && <h3 className="text-sm font-bold text-white">{title}</h3>}
            </div>
          </div>
          <button
            onClick={() => onExpandChart('request_donut', title || 'Request Type Cancellations', description)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="View Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Donut Chart Container */}
        <div className="h-64 relative mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data.chartData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={92}
                paddingAngle={4}
                dataKey="value"
              >
                {data.chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px', color: '#f8fafc' }}
                itemStyle={{ color: '#f8fafc' }}
                formatter={(val: any, name: any) => [
                  `${val} Cancellations (${Number(data.chartData.find(d => d.name === name)?.percentage || 0).toFixed(1)}%)`,
                  name
                ]}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: '#cbd5e1', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>

          {/* Text in the Middle of Circle */}
          <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-center pb-8">
            <span className="text-2xl font-black text-white">{data.totalCancellations}</span>
            <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Total Cancellations</span>
          </div>
        </div>
      </div>

      {/* Footer Info */}
      <div className="mt-2 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <span>Request Share:</span>
        <span className="font-bold text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded border border-blue-500/20">
          {data.percentage.toFixed(1)}% ({data.requestCount} count)
        </span>
      </div>
    </div>
  );
};
