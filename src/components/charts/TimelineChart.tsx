import React, { useState } from 'react';
import { RefundRecord } from '../../types';
import { calculateCompanyTimeline, formatEGP, formatEGPFull } from '../../utils/dataProcessor';
import { Maximize2, TrendingUp, Filter, Sigma, Building2 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';

interface TimelineChartProps {
  records: RefundRecord[];
  onExpandChart: (chartId: string, title: string, desc?: string) => void;
  customTitle?: string;
  customDescription?: string;
  isLight?: boolean;
  selectedCompany?: string;
  isFullscreen?: boolean;
}

const COMPANY_COLORS: Record<string, string> = {
  Ollin: '#3b82f6',
  Premium: '#ec4899',
  Aman: '#10b981',
  Contact: '#f59e0b',
  Total: '#8b5cf6', // Distinct vibrant violet/purple for Consolidated Total Line
};

export const TimelineChart: React.FC<TimelineChartProps> = ({
  records,
  onExpandChart,
  customTitle,
  customDescription,
  isLight,
  selectedCompany = 'ALL',
  isFullscreen = false,
}) => {
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'default' | 'Request'>('ALL');
  const [chartCompanyFilter, setChartCompanyFilter] = useState<string>(selectedCompany);
  const [showTotalOnly, setShowTotalOnly] = useState<boolean>(true);

  // 1. Filter records by Type
  const recordsByType = typeFilter === 'ALL'
    ? records
    : records.filter(r => r.type.toLowerCase() === typeFilter.toLowerCase());

  // 2. Sync / determine active company filter
  const activeCompany = selectedCompany !== 'ALL' ? selectedCompany : chartCompanyFilter;

  // 3. Filter records by Company (if not in Total mode and specific company selected)
  const filteredRecords = (showTotalOnly || activeCompany === 'ALL')
    ? recordsByType
    : recordsByType.filter(r => r.company.toLowerCase() === activeCompany.toLowerCase());

  const timelineData = calculateCompanyTimeline(recordsByType);
  const title = customTitle ?? 'Monthly Refund Trend by Company';
  const description = customDescription ?? 'Timeline tracking refund amounts by Action Date with company and total trends';

  // Total across filtered dataset (strictly Cancelled & Cheque pending, excluding Reactive)
  const totalTimelineAmt = filteredRecords
    .filter(r => !r.reactive && ((r.status || '').toLowerCase() === 'cancelled' || (r.status || '').toLowerCase() === 'cheque pending'))
    .reduce((sum, r) => sum + r.amount, 0);

  // Chart height optimized for standard and fullscreen views
  const chartHeightClass = isFullscreen ? 'h-[320px] sm:h-[380px] md:h-[420px]' : 'h-64';

  return (
    <div className={`rounded-2xl ${isFullscreen ? 'p-4 sm:p-5 w-full h-full' : 'p-5'} border transition-all relative flex flex-col justify-between h-full shadow-md ${
      isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
    }`}>
      <div>
        {/* Header & Main Controls */}
        <div className={`flex flex-wrap items-center justify-between gap-2.5 mb-2.5 ${isFullscreen ? 'pr-12' : ''}`}>
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border transition-colors ${
              showTotalOnly 
                ? 'bg-purple-500/15 text-purple-500 border-purple-500/30' 
                : 'bg-blue-500/10 text-blue-500 border border-blue-500/20'
            }`}>
              {showTotalOnly ? <Sigma className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            </div>
            <div>
              {title && (
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className={`text-sm sm:text-base font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    {title}
                  </h3>
                  {showTotalOnly && (
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-600 dark:text-purple-300 border border-purple-500/30">
                      Consolidated Total Line
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center flex-wrap gap-2">
            {/* Type Filter Buttons (ALL, Default, Request) */}
            <div className={`flex p-0.5 rounded-xl border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <span className="text-[11px] font-bold text-slate-500 px-2 flex items-center gap-1">
                <Filter className="w-3 h-3 text-blue-500" />
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
                        ? 'bg-blue-600 text-white shadow-xs'
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

            {/* Total Line Toggle Icon Button */}
            <button
              onClick={() => setShowTotalOnly(!showTotalOnly)}
              className={`px-2.5 py-1 rounded-xl border font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
                showTotalOnly
                  ? 'bg-purple-600 text-white border-purple-500 shadow-purple-500/20'
                  : isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-300'
                  : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-purple-950/40 hover:text-purple-400 hover:border-purple-700'
              }`}
              title={showTotalOnly ? 'Switch to Multi-Company View' : 'Show Single Total Consolidated Line for All Companies'}
            >
              <Sigma className="w-3.5 h-3.5" />
              <span>{showTotalOnly ? 'Total Line (Active)' : 'Total Line'}</span>
            </button>

            {/* Company Filter Tabs (active when not in total-only mode) */}
            {!showTotalOnly && (
              <div className={`flex items-center p-0.5 rounded-xl border text-xs font-bold ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                <span className="text-[11px] font-bold text-slate-500 px-1.5 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" />
                </span>
                {['ALL', 'Ollin', 'Premium', 'Aman', 'Contact'].map((comp) => (
                  <button
                    key={comp}
                    onClick={() => setChartCompanyFilter(comp)}
                    className={`px-2 py-0.5 rounded-lg transition-all cursor-pointer ${
                      activeCompany === comp
                        ? 'bg-blue-600 text-white shadow-xs font-black'
                        : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {comp}
                  </button>
                ))}
              </div>
            )}

            {/* Fullscreen Button */}
            {!isFullscreen && (
              <button
                onClick={() => onExpandChart('company_timeline', title || 'Monthly Refund Trend by Company', description)}
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

        {/* Timeline Line Chart */}
        <div className={`${chartHeightClass} mt-1`}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={timelineData} margin={{ top: 15, right: 25, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} />
              <XAxis 
                dataKey="month" 
                tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 11, fontWeight: 600 }} 
              />
              <YAxis 
                tickFormatter={(val) => formatEGP(val)} 
                tick={{ fill: isLight ? '#64748b' : '#94a3b8', fontSize: 11 }} 
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900/95 p-3 rounded-xl border border-slate-700 shadow-xl text-xs space-y-1.5 min-w-[210px]">
                        <div className="font-bold text-slate-200 border-b border-slate-800 pb-1 flex items-center justify-between">
                          <span>Action Month: <strong className="text-white">{label}</strong></span>
                          {typeFilter !== 'ALL' && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                              {typeFilter}
                            </span>
                          )}
                        </div>
                        {payload.map((item: any) => (
                          <div key={item.dataKey} className="flex items-center justify-between gap-3 py-0.5">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.stroke || item.color }} />
                              <span className="text-slate-300">{item.name}:</span>
                            </div>
                            <span className="font-mono font-black text-white">{formatEGPFull(Number(item.value))}</span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ color: isLight ? '#475569' : '#cbd5e1', fontSize: '11px' }} />
              
              {/* Single Consolidated Total Line when Total Line is Active */}
              {showTotalOnly && (
                <Line 
                  type="monotone" 
                  dataKey="Total" 
                  name="Total (All Companies Consolidated)" 
                  stroke={COMPANY_COLORS.Total} 
                  strokeWidth={3.5} 
                  dot={{ r: 5, fill: COMPANY_COLORS.Total, strokeWidth: 2, stroke: '#ffffff' }} 
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#ffffff' }} 
                />
              )}

              {/* Multi-Company Individual Lines when in Standard Breakdown Mode */}
              {!showTotalOnly && (
                <>
                  {(activeCompany === 'ALL' || activeCompany === 'Ollin') && (
                    <Line type="monotone" dataKey="Ollin" name="Ollin" stroke={COMPANY_COLORS.Ollin} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  )}
                  {(activeCompany === 'ALL' || activeCompany === 'Premium') && (
                    <Line type="monotone" dataKey="Premium" name="Premium" stroke={COMPANY_COLORS.Premium} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  )}
                  {(activeCompany === 'ALL' || activeCompany === 'Aman') && (
                    <Line type="monotone" dataKey="Aman" name="Aman" stroke={COMPANY_COLORS.Aman} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  )}
                  {(activeCompany === 'ALL' || activeCompany === 'Contact') && (
                    <Line type="monotone" dataKey="Contact" name="Contact" stroke={COMPANY_COLORS.Contact} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                  )}
                </>
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Footer Summary Bar */}
      <div className={`mt-2 pt-2.5 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'} text-xs flex flex-wrap items-center justify-between gap-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
        <span className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${showTotalOnly ? 'bg-purple-500' : 'bg-blue-500'}`} />
          Mode: <strong>{showTotalOnly ? 'Consolidated Total' : `Company: ${activeCompany}`}</strong>
          {typeFilter !== 'ALL' && <span className="font-semibold"> | Type: {typeFilter}</span>}
          <span> ({timelineData.length} Action Months)</span>
        </span>
        <span className={`font-mono font-bold ${showTotalOnly ? 'text-purple-600 dark:text-purple-400' : 'text-blue-600 dark:text-blue-400'}`}>
          Total Trend Amount: {formatEGP(totalTimelineAmt)}
        </span>
      </div>
    </div>
  );
};
