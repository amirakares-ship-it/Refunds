import React, { useMemo, useState } from 'react';
import { RefundRecord } from '../../types';
import { formatEGP, formatEGPFull, formatTableAmount, formatTableAmountFull } from '../../utils/dataProcessor';
import { Headphones, PhoneCall, PhoneOff, UserCheck, RotateCcw, AlertCircle, Building2, Filter, PieChart as PieChartIcon, FileSpreadsheet, CheckCircle2, XCircle, Maximize2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

interface CSWorkSectionProps {
  records: RefundRecord[];
  onExpandChart?: (chartId: string, title: string, desc?: string) => void;
  isLight?: boolean;
  standaloneChartId?: string;
}

// Helper function to accurately determine if a record is "Reached" from the CS Feedback / Feedback Category / Reachable column
export function isRecordReached(r: RefundRecord): boolean {
  const fb = (r.feedbackCategory || r.csFeedback || '').toLowerCase().trim();
  
  if (fb) {
    const isUnreachable = 
      fb.includes('unreachable') ||
      fb.includes('not reachable') ||
      fb.includes('no answer') ||
      fb.includes('no response') ||
      fb.includes('out of service') ||
      fb.includes('wrong number') ||
      fb.includes('switched off') ||
      fb.includes('closed') ||
      fb.includes('busy') ||
      fb.includes('disconnected') ||
      fb.includes('invalid') ||
      fb.includes('لا يرد') ||
      fb.includes('غير متاح') ||
      fb.includes('لم يتم الوصول') ||
      fb.includes('رقم خاطئ') ||
      fb.includes('لم يتم الرد') ||
      fb.includes('غير موجود') ||
      fb.includes('مغلق');

    if (isUnreachable) return false;
    return true;
  }

  return Boolean(r.reachable);
}

// Helper function to accurately calculate "Willing to pay by CS" based on "Will pay or not" column or feedback
export function isRecordWillingToPay(r: RefundRecord): boolean {
  if (r.willPay && r.willPay.trim() !== '') {
    const val = r.willPay.toLowerCase().trim();
    if (
      val.includes('not') || 
      val.includes('no') || 
      val.includes('غير') || 
      val.includes('cancel') || 
      val.includes('unwilling') || 
      val.includes('رافض') || 
      val.includes('رفض') ||
      val.includes('لا يرغب') ||
      val === '0' ||
      val === 'false'
    ) {
      return false;
    }
    if (
      val.includes('will') || 
      val.includes('pay') || 
      val.includes('yes') || 
      val.includes('true') || 
      val.includes('راغب') || 
      val.includes('دفع') ||
      val === '1' ||
      val === 'y'
    ) {
      return true;
    }
    return !val.includes('not') && !val.includes('no') && !val.includes('غير');
  }

  // Fallback if 'willPay' property is empty: check feedback fields
  const fbCategory = (r.feedbackCategory || '').toLowerCase();
  const csFb = (r.csFeedback || '').toLowerCase();
  const combined = `${fbCategory} ${csFb}`.trim();

  if (
    combined.includes('not willing') || 
    combined.includes('not pay') || 
    combined.includes('غير راغب') || 
    combined.includes('unwilling') ||
    combined.includes('رافض') ||
    combined.includes('رفض') ||
    combined.includes('لا يرغب') ||
    combined.includes('مش هيدفع') ||
    combined.includes('cancel') ||
    combined.includes('إلغاء') ||
    combined.includes('الغاء')
  ) {
    return false;
  }

  return (
    combined.includes('will pay') ||
    combined.includes('willing') ||
    combined.includes('راغب بالدفع') ||
    combined.includes('راغب') ||
    combined.includes('يرغب') ||
    combined.includes('دفع') ||
    (combined.includes('will') && !combined.includes('not')) ||
    (combined.includes('pay') && !combined.includes('not'))
  );
}

// Helper function to calculate "Not willing to pay" based on "Will pay or not" column or feedback
export function isRecordNotWillingToPay(r: RefundRecord): boolean {
  if (r.willPay && r.willPay.trim() !== '') {
    const val = r.willPay.toLowerCase().trim();
    if (
      val.includes('not') || 
      val.includes('no') || 
      val.includes('غير') || 
      val.includes('unwilling') || 
      val.includes('رافض') || 
      val.includes('رفض') || 
      val.includes('لا يرغب') || 
      val === '0' || 
      val === 'false'
    ) {
      return true;
    }
    return false;
  }

  const fbCategory = (r.feedbackCategory || '').toLowerCase();
  const csFb = (r.csFeedback || '').toLowerCase();
  const combined = `${fbCategory} ${csFb}`.trim();

  return (
    combined.includes('not willing') || 
    combined.includes('not pay') || 
    combined.includes('غير راغب') || 
    combined.includes('unwilling') ||
    combined.includes('رافض') ||
    combined.includes('رفض') ||
    combined.includes('لا يرغب') ||
    combined.includes('مش هيدفع')
  );
}

// Helper function to calculate "Cancel Membership" based on "Will pay or not" column or feedback
export function isRecordCancelMembership(r: RefundRecord): boolean {
  const val = (r.willPay || '').toLowerCase().trim();
  if (val) {
    return val.includes('cancel') || val.includes('إلغاء') || val.includes('الغاء');
  }
  const combined = `${r.csFeedback || ''} ${r.feedbackCategory || ''}`.toLowerCase();
  return combined.includes('cancel') || combined.includes('إلغاء') || combined.includes('الغاء');
}

// Helper function to calculate count of "None" / "No" from column reminder from Com. only
export function isRecordReminderNo(r: RefundRecord): boolean {
  // If the reminderFromCom column is missing, undefined, or empty, consider it "Yes" (return false for No/None)
  if (!r.reminderFromCom || r.reminderFromCom.trim() === '') {
    return false;
  }

  const val = r.reminderFromCom.toLowerCase().trim();
  return (
    val === 'none' ||
    val === 'no' ||
    val === 'n' ||
    val === 'false' ||
    val === '0' ||
    val === 'لا' ||
    val === 'بدون' ||
    val.includes('none') ||
    val.includes('no') ||
    val.includes('not') ||
    val.includes('رفض') ||
    val.includes('رافض')
  );
}

export const CSWorkSection: React.FC<CSWorkSectionProps> = ({ records, onExpandChart, isLight = false, standaloneChartId }) => {
  // Base Filter: All CS Work calculations run strictly on "default" type with all statuses
  const defaultRecords = useMemo(() => {
    return records.filter(r => r.type === 'default');
  }, [records]);

  // Styling Variables
  const cardBg = isLight ? 'bg-white border-slate-200 shadow-sm text-slate-800' : 'bg-slate-900 border-slate-800 text-white';
  const cardTitle = isLight ? 'text-slate-900' : 'text-white';
  const subTextColor = isLight ? 'text-slate-500' : 'text-slate-400';
  const tableBorder = isLight ? 'border-slate-200' : 'border-slate-800';
  const theadBg = isLight ? 'bg-slate-100 text-slate-700 border-slate-200' : 'bg-slate-950 text-slate-400 border-slate-800';
  const tbodyBg = isLight ? 'bg-white text-slate-700 divide-slate-200' : 'bg-slate-900 text-slate-300 divide-slate-800/60';
  const innerCardBg = isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800';

  // -------------------------------------------------------------
  // TOP 5 KPI CARDS (OVERALL DEFAULT METRICS)
  // -------------------------------------------------------------
  const totalAmount = useMemo(() => defaultRecords.reduce((s, r) => s + r.amount, 0), [defaultRecords]);
  const totalCount = defaultRecords.length;

  // 2. Reached (From CS Feedback / Feedback Category / Reachable column)
  const reachedRecs = useMemo(() => defaultRecords.filter(isRecordReached), [defaultRecords]);
  const reachedAmount = useMemo(() => reachedRecs.reduce((s, r) => s + r.amount, 0), [reachedRecs]);
  const reachedCount = reachedRecs.length;
  const reachedPctOfAll = totalCount > 0 ? (reachedCount / totalCount) * 100 : 0;

  // 3. Unreachable (From CS Feedback / Feedback Category / Reachable column)
  const unreachableRecs = useMemo(() => defaultRecords.filter(r => !isRecordReached(r)), [defaultRecords]);
  const unreachableAmount = useMemo(() => unreachableRecs.reduce((s, r) => s + r.amount, 0), [unreachableRecs]);
  const unreachableCount = unreachableRecs.length;
  const unreachablePctOfAll = totalCount > 0 ? (unreachableCount / totalCount) * 100 : 0;

  // 4. Retained (From status column) - % from reached
  const retainedRecs = useMemo(() => defaultRecords.filter(r => r.status.toLowerCase().includes('retained')), [defaultRecords]);
  const retainedAmount = useMemo(() => retainedRecs.reduce((s, r) => s + r.amount, 0), [retainedRecs]);
  const retainedCount = retainedRecs.length;
  const retainedPctOfReached = reachedCount > 0 ? (retainedCount / reachedCount) * 100 : 0;

  // 5. Reactive (From reactive column) - % from all
  const reactiveRecs = useMemo(() => defaultRecords.filter(r => r.reactive), [defaultRecords]);
  const reactiveAmount = useMemo(() => reactiveRecs.reduce((s, r) => s + r.amount, 0), [reactiveRecs]);
  const reactiveCount = reactiveRecs.length;
  const reactivePctOfAll = totalCount > 0 ? (reactiveCount / totalCount) * 100 : 0;

  // -------------------------------------------------------------
  // DONUT CHART & COMPANY METRICS TABLE
  // -------------------------------------------------------------
  const companyMetrics = useMemo(() => {
    const knownComps: string[] = ['Ollin', 'Premium', 'Aman', 'Contact'];
    const extraComps: string[] = Array.from(new Set(defaultRecords.map(r => r.company).filter(Boolean) as string[]))
      .filter((c: string) => !knownComps.some(k => k.toLowerCase() === c.toLowerCase()));
    const compList: string[] = [...knownComps, ...extraComps];

    const items = compList.map((comp: string) => {
      const compRecs = defaultRecords.filter(r => (r.company || '').toLowerCase() === comp.toLowerCase());
      const amount = compRecs.reduce((s, r) => s + r.amount, 0);
      const count = compRecs.length;

      const reachRecs = compRecs.filter(isRecordReached);
      const reachCount = reachRecs.length;

      const willingRecs = compRecs.filter(isRecordWillingToPay);

      const willingCount = willingRecs.length;
      const willingPctOfReach = reachCount > 0 ? (willingCount / reachCount) * 100 : 0;

      return {
        company: comp,
        amount,
        count,
        reachCount,
        willingCount,
        willingPctOfReach,
        percentageOfTotal: totalAmount > 0 ? (amount / totalAmount) * 100 : 0,
      };
    });

    const sumAmount = totalAmount;
    const sumReachCount = reachedCount;
    const sumWillingCount = defaultRecords.filter(isRecordWillingToPay).length;
    const totalWillingPctOfReach = sumReachCount > 0 ? (sumWillingCount / sumReachCount) * 100 : 0;

    return {
      items: items.filter(i => i.count > 0 || knownComps.some(k => k.toLowerCase() === (i.company || '').toLowerCase())),
      totalRow: {
        company: 'Total',
        amount: sumAmount,
        reachCount: sumReachCount,
        willingCount: sumWillingCount,
        willingPctOfReach: totalWillingPctOfReach,
      }
    };
  }, [defaultRecords, totalAmount, reachedCount]);

  const companyPieData = useMemo(() => {
    const COLORS: Record<string, string> = {
      Ollin: '#2563eb',
      Premium: '#ec4899',
      Aman: '#10b981',
      Contact: '#f59e0b',
    };

    return companyMetrics.items.map(item => ({
      name: item.company,
      value: item.amount,
      count: item.count,
      percentage: item.percentageOfTotal,
      color: COLORS[item.company] || '#8b5cf6',
    }));
  }, [companyMetrics]);

  // Custom Pie Label to render percentage on the chart slices
  const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }: any) => {
    if (percentage < 3) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const fontSize = outerRadius > 100 ? 15 : 13;

    return (
      <text
        x={x}
        y={y}
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="central"
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: 900,
          filter: 'drop-shadow(0px 1px 3px rgba(0,0,0,0.85))',
        }}
        className="pointer-events-none select-none font-mono"
      >
        {`${percentage.toFixed(1)}%`}
      </text>
    );
  };

  // -------------------------------------------------------------
  // COMPANIES - FEEDBACK SECTION (WITH COMPANY FILTER)
  // -------------------------------------------------------------
  const [fbSelectedCompany, setFbSelectedCompany] = useState<string>('ALL');

  const fbRecords = useMemo(() => {
    if (fbSelectedCompany === 'ALL') return defaultRecords;
    return defaultRecords.filter(r => r.company.toLowerCase() === fbSelectedCompany.toLowerCase());
  }, [defaultRecords, fbSelectedCompany]);

  // The same 5 cards for the filtered company:
  const fbTotalAmount = useMemo(() => fbRecords.reduce((s, r) => s + r.amount, 0), [fbRecords]);
  const fbTotalCount = fbRecords.length;

  const fbReachedRecs = useMemo(() => fbRecords.filter(isRecordReached), [fbRecords]);
  const fbReachedAmount = useMemo(() => fbReachedRecs.reduce((s, r) => s + r.amount, 0), [fbReachedRecs]);
  const fbReachedCount = fbReachedRecs.length;
  const fbReachedPctOfAll = fbTotalCount > 0 ? (fbReachedCount / fbTotalCount) * 100 : 0;

  const fbUnreachableRecs = useMemo(() => fbRecords.filter(r => !isRecordReached(r)), [fbRecords]);
  const fbUnreachableAmount = useMemo(() => fbUnreachableRecs.reduce((s, r) => s + r.amount, 0), [fbUnreachableRecs]);
  const fbUnreachableCount = fbUnreachableRecs.length;
  const fbUnreachablePctOfAll = fbTotalCount > 0 ? (fbUnreachableCount / fbTotalCount) * 100 : 0;

  const fbRetainedRecs = useMemo(() => fbRecords.filter(r => r.status.toLowerCase().includes('retained')), [fbRecords]);
  const fbRetainedAmount = useMemo(() => fbRetainedRecs.reduce((s, r) => s + r.amount, 0), [fbRetainedRecs]);
  const fbRetainedCount = fbRetainedRecs.length;
  const fbRetainedPctOfReached = fbReachedCount > 0 ? (fbRetainedCount / fbReachedCount) * 100 : 0;

  const fbReactiveRecs = useMemo(() => fbRecords.filter(r => r.reactive), [fbRecords]);
  const fbReactiveAmount = useMemo(() => fbReactiveRecs.reduce((s, r) => s + r.amount, 0), [fbRecords]);
  const fbReactiveCount = fbReactiveRecs.length;
  const fbReactivePctOfAll = fbTotalCount > 0 ? (fbReactiveCount / fbTotalCount) * 100 : 0;

  // Rows for Companies - Feedback Table:
  const feedbackTableRows = useMemo(() => {
    const willingRecs = fbRecords.filter(isRecordWillingToPay);
    const notWillingRecs = fbRecords.filter(isRecordNotWillingToPay);
    const cancelledRecs = fbRecords.filter(isRecordCancelMembership);

    const makeRowData = (label: string, recs: RefundRecord[], textColor: string, badgeBg: string) => {
      const count = recs.length;
      const amount = recs.reduce((s, r) => s + r.amount, 0);
      const pct = fbReachedCount > 0 ? (count / fbReachedCount) * 100 : 0;
      return { label, count, amount, pct, textColor, badgeBg };
    };

    // Count of word "No" from column reminder from Com. (without filtering any other column)
    const noCount = fbRecords.filter(isRecordReminderNo).length;
    // Percentage = (Count of "No" from reminder from Com.) / (Count of Reached)
    const noPctFromReminder = fbReachedCount > 0 ? (noCount / fbReachedCount) * 100 : 0;

    return {
      rows: [
        makeRowData('Willing to pay', willingRecs, 'text-emerald-500', 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'),
        makeRowData('Not willing to pay', notWillingRecs, 'text-amber-500', 'bg-amber-500/10 text-amber-500 border-amber-500/20'),
        makeRowData('Cancel Membership', cancelledRecs, 'text-red-500', 'bg-red-500/10 text-red-500 border-red-500/20'),
      ],
      noPctFromReminder,
      noCount,
    };
  }, [fbRecords, fbTotalCount, fbReachedCount, fbReachedRecs]);

  if (standaloneChartId === 'cs_company_donut') {
    return (
      <div className={`${cardBg} rounded-2xl p-6 border shadow-lg w-full h-full flex flex-col justify-center space-y-6 animate-fadeIn`}>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center h-full">
          {/* Donut Chart Canvas */}
          <div className="md:col-span-7 h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={companyPieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={140}
                  paddingAngle={4}
                  dataKey="value"
                  label={renderCustomizedPieLabel}
                  labelLine={false}
                >
                  {companyPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? '#ffffff' : '#0f172a',
                    borderColor: isLight ? '#e2e8f0' : '#334155',
                    borderRadius: '12px',
                    color: isLight ? '#0f172a' : '#ffffff',
                    fontSize: '14px',
                  }}
                  formatter={(val: any, name: any) => [
                    formatEGPFull(Number(val) || 0),
                    name,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Amount & Percentage Display Beside the Chart */}
          <div className="md:col-span-5 space-y-3">
            <h4 className={`text-sm font-black ${subTextColor} uppercase tracking-wider mb-3`}>
              Company Amounts & % Share
            </h4>
            {companyPieData.map(item => (
              <div
                key={item.name}
                className={`p-3.5 rounded-xl border ${innerCardBg} flex items-center justify-between text-sm hover:border-cyan-500/40 transition-all shadow-sm`}
              >
                <div className="flex items-center space-x-3">
                  <span className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: item.color }} />
                  <span className={`font-extrabold ${cardTitle} text-base`}>{item.name}</span>
                </div>
                <div className="text-right">
                  <div className={`text-base font-black font-mono ${cardTitle}`}>{formatEGPFull(item.value)}</div>
                  <div className="flex items-center justify-end gap-2 mt-1">
                    <span className="text-xs font-black px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 shadow-2xs">
                      {item.percentage.toFixed(1)}% Share
                    </span>
                    <span className="text-xs font-bold text-slate-400 font-mono">({item.count} recs)</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (standaloneChartId === 'cs_company_metrics_table') {
    return (
      <div className={`${cardBg} rounded-2xl p-6 border shadow-lg w-full h-full flex flex-col justify-center space-y-4 animate-fadeIn`}>
        <div className={`overflow-x-auto border ${tableBorder} rounded-xl`}>
          <table className="w-full text-left text-sm">
            <thead className={`${theadBg} font-bold border-b text-xs uppercase tracking-wider`}>
              <tr>
                <th className="p-3.5">Company</th>
                <th className="p-3.5 text-right">Amount</th>
                <th className="p-3.5 text-center"># Reach</th>
                <th className="p-3.5 text-center">% Willing to pay from reach</th>
                <th className="p-3.5 text-center"># Willing to pay by CS</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tbodyBg} font-mono text-sm`}>
              {companyMetrics.items.map(row => (
                <tr key={row.company} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}>
                  <td className={`p-3.5 font-sans font-bold ${cardTitle} text-base`}>{row.company}</td>
                  <td className="p-3.5 text-right font-bold text-blue-500 text-base">{formatTableAmountFull(row.amount)}</td>
                  <td className="p-3.5 text-center font-bold text-base">{row.reachCount}</td>
                  <td className="p-3.5 text-center font-sans">
                    <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-xs">
                      {row.willingPctOfReach.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-3.5 text-center font-bold text-emerald-500 text-base">{row.willingCount}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className={`${isLight ? 'bg-slate-900 text-white' : 'bg-slate-950 text-white'} font-bold text-sm border-t`}>
              <tr>
                <td className="p-3.5 font-sans font-black text-amber-400 text-base">Total</td>
                <td className="p-3.5 text-right font-mono text-amber-400 font-black text-base">{formatTableAmountFull(companyMetrics.totalRow.amount)}</td>
                <td className="p-3.5 text-center font-mono text-base">{companyMetrics.totalRow.reachCount}</td>
                <td className="p-3.5 text-center font-sans font-bold text-emerald-400 text-base">
                  {companyMetrics.totalRow.willingPctOfReach.toFixed(1)}%
                </td>
                <td className="p-3.5 text-center font-mono text-emerald-400 font-black text-base">{companyMetrics.totalRow.willingCount}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    );
  }

  if (standaloneChartId === 'cs_company_feedback_full') {
    return (
      <div className={`${cardBg} rounded-2xl p-6 border shadow-lg w-full h-full flex flex-col justify-start space-y-6 animate-fadeIn overflow-y-auto`}>
        {/* Company Filter Row */}
        <div className="flex items-center justify-end">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-amber-400" />
            <span className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>Filter Company:</span>
            <select
              value={fbSelectedCompany}
              onChange={(e) => setFbSelectedCompany(e.target.value)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                isLight
                  ? 'bg-slate-100 text-slate-900 border-slate-300 focus:border-amber-500'
                  : 'bg-slate-950 text-white border-slate-700 focus:border-amber-500'
              }`}
            >
              <option value="ALL">All Companies</option>
              <option value="Ollin">Ollin</option>
              <option value="Premium">Premium</option>
              <option value="Aman">Aman</option>
              <option value="Contact">Contact</option>
            </select>
          </div>
        </div>

        {/* Selected Company Banner */}
        <div className="flex items-center justify-center bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 px-6 py-3 rounded-xl text-center shadow-sm">
          <div className="flex items-center justify-center space-x-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
            <h4 className="text-base sm:text-lg font-black text-amber-400 tracking-wider uppercase">
              {fbSelectedCompany === 'ALL' ? 'All Companies' : fbSelectedCompany} – Feedback
            </h4>
          </div>
        </div>

        {/* The 5 Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className={`p-4 rounded-xl border ${innerCardBg} flex flex-col justify-between space-y-2`}>
            <div className={`flex items-center justify-between text-base font-extrabold ${cardTitle}`}>
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                Total Requested
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-black text-blue-500">{formatEGP(fbTotalAmount)}</div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                100%
              </span>
            </div>
            <div className={`pt-2 border-t ${tableBorder} flex items-center justify-between`}>
              <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
              <span className={`text-xs font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2 py-0.5 rounded-lg border shadow-xs`}>
                {fbTotalCount} <span className="text-[10px] font-semibold text-slate-400">Memberships</span>
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${innerCardBg} flex flex-col justify-between space-y-2`}>
            <div className={`flex items-center justify-between text-base font-extrabold ${cardTitle}`}>
              <span className="flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-cyan-400" />
                Reached
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-black text-cyan-400">{formatEGP(fbReachedAmount)}</div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {fbReachedPctOfAll.toFixed(1)}%
              </span>
            </div>
            <div className={`pt-2 border-t ${tableBorder} flex items-center justify-between`}>
              <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
              <span className={`text-xs font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2 py-0.5 rounded-lg border shadow-xs`}>
                {fbReachedCount} <span className="text-[10px] font-semibold text-slate-400">Memberships</span>
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${innerCardBg} flex flex-col justify-between space-y-2`}>
            <div className={`flex items-center justify-between text-base font-extrabold ${cardTitle}`}>
              <span className="flex items-center gap-1.5">
                <PhoneOff className="w-4 h-4 text-rose-400" />
                Unreachable
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-black text-rose-500">{formatEGP(fbUnreachableAmount)}</div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                {fbUnreachablePctOfAll.toFixed(1)}%
              </span>
            </div>
            <div className={`pt-2 border-t ${tableBorder} flex items-center justify-between`}>
              <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
              <span className={`text-xs font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2 py-0.5 rounded-lg border shadow-xs`}>
                {fbUnreachableCount} <span className="text-[10px] font-semibold text-slate-400">Memberships</span>
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${innerCardBg} flex flex-col justify-between space-y-2`}>
            <div className={`flex items-center justify-between text-base font-extrabold ${cardTitle}`}>
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Retained
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-black text-emerald-500">{formatEGP(fbRetainedAmount)}</div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {fbRetainedPctOfReached.toFixed(1)}%
              </span>
            </div>
            <div className={`pt-2 border-t ${tableBorder} flex items-center justify-between`}>
              <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
              <span className={`text-xs font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2 py-0.5 rounded-lg border shadow-xs`}>
                {fbRetainedCount} <span className="text-[10px] font-semibold text-slate-400">Memberships</span>
              </span>
            </div>
          </div>

          <div className={`p-4 rounded-xl border ${innerCardBg} flex flex-col justify-between space-y-2`}>
            <div className={`flex items-center justify-between text-base font-extrabold ${cardTitle}`}>
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                Reactive
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-black text-amber-500">{formatEGP(fbReactiveAmount)}</div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {fbReactivePctOfAll.toFixed(1)}%
              </span>
            </div>
            <div className={`pt-2 border-t ${tableBorder} flex items-center justify-between`}>
              <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
              <span className={`text-xs font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2 py-0.5 rounded-lg border shadow-xs`}>
                {fbReactiveCount} <span className="text-[10px] font-semibold text-slate-400">Memberships</span>
              </span>
            </div>
          </div>
        </div>

        {/* Feedback Table */}
        <div className={`overflow-x-auto border ${tableBorder} rounded-xl`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`${theadBg} font-bold border-b text-[10px] uppercase tracking-wider`}>
              <tr>
                <th className="p-3">Feedback (Will pay or not)</th>
                <th className="p-3 text-center"># Memberships</th>
                <th className="p-3 text-center">% from Reached</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center w-1/3">Feedback Summary (% No from reminder)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tbodyBg} font-mono text-[11px]`}>
              {feedbackTableRows.rows.map((row, index) => (
                <tr key={row.label} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}>
                  <td className={`p-3 font-sans font-bold ${row.textColor}`}>{row.label}</td>
                  <td className="p-3 text-center font-bold">{row.count}</td>
                  <td className="p-3 text-center font-sans">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${row.badgeBg}`}>
                      {row.pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`p-3 text-right font-bold ${row.textColor}`}>{formatTableAmountFull(row.amount)}</td>

                  {index === 0 && (
                    <td
                      rowSpan={3}
                      className={`p-4 align-middle text-center border-l ${tableBorder} ${
                        isLight ? 'bg-amber-50/50 text-slate-800' : 'bg-slate-950/80 text-white'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center space-y-2 p-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 font-sans">
                          % "None / No" from reminder from Com.
                        </span>
                        <div className="text-3xl font-black text-amber-500 font-mono tracking-tight">
                          {feedbackTableRows.noPctFromReminder.toFixed(1)}%
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans max-w-xs leading-relaxed text-center">
                          Count of "None" from column reminder from Com. ({feedbackTableRows.noCount}) / Count of reached from column Feedback ({fbReachedCount}){fbSelectedCompany !== 'ALL' ? ` (${fbSelectedCompany})` : ''}.
                        </p>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-6 shadow-xl border border-cyan-500/30">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-cyan-500/20 text-cyan-300 flex items-center justify-center border border-cyan-400/30 shadow-inner">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold flex items-center gap-2">
              Customer Service Work Dashboard 2026
            </h2>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: TOP 5 KPI CARDS (OVERALL DEFAULT METRICS)         */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Card 1: Total Amount Requested */}
        <div className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-base font-extrabold ${cardTitle} flex items-center gap-1.5`}>
                <AlertCircle className="w-4 h-4 text-blue-500" />
                Total Requested
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-2 mb-1">
              <div className="text-xl sm:text-2xl font-black text-blue-500 tracking-tight">
                {formatEGP(totalAmount)}
              </div>
              <span className="text-xs sm:text-sm font-extrabold px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-sm">
                100%
              </span>
            </div>
          </div>
          <div className={`mt-2.5 pt-2 border-t ${tableBorder} flex items-center justify-between`}>
            <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
            <span className={`text-sm font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2.5 py-0.5 rounded-lg border shadow-xs`}>
              {totalCount} <span className="text-[11px] font-semibold text-slate-400">Memberships</span>
            </span>
          </div>
        </div>

        {/* Card 2: Reached */}
        <div className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-base font-extrabold ${cardTitle} flex items-center gap-1.5`}>
                <PhoneCall className="w-4 h-4 text-cyan-400" />
                Reached
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-2 mb-1">
              <div className="text-xl sm:text-2xl font-black text-cyan-400 tracking-tight">
                {formatEGP(reachedAmount)}
              </div>
              <span className="text-xs sm:text-sm font-extrabold px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-sm">
                {reachedPctOfAll.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className={`mt-2.5 pt-2 border-t ${tableBorder} flex items-center justify-between`}>
            <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
            <span className={`text-sm font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2.5 py-0.5 rounded-lg border shadow-xs`}>
              {reachedCount} <span className="text-[11px] font-semibold text-slate-400">Memberships</span>
            </span>
          </div>
        </div>

        {/* Card 3: Unreachable */}
        <div className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-base font-extrabold ${cardTitle} flex items-center gap-1.5`}>
                <PhoneOff className="w-4 h-4 text-rose-500" />
                Unreachable
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-2 mb-1">
              <div className="text-xl sm:text-2xl font-black text-rose-500 tracking-tight">
                {formatEGP(unreachableAmount)}
              </div>
              <span className="text-xs sm:text-sm font-extrabold px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-sm">
                {unreachablePctOfAll.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className={`mt-2.5 pt-2 border-t ${tableBorder} flex items-center justify-between`}>
            <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
            <span className={`text-sm font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2.5 py-0.5 rounded-lg border shadow-xs`}>
              {unreachableCount} <span className="text-[11px] font-semibold text-slate-400">Memberships</span>
            </span>
          </div>
        </div>

        {/* Card 4: Retained */}
        <div className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-base font-extrabold ${cardTitle} flex items-center gap-1.5`}>
                <UserCheck className="w-4 h-4 text-emerald-500" />
                Retained
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-2 mb-1">
              <div className="text-xl sm:text-2xl font-black text-emerald-500 tracking-tight">
                {formatEGP(retainedAmount)}
              </div>
              <span className="text-xs sm:text-sm font-extrabold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                {retainedPctOfReached.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className={`mt-2.5 pt-2 border-t ${tableBorder} flex items-center justify-between`}>
            <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
            <span className={`text-sm font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2.5 py-0.5 rounded-lg border shadow-xs`}>
              {retainedCount} <span className="text-[11px] font-semibold text-slate-400">Memberships</span>
            </span>
          </div>
        </div>

        {/* Card 5: Reactive */}
        <div className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-base font-extrabold ${cardTitle} flex items-center gap-1.5`}>
                <RotateCcw className="w-4 h-4 text-amber-500" />
                Reactive
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2 mt-2 mb-1">
              <div className="text-xl sm:text-2xl font-black text-amber-500 tracking-tight">
                {formatEGP(reactiveAmount)}
              </div>
              <span className="text-xs sm:text-sm font-extrabold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-sm">
                {reactivePctOfAll.toFixed(1)}%
              </span>
            </div>
          </div>
          <div className={`mt-2.5 pt-2 border-t ${tableBorder} flex items-center justify-between`}>
            <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
            <span className={`text-sm font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2.5 py-0.5 rounded-lg border shadow-xs`}>
              {reactiveCount} <span className="text-[11px] font-semibold text-slate-400">Memberships</span>
            </span>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: DONUT CHART + COMPANY METRICS TABLE                */}
      {/* ------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut Chart with Percentage Slices & Amount List Beside */}
        <div className={`${cardBg} rounded-2xl p-5 border shadow-md flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
                  <PieChartIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${cardTitle}`}>Breakdown per company</h3>
                </div>
              </div>
              {onExpandChart && (
                <button
                  onClick={() => onExpandChart('cs_company_donut', 'Breakdown per company', 'Distribution of requested amounts and percentages per company')}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="View Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Donut Chart Canvas */}
              <div className="md:col-span-6 h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={companyPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={renderCustomizedPieLabel}
                      labelLine={false}
                    >
                      {companyPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0f172a',
                        borderColor: isLight ? '#e2e8f0' : '#334155',
                        borderRadius: '12px',
                        color: isLight ? '#0f172a' : '#ffffff',
                        fontSize: '12px',
                      }}
                      formatter={(val: any, name: any) => [
                        formatEGPFull(Number(val) || 0),
                        name,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Amount & Percentage Display Beside the Chart */}
              <div className="md:col-span-6 space-y-2.5">
                <h4 className={`text-xs font-bold ${subTextColor} uppercase tracking-wider mb-2`}>
                  Company Amounts & %
                </h4>
                {companyPieData.map(item => (
                  <div
                    key={item.name}
                    className={`p-2.5 rounded-xl border ${innerCardBg} flex items-center justify-between text-xs hover:border-cyan-500/30 transition-all`}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs" style={{ backgroundColor: item.color }} />
                      <span className={`font-bold ${cardTitle}`}>{item.name}</span>
                    </div>
                    <div className="text-right">
                      <div className={`text-xs font-black font-mono ${cardTitle}`}>{formatEGPFull(item.value)}</div>
                      <div className="flex items-center justify-end gap-1.5 mt-0.5">
                        <span className="text-[11px] font-extrabold px-1.5 py-0.5 rounded-md bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 shadow-2xs">
                          {item.percentage.toFixed(1)}% Share
                        </span>
                        <span className="text-[10px] font-bold text-slate-400 font-mono">({item.count} recs)</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Table Chart (Company Metrics) */}
        <div className={`${cardBg} rounded-2xl p-5 border shadow-md flex flex-col justify-between`}>
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${cardTitle}`}>Company Reach & Willingness Summary</h3>
                </div>
              </div>
              {onExpandChart && (
                <button
                  onClick={() => onExpandChart('cs_company_metrics_table', 'Company Reach & Willingness Summary')}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                  title="View Fullscreen"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className={`overflow-x-auto border ${tableBorder} rounded-xl`}>
              <table className="w-full text-left text-xs">
                <thead className={`${theadBg} font-bold border-b text-[10px] uppercase tracking-wider`}>
                  <tr>
                    <th className="p-2.5">Company</th>
                    <th className="p-2.5 text-right">Amount</th>
                    <th className="p-2.5 text-center"># Reach</th>
                    <th className="p-2.5 text-center">% Willing to pay from reach</th>
                    <th className="p-2.5 text-center"># Willing to pay by CS</th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${tbodyBg} font-mono text-[11px]`}>
                  {companyMetrics.items.map(row => (
                    <tr key={row.company} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}>
                      <td className={`p-2.5 font-sans font-bold ${cardTitle}`}>{row.company}</td>
                      <td className="p-2.5 text-right font-bold text-blue-500">{formatTableAmountFull(row.amount)}</td>
                      <td className="p-2.5 text-center font-bold">{row.reachCount}</td>
                      <td className="p-2.5 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-500 font-bold text-[10px]">
                          {row.willingPctOfReach.toFixed(1)}%
                        </span>
                      </td>
                      <td className="p-2.5 text-center font-bold text-emerald-500">{row.willingCount}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className={`${isLight ? 'bg-slate-900 text-white' : 'bg-slate-950 text-white'} font-bold text-xs border-t`}>
                  <tr>
                    <td className="p-2.5 font-sans font-black text-amber-400">Total</td>
                    <td className="p-2.5 text-right font-mono text-amber-400 font-black">{formatTableAmountFull(companyMetrics.totalRow.amount)}</td>
                    <td className="p-2.5 text-center font-mono">{companyMetrics.totalRow.reachCount}</td>
                    <td className="p-2.5 text-center font-sans font-bold text-emerald-400">
                      {companyMetrics.totalRow.willingPctOfReach.toFixed(1)}%
                    </td>
                    <td className="p-2.5 text-center font-mono text-emerald-400 font-black">{companyMetrics.totalRow.willingCount}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SECTION 3: COMPANIES – FEEDBACK (TITLE, FILTER, 5 CARDS & TABLE)*/}
      {/* ------------------------------------------------------------- */}
      <div className={`${cardBg} rounded-2xl p-6 border shadow-lg space-y-6`}>
        {/* Title & Company Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-800/60">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold flex items-center gap-2">
                Companies – Feedback
              </h3>
              <p className="text-xs text-slate-400">Detailed feedback breakdown and willing to pay analysis per company</p>
            </div>
          </div>

          {/* Company Filter Dropdown & Fullscreen Button */}
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <Filter className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-300">Filter Company:</span>
              <select
                value={fbSelectedCompany}
                onChange={(e) => setFbSelectedCompany(e.target.value)}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-100 text-slate-900 border-slate-300 focus:border-amber-500'
                    : 'bg-slate-950 text-white border-slate-700 focus:border-amber-500'
                }`}
              >
                <option value="ALL">All Companies</option>
                <option value="Ollin">Ollin</option>
                <option value="Premium">Premium</option>
                <option value="Aman">Aman</option>
                <option value="Contact">Contact</option>
              </select>
            </div>
            {onExpandChart && (
              <button
                onClick={() => onExpandChart('cs_company_feedback_full', 'Companies – Feedback Breakdown', 'Detailed feedback breakdown and willing to pay analysis per company')}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl border border-slate-700/60 transition-colors cursor-pointer"
                title="View Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Selected Company Banner before 5 Cards */}
        <div className="flex items-center justify-center bg-gradient-to-r from-amber-500/10 via-amber-500/20 to-amber-500/10 border border-amber-500/30 px-6 py-3 rounded-xl text-center shadow-sm">
          <div className="flex items-center justify-center space-x-2.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 animate-pulse shadow-sm shadow-amber-400/50" />
            <h4 className="text-base sm:text-lg font-black text-amber-400 tracking-wider uppercase">
              {fbSelectedCompany === 'ALL' ? 'All Companies' : fbSelectedCompany} – Feedback
            </h4>
          </div>
        </div>

        {/* The Same 5 Cards (Filtered by Selected Company) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Card 1: Total Amount Requested */}
          <div className={`p-4 rounded-xl border ${innerCardBg} flex flex-col justify-between space-y-2`}>
            <div className={`flex items-center justify-between text-base font-extrabold ${cardTitle}`}>
              <span className="flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-blue-400" />
                Total Requested
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-black text-blue-500">{formatEGP(fbTotalAmount)}</div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30">
                100%
              </span>
            </div>
            <div className={`pt-2 border-t ${tableBorder} flex items-center justify-between`}>
              <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
              <span className={`text-xs font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2 py-0.5 rounded-lg border shadow-xs`}>
                {fbTotalCount} <span className="text-[10px] font-semibold text-slate-400">Memberships</span>
              </span>
            </div>
          </div>

          {/* Card 2: Reached */}
          <div className={`p-4 rounded-xl border ${innerCardBg} flex flex-col justify-between space-y-2`}>
            <div className={`flex items-center justify-between text-base font-extrabold ${cardTitle}`}>
              <span className="flex items-center gap-1.5">
                <PhoneCall className="w-4 h-4 text-cyan-400" />
                Reached
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-black text-cyan-400">{formatEGP(fbReachedAmount)}</div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
                {fbReachedPctOfAll.toFixed(1)}%
              </span>
            </div>
            <div className={`pt-2 border-t ${tableBorder} flex items-center justify-between`}>
              <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
              <span className={`text-xs font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2 py-0.5 rounded-lg border shadow-xs`}>
                {fbReachedCount} <span className="text-[10px] font-semibold text-slate-400">Memberships</span>
              </span>
            </div>
          </div>

          {/* Card 3: Unreachable */}
          <div className={`p-4 rounded-xl border ${innerCardBg} flex flex-col justify-between space-y-2`}>
            <div className={`flex items-center justify-between text-base font-extrabold ${cardTitle}`}>
              <span className="flex items-center gap-1.5">
                <PhoneOff className="w-4 h-4 text-rose-400" />
                Unreachable
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-black text-rose-500">{formatEGP(fbUnreachableAmount)}</div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30">
                {fbUnreachablePctOfAll.toFixed(1)}%
              </span>
            </div>
            <div className={`pt-2 border-t ${tableBorder} flex items-center justify-between`}>
              <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
              <span className={`text-xs font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2 py-0.5 rounded-lg border shadow-xs`}>
                {fbUnreachableCount} <span className="text-[10px] font-semibold text-slate-400">Memberships</span>
              </span>
            </div>
          </div>

          {/* Card 4: Retained */}
          <div className={`p-4 rounded-xl border ${innerCardBg} flex flex-col justify-between space-y-2`}>
            <div className={`flex items-center justify-between text-base font-extrabold ${cardTitle}`}>
              <span className="flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Retained
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-black text-emerald-500">{formatEGP(fbRetainedAmount)}</div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                {fbRetainedPctOfReached.toFixed(1)}%
              </span>
            </div>
            <div className={`pt-2 border-t ${tableBorder} flex items-center justify-between`}>
              <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
              <span className={`text-xs font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2 py-0.5 rounded-lg border shadow-xs`}>
                {fbRetainedCount} <span className="text-[10px] font-semibold text-slate-400">Memberships</span>
              </span>
            </div>
          </div>

          {/* Card 5: Reactive */}
          <div className={`p-4 rounded-xl border ${innerCardBg} flex flex-col justify-between space-y-2`}>
            <div className={`flex items-center justify-between text-base font-extrabold ${cardTitle}`}>
              <span className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-amber-400" />
                Reactive
              </span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <div className="text-lg font-black text-amber-500">{formatEGP(fbReactiveAmount)}</div>
              <span className="text-xs font-extrabold px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                {fbReactivePctOfAll.toFixed(1)}%
              </span>
            </div>
            <div className={`pt-2 border-t ${tableBorder} flex items-center justify-between`}>
              <span className={`text-xs font-bold ${subTextColor}`}>Count:</span>
              <span className={`text-xs font-black font-mono ${isLight ? 'text-slate-900 bg-slate-100 border-slate-200' : 'text-white bg-slate-800/60 border-slate-700/60'} px-2 py-0.5 rounded-lg border shadow-xs`}>
                {fbReactiveCount} <span className="text-[10px] font-semibold text-slate-400">Memberships</span>
              </span>
            </div>
          </div>
        </div>

        {/* Companies - Feedback Table */}
        <div className={`overflow-x-auto border ${tableBorder} rounded-xl`}>
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`${theadBg} font-bold border-b text-[10px] uppercase tracking-wider`}>
              <tr>
                <th className="p-3">Feedback (Will pay or not)</th>
                <th className="p-3 text-center"># Memberships</th>
                <th className="p-3 text-center">% from Reached</th>
                <th className="p-3 text-right">Amount</th>
                <th className="p-3 text-center w-1/3">Feedback Summary (% No from reminder)</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${tbodyBg} font-mono text-[11px]`}>
              {feedbackTableRows.rows.map((row, index) => (
                <tr key={row.label} className={isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/50'}>
                  <td className={`p-3 font-sans font-bold ${row.textColor}`}>{row.label}</td>
                  <td className="p-3 text-center font-bold">{row.count}</td>
                  <td className="p-3 text-center font-sans">
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${row.badgeBg}`}>
                      {row.pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className={`p-3 text-right font-bold ${row.textColor}`}>{formatTableAmountFull(row.amount)}</td>

                  {/* Merged cell spanning all rows for Feedback Summary */}
                  {index === 0 && (
                    <td
                      rowSpan={3}
                      className={`p-4 align-middle text-center border-l ${tableBorder} ${
                        isLight ? 'bg-amber-50/50 text-slate-800' : 'bg-slate-950/80 text-white'
                      }`}
                    >
                      <div className="flex flex-col items-center justify-center space-y-2 p-2">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-500 font-sans">
                          % "None / No" from reminder from Com.
                        </span>
                        <div className="text-3xl font-black text-amber-500 font-mono tracking-tight">
                          {feedbackTableRows.noPctFromReminder.toFixed(1)}%
                        </div>
                        <p className="text-[11px] text-slate-400 font-sans max-w-xs leading-relaxed text-center">
                          Count of "None" from <span className="font-semibold text-slate-300">reminder from Com.</span> ({feedbackTableRows.noCount}) / Count of reached from <span className="font-semibold text-slate-300">Feedback</span> ({fbReachedCount}){fbSelectedCompany !== 'ALL' ? ` (${fbSelectedCompany})` : ''}.
                        </p>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
