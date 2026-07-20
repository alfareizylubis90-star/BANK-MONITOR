import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getBanks, saveBanks, getHistory, appendHistory, getQrisRecords, saveQrisRecords, deleteQrisRecord, clearQrisRecords } from './src/db/firebase';
import { Bank, QrisRecord } from './src/types';

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json());

  // API Route: Get DB connection status
  app.get('/api/sheets-status', (req, res) => {
    res.json({
      configured: true,
      type: 'firebase'
    });
  });

  // API Route: Get all banks
  app.get('/api/banks', async (req, res) => {
    try {
      const banks = await getBanks();
      res.json(banks);
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal mengambil data bank: ' + error.message });
    }
  });

  // API Route: Add bank
  app.post('/api/banks', async (req, res) => {
    try {
      const googleAccessToken = req.headers['x-google-access-token'] as string | undefined;
      const spreadsheetId = req.headers['x-google-spreadsheet-id'] as string | undefined;

      const newBank: Bank = req.body;
      if (!newBank.id || !newBank.name || !newBank.accountNumber || !newBank.accountName || !newBank.status) {
        return res.status(400).json({ error: 'Data bank tidak lengkap.' });
      }

      const banks = await getBanks();
      // Check for duplicate ID
      if (banks.some(b => b.id === newBank.id)) {
        return res.status(400).json({ error: 'ID Bank sudah terdaftar.' });
      }

      banks.push(newBank);
      await saveBanks(banks);

      // Record History for Creation
      await appendHistory({
        tanggal: new Date().toISOString(),
        user: req.headers['x-user-email'] as string || 'Unknown Admin',
        aksi: 'CREATE',
        bank: newBank.name,
        statusLama: '-',
        statusBaru: newBank.status,
        nomorRekening: newBank.accountNumber
      }, googleAccessToken, spreadsheetId);

      res.status(201).json(newBank);
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal menambahkan bank: ' + error.message });
    }
  });

  // API Route: Add banks in bulk (Sekali Tempel)
  app.post('/api/banks/bulk', async (req, res) => {
    try {
      const googleAccessToken = req.headers['x-google-access-token'] as string | undefined;
      const spreadsheetId = req.headers['x-google-spreadsheet-id'] as string | undefined;
      const userEmail = req.headers['x-user-email'] as string || 'Unknown Admin';

      const newBanks: Bank[] = req.body;
      if (!Array.isArray(newBanks) || newBanks.length === 0) {
        return res.status(400).json({ error: 'Data bulk bank tidak valid.' });
      }

      // Check for any incomplete data
      for (const b of newBanks) {
        if (!b.id || !b.name || !b.accountNumber || !b.accountName || !b.status) {
          return res.status(400).json({ error: 'Salah satu data bank tidak lengkap.' });
        }
      }

      const banks = await getBanks();
      
      // Filter out duplicates and append
      const addedBanks: Bank[] = [];
      for (const newBank of newBanks) {
        if (!banks.some(b => b.id === newBank.id)) {
          banks.push(newBank);
          addedBanks.push(newBank);
        }
      }

      if (addedBanks.length === 0) {
        return res.status(400).json({ error: 'Semua ID Bank sudah terdaftar sebelumnya.' });
      }

      // Save all updated list to Firestore
      await saveBanks(banks);

      // Record History for each added bank sequentially
      for (const b of addedBanks) {
        await appendHistory({
          tanggal: new Date().toISOString(),
          user: userEmail,
          aksi: 'CREATE',
          bank: b.name,
          statusLama: '-',
          statusBaru: b.status,
          nomorRekening: b.accountNumber
        }, googleAccessToken, spreadsheetId);
      }

      res.status(201).json({ message: 'Berhasil menyimpan bulk bank.', count: addedBanks.length, data: addedBanks });
    } catch (error: any) {
      console.error('[Bulk Server] error:', error);
      res.status(500).json({ error: 'Gagal menambahkan bulk bank: ' + error.message });
    }
  });

  // API Route: Edit bank
  app.put('/api/banks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData: Partial<Bank> = req.body;
      const googleAccessToken = req.headers['x-google-access-token'] as string | undefined;
      const spreadsheetId = req.headers['x-google-spreadsheet-id'] as string | undefined;

      const banks = await getBanks();
      const index = banks.findIndex(b => b.id === id);

      if (index === -1) {
        return res.status(404).json({ error: 'Bank tidak ditemukan.' });
      }

      const oldBank = banks[index];
      const updatedBank: Bank = {
        ...oldBank,
        ...updatedData,
        id, // preserve original ID
        updatedAt: new Date().toISOString()
      };

      banks[index] = updatedBank;
      await saveBanks(banks);

      // Record History for Edit
      await appendHistory({
        tanggal: new Date().toISOString(),
        user: req.headers['x-user-email'] as string || 'Unknown Admin',
        aksi: 'EDIT',
        bank: updatedBank.name,
        statusLama: oldBank.status,
        statusBaru: updatedBank.status,
        nomorRekening: updatedBank.accountNumber
      }, googleAccessToken, spreadsheetId);

      res.json(updatedBank);
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal mengedit bank: ' + error.message });
    }
  });

  // API Route: Delete bank
  app.delete('/api/banks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const googleAccessToken = req.headers['x-google-access-token'] as string | undefined;
      const spreadsheetId = req.headers['x-google-spreadsheet-id'] as string | undefined;

      const banks = await getBanks();
      const bankToDelete = banks.find(b => b.id === id);

      if (!bankToDelete) {
        return res.status(404).json({ error: 'Bank tidak ditemukan.' });
      }

      const filteredBanks = banks.filter(b => b.id !== id);
      await saveBanks(filteredBanks);

      // Record History for Delete
      await appendHistory({
        tanggal: new Date().toISOString(),
        user: req.headers['x-user-email'] as string || 'Unknown Admin',
        aksi: 'DELETE',
        bank: bankToDelete.name,
        statusLama: bankToDelete.status,
        statusBaru: '-',
        nomorRekening: bankToDelete.accountNumber
      }, googleAccessToken, spreadsheetId);

      res.json({ message: 'Data berhasil dihapus.', id });
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal menghapus bank: ' + error.message });
    }
  });

  // API Route: Get history logs
  app.get('/api/history', async (req, res) => {
    try {
      const history = await getHistory();
      res.json(history);
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal mengambil data riwayat: ' + error.message });
    }
  });

  // === QRIS MINERA CACING API ENDPOINTS ===

  // Get all QRIS cacing records
  app.get('/api/qris-cacing', async (req, res) => {
    try {
      const records = await getQrisRecords();
      res.json(records);
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal mengambil data QRIS: ' + error.message });
    }
  });

  // Save/Replace all QRIS cacing records
  app.post('/api/qris-cacing/bulk', async (req, res) => {
    try {
      const records: QrisRecord[] = req.body;
      if (!Array.isArray(records)) {
        return res.status(400).json({ error: 'Format data tidak valid.' });
      }
      await saveQrisRecords(records);
      res.json({ message: 'Berhasil menyimpan data QRIS.', count: records.length, data: records });
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal menyimpan data QRIS: ' + error.message });
    }
  });

  // Delete a single QRIS cacing record
  app.delete('/api/qris-cacing/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await deleteQrisRecord(id);
      res.json({ message: 'Data QRIS berhasil dihapus.', id });
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal menghapus data QRIS: ' + error.message });
    }
  });

  // Clear all QRIS cacing records
  app.delete('/api/qris-cacing', async (req, res) => {
    try {
      await clearQrisRecords();
      res.json({ message: 'Semua data QRIS berhasil dibersihkan.' });
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal membersihkan data QRIS: ' + error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
