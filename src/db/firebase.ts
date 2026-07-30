import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  setDoc, 
  deleteDoc, 
  writeBatch, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { Bank, QrisRecord } from '../types';
import { HistoryRecord } from './sheets';
import { INITIAL_BANKS } from '../data/initialBanks';

const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
let config: any = {};
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('Failed to parse firebase-applet-config.json', err);
  }
}

// Initialize Web Firebase
const app = getApps().length === 0 ? initializeApp({
  apiKey: config.apiKey,
  authDomain: config.authDomain,
  projectId: config.projectId,
  storageBucket: config.storageBucket,
  messagingSenderId: config.messagingSenderId,
  appId: config.appId,
}) : getApp();

// Pass custom database ID if specified
const db = getFirestore(app, config.firestoreDatabaseId || undefined);

// Fetch all banks
export async function getBanks(): Promise<Bank[]> {
  try {
    const querySnapshot = await getDocs(collection(db, 'banks'));
    if (querySnapshot.empty) {
      console.log('[Firebase] No banks found in Firestore. Seeding initial banks...');
      await saveBanks(INITIAL_BANKS);
      return INITIAL_BANKS;
    }

    const banks: Bank[] = [];
    querySnapshot.forEach(doc => {
      banks.push(doc.data() as Bank);
    });

    // Sort by id or name to maintain a stable order
    return banks.sort((a, b) => a.id.localeCompare(b.id));
  } catch (error) {
    console.error('[Firebase] Failed to get banks:', error);
    throw error;
  }
}

// Save banks back to Firebase Firestore
export async function saveBanks(banks: Bank[]): Promise<void> {
  try {
    // Read current documents in the 'banks' collection
    const querySnapshot = await getDocs(collection(db, 'banks'));
    const existingIds = querySnapshot.docs.map(doc => doc.id);
    const newIds = banks.map(b => b.id);

    type Op = { type: 'delete' | 'set'; docId: string; data?: Bank };
    const operations: Op[] = [];

    // Delete any banks that are no longer present in the updated list
    for (const id of existingIds) {
      if (!newIds.includes(id)) {
        operations.push({ type: 'delete', docId: id });
      }
    }

    // Upsert the updated banks list
    for (const b of banks) {
      operations.push({ type: 'set', docId: b.id, data: b });
    }

    // Process operations in chunks of max 300 to stay safely below Firestore's 500 batch limit
    const BATCH_SIZE = 300;
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const chunk = operations.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        if (op.type === 'delete') {
          batch.delete(doc(db, 'banks', op.docId));
        } else if (op.type === 'set' && op.data) {
          batch.set(doc(db, 'banks', op.docId), op.data);
        }
      }
      await batch.commit();
    }

    console.log(`[Firebase] Successfully saved ${banks.length} banks to Firestore.`);
  } catch (error) {
    console.error('[Firebase] Failed to save banks:', error);
    throw error;
  }
}

// Get history logs
export async function getHistory(): Promise<HistoryRecord[]> {
  try {
    const historyQuery = query(
      collection(db, 'history'),
      orderBy('tanggal', 'desc'),
      limit(100)
    );
    const snapshot = await getDocs(historyQuery);

    if (snapshot.empty) {
      return [];
    }

    const history: HistoryRecord[] = [];
    snapshot.forEach(doc => {
      history.push(doc.data() as HistoryRecord);
    });

    return history;
  } catch (error) {
    console.error('[Firebase] Failed to get history:', error);
    // Return empty list instead of throwing to prevent crashing the history view
    return [];
  }
}

// Append history record
export async function appendHistory(
  record: Omit<HistoryRecord, 'id'>,
  googleAccessToken?: string,
  spreadsheetId?: string
): Promise<void> {
  try {
    const id = `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullRecord: HistoryRecord = {
      id,
      ...record
    };

    await setDoc(doc(db, 'history', id), fullRecord);
    console.log('[Firebase] Successfully recorded history log to Firestore.');

    // If Google Sheet Sync is configured and token is provided
    if (googleAccessToken && spreadsheetId) {
      console.log('[Firebase] Attempting to auto-record history log to Google Sheets...');
      await appendHistoryToGoogleSheet(fullRecord, googleAccessToken, spreadsheetId);
    }
  } catch (error) {
    console.error('[Firebase] Failed to append history:', error);
  }
}

// Ensure 'HISTORY' sheet and its headers exist in the spreadsheet
async function ensureHistorySheetExists(sheets: any, spreadsheetId: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsList = meta.data.sheets || [];
    const sheetNames = sheetsList.map((s: any) => s.properties.title);

    if (!sheetNames.includes('HISTORY')) {
      // Create HISTORY sheet
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: [{
            addSheet: {
              properties: { title: 'HISTORY' }
            }
          }]
        }
      });
      console.log('[Google Sheets] Created HISTORY sheet.');
    }

    // Check if headers exist
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'HISTORY!A1:H1',
    });

    if (!res.data.values || res.data.values.length === 0) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'HISTORY!A1:H1',
        valueInputOption: 'RAW',
        requestBody: {
          values: [['ID', 'Tanggal', 'User', 'Aksi', 'Bank', 'Status Lama', 'Status Baru', 'Nomor Rekening']]
        }
      });
      console.log('[Google Sheets] Added headers to HISTORY sheet.');
    }
  } catch (error) {
    console.error('[Google Sheets] Error ensuring HISTORY sheet exists:', error);
    throw error;
  }
}

// Append history record directly to the user's Google Sheet
export async function appendHistoryToGoogleSheet(
  record: HistoryRecord,
  accessToken: string,
  spreadsheetId: string
): Promise<void> {
  try {
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });
    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });

    await ensureHistorySheetExists(sheets, spreadsheetId);

    // Format ISO Date String to local timestamp or custom format for spreadsheet
    // Convert to UTC/WIB or Indonesian display time: WIB is UTC+7
    const dateObj = new Date(record.tanggal);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    };
    const formatter = new Intl.DateTimeFormat('id-ID', options);
    const dateFormatted = formatter.format(dateObj).replace(/\//g, '-');

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'HISTORY!A2',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          record.id,
          dateFormatted,
          record.user,
          record.aksi,
          record.bank,
          record.statusLama,
          record.statusBaru,
          record.nomorRekening
        ]]
      }
    });
    console.log('[Google Sheets] Successfully appended history record to Google Sheet.');
  } catch (error) {
    console.error('[Google Sheets] Failed to append history to Google Sheet:', error);
    throw error;
  }
}

// === QRIS MINERA CACING DATABASE OPERATIONS ===

// Fetch all QRIS records
export async function getQrisRecords(): Promise<QrisRecord[]> {
  try {
    const snapshot = await getDocs(collection(db, 'qris_cacing'));
    if (snapshot.empty) {
      return [];
    }

    const records: QrisRecord[] = [];
    snapshot.forEach(doc => {
      records.push(doc.data() as QrisRecord);
    });

    // Sort by created_at or id
    return records.sort((a, b) => {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  } catch (error) {
    console.error('[Firebase] Failed to get QRIS records:', error);
    throw error;
  }
}

// Save all QRIS records (overwrite/bulk-sync)
export async function saveQrisRecords(records: QrisRecord[]): Promise<void> {
  try {
    // Get existing ones to delete what's no longer there
    const snapshot = await getDocs(collection(db, 'qris_cacing'));
    const existingIds = snapshot.docs.map(doc => doc.id);
    const newIds = records.map(r => r.id);

    type Op = { type: 'delete' | 'set'; docId: string; data?: QrisRecord };
    const operations: Op[] = [];

    for (const id of existingIds) {
      if (!newIds.includes(id)) {
        operations.push({ type: 'delete', docId: id });
      }
    }

    for (const r of records) {
      operations.push({ type: 'set', docId: r.id, data: r });
    }

    // Process operations in chunks of max 300 to stay safely below Firestore's 500 batch limit
    const BATCH_SIZE = 300;
    for (let i = 0; i < operations.length; i += BATCH_SIZE) {
      const chunk = operations.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);
      for (const op of chunk) {
        if (op.type === 'delete') {
          batch.delete(doc(db, 'qris_cacing', op.docId));
        } else if (op.type === 'set' && op.data) {
          batch.set(doc(db, 'qris_cacing', op.docId), op.data);
        }
      }
      await batch.commit();
    }

    console.log(`[Firebase] Successfully saved ${records.length} QRIS records to Firestore.`);
  } catch (error) {
    console.error('[Firebase] Failed to save QRIS records:', error);
    throw error;
  }
}

// Delete single QRIS record
export async function deleteQrisRecord(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, 'qris_cacing', id));
    console.log(`[Firebase] Successfully deleted QRIS record: ${id}`);
  } catch (error) {
    console.error('[Firebase] Failed to delete QRIS record:', error);
    throw error;
  }
}

// Clear all QRIS records
export async function clearQrisRecords(): Promise<void> {
  try {
    const snapshot = await getDocs(collection(db, 'qris_cacing'));
    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.forEach(d => {
      batch.delete(d.ref);
    });

    await batch.commit();
    console.log('[Firebase] Successfully cleared all QRIS records.');
  } catch (error) {
    console.error('[Firebase] Failed to clear QRIS records:', error);
    throw error;
  }
}
