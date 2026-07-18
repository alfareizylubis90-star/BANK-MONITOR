import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';
import { Bank, BankStatus } from '../types';
import { INITIAL_BANKS } from '../data/initialBanks';

export interface HistoryRecord {
  id: string;
  tanggal: string;
  user: string;
  aksi: string;
  bank: string;
  statusLama: string;
  statusBaru: string;
  nomorRekening: string;
}

const LOCAL_BANKS_FILE = path.join(process.cwd(), 'banks_database.json');
const LOCAL_HISTORY_FILE = path.join(process.cwd(), 'history_database.json');

// Helper to read local backup
function readLocalBanks(): Bank[] {
  if (fs.existsSync(LOCAL_BANKS_FILE)) {
    try {
      const data = fs.readFileSync(LOCAL_BANKS_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading local banks JSON:', e);
    }
  }
  // Initialize with default data
  writeLocalBanks(INITIAL_BANKS);
  return INITIAL_BANKS;
}

function writeLocalBanks(banks: Bank[]) {
  try {
    fs.writeFileSync(LOCAL_BANKS_FILE, JSON.stringify(banks, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing local banks JSON:', e);
  }
}

function readLocalHistory(): HistoryRecord[] {
  if (fs.existsSync(LOCAL_HISTORY_FILE)) {
    try {
      const data = fs.readFileSync(LOCAL_HISTORY_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      console.error('Error reading local history JSON:', e);
    }
  }
  return [];
}

function writeLocalHistory(history: HistoryRecord[]) {
  try {
    fs.writeFileSync(LOCAL_HISTORY_FILE, JSON.stringify(history, null, 2), 'utf8');
  } catch (e) {
    console.error('Error writing local history JSON:', e);
  }
}

// Check if credentials are configured
export function isSheetsConfigured(): boolean {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const key = process.env.GOOGLE_PRIVATE_KEY || '';
  const spreadsheetId = process.env.SPREADSHEET_ID || '';
  return email !== '' && key !== '' && spreadsheetId !== '';
}

// Get Google Sheets client
function getSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY;
  if (!email || !key) {
    throw new Error('Google service account email or private key is missing.');
  }

  // Handle newlines in private key
  key = key.replace(/\\n/g, '\n');

  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

// Ensure sheets exists with headers in Google Sheet
async function ensureSheetsAndHeaders(sheets: any, spreadsheetId: string) {
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId });
    const sheetsList = meta.data.sheets || [];
    const sheetNames = sheetsList.map((s: any) => s.properties.title);

    const sheetsToCreate: string[] = [];
    if (!sheetNames.includes('BANKS')) sheetsToCreate.push('BANKS');
    if (!sheetNames.includes('HISTORY')) sheetsToCreate.push('HISTORY');

    if (sheetsToCreate.length > 0) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: {
          requests: sheetsToCreate.map(name => ({
            addSheet: {
              properties: { title: name }
            }
          }))
        }
      });
      console.log(`Created missing sheets: ${sheetsToCreate.join(', ')}`);
    }

    // Set headers if sheets are empty
    if (sheetsToCreate.includes('BANKS') || sheetNames.includes('BANKS')) {
      const res = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'BANKS!A1:G1',
      });
      if (!res.data.values || res.data.values.length === 0) {
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'BANKS!A1:G1',
          valueInputOption: 'RAW',
          requestBody: {
            values: [['ID', 'Bank', 'No Rek', 'Nama', 'Status', 'Keterangan', 'UpdatedAt']]
          }
        });
        // Seed default banks if freshly created
        const seedValues = INITIAL_BANKS.map(b => [
          b.id,
          b.name,
          b.accountNumber,
          b.accountName,
          b.status,
          b.notes || '',
          b.updatedAt
        ]);
        await sheets.spreadsheets.values.update({
          spreadsheetId,
          range: 'BANKS!A2:G' + (seedValues.length + 1),
          valueInputOption: 'RAW',
          requestBody: {
            values: seedValues
          }
        });
      }
    }

    if (sheetsToCreate.includes('HISTORY') || sheetNames.includes('HISTORY')) {
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
      }
    }
  } catch (error) {
    console.error('Error ensuring sheets/headers:', error);
    throw error;
  }
}

// Fetch all banks
export async function getBanks(): Promise<Bank[]> {
  if (!isSheetsConfigured()) {
    console.log('[Database] Google Sheets not configured. Falling back to local storage.');
    return readLocalBanks();
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID!;
    
    await ensureSheetsAndHeaders(sheets, spreadsheetId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'BANKS!A2:G999',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map(row => ({
      id: row[0] || '',
      name: row[1] || '',
      accountNumber: row[2] || '',
      accountName: row[3] || '',
      status: (row[4] as BankStatus) || 'Aman',
      notes: row[5] || '',
      updatedAt: row[6] || new Date().toISOString()
    }));
  } catch (error) {
    console.error('Failed to get banks from Google Sheet, using local backup:', error);
    return readLocalBanks();
  }
}

// Save banks back to Google Sheets
export async function saveBanks(banks: Bank[]): Promise<void> {
  // Always update local backup first
  writeLocalBanks(banks);

  if (!isSheetsConfigured()) {
    return;
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID!;

    await ensureSheetsAndHeaders(sheets, spreadsheetId);

    // Clear existing values in BANKS range (except header)
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'BANKS!A2:G999',
    });

    if (banks.length > 0) {
      const values = banks.map(b => [
        b.id,
        b.name,
        b.accountNumber,
        b.accountName,
        b.status,
        b.notes,
        b.updatedAt
      ]);

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `BANKS!A2:G${banks.length + 1}`,
        valueInputOption: 'RAW',
        requestBody: { values }
      });
    }
  } catch (error) {
    console.error('Failed to save banks to Google Sheets:', error);
    throw error;
  }
}

// Get all history records
export async function getHistory(): Promise<HistoryRecord[]> {
  if (!isSheetsConfigured()) {
    return readLocalHistory();
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID!;
    
    await ensureSheetsAndHeaders(sheets, spreadsheetId);

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'HISTORY!A2:H999',
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return [];
    }

    return rows.map(row => ({
      id: row[0] || '',
      tanggal: row[1] || '',
      user: row[2] || '',
      aksi: row[3] || '',
      bank: row[4] || '',
      statusLama: row[5] || '',
      statusBaru: row[6] || '',
      nomorRekening: row[7] || ''
    }));
  } catch (error) {
    console.error('Failed to get history from Google Sheet, using local backup:', error);
    return readLocalHistory();
  }
}

// Append history record
export async function appendHistory(record: Omit<HistoryRecord, 'id'>): Promise<void> {
  const fullRecord: HistoryRecord = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    ...record
  };

  const currentLocalHistory = readLocalHistory();
  writeLocalHistory([fullRecord, ...currentLocalHistory].slice(0, 500)); // limit to 500 records local

  if (!isSheetsConfigured()) {
    return;
  }

  try {
    const sheets = getSheetsClient();
    const spreadsheetId = process.env.SPREADSHEET_ID!;

    await ensureSheetsAndHeaders(sheets, spreadsheetId);

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'HISTORY!A2',
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          fullRecord.id,
          fullRecord.tanggal,
          fullRecord.user,
          fullRecord.aksi,
          fullRecord.bank,
          fullRecord.statusLama,
          fullRecord.statusBaru,
          fullRecord.nomorRekening
        ]]
      }
    });
  } catch (error) {
    console.error('Failed to append history to Google Sheets:', error);
  }
}
