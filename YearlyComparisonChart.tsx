import React, { useState, useMemo, useRef, useEffect } from 'react';
import { RefundRecord } from '../../types';
import { formatEGP, formatEGPFull, extractPossibleMonthIndices, parseMonthAndYear } from '../../utils/dataProcessor';
import { Calendar, Maximize2, DollarSign, Hash, ArrowUpRight, ArrowDownRight, Filter, RotateCcw, Building2, Layers, Clock } from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  CartesianGrid,
  LabelList 
} from 'recharts';

interface YearlyComparisonChartProps {
  records: RefundRecord[];
  onExpandChart?: (chartId: string, title: string, desc?: string) => void;
  customTitle?: string;
  customDescription?: string;
  isLight?: boolean;
  isFullscreen?: boolean;
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Safely resolves the Year (2025/2026) and Month Index (0..11) based strictly on Action Date
 */
export function getRecordActionDateInfo(r: RefundRecord): { year: number; monthIdx: number } {
  // Priority: actionDate -> csDate -> requestDate -> requestMonth
  const targetDateStr = r.actionDate || r.csDate || r.requestDate || r.requestMonth || '';
  let resolvedYear = r.year || r.refundYear || 2026;
  let resolvedMonthIdx = 0; // default to Jan (0)

  // 1. Try structured parse
  const parsed = parseMonthAndYear(targetDateStr);
  if (parsed) {
    if (parsed.year && (parsed.year === 2025 || parsed.year === 2026)) {
      resolvedYear = parsed.year;
    }
    if (parsed.monthIndex >= 1 && parsed.monthIndex <= 12) {
      resolvedMonthIdx = parsed.monthIndex - 1;
    }
  } else {
    // 2. Extract possible month index
    const mIndices = extractPossibleMonthIndices(targetDateStr);
    if (mIndices.length > 0) {
      resolvedMonthIdx = Math.max(0, Math.min(11, mIndices[0] - 1));
    }
    // 3. Extract 4-digit year if present in target date string
    const match = String(targetDateStr).match(/\b(202[0-9])\b/);
    if (match) {
      resolvedYear = parseInt(match[1], 10);
    }
  }

  // If actionDate specifically contains 2025 or 2026 in text/numbers
  if (r.actionDate) {
    const yrMatch = String(r.actionDate).match(/\b(202[4-9])\b/);
    if (yrMatch) {
      resolvedYear = parseInt(yrMatch[1], 10);
    }
  }

  return {
    year: resolvedYear,
    monthIdx: resolvedMonthIdx,
  };
}

// Helper to format amount in Millions (e.g. 1.25M, 0.45M, 2M)
function formatPerMillion(amount: number): string {
  if (!amount || amount === 0) return '0M';
  const m = amount / 1000000;
  if (m >= 100) {
    return `${m.toFixed(1)}M`;
  }
  if (m >= 1) {
    return `${m.toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  if (m >= 0.01) {
    return `${m.toFixed(2).replace(/\.?0+$/, '')}M`;
  }
  return `${m.toFixed(3)}M`;
}

interface CustomBarLabelProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  value?: number;
  index?: number;
  payload?: any;
  year: 2025 | 2026;
  metric: 'amount' | 'count';
  isLight: boolean;
  isFullscreen: boolean;
  data?: any[];
}

const CustomBarLabel: React.FC<CustomBarLabelProps> = (props) => {
  const { x = 0, y = 0, width = 0, value, payload, year, metric, isLight, isFullscreen, data, index } = props;
  
  let val: number | undefined = undefined;

  // 1. Direct value from Recharts props
  if (typeof value === 'number' && !isNaN(value)) {
    val = value;
  }
  // 2. Or from props.payload
  else if (payload) {
    val = year === 2025 
      ? (metric === 'amount' ? payload.amount2025 : payload.count2025)
      : (metric === 'amount' ? payload.amount2026 : payload.count2026);
  }
  // 3. Or from data array at index
  else if (data && typeof index === 'number' && data[index]) {
    const row = data[index];
    val = year === 2025 
      ? (metric === 'amount' ? row.amount2025 : row.count2025)
      : (metric === 'amount' ? row.amount2026 : row.count2026);
  }

  // If no value or 0, do not render label
  if (val === undefined || val === null || val <= 0) return null;

  const primaryColor = year === 2025 
    ? (isLight ? '#0284c7' : '#38bdf8') 
    : (isLight ? '#9333ea' : '#c084fc');

  // Display Amount in Millions (e.g. 1.25M / 0.45M) OR Count (e.g. 84) based on active metric selection
  const labelText = metric === 'amount' 
    ? formatPerMillion(val) 
    : `${val}`;

  return (
    <text
      x={x + width / 2}
      y={y - 7}
      textAnchor="middle"
      fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      fontSize={isFullscreen ? 11 : 9.5}
      fontWeight={800}
      fill={primaryColor}
      style={{ pointerEvents: 'none' }}
    >
      {labelText}
    </text>
  );
};

export const YearlyComparisonChart: React.FC<YearlyComparisonChartProps> = ({
  records,
  onExpandChart,
  customTitle,
  customDescription,
  isLight = false,
  isFullscreen = false,
}) => {
  const [metric, setMetric] = useState<'amount' | 'count'>('amount');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'default' | 'Request'>('ALL');
  const [companyFilter, setCompanyFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'monthly' | 'company'>('monthly');
  const [isFilterOpen, setIsFilterOpen] = useState<boolean>(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Close filter dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
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

  // Discover available companies dynamically
  const availableCompanies = useMemo(() => {
    const set = new Set<string>();
    records.forEach(r => {
      if (r.company) {
        const c = r.company.trim();
        if (c) set.add(c);
      }
    });
    if (set.size === 0) return ['Aman', 'Ollin', 'Premium', 'Contact'];
    return Array.from(set).sort();
  }, [records]);

  // Count active filters
  const activeFiltersCount = (typeFilter !== 'ALL' ? 1 : 0) + (companyFilter !== 'ALL' ? 1 : 0);

  // Filter valid refund records (Cancelled & Cheque Pending, excluding Reactive)
  const validRecords = useMemo(() => {
    return records.filter(r => {
      if (r.reactive) return false;
      const statusLower = (r.status || '').toLowerCase();
      const isValidStatus = statusLower === 'cancelled' || statusLower === 'cheque pending';
      if (!isValidStatus) return false;

      if (typeFilter !== 'ALL' && r.type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      if (companyFilter !== 'ALL' && r.company.toLowerCase() !== companyFilter.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [records, typeFilter, companyFilter]);

  // Overall Year Totals based on Action Date
  const yearStats = useMemo(() => {
    let amt2025 = 0;
    let count2025 = 0;
    let amt2026 = 0;
    let count2026 = 0;

    validRecords.forEach(r => {
      const { year: yr } = getRecordActionDateInfo(r);
      if (yr === 2025) {
        amt2025 += r.amount;
        count2025 += 1;
      } else if (yr === 2026) {
        amt2026 += r.amount;
        count2026 += 1;
      }
    });

    const diffAmt = amt2026 - amt2025;
    const pctAmt = amt2025 > 0 ? ((amt2026 - amt2025) / amt2025) * 100 : 0;

    const diffCount = count2026 - count2025;
    const pctCount = count2025 > 0 ? ((count2026 - count2025) / count2025) * 100 : 0;

    return {
      amt2025,
      count2025,
      amt2026,
      count2026,
      diffAmt,
      pctAmt,
      diffCount,
      pctCount,
    };
  }, [validRecords]);

  // Monthly Comparison Data (Jan .. Dec) based on Action Date
  const monthlyData = useMemo(() => {
    const monthsMap: Record<number, { monthIdx: number; monthName: string; amount2025: number; count2025: number; amount2026: number; count2026: number }> = {};
    for (let i = 0; i < 12; i++) {
      monthsMap[i] = {
        monthIdx: i,
        monthName: MONTH_NAMES[i],
        amount2025: 0,
        count2025: 0,
        amount2026: 0,
        count2026: 0,
      };
    }

    validRecords.forEach(r => {
      const { year: yr, monthIdx: mIdx } = getRecordActionDateInfo(r);

      if (yr === 2025) {
        monthsMap[mIdx].amount2025 += r.amount;
        monthsMap[mIdx].count2025 += 1;
      } else if (yr === 2026) {
        monthsMap[mIdx].amount2026 += r.amount;
        monthsMap[mIdx].count2026 += 1;
      }
    });

    return Object.values(monthsMap);
  }, [validRecords]);

  // Company Comparison Data based on Action Date
  const companyData = useMemo(() => {
    return availableCompanies.map(comp => {
      let amount2025 = 0;
      let count2025 = 0;
      let amount2026 = 0;
      let count2026 = 0;

      validRecords.forEach(r => {
        if (r.company && r.company.toLowerCase() === comp.toLowerCase()) {
          const { year: yr } = getRecordActionDateInfo(r);
          if (yr === 2025) {
            amount2025 += r.amount;
            count2025 += 1;
          } else if (yr === 2026) {
            amount2026 += r.amount;
            count2026 += 1;
          }
        }
      });

      return {
        company: comp,
        amount2025,
        count2025,
        amount2026,
        count2026,
      };
    });
  }, [validRecords, availableCompanies]);

  const cardBg = isLight 
    ? 'bg-white border-slate-200 text-slate-900 shadow-sm' 
    : 'bg-slate-900/90 border-slate-800 text-slate-100 shadow-lg';

  const subTextColor = isLight ? 'text-slate-500' : 'text-slate-400';
  const activePill = isLight ? 'bg-blue-600 text-white font-bold' : 'bg-blue-600 text-white font-bold';

  const currentChartData = viewMode === 'monthly' ? monthlyData : companyData;
  const xKey = viewMode === 'monthly' ? 'monthName' : 'company';
  const yKey2025 = metric === 'amount' ? 'amount2025' : 'count2025';
  const yKey2026 = metric === 'amount' ? 'amount2026' : 'count2026';

  const resetFilters = () => {
    setTypeFilter('ALL');
    setCompanyFilter('ALL');
  };

  return (
    <div 
      id="chart-yearly-comparison" 
      className={`${cardBg} rounded-2xl ${isFullscreen ? 'p-3 sm:p-4' : 'p-5'} border transition-all relative flex flex-col justify-between`}
    >
      {/* Header & Controls */}
      <div>
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-2.5 ${isFullscreen ? 'mb-2 sm:mb-2.5' : 'mb-4'}`}>
          <div className="flex items-center gap-2">
            <div className="p-1.5 sm:p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                {customTitle || 'Refunds Comparison: 2025 VS 2026'}
              </h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[10px] sm:text-[11px] text-indigo-400 dark:text-indigo-300 font-medium flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 inline-block" />
                  Based on Action Date
                </span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* View Mode Toggle (Monthly / By Company) */}
            <div className={`flex rounded-lg p-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
              <button
                id="btn-yearly-view-monthly"
                onClick={() => setViewMode('monthly')}
                className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-md transition-all ${viewMode === 'monthly' ? activePill : 'text-slate-400'}`}
              >
                Monthly Trend
              </button>
              <button
                id="btn-yearly-view-company"
                onClick={() => setViewMode('company')}
                className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-md transition-all ${viewMode === 'company' ? activePill : 'text-slate-400'}`}
              >
                By Company
              </button>
            </div>

            {/* Metric Toggle (Amount / Count) */}
            <div className={`flex rounded-lg p-0.5 ${isLight ? 'bg-slate-200' : 'bg-slate-800'}`}>
              <button
                id="btn-yearly-metric-amount"
                onClick={() => setMetric('amount')}
                className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${metric === 'amount' ? activePill : 'text-slate-400'}`}
                title="Amount (EGP)"
              >
                <DollarSign className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Amount
              </button>
              <button
                id="btn-yearly-metric-count"
                onClick={() => setMetric('count')}
                className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-md flex items-center gap-1 transition-all ${metric === 'count' ? activePill : 'text-slate-400'}`}
                title="Count (#)"
              >
                <Hash className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                Count
              </button>
            </div>

            {/* Filter Popover Button */}
            <div className="relative" ref={filterRef}>
              <button
                id="btn-yearly-filter-toggle"
                onClick={() => setIsFilterOpen(prev => !prev)}
                className={`text-[11px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg border font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  activeFiltersCount > 0
                    ? 'bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-500/40 shadow-xs'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                }`}
                title="Filter records"
              >
                <Filter className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-blue-500" />
                <span>Filters</span>
                {activeFiltersCount > 0 && (
                  <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-blue-600 text-white text-[9px] sm:text-[10px] flex items-center justify-center font-bold ml-0.5">
                    {activeFiltersCount}
                  </span>
                )}
              </button>

              {/* Filter Dropdown Popover */}
              {isFilterOpen && (
                <div 
                  className={`absolute right-0 mt-2 w-64 p-3.5 rounded-xl shadow-2xl border z-50 animate-fadeIn text-xs ${
                    isLight 
                      ? 'bg-white border-slate-200 text-slate-800 shadow-slate-300/50' 
                      : 'bg-slate-900 border-slate-700 text-slate-100 shadow-black/80'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200 dark:border-slate-800">
                    <span className="font-bold text-xs flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-blue-500" />
                      Filter Comparison
                    </span>
                    {activeFiltersCount > 0 && (
                      <button
                        onClick={resetFilters}
                        className="text-[11px] text-rose-500 hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-2.5 h-2.5" />
                        Reset
                      </button>
                    )}
                  </div>

                  {/* Filter 1: Type */}
                  <div className="mb-3 space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Layers className="w-3 h-3 text-amber-500" />
                      Refund Type
                    </label>
                    <select
                      id="select-yearly-type-filter"
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value as any)}
                      className={`w-full text-xs px-2.5 py-1.5 rounded-lg border outline-none font-medium ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <option value="ALL">All Types</option>
                      <option value="default">Default Only</option>
                      <option value="Request">Request Only</option>
                    </select>
                  </div>

                  {/* Filter 2: Company */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1">
                      <Building2 className="w-3 h-3 text-purple-500" />
                      Company
                    </label>
                    <select
                      id="select-yearly-company-filter"
                      value={companyFilter}
                      onChange={(e) => setCompanyFilter(e.target.value)}
                      className={`w-full text-xs px-2.5 py-1.5 rounded-lg border outline-none font-medium ${
                        isLight ? 'bg-slate-50 border-slate-300 text-slate-800' : 'bg-slate-800 border-slate-700 text-slate-200'
                      }`}
                    >
                      <option value="ALL">All Companies</option>
                      {availableCompanies.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Expand / Fullscreen Button */}
            {!isFullscreen && onExpandChart && (
              <button
                id="btn-yearly-expand"
                onClick={() => onExpandChart('yearly_comparison', customTitle || 'Refunds Comparison: 2025 VS 2026', customDescription)}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isLight 
                    ? 'border-slate-300 hover:bg-slate-100 text-slate-600' 
                    : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                }`}
                title="Expand fullscreen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Top Highlight Summary Strip */}
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 ${isFullscreen ? 'mb-2 sm:mb-2.5' : 'mb-4'}`}>
          {/* 2025 Total Card */}
          <div className={`${isFullscreen ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3'} rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-sky-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-500 inline-block"></span>
                Total 2025
              </span>
              <span className={`text-[10px] sm:text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${isLight ? 'bg-sky-100 text-sky-800' : 'bg-sky-950/70 text-sky-300'}`}>
                #{yearStats.count2025}
              </span>
            </div>
            <div className={`${isFullscreen ? 'text-base sm:text-lg' : 'text-xl'} font-black text-sky-500 mt-0.5 tracking-tight`}>
              {formatEGP(yearStats.amt2025)}
            </div>
            <div className={`text-[9px] sm:text-[10px] font-mono mt-0.5 ${subTextColor}`}>
              {formatEGPFull(yearStats.amt2025)}
            </div>
          </div>

          {/* 2026 Total Card */}
          <div className={`${isFullscreen ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3'} rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-purple-500 flex items-center gap-1">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-purple-500 inline-block"></span>
                Total 2026
              </span>
              <span className={`text-[10px] sm:text-[11px] font-bold font-mono px-1.5 py-0.5 rounded ${isLight ? 'bg-purple-100 text-purple-800' : 'bg-purple-950/70 text-purple-300'}`}>
                #{yearStats.count2026}
              </span>
            </div>
            <div className={`${isFullscreen ? 'text-base sm:text-lg' : 'text-xl'} font-black text-purple-500 mt-0.5 tracking-tight`}>
              {formatEGP(yearStats.amt2026)}
            </div>
            <div className={`text-[9px] sm:text-[10px] font-mono mt-0.5 ${subTextColor}`}>
              {formatEGPFull(yearStats.amt2026)}
            </div>
          </div>

          {/* Variance / Growth Card */}
          <div className={`${isFullscreen ? 'p-2 sm:p-2.5' : 'p-2.5 sm:p-3'} rounded-xl border ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-800/40 border-slate-700/50'}`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] sm:text-xs font-semibold text-slate-400">YoY Change</span>
              <span className={`text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 shadow-xs ${
                (metric === 'amount' ? yearStats.diffAmt : yearStats.diffCount) >= 0 
                  ? 'bg-rose-500/15 text-rose-500 dark:text-rose-400 border-rose-500/30' 
                  : 'bg-emerald-500/15 text-emerald-500 dark:text-emerald-400 border-emerald-500/30'
              }`}>
                {(metric === 'amount' ? yearStats.diffAmt : yearStats.diffCount) >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                <span className="font-mono">{metric === 'amount' ? (yearStats.pctAmt >= 0 ? `+${yearStats.pctAmt.toFixed(1)}%` : `${yearStats.pctAmt.toFixed(1)}%`) : (yearStats.pctCount >= 0 ? `+${yearStats.pctCount.toFixed(1)}%` : `${yearStats.pctCount.toFixed(1)}%`)}</span>
              </span>
            </div>
            <div className={`${isFullscreen ? 'text-base sm:text-lg' : 'text-xl'} font-black mt-1 tracking-tight ${(metric === 'amount' ? yearStats.diffAmt : yearStats.diffCount) >= 0 ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
              {metric === 'amount'
                ? (yearStats.diffAmt >= 0 ? `+${formatEGP(yearStats.diffAmt)}` : `-${formatEGP(Math.abs(yearStats.diffAmt))}`)
                : (yearStats.diffCount >= 0 ? `+${yearStats.diffCount}` : `${yearStats.diffCount}`)}
            </div>
            <div className={`text-[9px] sm:text-[10px] font-mono mt-0.5 ${subTextColor}`}>
              {metric === 'amount' 
                ? `Count: ${yearStats.diffCount >= 0 ? `+${yearStats.diffCount}` : yearStats.diffCount} (${yearStats.pctCount >= 0 ? `+${yearStats.pctCount.toFixed(1)}%` : `${yearStats.pctCount.toFixed(1)}%`})`
                : `Amount: ${yearStats.diffAmt >= 0 ? `+${formatEGP(yearStats.diffAmt)}` : `-${formatEGP(Math.abs(yearStats.diffAmt))}`} (${yearStats.pctAmt >= 0 ? `+${yearStats.pctAmt.toFixed(1)}%` : `${yearStats.pctAmt.toFixed(1)}%`})`
              }
            </div>
          </div>
        </div>

        {/* Grouped Bar Chart */}
        <div style={{ width: '100%', height: isFullscreen ? 360 : 340 }} className="w-full mt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={currentChartData} margin={{ top: 28, right: 15, left: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : '#334155'} opacity={0.6} />
              <XAxis 
                dataKey={xKey} 
                stroke={isLight ? '#64748b' : '#94a3b8'} 
                tick={{ fill: isLight ? '#475569' : '#cbd5e1', fontSize: 11 }}
              />
              <YAxis 
                stroke={isLight ? '#64748b' : '#94a3b8'} 
                tick={{ fill: isLight ? '#475569' : '#cbd5e1', fontSize: 11 }}
                tickFormatter={(val) => metric === 'amount' ? `${(val / 1000000).toFixed(1)}M` : `${val}`}
                domain={[0, (dataMax: number) => Math.ceil(dataMax * 1.22)]}
              />
              <Tooltip 
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    const val2025 = metric === 'amount' ? d.amount2025 : d.count2025;
                    const val2026 = metric === 'amount' ? d.amount2026 : d.count2026;
                    
                    const diffAmt = d.amount2026 - d.amount2025;
                    const pctAmt = d.amount2025 > 0 ? ((d.amount2026 - d.amount2025) / d.amount2025) * 100 : (d.amount2026 > 0 ? 100 : 0);
                    const diffCount = d.count2026 - d.count2025;
                    const pctCount = d.count2025 > 0 ? ((d.count2026 - d.count2025) / d.count2025) * 100 : (d.count2026 > 0 ? 100 : 0);

                    const diffVal = metric === 'amount' ? diffAmt : diffCount;
                    const pctVal = metric === 'amount' ? pctAmt : pctCount;
                    const isPositive = diffVal >= 0;
                    const formattedDiff = metric === 'amount'
                      ? (isPositive ? `+${formatEGP(diffAmt)}` : `-${formatEGP(Math.abs(diffAmt))}`)
                      : (isPositive ? `+${diffCount}` : `${diffCount}`);
                    const formattedPct = isPositive ? `(+${pctVal.toFixed(1)}%)` : `(${pctVal.toFixed(1)}%)`;

                    return (
                      <div className={`p-3 rounded-xl border shadow-xl text-xs font-sans ${
                        isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-slate-900 border-slate-700 text-white'
                      }`}>
                        <div className="font-bold border-b border-slate-200 dark:border-slate-700 pb-1 mb-2">
                          {label}
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                              <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span> 2025:
                            </span>
                            <span className="font-mono font-bold">
                              {metric === 'amount' ? formatEGPFull(val2025) : `#${val2025}`} ({metric === 'amount' ? `#${d.count2025}` : formatEGP(d.amount2025)})
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4">
                            <span className="flex items-center gap-1.5 text-purple-400 font-semibold">
                              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> 2026:
                            </span>
                            <span className="font-mono font-bold">
                              {metric === 'amount' ? formatEGPFull(val2026) : `#${val2026}`} ({metric === 'amount' ? `#${d.count2026}` : formatEGP(d.amount2026)})
                            </span>
                          </div>
                          <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 flex items-center justify-between gap-4 text-[11px]">
                            <span className="text-slate-500 dark:text-slate-400 font-medium">Difference:</span>
                            <span className={`font-mono font-bold ${isPositive ? 'text-rose-500 dark:text-rose-400' : 'text-emerald-500 dark:text-emerald-400'}`}>
                              {formattedDiff} <span className="text-[10px] ml-0.5 font-semibold">{formattedPct}</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend 
                verticalAlign="top" 
                align="right" 
                wrapperStyle={{ paddingBottom: 6, fontSize: 11 }}
                formatter={(value) => <span className={isLight ? 'text-slate-700' : 'text-slate-200'}>{value}</span>}
              />
              <Bar 
                dataKey={yKey2025} 
                name="2025 Refunds" 
                fill="#0ea5e9" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={36}
              >
                <LabelList
                  dataKey={yKey2025}
                  position="top"
                  content={(props: any) => (
                    <CustomBarLabel
                      {...props}
                      year={2025}
                      metric={metric}
                      isLight={isLight}
                      isFullscreen={isFullscreen}
                      data={currentChartData}
                    />
                  )}
                />
              </Bar>
              <Bar 
                dataKey={yKey2026} 
                name="2026 Refunds" 
                fill="#a855f7" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={36}
              >
                <LabelList
                  dataKey={yKey2026}
                  position="top"
                  content={(props: any) => (
                    <CustomBarLabel
                      {...props}
                      year={2026}
                      metric={metric}
                      isLight={isLight}
                      isFullscreen={isFullscreen}
                      data={currentChartData}
                    />
                  )}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
