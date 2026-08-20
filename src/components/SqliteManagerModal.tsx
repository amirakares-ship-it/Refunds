import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  HardDrive, 
  Table, 
  CheckCircle2, 
  Trash2, 
  Upload, 
  Play, 
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  Sparkles, 
  Layers, 
  Terminal,
  AlertCircle,
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { 
  StoredSheetInfo, 
  getAllStoredSheets, 
  saveSheetToSqlite, 
  setActiveSheetInSqlite, 
  deleteSheetFromSqlite, 
  resetSqliteToDefault,
  exportSqliteDumpSql,
  executeClientSqlQuery
} from '../utils/sqliteStore';
import { parseCsvToRecords, parseExcelToRecords } from '../utils/csvParser';
import { RefundRecord } from '../types';

interface SqliteManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRecords: RefundRecord[];
  onDatasetChange: (records: RefundRecord[]) => void;
  isLight?: boolean;
}

export const SqliteManagerModal: React.FC<SqliteManagerModalProps> = ({
  isOpen,
  onClose,
  currentRecords,
  onDatasetChange,
  isLight = false,
}) => {
  if (!isOpen) return null;

  const [sheets, setSheets] = useState<StoredSheetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'sheets' | 'query' | 'export'>('sheets');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // SQL Query Console State
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT company, COUNT(*) as total_cases, SUM(amount) as total_egp FROM refund_records GROUP BY company'
  );
  const [queryResult, setQueryResult] = useState<{
    columns: string[];
    rows: any[];
    totalRows: number;
    error?: string;
  } | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  // Upload State inside modal
  const [isUploading, setIsUploading] = useState(false);

  // Load sheets on mount
  const loadSheets = async () => {
    try {
      setLoading(true);
      const list = await getAllStoredSheets();
      setSheets(list);
    } catch (e: any) {
      setMessage({ type: 'error', text: `Failed to load SQLite sheets: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheets();
  }, []);

  const handleSetActive = async (sheet: StoredSheetInfo) => {
    try {
      setLoading(true);
      const updatedRecords = await setActiveSheetInSqlite(sheet.id);
      onDatasetChange(updatedRecords);
      setMessage({ type: 'success', text: `Active dataset switched to "${sheet.fileName}" (${updatedRecords.length} rows loaded from SQLite)` });
      await loadSheets();
    } catch (e: any) {
      setMessage({ type: 'error', text: `Failed to switch active dataset: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sheetId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}" from SQLite database?`)) return;
    try {
      setLoading(true);
      await deleteSheetFromSqlite(sheetId);
      setMessage({ type: 'success', text: `Deleted "${fileName}" from SQLite database.` });
      await loadSheets();
    } catch (e: any) {
      setMessage({ type: 'error', text: `Failed to delete sheet: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleResetToBaseline = async () => {
    if (!window.confirm('Reset SQLite database to original baseline dataset?')) return;
    try {
      setLoading(true);
      const baseline = await resetSqliteToDefault();
      onDatasetChange(baseline);
      setMessage({ type: 'success', text: 'SQLite database successfully reset to original baseline dataset!' });
      await loadSheets();
    } catch (e: any) {
      setMessage({ type: 'error', text: `Reset failed: ${e.message}` });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setMessage(null);
      const ext = file.name.split('.').pop()?.toLowerCase();
      let records: RefundRecord[] = [];

      if (ext === 'csv') {
        const text = await file.text();
        records = parseCsvToRecords(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        records = parseExcelToRecords(buffer);
      } else {
        setMessage({ type: 'error', text: 'Please upload a valid .csv or .xlsx Excel file.' });
        return;
      }

      if (!records || records.length === 0) {
        setMessage({ type: 'error', text: 'No valid records found in the uploaded file.' });
        return;
      }

      // Save into SQLite Database
      const newSheet = await saveSheetToSqlite(file.name, records, true);
      onDatasetChange(records);
      setMessage({
        type: 'success',
        text: `Sheet "${file.name}" saved into SQLite database! (${records.length} records, EGP ${(newSheet.totalAmount / 1e6).toFixed(2)}M)`,
      });
      await loadSheets();
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to import to SQLite: ${err?.message || 'Error'}` });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleRunQuery = async () => {
    setIsExecuting(true);
    try {
      const result = await executeClientSqlQuery(sqlQuery, currentRecords);
      setQueryResult(result);
    } catch (err: any) {
      setQueryResult({ columns: [], rows: [], totalRows: 0, error: err.message });
    } finally {
      setIsExecuting(false);
    }
  };

  const handleExportSqlDump = async () => {
    try {
      const sqlDump = await exportSqliteDumpSql();
      const blob = new Blob([sqlDump], { type: 'text/sql;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `refunds_sqlite_backup_${new Date().toISOString().slice(0, 10)}.sql`;
      link.click();
      URL.revokeObjectURL(url);
      setMessage({ type: 'success', text: 'SQLite database .sql dump downloaded successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: `Failed to export SQL: ${err.message}` });
    }
  };

  const handleExportQueryResultCsv = () => {
    if (!queryResult || !queryResult.rows.length) return;
    const header = queryResult.columns.join(',');
    const rows = queryResult.rows.map(r => queryResult.columns.map(c => JSON.stringify(r[c] ?? '')).join(','));
    const csvContent = [header, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sql_query_result_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const totalStoredRecords = sheets.reduce((acc, s) => acc + s.rowCount, 0);
  const activeSheet = sheets.find(s => s.isActive);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className={`w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border ${
        isLight ? 'bg-slate-50 text-slate-900 border-slate-300' : 'bg-slate-900 text-slate-100 border-slate-800'
      }`}>
        
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black tracking-tight flex items-center gap-1.5">
                  SQLite Database & Saved Sheets
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <ShieldCheck className="w-3 h-3" /> SQLite Storage Active
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Every uploaded Excel & CSV dataset is permanently stored in SQLite tables
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors ${
              isLight ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-200' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className={`px-6 py-2.5 border-b flex items-center justify-between gap-3 ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-900/60 border-slate-800'
        }`}>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('sheets')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'sheets'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Saved Datasets ({sheets.length})
            </button>
            <button
              onClick={() => {
                setActiveTab('query');
                if (!queryResult) handleRunQuery();
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'query'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              SQL Query Console
            </button>
            <button
              onClick={() => setActiveTab('export')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'export'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : isLight ? 'text-slate-600 hover:bg-slate-200' : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              <FileCode className="w-3.5 h-3.5" />
              SQL Backup & DDL
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <HardDrive className="w-3.5 h-3.5 text-blue-400" />
              <span>{sheets.length} Sheets</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Table className="w-3.5 h-3.5 text-emerald-400" />
              <span>{totalStoredRecords.toLocaleString()} Records</span>
            </span>
          </div>
        </div>

        {/* Message Banner */}
        {message && (
          <div className={`px-6 py-2 text-xs flex items-center justify-between ${
            message.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-400 border-b border-emerald-500/20'
              : 'bg-red-500/10 text-red-400 border-b border-red-500/20'
          }`}>
            <span className="flex items-center gap-1.5">
              {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
              {message.text}
            </span>
            <button onClick={() => setMessage(null)} className="opacity-70 hover:opacity-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: Saved Datasets */}
          {activeTab === 'sheets' && (
            <div className="space-y-5">
              
              {/* Quick Upload Bar */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex items-center gap-3 text-left">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center flex-shrink-0">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold">Upload Sheet to SQLite</h4>
                    <p className="text-xs text-slate-400">Excel (.xlsx, .xls) or CSV files are automatically parsed and saved into SQLite tables</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input
                    type="file"
                    accept=".csv, .xlsx, .xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="sqlite-modal-upload-input"
                    disabled={isUploading}
                  />
                  <label
                    htmlFor="sqlite-modal-upload-input"
                    className={`cursor-pointer px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 transition-all w-full sm:w-auto ${
                      isUploading ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <Upload className="w-4 h-4" />
                    <span>{isUploading ? 'Saving to SQLite...' : 'Upload & Save Sheet'}</span>
                  </label>
                  <button
                    onClick={loadSheets}
                    disabled={loading}
                    title="Refresh from SQLite"
                    className={`p-2 rounded-xl border transition-colors ${
                      isLight ? 'border-slate-300 hover:bg-slate-200 text-slate-700' : 'border-slate-700 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Stored Sheets List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 px-1">
                  <span>SAVED SHEETS IN SQLITE DATABASE</span>
                  <span>{sheets.length} Available</span>
                </div>

                {sheets.length === 0 ? (
                  <div className={`p-8 text-center rounded-2xl border ${
                    isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}>
                    <Database className="w-10 h-10 mx-auto mb-2 text-slate-600" />
                    <p className="font-bold">No sheets saved yet in SQLite</p>
                    <p className="text-xs text-slate-500 mt-1">Upload a CSV or Excel file above to save it into the database</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {sheets.map((s) => {
                      const dateFormatted = new Date(s.uploadedAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      });

                      return (
                        <div
                          key={s.id}
                          className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                            s.isActive
                              ? isLight 
                                ? 'bg-blue-50/80 border-blue-400 ring-1 ring-blue-400/40' 
                                : 'bg-blue-950/40 border-blue-500/60 ring-1 ring-blue-500/30'
                              : isLight 
                                ? 'bg-white border-slate-200 hover:border-slate-300' 
                                : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-3.5">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                              s.isActive 
                                ? 'bg-blue-500 text-white shadow-md shadow-blue-500/30' 
                                : isLight ? 'bg-slate-200 text-slate-600' : 'bg-slate-800 text-slate-400'
                            }`}>
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>

                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-sm font-bold text-slate-100">{s.fileName}</h4>
                                {s.isActive && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> ACTIVE IN DASHBOARD
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1 font-mono">
                                <span>📅 {dateFormatted}</span>
                                <span>•</span>
                                <span className="text-emerald-400 font-bold">{s.rowCount.toLocaleString()} records</span>
                                <span>•</span>
                                <span>EGP {(s.totalAmount / 1e6).toFixed(2)}M</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                            {!s.isActive ? (
                              <button
                                onClick={() => handleSetActive(s)}
                                disabled={loading}
                                className="px-3.5 py-1.5 bg-blue-600/90 hover:bg-blue-600 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                              >
                                Load in Dashboard
                              </button>
                            ) : (
                              <span className="text-xs text-blue-400 font-bold px-2 py-1">
                                Currently Active
                              </span>
                            )}

                            {sheets.length > 1 && (
                              <button
                                onClick={() => handleDelete(s.id, s.fileName)}
                                disabled={loading}
                                title="Delete from SQLite"
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Reset to Baseline option */}
              <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Need to restore initial 2026 data?</span>
                <button
                  onClick={handleResetToBaseline}
                  className="text-amber-400 hover:text-amber-300 font-bold underline transition-colors"
                >
                  Reset SQLite to Default Baseline
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: SQL Query Console */}
          {activeTab === 'query' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold flex items-center gap-1.5">
                    <Terminal className="w-4 h-4 text-blue-400" />
                    SQL Query Runner on Active SQLite Records
                  </h4>
                  <p className="text-xs text-slate-400">
                    Query table: <code className="text-blue-400 font-bold">refund_records</code> ({currentRecords.length} rows loaded)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSqlQuery('SELECT company, COUNT(*) as total_cases, SUM(amount) as total_egp FROM refund_records GROUP BY company')}
                    className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono"
                  >
                    Group by Company
                  </button>
                  <button
                    onClick={() => setSqlQuery('SELECT status, COUNT(*) as total_cases, SUM(amount) as total_egp FROM refund_records GROUP BY status')}
                    className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono"
                  >
                    Group by Status
                  </button>
                  <button
                    onClick={() => setSqlQuery("SELECT * FROM refund_records WHERE status = 'Cancelled' LIMIT 50")}
                    className="text-[11px] px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono"
                  >
                    Cancelled Rows
                  </button>
                </div>
              </div>

              {/* SQL Input Box */}
              <div className="relative">
                <textarea
                  value={sqlQuery}
                  onChange={(e) => setSqlQuery(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 text-emerald-300 font-mono text-xs p-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Enter SQL SELECT statement..."
                />
                <button
                  onClick={handleRunQuery}
                  disabled={isExecuting}
                  className="absolute bottom-3 right-3 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md flex items-center gap-1.5 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>{isExecuting ? 'Running...' : 'Execute SQL'}</span>
                </button>
              </div>

              {/* Query Results View */}
              {queryResult && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span className="font-mono">
                      Returned {queryResult.rows.length} rows {queryResult.totalRows > queryResult.rows.length ? `(out of ${queryResult.totalRows})` : ''}
                    </span>
                    {queryResult.rows.length > 0 && (
                      <button
                        onClick={handleExportQueryResultCsv}
                        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 font-bold"
                      >
                        <Download className="w-3.5 h-3.5" /> Export Result to CSV
                      </button>
                    )}
                  </div>

                  {queryResult.error ? (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400">
                      {queryResult.error}
                    </div>
                  ) : queryResult.rows.length === 0 ? (
                    <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl text-xs text-center text-slate-500 font-mono">
                      Query returned 0 rows
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-x-auto overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 font-mono text-xs">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 sticky top-0">
                            {queryResult.columns.map((col) => (
                              <th key={col} className="p-2.5 font-bold uppercase tracking-wider text-[10px] text-blue-400">
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900">
                          {queryResult.rows.map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-900/60 text-slate-300">
                              {queryResult.columns.map((col) => (
                                <td key={col} className="p-2.5 whitespace-nowrap">
                                  {typeof row[col] === 'number'
                                    ? row[col].toLocaleString()
                                    : String(row[col] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SQL Backup & DDL Export */}
          {activeTab === 'export' && (
            <div className="space-y-4">
              <div className={`p-6 rounded-2xl border space-y-4 ${
                isLight ? 'bg-white border-slate-200' : 'bg-slate-950 border-slate-800'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                    <FileCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Export SQLite Schema & DDL (.sql)</h4>
                    <p className="text-xs text-slate-400">
                      Download full SQLite schema, tables definition, and INSERT statements ready for any SQLite database
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                  <p className="text-emerald-400 font-bold">-- SQLite Schema Overview:</p>
                  <p>• Table <code className="text-blue-400">uploaded_sheets</code> (id, file_name, uploaded_at, row_count, total_amount, is_active)</p>
                  <p>• Table <code className="text-blue-400">refund_records</code> (id, sheet_id, company, client_name, amount, type, status, action_date...)</p>
                  <p>• Foreign Keys &amp; Indices configured</p>
                </div>

                <button
                  onClick={handleExportSqlDump}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download SQLite .SQL Dump File</span>
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className={`px-6 py-3 border-t flex items-center justify-between ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'
        }`}>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>SQLite persistence runs automatically on every sheet upload</span>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
