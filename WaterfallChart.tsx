import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RefundRecord } from '../../types';
import { calculateAcceptanceYearWaterfall, parseMonthAndYear, MONTH_SHORT_NAMES } from '../../utils/dataProcessor';
import { Maximize2, Layers, Table as TableIcon, BarChart2, Calendar, Filter, RotateCcw, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid, LabelList } from 'recharts';

interface WaterfallChartProps {
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

export const WaterfallChart: React.FC<WaterfallChartProps> = ({
  records,
  onExpandChart,
  customTitle,
  customDescription,
  isLight = false,
  isFullscreen = false,
}) => {
  const [metric, setMetric] = useState<'amount' | 'count'>('amount');
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  
  // In-card Filters: Type and Action Date Month
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [selectedActionMonth, setSelectedActionMonth] = useState<string>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const filterPopoverRef = useRef<HTMLDivElement>(null);

  // Close filter popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterPopoverRef.current && !filterPopoverRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
    };
    if (isFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen]);

  // Discover available Action Date months from records dynamically
  const availableActionMonths = useMemo(() => {
    const monthMap = new Map<string, number>();
    records.forEach(r => {
      const aDate = r.actionDate || r.requestDate || r.requestMonth || '';
      if (!aDate) return;
      const parsed = parseMonthAndYear(aDate);
      if (parsed && parsed.monthIndex >= 1 && parsed.monthIndex <= 12) {
        monthMap.set(parsed.monthShort, parsed.monthIndex);
      }
    });

    if (monthMap.size === 0) {
      MONTH_SHORT_NAMES.forEach((m, idx) => monthMap.set(m, idx + 1));
    }

    return Array.from(monthMap.entries())
      .sort((a, b) => a[1] - b[1])
      .map(entry => entry[0]);
  }, [records]);

  // Filter records based on Type and Action Date Month
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // 1. Type Filter
      if (selectedType !== 'ALL') {
        const t = (r.type || '').trim().toLowerCase();
        if (t !== selectedType.toLowerCase()) return false;
      }

      // 2. Action Date Month Filter
      if (selectedActionMonth !== 'ALL') {
        const aDate = r.actionDate || r.requestDate || r.requestMonth || '';
        if (!aDate) return false;
        const parsed = parseMonthAndYear(aDate);
        if (!parsed) return false;

        const matchShort = parsed.monthShort.toLowerCase() === selectedActionMonth.toLowerCase();
        const matchJul =
          (selectedActionMonth.toLowerCase() === 'jul' && parsed.monthShort.toLowerCase() === 'july') ||
          (selectedActionMonth.toLowerCase() === 'july' && parsed.monthShort.toLowerCase() === 'jul');
        if (!matchShort && !matchJul) return false;
      }

      return true;
    });
  }, [records, selectedType, selectedActionMonth]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (selectedType !== 'ALL') count++;
    if (selectedActionMonth !== 'ALL') count++;
    return count;
  }, [selectedType, selectedActionMonth]);

  const hasActiveFilters = activeFilterCount > 0;

  const rawWaterfallData = useMemo(() => calculateAcceptanceYearWaterfall(filteredRecords), [filteredRecords]);
  const title = customTitle ?? 'Acceptance Year Refund Waterfall';
  const description = customDescription ?? 'Breakdown by Acceptance Year (2021 - 2026)';

  // Enrich data with a guaranteed top marker (0.0001) so Recharts ALWAYS renders top label for every single year (including 2026)
  const waterfallData = useMemo(() => {
    return rawWaterfallData.map(item => ({
      ...item,
      _topMarker: 0.0001, // Invisible slice at the top of stack to anchor the LabelList reliably
    }));
  }, [rawWaterfallData]);

  // Calculate Grand Totals for the summary row
  const totals = useMemo(() => {
    return waterfallData.reduce(
      (acc, item) => ({
        ollinAmount: acc.ollinAmount + item.OllinAmount,
        ollinCount: acc.ollinCount + item.OllinCount,
        premiumAmount: acc.premiumAmount + item.PremiumAmount,
        premiumCount: acc.premiumCount + item.PremiumCount,
        amanAmount: acc.amanAmount + item.AmanAmount,
        amanCount: acc.amanCount + item.AmanCount,
        contactAmount: acc.contactAmount + item.ContactAmount,
        contactCount: acc.contactCount + item.ContactCount,
        totalAmount: acc.totalAmount + item.TotalAmount,
        totalCount: acc.totalCount + item.TotalCount,
      }),
      {
        ollinAmount: 0,
        ollinCount: 0,
        premiumAmount: 0,
        premiumCount: 0,
        amanAmount: 0,
        amanCount: 0,
        contactAmount: 0,
        contactCount: 0,
        totalAmount: 0,
        totalCount: 0,
      }
    );
  }, [waterfallData]);

  // Adjusted chart height: smaller in fullscreen to fit completely on-screen without requiring scrolling
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
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center">
              <Layers className="w-4 h-4" />
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
                    ? 'bg-amber-600 text-white shadow-xs'
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
                    ? 'bg-amber-600 text-white shadow-xs'
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
              </div>
            )}

            {/* In-Chart Filter Popover Toggle */}
            <div className="relative" ref={filterPopoverRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`relative p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isFilterOpen || activeFilterCount > 0
                    ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-600/30'
                    : isLight
                    ? 'border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    : 'border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
                title={activeFilterCount > 0 ? `${activeFilterCount} Active Filters` : 'Filter Chart'}
                aria-label="Filter Chart"
              >
                <Filter className="w-3.5 h-3.5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full flex items-center justify-center shadow-xs">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Popover Dropdown */}
              {isFilterOpen && (
                <div
                  className={`absolute right-0 mt-2 w-72 p-3.5 rounded-2xl border shadow-2xl z-50 text-xs space-y-3 animate-fadeIn ${
                    isLight ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/80' : 'bg-slate-900 border-slate-700/90 text-slate-200 shadow-black/80'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-amber-500" />
                      Waterfall Filters
                    </span>
                    <div className="flex items-center gap-1.5">
                      {hasActiveFilters && (
                        <button
                          onClick={() => {
                            setSelectedType('ALL');
                            setSelectedActionMonth('ALL');
                          }}
                          className="text-[10px] font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-0.5 px-1.5 py-0.5 rounded hover:bg-rose-500/10"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          Reset
                        </button>
                      )}
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Type Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Type:
                    </label>
                    <div className={`flex p-0.5 rounded-lg border text-xs font-semibold ${isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'}`}>
                      {(['ALL', 'default', 'Request'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setSelectedType(t)}
                          className={`flex-1 py-1 rounded-md transition-all text-center ${
                            selectedType === t
                              ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                              : isLight
                              ? 'text-slate-600 hover:text-slate-900'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          {t === 'ALL' ? 'All' : t === 'default' ? 'Default' : 'Request'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Action Month Filter */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-indigo-500" />
                      Action Month:
                    </label>
                    <select
                      value={selectedActionMonth}
                      onChange={(e) => setSelectedActionMonth(e.target.value)}
                      className={`w-full px-2.5 py-1.5 rounded-lg border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-amber-500 transition-colors ${
                        selectedActionMonth !== 'ALL'
                          ? 'bg-indigo-600/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/40 font-bold'
                          : isLight
                          ? 'bg-white border-slate-200 text-slate-800'
                          : 'bg-slate-950 border-slate-800 text-slate-200'
                      }`}
                    >
                      <option value="ALL">All Action Months</option>
                      {availableActionMonths.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Fullscreen Modal Toggle */}
            {!isFullscreen && (
              <button
                onClick={() =>
                  onExpandChart(
                    'acceptance_waterfall',
                    title || 'Acceptance Year Refund Waterfall',
                    'Acceptance Date year breakdown per company count & amount (2021-2026)'
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

        {/* VIEW 1: BAR CHART */}
        {viewMode === 'chart' && (
          <div className={`${chartHeightClass} mt-1 w-full`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 20, right: 15, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#1e293b'} />
                <XAxis
                  dataKey="year"
                  tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 12, fontWeight: 700 }}
                />
                <YAxis
                  tickFormatter={val => formatNum(val, true)}
                  tick={{ fill: isLight ? '#475569' : '#94a3b8', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? '#ffffff' : '#0f172a',
                    borderColor: isLight ? '#cbd5e1' : '#1e293b',
                    borderRadius: '12px',
                    color: isLight ? '#0f172a' : '#f8fafc',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                  itemStyle={{ color: isLight ? '#0f172a' : '#f8fafc' }}
                  formatter={(val: any, name: any, item: any) => {
                    if (name === '_topMarker') return null;
                    const numVal = Number(val);
                    const yearData = item.payload;
                    if (metric === 'amount') {
                      let countVal = 0;
                      if (name === 'Ollin') countVal = yearData.OllinCount;
                      else if (name === 'Premium') countVal = yearData.PremiumCount;
                      else if (name === 'Aman') countVal = yearData.AmanCount;
                      else if (name === 'Contact') countVal = yearData.ContactCount;
                      return [`${formatNum(numVal)} (${countVal})`, name];
                    } else {
                      let amtVal = 0;
                      if (name === 'Ollin') amtVal = yearData.OllinAmount;
                      else if (name === 'Premium') amtVal = yearData.PremiumAmount;
                      else if (name === 'Aman') amtVal = yearData.AmanAmount;
                      else if (name === 'Contact') amtVal = yearData.ContactAmount;
                      return [`${numVal} (${formatNum(amtVal, true)})`, name];
                    }
                  }}
                  labelFormatter={label => `Acceptance Year: ${label}`}
                />
                <Legend
                  verticalAlign="top"
                  height={32}
                  wrapperStyle={{ color: isLight ? '#334155' : '#cbd5e1', fontSize: '11px' }}
                  payload={[
                    { value: 'Ollin', type: 'rect', color: '#2563eb' },
                    { value: 'Premium', type: 'rect', color: '#ec4899' },
                    { value: 'Aman', type: 'rect', color: '#10b981' },
                    { value: 'Contact', type: 'rect', color: '#f59e0b' },
                  ]}
                />

                <Bar dataKey={metric === 'amount' ? 'OllinAmount' : 'OllinCount'} name="Ollin" stackId="a" fill="#2563eb" />
                <Bar dataKey={metric === 'amount' ? 'PremiumAmount' : 'PremiumCount'} name="Premium" stackId="a" fill="#ec4899" />
                <Bar dataKey={metric === 'amount' ? 'AmanAmount' : 'AmanCount'} name="Aman" stackId="a" fill="#10b981" />
                <Bar dataKey={metric === 'amount' ? 'ContactAmount' : 'ContactCount'} name="Contact" stackId="a" fill="#f59e0b" />

                {/* Guaranteed Top Marker Bar ensuring numbers are rendered on 2026 and every year bar without fail */}
                <Bar dataKey="_topMarker" name="_topMarker" stackId="a" fill="transparent" isAnimationActive={false}>
                  <LabelList
                    dataKey={metric === 'amount' ? 'TotalAmount' : 'TotalCount'}
                    position="top"
                    formatter={(val: any) => {
                      const num = Number(val);
                      if (num === 0) return '0';
                      return formatNum(num, true);
                    }}
                    style={{
                      fill: isLight ? '#0f172a' : '#f8fafc',
                      fontWeight: 'bold',
                      fontSize: isFullscreen ? 12 : 11,
                    }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* VIEW 2: CLEAN, CENTERED MATRIX TABLE (Row Labels | Ollin | Premium | Aman | Contact | Total | Amount) */}
        {viewMode === 'table' && (
          <div className="mt-1 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm max-h-[380px] overflow-y-auto">
            <table className="w-full text-center border-collapse">
              {/* TOP HEADER: Deep Slate/Navy with soothing pastel company accents */}
              <thead className="sticky top-0 z-10 shadow-sm">
                <tr className={`${isLight ? 'bg-slate-800 text-white' : 'bg-slate-950 text-slate-100'} border-b-2 border-slate-700 font-bold text-xs sm:text-sm`}>
                  <th className="py-3.5 px-3 text-center whitespace-nowrap tracking-wide text-slate-100">Row Labels</th>
                  <th className={`py-3.5 px-3 text-center whitespace-nowrap ${isLight ? 'text-blue-300' : 'text-blue-400'}`}>Ollin</th>
                  <th className={`py-3.5 px-3 text-center whitespace-nowrap ${isLight ? 'text-pink-300' : 'text-pink-400'}`}>Premium</th>
                  <th className={`py-3.5 px-3 text-center whitespace-nowrap ${isLight ? 'text-emerald-300' : 'text-emerald-400'}`}>Aman</th>
                  <th className={`py-3.5 px-3 text-center whitespace-nowrap ${isLight ? 'text-amber-300' : 'text-amber-400'}`}>Contact</th>
                  <th className={`py-3.5 px-3 text-center font-black whitespace-nowrap ${isLight ? 'text-indigo-300' : 'text-indigo-300'}`}>Total (#)</th>
                  <th className="py-3.5 px-3 text-center font-black text-white whitespace-nowrap">Amount</th>
                  <th className="py-3.5 px-3 text-center font-black text-amber-300 whitespace-nowrap">% percentage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-xs sm:text-sm">
                {waterfallData.map((row, idx) => {
                  const is2026 = row.year === '2026';
                  const rowBg = is2026
                    ? isLight
                      ? 'bg-amber-50/70 font-semibold'
                      : 'bg-amber-950/25 font-semibold'
                    : idx % 2 === 1
                    ? isLight
                      ? 'bg-slate-50/70'
                      : 'bg-slate-900/50'
                    : isLight
                    ? 'bg-white'
                    : 'bg-slate-900';

                  return (
                    <tr
                      key={row.year}
                      className={`transition-colors ${rowBg} ${
                        isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-slate-800/60 text-slate-200'
                      }`}
                    >
                      {/* Row Label (Year) */}
                      <td className="py-2.5 px-3 font-bold font-sans text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <Calendar className={`w-3.5 h-3.5 ${is2026 ? 'text-amber-500' : 'text-slate-400'}`} />
                          <span className={is2026 ? 'text-amber-600 dark:text-amber-400 font-extrabold' : ''}>{row.year}</span>
                        </div>
                      </td>

                      {/* Ollin (Count) */}
                      <td className="py-2.5 px-3 text-center tabular-nums text-blue-600 dark:text-blue-400 font-semibold">
                        {formatNum(row.OllinCount)}
                      </td>

                      {/* Premium (Count) */}
                      <td className="py-2.5 px-3 text-center tabular-nums text-pink-600 dark:text-pink-400 font-semibold">
                        {formatNum(row.PremiumCount)}
                      </td>

                      {/* Aman (Count) */}
                      <td className="py-2.5 px-3 text-center tabular-nums text-emerald-600 dark:text-emerald-400 font-semibold">
                        {formatNum(row.AmanCount)}
                      </td>

                      {/* Contact (Count) */}
                      <td className="py-2.5 px-3 text-center tabular-nums text-amber-600 dark:text-amber-400 font-semibold">
                        {formatNum(row.ContactCount)}
                      </td>

                      {/* Total (Count of Cases) */}
                      <td className="py-2.5 px-3 text-center tabular-nums font-black text-indigo-600 dark:text-indigo-400">
                        {formatNum(row.TotalCount)}
                      </td>

                      {/* Amount (Total Amount) */}
                      <td className="py-2.5 px-3 text-center tabular-nums font-black text-slate-900 dark:text-white">
                        {formatNum(row.TotalAmount)}
                      </td>

                      {/* % Percentage */}
                      <td className="py-2.5 px-3 text-center tabular-nums font-bold text-slate-700 dark:text-slate-200">
                        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-md font-bold text-xs ${
                          is2026
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 font-extrabold border border-amber-500/30'
                            : isLight
                            ? 'bg-slate-100 text-slate-800'
                            : 'bg-slate-800 text-slate-200'
                        }`}>
                          {(row.percentage || 0).toFixed(1)}%
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
        <span>Acceptance cohorts: 2021 – 2026</span>
        <span className="font-semibold text-slate-600 dark:text-slate-300">
          Showing: {filteredRecords.length} records
        </span>
      </div>
    </div>
  );
};
