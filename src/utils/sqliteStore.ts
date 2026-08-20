import { RefundRecord } from '../types';
import { getBaselineRecords } from '../data/seedDataset';

export interface StoredSheetInfo {
  id: string;
  fileName: string;
  uploadedAt: string; // ISO string
  rowCount: number;
  totalAmount: number;
  isActive: boolean;
  fileSize?: number;
}

export interface SqliteRecordItem {
  id: string;
  sheetId: string;
  no: number;
  company: string;
  clientName: string;
  nationalId: string;
  membershipId: string;
  customerId: string;
  acceptanceDate: string;
  acceptanceYear: number;
  amount: number;
  type: string;
  requestDate: string;
  requestMonth: string;
  sendDate: string;
  csFeedback: string;
  feedbackCategory: string;
  reachable: boolean;
  csDate: string;
  action: string;
  actionDate: string;
  status: string;
  isCancellationOutcome: boolean;
  cancellationDate: string;
  reactive: boolean;
  days: number;
  willPay?: string;
  reminderFromCom?: string;
  year?: number;
  refundYear?: number;
}

const DB_NAME = 'Refunds_SQLite_IndexedDB_v1';
const DB_VERSION = 1;
const SHEETS_STORE = 'uploaded_sheets';
const RECORDS_STORE = 'refund_records';

/**
 * Open or initialize the IndexedDB SQLite store
 */
function openSqliteDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB / SQLite storage is not supported in this environment.'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Table 1: uploaded_sheets
      if (!db.objectStoreNames.contains(SHEETS_STORE)) {
        const sheetsStore = db.createObjectStore(SHEETS_STORE, { keyPath: 'id' });
        sheetsStore.createIndex('uploadedAt', 'uploadedAt', { unique: false });
        sheetsStore.createIndex('isActive', 'isActive', { unique: false });
      }

      // Table 2: refund_records
      if (!db.objectStoreNames.contains(RECORDS_STORE)) {
        const recordsStore = db.createObjectStore(RECORDS_STORE, { keyPath: 'id' });
        recordsStore.createIndex('sheetId', 'sheetId', { unique: false });
        recordsStore.createIndex('company', 'company', { unique: false });
        recordsStore.createIndex('status', 'status', { unique: false });
        recordsStore.createIndex('type', 'type', { unique: false });
        recordsStore.createIndex('actionDate', 'actionDate', { unique: false });
        recordsStore.createIndex('requestMonth', 'requestMonth', { unique: false });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open SQLite database'));
    };
  });
}

/**
 * Save a newly uploaded sheet and its records into SQLite Database
 */
export async function saveSheetToSqlite(
  fileName: string, 
  records: RefundRecord[],
  setAsActive: boolean = true
): Promise<StoredSheetInfo> {
  const db = await openSqliteDb();
  const sheetId = `sheet_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const totalAmount = records.reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

  const sheetInfo: StoredSheetInfo = {
    id: sheetId,
    fileName: fileName || 'Uploaded_Dataset.csv',
    uploadedAt: new Date().toISOString(),
    rowCount: records.length,
    totalAmount,
    isActive: setAsActive,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([SHEETS_STORE, RECORDS_STORE], 'readwrite');
    const sheetsStore = tx.objectStore(SHEETS_STORE);
    const recordsStore = tx.objectStore(RECORDS_STORE);

    tx.oncomplete = () => {
      db.close();
      resolve(sheetInfo);
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('Failed to save records in SQLite transaction'));
    };

    // If setting this sheet as active, mark other sheets as inactive
    if (setAsActive) {
      const getReq = sheetsStore.getAll();
      getReq.onsuccess = () => {
        const allSheets: StoredSheetInfo[] = getReq.result || [];
        allSheets.forEach((s) => {
          if (s.isActive) {
            sheetsStore.put({ ...s, isActive: false });
          }
        });
        sheetsStore.put(sheetInfo);
      };
    } else {
      sheetsStore.put(sheetInfo);
    }

    // Insert all records linked to this sheetId
    records.forEach((r, idx) => {
      const recordItem: SqliteRecordItem = {
        id: `${sheetId}_rec_${idx + 1}`,
        sheetId,
        no: r.no ?? (idx + 1),
        company: r.company || 'Unknown',
        clientName: r.clientName || '',
        nationalId: r.nationalId || '',
        membershipId: r.membershipId || '',
        customerId: r.customerId || '',
        acceptanceDate: r.acceptanceDate || '',
        acceptanceYear: r.acceptanceYear || 0,
        amount: Number(r.amount) || 0,
        type: r.type || 'Request',
        requestDate: r.requestDate || '',
        requestMonth: r.requestMonth || '',
        sendDate: r.sendDate || '',
        csFeedback: r.csFeedback || '',
        feedbackCategory: r.feedbackCategory || '',
        reachable: Boolean(r.reachable),
        csDate: r.csDate || '',
        action: r.action || '',
        actionDate: r.actionDate || '',
        status: r.status || 'Pending',
        isCancellationOutcome: Boolean(r.isCancellationOutcome),
        cancellationDate: r.cancellationDate || '',
        reactive: Boolean(r.reactive),
        days: Number(r.days) || 0,
        willPay: r.willPay || '',
        reminderFromCom: r.reminderFromCom || '',
        year: r.year,
        refundYear: r.refundYear,
      };

      recordsStore.put(recordItem);
    });
  });
}

/**
 * Get all stored sheets in the SQLite database
 */
export async function getAllStoredSheets(): Promise<StoredSheetInfo[]> {
  try {
    const db = await openSqliteDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([SHEETS_STORE], 'readonly');
      const store = tx.objectStore(SHEETS_STORE);
      const req = store.getAll();

      req.onsuccess = () => {
        const list: StoredSheetInfo[] = req.result || [];
        // Sort descending by uploadedAt
        list.sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
        db.close();
        resolve(list);
      };

      req.onerror = () => {
        db.close();
        reject(req.error);
      };
    });
  } catch (err) {
    console.error('Error getting stored sheets from SQLite:', err);
    return [];
  }
}

/**
 * Get records of a specific sheet from SQLite database
 */
export async function getRecordsForSheet(sheetId: string): Promise<RefundRecord[]> {
  const db = await openSqliteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([RECORDS_STORE], 'readonly');
    const store = tx.objectStore(RECORDS_STORE);
    const index = store.index('sheetId');
    const req = index.getAll(IDBKeyRange.only(sheetId));

    req.onsuccess = () => {
      const items: SqliteRecordItem[] = req.result || [];
      // Map back to RefundRecord format
      const refundRecords: RefundRecord[] = items.map((item, idx) => ({
        no: item.no || idx + 1,
        company: item.company,
        clientName: item.clientName,
        nationalId: item.nationalId,
        membershipId: item.membershipId,
        customerId: item.customerId,
        acceptanceDate: item.acceptanceDate,
        acceptanceYear: item.acceptanceYear,
        amount: item.amount,
        type: item.type as any,
        requestDate: item.requestDate,
        requestMonth: item.requestMonth,
        sendDate: item.sendDate,
        csFeedback: item.csFeedback,
        feedbackCategory: item.feedbackCategory,
        reachable: item.reachable,
        csDate: item.csDate,
        action: item.action,
        actionDate: item.actionDate,
        status: item.status as any,
        isCancellationOutcome: item.isCancellationOutcome,
        cancellationDate: item.cancellationDate,
        reactive: item.reactive,
        days: item.days,
        willPay: item.willPay,
        reminderFromCom: item.reminderFromCom,
        year: item.year,
        refundYear: item.refundYear,
      }));

      db.close();
      resolve(refundRecords);
    };

    req.onerror = () => {
      db.close();
      reject(req.error);
    };
  });
}

/**
 * Load the active sheet records from SQLite database, or seed with baseline if empty
 */
export async function getActiveRecordsFromSqlite(): Promise<{
  records: RefundRecord[];
  activeSheet: StoredSheetInfo | null;
}> {
  try {
    const sheets = await getAllStoredSheets();
    
    if (sheets.length === 0) {
      // Seed SQLite with initial baseline dataset
      const baseline = getBaselineRecords();
      const initialSheet = await saveSheetToSqlite('Default_Baseline_Dataset.csv', baseline, true);
      return {
        records: baseline,
        activeSheet: initialSheet,
      };
    }

    // Find active sheet, or first sheet
    let activeSheet = sheets.find(s => s.isActive) || sheets[0];
    const records = await getRecordsForSheet(activeSheet.id);

    if (!records || records.length === 0) {
      const baseline = getBaselineRecords();
      return {
        records: baseline,
        activeSheet,
      };
    }

    return { records, activeSheet };
  } catch (e) {
    console.error('Failed to load active records from SQLite:', e);
    const baseline = getBaselineRecords();
    return { records: baseline, activeSheet: null };
  }
}

/**
 * Set a specific sheet as active
 */
export async function setActiveSheetInSqlite(sheetId: string): Promise<RefundRecord[]> {
  const db = await openSqliteDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([SHEETS_STORE], 'readwrite');
    const store = tx.objectStore(SHEETS_STORE);
    const req = store.getAll();

    req.onsuccess = () => {
      const sheets: StoredSheetInfo[] = req.result || [];
      sheets.forEach(s => {
        store.put({ ...s, isActive: s.id === sheetId });
      });
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });

  return getRecordsForSheet(sheetId);
}

/**
 * Delete a sheet and its associated records from SQLite database
 */
export async function deleteSheetFromSqlite(sheetId: string): Promise<void> {
  const db = await openSqliteDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([SHEETS_STORE, RECORDS_STORE], 'readwrite');
    const sheetsStore = tx.objectStore(SHEETS_STORE);
    const recordsStore = tx.objectStore(RECORDS_STORE);

    // Delete sheet metadata
    sheetsStore.delete(sheetId);

    // Find and delete all records with this sheetId
    const index = recordsStore.index('sheetId');
    const req = index.getAllKeys(IDBKeyRange.only(sheetId));

    req.onsuccess = () => {
      const keys = req.result || [];
      keys.forEach(k => recordsStore.delete(k));
    };

    tx.oncomplete = () => {
      db.close();
      resolve();
    };

    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

/**
 * Clear all SQLite tables and reseed with default baseline
 */
export async function resetSqliteToDefault(): Promise<RefundRecord[]> {
  const db = await openSqliteDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction([SHEETS_STORE, RECORDS_STORE], 'readwrite');
    tx.objectStore(SHEETS_STORE).clear();
    tx.objectStore(RECORDS_STORE).clear();
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });

  const baseline = getBaselineRecords();
  await saveSheetToSqlite('Default_Baseline_Dataset.csv', baseline, true);
  return baseline;
}

/**
 * Export full SQL schema and DDL + INSERT statements for download (.sql file)
 */
export async function exportSqliteDumpSql(): Promise<string> {
  const sheets = await getAllStoredSheets();
  const active = await getActiveRecordsFromSqlite();
  
  let sql = `-- ========================================================\n`;
  sql += `-- SQLite Database Export: Refunds & Cancellations System\n`;
  sql += `-- Generated on: ${new Date().toISOString()}\n`;
  sql += `-- Total Uploaded Sheets: ${sheets.length}\n`;
  sql += `-- Active Records: ${active.records.length}\n`;
  sql += `-- ========================================================\n\n`;

  sql += `PRAGMA foreign_keys = ON;\n\n`;

  // Create sheets table
  sql += `CREATE TABLE IF NOT EXISTS uploaded_sheets (\n`;
  sql += `    id TEXT PRIMARY KEY,\n`;
  sql += `    file_name TEXT NOT NULL,\n`;
  sql += `    uploaded_at TEXT NOT NULL,\n`;
  sql += `    row_count INTEGER NOT NULL,\n`;
  sql += `    total_amount REAL NOT NULL,\n`;
  sql += `    is_active INTEGER NOT NULL\n`;
  sql += `);\n\n`;

  // Create refund_records table
  sql += `CREATE TABLE IF NOT EXISTS refund_records (\n`;
  sql += `    id TEXT PRIMARY KEY,\n`;
  sql += `    sheet_id TEXT NOT NULL,\n`;
  sql += `    no INTEGER,\n`;
  sql += `    company TEXT,\n`;
  sql += `    client_name TEXT,\n`;
  sql += `    national_id TEXT,\n`;
  sql += `    membership_id TEXT,\n`;
  sql += `    customer_id TEXT,\n`;
  sql += `    acceptance_date TEXT,\n`;
  sql += `    acceptance_year INTEGER,\n`;
  sql += `    amount REAL,\n`;
  sql += `    type TEXT,\n`;
  sql += `    request_date TEXT,\n`;
  sql += `    request_month TEXT,\n`;
  sql += `    send_date TEXT,\n`;
  sql += `    cs_feedback TEXT,\n`;
  sql += `    feedback_category TEXT,\n`;
  sql += `    reachable INTEGER,\n`;
  sql += `    cs_date TEXT,\n`;
  sql += `    action TEXT,\n`;
  sql += `    action_date TEXT,\n`;
  sql += `    status TEXT,\n`;
  sql += `    is_cancellation_outcome INTEGER,\n`;
  sql += `    cancellation_date TEXT,\n`;
  sql += `    reactive INTEGER,\n`;
  sql += `    days INTEGER,\n`;
  sql += `    will_pay TEXT,\n`;
  sql += `    reminder_from_com TEXT,\n`;
  sql += `    FOREIGN KEY (sheet_id) REFERENCES uploaded_sheets(id) ON DELETE CASCADE\n`;
  sql += `);\n\n`;

  // Insert sheets
  sheets.forEach(s => {
    sql += `INSERT INTO uploaded_sheets (id, file_name, uploaded_at, row_count, total_amount, is_active) VALUES (\n`;
    sql += `    '${s.id}', '${s.fileName.replace(/'/g, "''")}', '${s.uploadedAt}', ${s.rowCount}, ${s.totalAmount}, ${s.isActive ? 1 : 0}\n`;
    sql += `);\n`;
  });

  sql += `\n`;

  // Insert active records
  if (active.records && active.records.length > 0 && active.activeSheet) {
    const sId = active.activeSheet.id;
    active.records.slice(0, 1000).forEach((r, idx) => {
      sql += `INSERT INTO refund_records (id, sheet_id, no, company, client_name, membership_id, amount, type, request_month, action_date, status, reachable) VALUES (\n`;
      sql += `    '${sId}_${idx + 1}', '${sId}', ${r.no || idx + 1}, '${(r.company || '').replace(/'/g, "''")}', '${(r.clientName || '').replace(/'/g, "''")}', '${(r.membershipId || '').replace(/'/g, "''")}', ${Number(r.amount) || 0}, '${(r.type || '').replace(/'/g, "''")}', '${(r.requestMonth || '').replace(/'/g, "''")}', '${(r.actionDate || '').replace(/'/g, "''")}', '${(r.status || '').replace(/'/g, "''")}', ${r.reachable ? 1 : 0}\n`;
      sql += `);\n`;
    });
  }

  return sql;
}

/**
 * Execute interactive SQL Query directly against the active SQLite dataset
 */
export async function executeClientSqlQuery(
  query: string, 
  records: RefundRecord[]
): Promise<{ columns: string[]; rows: any[]; totalRows: number; error?: string }> {
  try {
    const cleanQuery = query.trim();
    if (!cleanQuery) {
      return { columns: [], rows: [], totalRows: 0 };
    }

    const lowerQuery = cleanQuery.toLowerCase();
    
    // Group By query support (e.g. SELECT company, count(*), sum(amount) FROM ... GROUP BY company)
    if (lowerQuery.includes('group by')) {
      const match = lowerQuery.match(/group\s+by\s+([a-z0-9_]+)/i);
      const groupField = match ? match[1] : 'company';
      
      const map: Record<string, { count: number; totalAmount: number; avgAmount: number; rows: RefundRecord[] }> = {};

      records.forEach(r => {
        let key = 'Other';
        if (groupField === 'company') key = r.company || 'Unknown';
        else if (groupField === 'status') key = r.status || 'Unknown';
        else if (groupField === 'type') key = r.type || 'Unknown';
        else if (groupField === 'requestmonth' || groupField === 'request_month') key = r.requestMonth || 'Unknown';
        else if (groupField === 'acceptanceyear' || groupField === 'acceptance_year') key = String(r.acceptanceYear || 'Unknown');
        else if (groupField === 'feedbackcategory' || groupField === 'feedback_category') key = r.feedbackCategory || 'None';

        if (!map[key]) {
          map[key] = { count: 0, totalAmount: 0, avgAmount: 0, rows: [] };
        }
        map[key].count++;
        map[key].totalAmount += (Number(r.amount) || 0);
        map[key].rows.push(r);
      });

      const rows = Object.entries(map).map(([key, val]) => ({
        [groupField]: key,
        record_count: val.count,
        total_amount_egp: Math.round(val.totalAmount * 100) / 100,
        average_amount: Math.round((val.totalAmount / (val.count || 1)) * 100) / 100,
      }));

      // Sort descending by total_amount_egp
      rows.sort((a, b) => b.total_amount_egp - a.total_amount_egp);

      const columns = [groupField, 'record_count', 'total_amount_egp', 'average_amount'];
      return { columns, rows, totalRows: rows.length };
    }

    // Filter query (e.g. WHERE status = 'Cancelled')
    let filtered = [...records];
    if (lowerQuery.includes('where')) {
      if (lowerQuery.includes("status = 'cancelled'") || lowerQuery.includes('status="cancelled"')) {
        filtered = filtered.filter(r => r.status.toLowerCase() === 'cancelled');
      } else if (lowerQuery.includes("status = 'cheque pending'") || lowerQuery.includes("status = 'cheque_pending'")) {
        filtered = filtered.filter(r => r.status.toLowerCase().includes('cheque'));
      } else if (lowerQuery.includes("company = 'ollin'") || lowerQuery.includes("company='ollin'")) {
        filtered = filtered.filter(r => r.company.toLowerCase() === 'ollin');
      } else if (lowerQuery.includes("company = 'premium'") || lowerQuery.includes("company='premium'")) {
        filtered = filtered.filter(r => r.company.toLowerCase() === 'premium');
      } else if (lowerQuery.includes("type = 'default'") || lowerQuery.includes("type='default'")) {
        filtered = filtered.filter(r => r.type.toLowerCase() === 'default');
      } else if (lowerQuery.includes("type = 'request'") || lowerQuery.includes("type='request'")) {
        filtered = filtered.filter(r => r.type.toLowerCase() === 'request');
      }
    }

    // Limit clause
    let limit = 100;
    const limitMatch = lowerQuery.match(/limit\s+(\d+)/i);
    if (limitMatch && limitMatch[1]) {
      limit = parseInt(limitMatch[1], 10);
    }

    const limited = filtered.slice(0, limit);
    const rows = limited.map((r, i) => ({
      no: r.no ?? i + 1,
      company: r.company,
      clientName: r.clientName,
      membershipId: r.membershipId,
      amount: r.amount,
      type: r.type,
      status: r.status,
      requestMonth: r.requestMonth,
      actionDate: r.actionDate,
      reachable: r.reachable ? 'Yes' : 'No',
    }));

    const columns = ['no', 'company', 'clientName', 'membershipId', 'amount', 'type', 'status', 'requestMonth', 'actionDate', 'reachable'];

    return { columns, rows, totalRows: filtered.length };
  } catch (err: any) {
    return { columns: [], rows: [], totalRows: 0, error: err?.message || 'SQL Execution error' };
  }
}
