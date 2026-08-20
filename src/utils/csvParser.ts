import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { RefundRecord, RefundType, RefundStatus } from '../types';

export function parseCsvToRecords(csvText: string): RefundRecord[] {
  const result = Papa.parse<Record<string, any>>(csvText.trim(), {
    header: true,
    skipEmptyLines: true,
  });

  return mapRawRowsToRecords(result.data);
}

export function parseExcelToRecords(fileBuffer: ArrayBuffer): RefundRecord[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array', cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonRows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { raw: false, dateNF: 'yyyy-mm-dd' });
  
  return mapRawRowsToRecords(jsonRows);
}

export function mapRawRowsToRecords(rows: Record<string, any>[]): RefundRecord[] {
  const normalizeKey = (k: string) => k.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]/g, '');

  return rows.map((row, idx) => {
    const getVal = (...keys: string[]) => {
      for (const k of keys) {
        if (row[k] !== undefined && row[k] !== null) return row[k];
        
        // Try normalized key lookup (ignores dots, spaces, underscores, casing, quotes)
        const normK = normalizeKey(k);
        const foundKey = Object.keys(row).find(rk => normalizeKey(rk) === normK);
        if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) return row[foundKey];
      }
      return '';
    };

    const rawNo = parseInt(getVal('No.', 'No', 'id', 'index'), 10);
    const no = isNaN(rawNo) ? idx + 1 : rawNo;

    const company = String(getVal('Company', 'company') || 'Unknown').trim();
    const clientName = String(getVal('Client name', 'Client Name', 'Name', 'client_name') || '').trim();
    const nationalId = String(getVal('National ID', 'national_id', 'NationalID') || '').trim();
    const membershipId = String(getVal('Membership_ID', 'Membership ID', 'membership_id') || '').trim();
    const customerId = String(getVal('Customer ID', 'customer_id') || '').trim();

    const acceptanceDate = String(getVal('Acceptance Date', 'acceptance_date', 'acceptance date', 'AcceptanceDate', 'تاريخ القبول', 'سنة القبول') || '').trim();
    
    // Extract year from acceptance date or direct column (supports 2021-2026 and beyond)
    let extractedYear: number | undefined = undefined;
    const acceptanceYearRaw = parseInt(getVal('Acceptance Year', 'acceptance_year', 'acceptance year', 'AcceptanceYear', 'سنة القبول'), 10);
    if (!isNaN(acceptanceYearRaw) && acceptanceYearRaw >= 2000 && acceptanceYearRaw <= 2035) {
      extractedYear = acceptanceYearRaw;
    } else if (acceptanceDate) {
      const yearMatch = acceptanceDate.match(/\b(20[1-3][0-9])\b/);
      if (yearMatch) {
        extractedYear = parseInt(yearMatch[1], 10);
      } else {
        const d = new Date(acceptanceDate);
        if (!isNaN(d.getTime())) {
          extractedYear = d.getFullYear();
        }
      }
    }
    const acceptanceYear = extractedYear || 2025;

    const rawAmount = parseFloat(String(getVal('Amount', 'amount')).replace(/[^0-9.-]+/g, ''));
    const amount = isNaN(rawAmount) ? 0 : rawAmount;

    const typeStr = String(getVal('Type', 'type')).toLowerCase();
    const type: RefundType = typeStr.includes('req') ? 'Request' : 'default';

    // Parse Request Date with full aliases
    const rawReqDate = getVal(
      'Request Date', 'request_date', 'RequestDate', 'request date', 'Request_Date',
      'Date', 'date', 'تاريخ الطلب', 'تاريخ طلب الاسترداد', 'تاريخ الاسترداد'
    );
    let requestDate = '';
    if (rawReqDate instanceof Date) {
      requestDate = rawReqDate.toISOString().split('T')[0];
    } else if (typeof rawReqDate === 'number' && rawReqDate > 30000 && rawReqDate < 60000) {
      const d = new Date((rawReqDate - 25569) * 86400 * 1000);
      requestDate = !isNaN(d.getTime()) ? d.toISOString().split('T')[0] : String(rawReqDate);
    } else {
      requestDate = String(rawReqDate || '').trim();
    }

    // Parse Request Month with full aliases
    const rawReqMonth = getVal(
      'Request Month', 'request_month', 'RequestMonth', 'request month', 'Request_Month',
      'Month', 'month', 'الشهر', 'شهر الطلب'
    );
    let requestMonth = String(rawReqMonth || '').trim();
    if (!requestMonth && requestDate) {
      requestMonth = requestDate.substring(0, 7); // Default fallback e.g. YYYY-MM
    }

    const sendDate = String(getVal('Send Date', 'send_date') || '').trim();
    const csFeedback = String(getVal('Feedback', 'CS Feedback', 'cs_feedback', 'CS_Feedback', 'feedback') || '').trim();
    const feedbackCategory = String(getVal('Feedback Category', 'feedback_category', 'Feedback_Category') || csFeedback || '').trim();

    const feedbackText = (feedbackCategory || csFeedback || '').toLowerCase().trim();

    let reachable = false;
    if (feedbackText) {
      const isUnreachable = 
        feedbackText.includes('unreachable') ||
        feedbackText.includes('not reachable') ||
        feedbackText.includes('no answer') ||
        feedbackText.includes('no response') ||
        feedbackText.includes('out of service') ||
        feedbackText.includes('wrong number') ||
        feedbackText.includes('switched off') ||
        feedbackText.includes('closed') ||
        feedbackText.includes('busy') ||
        feedbackText.includes('disconnected') ||
        feedbackText.includes('invalid') ||
        feedbackText.includes('لا يرد') ||
        feedbackText.includes('غير متاح') ||
        feedbackText.includes('لم يتم الوصول') ||
        feedbackText.includes('رقم خاطئ') ||
        feedbackText.includes('لم يتم الرد') ||
        feedbackText.includes('مغلق');
      reachable = !isUnreachable;
    } else {
      const reachableVal = String(getVal('Reachable', 'reachable', 'Is Reachable', 'Reachable (True/False)')).toLowerCase().trim();
      reachable = reachableVal === 'true' || reachableVal === '1' || reachableVal === 'yes';
    }

    const csDate = String(getVal('CS Date', 'cs_date') || '').trim();
    const action = String(getVal('Action', 'action') || '').trim();
    const actionDate = String(getVal('Action Date', 'action_date') || '').trim();

    const statusRaw = String(getVal('Status', 'status') || 'Pending').trim();
    let status: RefundStatus = statusRaw;
    if (statusRaw.toLowerCase() === 'cancelled' || statusRaw.toLowerCase() === 'canceled') {
      status = 'Cancelled';
    } else if (statusRaw.toLowerCase().includes('cheque') || statusRaw.toLowerCase().includes('pending cheque')) {
      status = 'Cheque pending';
    }

    const isCancellationVal = String(getVal('Is Cancellation Outcome', 'is_cancellation_outcome')).toLowerCase();
    const isCancellationOutcome = isCancellationVal === 'true' || isCancellationVal === '1' || status === 'Cancelled';

    const cancellationDate = String(getVal('Cancellation Date', 'cancellation_date') || '').trim();
    const reactiveVal = String(getVal('Reactive', 'reactive')).toLowerCase();
    const reactive = reactiveVal === 'reactive' || reactiveVal === 'true' || reactiveVal === '1';

    const daysRaw = parseFloat(getVal('Days', 'days'));
    const days = isNaN(daysRaw) ? 0 : daysRaw;

    const willPay = String(getVal(
      'Will pay or not (count of willing to pay only)',
      'Will pay or not (count of willing to pay)',
      'Will pay or not',
      'will_pay_or_not',
      'Will pay',
      'will_pay',
      'Willing to pay',
      'Count of willing to pay',
      'Count of Willing to pay by CS',
      'Willing to pay by CS',
      'Will pay or not?',
      'Willingness',
      'Willing',
      'راغب بالدفع',
      'الرغبة بالدفع',
      'هل يرغب بالدفع'
    ) || '').trim();

    const reminderFromCom = String(getVal(
      'reminder from Com.',
      'Reminder from Com.',
      'reminder from Com',
      'Reminder from Com',
      'reminder from com.',
      'reminder from com',
      'Reminder From Com.',
      'Reminder From Com',
      'Reminder from Company',
      'reminder from company',
      'reminder_from_com',
      'Reminder_From_Com',
      'Reminder from Co',
      'reminder from co',
      'Reminder from Co.',
      'reminder from co.',
      'Reminder from C',
      'reminder from c',
      'Reminder_from_Com',
      'Reminder_From_Company',
      'reminder_from_company',
      'Reminder',
      'reminder',
      'Reminders',
      'reminders',
      'تذكير من الشركة',
      'تذكير الشركة',
      'تذكير',
      'التذكير'
    ) || '').trim();

    // Parse dedicated 'Year' column if provided in sheet
    const rawYearVal = getVal(
      'Year',
      'year',
      'YEAR',
      'السنة',
      'سنة',
      'Refund Year',
      'refund_year',
      'RefundYear',
      'Year of Refund'
    );
    let refundYearNum: number | undefined = undefined;
    if (rawYearVal) {
      const parsedY = parseInt(String(rawYearVal).trim(), 10);
      if (!isNaN(parsedY) && parsedY >= 2000 && parsedY <= 2035) {
        refundYearNum = parsedY;
      }
    }
    // Fallback if Year column not explicitly provided: extract from cancellationDate or requestDate or acceptanceYear
    if (!refundYearNum) {
      if (cancellationDate) {
        const match = cancellationDate.match(/\b(20[1-3][0-9])\b/);
        if (match) refundYearNum = parseInt(match[1], 10);
      }
      if (!refundYearNum && requestDate) {
        const match = requestDate.match(/\b(20[1-3][0-9])\b/);
        if (match) refundYearNum = parseInt(match[1], 10);
      }
      if (!refundYearNum) {
        refundYearNum = 2026; // Default active dataset year
      }
    }

    return {
      no,
      company,
      clientName,
      nationalId,
      membershipId,
      customerId,
      acceptanceDate,
      acceptanceYear,
      amount,
      type,
      requestDate,
      requestMonth,
      sendDate,
      csFeedback,
      feedbackCategory,
      reachable,
      csDate,
      action,
      actionDate,
      status,
      isCancellationOutcome,
      cancellationDate,
      reactive,
      days,
      willPay,
      reminderFromCom,
      year: refundYearNum,
      refundYear: refundYearNum,
    };
  });
}
