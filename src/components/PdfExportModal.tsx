import React, { useState } from 'react';
import { X, FileDown, Layers, LayoutDashboard, Headphones, Landmark, DollarSign, CheckCircle2, Loader2, Sparkles, Presentation } from 'lucide-react';
import { DashboardFilters } from '../types';
import { formatMonthLabel } from '../utils/dataProcessor';

interface PdfExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeSection: 'all_refunds' | 'cs_work' | 'funds' | 'finance';
  filters: DashboardFilters;
  isLight?: boolean;
  onExportSinglePage: (pageKey: 'all_refunds' | 'cs_work' | 'funds' | 'finance', pageName: string) => Promise<void>;
  onExportAllPages: (onProgress: (current: number, total: number) => void) => Promise<void>;
  onExportPptAllPages: (onProgress: (current: number, total: number) => void) => Promise<void>;
}

export const PdfExportModal: React.FC<PdfExportModalProps> = ({
  isOpen,
  onClose,
  activeSection,
  filters,
  isLight = false,
  onExportSinglePage,
  onExportAllPages,
  onExportPptAllPages,
}) => {
  if (!isOpen) return null;

  const [isExporting, setIsExporting] = useState(false);
  const [progressText, setProgressText] = useState<string>('');

  const handleExportSingle = async (key: 'all_refunds' | 'cs_work' | 'funds' | 'finance', title: string) => {
    setIsExporting(true);
    setProgressText(`جاري إعداد صفحة (${title}) وتنسيق البيانات...`);
    try {
      await onExportSinglePage(key, title);
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
      setProgressText('');
      onClose();
    }
  };

  const handleExportAllPdf = async () => {
    setIsExporting(true);
    setProgressText('جاري تجميع وإعداد الصفحات الأربع لتقرير PDF...');
    try {
      await onExportAllPages((curr, total) => {
        setProgressText(`جاري معالجة وتنسيق الصفحة ${curr} من ${total} (PDF)...`);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
      setProgressText('');
      onClose();
    }
  };

  const handleExportAllPpt = async () => {
    setIsExporting(true);
    setProgressText('جاري تجميع وإعداد شرائح PowerPoint (16:9)...');
    try {
      await onExportPptAllPages((curr, total) => {
        setProgressText(`جاري إنشاء وتصدير الشريحة ${curr} من ${total} (PPTX)...`);
      });
    } catch (e) {
      console.error(e);
    } finally {
      setIsExporting(false);
      setProgressText('');
      onClose();
    }
  };

  const sectionNames = {
    all_refunds: 'اللوحة الرئيسية (Main Dashboard)',
    cs_work: 'خدمة العملاء (Customer Service)',
    funds: 'التمويل (Funds)',
    finance: 'المالية (Finance)',
  };

  const activeName = sectionNames[activeSection];

  const modalBg = isLight ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-white border-slate-800';
  const cardBg = isLight ? 'bg-slate-50 border-slate-200 hover:border-blue-400' : 'bg-slate-950/70 border-slate-800 hover:border-blue-500/50';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className={`${modalBg} rounded-2xl shadow-2xl border w-full max-w-2xl overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-950 text-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center">
              <Presentation className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                تصدير التقرير (PowerPoint & PDF)
                <Sparkles className="w-4 h-4 text-amber-400" />
              </h3>
              <p className="text-xs text-slate-400">Export Complete 4-Page Presentation (PPTX) or Document (PDF)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          {/* Status Indicator Bar */}
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-300 font-medium">
              <CheckCircle2 className="w-4 h-4 text-indigo-500" />
              <span>Active Page: <strong className="font-bold">{activeName}</strong></span>
            </div>
            <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
              Company: {filters.company} | Month: {filters.requestMonth === 'ALL' ? 'All Months' : formatMonthLabel(filters.requestMonth)}
            </span>
          </div>

          {/* Option 1: Full 4-Page Combined PPTX & PDF Reports */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* PowerPoint Export Card */}
            <div className={`${cardBg} rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-3`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Presentation className="w-5 h-5 text-indigo-500" />
                    <h4 className="text-sm font-extrabold">Full PowerPoint (4 Pages)</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    16:9 Widescreen
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Exports a structured PowerPoint (.pptx) with Cover slide + 4 HD slide pages (Main Dashboard, CS Work, Funds, Finance).
                </p>
              </div>
              <button
                onClick={handleExportAllPpt}
                disabled={isExporting}
                className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Presentation className="w-4 h-4" />}
                <span>Download All 4 Pages (PPTX)</span>
              </button>
            </div>

            {/* PDF Export Card */}
            <div className={`${cardBg} rounded-2xl p-5 border transition-all flex flex-col justify-between space-y-3`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-emerald-500" />
                    <h4 className="text-sm font-extrabold">Full PDF Report (4 Pages)</h4>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Multi-Page A4
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Exports a clean, multi-page vector PDF report containing all 4 dashboard sections with formatted headers and footers.
                </p>
              </div>
              <button
                onClick={handleExportAllPdf}
                disabled={isExporting}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
                <span>Download All 4 Pages (PDF)</span>
              </button>
            </div>
          </div>

          {/* Option 2: Single Page Direct Export */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <span>Single Page PDF Export</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleExportSingle('all_refunds', 'Main Dashboard - All Refunds')}
                disabled={isExporting}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === 'all_refunds'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold'
                    : isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4 text-blue-500" />
                  <span className="text-xs">1. Main Dashboard</span>
                </div>
                <FileDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleExportSingle('cs_work', 'Customer Service - CS Work')}
                disabled={isExporting}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === 'cs_work'
                    ? 'border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-300 font-bold'
                    : isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-cyan-500" />
                  <span className="text-xs">2. CS Work</span>
                </div>
                <FileDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleExportSingle('funds', 'Funds & Allocations')}
                disabled={isExporting}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === 'funds'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 font-bold'
                    : isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Landmark className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs">3. Funds Page</span>
                </div>
                <FileDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              <button
                onClick={() => handleExportSingle('finance', 'Finance & Liabilities')}
                disabled={isExporting}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  activeSection === 'finance'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-300 font-bold'
                    : isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-800' : 'bg-slate-950 hover:bg-slate-800 text-slate-200 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-amber-500" />
                  <span className="text-xs">4. Finance Page</span>
                </div>
                <FileDown className="w-3.5 h-3.5 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Exporting Indicator */}
          {isExporting && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-center space-y-2 animate-pulse">
              <div className="flex items-center justify-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold">
                <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
                <span>{progressText}</span>
              </div>
              <p className="text-[11px] text-slate-500">Please wait while high-resolution charts and tables are generated...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
