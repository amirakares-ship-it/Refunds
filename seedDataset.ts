import { parseCsvToRecords } from '../utils/csvParser';
import { rawCsvDataString } from './fullCsvData';
import { RefundRecord } from '../types';

const RECORDS_STORAGE_KEY = 'dashboard_refund_records_v1';
const BASELINE_STORAGE_KEY = 'dashboard_baseline_refund_records_v1';

export function getBaselineRecords(): RefundRecord[] {
  try {
    const baseline = localStorage.getItem(BASELINE_STORAGE_KEY);
    if (baseline) {
      const parsed = JSON.parse(baseline);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
    const currentStored = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (currentStored) {
      const parsed = JSON.parse(currentStored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed to load baseline records', e);
  }
  return parseCsvToRecords(rawCsvDataString);
}

export function saveBaselineRecords(records: RefundRecord[]): void {
  try {
    localStorage.setItem(BASELINE_STORAGE_KEY, JSON.stringify(records));
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save baseline records', e);
  }
}

export function getInitialRecords(): RefundRecord[] {
  try {
    const stored = localStorage.getItem(RECORDS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Failed to load records from localStorage', e);
  }
  return getBaselineRecords();
}

export function saveRecordsToStorage(records: RefundRecord[]): void {
  try {
    localStorage.setItem(RECORDS_STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save records to localStorage', e);
  }
}

export function resetToBaselineRecords(): RefundRecord[] {
  const baseline = getBaselineRecords();
  saveRecordsToStorage(baseline);
  return baseline;
}

export function clearStoredRecords(): void {
  try {
    localStorage.removeItem(RECORDS_STORAGE_KEY);
    localStorage.removeItem(BASELINE_STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear records from localStorage', e);
  }
}

