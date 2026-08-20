import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy, 
  onSnapshot 
} from 'firebase/firestore';
import { RefundRecord } from '../types';
import { StoredSheetInfo } from './sqliteStore';

// Firestore collection names
const CLOUD_SHEETS_COLLECTION = 'uploaded_sheets';
const CLOUD_DATA_COLLECTION = 'sheet_records';
const ACTIVE_STATE_DOC = 'active_dataset_state';

/**
 * Save an uploaded sheet and its records to Cloud Firestore
 * This allows all users across devices to immediately see and access the dataset.
 */
export async function saveSheetToCloud(
  sheetInfo: StoredSheetInfo, 
  records: RefundRecord[]
): Promise<void> {
  try {
    // 1. Save Sheet Metadata
    const sheetDocRef = doc(db, CLOUD_SHEETS_COLLECTION, sheetInfo.id);
    await setDoc(sheetDocRef, {
      id: sheetInfo.id,
      fileName: sheetInfo.fileName,
      uploadedAt: sheetInfo.uploadedAt,
      rowCount: sheetInfo.rowCount,
      totalAmount: sheetInfo.totalAmount,
      isActive: sheetInfo.isActive,
    });

    // 2. Save active pointer
    if (sheetInfo.isActive) {
      const activeDocRef = doc(db, 'system_state', ACTIVE_STATE_DOC);
      await setDoc(activeDocRef, {
        activeSheetId: sheetInfo.id,
        updatedAt: new Date().toISOString(),
        fileName: sheetInfo.fileName,
        rowCount: records.length,
      });
    }

    // 3. Save Records in chunks or document (Firestore allows up to 1MB per doc)
    // To handle up to thousands of records safely, we split records into 300-row chunks
    const CHUNK_SIZE = 300;
    const chunkCount = Math.ceil(records.length / CHUNK_SIZE);

    for (let i = 0; i < chunkCount; i++) {
      const chunkRecords = records.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkDocRef = doc(db, CLOUD_DATA_COLLECTION, `${sheetInfo.id}_chunk_${i}`);
      await setDoc(chunkDocRef, {
        sheetId: sheetInfo.id,
        chunkIndex: i,
        totalChunks: chunkCount,
        records: JSON.stringify(chunkRecords),
        updatedAt: new Date().toISOString(),
      });
    }

    console.log(`[Cloud Sync] Saved ${records.length} records to Firestore for sheet ${sheetInfo.fileName}`);
  } catch (error) {
    console.error('[Cloud Sync] Error saving sheet to Firestore:', error);
    throw error;
  }
}

/**
 * Get all available sheets from Cloud Firestore
 */
export async function getCloudSheets(): Promise<StoredSheetInfo[]> {
  try {
    const sheetsCol = collection(db, CLOUD_SHEETS_COLLECTION);
    const q = query(sheetsCol, orderBy('uploadedAt', 'desc'));
    const snapshot = await getDocs(q);

    const sheets: StoredSheetInfo[] = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      sheets.push({
        id: data.id,
        fileName: data.fileName,
        uploadedAt: data.uploadedAt,
        rowCount: data.rowCount,
        totalAmount: data.totalAmount,
        isActive: Boolean(data.isActive),
      });
    });

    return sheets;
  } catch (error) {
    console.warn('[Cloud Sync] Failed to fetch sheets from Firestore:', error);
    return [];
  }
}

/**
 * Fetch records for a specific sheet from Cloud Firestore
 */
export async function getCloudRecordsForSheet(sheetId: string): Promise<RefundRecord[] | null> {
  try {
    const dataCol = collection(db, CLOUD_DATA_COLLECTION);
    const snapshot = await getDocs(dataCol);

    const chunks: { index: number; records: RefundRecord[] }[] = [];

    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      if (data.sheetId === sheetId) {
        try {
          const parsed = JSON.parse(data.records || '[]');
          chunks.push({ index: data.chunkIndex ?? 0, records: parsed });
        } catch (e) {
          console.error('Error parsing cloud chunk records:', e);
        }
      }
    });

    if (chunks.length === 0) {
      return null;
    }

    // Sort by chunkIndex and join together
    chunks.sort((a, b) => a.index - b.index);
    const allRecords: RefundRecord[] = [];
    chunks.forEach(c => allRecords.push(...c.records));

    return allRecords;
  } catch (error) {
    console.warn(`[Cloud Sync] Failed to load records for sheet ${sheetId}:`, error);
    return null;
  }
}

/**
 * Fetch active cloud dataset and metadata
 */
export async function getActiveCloudDataset(): Promise<{
  sheetInfo: StoredSheetInfo | null;
  records: RefundRecord[] | null;
}> {
  try {
    // 1. Check active state doc
    const activeDocRef = doc(db, 'system_state', ACTIVE_STATE_DOC);
    const activeSnap = await getDoc(activeDocRef);

    let targetSheetId: string | null = null;
    if (activeSnap.exists()) {
      targetSheetId = activeSnap.data()?.activeSheetId || null;
    }

    // 2. If no active doc, fallback to the latest sheet
    if (!targetSheetId) {
      const sheets = await getCloudSheets();
      if (sheets.length > 0) {
        targetSheetId = sheets[0].id;
      }
    }

    if (!targetSheetId) {
      return { sheetInfo: null, records: null };
    }

    const sheetDocRef = doc(db, CLOUD_SHEETS_COLLECTION, targetSheetId);
    const sheetSnap = await getDoc(sheetDocRef);
    const sheetInfo = sheetSnap.exists() ? (sheetSnap.data() as StoredSheetInfo) : null;

    const records = await getCloudRecordsForSheet(targetSheetId);

    return { sheetInfo, records };
  } catch (error) {
    console.warn('[Cloud Sync] Error getting active cloud dataset:', error);
    return { sheetInfo: null, records: null };
  }
}

/**
 * Set active sheet on Cloud Firestore
 */
export async function setActiveSheetOnCloud(sheetId: string): Promise<void> {
  try {
    // 1. Update active pointer
    const activeDocRef = doc(db, 'system_state', ACTIVE_STATE_DOC);
    await setDoc(activeDocRef, {
      activeSheetId: sheetId,
      updatedAt: new Date().toISOString(),
    });

    // 2. Update sheet metadata
    const sheetsCol = collection(db, CLOUD_SHEETS_COLLECTION);
    const snapshot = await getDocs(sheetsCol);
    for (const docSnap of snapshot.docs) {
      await setDoc(docSnap.ref, { isActive: docSnap.id === sheetId }, { merge: true });
    }
  } catch (error) {
    console.error('[Cloud Sync] Error setting active sheet on cloud:', error);
  }
}

/**
 * Delete a sheet from Cloud Firestore
 */
export async function deleteSheetFromCloud(sheetId: string): Promise<void> {
  try {
    // Delete sheet metadata
    const sheetDocRef = doc(db, CLOUD_SHEETS_COLLECTION, sheetId);
    await deleteDoc(sheetDocRef);

    // Delete chunks
    const dataCol = collection(db, CLOUD_DATA_COLLECTION);
    const snapshot = await getDocs(dataCol);
    for (const docSnap of snapshot.docs) {
      if (docSnap.data().sheetId === sheetId) {
        await deleteDoc(docSnap.ref);
      }
    }
  } catch (error) {
    console.error('[Cloud Sync] Error deleting sheet from cloud:', error);
  }
}

/**
 * Subscribe to live cloud updates
 */
export function subscribeToActiveCloudState(onUpdate: (sheetId: string) => void): () => void {
  try {
    const activeDocRef = doc(db, 'system_state', ACTIVE_STATE_DOC);
    return onSnapshot(activeDocRef, (snap) => {
      if (snap.exists()) {
        const id = snap.data()?.activeSheetId;
        if (id) {
          onUpdate(id);
        }
      }
    });
  } catch (e) {
    console.warn('[Cloud Sync] Could not setup live listener:', e);
    return () => {};
  }
}
