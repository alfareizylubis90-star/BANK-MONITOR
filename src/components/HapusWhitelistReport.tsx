import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserX, 
  Copy, 
  Check, 
  Trash2, 
  Plus, 
  Edit3, 
  Sparkles, 
  Building2, 
  User, 
  Hash, 
  Info, 
  ListOrdered, 
  ShieldOff, 
  MessageSquare,
  ArrowRight,
  Layers,
  Settings2,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface WhitelistReportItem {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  category: string; // e.g., 'Bersih', 'Minera', 'Pay2Me'
  statusNote?: string; // e.g., 'TERLOGOUT RPT_02'
  amount?: string; // e.g., '3,498,000'
  rawLine?: string;
}

interface HapusWhitelistReportProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'loading' | 'info') => void;
}

export default function HapusWhitelistReport({ showToast }: HapusWhitelistReportProps) {
  // Input paste text state - clean start without hardcoded pre-filled text
  const [pasteInput, setPasteInput] = useState<string>(() => {
    const saved = localStorage.getItem('whitelist_paste_input');
    return saved || '';
  });

  // Custom Header Format (e.g. 'Bank WD ( Bersih )')
  const [headerTitle, setHeaderTitle] = useState<string>(() => {
    return localStorage.getItem('whitelist_header_title') || 'Bank WD ( Bersih )';
  });

  // Custom Reason / Footer message
  const [footerMessage, setFooterMessage] = useState<string>(() => {
    return localStorage.getItem('whitelist_footer_message') || 'Dibantu hapus whitelist nya ya bang , dikarenakan rekening di Dioffkan';
  });

  // Default Bank if undetected
  const [defaultBank, setDefaultBank] = useState<string>(() => {
    return localStorage.getItem('whitelist_default_bank') || 'MANDIRI';
  });

  // Separator between multiple formatted blocks ('blank_line' | 'divider' | 'compact')
  const [copySeparator, setCopySeparator] = useState<'blank_line' | 'divider' | 'compact'>('blank_line');

  // Items state
  const [items, setItems] = useState<WhitelistReportItem[]>([]);

  // Modal edit state
  const [editingItem, setEditingItem] = useState<WhitelistReportItem | null>(null);

  // Copy indicator states
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Known Banks list for detection
  const knownBanks = [
    'MANDIRI', 'BCA', 'BRI', 'BNI', 'CIMB', 'DANAMON', 
    'PERMATA', 'SEABANK', 'NEO', 'BSI', 'OVO', 'DANA', 'GOPAY', 'SHOPEEPAY', 
    'LINKAJA', 'PANIN', 'MAYBANK', 'ALLO', 'OCTO', 'JAGO', 'BNC', 'NOBU',
    'BANK JAGO', 'BANK BCA', 'BANK MANDIRI', 'BANK BRI', 'BANK BNI', 'BANK CIMB'
  ];

  // Helper parser for a single pasted line
  const parseLineToWhitelistItem = (line: string, index: number): WhitelistReportItem | null => {
    let trimmed = line.trim();
    if (!trimmed) return null;

    // Remove leading punctuation if any
    trimmed = trimmed.replace(/^[;,|\s]+/, '');
    if (!trimmed) return null;

    let accountName = '';
    let accountNumber = '';
    let bankName = defaultBank;
    let category = 'Bersih';
    let statusNote = '';
    let amount = '';

    // Check if line is Tab-separated (Excel / Spreadsheet copy-paste)
    if (line.includes('\t')) {
      const tokens = line.split('\t').map(t => t.trim()).filter(Boolean);

      // Typical Excel layout from user:
      // Col 0: NURDIN (Nama Rekening)
      // Col 1: 60014761658 (No Rekening)
      // Col 2: TERLOGOUT RPT_02 (Status / Keterangan)
      // Col 3: 3,498,000 (Nominal Saldo)
      // Col 4: WITDRAW BERSIH MANDIRI (Kategori & Jenis Bank)

      if (tokens.length >= 1) {
        accountName = tokens[0];
      }

      if (tokens.length >= 2) {
        // Token 1 could be account number or name continuation
        const cleanDigits = tokens[1].replace(/[-\s]/g, '');
        if (/^\d{6,25}$/.test(cleanDigits)) {
          accountNumber = cleanDigits;
        } else {
          accountName += ` ${tokens[1]}`;
        }
      }

      if (tokens.length >= 3) {
        // Check if token 2 is status or account number (if token 1 was part of name)
        const cleanDigits = tokens[2].replace(/[-\s]/g, '');
        if (!accountNumber && /^\d{6,25}$/.test(cleanDigits)) {
          accountNumber = cleanDigits;
        } else {
          statusNote = tokens[2];
        }
      }

      if (tokens.length >= 4) {
        // Check if token 3 is amount (e.g. 3,498,000 or Rp 3.498.000)
        if (/^[\d,.\sRp]+$/.test(tokens[3])) {
          amount = tokens[3];
        } else if (!statusNote) {
          statusNote = tokens[3];
        }
      }

      // Check all tokens (especially the last ones) for Bank & Category keywords
      for (const tok of tokens) {
        const upperTok = tok.toUpperCase();
        
        // Find Bank
        for (const b of knownBanks) {
          if (upperTok.includes(b)) {
            bankName = b;
            break;
          }
        }

        // Find Category
        if (upperTok.includes('BERSIH')) category = 'Bersih';
        else if (upperTok.includes('MINERA')) category = 'Minera';
        else if (upperTok.includes('PAY2ME') || upperTok.includes('PAY TO ME')) category = 'Pay2Me';
      }
    } else {
      // Space-delimited / Free-form text parser
      let workingLine = trimmed;

      // Extract Bank
      for (const b of knownBanks) {
        const regex = new RegExp(`\\b${b.replace(/\s+/g, '\\s+')}\\b`, 'i');
        if (regex.test(workingLine)) {
          bankName = b;
          workingLine = workingLine.replace(regex, ' ');
          break;
        }
      }

      // Extract Category
      if (/BERSIH/i.test(workingLine)) {
        category = 'Bersih';
        workingLine = workingLine.replace(/WITDRAW\s+BERSIH|WITHDRAW\s+BERSIH|BERSIH/gi, ' ');
      } else if (/MINERA/i.test(workingLine)) {
        category = 'Minera';
        workingLine = workingLine.replace(/MINERA/gi, ' ');
      } else if (/PAY2ME|PAY\s*TO\s*ME/i.test(workingLine)) {
        category = 'Pay2Me';
        workingLine = workingLine.replace(/PAY2ME|PAY\s*TO\s*ME/gi, ' ');
      }

      // Extract Account Number (6 to 25 digits or phone number)
      const accMatch = workingLine.match(/\b08\d{8,12}\b/) || workingLine.match(/\b\d{8,25}\b/) || workingLine.match(/\b\d{4,6}[-\s]\d{4,6}[-\s]?\d{3,8}\b/);
      if (accMatch) {
        accountNumber = accMatch[0].replace(/[-\s]/g, '');
        workingLine = workingLine.replace(accMatch[0], ' ');
      }

      // Extract Amount if present (e.g. 3,498,000 or 3.498.000)
      const amtMatch = workingLine.match(/\b\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?\b/);
      if (amtMatch) {
        amount = amtMatch[0];
        workingLine = workingLine.replace(amtMatch[0], ' ');
      }

      // Remaining words
      const remainingWords = workingLine
        .replace(/[-_:,|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean);

      if (remainingWords.length > 0) {
        // Look for common status terms like TERLOGOUT, RPT, LIMIT, OFF
        const statusIdx = remainingWords.findIndex(w => /TERLOGOUT|RPT|LIMIT|OFF|BLOKIR|SUSPEND/i.test(w));
        if (statusIdx !== -1) {
          accountName = remainingWords.slice(0, statusIdx).join(' ');
          statusNote = remainingWords.slice(statusIdx).join(' ');
        } else {
          accountName = remainingWords.join(' ');
        }
      }
    }

    // Fallbacks
    if (!accountName) accountName = 'NURDIN';
    if (!accountNumber) accountNumber = '60014761658';
    if (!bankName) bankName = defaultBank;

    return {
      id: `whitelist_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
      accountName: accountName.trim().toUpperCase(),
      accountNumber: accountNumber.trim(),
      bankName: bankName.trim().toUpperCase(),
      category: category,
      statusNote: statusNote.trim().toUpperCase(),
      amount: amount.trim(),
      rawLine: trimmed
    };
  };

  // Re-parse whenever pasteInput, headerTitle, defaultBank changes
  useEffect(() => {
    localStorage.setItem('whitelist_paste_input', pasteInput);
    localStorage.setItem('whitelist_header_title', headerTitle);
    localStorage.setItem('whitelist_footer_message', footerMessage);
    localStorage.setItem('whitelist_default_bank', defaultBank);

    if (!pasteInput.trim()) {
      setItems([]);
      return;
    }

    const lines = pasteInput.split('\n');
    const parsed: WhitelistReportItem[] = [];

    lines.forEach((line, idx) => {
      const item = parseLineToWhitelistItem(line, idx);
      if (item) {
        parsed.push(item);
      }
    });

    setItems(parsed);
  }, [pasteInput, headerTitle, footerMessage, defaultBank]);

  // Format single item output text according to user format:
  // Bank WD ( Bersih )
  // Jenis Bank : MANDIRI
  // Nama Rekening : NURDIN
  // No rekening : 60014761658
  //
  // Dibantu hapus whitelist nya ya bang , dikarenakan rekening di Dioffkan
  const formatSingleItemText = (item: WhitelistReportItem) => {
    return `${headerTitle}
Jenis Bank : ${item.bankName}
Nama Rekening : ${item.accountName}
No rekening : ${item.accountNumber}

${footerMessage}`;
  };

  // Generate complete formatted text for all items
  const formattedOutputText = useMemo(() => {
    if (items.length === 0) return '';

    return items.map(item => formatSingleItemText(item)).join(
      copySeparator === 'blank_line'
        ? '\n\n\n'
        : copySeparator === 'divider'
          ? '\n\n-----------------------------\n\n'
          : '\n\n'
    );
  }, [items, headerTitle, footerMessage, copySeparator]);

  // Copy All Text
  const handleCopyAll = () => {
    if (!formattedOutputText) {
      showToast('Tidak ada data laporan untuk disalin', 'error');
      return;
    }
    navigator.clipboard.writeText(formattedOutputText);
    setCopiedAll(true);
    showToast('Berhasil menyalin seluruh format Laporan Hapus Whitelist!', 'success');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Copy Single Item Text
  const handleCopySingle = (item: WhitelistReportItem) => {
    const text = formatSingleItemText(item);
    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    showToast(`Disalin: ${item.accountName} (${item.bankName})`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Delete Single Item
  const handleDeleteItem = (id: string) => {
    const updated = items.filter(i => i.id !== id);
    setItems(updated);
    showToast('Data baris dihapus', 'info');
  };

  // Add Manual Blank Item
  const handleAddNewItem = () => {
    const newItem: WhitelistReportItem = {
      id: `whitelist_manual_${Date.now()}`,
      accountName: 'NURDIN',
      accountNumber: '60014761658',
      bankName: defaultBank || 'MANDIRI',
      category: 'Bersih',
      statusNote: 'TERLOGOUT RPT_02',
      amount: '3,498,000'
    };
    setItems(prev => [...prev, newItem]);
    showToast('Berhasil menambah baris manual', 'success');
  };

  // Save changes from edit modal
  const handleSaveEdit = () => {
    if (!editingItem) return;
    setItems(prev => prev.map(i => i.id === editingItem.id ? editingItem : i));
    setEditingItem(null);
    showToast('Perubahan data berhasil disimpan', 'success');
  };

  // Header Title Preset Options
  const headerPresets = [
    'Bank WD ( Bersih )',
    'Bank WD ( Minera )',
    'Bank WD ( Pay2Me )',
    'Bank WD ( Reguler )',
    'Bank WD'
  ];

  // Footer Reason Presets
  const footerPresets = [
    'Dibantu hapus whitelist nya ya bang , dikarenakan rekening di Dioffkan',
    'Dibantu hapus whitelist nya ya bang , dikarenakan rekening terlogout',
    'Dibantu hapus whitelist nya ya bang , dikarenakan rekening limit transaksi',
    'Dibantu hapus whitelist nya ya bang , terima kasih'
  ];

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-100" id="whitelist-report-module">
      
      {/* Header Banner */}
      <div className="glass-gold-heavy p-6 border rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/15 text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.3)] shrink-0">
            <UserX className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide uppercase">
                Laporan Hapus Whitelist Sekali Tempel
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                WHITELIST REMOVER
              </span>
            </div>
            <p className="text-xs text-[#D4AF37]/90 font-medium mt-1">
              Tempel data rekening (Nama Rekening, No Rekening, Status/Keterangan, Saldo, dan Bank). Otomatis terformat rapi sesuai format standar penghapusan whitelist.
            </p>
          </div>
        </div>

        {/* Global Stats Counter */}
        <div className="flex items-center gap-4 bg-black/60 border border-[#D4AF37]/20 p-3.5 rounded-xl self-start md:self-auto shrink-0">
          <div className="text-left pr-4 border-r border-[#D4AF37]/20">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Total Rekening</span>
            <span className="text-lg font-mono font-black text-amber-400">{items.length} Data</span>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Kategori Header</span>
            <span className="text-sm font-mono font-extrabold text-[#FFD700] truncate max-w-[150px] block">{headerTitle}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Paste Box & Right Structured Result */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Tempel Area */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-gold-card p-5 border rounded-2xl space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                  Area Tempel Data Hapus Whitelist
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

            {/* Visual Example Guide (without polluting the input box) */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-mono block">Format tempel yang didukung (Tab Excel / Spasi):</span>
              <div className="p-2.5 rounded-xl bg-black/60 border border-[#D4AF37]/20 font-mono text-[10px] text-amber-200 space-y-1 leading-relaxed">
                <p className="text-slate-400">Contoh format mentah:</p>
                <p className="text-[#FFD700] break-all font-bold">NURDIN	60014761658	TERLOGOUT RPT_02 	3,498,000 	WITDRAW BERSIH MANDIRI</p>
              </div>
            </div>

            {/* Textarea Input - Clean empty placeholder */}
            <div>
              <textarea
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder="Tempel data rekening di sini (langsung tempel dari Excel / Spreadsheet / chat)..."
                rows={9}
                className="w-full bg-black/80 border border-amber-500/30 rounded-xl p-3.5 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all resize-y shadow-inner"
              />
            </div>

            {/* Header Title Setting */}
            <div className="space-y-2 pt-2 border-t border-[#D4AF37]/15">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Header Kategori
              </label>
              <input
                type="text"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
                placeholder="e.g. Bank WD ( Bersih )"
                className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-lg px-3 py-2 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-400"
              />

              {/* Quick Preset Buttons for Header */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {headerPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setHeaderTitle(preset)}
                    className={`px-2 py-1 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                      headerTitle === preset
                        ? 'bg-amber-400 text-black font-black'
                        : 'bg-black/60 text-slate-400 border border-[#D4AF37]/20 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Reason / Notes Setting */}
            <div className="space-y-2 pt-2 border-t border-[#D4AF37]/15">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Alasan / Pesan Penutup
              </label>
              <textarea
                rows={2}
                value={footerMessage}
                onChange={(e) => setFooterMessage(e.target.value)}
                placeholder="e.g. Dibantu hapus whitelist nya ya bang , dikarenakan rekening di Dioffkan"
                className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-lg px-3 py-2 text-xs text-slate-200 font-medium focus:outline-none focus:border-amber-400 resize-y"
              />

              {/* Quick Preset Buttons for Footer */}
              <div className="space-y-1 pt-1">
                {footerPresets.map((preset, pIdx) => (
                  <button
                    key={pIdx}
                    type="button"
                    onClick={() => setFooterMessage(preset)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-md text-[10px] transition-all cursor-pointer truncate block ${
                      footerMessage === preset
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold'
                        : 'bg-black/40 text-slate-400 hover:text-white border border-transparent hover:border-[#D4AF37]/20'
                    }`}
                  >
                    • {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Bank Setting */}
            <div className="pt-2 border-t border-[#D4AF37]/15">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                Default Bank (Jika Tidak Terdeteksi)
              </label>
              <input
                type="text"
                value={defaultBank}
                onChange={(e) => setDefaultBank(e.target.value.toUpperCase())}
                placeholder="e.g. MANDIRI"
                className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

          </div>
        </div>

        {/* Right Column: Structured Live Output & Actions */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Main Copyable Result Card */}
          <div className="glass-gold-heavy p-5 border rounded-2xl space-y-4">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#D4AF37]/20">
              <div>
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                  <ListOrdered className="h-4 w-4 text-amber-400" />
                  Hasil Format Laporan Hapus Whitelist
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Format rapi siap langsung disalin dan dikirim ke grup tim / admin
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyAll}
                  className={`px-4 py-2 rounded-xl text-xs font-extrabold tracking-wider uppercase transition-all duration-300 flex items-center gap-2 shadow-lg cursor-pointer ${
                    copiedAll 
                      ? 'bg-emerald-500 text-black shadow-emerald-500/20' 
                      : 'bg-gradient-to-r from-amber-400 to-[#D4AF37] hover:from-amber-300 hover:to-[#FFD700] text-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  }`}
                >
                  {copiedAll ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copiedAll ? 'Tersalin Semua!' : 'Salin Semua Format'}
                </button>
              </div>
            </div>

            {/* Display Formatted Output Box */}
            {items.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-black/40 border border-dashed border-amber-500/30 text-slate-400">
                <Info className="h-8 w-8 mx-auto text-amber-400/50 mb-2 animate-bounce" />
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Belum Ada Data Rekening Ditempel</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ketik atau tempel teks pada kotak sebelah kiri untuk memformat laporan hapus whitelist secara instan.
                </p>
              </div>
            ) : (
              <div className="relative">
                <textarea
                  readOnly
                  value={formattedOutputText}
                  rows={Math.max(items.length * 7, 8)}
                  className="w-full bg-[#050505] border border-amber-500/40 rounded-xl p-4 font-mono text-xs text-amber-200 leading-relaxed focus:outline-none shadow-inner selection:bg-amber-400 selection:text-black cursor-text"
                />
              </div>
            )}

            {/* Separator Options */}
            <div className="flex items-center justify-between text-[11px] pt-1">
              <span className="text-slate-400 font-mono font-bold">Pemisah Antar Laporan:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCopySeparator('blank_line')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    copySeparator === 'blank_line' 
                      ? 'bg-amber-400 text-black' 
                      : 'bg-black/60 text-slate-400 border border-[#D4AF37]/20'
                  }`}
                >
                  Baris Kosong
                </button>
                <button
                  type="button"
                  onClick={() => setCopySeparator('divider')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                    copySeparator === 'divider' 
                      ? 'bg-amber-400 text-black' 
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
              <h4 className="text-xs font-extrabold uppercase tracking-widest text-amber-400 flex items-center gap-2">
                <ShieldOff className="h-4 w-4" /> Rincian Kartu Rekening ({items.length})
              </h4>
              <button
                type="button"
                onClick={handleAddNewItem}
                className="text-xs font-bold text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" /> Tambah Baris Manual
              </button>
            </div>

            <div className="space-y-3">
              <AnimatePresence>
                {items.map((item) => {
                  const isCopied = copiedId === item.id;

                  return (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="glass-gold-card p-4 border border-amber-500/20 rounded-xl relative group hover:border-amber-400/60 transition-all shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        
                        {/* Information Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2 text-xs flex-1">
                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              Header Kategori
                            </span>
                            <span className="font-extrabold text-amber-300">
                              {headerTitle}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              Jenis Bank
                            </span>
                            <span className="font-mono font-extrabold text-white text-sm">
                              {item.bankName}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              Nama Rekening
                            </span>
                            <span className="font-bold text-slate-100 uppercase">
                              {item.accountName}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              No Rekening
                            </span>
                            <span className="font-mono font-black text-amber-400 text-sm">
                              {item.accountNumber}
                            </span>
                          </div>

                          {item.statusNote && (
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                                Status / Keterangan
                              </span>
                              <span className="font-mono font-bold text-rose-400">
                                {item.statusNote}
                              </span>
                            </div>
                          )}

                          {item.amount && (
                            <div>
                              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                                Saldo / Nominal
                              </span>
                              <span className="font-mono font-bold text-emerald-400">
                                Rp {item.amount}
                              </span>
                            </div>
                          )}

                          <div className="sm:col-span-2 lg:col-span-3 pt-1 border-t border-[#D4AF37]/15">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-0.5">
                              Pesan Permintaan:
                            </span>
                            <p className="text-[11px] text-slate-300 italic font-mono">
                              "{footerMessage}"
                            </p>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex sm:flex-col items-center gap-2 self-end sm:self-center shrink-0">
                          <button
                            type="button"
                            onClick={() => handleCopySingle(item)}
                            className={`p-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                              isCopied 
                                ? 'bg-emerald-500 text-black' 
                                : 'bg-black/60 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
                            }`}
                            title="Salin laporan rekening ini"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{isCopied ? 'Disalin' : 'Salin'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="p-2 rounded-lg bg-black/60 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all cursor-pointer"
                            title="Edit data rekening"
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
              className="glass-gold-heavy p-6 border border-amber-500/40 rounded-2xl max-w-lg w-full space-y-4 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
                <h3 className="text-sm font-extrabold uppercase text-amber-300 tracking-wider flex items-center gap-2">
                  <UserX className="h-4 w-4" /> Edit Data Hapus Whitelist
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
                      Jenis Bank
                    </label>
                    <input
                      type="text"
                      value={editingItem.bankName}
                      onChange={(e) => setEditingItem({ ...editingItem, bankName: e.target.value.toUpperCase() })}
                      className="w-full bg-black/80 border border-amber-500/30 rounded-lg p-2 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      Kategori
                    </label>
                    <input
                      type="text"
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                      className="w-full bg-black/80 border border-amber-500/30 rounded-lg p-2 text-xs text-amber-300 font-bold"
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
                    className="w-full bg-black/80 border border-amber-500/30 rounded-lg p-2 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                    No Rekening
                  </label>
                  <input
                    type="text"
                    value={editingItem.accountNumber}
                    onChange={(e) => setEditingItem({ ...editingItem, accountNumber: e.target.value })}
                    className="w-full bg-black/80 border border-amber-500/30 rounded-lg p-2 text-xs text-white font-mono font-bold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      Status / Keterangan
                    </label>
                    <input
                      type="text"
                      value={editingItem.statusNote || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, statusNote: e.target.value.toUpperCase() })}
                      className="w-full bg-black/80 border border-amber-500/30 rounded-lg p-2 text-xs text-rose-400 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      Nominal Saldo
                    </label>
                    <input
                      type="text"
                      value={editingItem.amount || ''}
                      onChange={(e) => setEditingItem({ ...editingItem, amount: e.target.value })}
                      className="w-full bg-black/80 border border-amber-500/30 rounded-lg p-2 text-xs text-emerald-400 font-mono font-bold"
                    />
                  </div>
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
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-amber-400 text-black hover:bg-amber-300 cursor-pointer"
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
