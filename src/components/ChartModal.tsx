import React, { useEffect } from 'react';
import { X, Maximize2 } from 'lucide-react';
import { ChartModalState } from '../types';

interface ChartModalProps {
  modalState: ChartModalState;
  onClose: () => void;
  children: React.ReactNode;
  isLight?: boolean;
}

// Charts that render their own title and header controls internally before the filters
const CHARTS_WITH_INTERNAL_HEADER = new Set([
  'yearly_comparison',
  'tenure_double_bar',
  'company_pie',
  'amount_type_donut',
  'company_timeline',
  'acceptance_waterfall',
  'funds_vs_refunds_table',
  'cs_company_breakdown',
  'cs_company_donut',
  'cs_company_metrics_table',
  'cs_company_feedback_full',
  'funds_vs_refunds_barchart',
  'funds_distribution_pie',
  'finance_company_exposure',
  'finance_cash_burn_trend',
  'finance_settlement_table',
  'default_funnel',
  'request_donut',
]);

export const ChartModal: React.FC<ChartModalProps> = ({ modalState, onClose, children, isLight = false }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && modalState.isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalState.isOpen, onClose]);

  if (!modalState.isOpen) return null;

  const isTitleRepeatedInChart = CHARTS_WITH_INTERNAL_HEADER.has(modalState.chartId);

  return (
    <div 
      className={`fixed inset-0 z-[100] ${isLight ? 'bg-slate-900/60' : 'bg-slate-950/85'} backdrop-blur-md flex items-center justify-center p-2 sm:p-4 lg:p-6 animate-fadeIn`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={`rounded-2xl shadow-2xl border w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden relative transition-colors ${
        isLight ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-slate-200'
      }`}>
        
        {/* If chart has its own internal header, start directly from chart and use floating close button */}
        {isTitleRepeatedInChart ? (
          <button
            onClick={onClose}
            className={`absolute top-3.5 right-3.5 sm:top-4 sm:right-4 z-30 p-2 rounded-full border transition-all cursor-pointer shadow-md ${
              isLight 
                ? 'text-slate-600 hover:text-slate-950 bg-white/90 hover:bg-slate-100 border-slate-300 backdrop-blur-xs' 
                : 'text-slate-400 hover:text-white bg-slate-800/90 hover:bg-slate-700 border-slate-700 backdrop-blur-xs'
            }`}
            title="Close Fullscreen (Esc)"
            aria-label="Close Fullscreen"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          /* Modal Top Header when chart doesn't have an internal title */
          <div className={`px-5 sm:px-6 py-2.5 border-b flex items-center justify-between gap-4 shrink-0 ${
            isLight ? 'border-slate-200 bg-slate-50/80' : 'border-slate-800 bg-slate-950/70'
          }`}>
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 flex items-center justify-center shrink-0">
                <Maximize2 className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className={`text-base sm:text-lg font-bold truncate ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  {modalState.title || 'Chart Fullscreen View'}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className={`p-2 rounded-full border transition-all shrink-0 cursor-pointer ${
                isLight 
                  ? 'text-slate-600 hover:text-slate-950 bg-white hover:bg-slate-100 border-slate-300 shadow-xs' 
                  : 'text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 border-slate-700 shadow-xs'
              }`}
              title="Close Fullscreen (Esc)"
              aria-label="Close Fullscreen"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Modal Chart Content */}
        <div className={`p-2.5 sm:p-4 overflow-y-auto flex-1 flex flex-col justify-start items-stretch ${
          isLight ? 'bg-slate-50/40' : 'bg-slate-950/30'
        }`}>
          <div className="w-full h-full">
            {children}
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`px-4 sm:px-6 py-2 border-t flex items-center justify-between text-xs shrink-0 ${
          isLight 
            ? 'border-slate-200 bg-white text-slate-600' 
            : 'border-slate-800 bg-slate-900/90 text-slate-400'
        }`}>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Presentation Mode (Press <kbd className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${
              isLight ? 'bg-slate-100 border-slate-300 text-slate-700' : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>Esc</kbd> to exit)
          </span>
          <button
            onClick={onClose}
            className={`px-3 py-0.5 text-xs font-bold rounded-lg transition-colors shadow-xs ${
              isLight
                ? 'bg-slate-200 hover:bg-slate-300 border border-slate-300 text-slate-800'
                : 'bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white'
            }`}
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
