import { RefundRecord, DashboardFilters, ManualInputs } from '../types';

export const MONTH_SHORT_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const;

export const MONTH_FULL_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
] as const;

export interface ParsedMonthYear {
  monthIndex: number; // 1 to 12
  monthShort: string; // 'Jan'..'Dec'
  monthFull: string;  // 'January'..'December'
  year?: number;
}

/**
 * Safely extract possible month indices (1 to 12) from any date or month string format.
 */
export function extractPossibleMonthIndices(raw: string | undefined | null): number[] {
  if (!raw) return [];
  const s = String(raw).trim();
  if (!s || s.toUpperCase() === 'ALL') return [];

  const results = new Set<number>();

  // 1. Text Month names (Jan, Feb, January, Jan 2026, 12-Jan-2026, etc.)
  const lower = s.toLowerCase();
  for (let i = 0; i < 12; i++) {
    if (lower.includes(MONTH_SHORT_NAMES[i].toLowerCase()) || lower.includes(MONTH_FULL_NAMES[i].toLowerCase())) {
      results.add(i + 1);
    }
  }
  if (results.size > 0) return Array.from(results);

  // 2. ISO format: YYYY-MM-DD or YYYY-MM or YYYY/MM/DD or YYYY/MM
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})([-/](\d{1,2}))?/);
  if (isoMatch) {
    const m = parseInt(isoMatch[2], 10);
    if (m >= 1 && m <= 12) results.add(m);
    return Array.from(results);
  }

  // 3. Formats with separators: DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, etc.
  const sepMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/);
  if (sepMatch) {
    const p1 = parseInt(sepMatch[1], 10);
    const p2 = parseInt(sepMatch[2], 10);
    if (p1 >= 1 && p1 <= 12 && p2 > 12) {
      // MM/DD/YYYY
      results.add(p1);
    } else if (p2 >= 1 && p2 <= 12 && p1 > 12) {
      // DD/MM/YYYY
      results.add(p2);
    } else {
      // Ambiguous (both <= 12): include both DD/MM and MM/DD so user filter never loses data
      if (p1 >= 1 && p1 <= 12) results.add(p1);
      if (p2 >= 1 && p2 <= 12) results.add(p2);
    }
    return Array.from(results);
  }

  // 4. MM-YYYY or MM/YYYY
  const myMatch = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (myMatch) {
    const m = parseInt(myMatch[1], 10);
    if (m >= 1 && m <= 12) results.add(m);
    return Array.from(results);
  }

  // 5. Excel serial date (e.g. 40000 to 60000)
  const num = parseFloat(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      results.add(d.getUTCMonth() + 1);
      return Array.from(results);
    }
  }

  // 6. Numeric month alone (1..12 or "01".."12")
  if (!isNaN(num) && num >= 1 && num <= 12) {
    results.add(Math.floor(num));
    return Array.from(results);
  }

  return Array.from(results);
}

/**
 * Safely parse any month/date representation into a structured month/year object without timezone shift bugs.
 */
export function parseMonthAndYear(raw: string | undefined | null): ParsedMonthYear | null {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s || s.toUpperCase() === 'ALL') return null;

  // 1. Check text month names
  const lowerS = s.toLowerCase();
  for (let i = 0; i < 12; i++) {
    const shortM = MONTH_SHORT_NAMES[i].toLowerCase();
    const fullM = MONTH_FULL_NAMES[i].toLowerCase();
    if (lowerS.includes(shortM) || lowerS.includes(fullM)) {
      const yrMatch = s.match(/(\d{4})/);
      const yr = yrMatch ? parseInt(yrMatch[1], 10) : undefined;
      return {
        monthIndex: i + 1,
        monthShort: MONTH_SHORT_NAMES[i],
        monthFull: MONTH_FULL_NAMES[i],
        year: yr,
      };
    }
  }

  // 2. ISO format: YYYY-MM or YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    if (m >= 1 && m <= 12) {
      return {
        monthIndex: m,
        monthShort: MONTH_SHORT_NAMES[m - 1],
        monthFull: MONTH_FULL_NAMES[m - 1],
        year: y,
      };
    }
  }

  // 3. Month-Year format: MM-YYYY or MM/YYYY
  const myMatch = s.match(/^(\d{1,2})[-/](\d{4})/);
  if (myMatch) {
    const m = parseInt(myMatch[1], 10);
    const y = parseInt(myMatch[2], 10);
    if (m >= 1 && m <= 12) {
      return {
        monthIndex: m,
        monthShort: MONTH_SHORT_NAMES[m - 1],
        monthFull: MONTH_FULL_NAMES[m - 1],
        year: y,
      };
    }
  }

  // 4. Date format: DD/MM/YYYY or MM/DD/YYYY
  const dmyMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (dmyMatch) {
    const p1 = parseInt(dmyMatch[1], 10);
    const p2 = parseInt(dmyMatch[2], 10);
    const y = parseInt(dmyMatch[3], 10);
    // If p2 > 12 then p1 is month; if p1 > 12 then p2 is month; default to p2 as month in Middle East DD/MM/YYYY
    const m = p1 > 12 ? p2 : (p2 > 12 ? p1 : p2);
    if (m >= 1 && m <= 12) {
      return {
        monthIndex: m,
        monthShort: MONTH_SHORT_NAMES[m - 1],
        monthFull: MONTH_FULL_NAMES[m - 1],
        year: y,
      };
    }
  }

  // 5. Excel serial date
  const num = parseFloat(s);
  if (!isNaN(num) && num > 30000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      const m = d.getUTCMonth() + 1;
      const y = d.getUTCFullYear();
      return {
        monthIndex: m,
        monthShort: MONTH_SHORT_NAMES[m - 1],
        monthFull: MONTH_FULL_NAMES[m - 1],
        year: y,
      };
    }
  }

  // 6. Numeric month alone: "1", "01", "12"
  if (!isNaN(num) && num >= 1 && num <= 12) {
    const m = Math.floor(num);
    return {
      monthIndex: m,
      monthShort: MONTH_SHORT_NAMES[m - 1],
      monthFull: MONTH_FULL_NAMES[m - 1],
    };
  }

  return null;
}

/**
 * Format any raw month/date string into a clean display label e.g. "Jan 2026" or "Jan".
 */
export function formatMonthLabel(raw: string | undefined | null): string {
  if (!raw || raw === 'ALL') return 'All Request Months';
  const parsed = parseMonthAndYear(raw);
  if (!parsed) return String(raw);
  if (parsed.year) {
    return `${parsed.monthShort} ${parsed.year}`;
  }
  return parsed.monthShort;
}

/**
 * Match a record's date or month against the filter selection.
 */
export function matchesMonthFilter(recordMonthOrDate: string | undefined | null, filterMonth: string): boolean {
  if (!filterMonth || filterMonth === 'ALL') return true;
  if (!recordMonthOrDate) return false;

  if (recordMonthOrDate === filterMonth) return true;

  const targetFilterMonths = extractPossibleMonthIndices(filterMonth);
  const recordPossibleMonths = extractPossibleMonthIndices(recordMonthOrDate);

  if (targetFilterMonths.length > 0 && recordPossibleMonths.length > 0) {
    return targetFilterMonths.some(m => recordPossibleMonths.includes(m));
  }

  const rLower = recordMonthOrDate.toLowerCase();
  const fLower = filterMonth.toLowerCase();
  return rLower.includes(fLower) || fLower.includes(rLower);
}

export function filterRecords(records: RefundRecord[], filters: DashboardFilters): RefundRecord[] {
  return records.filter(r => {
    // Company filter
    if (filters.company !== 'ALL' && r.company.toLowerCase() !== filters.company.toLowerCase()) {
      return false;
    }

    // Request Month filter - extracts month from Request Date column or Request Month
    if (filters.requestMonth !== 'ALL') {
      const reqDate = r.requestDate || '';
      const reqMonth = r.requestMonth || '';
      const matchesDate = reqDate ? matchesMonthFilter(reqDate, filters.requestMonth) : false;
      const matchesMonth = reqMonth ? matchesMonthFilter(reqMonth, filters.requestMonth) : false;

      if (!matchesDate && !matchesMonth) {
        return false;
      }
    }

    // Type filter
    if (filters.type !== 'ALL') {
      if (r.type.toLowerCase() !== filters.type.toLowerCase()) {
        return false;
      }
    }

    // Status filter
    if (filters.status !== 'ALL') {
      if (filters.status === 'Cancelled & Cheque pending') {
        const s = r.status.toLowerCase();
        if (s !== 'cancelled' && s !== 'cheque pending') {
          return false;
        }
      } else if (r.status.toLowerCase() !== filters.status.toLowerCase()) {
        return false;
      }
    }

    // Acceptance Year filter
    if (filters.acceptanceYear !== 'ALL') {
      if (String(r.acceptanceYear) !== String(filters.acceptanceYear)) {
        return false;
      }
    }

    return true;
  });
}

// KPI Summaries
export interface KpiSummary {
  defaultCount: number;
  defaultAmount: number;
  requestCount: number;
  requestAmount: number;
  totalCombinedCount: number;
  totalCombinedAmount: number;
  totalCancellationCount: number; // May use manual override
  totalReachableCount: number;
  totalReachableAmount: number;
  totalRetainedCount: number;
  totalRetainedAmount: number;
  totalReactiveCount: number;
  totalReactiveAmount: number;
}

export function calculateKpis(records: RefundRecord[], manualInputs?: ManualInputs): KpiSummary {
  // Cancelled & Cheque pending status records excluding Reactive
  const validRecords = records.filter(r => {
    if (r.reactive) return false;
    const s = r.status.toLowerCase();
    return s === 'cancelled' || s === 'cheque pending';
  });

  const defaultRecords = validRecords.filter(r => r.type === 'default');
  const requestRecords = validRecords.filter(r => r.type === 'Request');

  const defaultCount = defaultRecords.length;
  const defaultAmount = defaultRecords.reduce((sum, r) => sum + r.amount, 0);

  const requestCount = requestRecords.length;
  const requestAmount = requestRecords.reduce((sum, r) => sum + r.amount, 0);

  const totalCombinedCount = validRecords.length;
  const totalCombinedAmount = validRecords.reduce((sum, r) => sum + r.amount, 0);

  // Total Cancellations count across entire dataset (or status === 'Cancelled') excluding Reactive
  const totalCancelledRecords = records.filter(r => !r.reactive && r.status.toLowerCase() === 'cancelled');
  const autoCancellationCount = totalCancelledRecords.length;

  const totalCancellationCount = manualInputs?.manualTotalCancellationCount !== null && manualInputs?.manualTotalCancellationCount !== undefined
    ? manualInputs.manualTotalCancellationCount
    : autoCancellationCount;

  // Reachable, Retained, Reactive metrics
  const reachableRecords = records.filter(r => r.reachable);
  const totalReachableCount = reachableRecords.length;
  const totalReachableAmount = reachableRecords.reduce((sum, r) => sum + r.amount, 0);

  const retainedRecords = records.filter(r => r.status.toLowerCase() === 'retained');
  const totalRetainedCount = retainedRecords.length;
  const totalRetainedAmount = retainedRecords.reduce((sum, r) => sum + r.amount, 0);

  const reactiveRecords = records.filter(r => r.reactive);
  const totalReactiveCount = reactiveRecords.length;
  const totalReactiveAmount = reactiveRecords.reduce((sum, r) => sum + r.amount, 0);

  return {
    defaultCount,
    defaultAmount,
    requestCount,
    requestAmount,
    totalCombinedCount,
    totalCombinedAmount,
    totalCancellationCount,
    totalReachableCount,
    totalReachableAmount,
    totalRetainedCount,
    totalRetainedAmount,
    totalReactiveCount,
    totalReactiveAmount,
  };
}

// Format Currency in EGP
export function formatEGP(amount: number): string {
  if (Math.abs(amount) >= 1000000) {
    return `EGP ${(amount / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1000) {
    return `EGP ${(amount / 1000).toFixed(0)}K`;
  }
  return `EGP ${amount.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function formatEGPFull(amount: number): string {
  return `EGP ${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Format numbers for tables cleanly without "EGP" prefix
export function formatTableAmount(amount: number): string {
  if (amount === 0 || !amount) return '0';
  if (Math.abs(amount) >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export function formatTableAmountFull(amount: number): string {
  if (amount === 0 || !amount) return '0.00';
  return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// 1. Request Donut Chart Data
export function calculateRequestDonut(records: RefundRecord[], manualTotalCancellations?: number) {
  // Cancelled records of type Request excluding Reactive
  const requestCancelled = records.filter(r => !r.reactive && r.type === 'Request' && r.status.toLowerCase() === 'cancelled');
  const requestCount = requestCancelled.length;

  // Total Cancellations count across all types (or manual override) excluding Reactive
  const totalCancelledAll = records.filter(r => !r.reactive && r.status.toLowerCase() === 'cancelled').length;
  const totalCancellations = (manualTotalCancellations !== undefined && manualTotalCancellations !== null)
    ? manualTotalCancellations
    : totalCancelledAll;

  const percentage = totalCancellations > 0 ? (requestCount / totalCancellations) * 100 : 0;
  const otherCount = Math.max(0, totalCancellations - requestCount);

  return {
    requestCount,
    totalCancellations,
    percentage,
    chartData: [
      { name: 'Request Cancellations', value: requestCount, fill: '#3b82f6', percentage },
      { name: 'Other Cancellations', value: otherCount, fill: '#e2e8f0', percentage: 100 - percentage },
    ]
  };
}

// 2. Amount Type Donut Chart Data (Cancelled & Cheque pending, excluding Reactive)
export function calculateTypeAmountDonut(records: RefundRecord[]) {
  const filtered = records.filter(r => {
    if (r.reactive) return false;
    const s = r.status.toLowerCase();
    return s === 'cancelled' || s === 'cheque pending';
  });

  const defaultRecs = filtered.filter(r => r.type === 'default');
  const requestRecs = filtered.filter(r => r.type === 'Request');

  const defaultAmt = defaultRecs.reduce((sum, r) => sum + r.amount, 0);
  const requestAmt = requestRecs.reduce((sum, r) => sum + r.amount, 0);
  const totalAmount = defaultAmt + requestAmt;

  const defaultPct = totalAmount > 0 ? (defaultAmt / totalAmount) * 100 : 0;
  const requestPct = totalAmount > 0 ? (requestAmt / totalAmount) * 100 : 0;

  return {
    totalAmount,
    defaultAmt,
    requestAmt,
    defaultCount: defaultRecs.length,
    requestCount: requestRecs.length,
    defaultPct,
    requestPct,
    chartData: [
      { name: 'Default', value: defaultAmt, count: defaultRecs.length, percentage: defaultPct, fill: '#ef4444' },
      { name: 'Request', value: requestAmt, count: requestRecs.length, percentage: requestPct, fill: '#3b82f6' }
    ]
  };
}

// 3. Default Funnel Data
export function calculateDefaultFunnel(records: RefundRecord[]) {
  const defaultRecords = records.filter(r => r.type === 'default');

  const totalAmount = defaultRecords.reduce((sum, r) => sum + r.amount, 0);
  const totalCount = defaultRecords.length;

  const reachableRecs = defaultRecords.filter(r => r.reachable);
  const reachableAmount = reachableRecs.reduce((sum, r) => sum + r.amount, 0);
  const reachableCount = reachableRecs.length;

  const retainedRecs = reachableRecs.filter(r => r.status.toLowerCase() === 'retained');
  const retainedAmount = retainedRecs.reduce((sum, r) => sum + r.amount, 0);
  const retainedCount = retainedRecs.length;

  const reactiveRecs = defaultRecords.filter(r => r.reactive);
  const reactiveAmount = reactiveRecs.reduce((sum, r) => sum + r.amount, 0);
  const reactiveCount = reactiveRecs.length;

  const reachablePct = totalAmount > 0 ? (reachableAmount / totalAmount) * 100 : 0;
  const retainedPctFromReachable = reachableAmount > 0 ? (retainedAmount / reachableAmount) * 100 : 0;
  const reactivePctFromTotal = totalAmount > 0 ? (reactiveAmount / totalAmount) * 100 : 0;

  return [
    { step: 'Default (All Status)', amount: totalAmount, count: totalCount, percentage: 100, fill: '#6366f1' },
    { step: 'Reachable', amount: reachableAmount, count: reachableCount, percentage: reachablePct, fill: '#06b6d4' },
    { step: 'Retained (from Reachable)', amount: retainedAmount, count: retainedCount, percentage: retainedPctFromReachable, fill: '#10b981' },
    { step: 'Reactive (from Default)', amount: reactiveAmount, count: reactiveCount, percentage: reactivePctFromTotal, fill: '#f59e0b' },
  ];
}

// 4. Company Pie Chart (Excluding Reactive)
export function calculateCompanyPie(records: RefundRecord[]) {
  const companyMap: Record<string, { amount: number; count: number }> = {};
  const validRecords = records.filter(r => {
    if (r.reactive) return false;
    const s = (r.status || '').toLowerCase();
    return s === 'cancelled' || s === 'cheque pending';
  });

  validRecords.forEach(r => {
    const comp = r.company || 'Other';
    if (!companyMap[comp]) companyMap[comp] = { amount: 0, count: 0 };
    companyMap[comp].amount += r.amount;
    companyMap[comp].count += 1;
  });

  const totalAmt = validRecords.reduce((sum, r) => sum + r.amount, 0);

  const COLORS: Record<string, string> = {
    Ollin: '#2563eb',
    Premium: '#ec4899',
    Aman: '#10b981',
    Contact: '#f59e0b',
  };

  return Object.entries(companyMap).map(([comp, data], i) => ({
    name: comp,
    amount: data.amount,
    count: data.count,
    percentage: totalAmt > 0 ? (data.amount / totalAmt) * 100 : 0,
    fill: COLORS[comp] || ['#8b5cf6', '#6366f1', '#14b8a6', '#f43f5e'][i % 4],
  }));
}

// 5. Timeline Chart (Calculated from Action Date, strictly Cancelled & Cheque pending, excluding Reactive)
export function calculateCompanyTimeline(records: RefundRecord[]) {
  const monthMap: Record<string, { monthIndex: number; Ollin: number; Premium: number; Aman: number; Contact: number; Total: number }> = {};
  const validRecords = records.filter(r => {
    if (r.reactive) return false;
    const s = (r.status || '').toLowerCase();
    return s === 'cancelled' || s === 'cheque pending';
  });

  validRecords.forEach(r => {
    // Come from Action Date not request date
    const rawActionDate = r.actionDate || r.cancellationDate || r.requestDate || r.requestMonth || '';
    if (!rawActionDate) return;

    const parsed = parseMonthAndYear(rawActionDate);
    const m = parsed ? parsed.monthShort : formatMonthLabel(rawActionDate);
    const monthIdx = parsed ? parsed.monthIndex : (MONTH_SHORT_NAMES.indexOf(m as any) + 1 || 99);

    if (!monthMap[m]) {
      monthMap[m] = { monthIndex: monthIdx, Ollin: 0, Premium: 0, Aman: 0, Contact: 0, Total: 0 };
    }
    const comp = r.company;
    if (comp === 'Ollin' || comp === 'Premium' || comp === 'Aman' || comp === 'Contact') {
      monthMap[m][comp] += r.amount;
    }
    monthMap[m].Total += r.amount;
  });

  // Sort months chronologically by month index
  const sortedMonths = Object.keys(monthMap).sort((a, b) => {
    const idxA = monthMap[a]?.monthIndex ?? 99;
    const idxB = monthMap[b]?.monthIndex ?? 99;
    return idxA - idxB;
  });

  return sortedMonths.map(m => ({
    month: m,
    Ollin: monthMap[m].Ollin || 0,
    Premium: monthMap[m].Premium || 0,
    Aman: monthMap[m].Aman || 0,
    Contact: monthMap[m].Contact || 0,
    Total: monthMap[m].Total || 0,
  }));
}

// 6. Waterfall Chart (Acceptance Year, strictly Cancelled & Cheque pending, excluding Reactive)
export function calculateAcceptanceYearWaterfall(records: RefundRecord[]) {
  const baseYears = [2021, 2022, 2023, 2024, 2025, 2026];
  const yearMap: Record<number, Record<string, { amount: number; count: number }>> = {};

  // Ensure base years 2021 through 2026 are initialized
  baseYears.forEach(yr => {
    yearMap[yr] = {
      Ollin: { amount: 0, count: 0 },
      Premium: { amount: 0, count: 0 },
      Aman: { amount: 0, count: 0 },
      Contact: { amount: 0, count: 0 },
      Total: { amount: 0, count: 0 },
    };
  });

  const validRecords = records.filter(r => {
    if (r.reactive) return false;
    const s = (r.status || '').toLowerCase();
    return s === 'cancelled' || s === 'cheque pending';
  });

  validRecords.forEach(r => {
    let yr = r.acceptanceYear;
    if (!yr && r.acceptanceDate) {
      const match = r.acceptanceDate.match(/\b(20[1-3][0-9])\b/);
      if (match) yr = parseInt(match[1], 10);
    }
    if (!yr) yr = 2025;

    if (!yearMap[yr]) {
      yearMap[yr] = {
        Ollin: { amount: 0, count: 0 },
        Premium: { amount: 0, count: 0 },
        Aman: { amount: 0, count: 0 },
        Contact: { amount: 0, count: 0 },
        Total: { amount: 0, count: 0 },
      };
    }
    const comp = r.company;
    if (yearMap[yr][comp]) {
      yearMap[yr][comp].amount += r.amount;
      yearMap[yr][comp].count += 1;
    }
    yearMap[yr].Total.amount += r.amount;
    yearMap[yr].Total.count += 1;
  });

  const sortedYears = Object.keys(yearMap).map(Number).sort((a, b) => a - b);
  const grandTotalAmount = validRecords.reduce((sum, r) => sum + r.amount, 0);
  const grandTotalCount = validRecords.length;

  return sortedYears.map(year => {
    const totalAmt = yearMap[year].Total?.amount || 0;
    const totalCnt = yearMap[year].Total?.count || 0;
    const percentage = grandTotalAmount > 0 ? (totalAmt / grandTotalAmount) * 100 : 0;
    const countPercentage = grandTotalCount > 0 ? (totalCnt / grandTotalCount) * 100 : 0;

    return {
      year: String(year),
      OllinAmount: yearMap[year].Ollin?.amount || 0,
      OllinCount: yearMap[year].Ollin?.count || 0,
      PremiumAmount: yearMap[year].Premium?.amount || 0,
      PremiumCount: yearMap[year].Premium?.count || 0,
      AmanAmount: yearMap[year].Aman?.amount || 0,
      AmanCount: yearMap[year].Aman?.count || 0,
      ContactAmount: yearMap[year].Contact?.amount || 0,
      ContactCount: yearMap[year].Contact?.count || 0,
      TotalAmount: totalAmt,
      TotalCount: totalCnt,
      percentage,
      countPercentage,
    };
  });
}

// 7. Funds vs Refunds Table Matrix
export interface FundsVsRefundsRow {
  company: string;
  month: string;
  financedFunds: number;
  refundsAmount: number;
  refundsCount: number;
  refundPercentage: number;
}

export interface CompanyMonthlyMatrixData {
  company: string;
  months: string[];
  fundsRow: number[];
  refundsRow: number[];
  percentageRow: number[];
  refundCountsRow: number[];
  totalFunds: number;
  totalRefunds: number;
  totalRefundCount: number;
  totalPercentage: number;
}

export function calculateFundsVsRefundsTable(
  records: RefundRecord[],
  manualInputs: ManualInputs,
  selectedCompany: string,
  typeFilter: 'ALL' | 'default' | 'Request' = 'ALL',
  customCompanies?: string[]
): FundsVsRefundsRow[] {
  const fullMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Default funds companies (Contact excluded by default from charts)
  const allFundsCompanies = customCompanies && customCompanies.length > 0 ? customCompanies : ['Ollin', 'Premium', 'Aman'];
  const companies = selectedCompany === 'ALL' 
    ? allFundsCompanies 
    : (allFundsCompanies.includes(selectedCompany) ? [selectedCompany] : [selectedCompany]);

  const results: FundsVsRefundsRow[] = [];

  // Filter records strictly for Cancelled & Cheque pending status, non-reactive, and selected Type
  const validRecords = records.filter(r => {
    if (r.reactive) return false;
    const s = (r.status || '').trim().toLowerCase();
    const isCancelledOrCheque = s === 'cancelled' || s === 'cheque pending' || s.includes('cancelled') || s.includes('cheque');
    if (!isCancelledOrCheque) return false;
    if (typeFilter !== 'ALL') {
      return (r.type || '').toLowerCase() === typeFilter.toLowerCase();
    }
    return true;
  });

  // Determine highest month index that contains refund records for Funds companies
  let maxRefundMonthIdx = -1;
  validRecords.forEach(r => {
    if (!allFundsCompanies.some(c => c.toLowerCase() === (r.company || '').trim().toLowerCase())) return;
    const aDate = r.actionDate || r.requestDate || r.requestMonth || '';
    if (!aDate) return;
    const parsed = parseMonthAndYear(aDate);
    if (parsed && parsed.monthIndex >= 1 && parsed.monthIndex <= 12) {
      if (parsed.monthIndex - 1 > maxRefundMonthIdx) {
        maxRefundMonthIdx = parsed.monthIndex - 1;
      }
    }
  });

  const visibleMonthCount = Math.max(1, maxRefundMonthIdx + 1);
  const months = fullMonths.slice(0, visibleMonthCount);

  companies.forEach(company => {
    months.forEach((m, idx) => {
      // Financed funds lookup (supporting both 'Jul' and 'July')
      const financed = manualInputs.financedFunds[company]?.[m] 
        ?? manualInputs.financedFunds[company]?.[m === 'July' ? 'Jul' : 'July'] 
        ?? 0;

      // Find matching refund records for this company and month using Action Date
      const companyRefunds = validRecords.filter(r => {
        if (r.company.toLowerCase() !== company.toLowerCase()) return false;
        
        // Match Action Date (fallback to requestDate or requestMonth if not set)
        const aDate = r.actionDate || r.requestDate || r.requestMonth || '';
        if (!aDate) return false;

        const parsed = parseMonthAndYear(aDate);
        if (!parsed) return false;
        return parsed.monthIndex === idx + 1 || parsed.monthShort.toLowerCase() === m.toLowerCase() || (m === 'July' && parsed.monthShort.toLowerCase() === 'jul');
      });

      const refundsAmount = companyRefunds.reduce((sum, r) => sum + r.amount, 0);
      const refundsCount = companyRefunds.length;
      const refundPercentage = financed > 0 ? (refundsAmount / financed) * 100 : 0;

      results.push({
        company,
        month: m === 'July' ? 'Jul' : m,
        financedFunds: financed,
        refundsAmount,
        refundsCount,
        refundPercentage,
      });
    });
  });

  return results;
}

export function calculateCompanyMonthlyMatrix(
  records: RefundRecord[],
  manualInputs: ManualInputs,
  selectedCompany: string,
  typeFilter: 'ALL' | 'default' | 'Request' = 'ALL'
): CompanyMonthlyMatrixData {
  const fullMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Contact removed from Funds page
  const allFundsCompanies = ['Ollin', 'Premium', 'Aman'];
  const companiesToInclude = selectedCompany === 'ALL' 
    ? allFundsCompanies 
    : (allFundsCompanies.includes(selectedCompany) ? [selectedCompany] : [selectedCompany]);

  // Filter records strictly for Cancelled & Cheque pending status, non-reactive, and selected Type
  const validRecords = records.filter(r => {
    if (r.reactive) return false;
    const s = (r.status || '').trim().toLowerCase();
    const isCancelledOrCheque = s === 'cancelled' || s === 'cheque pending' || s.includes('cancelled') || s.includes('cheque');
    if (!isCancelledOrCheque) return false;
    if (typeFilter !== 'ALL') {
      return (r.type || '').toLowerCase() === typeFilter.toLowerCase();
    }
    return true;
  });

  // Determine highest month index that contains refund records for Funds companies
  let maxRefundMonthIdx = -1;
  validRecords.forEach(r => {
    if (!allFundsCompanies.some(c => c.toLowerCase() === (r.company || '').trim().toLowerCase())) return;
    const aDate = r.actionDate || r.requestDate || r.requestMonth || '';
    if (!aDate) return;
    const parsed = parseMonthAndYear(aDate);
    if (parsed && parsed.monthIndex >= 1 && parsed.monthIndex <= 12) {
      if (parsed.monthIndex - 1 > maxRefundMonthIdx) {
        maxRefundMonthIdx = parsed.monthIndex - 1;
      }
    }
  });

  const visibleMonthCount = Math.max(1, maxRefundMonthIdx + 1);
  const months = fullMonths.slice(0, visibleMonthCount);

  const fundsRow: number[] = [];
  const refundsRow: number[] = [];
  const percentageRow: number[] = [];
  const refundCountsRow: number[] = [];

  months.forEach((m, idx) => {
    // 1. Calculate Funds Amount for this month
    let monthFunds = 0;
    companiesToInclude.forEach(comp => {
      const fundVal = manualInputs.financedFunds[comp]?.[m] 
        ?? manualInputs.financedFunds[comp]?.[m === 'Jul' ? 'July' : 'Jul'] 
        ?? 0;
      monthFunds += fundVal;
    });

    // 2. Calculate Refunds Amount & Count for this month using Action Date
    const matchingRefunds = validRecords.filter(r => {
      if (selectedCompany !== 'ALL') {
        if (r.company.toLowerCase() !== selectedCompany.toLowerCase()) return false;
      } else {
        // If ALL, only include the Funds companies (Ollin, Premium, Aman)
        if (!allFundsCompanies.some(c => c.toLowerCase() === r.company.toLowerCase())) return false;
      }
      const aDate = r.actionDate || r.requestDate || r.requestMonth || '';
      if (!aDate) return false;
      const parsed = parseMonthAndYear(aDate);
      if (!parsed) return false;
      return parsed.monthIndex === idx + 1 || parsed.monthShort.toLowerCase() === m.toLowerCase() || (m === 'Jul' && parsed.monthShort.toLowerCase() === 'july');
    });

    const monthRefunds = matchingRefunds.reduce((sum, r) => sum + r.amount, 0);
    const monthRefundCount = matchingRefunds.length;
    const monthPct = monthFunds > 0 ? (monthRefunds / monthFunds) * 100 : 0;

    fundsRow.push(monthFunds);
    refundsRow.push(monthRefunds);
    percentageRow.push(monthPct);
    refundCountsRow.push(monthRefundCount);
  });

  const totalFunds = fundsRow.reduce((a, b) => a + b, 0);
  const totalRefunds = refundsRow.reduce((a, b) => a + b, 0);
  const totalRefundCount = refundCountsRow.reduce((a, b) => a + b, 0);
  const totalPercentage = totalFunds > 0 ? (totalRefunds / totalFunds) * 100 : 0;

  return {
    company: selectedCompany,
    months,
    fundsRow,
    refundsRow,
    percentageRow,
    refundCountsRow,
    totalFunds,
    totalRefunds,
    totalRefundCount,
    totalPercentage,
  };
}

// 8. Acceptance vs Request Lead Time & Tenure Distribution (Difference in Months only)
export function parseDateSafe(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return isNaN(dateStr.getTime()) ? null : dateStr;
  
  const str = String(dateStr).trim();
  if (!str || str === 'null' || str === 'undefined' || str === 'NaN') return null;

  // 1. ISO format YYYY-MM-DD or YYYY-M-D or YYYY/MM/DD
  const ymdMatch = str.match(/^(\d{4})[-/. ](\d{1,2})[-/. ](\d{1,2})/);
  if (ymdMatch) {
    const y = parseInt(ymdMatch[1], 10);
    const m = parseInt(ymdMatch[2], 10) - 1;
    const d = parseInt(ymdMatch[3], 10);
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }

  // 2. Format DD/MM/YYYY or DD-MM-YYYY or MM/DD/YYYY
  const slashMatch = str.match(/^(\d{1,2})[-/. ](\d{1,2})[-/. ](\d{4})/);
  if (slashMatch) {
    const p1 = parseInt(slashMatch[1], 10);
    const p2 = parseInt(slashMatch[2], 10);
    const y = parseInt(slashMatch[3], 10);
    let m = p2 - 1;
    let d = p1;
    if (p1 <= 12 && p2 > 12) {
      m = p1 - 1;
      d = p2;
    }
    const date = new Date(y, m, d);
    if (!isNaN(date.getTime())) return date;
  }

  // 3. Format YYYY-MM (e.g. 2026-01)
  const ymMatch = str.match(/^(\d{4})[-/. ](\d{1,2})$/);
  if (ymMatch) {
    const y = parseInt(ymMatch[1], 10);
    const m = parseInt(ymMatch[2], 10) - 1;
    const date = new Date(y, m, 1);
    if (!isNaN(date.getTime())) return date;
  }

  // 4. Standard JS Date Parse
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d;

  // 5. Year Match (e.g. 2024 or 2025)
  const yearMatch = str.match(/\b(20\d\d)\b/);
  if (yearMatch) {
    return new Date(parseInt(yearMatch[1], 10), 0, 1);
  }

  return null;
}

/**
 * Calculates the exact difference in months between Acceptance Date and Request Date.
 * Strictly ignores any raw 'Days' column and computes pure calendar duration.
 */
export function getTenureMonths(r: RefundRecord): number {
  const acceptD = parseDateSafe(r.acceptanceDate) || (r.acceptanceYear ? new Date(r.acceptanceYear, 0, 1) : null);
  
  let reqD = parseDateSafe(r.requestDate);
  if (!reqD && r.requestMonth) {
    const parts = r.requestMonth.split(/[-/]/);
    if (parts.length >= 2) {
      reqD = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    }
  }

  if (acceptD && reqD) {
    const yearDiff = reqD.getFullYear() - acceptD.getFullYear();
    const monthDiff = reqD.getMonth() - acceptD.getMonth();
    const dayDiff = reqD.getDate() - acceptD.getDate();

    let totalMonths = (yearDiff * 12) + monthDiff;
    if (dayDiff < 0) {
      const prevMonthDays = new Date(reqD.getFullYear(), reqD.getMonth(), 0).getDate();
      totalMonths += dayDiff / (prevMonthDays || 30);
    } else if (dayDiff > 0) {
      const currMonthDays = new Date(reqD.getFullYear(), reqD.getMonth() + 1, 0).getDate();
      totalMonths += dayDiff / (currMonthDays || 30);
    }

    return Math.max(0, parseFloat(totalMonths.toFixed(2)));
  }

  return 0;
}

export function getTenureDays(r: RefundRecord): number {
  const acceptD = parseDateSafe(r.acceptanceDate) || (r.acceptanceYear ? new Date(r.acceptanceYear, 0, 1) : null);
  let reqD = parseDateSafe(r.requestDate);
  if (!reqD && r.requestMonth) {
    const parts = r.requestMonth.split(/[-/]/);
    if (parts.length >= 2) {
      reqD = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    }
  }
  if (acceptD && reqD) {
    const diffMs = reqD.getTime() - acceptD.getTime();
    return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
  }
  return 0;
}

export const TENURE_CLUSTERS = [
  { id: 'lt_1m', label: '< 1 Month', subLabel: 'أقل من شهر', minMonths: 0, maxMonths: 1 },
  { id: '1_3m', label: '1 - 3 Months', subLabel: 'من شهر لـ 3 شهور', minMonths: 1, maxMonths: 3 },
  { id: '3_6m', label: '3 - 6 Months', subLabel: 'من 3 لـ 6 شهور', minMonths: 3, maxMonths: 6 },
  { id: '6_12m', label: '6 - 12 Months', subLabel: 'من 6 لـ 12 شهر', minMonths: 6, maxMonths: 12 },
  { id: '1y', label: '1 Year', subLabel: 'سنة (12 - 24 شهر)', minMonths: 12, maxMonths: 24 },
  { id: '2y', label: '2 Years', subLabel: 'سنتين (24 - 36 شهر)', minMonths: 24, maxMonths: 36 },
  { id: '3y_plus', label: '3+ Years', subLabel: '3 سنوات فأكثر (≥ 36 شهر)', minMonths: 36, maxMonths: 9999 },
];

export function getClusterIndexForRecord(months: number): number {
  if (months < 1) return 0; // أقل من شهر (< 1 Month)
  if (months < 3) return 1; // من شهر ل 3 (1 - 3 Months)
  if (months < 6) return 2; // من 3-6 (3 - 6 Months)
  if (months < 12) return 3; // من 6 ل 12 (6 - 12 Months)
  if (months < 24) return 4; // سنة (1 Year)
  if (months < 36) return 5; // سنتين (2 Years)
  return 6; // ثلاثة سنوات فأكثر (3+ Years)
}

export interface TenureClusterResult {
  tenure: string;
  subLabel: string;
  minMonths?: number;
  maxMonths?: number;
  Default: number; // for backward compatibility with BarChart
  Request: number; // for backward compatibility with BarChart
  defaultCount: number;
  requestCount: number;
  defaultAmount: number;
  requestAmount: number;
  ollinCount: number;
  premiumCount: number;
  amanCount: number;
  contactCount: number;
  ollinAmount: number;
  premiumAmount: number;
  amanAmount: number;
  contactAmount: number;
  totalCount: number;
  totalAmount: number;
  percentageCount: number;
  percentageAmount: number;
}

export function calculateTenureDistribution(
  records: RefundRecord[],
  companyFilter: string = 'ALL',
  typeFilter: string = 'ALL',
  acceptanceMonthFilter: string = 'ALL'
): { clusters: TenureClusterResult[]; grandTotalCount: number; grandTotalAmount: number } {
  // Apply company, type, non-reactive, and acceptance month filters
  const filtered = records.filter(r => {
    if (r.reactive) return false;
    const s = (r.status || '').toLowerCase();
    const isCancelledOrCheque = s === 'cancelled' || s === 'cheque pending' || s.includes('cancelled') || s.includes('cheque');
    if (!isCancelledOrCheque) return false;

    if (companyFilter !== 'ALL') {
      const comp = (r.company || '').trim().toLowerCase();
      if (comp !== companyFilter.toLowerCase()) return false;
    }
    if (typeFilter !== 'ALL') {
      const t = (r.type || '').trim().toLowerCase();
      if (t !== typeFilter.toLowerCase()) return false;
    }
    if (acceptanceMonthFilter !== 'ALL') {
      const aDate = r.acceptanceDate || '';
      const parsed = parseMonthAndYear(aDate);
      const year = parsed?.year || r.acceptanceYear;
      if (!parsed && !year) return false;

      let monthYearStr = '';
      if (parsed && year) {
        monthYearStr = `${parsed.monthShort} ${year}`;
      } else if (parsed) {
        monthYearStr = parsed.monthShort;
      } else if (year) {
        monthYearStr = `${year}`;
      }

      const cleanFilter = acceptanceMonthFilter.trim().toLowerCase();
      const cleanRecord = monthYearStr.toLowerCase();

      if (cleanRecord !== cleanFilter) {
        if (parsed && year && `${parsed.monthFull} ${year}`.toLowerCase() === cleanFilter) {
          // match full name
        } else if (parsed && parsed.monthShort.toLowerCase() === cleanFilter) {
          // match month alone
        } else {
          return false;
        }
      }
    }
    return true;
  });

  const grandTotalCount = filtered.length;
  const grandTotalAmount = filtered.reduce((acc, r) => acc + (r.amount || 0), 0);

  // Group records by cluster index
  const clusterGroups: RefundRecord[][] = Array.from({ length: TENURE_CLUSTERS.length }, () => []);

  filtered.forEach(r => {
    const months = getTenureMonths(r);
    const cIdx = getClusterIndexForRecord(months);
    clusterGroups[cIdx].push(r);
  });

  const clusters: TenureClusterResult[] = TENURE_CLUSTERS.map((c, idx) => {
    const inCluster = clusterGroups[idx];

    let defCount = 0;
    let reqCount = 0;
    let defAmt = 0;
    let reqAmt = 0;

    let olCount = 0;
    let prCount = 0;
    let amCount = 0;
    let ctCount = 0;

    let olAmt = 0;
    let prAmt = 0;
    let amAmt = 0;
    let ctAmt = 0;

    let clusterTotalAmt = 0;

    inCluster.forEach(r => {
      const amt = r.amount || 0;
      clusterTotalAmt += amt;

      const t = (r.type || '').trim().toLowerCase();
      if (t === 'default') {
        defCount++;
        defAmt += amt;
      } else {
        reqCount++;
        reqAmt += amt;
      }

      const comp = (r.company || '').trim().toLowerCase();
      if (comp.includes('ollin')) {
        olCount++;
        olAmt += amt;
      } else if (comp.includes('premium')) {
        prCount++;
        prAmt += amt;
      } else if (comp.includes('aman')) {
        amCount++;
        amAmt += amt;
      } else if (comp.includes('contact')) {
        ctCount++;
        ctAmt += amt;
      }
    });

    const clusterTotalCount = inCluster.length;
    const percentageCount = grandTotalCount > 0 ? (clusterTotalCount / grandTotalCount) * 100 : 0;
    const percentageAmount = grandTotalAmount > 0 ? (clusterTotalAmt / grandTotalAmount) * 100 : 0;

    return {
      tenure: c.label,
      subLabel: c.subLabel,
      minMonths: c.minMonths,
      maxMonths: c.maxMonths,
      Default: defCount,
      Request: reqCount,
      defaultCount: defCount,
      requestCount: reqCount,
      defaultAmount: defAmt,
      requestAmount: reqAmt,
      ollinCount: olCount,
      premiumCount: prCount,
      amanCount: amCount,
      contactCount: ctCount,
      ollinAmount: olAmt,
      premiumAmount: prAmt,
      amanAmount: amAmt,
      contactAmount: ctAmt,
      totalCount: clusterTotalCount,
      totalAmount: clusterTotalAmt,
      percentageCount,
      percentageAmount,
    };
  });

  return { clusters, grandTotalCount, grandTotalAmount };
}

export function calculateTenureDoubleBar(records: RefundRecord[]) {
  const { clusters } = calculateTenureDistribution(records);
  return clusters;
}
