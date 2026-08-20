import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Calendar, 
  Filter, 
  Upload, 
  FileDown, 
  Presentation, 
  MonitorPlay,
  Sliders, 
  LayoutDashboard, 
  Headphones,
  Landmark,
  DollarSign,
  RotateCcw,
  X,
  Check,
  Loader2
} from 'lucide-react';
import { DashboardFilters, DashboardCustomization } from '../types';
import { parseMonthAndYear } from '../utils/dataProcessor';

interface HeaderProps {
  activeSection: 'all_refunds' | 'cs_work' | 'funds' | 'finance';
  setActiveSection: (sec: 'all_refunds' | 'cs_work' | 'funds' | 'finance') => void;
  filters: DashboardFilters;
  setFilters: React.Dispatch<React.SetStateAction<DashboardFilters>>;
  customization: DashboardCustomization;
  setCustomization: React.Dispatch<React.SetStateAction<DashboardCustomization>>;
  onOpenUpload: () => void;
  onOpenPdfModal: () => void;
  onExportPpt: () => void;
  onOpenManualInputs: () => void;
  availableMonths: string[];
  isExporting?: boolean;
  isPresentationMode?: boolean;
  setIsPresentationMode?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  setActiveSection,
  filters,
  setFilters,
  customization,
  setCustomization,
  onOpenUpload,
  onOpenPdfModal,
  onExportPpt,
  onOpenManualInputs,
  availableMonths,
  isExporting = false,
  isPresentationMode = true,
  setIsPresentationMode
}) => {
  // Toggle filter popup state
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterDropdownRef = useRef<HTMLDivElement>(null);

  // Close filter popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
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

  // Months list showing up to Aug by default, plus any month that exists in the dataset
  const displayedMonths = useMemo(() => {
    const baseMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];
    const extraMonths = availableMonths
      .map(m => parseMonthAndYear(m)?.monthShort || m)
      .filter((m): m is string => Boolean(m) && !baseMonths.includes(m));
    return [...baseMonths, ...Array.from(new Set(extraMonths))];
  }, [availableMonths]);

  // Check if any filter is actively filtering
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.company !== 'ALL') count++;
    if (filters.requestMonth !== 'ALL') count++;
    if (filters.type !== 'ALL') count++;
    if (filters.status !== 'ALL') count++;
    if (filters.acceptanceYear !== 'ALL') count++;
    return count;
  }, [filters]);

  const handleResetFilters = () => {
    setFilters({
      company: 'ALL',
      requestMonth: 'ALL',
      type: 'ALL',
      status: 'ALL',
      acceptanceYear: 'ALL',
    });
  };

  // Font size mapping for title
  const titleSizeClass = 
    customization.headerTitleSize === 'sm' ? 'text-base' :
    customization.headerTitleSize === 'md' ? 'text-lg' :
    customization.headerTitleSize === 'lg' ? 'text-xl' :
    customization.headerTitleSize === '2xl' ? 'text-2xl' :
    customization.headerTitleSize === '3xl' ? 'text-3xl' :
    'text-xl';

  return (
    <header className="bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800/80 sticky top-0 z-40 shadow-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between gap-4">
          
          {/* Brand & Section Navigation */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-md shadow-indigo-500/20">
                <LayoutDashboard className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <h1 
                  className={`${titleSizeClass} font-bold tracking-tight flex items-center gap-2 text-slate-100 leading-tight`}
                  style={customization.headerTitleColor ? { color: customization.headerTitleColor } : undefined}
                >
                  {(customization.headerTitle && customization.headerTitle !== 'Membership Refunds') ? customization.headerTitle : 'Membership Refunds 2026'}
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                    Dashboard
                  </span>
                </h1>
                <p 
                  className="text-sm sm:text-[15px] font-semibold text-slate-200 tracking-normal mt-0.5"
                  style={customization.headerSubtitleColor && customization.headerSubtitleColor !== '#94a3b8' ? { color: customization.headerSubtitleColor } : undefined}
                >
                  {(!customization.headerSubtitle || customization.headerSubtitle === 'Dynamic Analytics Dashboard') ? 'Finance companies' : customization.headerSubtitle}
                </p>
              </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center p-1 rounded-xl border bg-slate-800/80 border-slate-700/70 sm:ml-2">
              <button
                onClick={() => setActiveSection('all_refunds')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'all_refunds'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                All Refunds
              </button>
              <button
                onClick={() => setActiveSection('cs_work')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'cs_work'
                    ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Headphones className="w-3.5 h-3.5" />
                Customer Service
              </button>
              <button
                onClick={() => setActiveSection('funds')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'funds'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <Landmark className="w-3.5 h-3.5 text-emerald-400" />
                Funds
              </button>
              <button
                onClick={() => setActiveSection('finance')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeSection === 'finance'
                    ? 'bg-amber-600 text-white shadow-sm shadow-amber-600/30'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                Finance
              </button>
            </div>
          </div>

          {/* Right Action Tools: Filter Icon Popup & Admin Edit */}
          <div className="flex items-center gap-2.5">
            
            {/* Global Filter Icon Button (Opens on click) */}
            <div className="relative" ref={filterDropdownRef}>
              <button
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className={`relative flex items-center justify-center w-9 h-9 rounded-xl border transition-all cursor-pointer shadow-xs ${
                  isFilterOpen || activeFilterCount > 0
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                }`}
                title={activeFilterCount > 0 ? `${activeFilterCount} Active Filters` : 'Filter Dashboard'}
                aria-label="Toggle Dashboard Filters"
              >
                <Filter className="w-4 h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-scaleIn">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Filter Popover Dropdown Panel */}
              {isFilterOpen && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 p-4 rounded-2xl bg-slate-900 border border-slate-700/90 shadow-2xl shadow-black/80 z-50 text-xs text-slate-200 animate-fadeIn">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                        <Filter className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-sm text-white">Dashboard Filters</span>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {activeFilterCount > 0 && (
                        <button
                          onClick={handleResetFilters}
                          className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 px-2 py-0.5 rounded hover:bg-rose-500/10 cursor-pointer"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reset
                        </button>
                      )}
                      <button
                        onClick={() => setIsFilterOpen(false)}
                        className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="py-3 space-y-3.5">
                    {/* Company Filter */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                        Company:
                      </label>
                      <select
                        value={filters.company}
                        onChange={(e) => setFilters(prev => ({ ...prev, company: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer ${
                          filters.company !== 'ALL'
                            ? 'bg-indigo-600/20 text-indigo-300 border-indigo-500/50 font-bold'
                            : 'bg-slate-800/90 border-slate-700 text-slate-200'
                        }`}
                      >
                        <option value="ALL" className="bg-slate-900 text-slate-200">All Companies</option>
                        <option value="Ollin" className="bg-slate-900 text-emerald-400 font-bold">Ollin</option>
                        <option value="Premium" className="bg-slate-900 text-cyan-400 font-bold">Premium</option>
                        <option value="Aman" className="bg-slate-900 text-amber-400 font-bold">Aman</option>
                        <option value="Contact" className="bg-slate-900 text-purple-400 font-bold">Contact</option>
                      </select>
                    </div>

                    {/* Request Month Filter */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-blue-400" />
                        Request Month:
                      </label>
                      <select
                        value={filters.requestMonth}
                        onChange={(e) => setFilters(prev => ({ ...prev, requestMonth: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer ${
                          filters.requestMonth !== 'ALL'
                            ? 'bg-blue-600/20 text-blue-300 border-blue-500/50 font-bold'
                            : 'bg-slate-800/90 border-slate-700 text-slate-200'
                        }`}
                      >
                        <option value="ALL" className="bg-slate-900 text-slate-200">All Request Months</option>
                        {displayedMonths.map(m => (
                          <option key={m} value={m} className="bg-slate-900 text-slate-200">
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Filter className="w-3.5 h-3.5 text-amber-400" />
                        Refund Type:
                      </label>
                      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-800/90 border border-slate-700">
                        {(['ALL', 'default', 'Request'] as const).map(t => (
                          <button
                            key={t}
                            onClick={() => setFilters(prev => ({ ...prev, type: t }))}
                            className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              filters.type === t
                                ? 'bg-indigo-600 text-white shadow-xs'
                                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                            }`}
                          >
                            {t === 'ALL' ? 'All' : t === 'default' ? 'Default' : 'Request'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Status:
                      </label>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                        className={`w-full px-3 py-2 rounded-xl border text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-colors cursor-pointer ${
                          filters.status !== 'ALL'
                            ? 'bg-emerald-600/20 text-emerald-300 border-emerald-500/50 font-bold'
                            : 'bg-slate-800/90 border-slate-700 text-slate-200'
                        }`}
                      >
                        <option value="ALL" className="bg-slate-900 text-slate-200">All Statuses</option>
                        <option value="Cancelled & Cheque pending" className="bg-slate-900 text-slate-200">Cancelled & Cheque pending</option>
                        <option value="Cancelled" className="bg-slate-900 text-slate-200">Cancelled Only</option>
                        <option value="Cheque pending" className="bg-slate-900 text-slate-200">Cheque Pending Only</option>
                        <option value="Retained" className="bg-slate-900 text-slate-200">Retained</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      {activeFilterCount > 0 ? `${activeFilterCount} filters applied` : 'No filters applied'}
                    </span>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Export & Actions Toolbar */}
            <div className="flex items-center gap-2">
              {/* Management & Export Tools (Inputs, Upload, PDF, PPT) - All Hidden in Presentation Mode */}
              {!isPresentationMode && (
                <div className="flex items-center gap-2 animate-fadeIn">
                  {/* Manual Inputs Trigger */}
                  <button
                    onClick={onOpenManualInputs}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02]"
                    title="إدخال أرقام الإلغاء والتمويل يدوياً (Manual Inputs)"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-400" />
                    <span className="hidden md:inline">Inputs</span>
                  </button>

                  {/* Upload Sheet Trigger */}
                  <button
                    onClick={onOpenUpload}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer hover:scale-[1.02]"
                    title="رفع شيت إكسيل أو CSV محدث (Upload Sheet)"
                  >
                    <Upload className="w-3.5 h-3.5 text-blue-400" />
                    <span className="hidden md:inline">Upload</span>
                  </button>

                  {/* Direct PDF Export Modal Trigger */}
                  <button
                    onClick={onOpenPdfModal}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer border border-emerald-500/40 hover:scale-[1.02]"
                    title="تصدير تقرير PDF"
                  >
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">PDF</span>
                  </button>

                  {/* Direct Full PPT Presentation Export Trigger */}
                  <button
                    onClick={onExportPpt}
                    disabled={isExporting}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer border border-indigo-500/40 hover:scale-[1.02]"
                    title="تصدير عرض PowerPoint (4 صفحات)"
                  >
                    {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">PPT</span>
                  </button>
                </div>
              )}

              {/* Presentation Mode Toggle Icon Button (Icon Only) */}
              {setIsPresentationMode && (
                <button
                  onClick={() => setIsPresentationMode(prev => !prev)}
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                    isPresentationMode
                      ? 'bg-violet-600 hover:bg-violet-500 text-white border-violet-400/60 shadow-md shadow-violet-500/30 ring-2 ring-violet-400/50'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
                  }`}
                  title={
                    isPresentationMode
                      ? 'وضع العرض نشط (اضغط للعودة وإظهار أدوات الإدارة والتصدير)'
                      : 'تفعيل وضع العرض Presentation Mode (إخفاء كافة أدوات الإدارة والتصدير للعرض فقط)'
                  }
                >
                  <MonitorPlay className={`w-4 h-4 ${isPresentationMode ? 'text-white animate-pulse' : 'text-violet-400'}`} />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
