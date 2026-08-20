import React, { useState, useMemo } from 'react';
import { RefundRecord } from '../../types';
import { calculateTenureDistribution, parseMonthAndYear } from '../../utils/dataProcessor';
import { Maximize2, Clock, Table as TableIcon, BarChart2, Filter, Building2, RotateCcw, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LabelList } from 'recharts';

interface TenureDoubleBarChartProps {
  records: RefundRecord[];
  onExpandChart: (chartId: string, title: string, desc?: string) => void;
  customTitle?: string;
  customDescription?: string;
  isLight?: boolean;
  isFullscreen?: boolean;
}

// Clean number formatting without currency text (no EGP) and without word (no cases)
function formatNum(val: number, compact: boolean = false): string {
  if (!val || val === 0) return '0';
  if (compact) {
    if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
    if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}K`;
  }
  return Math.round(val).toLocaleString('en-US');
}

export const TenureDoubleBarChart: React.FC<TenureDoubleBarChartProps> = ({
  records,
  onExpandChart,
  customTitle,
  customDescription,
  isLight = false,
  isFullscreen = false,
}) => {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [metric, setMetric] = useState<'count' | 'amount'>('count');
  
  // In-card Filters: Company, Type, and Acceptance Month
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedAcceptanceMonth, setSelectedAcceptanceMonth] = useState<string>('ALL');

  // Discover available companies dynamically
  const availableCompanies = useMemo(() => {
    const compSet = new Set<string>();
    records.forEach(r => {
      if (r.company) {
        const c = r.company.trim();
        if (c) compSet.add(c);
      }
    });
    if (compSet.size === 0) {
      return ['Ollin', 'Premium', 'Aman', 'Contact'];
    }
    return Array.from(compSet).sort();
  }, [records]);

  // Discover available Acceptance Date Month + Year dynamically
  const availableAcceptanceMonths = useMemo(() => {
    const monthMap = new Map<string, { label: string; sortKey: number }>();
    records.forEach(r => {
      const aDate = r.acceptanceDate || '';
      const parsed = parseMonthAndYear(aDate);
      const year = parsed?.year || r.acceptanceYear;
      if (!parsed && !year) return;

      if (parsed && year) {
        const label = `${parsed.monthShort} ${year}`;
        const sortKey = year * 100 + parsed.monthIndex;
        monthMap.set(label, { label, sortKey });
      } else if (parsed) {
        const label = parsed.monthShort;
        const sortKey = parsed.monthIndex;
        monthMap.set(label, { label, sortKey });
      } else if (year) {
        const label = `${year}`;
        const sortKey = year * 100;
        monthMap.set(label, { label, sortKey });
      }
    });

    if (monthMap.size === 0) {
      return ['Jan 2024', 'Feb 2024', 'Jan 2025', 'Feb 2025'];
    }

    return Array.from(monthMap.values())
      .sort((a, b) => a.sortKey - b.sortKey)
      .map(entry => entry.label);
  }, [records]);

  // Calculate Tenure Distribution
  const { clusters, grandTotalCount, grandTotalAmount } = useMemo(() => {
    return calculateTenureDistribution(records, selectedCompany, selectedType, selectedAcceptanceMonth);
  }, [records, selectedCompany, selectedType, selectedAcceptanceMonth]);

  const title = customTitle ?? 'Member Tenure & Days Distribution';
  const description = customDescription ?? 'Duration between Acceptance Date & Request Date in months (<1m, 1-3m, 3-6m, 6-12m, 1 Year, 2 Years, 3+ Years)';

  // Enrich data with a top marker so Recharts reliably shows total labels
  const chartData = useMemo(() => {
    return clusters.map(c => ({
      ...c,
      _topMarker: 0.0001,
    }));
  }, [clusters]);

  // Calculate Totals for Table Footer
  const totals = useMemo(() => {
    return clusters.reduce(
      (acc, item) => ({
        ollinCount: acc.ollinCount + item.ollinCount,
        premiumCount: acc.premiumCount + item.premiumCount,
        amanCount: acc.amanCount + item.amanCount,
        contactCount: acc.contactCount + item.contactCount,
        defaultCount: acc.defaultCount + item.defaultCount,
        requestCount: acc.requestCount + item.requestCount,
        defaultAmount: acc.defaultAmount + item.defaultAmount,
        requestAmount: acc.requestAmount + item.requestAmount,
        totalCount: acc.totalCount + item.totalCount,
        totalAmount: acc.totalAmount + item.totalAmount,
      }),
      {
        ollinCount: 0,
        premiumCount: 0,
        amanCount: 0,
        contactCount: 0,
        defaultCount: 0,
        requestCount: 0,
        defaultAmount: 0,
        requestAmount: 0,
        totalCount: 0,
        totalAmount: 0,
      }
    );
  }, [clusters]);

  const hasActiveFilters = selectedCompany !== 'ALL' || selectedType !== 'ALL' || selectedAcceptanceMonth !== 'ALL';
  const chartHeightClass = isFullscreen ? 'h-[320px] sm:h-[350px] md:h-[380px]' : 'h-64 sm:h-72';

  return (
    <div
      className={`rounded-2xl ${isFullscreen ? 'p-5 w-full h-full' : 'p-5'} border transition-all relative flex flex-col justify-between shadow-md ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-100'
      }`}
    >
      <div>
        {/* Header with Title & Action Controls */}
        <div className={`flex flex-wrap items-center justify-between gap-2.5 mb-2.5 ${isFullscreen ? 'pr-12' : ''}`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-500 border border-purple-500/20 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              {title && <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>{title}</h3>}
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* View Mode Switcher: Chart vs Table */}
            <div className={`flex p-0.5 rounded-xl border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
              <button
                onClick={() => setViewMode('chart')}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'chart'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Chart View"
              >
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Chart</span>
              </button>

              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                  viewMode === 'table'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Table Matrix View"
              >
                <TableIcon className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            </div>

            {/* Metric Toggle for Chart */}
            {viewMode === 'chart' && (
              <div className={`flex p-0.5 rounded-xl border text-xs ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                <button
                  onClick={() => setMetric('count')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    metric === 'count'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-500 hover:text-slate-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Count
                </button>
                <button
                  onClick={() => setMetric('amount')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    metric === 'amount'
                      ? 'bg-slate-700 text-white shadow-xs'
                      : isLight
                      ? 'text-slate-500 hover:text-slate-800'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Amount
                </button>
              </div>
            )}

            {/* Fullscreen Modal Toggle */}
            {!isFullscreen && (
              <button
                onClick={() =>
                  onExpandChart(
                    'tenure_double_bar',
                    title || 'Member Tenure & Days Distribution',
                    'Duration between Request Date & Acceptance Date across tenure clusters with company breakdown'
                  )
                }
                className={`p-1.5 rounded-lg border transition-colors ${
                  isLight
                    ? 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                title="View Fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Filter Bar: Company Filter, Acceptance Month Filter & Type Filter */}
        <div className={`mb-3 p-2 rounded-xl border flex flex-wrap items-center justify-between gap-2 text-xs transition-colors ${
          isLight ? 'bg-slate-50/90 border-slate-200' : 'bg-slate-950/70 border-slate-800'
        }`}>
          <div className="flex flex-wrap items-center gap-3">
            {/* Acceptance Month Filter */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Calendar className="w-3 h-3 text-emerald-500" />
                Acceptance Month:
              </span>
              <select
                value={selectedAcceptanceMonth}
                onChange={(e) => setSelectedAcceptanceMonth(e.target.value)}
                aria-label="Filter by Acceptance Month"
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors ${
                  selectedAcceptanceMonth !== 'ALL'
                    ? 'bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 font-bold'
                    : isLight
                    ? 'bg-white border-slate-200 text-slate-800'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <option value="ALL">All Months</option>
                {availableAcceptanceMonths.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            {/* Company Filter */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Building2 className="w-3 h-3 text-purple-500" />
                Company:
              </span>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                aria-label="Filter by Company"
                className={`px-2.5 py-1 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-purple-500 transition-colors ${
                  selectedCompany !== 'ALL'
                    ? 'bg-purple-600/15 text-purple-600 dark:text-purple-400 border-purple-500/40 font-bold'
                    : isLight
                    ? 'bg-white border-slate-200 text-slate-800'
                    : 'bg-slate-900 border-slate-800 text-slate-200'
                }`}
              >
                <option value="ALL">All Companies</option>
                {availableCompanies.map(c => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Type Filter */}
            <div className="flex items-center gap-1.5">
              <span className={`text-[11px] font-bold uppercase tracking-wider flex items-center gap-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                <Filter className="w-3 h-3 text-amber-500" />
                Type:
              </span>
              <div className={`flex p-0.5 rounded-lg border text-[11px] font-semibold ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                {(['ALL', 'default', 'Request'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setSelectedType(t)}
                    className={`px-2 py-0.5 rounded-md transition-all ${
                      selectedType === t
                        ? 'bg-purple-600 text-white font-bold shadow-xs'
                        : isLight
                        ? 'text-slate-600 hover:text-slate-900'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t === 'ALL' ? 'All Types' : t === 'default' ? 'Default' : 'Request'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Active Filter Reset */}
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSelectedCompany('ALL');
                setSelectedType('ALL');
                setSelectedAcceptanceMonth('ALL');
              }}
              className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600 transition-colors px-2 py-0.5 rounded-md hover:bg-rose-500/10"
              title="Reset Filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        {/* VIEW 1: BAR CHART */}
        {viewMode === 'chart' && (
          <div className={`${chartHeightClass} mt-1 w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 20, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} />
                <XAxis
                  dataKey="tenure"
                  tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 11, fontWeight: 700 }}
                />
                <YAxis
                  tickFormatter={val => formatNum(val, true)}
                  tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  cursor={{ fill: isLight ? 'rgba(0, 0, 0, 0.04)' : 'rgba(255, 255, 255, 0.05)' }}
                  content={({ active, payload }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0].payload;
                    return (
                      <div
                        className={`p-3 rounded-xl border shadow-xl text-xs font-sans min-w-[170px] ${
                          isLight
                            ? 'bg-white border-slate-200 text-slate-900 shadow-slate-200'
                            : 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/60'
                        }`}
                      >
                        <div className="font-bold text-xs mb-1.5 pb-1 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                          <span className="text-purple-600 dark:text-purple-400 font-bold">{item.tenure}</span>
                          <span className="text-[10px] text-slate-400 font-normal">({item.subLabel})</span>
                        </div>
                        
                        <div className="space-y-1.5">
                          {metric === 'count' ? (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Total:</span>
                              <span className="text-indigo-600 dark:text-indigo-400 text-sm font-black font-mono">
                                {formatNum(item.totalCount)}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-slate-500 dark:text-slate-400 font-medium">Total Amount:</span>
                              <span className="text-amber-600 dark:text-amber-400 text-sm font-black font-mono">
                                {formatNum(item.totalAmount)}
                              </span>
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-3 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-800/80">
                            <span className="text-slate-400">Percentage:</span>
                            <span className="font-bold font-mono text-purple-600 dark:text-purple-400">
                              {(metric === 'count' ? item.percentageCount : item.percentageAmount || 0).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }}
                />

                <Legend
                  verticalAlign="top"
                  height={32}
                  wrapperStyle={{ color: isLight ? '#334155' : '#cbd5e1', fontSize: '11px' }}
                  payload={[
                    { value: 'Default', type: 'rect', color: '#ef4444' },
                    { value: 'Request', type: 'rect', color: '#3b82f6' },
                  ]}
                />

                <Bar 
                  dataKey={metric === 'count' ? 'defaultCount' : 'defaultAmount'} 
                  name="Default" 
                  fill="#ef4444" 
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey={metric === 'count' ? 'defaultCount' : 'defaultAmount'}
                    position="top"
                    formatter={(val: any) => {
                      const num = Number(val);
                      if (!num || num === 0) return '';
                      return formatNum(num, true);
                    }}
                    style={{ fill: '#ef4444', fontWeight: 'bold', fontSize: isFullscreen ? 11 : 10 }}
                  />
                </Bar>

                <Bar 
                  dataKey={metric === 'count' ? 'requestCount' : 'requestAmount'} 
                  name="Request" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey={metric === 'count' ? 'requestCount' : 'requestAmount'}
                    position="top"
                    formatter={(val: any) => {
                      const num = Number(val);
                      if (!num || num === 0) return '';
                      return formatNum(num, true);
                    }}
                    style={{ fill: '#3b82f6', fontWeight: 'bold', fontSize: isFullscreen ? 11 : 10 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* VIEW 2: CLEAN, ORGANIZED MATRIX TABLE */}
        {viewMode === 'table' && (
          <div className="mt-1 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-h-[380px] overflow-y-auto">
            <table className="w-full text-center border-collapse">
              {/* TOP HEADER: Deep Slate/Navy with soothing pastel accents */}
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className={`${isLight ? 'bg-slate-800 text-white' : 'bg-slate-950 text-slate-100'} border-b-2 border-slate-700 font-bold text-xs sm:text-sm`}>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap tracking-wide text-slate-100">
                    Tenure Duration
                  </th>

                  {selectedCompany === 'ALL' ? (
                    <>
                      <th className={`py-3.5 px-3 text-center whitespace-nowrap ${isLight ? 'text-blue-300' : 'text-blue-400'}`}>Ollin</th>
                      <th className={`py-3.5 px-3 text-center whitespace-nowrap ${isLight ? 'text-pink-300' : 'text-pink-400'}`}>Premium</th>
                      <th className={`py-3.5 px-3 text-center whitespace-nowrap ${isLight ? 'text-emerald-300' : 'text-emerald-400'}`}>Aman</th>
                      <th className={`py-3.5 px-3 text-center whitespace-nowrap ${isLight ? 'text-amber-300' : 'text-amber-400'}`}>Contact</th>
                    </>
                  ) : (
                    <>
                      <th className={`py-3.5 px-3 text-center whitespace-nowrap ${isLight ? 'text-rose-300' : 'text-rose-400'}`}>Default</th>
                      <th className={`py-3.5 px-3 text-center whitespace-nowrap ${isLight ? 'text-blue-300' : 'text-blue-400'}`}>Request</th>
                    </>
                  )}

                  <th className={`py-3.5 px-3 text-center font-black whitespace-nowrap ${isLight ? 'text-indigo-300' : 'text-indigo-300'}`}>
                    Total (Count)
                  </th>
                  <th className="py-3.5 px-3 text-center font-black text-white whitespace-nowrap">
                    Amount
                  </th>
                  <th className="py-3.5 px-3 text-center font-black text-amber-300 whitespace-nowrap">
                    % percentage
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-xs sm:text-sm">
                {clusters.map((row, idx) => {
                  const isFirst = idx === 0;
                  const rowBg = idx % 2 === 1
                    ? isLight
                      ? 'bg-slate-50/70'
                      : 'bg-slate-900/50'
                    : isLight
                    ? 'bg-white'
                    : 'bg-slate-900';

                  return (
                    <tr
                      key={row.tenure}
                      className={`transition-colors ${rowBg} ${
                        isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-800/60 text-slate-200'
                      }`}
                    >
                      {/* Tenure Label & Sub-label */}
                      <td className="py-2.5 px-3 font-bold font-sans text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-500" />
                          <span className="font-bold text-slate-900 dark:text-slate-100">{row.tenure}</span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-normal">({row.subLabel})</span>
                        </div>
                      </td>

                      {selectedCompany === 'ALL' ? (
                        <>
                          {/* Ollin (Count) */}
                          <td className="py-2.5 px-3 text-center tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                            {formatNum(row.ollinCount)}
                          </td>

                          {/* Premium (Count) */}
                          <td className="py-2.5 px-3 text-center tabular-nums text-pink-600 dark:text-pink-400 font-semibold">
                            {formatNum(row.premiumCount)}
                          </td>

                          {/* Aman (Count) */}
                          <td className="py-2.5 px-3 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                            {formatNum(row.amanCount)}
                          </td>

                          {/* Contact (Count) */}
                          <td className="py-2.5 px-3 text-center tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                            {formatNum(row.contactCount)}
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Default (Count) */}
                          <td className="py-2.5 px-3 text-center tabular-nums text-rose-600 dark:text-rose-400 font-semibold">
                            {formatNum(row.defaultCount)}
                          </td>

                          {/* Request (Count) */}
                          <td className="py-2.5 px-3 text-center tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                            {formatNum(row.requestCount)}
                          </td>
                        </>
                      )}

                      {/* Total (Count) */}
                      <td className="py-2.5 px-3 text-center tabular-nums font-black text-indigo-600 dark:text-indigo-400">
                        {formatNum(row.totalCount)}
                      </td>

                      {/* Amount */}
                      <td className="py-2.5 px-3 text-center tabular-nums font-black text-slate-900 dark:text-white">
                        {formatNum(row.totalAmount)}
                      </td>

                      {/* % Percentage */}
                      <td className="py-2.5 px-3 text-center tabular-nums font-bold">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md font-bold text-xs ${
                          isLight
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-purple-900/40 text-purple-300 border border-purple-500/30'
                        }`}>
                          {(row.percentageCount || 0).toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              {/* BOTTOM FOOTER: Darker, highly readable & distinguished summary row */}
              <tfoot className="sticky bottom-0 z-10 shadow-md">
                <tr className={`${isLight ? 'bg-slate-800 text-white border-amber-500' : 'bg-black text-white border-amber-500'} font-black font-mono border-t-2 text-xs sm:text-sm`}>
                  <td className="py-3.5 px-3 font-sans text-center font-black tracking-wider text-amber-400">
                    Total
                  </td>

                  {selectedCompany === 'ALL' ? (
                    <>
                      <td className="py-3.5 px-3 text-center tabular-nums font-black text-blue-300">
                        {formatNum(totals.ollinCount)}
                      </td>

                      <td className="py-3.5 px-3 text-center tabular-nums font-black text-pink-300">
                        {formatNum(totals.premiumCount)}
                      </td>

                      <td className="py-3.5 px-3 text-center tabular-nums font-black text-emerald-300">
                        {formatNum(totals.amanCount)}
                      </td>

                      <td className="py-3.5 px-3 text-center tabular-nums font-black text-amber-300">
                        {formatNum(totals.contactCount)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="py-3.5 px-3 text-center tabular-nums font-black text-rose-300">
                        {formatNum(totals.defaultCount)}
                      </td>

                      <td className="py-3.5 px-3 text-center tabular-nums font-black text-blue-300">
                        {formatNum(totals.requestCount)}
                      </td>
                    </>
                  )}

                  <td className="py-3.5 px-3 text-center tabular-nums font-black text-indigo-300">
                    {formatNum(totals.totalCount)}
                  </td>

                  <td className="py-3.5 px-3 text-center tabular-nums font-black text-amber-400">
                    {formatNum(totals.totalAmount)}
                  </td>

                  <td className="py-3.5 px-3 text-center tabular-nums font-black text-amber-400">
                    100.0%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Clean Footer Bar */}
      <div className={`mt-2.5 pt-2 border-t text-[11px] flex flex-wrap items-center justify-between gap-2 ${isLight ? 'border-slate-200 text-slate-500' : 'border-slate-800 text-slate-400'}`}>
        <span>Tenure Categories: &lt;1m, 1-3m, 3-6m, 6-12m, 1y, 2y, 3+y (Acceptance to Request Date)</span>
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          Showing: {grandTotalCount} memberships ({formatNum(grandTotalAmount)})
        </span>
      </div>
    </div>
  );
};
