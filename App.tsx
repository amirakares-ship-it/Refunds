import { useState, useMemo, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { 
  getInitialRecords, 
  saveRecordsToStorage, 
  saveBaselineRecords, 
  resetToBaselineRecords 
} from './data/seedDataset';
import { parseCsvToRecords } from './utils/csvParser';
import { rawCsvDataString } from './data/fullCsvData';
import { initialFinancedFunds } from './data/initialFunds';
import { defaultCustomization } from './data/defaultCustomization';
import { 
  RefundRecord, 
  DashboardFilters, 
  ManualInputs, 
  ChartModalState,
  DashboardCustomization 
} from './types';
import { 
  filterRecords, 
  calculateKpis,
  formatMonthLabel,
  parseMonthAndYear
} from './utils/dataProcessor';
import { exportDashboardToPdf, exportDashboardToPpt, exportSinglePagePdf, exportAllPagesPdf } from './utils/exportUtils';

import { Header } from './components/Header';
import { KpiCards } from './components/KpiCards';
import { ManualInputModal } from './components/ManualInputModal';
import { FileUploadModal } from './components/FileUploadModal';
import { SqliteManagerModal } from './components/SqliteManagerModal';
import { PdfExportModal } from './components/PdfExportModal';
import { ChartModal } from './components/ChartModal';
import { getActiveRecordsFromSqlite } from './utils/sqliteStore';
import { subscribeToActiveCloudState, getActiveCloudDataset } from './utils/cloudSync';

import { CSWorkSection } from './components/charts/CSWorkSection';
import { FundsSection } from './components/charts/FundsSection';
import { FinanceSection } from './components/charts/FinanceSection';
import { RequestDonutChart } from './components/charts/RequestDonutChart';
import { AmountTypeDonutChart } from './components/charts/AmountTypeDonutChart';
import { DefaultFunnelChart } from './components/charts/DefaultFunnelChart';
import { CompanyPieChart } from './components/charts/CompanyPieChart';
import { TimelineChart } from './components/charts/TimelineChart';
import { WaterfallChart } from './components/charts/WaterfallChart';
import { FundsVsRefundsTable } from './components/charts/FundsVsRefundsTable';
import { TenureDoubleBarChart } from './components/charts/TenureDoubleBarChart';
import { YearlyComparisonChart } from './components/charts/YearlyComparisonChart';
import { DynamicChartRenderer } from './components/charts/DynamicChartRenderer';

export default function App() {
  // Main Dataset State (initialized from localStorage if present, or raw csv)
  const [records, setRecords] = useState<RefundRecord[]>(() => getInitialRecords());

  // Automatically sync with Cloud Firestore & SQLite persistent database on load
  useEffect(() => {
    getActiveRecordsFromSqlite().then(({ records: activeRecords }) => {
      if (activeRecords && activeRecords.length > 0) {
        setRecords(activeRecords);
      }
    }).catch(err => {
      console.error('Error initializing active records from storage:', err);
    });

    // Real-time listener: When another user or admin uploads/changes the dataset on the cloud, sync immediately
    const unsubscribe = subscribeToActiveCloudState(() => {
      getActiveCloudDataset().then(({ records: cloudRecs }) => {
        if (cloudRecs && cloudRecs.length > 0) {
          setRecords(cloudRecs);
        }
      }).catch(err => console.warn('Cloud update sync failed:', err));
    });

    return () => unsubscribe();
  }, []);

  // Save records to localStorage on update
  useEffect(() => {
    saveRecordsToStorage(records);
  }, [records]);
  
  // Customization State for full control admin panel (persisted)
  const [customization, setCustomization] = useState<DashboardCustomization>(() => {
    try {
      const saved = localStorage.getItem('dashboard_customization_v5');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure removed charts are filtered out from All Refunds
        parsed.chartConfigs = parsed.chartConfigs.filter((c: any) => 
          c.id !== 'request_donut' && 
          c.id !== 'default_funnel' && 
          c.id !== 'funds_vs_refunds_table'
        );
        
        // Ensure yearly_comparison exists and has half span beside tenure_double_bar
        const hasYearly = parsed.chartConfigs.some((c: any) => c.id === 'yearly_comparison');
        if (!hasYearly) {
          parsed.chartConfigs.push({
            id: 'yearly_comparison',
            title: 'Refunds Comparison: 2025 VS 2026',
            description: '',
            visible: true,
            dataType: 'ALL',
            metricType: 'amount',
            chartType: 'bar',
            gridSpan: 'half',
          });
        } else {
          parsed.chartConfigs = parsed.chartConfigs.map((c: any) => 
            c.id === 'yearly_comparison' ? { ...c, description: '', gridSpan: 'half' } : c
          );
        }

        if (!parsed.headerSubtitle || parsed.headerSubtitle === 'Dynamic Analytics Dashboard') {
          parsed.headerSubtitle = 'Finance companies';
        }
        return parsed;
      }
    } catch (e) {
      console.error('Error loading customization from localStorage', e);
    }
    return defaultCustomization;
  });

  useEffect(() => {
    try {
      localStorage.setItem('dashboard_customization_v5', JSON.stringify(customization));
    } catch (e) {
      console.error('Error saving customization to localStorage', e);
    }
  }, [customization]);

  // Dashboard Section: 'all_refunds', 'cs_work', 'funds', or 'finance'
  const [activeSection, setActiveSection] = useState<'all_refunds' | 'cs_work' | 'funds' | 'finance'>('all_refunds');

  // Filters State
  const [filters, setFilters] = useState<DashboardFilters>({
    company: 'ALL',
    requestMonth: 'ALL',
    type: 'ALL',
    status: 'ALL',
    acceptanceYear: 'ALL',
  });

  // Manual Inputs State (persisted)
  const [manualInputs, setManualInputs] = useState<ManualInputs>(() => {
    try {
      const saved = localStorage.getItem('dashboard_manual_inputs_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading manual inputs from localStorage', e);
    }
    return {
      manualTotalCancellationCount: null,
      financedFunds: initialFinancedFunds,
    };
  });

  useEffect(() => {
    try {
      localStorage.setItem('dashboard_manual_inputs_v1', JSON.stringify(manualInputs));
    } catch (e) {
      console.error('Error saving manual inputs to localStorage', e);
    }
  }, [manualInputs]);

  // UI Modals State
  const [isManualInputOpen, setIsManualInputOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSqliteOpen, setIsSqliteOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [isPresentationMode, setIsPresentationMode] = useState(true);

  // Global Export Progress Toast State
  const [exportStatus, setExportStatus] = useState<{
    isExporting: boolean;
    isDone?: boolean;
    title: string;
    subtitle: string;
  }>({
    isExporting: false,
    isDone: false,
    title: '',
    subtitle: '',
  });

  const handleExportSinglePage = async (key: 'all_refunds' | 'cs_work' | 'funds' | 'finance', pageName: string) => {
    try {
      setExportStatus({
        isExporting: true,
        isDone: false,
        title: `جاري إنشاء PDF: ${pageName}...`,
        subtitle: 'يرجى الانتظار بضع ثوانٍ',
      });
      const pageIdMap = {
        all_refunds: 'pdf-page-all-refunds',
        cs_work: 'pdf-page-cs-work',
        funds: 'pdf-page-funds',
        finance: 'pdf-page-finance',
      };
      const targetId = pageIdMap[key] || 'dashboard-content';
      const filename = `Refunds_Report_${key}_${filters.company}_${filters.requestMonth}.pdf`;
      await exportSinglePagePdf(targetId, filename, pageName, isLight);
      setExportStatus({
        isExporting: true,
        isDone: true,
        title: 'تم تصدير ملف PDF بنجاح!',
        subtitle: 'بدأ التنزيل الآن على جهازك',
      });
      setTimeout(() => setExportStatus({ isExporting: false, isDone: false, title: '', subtitle: '' }), 2500);
    } catch (err) {
      console.error('Export error:', err);
      setExportStatus({ isExporting: false, isDone: false, title: '', subtitle: '' });
    }
  };

  const handleExportAllPages = async (onProgress?: (curr: number, total: number) => void) => {
    try {
      setExportStatus({
        isExporting: true,
        isDone: false,
        title: 'جاري تصدير تقرير PDF الشامل (4 صفحات)...',
        subtitle: 'تجميع الصفحات والجداول التنفيذية',
      });
      const pages = [
        { id: 'pdf-page-all-refunds', title: '1. Main Dashboard (All Refunds 2026)' },
        { id: 'pdf-page-cs-work', title: '2. Customer Service Work Report 2026' },
        { id: 'pdf-page-funds', title: '3. Monthly Funds & Matrix 2026' },
        { id: 'pdf-page-finance', title: '4. Finance & Cash Liabilities 2026' },
      ];
      const filename = `Refunds_Complete_4Page_Report_${filters.company}_${filters.requestMonth}.pdf`;
      await exportAllPagesPdf(pages, filename, isLight, (curr, total) => {
        if (onProgress) onProgress(curr, total);
        setExportStatus({
          isExporting: true,
          isDone: false,
          title: `جاري معالجة صفحة ${curr} من ${total} في PDF...`,
          subtitle: pages[curr - 1]?.title || '',
        });
      });
      setExportStatus({
        isExporting: true,
        isDone: true,
        title: 'تم تصدير تقرير PDF الشامل بنجاح!',
        subtitle: 'بدأ التنزيل الآن على جهازك',
      });
      setTimeout(() => setExportStatus({ isExporting: false, isDone: false, title: '', subtitle: '' }), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setExportStatus({ isExporting: false, isDone: false, title: '', subtitle: '' });
    }
  };

  const handleExportAllPpt = async (onProgress?: (curr: number, total: number) => void) => {
    try {
      setExportStatus({
        isExporting: true,
        isDone: false,
        title: 'جاري إعداد عرض PowerPoint التقديمي (4 صفحات)...',
        subtitle: 'تضمين الجداول والرسوم البيانية',
      });
      await exportDashboardToPpt(
        kpis,
        filters.company,
        filters.requestMonth,
        isLight,
        (curr, total) => {
          if (onProgress) onProgress(curr, total);
          setExportStatus({
            isExporting: true,
            isDone: false,
            title: `جاري إنشاء الشريحة ${curr} من ${total} في PPT...`,
            subtitle: 'تجهيز اللوحة والرسوم البيانية التنفيذية',
          });
        }
      );
      setExportStatus({
        isExporting: true,
        isDone: true,
        title: 'تم تصدير عرض PowerPoint بنجاح!',
        subtitle: 'بدأ التنزيل الآن على جهازك',
      });
      setTimeout(() => setExportStatus({ isExporting: false, isDone: false, title: '', subtitle: '' }), 3000);
    } catch (err) {
      console.error('Export PPT error:', err);
      setExportStatus({ isExporting: false, isDone: false, title: '', subtitle: '' });
    }
  };

  // Fullscreen Chart Modal State
  const [modalState, setModalState] = useState<ChartModalState>({
    isOpen: false,
    title: '',
    chartId: '',
    description: '',
  });

  // 2026 Records: Filter base dataset for 2026 so entire dashboard operates exclusively on 2026
  const records2026 = useMemo(() => {
    return records.filter(r => (r.year || r.refundYear || 2026) === 2026);
  }, [records]);

  // Extract unique available request months dynamically from 2026 dataset (Request Date column)
  const availableMonths = useMemo(() => {
    const monthsSet = new Set<string>();
    records2026.forEach(r => {
      const d = r.requestDate || r.requestMonth || '';
      const parsed = parseMonthAndYear(d);
      if (parsed) {
        monthsSet.add(parsed.monthShort);
      }
    });
    return Array.from(monthsSet);
  }, [records2026]);

  // Filtered Dataset for Dashboard (Exclusively 2026)
  const filteredRecords = useMemo(() => {
    return filterRecords(records2026, filters);
  }, [records2026, filters]);

  // KPI Calculations (Calculated exclusively on 2026 filtered records)
  const kpis = useMemo(() => {
    return calculateKpis(filteredRecords, manualInputs);
  }, [filteredRecords, manualInputs]);

  // Handle Fullscreen Chart
  const handleOpenExpandChart = (chartId: string, title: string, description?: string) => {
    setModalState({
      isOpen: true,
      title,
      chartId,
      description,
    });
  };

  const handleCloseChartModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  // Reset Dataset Handler
  const handleResetData = () => {
    if (confirm('Reset dataset back to the uploaded baseline data?')) {
      const baseline = resetToBaselineRecords();
      setRecords(baseline);
      setManualInputs({
        manualTotalCancellationCount: null,
        financedFunds: initialFinancedFunds,
      });
      setFilters({
        company: 'ALL',
        requestMonth: 'ALL',
        type: 'ALL',
        status: 'ALL',
        acceptanceYear: 'ALL',
      });
    }
  };

  const handleResetCustomization = () => {
    if (confirm('Reset dashboard appearance and chart configs to default?')) {
      localStorage.removeItem('dashboard_customization_v1');
      setCustomization(defaultCustomization);
    }
  };

  // Helper to map chart ID to chart component or dynamic renderer
  const renderChartById = (chartConfig: any) => {
    const { id, title, description, visible } = chartConfig;
    if (!visible) return null;

    switch (id) {
      case 'yearly_comparison':
        return (
          <YearlyComparisonChart
            key={id}
            records={records}
            onExpandChart={handleOpenExpandChart}
            customTitle={title}
            customDescription={description}
            isLight={isLight}
          />
        );
      case 'request_donut':
        return (
          <RequestDonutChart
            key={id}
            records={filteredRecords}
            manualTotalCancellations={manualInputs.manualTotalCancellationCount}
            onExpandChart={handleOpenExpandChart}
            customTitle={title}
            customDescription={description}
          />
        );
      case 'amount_type_donut':
        return (
          <AmountTypeDonutChart
            key={id}
            records={filteredRecords}
            onExpandChart={handleOpenExpandChart}
            customTitle={title}
            customDescription={description}
            isLight={isLight}
          />
        );
      case 'company_pie':
        return (
          <CompanyPieChart
            key={id}
            records={filteredRecords}
            onExpandChart={handleOpenExpandChart}
            customTitle={title}
            customDescription={description}
            isLight={isLight}
          />
        );
      case 'company_timeline':
        return (
          <TimelineChart
            key={id}
            records={filteredRecords}
            onExpandChart={handleOpenExpandChart}
            customTitle={title}
            customDescription={description}
            isLight={isLight}
            selectedCompany={filters.company}
          />
        );
      case 'acceptance_waterfall':
        return (
          <WaterfallChart
            key={id}
            records={filteredRecords}
            onExpandChart={handleOpenExpandChart}
            customTitle={title}
            customDescription={description}
            isLight={isLight}
          />
        );
      case 'funds_vs_refunds_table':
        return (
          <FundsVsRefundsTable
            key={id}
            records={filteredRecords}
            manualInputs={manualInputs}
            selectedCompany={filters.company}
            onOpenManualInputs={() => setIsManualInputOpen(true)}
            onExpandChart={handleOpenExpandChart}
            customTitle={title}
            customDescription={description}
            isLight={isLight}
          />
        );
      case 'tenure_double_bar':
        return (
          <TenureDoubleBarChart
            key={id}
            records={filteredRecords}
            onExpandChart={handleOpenExpandChart}
            customTitle={title}
            customDescription={description}
            isLight={isLight}
          />
        );
      default:
        // Render custom created charts dynamically
        return (
          <div key={id} className={chartConfig.gridSpan === 'full' ? 'col-span-1 lg:col-span-2' : ''}>
            <DynamicChartRenderer
              config={chartConfig}
              records={filteredRecords}
              onExpandChart={handleOpenExpandChart}
            />
          </div>
        );
    }
  };

  // Determine theme class
  const isLight = customization.isLightMode || customization.theme === 'clean-light' || customization.theme === 'soft-warm';

  const themeBgClass = 
    isLight ? 'bg-slate-100 text-slate-800' :
    customization.theme === 'zinc-dark' ? 'bg-zinc-950 text-zinc-100' :
    customization.theme === 'obsidian' ? 'bg-black text-neutral-100' :
    customization.theme === 'navy-midnight' ? 'bg-blue-950 text-blue-100' :
    'bg-slate-950 text-slate-200';

  // Font scale class
  const fontScaleClass = 
    customization.fontSize === 'sm' ? 'text-[88%]' :
    customization.fontSize === 'lg' ? 'text-[108%]' :
    customization.fontSize === 'xl' ? 'text-[118%]' :
    'text-[100%]';

  return (
    <div className={`min-h-screen ${themeBgClass} ${fontScaleClass} font-sans antialiased pb-12 transition-colors duration-300`}>
      
      {/* Top Header & Navigation */}
      <Header
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        filters={filters}
        setFilters={setFilters}
        customization={customization}
        setCustomization={setCustomization}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenSqliteManager={() => setIsSqliteOpen(true)}
        onOpenPdfModal={() => setIsPdfModalOpen(true)}
        onExportPpt={() => handleExportAllPpt()}
        onOpenManualInputs={() => setIsManualInputOpen(true)}
        availableMonths={availableMonths}
        isExporting={exportStatus.isExporting}
        isPresentationMode={isPresentationMode}
        setIsPresentationMode={setIsPresentationMode}
      />

      {/* Main Dashboard Container */}
      <main id="dashboard-content" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* KPI Summary Cards */}
        {activeSection === 'all_refunds' && (
          <KpiCards 
            kpis={kpis} 
            hasManualOverride={manualInputs.manualTotalCancellationCount !== null} 
            configs={customization.kpiConfigs}
            customization={customization}
          />
        )}

        {/* SECTION 1: Customer Service Work (From PDF) */}
        {activeSection === 'cs_work' && (
          <CSWorkSection
            records={filteredRecords}
            onExpandChart={handleOpenExpandChart}
            isLight={isLight}
          />
        )}

        {/* SECTION 2: All Refunds Dashboard (Grid dynamically populated from customization.chartConfigs) */}
        {activeSection === 'all_refunds' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fadeIn">
            {customization.chartConfigs.map(chart => renderChartById(chart))}
          </div>
        )}

        {/* SECTION 3: Funds Page (صفحة التمويل) */}
        {activeSection === 'funds' && (
          <FundsSection
            records={filteredRecords}
            manualInputs={manualInputs}
            selectedCompany={filters.company}
            onOpenManualInputs={() => setIsManualInputOpen(true)}
            onExpandChart={handleOpenExpandChart}
            isLight={isLight}
          />
        )}

        {/* SECTION 4: Finance Page (صفحة المالية) */}
        {activeSection === 'finance' && (
          <FinanceSection
            records={filteredRecords}
            manualInputs={manualInputs}
            selectedCompany={filters.company}
            onExpandChart={handleOpenExpandChart}
            isLight={isLight}
          />
        )}

      </main>

      {/* Fullscreen Chart Modal */}
      <ChartModal modalState={modalState} onClose={handleCloseChartModal} isLight={isLight}>
        {modalState.chartId === 'yearly_comparison' && (
          <YearlyComparisonChart records={records} onExpandChart={() => {}} isLight={isLight} isFullscreen={true} />
        )}
        {modalState.chartId === 'amount_type_donut' && (
          <AmountTypeDonutChart records={filteredRecords} onExpandChart={() => {}} isLight={isLight} isFullscreen={true} />
        )}
        {modalState.chartId === 'company_pie' && (
          <CompanyPieChart records={filteredRecords} onExpandChart={() => {}} isLight={isLight} isFullscreen={true} />
        )}
        {modalState.chartId === 'company_timeline' && (
          <TimelineChart records={filteredRecords} onExpandChart={() => {}} isLight={isLight} selectedCompany={filters.company} isFullscreen={true} />
        )}
        {modalState.chartId === 'acceptance_waterfall' && (
          <WaterfallChart records={filteredRecords} onExpandChart={() => {}} isLight={isLight} isFullscreen={true} />
        )}
        {modalState.chartId === 'funds_vs_refunds_table' && (
          <FundsVsRefundsTable
            records={filteredRecords}
            manualInputs={manualInputs}
            selectedCompany={filters.company}
            onOpenManualInputs={() => setIsManualInputOpen(true)}
            onExpandChart={() => {}}
            isLight={isLight}
          />
        )}
        {modalState.chartId === 'tenure_double_bar' && (
          <TenureDoubleBarChart records={filteredRecords} onExpandChart={() => {}} isLight={isLight} isFullscreen={true} />
        )}
        {(modalState.chartId === 'cs_company_breakdown' ||
          modalState.chartId === 'cs_company_donut' ||
          modalState.chartId === 'cs_company_metrics_table' ||
          modalState.chartId === 'cs_company_feedback_full') && (
          <CSWorkSection records={filteredRecords} onExpandChart={() => {}} isLight={isLight} standaloneChartId={modalState.chartId} />
        )}
        {(modalState.chartId === 'funds_vs_refunds_barchart' || modalState.chartId === 'funds_distribution_pie') && (
          <FundsSection records={filteredRecords} manualInputs={manualInputs} selectedCompany={filters.company} onOpenManualInputs={() => setIsManualInputOpen(true)} onExpandChart={() => {}} isLight={isLight} standaloneChartId={modalState.chartId} />
        )}
        {(modalState.chartId === 'finance_company_exposure' || modalState.chartId === 'finance_cash_burn_trend' || modalState.chartId === 'finance_settlement_table') && (
          <FinanceSection records={filteredRecords} manualInputs={manualInputs} selectedCompany={filters.company} onExpandChart={() => {}} isLight={isLight} standaloneChartId={modalState.chartId} />
        )}
        {!['yearly_comparison', 'request_donut', 'amount_type_donut', 'default_funnel', 'company_pie', 'company_timeline', 'acceptance_waterfall', 'funds_vs_refunds_table', 'tenure_double_bar', 'cs_company_breakdown', 'cs_company_donut', 'cs_company_metrics_table', 'cs_company_feedback_full', 'funds_vs_refunds_barchart', 'funds_distribution_pie', 'finance_company_exposure', 'finance_cash_burn_trend', 'finance_settlement_table'].includes(modalState.chartId) && customization.chartConfigs.find(c => c.id === modalState.chartId) && (
          <DynamicChartRenderer
            config={customization.chartConfigs.find(c => c.id === modalState.chartId)!}
            records={filteredRecords}
            onExpandChart={() => {}}
          />
        )}
      </ChartModal>

      {/* Manual Inputs Override Modal */}
      <ManualInputModal
        isOpen={isManualInputOpen}
        onClose={() => setIsManualInputOpen(false)}
        manualInputs={manualInputs}
        setManualInputs={setManualInputs}
        autoTotalCancellations={filteredRecords.filter(r => r.status.toLowerCase() === 'cancelled').length}
      />

      {/* File Upload Modal */}
      <FileUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onOpenSqliteManager={() => setIsSqliteOpen(true)}
        onDatasetUpdate={(newRecords) => {
          saveBaselineRecords(newRecords);
          setRecords(newRecords);
        }}
      />

      {/* SQLite Database & Sheets Manager Modal */}
      <SqliteManagerModal
        isOpen={isSqliteOpen}
        onClose={() => setIsSqliteOpen(false)}
        currentRecords={records}
        onDatasetChange={(newRecords) => {
          saveBaselineRecords(newRecords);
          setRecords(newRecords);
        }}
        isLight={isLight}
      />

      {/* PDF & PPT Export Modal */}
      <PdfExportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        activeSection={activeSection}
        filters={filters}
        isLight={isLight}
        onExportSinglePage={handleExportSinglePage}
        onExportAllPages={handleExportAllPages}
        onExportPptAllPages={handleExportAllPpt}
      />

      {/* Hidden Off-screen Render Container for Clean 4-Page PDF & PPT Captures */}
      <div
        id="pdf-export-offscreen-container"
        style={{
          position: 'fixed',
          top: '0',
          left: '-99999px',
          width: '1280px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -9999,
        }}
        className="space-y-12"
      >
          {/* PAGE 1: All Refunds Main Dashboard */}
          <div id="pdf-page-all-refunds" className={`p-8 rounded-2xl space-y-6 ${isLight ? 'bg-slate-100 text-slate-900 border border-slate-300' : 'bg-slate-950 text-white border border-slate-800'}`}>
            <div className="border-b pb-4 border-slate-800 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black text-amber-500">1. All Refunds Executive Dashboard</h1>
                <p className="text-xs text-slate-400">Refunds Project Management & Key KPI Performance Summary</p>
              </div>
              <div className="text-right text-xs text-slate-400 font-mono">
                <span>Filter: Company ({filters.company}) | Month ({formatMonthLabel(filters.requestMonth)})</span>
                <div>Page 1 of 4</div>
              </div>
            </div>
            <KpiCards 
              kpis={kpis} 
              hasManualOverride={manualInputs.manualTotalCancellationCount !== null} 
              configs={customization.kpiConfigs}
              customization={customization}
            />
            <div className="grid grid-cols-2 gap-6">
              {customization.chartConfigs.map(chart => renderChartById(chart))}
            </div>
          </div>

          {/* PAGE 2: Customer Service Work */}
          <div id="pdf-page-cs-work" className={`p-8 rounded-2xl space-y-6 ${isLight ? 'bg-slate-100 text-slate-900 border border-slate-300' : 'bg-slate-950 text-white border border-slate-800'}`}>
            <div className="border-b pb-4 border-slate-800 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black text-cyan-400">2. Customer Service Work Report 2026</h1>
                <p className="text-xs text-slate-400">Default Member Outreach, Reachability Rates & Retained Memberships</p>
              </div>
              <div className="text-right text-xs text-slate-400 font-mono">
                <span>Filter: Company ({filters.company}) | Month ({formatMonthLabel(filters.requestMonth)})</span>
                <div>Page 2 of 4</div>
              </div>
            </div>
            <CSWorkSection records={filteredRecords} onExpandChart={() => {}} isLight={isLight} />
          </div>

          {/* PAGE 3: Funds Section */}
          <div id="pdf-page-funds" className={`p-8 rounded-2xl space-y-6 ${isLight ? 'bg-slate-100 text-slate-900 border border-slate-300' : 'bg-slate-950 text-white border border-slate-800'}`}>
            <div className="border-b pb-4 border-slate-800 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black text-emerald-400">3. Monthly Funds &amp; Financing Matrix 2026</h1>
                <p className="text-xs text-slate-400">Financed Funds vs Refund Amount Comparison per Partner Company</p>
              </div>
              <div className="text-right text-xs text-slate-400 font-mono">
                <span>Filter: Company ({filters.company}) | Month ({formatMonthLabel(filters.requestMonth)})</span>
                <div>Page 3 of 4</div>
              </div>
            </div>
            <FundsSection
              records={filteredRecords}
              manualInputs={manualInputs}
              selectedCompany={filters.company}
              onOpenManualInputs={() => {}}
              onExpandChart={() => {}}
              isLight={isLight}
            />
          </div>

          {/* PAGE 4: Finance Section */}
          <div id="pdf-page-finance" className={`p-8 rounded-2xl space-y-6 ${isLight ? 'bg-slate-100 text-slate-900 border border-slate-300' : 'bg-slate-950 text-white border border-slate-800'}`}>
            <div className="border-b pb-4 border-slate-800 flex justify-between items-center">
              <div>
                <h1 className="text-xl font-black text-amber-400">4. Finance & Cash Liabilities Overview 2026</h1>
                <p className="text-xs text-slate-400">Cheque Pending Obligations, Cancelled Refunds & Audit Settlement Matrix</p>
              </div>
              <div className="text-right text-xs text-slate-400 font-mono">
                <span>Filter: Company ({filters.company}) | Month ({formatMonthLabel(filters.requestMonth)})</span>
                <div>Page 4 of 4</div>
              </div>
            </div>
            <FinanceSection
              records={filteredRecords}
              manualInputs={manualInputs}
              selectedCompany={filters.company}
              isLight={isLight}
            />
          </div>
        </div>

      {/* Floating Active Export Progress Toast */}
      {exportStatus.isExporting && (
        <div className="fixed bottom-6 right-6 z-[99999] max-w-sm px-4 py-3 bg-slate-900/95 border border-indigo-500/70 text-white rounded-2xl shadow-2xl backdrop-blur-md flex items-center gap-3.5 animate-bounce">
          {exportStatus.isDone ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          ) : (
            <Loader2 className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" />
          )}
          <div className="text-left">
            <p className="text-xs font-bold text-slate-100">{exportStatus.title}</p>
            <p className="text-[11px] text-slate-400">{exportStatus.subtitle}</p>
          </div>
        </div>
      )}

    </div>
  );
}
