import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { getBanks, saveBanks, getHistory, appendHistory } from './src/db/firebase';
import { Bank } from './src/types';

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
      });

      res.status(201).json(newBank);
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal menambahkan bank: ' + error.message });
    }
  });

  // API Route: Edit bank
  app.put('/api/banks/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData: Partial<Bank> = req.body;

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
      });

      res.json(updatedBank);
    } catch (error: any) {
      res.status(500).json({ error: 'Gagal mengedit bank: ' + error.message });
    }
  });

  // API Route: Delete bank
  app.delete('/api/banks/:id', async (req, res) => {
    try {
      const { id } = req.params;
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
      });

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
