import React, { useState, useMemo } from 'react';
import { RefundRecord, ManualInputs } from '../../types';
import { 
  calculateCompanyMonthlyMatrix, 
  formatTableAmount, 
  formatTableAmountFull 
} from '../../utils/dataProcessor';
import { 
  Table, 
  Maximize2, 
  Landmark, 
  RotateCcw, 
  Percent, 
  Building2, 
  Layers,
  Filter
} from 'lucide-react';

interface FundsVsRefundsTableProps {
  records: RefundRecord[];
  manualInputs: ManualInputs;
  selectedCompany: string;
  onOpenManualInputs: () => void;
  onExpandChart: (chartId: string, title: string, desc?: string) => void;
  customTitle?: string;
  customDescription?: string;
  isLight?: boolean;
}

export const FundsVsRefundsTable: React.FC<FundsVsRefundsTableProps> = ({
  records,
  manualInputs,
  selectedCompany,
  onOpenManualInputs,
  onExpandChart,
  customTitle,
  isLight = false,
}) => {
  // Available companies on Funds page (Contact removed)
  const availableCompanies = ['ALL', 'Ollin', 'Premium', 'Aman'];

  // Local company & type filter states
  const [currentCompany, setCurrentCompany] = useState<string>(
    availableCompanies.includes(selectedCompany) ? selectedCompany : 'ALL'
  );
  const [matrixType, setMatrixType] = useState<'ALL' | 'default' | 'Request'>('ALL');
  const [viewMode, setViewMode] = useState<'matrix' | 'multiCompany'>('matrix');

  // Keep synced if parent changes selectedCompany
  React.useEffect(() => {
    if (selectedCompany && availableCompanies.includes(selectedCompany)) {
      setCurrentCompany(selectedCompany);
    }
  }, [selectedCompany]);

  // Calculate primary matrix for current company filter using Action Date and matrixType
  const matrixData = useMemo(() => {
    return calculateCompanyMonthlyMatrix(records, manualInputs, currentCompany, matrixType);
  }, [records, manualInputs, currentCompany, matrixType]);

  // Calculate matrices for all companies if multi-company view is active (Contact removed)
  const allCompanyMatrices = useMemo(() => {
    const companies = ['Ollin', 'Premium', 'Aman'];
    return companies.map(comp => ({
      company: comp,
      data: calculateCompanyMonthlyMatrix(records, manualInputs, comp, matrixType),
    }));
  }, [records, manualInputs, matrixType]);

  const title = customTitle ?? 'Company Monthly Funds vs Refunds Matrix';

  const cardBg = isLight ? 'bg-white border-slate-200 shadow-md' : 'bg-slate-900 border-slate-800 shadow-xl';
  const headerText = isLight ? 'text-slate-900' : 'text-white';
  const subText = isLight ? 'text-slate-500' : 'text-slate-400';
  const tableBorder = isLight ? 'border-slate-300' : 'border-slate-700/80';
  const cellBorder = isLight ? 'border-slate-200' : 'border-slate-800';
  const theadBg = isLight ? 'bg-slate-100 text-slate-800 border-b border-slate-300' : 'bg-slate-950 text-slate-200 border-b border-slate-700';
  const stickyColBg = isLight ? 'bg-slate-50 border-r border-slate-300' : 'bg-slate-950 border-r border-slate-700';
  const totalColBg = isLight ? 'bg-blue-50/80 border-l border-blue-200 text-blue-900' : 'bg-blue-950/40 border-l border-blue-800 text-blue-200';

  // Helper for percentage badge styling with clear contrast
  const getPctBadgeStyle = (pct: number) => {
    if (pct === 0) {
      return isLight ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-slate-800 text-slate-400 border-slate-700';
    }
    if (pct > 20) {
      return isLight ? 'bg-rose-100 text-rose-700 border-rose-300 font-black' : 'bg-rose-950/60 text-rose-300 border-rose-700/60 font-black';
    }
    if (pct > 8) {
      return isLight ? 'bg-amber-100 text-amber-800 border-amber-300 font-bold' : 'bg-amber-950/60 text-amber-300 border-amber-700/60 font-bold';
    }
    return isLight ? 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold' : 'bg-emerald-950/60 text-emerald-300 border-emerald-700/60 font-bold';
  };

  // Helper for company filter button active styling
  const getCompanyBtnStyle = (comp: string, isActive: boolean) => {
    if (!isActive) {
      return isLight
        ? 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-xs'
        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700 shadow-xs';
    }
    switch (comp) {
      case 'Ollin':
        return 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/50 font-black';
      case 'Premium':
        return 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-500/30 ring-2 ring-cyan-400/50 font-black';
      case 'Aman':
        return 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/30 ring-2 ring-amber-400/50 font-black';
      default:
        return 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/30 ring-2 ring-blue-400/50 font-black';
    }
  };

  const getCompanyActiveBadge = (comp: string) => {
    switch (comp) {
      case 'Ollin':
        return 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 shadow-xs';
      case 'Premium':
        return 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/40 shadow-xs';
      case 'Aman':
        return 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/40 shadow-xs';
      default:
        return 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/40 shadow-xs';
    }
  };

  return (
    <div id="company-monthly-matrix-container" className={`${cardBg} rounded-2xl p-5 border transition-all relative flex flex-col space-y-4`}>
      {/* Header & Main Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-200 dark:border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shadow-inner shrink-0">
            <Table className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className={`text-base font-bold ${headerText}`}>{title}</h3>
              <span className={`text-[11px] font-black px-3 py-0.5 rounded-full border ${getCompanyActiveBadge(currentCompany)}`}>
                {currentCompany === 'ALL' ? 'All Companies' : currentCompany}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls, Type Filter & View Switcher */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Type Filter Pill Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
            <span className="text-[11px] font-bold text-slate-500 px-1.5 flex items-center gap-1">
              <Filter className="w-3 h-3 text-blue-500" />
              Type:
            </span>
            {(['ALL', 'default', 'Request'] as const).map((typeVal) => {
              const isActive = matrixType === typeVal;
              return (
                <button
                  id={`matrix-type-btn-${typeVal.toLowerCase()}`}
                  key={typeVal}
                  onClick={() => setMatrixType(typeVal)}
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

          {/* View Mode Toggle */}
          <div className="flex p-0.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs">
            <button
              id="view-mode-matrix-btn"
              onClick={() => setViewMode('matrix')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'matrix'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              Consolidated Matrix
            </button>
            <button
              id="view-mode-multicompany-btn"
              onClick={() => setViewMode('multiCompany')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'multiCompany'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              All Companies Grid
            </button>
          </div>

          {/* Expand Fullscreen Button */}
          <button
            id="expand-matrix-btn"
            onClick={() => onExpandChart('funds_vs_refunds_table', 'Company Monthly Funds vs Refunds Matrix')}
            className={`p-2 ${isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100' : 'text-slate-400 hover:text-white hover:bg-slate-800'} rounded-xl transition-colors border border-transparent hover:border-slate-300 dark:hover:border-slate-700`}
            title="View Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Company Filter Tabs Bar */}
      {viewMode === 'matrix' && (
        <div className="flex items-center justify-between gap-3 flex-wrap bg-slate-50 dark:bg-slate-950/70 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 pl-1">
              <Building2 className="w-3.5 h-3.5 text-blue-500" />
              Company:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {availableCompanies.map(comp => {
                const isActive = currentCompany === comp;
                return (
                  <button
                    id={`company-filter-btn-${comp.toLowerCase()}`}
                    key={comp}
                    onClick={() => setCurrentCompany(comp)}
                    className={`px-3.5 py-1.5 text-xs rounded-lg transition-all cursor-pointer border ${getCompanyBtnStyle(comp, isActive)}`}
                  >
                    {comp === 'ALL' ? 'ALL Companies' : comp}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* MATRIX VIEW 1: Clear & High-Contrast 3-Row Matrix */}
      {viewMode === 'matrix' && (
        <div className={`overflow-x-auto border ${tableBorder} rounded-xl shadow-sm bg-slate-950/10`}>
          <table className="w-full text-left text-xs border-collapse">
            {/* Header: Months Columns - Centered */}
            <thead className={`${theadBg} font-bold text-xs uppercase tracking-wider`}>
              <tr>
                <th className={`p-3 sticky left-0 z-20 ${stickyColBg} min-w-[210px] font-extrabold text-left`}>
                  Metric / Row
                </th>
                {matrixData.months.map(m => (
                  <th key={m} className={`p-3 text-center min-w-[105px] font-extrabold border-l ${cellBorder} tracking-wide text-xs`}>
                    {m}
                  </th>
                ))}
                <th className={`p-3 text-center min-w-[130px] font-black ${totalColBg} text-xs tracking-wide`}>
                  Total (YTD)
                </th>
              </tr>
            </thead>

            {/* Matrix Body: 3 Rows */}
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
              {/* ROW 1: Funds Amount */}
              <tr id="row-funds-amount" className={`${isLight ? 'bg-white hover:bg-emerald-50/60' : 'bg-slate-900/90 hover:bg-emerald-950/20'} transition-colors`}>
                <td className={`p-3.5 sticky left-0 z-10 ${stickyColBg} font-sans font-bold text-left`}>
                  <div className="flex items-center gap-2.5 text-emerald-600 dark:text-emerald-400">
                    <span className="p-1 rounded-md bg-emerald-500/10 border border-emerald-500/20">
                      <Landmark className="w-4 h-4" />
                    </span>
                    <span className="text-sm">1. Funds amount</span>
                  </div>
                </td>
                {matrixData.fundsRow.map((val, idx) => (
                  <td 
                    key={`funds-${idx}`} 
                    className={`p-3 text-center font-mono border-l ${cellBorder} text-slate-800 dark:text-slate-100`}
                    title={`${matrixData.months[idx]} Funds: ${formatTableAmountFull(val)}`}
                  >
                    {val > 0 ? (
                      <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">{formatTableAmount(val)}</span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600 font-medium">-</span>
                    )}
                  </td>
                ))}
                {/* Total Funds Column */}
                <td className={`p-3 text-center font-black font-mono text-emerald-600 dark:text-emerald-400 text-sm ${totalColBg}`}>
                  {formatTableAmount(matrixData.totalFunds)}
                </td>
              </tr>

              {/* ROW 2: Refunds Amount */}
              <tr id="row-refunds-amount" className={`${isLight ? 'bg-slate-50/50 hover:bg-amber-50/60' : 'bg-slate-900/60 hover:bg-amber-950/20'} transition-colors`}>
                <td className={`p-3.5 sticky left-0 z-10 ${stickyColBg} font-sans font-bold text-left`}>
                  <div className="flex items-center gap-2.5 text-amber-600 dark:text-amber-400">
                    <span className="p-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                      <RotateCcw className="w-4 h-4" />
                    </span>
                    <span className="text-sm">2. Refunds amount</span>
                  </div>
                </td>
                {matrixData.refundsRow.map((val, idx) => {
                  const count = matrixData.refundCountsRow[idx];
                  return (
                    <td 
                      key={`refunds-${idx}`} 
                      className={`p-3 text-center font-mono font-bold border-l ${cellBorder} text-slate-900 dark:text-white`}
                      title={`${matrixData.months[idx]} Refunds: ${formatTableAmountFull(val)} (# ${count})`}
                    >
                      {val > 0 ? (
                        <div className="flex flex-col items-center justify-center">
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">{formatTableAmount(val)}</span>
                          {count > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 mt-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-300 font-bold font-sans">
                              # {count}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-slate-600 font-medium">-</span>
                      )}
                    </td>
                  );
                })}
                {/* Total Refunds Column */}
                <td className={`p-3 text-center font-bold font-mono text-amber-600 dark:text-amber-400 text-sm ${totalColBg}`}>
                  <div className="flex flex-col items-center justify-center">
                    <span className="font-black text-sm">{formatTableAmount(matrixData.totalRefunds)}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold font-sans mt-0.5">
                      (# {matrixData.totalRefundCount})
                    </span>
                  </div>
                </td>
              </tr>

              {/* ROW 3: Percentage% */}
              <tr id="row-percentage" className={`${isLight ? 'bg-white hover:bg-indigo-50/60' : 'bg-slate-900/90 hover:bg-indigo-950/20'} transition-colors font-bold`}>
                <td className={`p-3.5 sticky left-0 z-10 ${stickyColBg} font-sans font-bold text-left`}>
                  <div className="flex items-center gap-2.5 text-indigo-600 dark:text-indigo-400">
                    <span className="p-1 rounded-md bg-indigo-500/10 border border-indigo-500/20">
                      <Percent className="w-4 h-4" />
                    </span>
                    <span className="text-sm">3. Percentage %</span>
                  </div>
                </td>
                {matrixData.percentageRow.map((pct, idx) => (
                  <td key={`pct-${idx}`} className={`p-3 text-center font-mono border-l ${cellBorder}`}>
                    <span className={`inline-block px-2.5 py-0.5 rounded-md text-xs font-bold border ${getPctBadgeStyle(pct)}`}>
                      {pct > 0 ? `${pct.toFixed(1)}%` : '0.0%'}
                    </span>
                  </td>
                ))}
                {/* Total Percentage Column */}
                <td className={`p-3 text-center font-bold font-mono text-sm ${totalColBg}`}>
                  <span className={`inline-block px-3 py-1 rounded-md text-xs font-black border ${getPctBadgeStyle(matrixData.totalPercentage)}`}>
                    {matrixData.totalPercentage.toFixed(1)}%
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* MATRIX VIEW 2: All Companies Side-by-Side Comparison */}
      {viewMode === 'multiCompany' && (
        <div className="space-y-4">
          <div className={`overflow-x-auto border ${tableBorder} rounded-xl shadow-sm bg-slate-950/10`}>
            <table className="w-full text-left text-xs border-collapse">
              <thead className={`${theadBg} font-bold text-xs uppercase tracking-wider`}>
                <tr>
                  <th className={`p-3 sticky left-0 z-20 ${stickyColBg} min-w-[200px] font-extrabold text-left`}>
                    Company &amp; Metric
                  </th>
                  {matrixData.months.map(m => (
                    <th key={m} className={`p-3 text-center min-w-[100px] font-extrabold border-l ${cellBorder}`}>
                      {m}
                    </th>
                  ))}
                  <th className={`p-3 text-center min-w-[120px] font-black ${totalColBg}`}>
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-mono text-xs">
                {allCompanyMatrices.map(({ company, data }) => (
                  <React.Fragment key={company}>
                    {/* Company Header Row */}
                    <tr className="bg-slate-100 dark:bg-slate-950 font-sans font-extrabold text-slate-800 dark:text-slate-200">
                      <td colSpan={matrixData.months.length + 2} className="p-2.5 pl-3 border-t border-slate-300 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-blue-600 dark:text-blue-400 font-bold">{company}</span>
                          <span className="text-[11px] font-normal text-slate-500 font-mono ml-2">
                            (Total Funds: {formatTableAmount(data.totalFunds)} | Refunds: {formatTableAmount(data.totalRefunds)} | Ratio: {data.totalPercentage.toFixed(1)}%)
                          </span>
                        </div>
                      </td>
                    </tr>

                    {/* 1. Funds Row */}
                    <tr className="hover:bg-slate-800/10 transition-colors">
                      <td className={`p-2.5 pl-6 sticky left-0 z-10 ${stickyColBg} font-sans font-medium text-emerald-600 dark:text-emerald-400 text-xs text-left`}>
                        1. Funds amount
                      </td>
                      {data.fundsRow.map((val, i) => (
                        <td key={i} className={`p-2.5 text-center border-l ${cellBorder} text-slate-700 dark:text-slate-300 text-xs font-bold`}>
                          {val > 0 ? formatTableAmount(val) : '-'}
                        </td>
                      ))}
                      <td className={`p-2.5 text-center font-bold text-emerald-600 dark:text-emerald-400 ${totalColBg} text-xs`}>
                        {formatTableAmount(data.totalFunds)}
                      </td>
                    </tr>

                    {/* 2. Refunds Row */}
                    <tr className="hover:bg-slate-800/10 transition-colors">
                      <td className={`p-2.5 pl-6 sticky left-0 z-10 ${stickyColBg} font-sans font-medium text-amber-600 dark:text-amber-400 text-xs text-left`}>
                        2. Refunds amount
                      </td>
                      {data.refundsRow.map((val, i) => (
                        <td key={i} className={`p-2.5 text-center border-l ${cellBorder} text-slate-900 dark:text-white font-bold text-xs`}>
                          {val > 0 ? formatTableAmount(val) : '-'}
                        </td>
                      ))}
                      <td className={`p-2.5 text-center font-bold text-amber-600 dark:text-amber-400 ${totalColBg} text-xs`}>
                        {formatTableAmount(data.totalRefunds)}
                      </td>
                    </tr>

                    {/* 3. Percentage Row */}
                    <tr className="hover:bg-slate-800/10 transition-colors">
                      <td className={`p-2.5 pl-6 sticky left-0 z-10 ${stickyColBg} font-sans font-bold text-indigo-600 dark:text-indigo-400 text-xs text-left`}>
                        3. Percentage %
                      </td>
                      {data.percentageRow.map((pct, i) => (
                        <td key={i} className={`p-2.5 text-center border-l ${cellBorder} text-xs`}>
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold border ${getPctBadgeStyle(pct)}`}>
                            {pct > 0 ? `${pct.toFixed(1)}%` : '0.0%'}
                          </span>
                        </td>
                      ))}
                      <td className={`p-2.5 text-center font-bold ${totalColBg} text-xs`}>
                        <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold border ${getPctBadgeStyle(data.totalPercentage)}`}>
                          {data.totalPercentage.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
