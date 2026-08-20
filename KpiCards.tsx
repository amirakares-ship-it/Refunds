import React from 'react';
import { KpiSummary, formatEGPFull, formatEGP } from '../utils/dataProcessor';
import { AlertCircle, FileCheck, Layers } from 'lucide-react';
import { KpiCardConfig, DashboardCustomization } from '../types';

interface KpiCardsProps {
  kpis: KpiSummary;
  hasManualOverride?: boolean;
  configs?: Record<string, KpiCardConfig>;
  customization?: DashboardCustomization;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, configs, customization }) => {
  const getCfg = (id: string, defaultTitle: string) => {
    if (!configs || !configs[id]) {
      return { id, title: defaultTitle, visible: true };
    }
    return configs[id];
  };

  const cfgDefault = getCfg('kpi_default', 'Default Refunds');
  const cfgRequest = getCfg('kpi_request', 'Request Refunds');
  const cfgCombined = getCfg('kpi_combined', 'Total Combined Refunds');

  const isLight = customization?.isLightMode || customization?.theme === 'clean-light' || customization?.theme === 'soft-warm';

  // Value font size mapping
  const valueSizeClass = 
    customization?.kpiValueSize === 'sm' ? 'text-xl' :
    customization?.kpiValueSize === 'md' ? 'text-2xl' :
    customization?.kpiValueSize === 'lg' ? 'text-3xl' :
    customization?.kpiValueSize === '3xl' ? 'text-4xl' :
    'text-2xl';

  const cardBg = isLight 
    ? 'bg-white border-slate-200/80 text-slate-800 shadow-xs hover:shadow-md' 
    : 'bg-slate-900 border-slate-800 text-slate-100 shadow-md';
  const subTextColor = isLight ? 'text-slate-500' : 'text-slate-400';
  
  // Custom manual overrides if explicitly provided
  const labelColorStyle = customization?.kpiTitleColor ? { color: customization.kpiTitleColor } : undefined;
  const customValueStyle = customization?.kpiValueColor ? { color: customization.kpiValueColor } : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      
      {/* 1. Combined Refunds Card (Purple Theme) */}
      {cfgCombined.visible && (
        <div id="kpi-combined-card" className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden group`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-500" />
          <div className="flex items-center justify-between mb-2">
            <span 
              className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} flex items-center gap-1.5`}
              style={labelColorStyle}
            >
              <div className={`p-1 rounded-lg ${isLight ? 'bg-purple-100/80 text-purple-600' : 'bg-purple-950/60 text-purple-400'}`}>
                <Layers className="w-3.5 h-3.5" />
              </div>
              {cfgCombined.title}
            </span>
          </div>
          <div 
            className={`${customization?.kpiValueSize ? valueSizeClass : 'text-2xl'} font-black text-purple-600 dark:text-purple-400 tracking-tight`}
            style={customValueStyle}
          >
            {formatEGP(kpis.totalCombinedAmount)}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] font-mono pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
            <span className={subTextColor}>{formatEGPFull(kpis.totalCombinedAmount)}</span>
            <span className={`font-bold font-sans text-[10px] px-2 py-0.5 rounded-full border ${isLight ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-purple-950/50 text-purple-300 border-purple-800/50'}`}>
              # {kpis.totalCombinedCount}
            </span>
          </div>
        </div>
      )}

      {/* 2. Default Refunds Card (Red Theme) */}
      {cfgDefault.visible && (
        <div id="kpi-default-card" className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden group`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-rose-500" />
          <div className="flex items-center justify-between mb-2">
            <span 
              className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} flex items-center gap-1.5`}
              style={labelColorStyle}
            >
              <div className={`p-1 rounded-lg ${isLight ? 'bg-red-100/80 text-red-600' : 'bg-red-950/60 text-red-400'}`}>
                <AlertCircle className="w-3.5 h-3.5" />
              </div>
              {cfgDefault.title}
            </span>
          </div>
          <div 
            className={`${customization?.kpiValueSize ? valueSizeClass : 'text-2xl'} font-black text-red-600 dark:text-red-400 tracking-tight`}
            style={customValueStyle}
          >
            {formatEGP(kpis.defaultAmount)}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] font-mono pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
            <span className={subTextColor}>{formatEGPFull(kpis.defaultAmount)}</span>
            <span className={`font-bold font-sans text-[10px] px-2 py-0.5 rounded-full border ${isLight ? 'bg-red-50 text-red-700 border-red-200' : 'bg-red-950/50 text-red-300 border-red-800/50'}`}>
              # {kpis.defaultCount}
            </span>
          </div>
        </div>
      )}

      {/* 3. Request Refunds Card (Blue Theme) */}
      {cfgRequest.visible && (
        <div id="kpi-request-card" className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden group`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <div className="flex items-center justify-between mb-2">
            <span 
              className={`text-xs font-bold ${isLight ? 'text-slate-700' : 'text-slate-300'} flex items-center gap-1.5`}
              style={labelColorStyle}
            >
              <div className={`p-1 rounded-lg ${isLight ? 'bg-blue-100/80 text-blue-600' : 'bg-blue-950/60 text-blue-400'}`}>
                <FileCheck className="w-3.5 h-3.5" />
              </div>
              {cfgRequest.title}
            </span>
          </div>
          <div 
            className={`${customization?.kpiValueSize ? valueSizeClass : 'text-2xl'} font-black text-blue-600 dark:text-blue-400 tracking-tight`}
            style={customValueStyle}
          >
            {formatEGP(kpis.requestAmount)}
          </div>
          <div className="flex items-center justify-between mt-2 text-[11px] font-mono pt-1.5 border-t border-slate-100 dark:border-slate-800/60">
            <span className={subTextColor}>{formatEGPFull(kpis.requestAmount)}</span>
            <span className={`font-bold font-sans text-[10px] px-2 py-0.5 rounded-full border ${isLight ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-blue-950/50 text-blue-300 border-blue-800/50'}`}>
              # {kpis.requestCount}
            </span>
          </div>
        </div>
      )}

    </div>
  );
};

