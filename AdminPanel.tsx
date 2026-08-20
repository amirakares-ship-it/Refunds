import React, { useState, useMemo } from 'react';
import { RefundRecord, DashboardCustomization, ChartConfig, KpiCardConfig } from '../types';
import { saveBaselineRecords } from '../data/seedDataset';
import { 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  RotateCcw, 
  Database, 
  Palette, 
  Layout, 
  BarChart3, 
  Type, 
  Eye, 
  EyeOff, 
  Check, 
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Sliders
} from 'lucide-react';

interface AdminPanelProps {
  records: RefundRecord[];
  setRecords: React.Dispatch<React.SetStateAction<RefundRecord[]>>;
  customization: DashboardCustomization;
  setCustomization: React.Dispatch<React.SetStateAction<DashboardCustomization>>;
  onResetData: () => void;
  onResetCustomization: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  records,
  setRecords,
  customization,
  setCustomization,
  onResetData,
  onResetCustomization,
}) => {
  const [activeTab, setActiveTab] = useState<'data' | 'appearance' | 'kpis' | 'charts' | 'text'>('charts');

  // Record management states & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [editingNo, setEditingNo] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<RefundRecord>>({});
  const [showAddModal, setShowAddModal] = useState(false);

  // Memoized filtered records for high performance
  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return records;
    return records.filter(r => (
      r.clientName.toLowerCase().includes(term) ||
      r.company.toLowerCase().includes(term) ||
      r.nationalId.includes(term) ||
      r.membershipId.includes(term) ||
      String(r.no).includes(term)
    ));
  }, [records, searchTerm]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;

  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page, pageSize]);

  const handleSearchChange = (val: string) => {
    setSearchTerm(val);
    setPage(1);
  };

  // New Record Form State
  const [newRecord, setNewRecord] = useState<Partial<RefundRecord>>({
    company: 'Ollin',
    clientName: '',
    nationalId: '',
    membershipId: '',
    customerId: '',
    acceptanceDate: new Date().toISOString().substring(0, 10),
    acceptanceYear: new Date().getFullYear(),
    amount: 100000,
    type: 'default',
    requestDate: new Date().toISOString().substring(0, 10),
    requestMonth: new Date().toISOString().substring(0, 7),
    status: 'Cancelled',
    reachable: true,
    csFeedback: 'Willing to continue payments',
    feedbackCategory: 'Willing to continue payments',
    reactive: false,
    days: 10,
  });

  // New Chart Form State
  const [newChart, setNewChart] = useState<Partial<ChartConfig>>({
    title: 'Custom Performance Analysis',
    description: 'Custom metric visualization across companies and statuses',
    visible: true,
    dataType: 'ALL',
    metricType: 'amount',
    chartType: 'bar',
    gridSpan: 'half',
  });
  const [showAddChartModal, setShowAddChartModal] = useState(false);

  // Text remover / replacement states
  const [textToRemove, setTextToRemove] = useState('');
  const [textReplacement, setTextReplacement] = useState('');

  const handleDelete = (no: number) => {
    if (confirm(`Are you sure you want to delete record #${no}?`)) {
      setRecords(prev => prev.filter(r => r.no !== no));
    }
  };

  const handleStartEdit = (record: RefundRecord) => {
    setEditingNo(record.no);
    setEditForm({ ...record });
  };

  const handleSaveEdit = () => {
    if (!editingNo) return;
    setRecords(prev =>
      prev.map(r => (r.no === editingNo ? ({ ...r, ...editForm } as RefundRecord) : r))
    );
    setEditingNo(null);
  };

  const handleAddRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const maxNo = records.reduce((max, r) => (r.no > max ? r.no : max), 0);
    const created: RefundRecord = {
      no: maxNo + 1,
      company: newRecord.company || 'Ollin',
      clientName: newRecord.clientName || 'New Client',
      nationalId: newRecord.nationalId || '',
      membershipId: newRecord.membershipId || '',
      customerId: newRecord.customerId || '',
      acceptanceDate: newRecord.acceptanceDate || '2025-01-01',
      acceptanceYear: newRecord.acceptanceYear || 2025,
      amount: newRecord.amount || 0,
      type: newRecord.type || 'default',
      requestDate: newRecord.requestDate || '2026-01-01',
      requestMonth: newRecord.requestMonth || '2026-01',
      sendDate: newRecord.sendDate || '',
      csFeedback: newRecord.csFeedback || '',
      feedbackCategory: newRecord.feedbackCategory || '',
      reachable: !!newRecord.reachable,
      csDate: newRecord.csDate || '',
      action: newRecord.action || '',
      actionDate: newRecord.actionDate || '',
      status: newRecord.status || 'Cancelled',
      isCancellationOutcome: newRecord.status === 'Cancelled',
      cancellationDate: newRecord.cancellationDate || '',
      reactive: !!newRecord.reactive,
      days: newRecord.days || 0,
      willPay: newRecord.willPay || '',
      reminderFromCom: newRecord.reminderFromCom || '',
    };

    setRecords(prev => [created, ...prev]);
    setShowAddModal(false);
  };

  // Customization Handlers
  const handleToggleChartVisibility = (id: string) => {
    setCustomization(prev => ({
      ...prev,
      chartConfigs: prev.chartConfigs.map(c =>
        c.id === id ? { ...c, visible: !c.visible } : c
      ),
    }));
  };

  const handleDeleteChart = (id: string) => {
    if (confirm('Delete this chart from the dashboard?')) {
      setCustomization(prev => ({
        ...prev,
        chartConfigs: prev.chartConfigs.filter(c => c.id !== id),
      }));
    }
  };

  const handleUpdateChart = (id: string, updates: Partial<ChartConfig>) => {
    setCustomization(prev => ({
      ...prev,
      chartConfigs: prev.chartConfigs.map(c =>
        c.id === id ? { ...c, ...updates } : c
      ),
    }));
  };

  const handleAddChartSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const createdChart: ChartConfig = {
      id: `custom_chart_${Date.now()}`,
      title: newChart.title || 'New Dynamic Chart',
      description: newChart.description || 'Custom visualization',
      visible: true,
      dataType: newChart.dataType || 'ALL',
      metricType: newChart.metricType || 'amount',
      chartType: newChart.chartType || 'bar',
      gridSpan: newChart.gridSpan || 'half',
    };

    setCustomization(prev => ({
      ...prev,
      chartConfigs: [...prev.chartConfigs, createdChart],
    }));
    setShowAddChartModal(false);
  };

  const handleUpdateKpi = (kpiId: string, updates: Partial<KpiCardConfig>) => {
    setCustomization(prev => ({
      ...prev,
      kpiConfigs: {
        ...prev.kpiConfigs,
        [kpiId]: {
          ...prev.kpiConfigs[kpiId],
          ...updates,
        },
      },
    }));
  };

  const handleAddTextOverride = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textToRemove.trim()) return;
    setCustomization(prev => ({
      ...prev,
      textOverrides: {
        ...prev.textOverrides,
        [textToRemove.trim()]: textReplacement,
      },
    }));
    setTextToRemove('');
    setTextReplacement('');
  };

  const handleRemoveTextOverride = (key: string) => {
    setCustomization(prev => {
      const copy = { ...prev.textOverrides };
      delete copy[key];
      return { ...prev, textOverrides: copy };
    });
  };

  return (
    <div className="bg-slate-900 rounded-2xl border border-amber-500/40 shadow-2xl p-6 mb-8 mt-4 animate-fadeIn text-slate-200">
      
      {/* Admin Panel Top Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">Full Control Admin Panel</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                لوحة التحكم الكاملة
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Customize fonts, theme colors, add/delete charts, choose data metrics, edit card titles, and replace any text.
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('charts')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'charts' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Charts & Visuals ({customization.chartConfigs.length})
          </button>

          <button
            onClick={() => setActiveTab('appearance')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'appearance' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            Theme & Font
          </button>

          <button
            onClick={() => setActiveTab('kpis')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'kpis' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            KPI Cards
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'text' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            Text Remover
          </button>

          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
              activeTab === 'data' ? 'bg-amber-500 text-slate-950 shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            Raw Records ({records.length})
          </button>
        </div>
      </div>

      {/* TAB 1: CHARTS MANAGEMENT */}
      {activeTab === 'charts' && (
        <div className="pt-5 space-y-5 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                Chart & Visual Component Management
              </h3>
              <p className="text-xs text-slate-400">
                Add new charts, modify titles, select dataset metrics (Default, Request, or ALL), or remove/hide unwanted charts.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddChartModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add Custom Chart (إضافة رسم بياني)
              </button>
              <button
                onClick={onResetCustomization}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Layout
              </button>
            </div>
          </div>

          {/* List of Configured Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customization.chartConfigs.map((chart) => (
              <div
                key={chart.id}
                className={`p-4 rounded-xl border transition-all ${
                  chart.visible
                    ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                    : 'bg-slate-950/30 border-slate-800/40 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase">
                        {chart.chartType}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">
                        {chart.dataType} Data
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                        {chart.metricType}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={chart.title}
                      onChange={(e) => handleUpdateChart(chart.id, { title: e.target.value })}
                      className="mt-2 text-sm font-bold text-white bg-slate-900 border border-slate-700 rounded px-2 py-1 w-full focus:outline-none focus:border-amber-500"
                      placeholder="Chart Title"
                    />
                    <input
                      type="text"
                      value={chart.description}
                      onChange={(e) => handleUpdateChart(chart.id, { description: e.target.value })}
                      className="mt-1 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 rounded px-2 py-0.5 w-full focus:outline-none focus:border-amber-500"
                      placeholder="Chart Description"
                    />
                  </div>

                  <div className="flex items-center space-x-1 pt-1">
                    <button
                      onClick={() => handleToggleChartVisibility(chart.id)}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        chart.visible
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                      title={chart.visible ? 'Hide Chart' : 'Show Chart'}
                    >
                      {chart.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDeleteChart(chart.id)}
                      className="p-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-lg border border-red-500/30 transition-colors"
                      title="Delete Chart"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Configuration Options Row */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                  <div>
                    <label className="text-slate-400 font-semibold block mb-0.5">Data Scope</label>
                    <select
                      value={chart.dataType}
                      onChange={(e) => handleUpdateChart(chart.id, { dataType: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white"
                    >
                      <option value="ALL">ALL Status / Types</option>
                      <option value="default">Default Type Only</option>
                      <option value="Request">Request Type Only</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-0.5">Metric</label>
                    <select
                      value={chart.metricType}
                      onChange={(e) => handleUpdateChart(chart.id, { metricType: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white"
                    >
                      <option value="amount">EGP Amount</option>
                      <option value="count">Record Count</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 font-semibold block mb-0.5">Chart Type</label>
                    <select
                      value={chart.chartType}
                      onChange={(e) => handleUpdateChart(chart.id, { chartType: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded p-1 text-white"
                    >
                      <option value="donut">Donut Chart</option>
                      <option value="pie">Pie Chart</option>
                      <option value="bar">Bar Chart</option>
                      <option value="line">Line / Timeline</option>
                      <option value="funnel">Funnel Stages</option>
                      <option value="waterfall">Waterfall</option>
                      <option value="table">Matrix Table</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: THEME & LIGHT/DARK MODE */}
      {activeTab === 'appearance' && (
        <div className="pt-5 space-y-6 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Light / Dark Mode Quick Switch */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sun className="w-4 h-4 text-amber-400" />
                Theme Mode (فاتح / داكن)
              </h3>
              <p className="text-xs text-slate-400">Choose between Light Mode and Dark Mode for the dashboard.</p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCustomization(prev => ({ ...prev, isLightMode: false, theme: 'slate-dark' }))}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all ${
                    !customization.isLightMode && customization.theme !== 'clean-light' && customization.theme !== 'soft-warm'
                      ? 'border-amber-500 bg-amber-500/10 text-white shadow-md'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <span>Dark Mode (داكن)</span>
                </button>

                <button
                  onClick={() => setCustomization(prev => ({ ...prev, isLightMode: true, theme: 'clean-light' }))}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-2 transition-all ${
                    customization.isLightMode || customization.theme === 'clean-light' || customization.theme === 'soft-warm'
                      ? 'border-amber-500 bg-amber-500/10 text-white shadow-md'
                      : 'border-slate-800 bg-slate-900 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <Sun className="w-5 h-5 text-amber-400" />
                  <span>Light Mode (فاتح)</span>
                </button>
              </div>

              <div className="pt-2">
                <label className="text-[11px] font-semibold text-slate-400 block mb-1.5">Color Palette Selection:</label>
                <div className="space-y-1.5">
                  {[
                    { id: 'slate-dark', name: 'Slate Dark (Classic Navy)', preview: 'bg-slate-950 border-slate-700', isLight: false },
                    { id: 'zinc-dark', name: 'Zinc Dark (Modern Gray)', preview: 'bg-zinc-950 border-zinc-700', isLight: false },
                    { id: 'obsidian', name: 'Obsidian Jet Black', preview: 'bg-black border-neutral-800', isLight: false },
                    { id: 'navy-midnight', name: 'Midnight Blue Canvas', preview: 'bg-blue-950 border-blue-800', isLight: false },
                    { id: 'clean-light', name: 'Clean Light (فاتح ناصع)', preview: 'bg-slate-100 border-slate-300', isLight: true },
                    { id: 'soft-warm', name: 'Soft Warm Light (فاتح دافئ)', preview: 'bg-amber-50 border-amber-300', isLight: true },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setCustomization(prev => ({ ...prev, theme: t.id as any, isLightMode: t.isLight }))}
                      className={`w-full p-2 rounded-lg border text-xs font-bold text-left flex items-center justify-between transition-all ${
                        customization.theme === t.id
                          ? 'border-amber-500 bg-amber-500/10 text-white'
                          : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className={`w-3.5 h-3.5 rounded-full border ${t.preview}`}></div>
                        <span>{t.name}</span>
                      </div>
                      {customization.theme === t.id && <Check className="w-3.5 h-3.5 text-amber-400" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Accent Highlight Color */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                Accent Highlight Color
              </h3>
              <p className="text-xs text-slate-400">Primary highlight color for active buttons and cards.</p>
              
              <div className="space-y-2">
                {[
                  { id: 'blue', name: 'Royal Blue Accent', color: 'bg-blue-500' },
                  { id: 'emerald', name: 'Emerald Green Accent', color: 'bg-emerald-500' },
                  { id: 'purple', name: 'Violet Purple Accent', color: 'bg-purple-500' },
                  { id: 'amber', name: 'Warm Amber Gold Accent', color: 'bg-amber-500' },
                  { id: 'cyan', name: 'Cyan Blue Accent', color: 'bg-cyan-500' },
                ].map((a) => (
                  <button
                    key={a.id}
                    onClick={() => setCustomization(prev => ({ ...prev, accentColor: a.id as any }))}
                    className={`w-full p-2.5 rounded-lg border text-xs font-bold text-left flex items-center justify-between transition-all ${
                      customization.accentColor === a.id
                        ? 'border-amber-500 bg-amber-500/10 text-white'
                        : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className={`w-4 h-4 rounded-full ${a.color}`}></div>
                      <span>{a.name}</span>
                    </div>
                    {customization.accentColor === a.id && <Check className="w-4 h-4 text-amber-400" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Font Size Scale */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
                  <Type className="w-4 h-4 text-amber-400" />
                  Font Scale (حجم الخط العام)
                </h3>
                <p className="text-xs text-slate-400 mb-3">Adjust overall dashboard typography scale.</p>

                <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
                  {[
                    { id: 'sm', label: 'Small (85%)' },
                    { id: 'md', label: 'Medium (100%)' },
                    { id: 'lg', label: 'Large (115%)' },
                    { id: 'xl', label: 'Extra (125%)' },
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setCustomization(prev => ({ ...prev, fontSize: f.id as any }))}
                      className={`p-2 rounded-lg font-bold border transition-all ${
                        customization.fontSize === f.id
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {f.id.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* TAB 3: KPI CARDS MANAGEMENT */}
      {activeTab === 'kpis' && (
        <div className="pt-5 space-y-4 animate-fadeIn">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Layout className="w-4 h-4 text-amber-400" />
              KPI Header Cards Control
            </h3>
            <p className="text-xs text-slate-400">
              Customize card titles, badge labels, and show/hide individual KPI metrics.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(Object.values(customization.kpiConfigs) as KpiCardConfig[]).map((kpi) => (
              <div key={kpi.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{kpi.id}</span>
                  <button
                    onClick={() => handleUpdateKpi(kpi.id, { visible: !kpi.visible })}
                    className={`px-2.5 py-1 rounded text-xs font-bold flex items-center gap-1 border ${
                      kpi.visible
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                        : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}
                  >
                    {kpi.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {kpi.visible ? 'Visible' : 'Hidden'}
                  </button>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Card Title</label>
                  <input
                    type="text"
                    value={kpi.title}
                    onChange={(e) => handleUpdateKpi(kpi.id, { title: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Badge Text / Status Label (نص أو حالة الشارة)</label>
                  <input
                    type="text"
                    value={kpi.badgeText}
                    onChange={(e) => handleUpdateKpi(kpi.id, { badgeText: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="Enter custom badge label or choose preset below..."
                  />

                  {/* Preset Badges Quick Buttons */}
                  <div className="flex flex-wrap gap-1.5 pt-2">
                    {[
                      'Cancelled & Pending',
                      'Cancelled Only',
                      'Cheque Pending Only',
                      'Default + Request',
                      'Live Count',
                      'Hidden'
                    ].map((badgeOption) => (
                      <button
                        key={badgeOption}
                        type="button"
                        onClick={() => handleUpdateKpi(kpi.id, { badgeText: badgeOption })}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-all ${
                          kpi.badgeText === badgeOption
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        {badgeOption === 'Hidden' ? 'إخفاء (Hide)' : badgeOption}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: TEXT STYLING, COLORS & REPLACEMENTS */}
      {activeTab === 'text' && (
        <div className="pt-5 space-y-6 animate-fadeIn">
          
          {/* Section A: Header Title & Subtitle Styling */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Type className="w-4 h-4 text-amber-400" />
              Main Dashboard Title & Subtitle (تنسيق وتلوين العنوان الرئيسي)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Header Title Controls */}
              <div className="space-y-3 bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                <label className="block text-xs font-bold text-slate-200">Main Title Text (العنوان الرئيسي)</label>
                <input
                  type="text"
                  value={customization.headerTitle}
                  onChange={(e) => setCustomization(prev => ({ ...prev, headerTitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-slate-400 font-semibold">Title Color (لون العنوان):</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customization.headerTitleColor || '#ffffff'}
                      onChange={(e) => setCustomization(prev => ({ ...prev, headerTitleColor: e.target.value }))}
                      className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-slate-950"
                    />
                    <span className="text-xs font-mono text-slate-300">{customization.headerTitleColor || '#ffffff'}</span>
                  </div>
                </div>

                {/* Color Swatch Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {['#ffffff', '#fbbf24', '#60a5fa', '#34d399', '#f43f5e', '#a855f7', '#0f172a'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCustomization(prev => ({ ...prev, headerTitleColor: c }))}
                      className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={`Select ${c}`}
                    />
                  ))}
                </div>

                <div className="pt-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">Title Font Size (حجم الخط):</label>
                  <div className="grid grid-cols-5 gap-1 text-center text-xs">
                    {['sm', 'md', 'lg', 'xl', '2xl'].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setCustomization(prev => ({ ...prev, headerTitleSize: sz as any }))}
                        className={`p-1.5 rounded font-bold border transition-all ${
                          (customization.headerTitleSize || 'xl') === sz
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        {sz.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Subtitle Controls */}
              <div className="space-y-3 bg-slate-900 p-3.5 rounded-lg border border-slate-800">
                <label className="block text-xs font-bold text-slate-200">Subtitle Text (العنوان الفرعي)</label>
                <input
                  type="text"
                  value={customization.headerSubtitle}
                  onChange={(e) => setCustomization(prev => ({ ...prev, headerSubtitle: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                />

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs text-slate-400 font-semibold">Subtitle Color (لون العنوان الفرعي):</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customization.headerSubtitleColor || '#94a3b8'}
                      onChange={(e) => setCustomization(prev => ({ ...prev, headerSubtitleColor: e.target.value }))}
                      className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-slate-950"
                    />
                    <span className="text-xs font-mono text-slate-300">{customization.headerSubtitleColor || '#94a3b8'}</span>
                  </div>
                </div>

                {/* Color Swatch Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {['#94a3b8', '#cbd5e1', '#ffffff', '#f59e0b', '#3b82f6', '#10b981', '#64748b'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCustomization(prev => ({ ...prev, headerSubtitleColor: c }))}
                      className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                      title={`Select ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section B: KPI Cards Typography & Colors */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              KPI Cards & Metrics Typography (تنسيق وألوان كروت البيانات)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* KPI Titles Color */}
              <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-200">KPI Card Titles Color (لون عناوين كروت البيانات)</label>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customization.kpiTitleColor || '#94a3b8'}
                      onChange={(e) => setCustomization(prev => ({ ...prev, kpiTitleColor: e.target.value }))}
                      className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-slate-950"
                    />
                    <span className="text-xs font-mono text-slate-300">{customization.kpiTitleColor || '#94a3b8'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomization(prev => ({ ...prev, kpiTitleColor: '#94a3b8' }))}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    Reset Default
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {['#94a3b8', '#ffffff', '#fbbf24', '#60a5fa', '#34d399', '#f43f5e', '#a855f7'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCustomization(prev => ({ ...prev, kpiTitleColor: c }))}
                      className="w-5 h-5 rounded-full border border-slate-600 hover:scale-110 transition-transform"
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              {/* KPI Numbers / Values Styling */}
              <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-800 space-y-3">
                <label className="block text-xs font-bold text-slate-200">KPI Numbers Color & Size (تنسيق أرقام وقيم البيانات)</label>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customization.kpiValueColor || '#ffffff'}
                      onChange={(e) => setCustomization(prev => ({ ...prev, kpiValueColor: e.target.value }))}
                      className="w-8 h-8 rounded border border-slate-700 cursor-pointer bg-slate-950"
                    />
                    <span className="text-xs font-mono text-slate-300">{customization.kpiValueColor || '#ffffff'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCustomization(prev => ({ ...prev, kpiValueColor: '#ffffff' }))}
                    className="text-[10px] text-amber-400 hover:underline"
                  >
                    Reset Default
                  </button>
                </div>

                <div className="pt-1">
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Numbers Size (حجم أرقام الـ KPI):</label>
                  <div className="grid grid-cols-4 gap-1 text-center text-xs">
                    {['sm', 'md', 'lg', '3xl'].map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setCustomization(prev => ({ ...prev, kpiValueSize: sz as any }))}
                        className={`p-1.5 rounded font-bold border transition-all ${
                          (customization.kpiValueSize || 'lg') === sz
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        {sz.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Word Remover & Text Replacement Rules */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Type className="w-4 h-4 text-amber-400" />
              Word Remover & Text Replacement (استبدال وحذف أي كلمة)
            </h3>
            <p className="text-xs text-slate-400">
              Enter any word or sentence to remove it completely or replace it with custom wording across the dashboard.
            </p>

            <form onSubmit={handleAddTextOverride} className="flex flex-col sm:flex-row items-center gap-2">
              <input
                type="text"
                required
                placeholder="Target word/phrase to find (e.g., 'Total Cancellations')"
                value={textToRemove}
                onChange={(e) => setTextToRemove(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white flex-1 focus:outline-none focus:border-amber-500"
              />
              <input
                type="text"
                placeholder="Replace with (Leave empty to delete/remove word)"
                value={textReplacement}
                onChange={(e) => setTextReplacement(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white flex-1 focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors whitespace-nowrap"
              >
                Apply Rule
              </button>
            </form>
          </div>

          {/* Active Replacement Rules List */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <h4 className="text-xs font-bold text-slate-300 mb-3">Active Replacement / Removal Rules:</h4>
            {Object.keys(customization.textOverrides).length === 0 ? (
              <p className="text-xs text-slate-500 italic">No text replacement rules active.</p>
            ) : (
              <div className="space-y-2">
                {Object.entries(customization.textOverrides).map(([findText, replaceText]) => (
                  <div key={findText} className="flex items-center justify-between p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-xs">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-rose-400 line-through">{findText}</span>
                      <span className="text-slate-500">→</span>
                      <span className="font-bold text-emerald-400">
                        {replaceText ? `"${replaceText}"` : '(Removed)'}
                      </span>
                    </div>
                    <button
                      onClick={() => handleRemoveTextOverride(findText)}
                      className="text-slate-400 hover:text-red-400 p-1"
                      title="Remove Rule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: RAW DATA MANAGEMENT */}
      {activeTab === 'data' && (
        <div className="pt-5 space-y-4 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-amber-400" />
                Dataset Record Editor
              </h3>
              <p className="text-xs text-slate-400">
                Directly add, edit, or delete refund rows in the active dataset.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add New Record
              </button>
              <button
                onClick={() => {
                  saveBaselineRecords(records);
                  alert('Current dataset successfully saved as new baseline! Clicking "Reset Data" will now restore this dataset.');
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors shadow-sm"
                title="Save current dataset as default baseline for Reset Data"
              >
                <Check className="w-3.5 h-3.5" />
                Set as Baseline
              </button>
              <button
                onClick={onResetData}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Data
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 max-w-md">
            <Search className="w-4 h-4 text-slate-400 mr-2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by client name, company, ID, or No..."
              className="bg-transparent text-xs text-white placeholder-slate-500 w-full focus:outline-none"
            />
          </div>

          {/* Data Table */}
          <div className="overflow-x-auto max-h-96 border border-slate-800 rounded-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-bold sticky top-0 z-10 border-b border-slate-800 text-[10px] uppercase tracking-wider">
                <tr>
                  <th className="p-3">No.</th>
                  <th className="p-3">Company</th>
                  <th className="p-3">Client Name</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3">Type</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Req. Date</th>
                  <th className="p-3">Reachable</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-900 font-mono text-[11px]">
                {paginatedRecords.map(r => (
                  <tr key={r.no} className="hover:bg-slate-800/50 transition-colors">
                    {editingNo === r.no ? (
                      <>
                        <td className="p-2 font-bold text-white">{r.no}</td>
                        <td className="p-2">
                          <select
                            value={editForm.company || r.company}
                            onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                            className="bg-slate-950 border border-slate-700 text-white rounded p-1 text-xs"
                          >
                            <option value="Ollin" className="bg-slate-900">Ollin</option>
                            <option value="Premium" className="bg-slate-900">Premium</option>
                            <option value="Aman" className="bg-slate-900">Aman</option>
                            <option value="Contact" className="bg-slate-900">Contact</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={editForm.clientName || r.clientName}
                            onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                            className="bg-slate-950 border border-slate-700 text-white rounded p-1 text-xs w-full"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="number"
                            value={editForm.amount || r.amount}
                            onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })}
                            className="bg-slate-950 border border-slate-700 text-white rounded p-1 text-xs w-24"
                          />
                        </td>
                        <td className="p-2">
                          <select
                            value={editForm.type || r.type}
                            onChange={(e) => setEditForm({ ...editForm, type: e.target.value as any })}
                            className="bg-slate-950 border border-slate-700 text-white rounded p-1 text-xs"
                          >
                            <option value="default" className="bg-slate-900">default</option>
                            <option value="Request" className="bg-slate-900">Request</option>
                          </select>
                        </td>
                        <td className="p-2">
                          <select
                            value={editForm.status || r.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            className="bg-slate-950 border border-slate-700 text-white rounded p-1 text-xs"
                          >
                            <option value="Cancelled" className="bg-slate-900">Cancelled</option>
                            <option value="Cheque pending" className="bg-slate-900">Cheque pending</option>
                            <option value="Retained" className="bg-slate-900">Retained</option>
                            <option value="Pending" className="bg-slate-900">Pending</option>
                          </select>
                        </td>
                        <td className="p-2">{r.requestDate}</td>
                        <td className="p-2">{r.reachable ? 'Yes' : 'No'}</td>
                        <td className="p-2 text-right space-x-1">
                          <button onClick={handleSaveEdit} className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-sans text-[10px]">
                            Save
                          </button>
                          <button onClick={() => setEditingNo(null)} className="px-2 py-1 bg-slate-800 text-slate-300 rounded font-sans text-[10px]">
                            Cancel
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-3 font-bold text-white">{r.no}</td>
                        <td className="p-3 font-sans font-semibold text-slate-200">{r.company}</td>
                        <td className="p-3 font-sans font-medium text-slate-300">{r.clientName}</td>
                        <td className="p-3 font-bold text-white">{r.amount.toLocaleString()}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.type === 'Request' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30' : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}>
                            {r.type}
                          </span>
                        </td>
                        <td className="p-3 font-sans">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'Cancelled' ? 'bg-red-500/20 text-red-300 border border-red-500/30' :
                            r.status === 'Cheque pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                            r.status === 'Retained' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800 text-slate-300'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="p-3">{r.requestDate || '-'}</td>
                        <td className="p-3">{r.reachable ? 'True' : 'False'}</td>
                        <td className="p-3 text-right space-x-2 font-sans">
                          <button onClick={() => handleStartEdit(r)} className="text-blue-400 hover:text-blue-300">
                            <Edit2 className="w-3.5 h-3.5 inline" />
                          </button>
                          <button onClick={() => handleDelete(r.no)} className="text-rose-400 hover:text-rose-300">
                            <Trash2 className="w-3.5 h-3.5 inline" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-400">
            <div>
              Showing <span className="font-bold text-white">{filteredRecords.length === 0 ? 0 : (page - 1) * pageSize + 1}</span> to{' '}
              <span className="font-bold text-white">{Math.min(page * pageSize, filteredRecords.length)}</span> of{' '}
              <span className="font-bold text-white">{filteredRecords.length}</span> records
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="font-mono text-slate-200 text-xs px-2">
                Page <span className="font-bold text-amber-400">{page}</span> of <span className="font-bold text-white">{totalPages}</span>
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 disabled:opacity-40 hover:bg-slate-800 transition-colors"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD CUSTOM CHART */}
      {showAddChartModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-800 text-slate-200">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-amber-400" />
              Add New Custom Chart (يزود Chart)
            </h3>
            <form onSubmit={handleAddChartSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Chart Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Monthly Retention Rate"
                  value={newChart.title}
                  onChange={(e) => setNewChart({ ...newChart, title: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Description / Subtitle</label>
                <input
                  type="text"
                  placeholder="e.g. Percentage of retained members by company"
                  value={newChart.description}
                  onChange={(e) => setNewChart({ ...newChart, description: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Data Scope (يختار البيانات)</label>
                  <select
                    value={newChart.dataType}
                    onChange={(e) => setNewChart({ ...newChart, dataType: e.target.value as any })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="ALL">ALL (Default + Request)</option>
                    <option value="default">Default Type Only</option>
                    <option value="Request">Request Type Only</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Metric Type</label>
                  <select
                    value={newChart.metricType}
                    onChange={(e) => setNewChart({ ...newChart, metricType: e.target.value as any })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="amount">Amount (EGP)</option>
                    <option value="count">Record Count</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Visualization Type</label>
                  <select
                    value={newChart.chartType}
                    onChange={(e) => setNewChart({ ...newChart, chartType: e.target.value as any })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="donut">Donut Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="line">Line Chart</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">Grid Layout Span</label>
                  <select
                    value={newChart.gridSpan}
                    onChange={(e) => setNewChart({ ...newChart, gridSpan: e.target.value as any })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="half">Half Width (2-Column Grid)</option>
                    <option value="full">Full Width Row</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddChartModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-lg border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-500"
                >
                  Add Chart To Dashboard
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NEW RECORD */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl border border-slate-800 text-slate-200">
            <h3 className="text-lg font-bold text-white mb-4">Add New Refund Record</h3>
            <form onSubmit={handleAddRecord} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">Company</label>
                <select
                  value={newRecord.company}
                  onChange={(e) => setNewRecord({ ...newRecord, company: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                >
                  <option value="Ollin" className="bg-slate-900">Ollin</option>
                  <option value="Premium" className="bg-slate-900">Premium</option>
                  <option value="Aman" className="bg-slate-900">Aman</option>
                  <option value="Contact" className="bg-slate-900">Contact</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-300 mb-1">Client Name</label>
                <input
                  type="text"
                  required
                  value={newRecord.clientName}
                  onChange={(e) => setNewRecord({ ...newRecord, clientName: e.target.value })}
                  className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Amount (EGP)</label>
                  <input
                    type="number"
                    required
                    value={newRecord.amount}
                    onChange={(e) => setNewRecord({ ...newRecord, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Type</label>
                  <select
                    value={newRecord.type}
                    onChange={(e) => setNewRecord({ ...newRecord, type: e.target.value as any })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="default" className="bg-slate-900">default</option>
                    <option value="Request" className="bg-slate-900">Request</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Status</label>
                  <select
                    value={newRecord.status}
                    onChange={(e) => setNewRecord({ ...newRecord, status: e.target.value })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="Cancelled" className="bg-slate-900">Cancelled</option>
                    <option value="Cheque pending" className="bg-slate-900">Cheque pending</option>
                    <option value="Retained" className="bg-slate-900">Retained</option>
                    <option value="Pending" className="bg-slate-900">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-300 mb-1">Request Date</label>
                  <input
                    type="date"
                    value={newRecord.requestDate}
                    onChange={(e) => setNewRecord({ 
                      ...newRecord, 
                      requestDate: e.target.value,
                      requestMonth: e.target.value.substring(0, 7)
                    })}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold rounded-lg border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-500"
                >
                  Add Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

