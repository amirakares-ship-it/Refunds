import React, { useState } from 'react';
import { X, Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from 'lucide-react';
import { parseCsvToRecords, parseExcelToRecords } from '../utils/csvParser';
import { RefundRecord } from '../types';

interface FileUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDatasetUpdate: (records: RefundRecord[]) => void;
}

export const FileUploadModal: React.FC<FileUploadModalProps> = ({
  isOpen,
  onClose,
  onDatasetUpdate,
}) => {
  if (!isOpen) return null;

  const [dragActive, setDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFileName(file.name);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      let newRecords: RefundRecord[] = [];

      if (ext === 'csv') {
        const text = await file.text();
        newRecords = parseCsvToRecords(text);
      } else if (ext === 'xlsx' || ext === 'xls') {
        const buffer = await file.arrayBuffer();
        newRecords = parseExcelToRecords(buffer);
      } else {
        setErrorMsg('Unsupported file format. Please upload a .csv or .xlsx Excel file.');
        return;
      }

      if (!newRecords || newRecords.length === 0) {
        setErrorMsg('No valid records found in the uploaded file.');
        return;
      }

      onDatasetUpdate(newRecords);
      setSuccessMsg(`Successfully imported ${newRecords.length} records from ${file.name}!`);
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg(`Failed to parse file: ${err?.message || 'Unknown error'}`);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-xl flex flex-col overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Upload Updated Excel / CSV Sheet</h3>
              <p className="text-xs text-slate-400">Updates dashboard charts and metrics automatically</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drag & Drop Body */}
        <div className="p-6 bg-slate-900">
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors flex flex-col items-center justify-center cursor-pointer ${
              dragActive ? 'border-blue-500 bg-blue-500/10' : 'border-slate-800 hover:border-blue-500/50 hover:bg-slate-950'
            }`}
          >
            <input
              type="file"
              accept=".csv, .xlsx, .xls"
              onChange={handleChange}
              className="hidden"
              id="sheet-upload-input"
            />
            <label htmlFor="sheet-upload-input" className="cursor-pointer flex flex-col items-center">
              <FileSpreadsheet className="w-12 h-12 text-blue-400 mb-3" />
              <span className="text-sm font-bold text-white">
                Click to upload or drag & drop file here
              </span>
              <span className="text-xs text-slate-400 mt-1">
                Supports Excel (.xlsx, .xls) and CSV (.csv) format
              </span>
            </label>
          </div>

          {fileName && (
            <p className="text-xs font-mono text-slate-400 mt-3 text-center">
              Selected file: <span className="font-bold text-white">{fileName}</span>
            </p>
          )}

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center space-x-2 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-xs text-emerald-300">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
