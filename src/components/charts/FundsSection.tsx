import React, { useMemo, useState } from 'react';
import { RefundRecord, ManualInputs } from '../../types';
import { calculateFundsVsRefundsTable, formatEGP, formatEGPFull } from '../../utils/dataProcessor';
import { Landmark, Maximize2, Wallet, BarChart3, PieChart as PieIcon, TrendingUp, Filter, Building2 } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, PieChart, Pie, Cell, LabelList } from 'recharts';
import { FundsVsRefundsTable } from './FundsVsRefundsTable';

interface FundsSectionProps {
  records: RefundRecord[];
  manualInputs: ManualInputs;
  selectedCompany: string;
  onOpenManualInputs: () => void;
  onExpandChart?: (chartId: string, title: string, desc?: string) => void;
  isLight?: boolean;
  standaloneChartId?: string;
}

const RADIAN = Math.PI / 180;
const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (!percent || percent < 0.04) return null;
  const radius = innerRadius === 0 ? outerRadius * 0.6 : innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      className={`${outerRadius > 110 ? 'text-sm font-black' : 'text-xs font-black'} drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] pointer-events-none`}
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

export const FundsSection: React.FC<FundsSectionProps> = ({
  records,
  manualInputs,
  selectedCompany,
  onOpenManualInputs,
  onExpandChart,
  isLight = false,
  standaloneChartId,
}) => {
  // Available companies for Funds section (strictly excludes Contact: Ollin, Premium, Aman)
  const allowedFundsCompanies = ['Ollin', 'Premium', 'Aman'];

  // Type filter state for Financed vs Refunds comparison chart
  const [chart1Type, setChart1Type] = useState<'ALL' | 'default' | 'Request'>('ALL');

  // Helper to render type filter buttons
  const renderTypeFilter = (
    currentType: 'ALL' | 'default' | 'Request',
    setType: (t: 'ALL' | 'default' | 'Request') => void,
    idPrefix: string
  ) => {
    return (
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
        <span className="text-[11px] font-bold text-slate-500 px-1.5 flex items-center gap-1">
          <Filter className="w-3 h-3 text-blue-500" />
          Type:
        </span>
        {(['ALL', 'default', 'Request'] as const).map((typeVal) => {
          const isActive = currentType === typeVal;
          return (
            <button
              id={`${idPrefix}-type-${typeVal.toLowerCase()}`}
              key={typeVal}
              onClick={() => setType(typeVal)}
              className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/60'
              }`}
            >
              {typeVal === 'ALL' ? 'ALL' : typeVal === 'default' ? 'Default' : 'Request'}
            </button>
          );
        })}
      </div>
    );
  };

  // KPI Cards Data: Strictly excludes Contact (Ollin, Premium, Aman only with status Cancelled + Cheque pending)
  const cardTableData = useMemo(() => {
    const targetComp = allowedFundsCompanies.includes(selectedCompany) ? selectedCompany : 'ALL';
    return calculateFundsVsRefundsTable(records, manualInputs, targetComp, 'ALL', allowedFundsCompanies);
  }, [records, manualInputs, selectedCompany]);

  // Total Summary Metrics for Cards
  const totalFinanced = useMemo(() => cardTableData.reduce((sum, r) => sum + r.financedFunds, 0), [cardTableData]);
  const totalRefundsAmt = useMemo(() => cardTableData.reduce((sum, r) => sum + r.refundsAmount, 0), [cardTableData]);
  const totalRefundsCount = useMemo(() => cardTableData.reduce((sum, r) => sum + r.refundsCount, 0), [cardTableData]);
  const overallPct = totalFinanced > 0 ? (totalRefundsAmt / totalFinanced) * 100 : 0;

  // Contact Refund Card: Strictly for Contact company, Status Cancelled + Cheque pending, excluding Reactive
  const contactRecords = useMemo(() => {
    return records.filter(r => {
      if (r.reactive) return false;
      const comp = (r.company || '').trim().toLowerCase();
      if (comp !== 'contact') return false;
      const s = (r.status || '').trim().toLowerCase();
      return s === 'cancelled' || s === 'cheque pending' || s.includes('cancelled') || s.includes('cheque');
    });
  }, [records]);

  const contactRefundAmount = useMemo(() => contactRecords.reduce((sum, r) => sum + r.amount, 0), [contactRecords]);
  const contactRefundCount = useMemo(() => contactRecords.length, [contactRecords]);

  // Chart 1 Data: Grouped Bar Data for Financed vs Refunded (Filtered by chart1Type)
  const chart1Data = useMemo(() => {
    const targetComp = allowedFundsCompanies.includes(selectedCompany) ? selectedCompany : 'ALL';
    const rows = calculateFundsVsRefundsTable(records, manualInputs, targetComp, chart1Type, allowedFundsCompanies);
    const compMap: Record<string, { company: string; financed: number; refunded: number; count: number }> = {};
    allowedFundsCompanies.forEach(comp => {
      compMap[comp] = { company: comp, financed: 0, refunded: 0, count: 0 };
    });

    rows.forEach(row => {
      if (allowedFundsCompanies.includes(row.company)) {
        if (!compMap[row.company]) {
          compMap[row.company] = { company: row.company, financed: 0, refunded: 0, count: 0 };
        }
        compMap[row.company].financed += row.financedFunds;
        compMap[row.company].refunded += row.refundsAmount;
        compMap[row.company].count += row.refundsCount;
      }
    });
    return Object.values(compMap).map(item => {
      const pct = item.financed > 0 ? (item.refunded / item.financed) * 100 : 0;
      return {
        ...item,
        refundPct: pct,
        refundPctLabel: `${pct.toFixed(1)}%`,
      };
    });
  }, [records, manualInputs, selectedCompany, chart1Type]);

  const COLORS = ['#2563eb', '#ec4899', '#10b981', '#f59e0b', '#8b5cf6'];

  // Chart 2 Data: Financed Funds Distribution by Company
  const chart2Data = useMemo(() => {
    const targetComp = allowedFundsCompanies.includes(selectedCompany) ? selectedCompany : 'ALL';
    const rows = calculateFundsVsRefundsTable(records, manualInputs, targetComp, 'ALL', allowedFundsCompanies);
    const compMap: Record<string, { company: string; financed: number; refunded: number; fill: string; percentage: number }> = {};
    
    allowedFundsCompanies.forEach((comp, idx) => {
      compMap[comp] = { company: comp, financed: 0, refunded: 0, fill: COLORS[idx % COLORS.length], percentage: 0 };
    });

    rows.forEach(row => {
      if (allowedFundsCompanies.includes(row.company)) {
        if (!compMap[row.company]) {
          compMap[row.company] = { 
            company: row.company, 
            financed: 0, 
            refunded: 0, 
            fill: COLORS[Object.keys(compMap).length % COLORS.length],
            percentage: 0
          };
        }
        compMap[row.company].financed += row.financedFunds;
        compMap[row.company].refunded += row.refundsAmount;
      }
    });

    const items = Object.values(compMap).filter(c => c.financed > 0);
    const totalFinancedAllowed = items.reduce((sum, item) => sum + item.financed, 0);

    return items.map(item => ({
      ...item,
      percentage: totalFinancedAllowed > 0 ? (item.financed / totalFinancedAllowed) * 100 : 0
    }));
  }, [records, manualInputs, selectedCompany]);

  const totalFundsInPie = useMemo(() => chart2Data.reduce((sum, item) => sum + item.financed, 0), [chart2Data]);

  const cardBg = isLight ? 'bg-white border-slate-200 shadow-sm text-slate-800' : 'bg-slate-900 border-slate-800 text-white';
  const headerBg = isLight ? 'bg-slate-900 text-white border-slate-800' : 'bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white border-emerald-500/30';
  const subTextColor = isLight ? 'text-slate-500' : 'text-slate-400';

  // Standalone Fullscreen Bar Chart
  if (standaloneChartId === 'funds_vs_refunds_barchart') {
    return (
      <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border shadow-lg w-full h-full flex flex-col justify-between space-y-2 animate-fadeIn`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2.5 border-slate-200 dark:border-slate-800 pr-12">
          <div>
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-500" />
              Financed Funds vs Refunds by Company
            </h3>
          </div>
          {renderTypeFilter(chart1Type, setChart1Type, 'fullscreen-funds-barchart')}
        </div>

        <div className="h-[320px] sm:h-[380px] md:h-[420px] w-full pt-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chart1Data} margin={{ top: 25, right: 25, left: 10, bottom: 5 }}>
              <XAxis dataKey="company" stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={13} tickLine={false} />
              <YAxis stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={11} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{
                  backgroundColor: isLight ? '#ffffff' : '#0f172a',
                  borderColor: isLight ? '#e2e8f0' : '#334155',
                  borderRadius: '12px',
                  color: isLight ? '#0f172a' : '#ffffff',
                  fontSize: '13px',
                }}
                formatter={(value: any, name: any, item: any) => [
                  name === 'financed'
                    ? formatEGPFull(Number(value) || 0)
                    : `${formatEGPFull(Number(value) || 0)} (${(item?.payload?.refundPct || 0).toFixed(1)}%)`,
                  name === 'financed' ? 'Financed Funds' : `Refunds Amount (${chart1Type})`,
                ]}
              />
              <Legend
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => (
                  <span className={`text-xs sm:text-sm font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                    {value === 'financed' ? 'Financed Funds' : `Refunds Amount (${chart1Type})`}
                  </span>
                )}
              />
              <Bar dataKey="financed" name="financed" fill="#10b981" radius={[6, 6, 0, 0]}>
                <LabelList
                  dataKey="financed"
                  position="top"
                  formatter={(val: any) => formatEGP(Number(val) || 0)}
                  style={{
                    fill: isLight ? '#047857' : '#34d399',
                    fontWeight: 'bold',
                    fontSize: 12,
                  }}
                />
              </Bar>
              <Bar dataKey="refunded" name="refunded" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                <LabelList
                  dataKey="refundPctLabel"
                  position="top"
                  style={{
                    fill: isLight ? '#1d4ed8' : '#60a5fa',
                    fontWeight: 'bold',
                    fontSize: 13,
                  }}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Standalone Fullscreen Pie Chart
  if (standaloneChartId === 'funds_distribution_pie') {
    return (
      <div className={`${cardBg} rounded-2xl p-4 sm:p-5 border shadow-lg w-full h-full flex flex-col justify-between space-y-2 animate-fadeIn`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-2.5 border-slate-200 dark:border-slate-800 pr-12">
          <div>
            <h3 className="text-base sm:text-lg font-bold flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-indigo-500" />
              Financed Funds Distribution
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center h-[300px] sm:h-[350px] md:h-[380px] w-full">
          {/* Pie Canvas with Percentage Labels */}
          <div className="lg:col-span-7 h-full relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chart2Data}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={125}
                  paddingAngle={3}
                  dataKey="financed"
                  nameKey="company"
                  labelLine={false}
                  label={renderCustomizedPieLabel}
                >
                  {chart2Data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} stroke={isLight ? '#ffffff' : '#0f172a'} strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isLight ? '#ffffff' : '#0f172a',
                    borderColor: isLight ? '#e2e8f0' : '#334155',
                    borderRadius: '12px',
                    color: isLight ? '#0f172a' : '#ffffff',
                    fontSize: '13px',
                  }}
                  formatter={(val: any, name: any, item: any) => [
                    `${formatEGPFull(Number(val) || 0)} (${item.payload.percentage.toFixed(1)}%)`,
                    `Financed Funds (${name})`,
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Side Companies List with Clear Vivid Background */}
          <div className="lg:col-span-5 flex flex-col justify-center space-y-2">
            <div className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-wider pb-1.5 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
              <span className="flex items-center gap-1.5 font-bold">
                <Building2 className="w-4 h-4 text-indigo-500" />
                Partner Companies
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
              {chart2Data.map((comp) => (
                <div
                  key={comp.company}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl text-white font-bold text-xs shadow-xs transition-transform hover:scale-[1.01]"
                  style={{ backgroundColor: comp.fill }}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-white shrink-0 shadow-xs" />
                    <span className="tracking-wide text-xs font-black">{comp.company}</span>
                  </span>
                  <span className="font-mono text-[11px] bg-black/20 px-1.5 py-0.5 rounded">
                    {comp.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner */}
      <div className={`${headerBg} rounded-2xl p-6 shadow-xl border`}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30 shadow-inner">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl font-extrabold flex items-center gap-2">
                  Funds &amp; Financial Allocations 2026
                </h2>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Financed Funds */}
        <div className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold ${subTextColor} flex items-center gap-1.5`}>
              <Wallet className="w-4 h-4 text-emerald-500" />
              Total Financed Funds
            </span>
          </div>
          <div className="text-2xl font-black text-emerald-500 tracking-tight">
            {formatEGP(totalFinanced)}
          </div>
          <p className={`text-[11px] ${subTextColor} mt-1 font-mono`}>
            {formatEGPFull(totalFinanced)}
          </p>
        </div>

        {/* Card 2: Total Refund Amount */}
        <div className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold ${subTextColor} flex items-center gap-1.5`}>
              <BarChart3 className="w-4 h-4 text-blue-500" />
              Refunds Deducted
            </span>
          </div>
          <div className="text-2xl font-black text-blue-500 tracking-tight">
            {formatEGP(totalRefundsAmt)}
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
            <span className={subTextColor}>{formatEGPFull(totalRefundsAmt)}</span>
            <span className={`font-bold font-sans text-[10px] px-2 py-0.5 rounded ${isLight ? 'bg-blue-50 text-blue-700' : 'bg-blue-950/50 text-blue-300'}`}>
              #{totalRefundsCount}
            </span>
          </div>
        </div>

        {/* Card 3: Refund Share % */}
        <div className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold ${subTextColor} flex items-center gap-1.5`}>
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Refund Share %
            </span>
          </div>
          <div className="text-2xl font-black text-amber-500 tracking-tight">
            {overallPct.toFixed(1)}%
          </div>
          <p className={`text-[11px] ${subTextColor} mt-1`}>
            Percentage of financed funds used
          </p>
        </div>

        {/* Card 4: Contact Refund */}
        <div id="card-contact-refund" className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-bold ${subTextColor} flex items-center gap-1.5`}>
              <Building2 className="w-4 h-4 text-amber-500" />
              Contact Refund
            </span>
          </div>
          <div className="text-2xl font-black text-amber-500 tracking-tight">
            {formatEGP(contactRefundAmount)}
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
            <span className={subTextColor}>{formatEGPFull(contactRefundAmount)}</span>
            <span className={`font-bold font-sans text-[10px] px-2 py-0.5 rounded ${isLight ? 'bg-amber-50 text-amber-700' : 'bg-amber-950/50 text-amber-300'}`}>
              #{contactRefundCount}
            </span>
          </div>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Company Financed vs Refunded Comparison Bar Chart */}
        <div className={`${cardBg} rounded-2xl p-5 border shadow-md flex flex-col justify-between`}>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Financed Funds vs Refunds by Company
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {renderTypeFilter(chart1Type, setChart1Type, 'funds-chart1')}
                {onExpandChart && (
                  <button
                    onClick={() => onExpandChart('funds_vs_refunds_barchart', 'Financed Funds vs Refunds by Company')}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="View Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart1Data} margin={{ top: 22, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="company" stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={11} tickLine={false} />
                  <YAxis stroke={isLight ? '#64748b' : '#94a3b8'} fontSize={10} tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: isLight ? '#ffffff' : '#0f172a',
                      borderColor: isLight ? '#e2e8f0' : '#334155',
                      borderRadius: '12px',
                      color: isLight ? '#0f172a' : '#ffffff',
                      fontSize: '12px',
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      name === 'financed'
                        ? formatEGPFull(Number(value) || 0)
                        : `${formatEGPFull(Number(value) || 0)} (${(item?.payload?.refundPct || 0).toFixed(1)}%)`,
                      name === 'financed' ? 'Financed Funds' : `Refunds Amount (${chart1Type})`,
                    ]}
                  />
                  <Legend
                    formatter={(value) => (
                      <span className={`text-xs font-semibold ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                        {value === 'financed' ? 'Financed Funds' : `Refunds Amount (${chart1Type})`}
                      </span>
                    )}
                  />
                  <Bar dataKey="financed" name="financed" fill="#10b981" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="financed"
                      position="top"
                      formatter={(val: any) => formatEGP(Number(val) || 0)}
                      style={{
                        fill: isLight ? '#047857' : '#34d399',
                        fontWeight: 'bold',
                        fontSize: 10,
                      }}
                    />
                  </Bar>
                  <Bar dataKey="refunded" name="refunded" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                    <LabelList
                      dataKey="refundPctLabel"
                      position="top"
                      style={{
                        fill: isLight ? '#1d4ed8' : '#60a5fa',
                        fontWeight: 'bold',
                        fontSize: 11,
                      }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Chart 2: Financed Funds Share Pie Chart with Percentages & Side Company Badges */}
        <div className={`${cardBg} rounded-2xl p-5 border shadow-md flex flex-col justify-between`}>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <PieIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className={`text-sm font-bold ${isLight ? 'text-slate-900' : 'text-white'}`}>
                    Financed Funds Distribution
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {onExpandChart && (
                  <button
                    onClick={() => onExpandChart('funds_distribution_pie', 'Financed Funds Distribution')}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                    title="View Fullscreen"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              {/* Pie Canvas with Direct Percentage Numbers on Slices */}
              <div className="sm:col-span-7 h-64 w-full relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chart2Data}
                      dataKey="financed"
                      nameKey="company"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={78}
                      paddingAngle={3}
                      labelLine={false}
                      label={renderCustomizedPieLabel}
                    >
                      {chart2Data.map((entry, index) => (
                        <Cell key={`pie-cell-${index}`} fill={entry.fill} stroke={isLight ? '#ffffff' : '#0f172a'} strokeWidth={2} />
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
                      formatter={(value: any, name: any, item: any) => [
                        `${formatEGPFull(Number(value) || 0)} (${item.payload.percentage.toFixed(1)}%)`,
                        `Company: ${name}`,
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Side Companies List with Clear Vivid Background */}
              <div className="sm:col-span-5 flex flex-col justify-center space-y-2.5">
                <div className={`text-[10px] font-bold ${isLight ? 'text-slate-600' : 'text-slate-400'} uppercase tracking-wider pb-1 border-b ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
                  <span>Partner Companies</span>
                </div>
                {chart2Data.map((comp) => (
                  <div
                    key={comp.company}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition-transform hover:scale-[1.02]"
                    style={{ backgroundColor: comp.fill }}
                  >
                    <span className="w-2 h-2 rounded-full bg-white shrink-0 shadow-xs" />
                    <span className="truncate text-xs font-black tracking-wide">{comp.company}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Embedded Full Matrix Table Component */}
      <div className="pt-2">
        <FundsVsRefundsTable
          records={records}
          manualInputs={manualInputs}
          selectedCompany={selectedCompany}
          onOpenManualInputs={onOpenManualInputs}
          onExpandChart={onExpandChart}
          isLight={isLight}
        />
      </div>
    </div>
  );
};
