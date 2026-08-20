import React, { useState } from 'react';
import { X, Save, RotateCcw, Building2 } from 'lucide-react';
import { ManualInputs } from '../types';

interface ManualInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  manualInputs: ManualInputs;
  setManualInputs: React.Dispatch<React.SetStateAction<ManualInputs>>;
  autoTotalCancellations: number;
}

export const ManualInputModal: React.FC<ManualInputModalProps> = ({
  isOpen,
  onClose,
  manualInputs,
  setManualInputs,
  autoTotalCancellations,
}) => {
  if (!isOpen) return null;

  const [tempCount, setTempCount] = useState<string>(
    manualInputs.manualTotalCancellationCount !== null ? String(manualInputs.manualTotalCancellationCount) : ''
  );
  const [activeCompany, setActiveCompany] = useState<string>('Ollin');
  const [fundsMatrix, setFundsMatrix] = useState(manualInputs.financedFunds);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'July', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const companies = ['Ollin', 'Premium', 'Aman'];

  const handleFundChange = (company: string, month: string, val: string) => {
    const num = parseFloat(val) || 0;
    setFundsMatrix(prev => ({
      ...prev,
      [company]: {
        ...(prev[company] || {}),
        [month]: num,
      }
    }));
  };

  const handleSave = () => {
    const parsedCount = tempCount.trim() === '' ? null : parseInt(tempCount, 10);
    setManualInputs({
      manualTotalCancellationCount: isNaN(parsedCount as number) ? null : parsedCount,
      financedFunds: fundsMatrix,
    });
    onClose();
  };

  const handleResetCount = () => {
    setTempCount('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
      <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden text-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div>
            <h3 className="text-lg font-bold text-white">Manual Input & Financed Funds Override</h3>
            <p className="text-xs text-slate-400">
              Set custom total cancellation counts and monthly financed amounts per company
            </p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-900">
          
          {/* Section 1: Total Cancellation Count Override */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
            <label className="block text-sm font-bold text-white mb-1">
              1. Total Cancellation Count (Manual Override)
            </label>
            <p className="text-xs text-slate-400 mb-3">
              This field overrides the total cancellation count in Chart 1 Donut (% calculation) and KPI cards automatically.
            </p>
            <div className="flex items-center space-x-3">
              <input
                type="number"
                value={tempCount}
                onChange={(e) => setTempCount(e.target.value)}
                placeholder={`Auto-calculated: ${autoTotalCancellations}`}
                className="px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
              />
              <button
                type="button"
                onClick={handleResetCount}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg border border-slate-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset to Auto ({autoTotalCancellations})
              </button>
            </div>
          </div>

          {/* Section 2: Financed Funds Matrix */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-bold text-white">
                2. Monthly Company Financed Funds (EGP)
              </label>
              <div className="flex space-x-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                {companies.map(comp => (
                  <button
                    key={comp}
                    onClick={() => setActiveCompany(comp)}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                      activeCompany === comp 
                        ? 'bg-blue-600 text-white shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {comp}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Pre-populated with PDF Page 7 figures. Modify any month to update the Funds vs Refunds matrix in real time.
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
              {months.map(m => (
                <div key={m} className="bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  <span className="block text-xs font-bold text-slate-300 mb-1 flex items-center justify-between">
                    <span>{m} ({activeCompany})</span>
                    <Building2 className="w-3 h-3 text-slate-500" />
                  </span>
                  <input
                    type="number"
                    value={fundsMatrix[activeCompany]?.[m] || 0}
                    onChange={(e) => handleFundChange(activeCompany, m, e.target.value)}
                    className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded text-xs font-mono text-white focus:ring-1 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950 flex items-center justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg border border-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            Save & Update Dashboard
          </button>
        </div>

      </div>
    </div>
  );
};
