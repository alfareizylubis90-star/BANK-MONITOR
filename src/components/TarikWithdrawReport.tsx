import React, { useState, useEffect, useMemo } from 'react';
import { 
  ArrowDownToLine, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  Edit3, 
  Sparkles, 
  Building2, 
  User, 
  Hash, 
  DollarSign,
  Info, 
  ListOrdered, 
  Download, 
  Search,
  Filter,
  Layers,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Table as TableIcon,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface WithdrawRecord {
  id: string;
  noUrut?: string;
  bankName: string;
  accountNumber: string;
  userId: string;
  accountName: string;
  nominalRaw: string;
  nominalNum: number;
  trxId?: string;
  timestamp?: string;
  statusText?: string;
  rawLine?: string;
}

interface TarikWithdrawReportProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'loading' | 'info') => void;
}

export default function TarikWithdrawReport({ showToast }: TarikWithdrawReportProps) {
  // Input paste text state (clean start, no sample forced into textarea)
  const [pasteInput, setPasteInput] = useState<string>(() => {
    return localStorage.getItem('tarik_wd_paste_input') || '';
  });

  // Delimiter for 5 horizontal columns ('tab' for Excel | 'pipe' | 'comma' | 'space' | 'list')
  const [outputFormat, setOutputFormat] = useState<'tab' | 'pipe' | 'comma' | 'space' | 'list'>(() => {
    return (localStorage.getItem('tarik_wd_format') as any) || 'tab';
  });

  // Nominal output style ('original' | 'clean_id' | 'clean_en' | 'digits_only' | 'rp')
  const [nominalStyle, setNominalStyle] = useState<'original' | 'clean_id' | 'clean_en' | 'digits_only' | 'rp'>('original');

  // Include Header Row in text copy (default to FALSE so headers and 'AKSI' are never copied)
  const [includeHeaderRow, setIncludeHeaderRow] = useState<boolean>(false);

  // Bank Filter
  const [selectedBankFilter, setSelectedBankFilter] = useState<string>('ALL');

  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pagination for high volume (1000+ data)
  const [pageSize, setPageSize] = useState<number>(50);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Copy indicator states
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal edit state
  const [editingItem, setEditingItem] = useState<WithdrawRecord | null>(null);

  // List of known Banks for fuzzy detection
  const knownBanks = [
    'SEABANK', 'JAGO', 'BANK JAGO', 'BCA', 'BANK BCA', 'MANDIRI', 'BANK MANDIRI', 
    'BRI', 'BANK BRI', 'BNI', 'BANK BNI', 'CIMB', 'BANK CIMB', 'DANAMON', 
    'PERMATA', 'NEO', 'BNC', 'BSI', 'OVO', 'DANA', 'GOPAY', 'SHOPEEPAY', 
    'LINKAJA', 'PANIN', 'MAYBANK', 'ALLO', 'OCTO', 'NOBU'
  ];

  // Helper to detect Date and Timestamp patterns (Tanggal Awal / Tanggal Selesai / Jam)
  const isDatePattern = (str: string): boolean => {
    const s = str.trim();
    if (!s) return false;
    // YYYY-MM-DD or DD-MM-YYYY or YYYY/MM/DD or DD/MM/YYYY with or without time
    if (/^\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?)?$/i.test(s)) return true;
    if (/^\d{1,2}[-/.]\d{1,2}[-/.]\d{4}(?:\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?)?$/i.test(s)) return true;
    // Pure time HH:MM:SS
    if (/^\d{1,2}:\d{2}(?::\d{2})?(?:\s*(?:AM|PM))?$/i.test(s)) return true;
    return false;
  };

  // Helper to detect Order ID patterns
  const isOrderIdPattern = (str: string): boolean => {
    const s = str.trim();
    if (!s) return false;
    // Patterns like LGBDT-GARUDA2558019, WD-123456, TRX-99881, ORDER-123, LGBDT1234, etc.
    if (/^[A-Z0-9]{3,12}-[A-Z0-9\-]{4,30}$/i.test(s)) return true;
    if (/^LGBDT[-_A-Z0-9]*/i.test(s)) return true;
    if (/^(?:ORDER|TRX|TXN|WD|REF|INV)[-_#]?[A-Z0-9]{5,}$/i.test(s)) return true;
    return false;
  };

  // Helper to detect Status or Noise terms (Status / Aksi / Simbol)
  const isStatusOrNoise = (str: string): boolean => {
    const s = str.trim().toLowerCase();
    if (!s || s === '-' || s === '--' || s === '---' || s === 'n/a' || s === 'null') return true;
    // Common statuses and keywords like "for payment", "wait for payment", "resend move", etc.
    if (/^(?:for\s+payment|wait\s+for\s+payment|wait\s*for\s*pay|waiting\s+for\s+payment|waiting|wait|for|payment|resend\s+move|resend|move|success|completed|pending|approved|rejected|failed|sukses|berhasil|proses|processing|in\s+process|done|cancelled|canceled|expired|settled|manual|auto|hold)$/i.test(s)) {
      return true;
    }
    return false;
  };

  // High-performance parser for individual line
  const parseWithdrawLine = (line: string, index: number): WithdrawRecord | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    let noUrut = '';
    let userId = '';
    let accountName = '';
    let accountNumber = '';
    let bankName = '';
    let nominalRaw = '';
    let nominalNum = 0;
    let trxId = '';
    let timestamp = '';
    let statusText = '';

    // Check if line is Tab-separated (Excel / Backoffice Copy)
    if (line.includes('\t')) {
      // Split by tab and remove empty leading/trailing artifacts
      const rawTokens = line.split('\t').map(t => t.trim());
      // Filter out purely empty tokens while preserving token sequence
      const nonEmpties = rawTokens.filter(Boolean);

      // Typical tabular structure from user:
      // Token 0: "1" (No Urut)
      // Token 1: "mantapooi" (UserID)
      // Token 2: "ENI WARI WAHYUNI" (Nama Rekening)
      // Token 3: "901040105478" (Nomor Rekening)
      // Token 4: "SEABANK" (Jenis Bank)
      // Token 5: "LGBDT-GARUDA2558019" (Trx ID / Order ID) -> EXCLUDE FROM DATA
      // Token 6: "-"
      // Token 7: "2026-08-21 08:06:48" (Timestamp)
      // Token 8: "-"
      // Token 9: "255,000.00" (Nominal)
      // Token 10: "wait for payment" (Status)
      // Token 11: "-"
      // Token 12: "Resend Move"

      // First pass: identify Order ID, Timestamps, Status, Bank, Account Number, and Nominal
      const remainingTokens: string[] = [];

      for (let i = 0; i < nonEmpties.length; i++) {
        const tok = nonEmpties[i];

        // 1. Detect Order ID (Exclude from data)
        if (isOrderIdPattern(tok)) {
          trxId = tok;
          continue; // DISCARD: DO NOT PUT INTO 5 COLUMNS
        }

        // 2. Detect Status or Noise (Exclude)
        if (isStatusOrNoise(tok)) {
          if (!statusText && tok !== '-') statusText = tok;
          continue; // DISCARD
        }

        // 3. Detect Timestamp & Dates (Tanggal Awal / Tanggal Selesai / Jam - Discard from data)
        if (isDatePattern(tok) || /\d{4}[-/.]\d{1,2}[-/.]\d{1,2}/.test(tok) || /\d{1,2}:\d{2}(?::\d{2})?/.test(tok)) {
          timestamp = tok;
          continue; // DISCARD from 5 columns
        }

        // 4. Detect Currency / Nominal (e.g. 255,000.00 or 500,000.00)
        if (!nominalRaw && /^[\d,.]+(?:\.\d{2})?$/.test(tok) && (tok.includes(',') || tok.includes('.') || (parseFloat(tok) >= 1000 && !/^\d{8,}$/.test(tok)))) {
          if (!tok.includes('-') && !tok.includes(':')) {
            nominalRaw = tok;
            continue;
          }
        }

        // 5. Detect Known Bank Name
        const isBank = knownBanks.some(b => b.toUpperCase() === tok.toUpperCase() || tok.toUpperCase() === `BANK ${b.toUpperCase()}`);
        if (isBank && !bankName) {
          bankName = tok.toUpperCase();
          continue;
        }

        // 6. Detect Account Number (pure digit string between 8 and 20 digits)
        if (!accountNumber && /^\d{8,20}$/.test(tok)) {
          accountNumber = tok;
          continue;
        }

        remainingTokens.push(tok);
      }

      // Handle No Urut if first remaining token is just a counter
      if (remainingTokens.length > 0 && /^\d{1,5}$/.test(remainingTokens[0])) {
        noUrut = remainingTokens.shift() || '';
      }

      // Assign UserID and Account Name from remaining tokens
      if (remainingTokens.length > 0 && !userId) {
        // First token is UserID
        userId = remainingTokens.shift() || '';
      }
      if (remainingTokens.length > 0 && !accountName) {
        // Next token(s) is Account Name
        accountName = remainingTokens.join(' ');
      }

    } else {
      // Space-delimited fallback parsing
      let working = trimmed;

      // Extract and remove Order ID first (e.g. LGBDT-GARUDA2558019)
      const orderIdMatch = working.match(/\b(?:LGBDT-[A-Z0-9\-]+|[A-Z0-9]{3,10}-[A-Z0-9\-]{4,30})\b/i);
      if (orderIdMatch) {
        trxId = orderIdMatch[0];
        working = working.replace(orderIdMatch[0], ' '); // Remove Order ID completely
      }

      // Check leading number (No Urut)
      const noMatch = working.match(/^(\d{1,5})\s+/);
      if (noMatch) {
        noUrut = noMatch[1];
        working = working.replace(noMatch[0], ' ');
      }

      // Find Bank in line
      for (const b of knownBanks) {
        const regex = new RegExp(`\\b${b.replace(/\s+/g, '\\s+')}\\b`, 'i');
        if (regex.test(working)) {
          bankName = b;
          working = working.replace(regex, ' ');
          break;
        }
      }

      // Find Account Number (8 to 20 digits)
      const accMatch = working.match(/\b\d{8,20}\b/);
      if (accMatch) {
        accountNumber = accMatch[0];
        working = working.replace(accMatch[0], ' ');
      }

      // Find Nominal (e.g., 255,000.00 or 500,000.00)
      const amtMatch = working.match(/\b\d{1,3}(?:,\d{3})+(?:\.\d{2})?\b/) || working.match(/\b\d{1,3}(?:\.\d{3})+(?:,\d{2})?\b/);
      if (amtMatch) {
        nominalRaw = amtMatch[0];
        working = working.replace(amtMatch[0], ' ');
      }

      // Find and remove all Timestamp / Dates (Tanggal Awal / Tanggal Transaksi)
      const dateMatches = working.match(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\b/g) || [];
      dateMatches.forEach(d => {
        if (!timestamp) timestamp = d;
        working = working.replace(d, ' ');
      });
      // Also remove pure time if any left (e.g. 08:06:48)
      working = working.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ');

      // Clean remaining tokens for UserID and Account Name (exclude noise, status, order id, date leftovers)
      const words = working
        .replace(/[-_:,|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(w => !isStatusOrNoise(w) && !isOrderIdPattern(w) && !isDatePattern(w) && w.length > 0);

      if (words.length > 0) {
        userId = words[0];
        accountName = words.slice(1).join(' ');
      }
    }

    // Clean and Normalize
    userId = userId.trim();
    // Safety check: remove any trailing order id pattern or noise from userId
    if (isOrderIdPattern(userId) || isStatusOrNoise(userId)) userId = '';
    
    // Safety check: clean accountName from Order IDs, dates, and status phrases like FOR PAYMENT, WAIT FOR PAYMENT, RESEND MOVE
    accountName = accountName
      .replace(/\b(?:LGBDT-[A-Z0-9\-]+|[A-Z0-9]{3,10}-[A-Z0-9\-]{4,30})\b/gi, '')
      .replace(/\b(?:wait\s+for\s+payment|for\s+payment|waiting\s+for\s+payment|resend\s+move|resend|move|wait|payment|processing|success|completed|pending)\b/gi, '')
      .replace(/\b\d{4}[-/.]\d{1,2}[-/.]\d{1,2}(?:\s+\d{1,2}:\d{2}(?::\d{2})?)?\b/g, '')
      .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, '')
      .replace(/[-_:,|]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
    accountNumber = accountNumber.replace(/[-\s]/g, '').trim();
    bankName = (bankName || 'BANK').trim().toUpperCase();
    nominalRaw = (nominalRaw || '0').trim();

    // Calculate numeric nominal value
    // Handle "255,000.00" -> 255000, or "255.000" -> 255000
    let cleanNumStr = nominalRaw;
    if (cleanNumStr.includes(',') && cleanNumStr.includes('.')) {
      // US Format: 255,000.00
      cleanNumStr = cleanNumStr.replace(/,/g, '');
    } else if (cleanNumStr.includes('.')) {
      // Indonesian format (255.000) or decimal
      if (/^\d{1,3}(?:\.\d{3})+$/.test(cleanNumStr)) {
        cleanNumStr = cleanNumStr.replace(/\./g, '');
      }
    } else if (cleanNumStr.includes(',')) {
      // Indonesian decimal (255000,00) or thousands (255,000)
      if (/^\d{1,3}(?:,\d{3})+$/.test(cleanNumStr)) {
        cleanNumStr = cleanNumStr.replace(/,/g, '');
      } else {
        cleanNumStr = cleanNumStr.replace(/,/g, '.');
      }
    }
    nominalNum = parseFloat(cleanNumStr) || 0;

    return {
      id: `wd_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
      noUrut: noUrut || `${index + 1}`,
      bankName: bankName,
      accountNumber: accountNumber,
      userId: userId,
      accountName: accountName,
      nominalRaw: nominalRaw,
      nominalNum: nominalNum,
      trxId: trxId,
      timestamp: timestamp,
      statusText: statusText,
      rawLine: trimmed
    };
  };

  // Parse all lines whenever pasteInput changes
  const parsedRecords = useMemo(() => {
    if (!pasteInput.trim()) return [];

    const lines = pasteInput.split('\n');
    const results: WithdrawRecord[] = [];

    for (let i = 0; i < lines.length; i++) {
      const rec = parseWithdrawLine(lines[i], i);
      if (rec && (rec.userId || rec.accountName || rec.accountNumber)) {
        results.push(rec);
      }
    }

    return results;
  }, [pasteInput]);

  // Format single nominal value based on selected style
  const formatNominalDisplay = (rec: WithdrawRecord) => {
    if (nominalStyle === 'original') {
      return rec.nominalRaw;
    } else if (nominalStyle === 'digits_only') {
      return String(Math.floor(rec.nominalNum));
    } else if (nominalStyle === 'clean_id') {
      return new Intl.NumberFormat('id-ID').format(rec.nominalNum);
    } else if (nominalStyle === 'clean_en') {
      return new Intl.NumberFormat('en-US').format(rec.nominalNum);
    } else if (nominalStyle === 'rp') {
      return `Rp ${new Intl.NumberFormat('id-ID').format(rec.nominalNum)}`;
    }
    return rec.nominalRaw;
  };

  // Distinct banks for filter dropdown
  const availableBanks = useMemo(() => {
    const set = new Set<string>();
    parsedRecords.forEach(r => {
      if (r.bankName) set.add(r.bankName);
    });
    return Array.from(set).sort();
  }, [parsedRecords]);

  // Filtered & Searched records
  const filteredRecords = useMemo(() => {
    return parsedRecords.filter(item => {
      const matchesBank = selectedBankFilter === 'ALL' || item.bankName === selectedBankFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || (
        item.userId.toLowerCase().includes(q) ||
        item.accountName.toLowerCase().includes(q) ||
        item.accountNumber.includes(q) ||
        item.bankName.toLowerCase().includes(q) ||
        item.nominalRaw.includes(q)
      );
      return matchesBank && matchesQuery;
    });
  }, [parsedRecords, selectedBankFilter, searchQuery]);

  // Overall Statistics
  const stats = useMemo(() => {
    const totalCount = parsedRecords.length;
    const totalNominal = parsedRecords.reduce((acc, curr) => acc + curr.nominalNum, 0);
    const bankGroups: Record<string, { count: number; total: number }> = {};

    parsedRecords.forEach(r => {
      if (!bankGroups[r.bankName]) {
        bankGroups[r.bankName] = { count: 0, total: 0 };
      }
      bankGroups[r.bankName].count += 1;
      bankGroups[r.bankName].total += r.nominalNum;
    });

    return {
      totalCount,
      totalNominal,
      bankGroups
    };
  }, [parsedRecords]);

  // Generate 5-column formatted text output
  // Columns order requested: JENIS BANK & NOMOR REKENING & USERID & NAMA REKENING & NOMINAL
  const formattedOutputText = useMemo(() => {
    if (filteredRecords.length === 0) return '';

    const lines: string[] = [];

    // Header row
    if (includeHeaderRow) {
      if (outputFormat === 'tab') {
        lines.push(`JENIS BANK\tNOMOR REKENING\tUSERID\tNAMA REKENING\tNOMINAL`);
      } else if (outputFormat === 'pipe') {
        lines.push(`JENIS BANK | NOMOR REKENING | USERID | NAMA REKENING | NOMINAL`);
      } else if (outputFormat === 'comma') {
        lines.push(`JENIS BANK,NOMOR REKENING,USERID,NAMA REKENING,NOMINAL`);
      } else if (outputFormat === 'space') {
        lines.push(`JENIS BANK          NOMOR REKENING     USERID          NAMA REKENING             NOMINAL`);
      }
    }

    filteredRecords.forEach(item => {
      const nomStr = formatNominalDisplay(item);

      if (outputFormat === 'tab') {
        // Tab-separated: Perfect for direct paste into Excel / Spreadsheet across 5 columns!
        lines.push(`${item.bankName}\t${item.accountNumber}\t${item.userId}\t${item.accountName}\t${nomStr}`);
      } else if (outputFormat === 'pipe') {
        lines.push(`${item.bankName} | ${item.accountNumber} | ${item.userId} | ${item.accountName} | ${nomStr}`);
      } else if (outputFormat === 'comma') {
        lines.push(`"${item.bankName}","${item.accountNumber}","${item.userId}","${item.accountName}","${nomStr}"`);
      } else if (outputFormat === 'space') {
        const b = item.bankName.padEnd(16, ' ');
        const num = item.accountNumber.padEnd(18, ' ');
        const u = item.userId.padEnd(15, ' ');
        const name = item.accountName.padEnd(25, ' ');
        lines.push(`${b}${num}${u}${name}${nomStr}`);
      } else if (outputFormat === 'list') {
        lines.push(`JENIS BANK : ${item.bankName}
NOMOR REKENING : ${item.accountNumber}
USERID : ${item.userId}
NAMA REKENING : ${item.accountName}
NOMINAL : ${nomStr}`);
      }
    });

    return outputFormat === 'list' ? lines.join('\n\n') : lines.join('\n');
  }, [filteredRecords, outputFormat, nominalStyle, includeHeaderRow]);

  // Paginated records for table view (handling 1000+ smoothly)
  const totalPages = Math.ceil(filteredRecords.length / pageSize) || 1;
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // Handle Copy All (5 Horizontal Columns - Only 5 Data Columns without headers/action)
  const handleCopyAll = () => {
    if (!formattedOutputText) {
      showToast('Tidak ada data penarikan withdraw untuk disalin', 'error');
      return;
    }
    navigator.clipboard.writeText(formattedOutputText);
    setCopiedAll(true);
    showToast(`Berhasil menyalin ${filteredRecords.length} data murni (5 Kolom Tanpa Header/Aksi)!`, 'success');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Handle Copy Single Row (5 Columns)
  const handleCopySingle = (item: WithdrawRecord) => {
    const nomStr = formatNominalDisplay(item);
    let text = '';
    if (outputFormat === 'tab') {
      text = `${item.bankName}\t${item.accountNumber}\t${item.userId}\t${item.accountName}\t${nomStr}`;
    } else if (outputFormat === 'pipe') {
      text = `${item.bankName} | ${item.accountNumber} | ${item.userId} | ${item.accountName} | ${nomStr}`;
    } else if (outputFormat === 'comma') {
      text = `"${item.bankName}","${item.accountNumber}","${item.userId}","${item.accountName}","${nomStr}"`;
    } else if (outputFormat === 'list') {
      text = `JENIS BANK : ${item.bankName}
NOMOR REKENING : ${item.accountNumber}
USERID : ${item.userId}
NAMA REKENING : ${item.accountName}
NOMINAL : ${nomStr}`;
    } else {
      text = `${item.bankName}  ${item.accountNumber}  ${item.userId}  ${item.accountName}  ${nomStr}`;
    }

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    showToast(`Disalin: ${item.userId} - ${item.bankName} (${nomStr})`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle CSV Download
  const handleDownloadCsv = () => {
    if (filteredRecords.length === 0) {
      showToast('Tidak ada data untuk diexport', 'error');
      return;
    }
    const header = 'JENIS BANK,NOMOR REKENING,USERID,NAMA REKENING,NOMINAL\n';
    const rows = filteredRecords.map(r => `"${r.bankName}","'${r.accountNumber}","${r.userId}","${r.accountName}","${r.nominalNum}"`).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Tarik_Withdraw_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('File CSV berhasil didownload!', 'success');
  };

  // Add blank manual row
  const handleAddNewItem = () => {
    const newItem: WithdrawRecord = {
      id: `wd_manual_${Date.now()}`,
      noUrut: `${parsedRecords.length + 1}`,
      bankName: 'SEABANK',
      accountNumber: '901040105478',
      userId: 'mantapooi',
      accountName: 'ENI WARI WAHYUNI',
      nominalRaw: '255,000.00',
      nominalNum: 255000
    };
    // Append to textarea so it stays reactive
    const newLine = `${newItem.noUrut}\t\t${newItem.userId}\t${newItem.accountName}\t${newItem.accountNumber}\t${newItem.bankName}\t-\t-\t-\t-\t${newItem.nominalRaw}`;
    setPasteInput(prev => prev ? `${prev}\n${newLine}` : newLine);
    showToast('Baris baru berhasil ditambahkan', 'success');
  };

  // Save edit
  const handleSaveEdit = () => {
    if (!editingItem) return;
    // Update raw input text
    const updatedLines = parsedRecords.map(r => {
      if (r.id === editingItem.id) {
        return `${editingItem.noUrut}\t\t${editingItem.userId}\t${editingItem.accountName}\t${editingItem.accountNumber}\t${editingItem.bankName}\t-\t-\t-\t-\t${editingItem.nominalRaw}`;
      }
      return r.rawLine || `${r.noUrut}\t\t${r.userId}\t${r.accountName}\t${r.accountNumber}\t${r.bankName}\t-\t-\t-\t-\t${r.nominalRaw}`;
    });
    setPasteInput(updatedLines.join('\n'));
    setEditingItem(null);
    showToast('Perubahan data berhasil disimpan', 'success');
  };

  // Delete item
  const handleDeleteItem = (id: string) => {
    const remaining = parsedRecords.filter(r => r.id !== id);
    const updatedLines = remaining.map(r => r.rawLine || `${r.noUrut}\t\t${r.userId}\t${r.accountName}\t${r.accountNumber}\t${r.bankName}\t-\t-\t-\t-\t${r.nominalRaw}`);
    setPasteInput(updatedLines.join('\n'));
    showToast('Data baris dihapus', 'info');
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-100" id="tarik-withdraw-module">
      
      {/* Header Banner */}
      <div className="glass-gold-heavy p-6 border rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl border border-sky-500/40 bg-sky-500/15 text-sky-300 shadow-[0_0_20px_rgba(14,165,233,0.3)] shrink-0">
            <ArrowDownToLine className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide uppercase">
                Tarik Withdraw
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40">
                1000+ DATA SUPPORT
              </span>
            </div>
            <p className="text-xs text-[#D4AF37]/90 font-medium mt-1">
              Pemisah otomatis data penarikan withdraw ke dalam 5 kolom horizontal (<span className="text-white font-bold">JENIS BANK &bull; NOMOR REKENING &bull; USERID &bull; NAMA REKENING &bull; NOMINAL</span>). Siap langsung paste ke Excel.
            </p>
          </div>
        </div>

        {/* Global Stats Summary */}
        <div className="flex items-center gap-4 bg-black/60 border border-[#D4AF37]/20 p-3.5 rounded-xl self-start md:self-auto shrink-0">
          <div className="text-left pr-4 border-r border-[#D4AF37]/20">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Total Data WD</span>
            <span className="text-lg font-mono font-black text-sky-400">{stats.totalCount} Data</span>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Total Nominal</span>
            <span className="text-sm font-mono font-extrabold text-emerald-400 block">
              Rp {new Intl.NumberFormat('id-ID').format(stats.totalNominal)}
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Paste Box & Right 5-Column Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Tempel Area */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-gold-card p-5 border rounded-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-sky-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-300">
                  Area Tempel Data Withdraw
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPasteInput('')}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Bersihkan
              </button>
            </div>

            {/* Quick Example Guide (Visual reference without filling input) */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-mono block">Format tempel yang didukung (Mendukung hingga 1000+ data):</span>
              <div className="p-2.5 rounded-xl bg-black/60 border border-[#D4AF37]/20 font-mono text-[10px] text-sky-200 space-y-1 leading-relaxed overflow-x-auto">
                <p className="text-slate-400 font-bold">Contoh baris mentah:</p>
                <p className="text-sky-300 whitespace-nowrap">1		mantapooi	ENI WARI WAHYUNI	901040105478	SEABANK	LGBDT-GARUDA2558019	-	2026-08-21 08:06:48	-	255,000.00	wait for payment	-	Resend Move</p>
                <p className="text-sky-300 whitespace-nowrap">2		xiexie88	Yeny Novita Sari	104957313681	JAGO	LGBDT-GARUDA2558017	-	2026-08-21 08:06:33	-	500,000.00	wait for payment	-	Resend Move</p>
              </div>
            </div>

            {/* Textarea Input - Clean empty placeholder */}
            <div>
              <textarea
                value={pasteInput}
                onChange={(e) => {
                  setPasteInput(e.target.value);
                  localStorage.setItem('tarik_wd_paste_input', e.target.value);
                }}
                placeholder="Tempel data transaksi withdraw di sini (bisa langsung copy 1000+ baris dari backoffice / Excel)..."
                rows={11}
                className="w-full bg-black/80 border border-sky-500/30 rounded-xl p-3.5 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 transition-all resize-y shadow-inner"
              />
            </div>

            {/* Output Format Delimiter Selector */}
            <div className="space-y-2 pt-2 border-t border-[#D4AF37]/15">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Format 5 Kolom Kesamping
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setOutputFormat('tab')}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                    outputFormat === 'tab'
                      ? 'bg-sky-400 text-black font-black shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                      : 'bg-black/60 text-slate-300 border border-[#D4AF37]/20 hover:text-white'
                  }`}
                >
                  <span className="block">Tab (Excel Ready)</span>
                  <span className="text-[9px] opacity-75 font-mono block">Langsung 5 Kolom</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOutputFormat('pipe')}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                    outputFormat === 'pipe'
                      ? 'bg-sky-400 text-black font-black shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                      : 'bg-black/60 text-slate-300 border border-[#D4AF37]/20 hover:text-white'
                  }`}
                >
                  <span className="block">Garis ( | )</span>
                  <span className="text-[9px] opacity-75 font-mono block">Bank | Rek | User</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOutputFormat('comma')}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                    outputFormat === 'comma'
                      ? 'bg-sky-400 text-black font-black shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                      : 'bg-black/60 text-slate-300 border border-[#D4AF37]/20 hover:text-white'
                  }`}
                >
                  <span className="block">Koma (CSV)</span>
                  <span className="text-[9px] opacity-75 font-mono block">"Bank","Rek"...</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOutputFormat('space')}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center ${
                    outputFormat === 'space'
                      ? 'bg-sky-400 text-black font-black shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                      : 'bg-black/60 text-slate-300 border border-[#D4AF37]/20 hover:text-white'
                  }`}
                >
                  <span className="block">Rata Kolom</span>
                  <span className="text-[9px] opacity-75 font-mono block">Spasi Lebar</span>
                </button>

                <button
                  type="button"
                  onClick={() => setOutputFormat('list')}
                  className={`px-3 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-center col-span-2 sm:col-span-2 ${
                    outputFormat === 'list'
                      ? 'bg-sky-400 text-black font-black shadow-[0_0_10px_rgba(56,189,248,0.4)]'
                      : 'bg-black/60 text-slate-300 border border-[#D4AF37]/20 hover:text-white'
                  }`}
                >
                  <span className="block">Format Teks Chat / List</span>
                  <span className="text-[9px] opacity-75 font-mono block">Per Baris (JENIS BANK : SEABANK...)</span>
                </button>
              </div>
            </div>

            {/* Nominal Display Format */}
            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#D4AF37]/15">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Format Angka Nominal
                </label>
                <select
                  value={nominalStyle}
                  onChange={(e) => setNominalStyle(e.target.value as any)}
                  className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-sky-400"
                >
                  <option value="original">Sesuai Teks Asli (255,000.00)</option>
                  <option value="clean_id">Format Titik Indo (255.000)</option>
                  <option value="clean_en">Format Koma (255,000)</option>
                  <option value="digits_only">Angka Polos (255000)</option>
                  <option value="rp">Dengan Rp (Rp 255.000)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Baris Judul Kolom
                </label>
                <button
                  type="button"
                  onClick={() => setIncludeHeaderRow(!includeHeaderRow)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-between cursor-pointer ${
                    includeHeaderRow
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : 'bg-black/60 text-slate-400 border-[#D4AF37]/20'
                  }`}
                >
                  <span>Sertakan Header</span>
                  {includeHeaderRow ? <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" /> : <span className="text-[10px] opacity-60">Tidak</span>}
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: 5 Horizontal Columns Result & Table */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Main 5-Column Text Box */}
          <div className="glass-gold-heavy p-5 border rounded-2xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D4AF37]/20">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-sky-300 flex items-center gap-2">
                  <TableIcon className="h-4 w-4 text-sky-400" />
                  Hasil 5 Kolom Kesamping ({filteredRecords.length} Data)
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  JENIS BANK &bull; NOMOR REKENING &bull; USERID &bull; NAMA REKENING &bull; NOMINAL
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-black/60 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all flex items-center gap-1.5 cursor-pointer shadow"
                  title="Download File CSV"
                >
                  <Download className="h-3.5 w-3.5" /> CSV
                </button>

                <button
                  type="button"
                  onClick={handleCopyAll}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 shadow-lg cursor-pointer ${
                    copiedAll 
                      ? 'bg-emerald-500 text-black shadow-emerald-500/20' 
                      : 'bg-gradient-to-r from-sky-400 to-[#D4AF37] hover:from-sky-300 hover:to-[#FFD700] text-black shadow-[0_0_15px_rgba(56,189,248,0.4)]'
                  }`}
                >
                  {copiedAll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedAll ? 'Tersalin Semua!' : 'Salin 5 Kolom'}
                </button>
              </div>
            </div>

            {/* Display Output Box */}
            {filteredRecords.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-black/40 border border-dashed border-sky-500/30 text-slate-400">
                <Info className="h-8 w-8 mx-auto text-sky-400/50 mb-2 animate-bounce" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Belum Ada Data Penarikan Withdraw Ditempel</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tempel data transaksi pada kotak sebelah kiri untuk memisahkan 5 kolom kesamping secara instan.
                </p>
              </div>
            ) : (
              <div className="relative">
                <textarea
                  readOnly
                  value={formattedOutputText}
                  rows={Math.min(Math.max(filteredRecords.length + (includeHeaderRow ? 2 : 1), 7), 14)}
                  className="w-full bg-[#050505] border border-sky-500/40 rounded-xl p-4 font-mono text-xs text-sky-200 leading-relaxed focus:outline-none shadow-inner selection:bg-sky-400 selection:text-black cursor-text overflow-x-auto whitespace-pre"
                />
              </div>
            )}

            {/* Quick Filter & Search Bar for Live Table */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari UserID, Nama, No Rek..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Filter className="h-3.5 w-3.5 text-slate-400" />
                <select
                  value={selectedBankFilter}
                  onChange={(e) => {
                    setSelectedBankFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="bg-black/60 border border-[#D4AF37]/30 rounded-lg px-2.5 py-1.5 text-xs text-sky-300 font-bold focus:outline-none focus:border-sky-400"
                >
                  <option value="ALL">Semua Bank ({parsedRecords.length})</option>
                  {availableBanks.map(b => (
                    <option key={b} value={b}>{b} ({stats.bankGroups[b]?.count || 0})</option>
                  ))}
                </select>

                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-black/60 border border-[#D4AF37]/30 rounded-lg px-2 py-1.5 text-xs text-slate-300 font-bold focus:outline-none focus:border-sky-400"
                >
                  <option value={25}>25 / hal</option>
                  <option value={50}>50 / hal</option>
                  <option value={100}>100 / hal</option>
                  <option value={250}>250 / hal</option>
                  <option value={500}>500 / hal</option>
                  <option value={1000}>1000 / hal</option>
                </select>
              </div>
            </div>

          </div>

          {/* Interactive 5-Column High-Performance Table */}
          {filteredRecords.length > 0 && (
            <div className="glass-gold-card p-4 border border-sky-500/20 rounded-2xl space-y-3">
              
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-sky-300 flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4" /> Tabel Data 5 Kolom Kesamping ({filteredRecords.length})
                </h4>
                <button
                  type="button"
                  onClick={handleAddNewItem}
                  className="text-xs font-bold text-sky-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Tambah Baris
                </button>
              </div>

              {/* Table Body */}
              <div className="overflow-x-auto rounded-xl border border-[#D4AF37]/20">
                <table className="w-full text-left text-xs text-slate-200 border-collapse">
                  <thead className="bg-[#0c0c0c] border-b border-[#D4AF37]/30 text-[10px] font-black uppercase text-sky-300 tracking-wider select-none">
                    <tr>
                      <th className="p-3 select-none">#</th>
                      <th className="p-3">JENIS BANK</th>
                      <th className="p-3">NOMOR REKENING</th>
                      <th className="p-3">USERID</th>
                      <th className="p-3">NAMA REKENING</th>
                      <th className="p-3 text-right">NOMINAL</th>
                      <th className="p-3 text-center select-none">AKSI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#D4AF37]/10 font-mono text-xs">
                    {paginatedRecords.map((item, idx) => {
                      const isCopied = copiedId === item.id;
                      const globalIdx = (currentPage - 1) * pageSize + idx + 1;

                      return (
                        <tr key={item.id} className="hover:bg-white/5 transition-colors group">
                          <td className="p-3 text-slate-500 font-bold select-none">{globalIdx}</td>
                          <td className="p-3 font-extrabold text-white">
                            <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-500/30 text-sky-300 text-[11px]">
                              {item.bankName}
                            </span>
                          </td>
                          <td className="p-3 text-amber-300 font-bold tracking-wider">{item.accountNumber}</td>
                          <td className="p-3 text-white font-bold">{item.userId}</td>
                          <td className="p-3 text-slate-200 uppercase font-sans font-semibold">{item.accountName}</td>
                          <td className="p-3 text-right font-black text-emerald-400">
                            {formatNominalDisplay(item)}
                          </td>
                          <td className="p-3 text-center select-none">
                            <div className="flex items-center justify-center gap-1.5 select-none">
                              <button
                                type="button"
                                onClick={() => handleCopySingle(item)}
                                className={`p-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  isCopied
                                    ? 'bg-emerald-500 text-black'
                                    : 'bg-black/60 text-sky-300 border border-sky-500/30 hover:bg-sky-500/20'
                                }`}
                                title="Salin 5 Kolom baris ini"
                              >
                                {isCopied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                              </button>

                              <button
                                type="button"
                                onClick={() => setEditingItem(item)}
                                className="p-1.5 rounded-lg bg-black/60 text-slate-300 border border-slate-700 hover:text-white transition-all cursor-pointer"
                                title="Edit baris"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 rounded-lg bg-black/60 text-rose-400 border border-rose-500/30 hover:bg-rose-950/40 transition-all cursor-pointer"
                                title="Hapus baris"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-2 text-xs">
                  <span className="text-slate-400 font-mono">
                    Halaman {currentPage} dari {totalPages} ({filteredRecords.length} total baris)
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={currentPage <= 1}
                      onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                      className="p-1.5 rounded-lg bg-black/60 border border-[#D4AF37]/30 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white cursor-pointer"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
                        let pNum = i + 1;
                        if (totalPages > 5 && currentPage > 3) {
                          pNum = currentPage - 2 + i;
                          if (pNum > totalPages) pNum = totalPages - (4 - i);
                        }

                        return (
                          <button
                            key={pNum}
                            type="button"
                            onClick={() => setCurrentPage(pNum)}
                            className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              currentPage === pNum
                                ? 'bg-sky-400 text-black font-black'
                                : 'bg-black/60 text-slate-300 border border-[#D4AF37]/20 hover:text-white'
                            }`}
                          >
                            {pNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      type="button"
                      disabled={currentPage >= totalPages}
                      onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                      className="p-1.5 rounded-lg bg-black/60 border border-[#D4AF37]/30 text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed hover:text-white cursor-pointer"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>

      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-gold-heavy p-6 border border-sky-500/40 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
                <h3 className="text-sm font-extrabold uppercase text-sky-300 tracking-wider flex items-center gap-2">
                  <ArrowDownToLine className="h-4 w-4" /> Edit Data Tarik Withdraw
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="text-slate-400 hover:text-white font-bold"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      1. JENIS BANK
                    </label>
                    <input
                      type="text"
                      value={editingItem.bankName}
                      onChange={(e) => setEditingItem({ ...editingItem, bankName: e.target.value.toUpperCase() })}
                      className="w-full bg-black/80 border border-sky-500/30 rounded-lg p-2 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      2. NOMOR REKENING
                    </label>
                    <input
                      type="text"
                      value={editingItem.accountNumber}
                      onChange={(e) => setEditingItem({ ...editingItem, accountNumber: e.target.value })}
                      className="w-full bg-black/80 border border-sky-500/30 rounded-lg p-2 text-xs text-amber-300 font-mono font-bold"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      3. USERID
                    </label>
                    <input
                      type="text"
                      value={editingItem.userId}
                      onChange={(e) => setEditingItem({ ...editingItem, userId: e.target.value })}
                      className="w-full bg-black/80 border border-sky-500/30 rounded-lg p-2 text-xs text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      5. NOMINAL
                    </label>
                    <input
                      type="text"
                      value={editingItem.nominalRaw}
                      onChange={(e) => setEditingItem({ 
                        ...editingItem, 
                        nominalRaw: e.target.value,
                        nominalNum: parseFloat(e.target.value.replace(/,/g, '')) || 0
                      })}
                      className="w-full bg-black/80 border border-sky-500/30 rounded-lg p-2 text-xs text-emerald-400 font-mono font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                    4. NAMA REKENING
                  </label>
                  <input
                    type="text"
                    value={editingItem.accountName}
                    onChange={(e) => setEditingItem({ ...editingItem, accountName: e.target.value.toUpperCase() })}
                    className="w-full bg-black/80 border border-sky-500/30 rounded-lg p-2 text-xs text-white font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D4AF37]/20">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-black/60 text-slate-300 border border-slate-700 hover:bg-white/5 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-sky-400 text-black hover:bg-sky-300 cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
