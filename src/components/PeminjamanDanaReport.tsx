import React, { useState, useEffect, useMemo } from 'react';
import { 
  HandCoins, 
  Copy, 
  Check, 
  Trash2, 
  RotateCcw, 
  FileText, 
  Plus, 
  Edit3, 
  Sparkles, 
  Building2, 
  User, 
  Hash, 
  DollarSign,
  Info,
  CheckCircle2,
  ListOrdered,
  ArrowRight,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface LoanItem {
  id: string;
  bankName: string;
  bankSuffix: string; // e.g. 'BERSIH'
  accountName: string;
  accountNumber: string;
  nominalRaw: number;
  rawLine?: string;
  notes?: string;
}

interface PeminjamanDanaReportProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'loading' | 'info') => void;
}

export default function PeminjamanDanaReport({ showToast }: PeminjamanDanaReportProps) {
  // Input paste text state
  const [pasteInput, setPasteInput] = useState<string>(() => {
    const saved = localStorage.getItem('loan_paste_input');
    if (!saved || saved.includes('BCA 2770833313 Ami 25,000,000')) {
      return '';
    }
    return saved;
  });

  // Default Bank Suffix (e.g. 'BERSIH')
  const [defaultBankSuffix, setDefaultBankSuffix] = useState<string>(() => {
    return localStorage.getItem('loan_bank_suffix') || 'BERSIH';
  });

  // Separator option between formatted items when copying all ('blank_line' | 'divider' | 'compact')
  const [copySeparator, setCopySeparator] = useState<'blank_line' | 'divider' | 'compact'>('blank_line');

  // Separator format for numbers: 'comma' (25,000,000) vs 'dot' (25.000.000)
  const [numberFormat, setNumberFormat] = useState<'comma' | 'dot'>('comma');

  // Items state
  const [items, setItems] = useState<LoanItem[]>([]);

  // Editing state
  const [editingItem, setEditingItem] = useState<LoanItem | null>(null);

  // Copy status indicators
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper to format currency
  const formatRupiah = (amount: number, style: 'comma' | 'dot' = 'comma') => {
    if (isNaN(amount) || amount === 0) return 'Rp 0,-';
    const formattedNum = style === 'comma' 
      ? amount.toLocaleString('en-US') 
      : amount.toLocaleString('id-ID');
    return `Rp ${formattedNum},-`;
  };

  // Helper parser function for a single line
  const parseLineToLoanItem = (line: string, index: number, defaultSuffix: string): LoanItem | null => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Common Bank keywords list
    const knownBanks = [
      'BCA BERSIH', 'BCA', 'MANDIRI', 'BRI', 'BNI', 'CIMB', 'DANAMON', 
      'PERMATA', 'SEABANK', 'NEO', 'BSI', 'DANA', 'OVO', 'GOPAY', 'SHOPEEPAY', 
      'LINKAJA', 'PANIN', 'MAYBANK', 'ALLO', 'OCTO', 'JAGO'
    ];

    let bankName = 'BCA';
    let bankSuffix = defaultSuffix;
    let accountNumber = '';
    let nominalRaw = 0;
    let accountName = '';

    // Check if line explicitly contains "BERSIH" or other suffix
    let workingLine = trimmed;

    // 1. Find Bank
    let foundBankToken = '';
    for (const b of knownBanks) {
      const regex = new RegExp(`\\b${b.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(workingLine)) {
        foundBankToken = b;
        break;
      }
    }

    if (foundBankToken) {
      if (foundBankToken.toUpperCase().includes('BERSIH')) {
        bankName = foundBankToken.toUpperCase().replace('BERSIH', '').trim();
        bankSuffix = 'BERSIH';
      } else {
        bankName = foundBankToken.toUpperCase();
      }
      // Remove bank token from working string once
      const bankReg = new RegExp(`\\b${foundBankToken.replace(/\s+/g, '\\s+')}\\b`, 'i');
      workingLine = workingLine.replace(bankReg, ' ');
    } else {
      // First word assumed as bank name if alphabetic
      const firstWord = workingLine.split(/\s+/)[0];
      if (firstWord && /^[A-Za-z]{2,8}$/.test(firstWord)) {
        bankName = firstWord.toUpperCase();
        workingLine = workingLine.replace(firstWord, ' ');
      }
    }

    // Check if remaining line has 'BERSIH' explicitly
    if (/\bBERSIH\b/i.test(workingLine)) {
      bankSuffix = 'BERSIH';
      workingLine = workingLine.replace(/\bBERSIH\b/i, ' ');
    }

    // 2. Find Account Number (Sequence of 8 to 20 digits or groups of numbers)
    const accNumMatch = workingLine.match(/\b\d{8,20}\b/) || workingLine.match(/\b\d{3,5}[-\s]?\d{3,5}[-\s]?\d{3,8}\b/);
    if (accNumMatch) {
      accountNumber = accNumMatch[0].replace(/[-\s]/g, '');
      workingLine = workingLine.replace(accNumMatch[0], ' ');
    }

    // 3. Find Nominal (Amount) - usually tokens with commas/dots or numbers >= 1000
    // Try matching money amount patterns like 25,000,000 or 25.000.000 or 25000000 or Rp 25.000.000
    const moneyMatches = Array.from(workingLine.matchAll(/(?:Rp\.?\s*)?([\d.,]+)(?:,-)?/gi));
    let parsedNominal = 0;
    let nominalMatchedString = '';

    for (const match of moneyMatches) {
      const rawStr = match[1];
      // Clean non-digits
      const cleanDigits = rawStr.replace(/[^\d]/g, '');
      const val = parseInt(cleanDigits, 10);
      if (!isNaN(val) && val >= 1000) {
        parsedNominal = val;
        nominalMatchedString = match[0];
        break; // Take first valid nominal >= 1000
      }
    }

    if (parsedNominal > 0 && nominalMatchedString) {
      nominalRaw = parsedNominal;
      workingLine = workingLine.replace(nominalMatchedString, ' ');
    } else {
      // Fallback: look for pure numbers >= 1000
      const standaloneNumMatch = workingLine.match(/\b\d{4,12}\b/);
      if (standaloneNumMatch) {
        nominalRaw = parseInt(standaloneNumMatch[0], 10);
        workingLine = workingLine.replace(standaloneNumMatch[0], ' ');
      }
    }

    // 4. Remaining text is Account Name
    accountName = workingLine
      .replace(/[-_:,]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Capitalize account name if available
    if (accountName) {
      accountName = accountName.toUpperCase();
    } else {
      accountName = 'TANPA NAMA';
    }

    return {
      id: `loan_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
      bankName: bankName || 'BCA',
      bankSuffix: bankSuffix || 'BERSIH',
      accountName: accountName,
      accountNumber: accountNumber || '0000000000',
      nominalRaw: nominalRaw || 0,
      rawLine: trimmed
    };
  };

  // Re-parse pasted input whenever input or default suffix changes
  useEffect(() => {
    localStorage.setItem('loan_paste_input', pasteInput);
    localStorage.setItem('loan_bank_suffix', defaultBankSuffix);

    const lines = pasteInput.split('\n');
    const parsed: LoanItem[] = [];

    lines.forEach((line, idx) => {
      const item = parseLineToLoanItem(line, idx, defaultBankSuffix);
      if (item) {
        parsed.push(item);
      }
    });

    setItems(parsed);
  }, [pasteInput, defaultBankSuffix]);

  // Generate complete formatted text string following user category criteria
  const formattedOutputText = useMemo(() => {
    if (items.length === 0) return '';

    return items.map(item => {
      const bankDisplay = item.bankSuffix ? `${item.bankName} ${item.bankSuffix}` : item.bankName;
      const nominalDisplay = formatRupiah(item.nominalRaw, numberFormat);

      return `Bank : ${bankDisplay}
Nama Rekening : ${item.accountName}
Nomor Rekening : ${item.accountNumber}
Nominal : ${nominalDisplay}`;
    }).join(
      copySeparator === 'blank_line' 
        ? '\n\n' 
        : copySeparator === 'divider' 
          ? '\n-----------------------------\n' 
          : '\n'
    );
  }, [items, numberFormat, copySeparator]);

  // Total amount calculation
  const totalNominal = useMemo(() => {
    return items.reduce((sum, item) => sum + (item.nominalRaw || 0), 0);
  }, [items]);

  // Handle Copy All Text
  const handleCopyAll = () => {
    if (!formattedOutputText) {
      showToast('Tidak ada data untuk disalin', 'error');
      return;
    }
    navigator.clipboard.writeText(formattedOutputText);
    setCopiedAll(true);
    showToast('Berhasil menyalin seluruh format peminjaman!', 'success');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Handle Copy Single Item Text
  const handleCopySingle = (item: LoanItem) => {
    const bankDisplay = item.bankSuffix ? `${item.bankName} ${item.bankSuffix}` : item.bankName;
    const nominalDisplay = formatRupiah(item.nominalRaw, numberFormat);

    const text = `Bank : ${bankDisplay}
Nama Rekening : ${item.accountName}
Nomor Rekening : ${item.accountNumber}
Nominal : ${nominalDisplay}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    showToast(`Disalin: ${item.accountName}`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Delete Single Item
  const handleDeleteItem = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    // Update paste input accordingly by removing the corresponding line
    showToast('Data peminjaman dihapus', 'info');
  };

  // Handle Add Blank Item
  const handleAddNewItem = () => {
    const newItem: LoanItem = {
      id: `loan_manual_${Date.now()}`,
      bankName: 'BCA',
      bankSuffix: defaultBankSuffix,
      accountName: 'NAMA PENERIMA',
      accountNumber: '1234567890',
      nominalRaw: 10000000
    };
    setItems(prev => [...prev, newItem]);
    showToast('Berhasil menambah baris manual', 'success');
  };

  // Update item from modal edit
  const handleSaveEdit = () => {
    if (!editingItem) return;
    setItems(prev => prev.map(i => i.id === editingItem.id ? editingItem : i));
    setEditingItem(null);
    showToast('Perubahan data berhasil disimpan', 'success');
  };

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-100">
      
      {/* Header Banner */}
      <div className="glass-gold-heavy p-6 border rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 text-[#FFD700] shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0">
            <HandCoins className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide uppercase">
                Peminjaman Dana Sekali Tempel
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#D4AF37]/20 text-[#FFD700] border border-[#D4AF37]/40">
                VIP AUTO PARSER
              </span>
            </div>
            <p className="text-xs text-[#D4AF37]/90 font-medium mt-1">
              Tempel teks mentah daftar bank, rekening & nominal. Sistem akan memformat otomatis sesuai struktur kategori resmi.
            </p>
          </div>
        </div>

        {/* Global Stats Counter */}
        <div className="flex items-center gap-4 bg-black/60 border border-[#D4AF37]/20 p-3.5 rounded-xl self-start md:self-auto shrink-0">
          <div className="text-left pr-4 border-r border-[#D4AF37]/20">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Total Rekening</span>
            <span className="text-lg font-mono font-black text-[#FFD700]">{items.length} Data</span>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Total Nominal</span>
            <span className="text-lg font-mono font-black text-emerald-400">{formatRupiah(totalNominal, numberFormat)}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Paste Box & Right Live Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Tempel Area */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-gold-card p-5 border rounded-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#FFD700]" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#FFD700]">
                  Area Tempel Data (Multi Line)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPasteInput('')}
                className="text-[11px] font-bold text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1"
              >
                <Trash2 className="h-3.5 w-3.5" /> Bersihkan
              </button>
            </div>

            {/* Quick Preset Example Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-mono block">Contoh format tempel langsung:</span>
              <div className="p-2.5 rounded-xl bg-black/60 border border-[#D4AF37]/20 font-mono text-[11px] text-[#FFD700]/90 space-y-1">
                <p>BCA 2770833313 Ami 25,000,000</p>
                <p>BCA 5800670464 KADEK ARYA BUDIARTA 25,000,000</p>
              </div>
            </div>

            {/* Textarea Input */}
            <div>
              <textarea
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder="Tempel data transaksi di sini..."
                rows={8}
                className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-xl p-3.5 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-all resize-y shadow-inner"
              />
            </div>

            {/* Config Controls */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Status Bank (Suffix)
                </label>
                <input
                  type="text"
                  value={defaultBankSuffix}
                  onChange={(e) => setDefaultBankSuffix(e.target.value)}
                  placeholder="e.g. BERSIH"
                  className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#FFD700]"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Format Angka Nominal
                </label>
                <select
                  value={numberFormat}
                  onChange={(e) => setNumberFormat(e.target.value as any)}
                  className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#FFD700]"
                >
                  <option value="comma">Koma (25,000,000)</option>
                  <option value="dot">Titik (25.000.000)</option>
                </select>
              </div>
            </div>

          </div>
        </div>

        {/* Right Column: Structured Category Result & Preview */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Main Copyable Result Card */}
          <div className="glass-gold-heavy p-5 border rounded-2xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D4AF37]/20">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-[#FFD700] flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-[#FFD700]" />
                  Hasil Format Kategori Terurut
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Siap langsung disalin dan dikirim ke grup / catatan
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 shadow-lg cursor-pointer ${
                    copiedAll 
                      ? 'bg-emerald-500 text-black shadow-emerald-500/20' 
                      : 'bg-gradient-to-r from-[#FFD700] to-[#D4AF37] hover:from-[#FFF4C2] hover:to-[#FFD700] text-black shadow-[0_0_15px_rgba(212,175,55,0.4)]'
                  }`}
                >
                  {copiedAll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedAll ? 'Tersalin Semua!' : 'Salin Semua Format'}
                </button>
              </div>
            </div>

            {/* Display Formatted Output Box */}
            {items.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-black/40 border border-dashed border-[#D4AF37]/30 text-slate-400">
                <Info className="h-8 w-8 mx-auto text-[#D4AF37]/50 mb-2 animate-bounce" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Belum Ada Data Ditempel</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ketik atau tempel teks pada kotak sebelah kiri untuk melihat hasil terurut secara instan.
                </p>
              </div>
            ) : (
              <div className="relative">
                <textarea
                  readOnly
                  value={formattedOutputText}
                  rows={Math.max(items.length * 4.5, 6)}
                  className="w-full bg-[#050505] border border-[#D4AF37]/40 rounded-xl p-4 font-mono text-xs text-[#FFD700] leading-relaxed focus:outline-none shadow-inner selection:bg-[#D4AF37] selection:text-black cursor-text"
                />
              </div>
            )}

            {/* Separator Options */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-400 font-mono font-bold">Pemisah Antar Rekening:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCopySeparator('blank_line')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    copySeparator === 'blank_line' 
                      ? 'bg-[#D4AF37] text-black' 
                      : 'bg-black/60 text-slate-400 border border-[#D4AF37]/20'
                  }`}
                >
                  Baris Kosong
                </button>
                <button
                  type="button"
                  onClick={() => setCopySeparator('divider')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    copySeparator === 'divider' 
                      ? 'bg-[#D4AF37] text-black' 
                      : 'bg-black/60 text-slate-400 border border-[#D4AF37]/20'
                  }`}
                >
                  Garis (---)
                </button>
              </div>
            </div>

          </div>

          {/* Detailed Item Cards Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#D4AF37] flex items-center gap-2">
                <Building2 className="h-4 w-4" /> Daftar Rincian Rekening ({items.length})
              </h4>
              <button
                type="button"
                onClick={handleAddNewItem}
                className="text-xs font-bold text-[#FFD700] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Baris Manual
              </button>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {items.map((item, idx) => {
                  const isCopied = copiedId === item.id;
                  const bankDisplay = item.bankSuffix ? `${item.bankName} ${item.bankSuffix}` : item.bankName;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="glass-gold-card p-4 border rounded-xl relative group hover:border-[#FFD700]/60 transition-all shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* Information Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs flex-1">
                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              Bank
                            </span>
                            <span className="font-extrabold font-mono text-[#FFD700] text-sm">
                              {bankDisplay}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              Nama Rekening
                            </span>
                            <span className="font-extrabold text-white text-sm tracking-wide">
                              {item.accountName}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              Nomor Rekening
                            </span>
                            <span className="font-mono font-bold text-slate-200">
                              {item.accountNumber}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              Nominal
                            </span>
                            <span className="font-mono font-black text-emerald-400 text-sm">
                              {formatRupiah(item.nominalRaw, numberFormat)}
                            </span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopySingle(item)}
                            className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isCopied 
                                ? 'bg-emerald-500 text-black' 
                                : 'bg-black/60 border border-[#D4AF37]/30 text-[#FFD700] hover:bg-[#D4AF37]/20'
                            }`}
                            title="Salin item ini"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{isCopied ? 'Disalin' : 'Salin'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="p-2 rounded-lg bg-black/60 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-2 rounded-lg bg-black/60 border border-rose-500/30 text-rose-400 hover:bg-rose-950/40 transition-all cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>

        </div>

      </div>

      {/* Edit Item Modal */}
      <AnimatePresence>
        {editingItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-gold-heavy p-6 border rounded-2xl max-w-md w-full space-y-4 shadow-2xl text-slate-100"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
                <h3 className="text-sm font-extrabold uppercase text-[#FFD700] tracking-wider">
                  Edit Data Peminjaman
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
                      Nama Bank
                    </label>
                    <input
                      type="text"
                      value={editingItem.bankName}
                      onChange={(e) => setEditingItem({ ...editingItem, bankName: e.target.value.toUpperCase() })}
                      className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-lg p-2 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      Status / Suffix
                    </label>
                    <input
                      type="text"
                      value={editingItem.bankSuffix}
                      onChange={(e) => setEditingItem({ ...editingItem, bankSuffix: e.target.value.toUpperCase() })}
                      className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-lg p-2 text-xs text-white font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                    Nama Rekening
                  </label>
                  <input
                    type="text"
                    value={editingItem.accountName}
                    onChange={(e) => setEditingItem({ ...editingItem, accountName: e.target.value.toUpperCase() })}
                    className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-lg p-2 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                    Nomor Rekening
                  </label>
                  <input
                    type="text"
                    value={editingItem.accountNumber}
                    onChange={(e) => setEditingItem({ ...editingItem, accountNumber: e.target.value })}
                    className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-lg p-2 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                    Nominal Raw (Angka)
                  </label>
                  <input
                    type="number"
                    value={editingItem.nominalRaw}
                    onChange={(e) => setEditingItem({ ...editingItem, nominalRaw: parseInt(e.target.value, 10) || 0 })}
                    className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-lg p-2 text-xs text-emerald-400 font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#D4AF37]/20">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-black/60 text-slate-300 border border-slate-700 hover:bg-white/5"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#D4AF37] text-black hover:bg-[#FFD700]"
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
