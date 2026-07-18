import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as fs from 'fs';
import * as path from 'path';
import { Bank } from '../types';
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

// In Cloud Run or development, initialize the firebase admin app if not already initialized
if (getApps().length === 0) {
  initializeApp({
    projectId: config.projectId || process.env.FIREBASE_PROJECT_ID,
  });
}

// Get the custom databaseId if specified in our config
const db = getFirestore(
  getApps()[0],
  config.firestoreDatabaseId || undefined
);

// Fetch all banks
export async function getBanks(): Promise<Bank[]> {
  try {
    const snapshot = await db.collection('banks').get();
    if (snapshot.empty) {
      console.log('[Firebase] No banks found in Firestore. Seeding initial banks...');
      await saveBanks(INITIAL_BANKS);
      return INITIAL_BANKS;
    }

    const banks: Bank[] = [];
    snapshot.forEach(doc => {
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
    const batch = db.batch();
    
    // Read current documents in the 'banks' collection
    const snapshot = await db.collection('banks').get();
    const existingIds = snapshot.docs.map(doc => doc.id);
    const newIds = banks.map(b => b.id);

    // Delete any banks that are no longer present in the updated list
    for (const id of existingIds) {
      if (!newIds.includes(id)) {
        batch.delete(db.collection('banks').doc(id));
      }
    }

    // Upsert the updated banks list
    for (const b of banks) {
      const docRef = db.collection('banks').doc(b.id);
      batch.set(docRef, b);
    }

    await batch.commit();
    console.log(`[Firebase] Successfully saved ${banks.length} banks to Firestore.`);
  } catch (error) {
    console.error('[Firebase] Failed to save banks:', error);
    throw error;
  }
}

// Get history logs
export async function getHistory(): Promise<HistoryRecord[]> {
  try {
    const snapshot = await db.collection('history')
      .orderBy('tanggal', 'desc')
      .limit(100)
      .get();

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
export async function appendHistory(record: Omit<HistoryRecord, 'id'>): Promise<void> {
  try {
    const id = `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const fullRecord: HistoryRecord = {
      id,
      ...record
    };

    await db.collection('history').doc(id).set(fullRecord);
    console.log('[Firebase] Successfully recorded history log to Firestore.');
  } catch (error) {
    console.error('[Firebase] Failed to append history:', error);
  }
}
