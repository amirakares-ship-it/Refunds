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

  const cardBg = isLight ? 'bg-white border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-900 border-slate-800 text-slate-100 shadow-md';
  const subTextColor = isLight ? 'text-slate-500' : 'text-slate-400';
  
  // Guard against white / faint text on white background in light mode
  const labelColorStyle = (customization?.kpiTitleColor && (!isLight || (customization.kpiTitleColor !== '#94a3b8' && customization.kpiTitleColor !== '#ffffff'))) 
    ? { color: customization.kpiTitleColor } 
    : undefined;
  
  const valueColorStyle = (customization?.kpiValueColor && (!isLight || (customization.kpiValueColor !== '#ffffff' && customization.kpiValueColor !== '#f8fafc' && customization.kpiValueColor !== '#f1f5f9'))) 
    ? { color: customization.kpiValueColor } 
    : undefined;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      
      {/* 1. Combined Refunds Card */}
      {cfgCombined.visible && (
        <div id="kpi-combined-card" className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-2">
            <span 
              className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'} flex items-center gap-1.5`}
              style={labelColorStyle}
            >
              <Layers className="w-4 h-4 text-purple-500 dark:text-purple-400" />
              {cfgCombined.title}
            </span>
          </div>
          <div 
            className={`${customization?.kpiValueSize ? valueSizeClass : 'text-2xl'} font-black text-purple-500 dark:text-purple-400 tracking-tight`}
            style={valueColorStyle}
          >
            {formatEGP(kpis.totalCombinedAmount)}
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
            <span className={subTextColor}>{formatEGPFull(kpis.totalCombinedAmount)}</span>
            <span className={`font-bold font-sans text-[10px] px-2 py-0.5 rounded ${isLight ? 'bg-purple-50 text-purple-700' : 'bg-purple-950/50 text-purple-300'}`}>
              # {kpis.totalCombinedCount}
            </span>
          </div>
        </div>
      )}

      {/* 2. Default Refunds Card */}
      {cfgDefault.visible && (
        <div id="kpi-default-card" className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-2">
            <span 
              className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'} flex items-center gap-1.5`}
              style={labelColorStyle}
            >
              <AlertCircle className="w-4 h-4 text-red-500" />
              {cfgDefault.title}
            </span>
          </div>
          <div 
            className={`${customization?.kpiValueSize ? valueSizeClass : 'text-2xl'} font-black text-red-500 tracking-tight`}
            style={valueColorStyle}
          >
            {formatEGP(kpis.defaultAmount)}
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
            <span className={subTextColor}>{formatEGPFull(kpis.defaultAmount)}</span>
            <span className={`font-bold font-sans text-[10px] px-2 py-0.5 rounded ${isLight ? 'bg-red-50 text-red-700' : 'bg-red-950/50 text-red-300'}`}>
              # {kpis.defaultCount}
            </span>
          </div>
        </div>
      )}

      {/* 3. Request Refunds Card */}
      {cfgRequest.visible && (
        <div id="kpi-request-card" className={`${cardBg} rounded-2xl p-4 border transition-all relative overflow-hidden`}>
          <div className="flex items-center justify-between mb-2">
            <span 
              className={`text-xs font-bold ${isLight ? 'text-slate-600' : 'text-slate-300'} flex items-center gap-1.5`}
              style={labelColorStyle}
            >
              <FileCheck className="w-4 h-4 text-blue-500" />
              {cfgRequest.title}
            </span>
          </div>
          <div 
            className={`${customization?.kpiValueSize ? valueSizeClass : 'text-2xl'} font-black text-blue-500 tracking-tight`}
            style={valueColorStyle}
          >
            {formatEGP(kpis.requestAmount)}
          </div>
          <div className="flex items-center justify-between mt-1 text-[11px] font-mono">
            <span className={subTextColor}>{formatEGPFull(kpis.requestAmount)}</span>
            <span className={`font-bold font-sans text-[10px] px-2 py-0.5 rounded ${isLight ? 'bg-blue-50 text-blue-700' : 'bg-blue-950/50 text-blue-300'}`}>
              # {kpis.requestCount}
            </span>
          </div>
        </div>
      )}

    </div>
  );
};

