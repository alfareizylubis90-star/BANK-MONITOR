import React, { useState, useEffect, useMemo } from 'react';
import { 
  Lock, 
  Copy, 
  Check, 
  Trash2, 
  FileText, 
  Plus, 
  Edit3, 
  Sparkles, 
  Building2, 
  User, 
  Hash, 
  Link as LinkIcon,
  Info,
  ListOrdered,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface LockReportItem {
  id: string;
  userId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  attachments: string[];
  status: string;
  rawLine?: string;
  notes?: string;
}

interface LockReportProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'loading' | 'info') => void;
}

export default function LockReport({ showToast }: LockReportProps) {
  // Input paste text state - start empty so no sample is forced into the input box
  const [pasteInput, setPasteInput] = useState<string>(() => {
    const saved = localStorage.getItem('lock_paste_input');
    return saved || '';
  });

  // Custom Header Information text (default: 'BANTU LOCK KO/CI')
  const [infoHeading, setInfoHeading] = useState<string>(() => {
    return localStorage.getItem('lock_info_heading') || 'BANTU LOCK KO/CI';
  });

  // Separator option between formatted items when copying all ('blank_line' | 'divider' | 'compact')
  const [copySeparator, setCopySeparator] = useState<'blank_line' | 'divider' | 'compact'>('blank_line');

  // Separator for attachment URLs ('slash' -> ' / ' | 'newline' -> '\n' | 'space' -> ' ')
  const [linkSeparator, setLinkSeparator] = useState<'slash' | 'newline' | 'space'>('slash');

  // Default Bank if undetected
  const [defaultBank, setDefaultBank] = useState<string>(() => {
    return localStorage.getItem('lock_default_bank') || 'DANA';
  });

  // Items state
  const [items, setItems] = useState<LockReportItem[]>([]);

  // Editing state modal
  const [editingItem, setEditingItem] = useState<LockReportItem | null>(null);

  // Copy status indicators
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Helper parser function for a single raw pasted line
  const parseLineToLockItem = (line: string, index: number): LockReportItem | null => {
    let trimmed = line.trim();
    if (!trimmed) return null;

    // Remove leading semicolon or punctuation if present (e.g. ";syndicate...")
    trimmed = trimmed.replace(/^[;,|\s]+/, '');
    if (!trimmed) return null;

    // Common Bank keywords list
    const knownBanks = [
      'DANA', 'BCA', 'MANDIRI', 'BRI', 'BNI', 'CIMB', 'DANAMON', 
      'PERMATA', 'SEABANK', 'NEO', 'BSI', 'OVO', 'GOPAY', 'SHOPEEPAY', 
      'LINKAJA', 'PANIN', 'MAYBANK', 'ALLO', 'OCTO', 'JAGO', 'BNC', 'NOBU',
      'BANK JAGO', 'BANK BCA', 'BANK MANDIRI', 'BANK BRI', 'BANK BNI'
    ];

    // Common Status patterns to recognize
    const knownStatuses = [
      'REK BELUM PREMIUM', 'BELUM PREMIUM', 'REK INDIKASI', 'INDIKASI',
      'REK SUSPEND', 'SUSPEND', 'REK LIMIT', 'LIMIT', 'REK DIBLOKIR', 'DIBLOKIR',
      'SALAH PIN', 'PERLU VERIFIKASI', 'BELUM UPGRADE', 'TIDAK AKTIF',
      'AKUN DIBEKUKAN', 'REK BERMASALAH', 'DOUBLE TRANSAKSI', 'PENIPUAN'
    ];

    // 1. Extract all URLs / Links (sleekshot, gyazo, drive, http, etc.)
    const urlMatches = Array.from(trimmed.matchAll(/https?:\/\/[^\s\t,;]+/gi));
    const attachments: string[] = urlMatches.map(m => m[0].trim());

    // Remove URLs from trimmed working line
    let workingLine = trimmed;
    attachments.forEach(url => {
      workingLine = workingLine.replace(url, ' ');
    });

    let userId = '';
    let accountName = '';
    let accountNumber = '';
    let bankName = defaultBank;
    let status = 'REK BELUM PREMIUM';

    // 2. Check if line is Tab-separated (typical from Excel / Spreadsheet copy-paste)
    if (line.includes('\t')) {
      const rawTokens = line.split('\t').map(t => t.trim()).filter(Boolean);
      // Filter out tokens that are pure URLs
      const nonUrlTokens = rawTokens.filter(t => !/^https?:\/\//i.test(t));

      // Attempt to identify fields by token position or contents
      // Typical Excel layout: Col1: UserID, Col2: Nama Rekening, Col3: Nomor Rekening, Col4: Bank, ... Col Last: Status
      if (nonUrlTokens.length >= 1) {
        // Token 0: UserID (or if starts with semicolon)
        userId = nonUrlTokens[0].replace(/^[;,|\s]+/, '').trim();
      }

      if (nonUrlTokens.length >= 2) {
        accountName = nonUrlTokens[1].trim();
      }

      if (nonUrlTokens.length >= 3) {
        // Check if token 2 is numeric -> accountNumber
        const digitsOnly = nonUrlTokens[2].replace(/[-\s]/g, '');
        if (/^\d{8,20}$/.test(digitsOnly)) {
          accountNumber = digitsOnly;
        } else {
          accountName += ` ${nonUrlTokens[2]}`;
        }
      }

      if (nonUrlTokens.length >= 4) {
        const potentialBank = nonUrlTokens[3].toUpperCase().trim();
        const foundB = knownBanks.find(b => potentialBank.includes(b));
        if (foundB) {
          bankName = foundB;
        } else {
          // If token 3 is status or other info
          bankName = potentialBank || defaultBank;
        }
      }

      // Check remaining tokens for Status or missing fields
      if (nonUrlTokens.length >= 5) {
        const lastToken = nonUrlTokens[nonUrlTokens.length - 1];
        if (lastToken) {
          status = lastToken.toUpperCase();
        }
      }
    } else {
      // 3. Fallback Space-delimited / Mixed Delimiter Parsing

      // Find Bank in line
      for (const b of knownBanks) {
        const regex = new RegExp(`\\b${b.replace(/\s+/g, '\\s+')}\\b`, 'i');
        if (regex.test(workingLine)) {
          bankName = b;
          workingLine = workingLine.replace(regex, ' ');
          break;
        }
      }

      // Find Account Number (8 to 20 digits or phone number starting with 08)
      const accNumMatch = workingLine.match(/\b08\d{8,12}\b/) || workingLine.match(/\b\d{8,20}\b/) || workingLine.match(/\b\d{3,5}[-\s]?\d{3,5}[-\s]?\d{3,8}\b/);
      if (accNumMatch) {
        accountNumber = accNumMatch[0].replace(/[-\s]/g, '');
        workingLine = workingLine.replace(accNumMatch[0], ' ');
      }

      // Find Status in line
      for (const s of knownStatuses) {
        const regex = new RegExp(`\\b${s.replace(/\s+/g, '\\s+')}\\b`, 'i');
        if (regex.test(workingLine)) {
          status = s.toUpperCase();
          workingLine = workingLine.replace(regex, ' ');
          break;
        }
      }

      // Clean remaining text for UserID and Account Name
      const cleanParts = workingLine
        .replace(/[-_:,|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .split(' ')
        .filter(Boolean);

      if (cleanParts.length > 0) {
        // First word is usually UserID
        userId = cleanParts[0];
        // Remaining words are Account Name
        accountName = cleanParts.slice(1).join(' ');
      }
    }

    // Fallbacks if some fields are empty
    if (!userId) userId = 'syndicate';
    if (!accountName) accountName = 'TANPA NAMA';
    if (!accountNumber) accountNumber = '0000000000';
    if (!status) status = 'REK BELUM PREMIUM';

    return {
      id: `lock_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 4)}`,
      userId: userId.trim(),
      accountName: accountName.trim(),
      accountNumber: accountNumber.trim(),
      bankName: bankName.trim().toUpperCase(),
      attachments: attachments,
      status: status.trim().toUpperCase(),
      rawLine: trimmed
    };
  };

  // Re-parse pasted input whenever input changes
  useEffect(() => {
    localStorage.setItem('lock_paste_input', pasteInput);
    localStorage.setItem('lock_info_heading', infoHeading);
    localStorage.setItem('lock_default_bank', defaultBank);

    if (!pasteInput.trim()) {
      setItems([]);
      return;
    }

    const lines = pasteInput.split('\n');
    const parsed: LockReportItem[] = [];

    lines.forEach((line, idx) => {
      const item = parseLineToLockItem(line, idx);
      if (item) {
        parsed.push(item);
      }
    });

    setItems(parsed);
  }, [pasteInput, infoHeading, defaultBank]);

  // Format link string based on separator option
  const formatAttachmentLinks = (links: string[]) => {
    if (!links || links.length === 0) return '-';
    if (linkSeparator === 'slash') {
      return links.join(' / ');
    } else if (linkSeparator === 'newline') {
      return links.join('\n');
    } else {
      return links.join(' ');
    }
  };

  // Generate complete formatted text string matching the user's requested output
  const formattedOutputText = useMemo(() => {
    if (items.length === 0) return '';

    return items.map(item => {
      const linksStr = formatAttachmentLinks(item.attachments);

      return `INFORMASI : ${infoHeading}

JENIS BANK :${item.bankName}
USERID : ${item.userId}
NAMA REKENING : ${item.accountName}
NOMOR REKENING : ${item.accountNumber}
STATUS : ${item.status}
LAMPIRAN : ${linksStr}`;
    }).join(
      copySeparator === 'blank_line' 
        ? '\n\n' 
        : copySeparator === 'divider' 
          ? '\n-----------------------------\n' 
          : '\n'
    );
  }, [items, infoHeading, linkSeparator, copySeparator]);

  // Handle Copy All Text
  const handleCopyAll = () => {
    if (!formattedOutputText) {
      showToast('Tidak ada data laporan untuk disalin', 'error');
      return;
    }
    navigator.clipboard.writeText(formattedOutputText);
    setCopiedAll(true);
    showToast('Berhasil menyalin seluruh format laporan lock!', 'success');
    setTimeout(() => setCopiedAll(false), 2500);
  };

  // Handle Copy Single Item Text
  const handleCopySingle = (item: LockReportItem) => {
    const linksStr = formatAttachmentLinks(item.attachments);

    const text = `INFORMASI : ${infoHeading}

JENIS BANK :${item.bankName}
USERID : ${item.userId}
NAMA REKENING : ${item.accountName}
NOMOR REKENING : ${item.accountNumber}
STATUS : ${item.status}
LAMPIRAN : ${linksStr}`;

    navigator.clipboard.writeText(text);
    setCopiedId(item.id);
    showToast(`Disalin: ${item.userId} (${item.bankName})`, 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Handle Delete Single Item
  const handleDeleteItem = (id: string) => {
    const newItems = items.filter(i => i.id !== id);
    setItems(newItems);
    showToast('Data laporan lock dihapus', 'info');
  };

  // Handle Add Blank Manual Item
  const handleAddNewItem = () => {
    const newItem: LockReportItem = {
      id: `lock_manual_${Date.now()}`,
      userId: 'syndicate',
      accountName: 'Bagus Tri Fauzi',
      accountNumber: '0895334540182',
      bankName: defaultBank || 'DANA',
      attachments: ['https://sleekshot.app/v/VlcF2vAxo5X4', 'https://sleekshot.app/v/3oUkBiaNhIR2'],
      status: 'REK BELUM PREMIUM'
    };
    setItems(prev => [...prev, newItem]);
    showToast('Berhasil menambah baris manual', 'success');
  };

  // Update item from edit modal
  const handleSaveEdit = () => {
    if (!editingItem) return;
    setItems(prev => prev.map(i => i.id === editingItem.id ? editingItem : i));
    setEditingItem(null);
    showToast('Perubahan laporan lock berhasil disimpan', 'success');
  };

  // Preset Heading Choices
  const headingPresets = [
    'BANTU LOCK KO/CI',
    'BANTU LOCK AKUN',
    'BANTU UNLOCK KO/CI',
    'LAPORAN REKENING BERMASALAH',
    'URGENT LOCK KO/CI'
  ];

  return (
    <div className="space-y-6 animate-fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto text-slate-100" id="lock-report-module">
      
      {/* Header Banner */}
      <div className="glass-gold-heavy p-6 border rounded-2xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_0_30px_rgba(212,175,55,0.15)]">
        <div className="flex items-start gap-4">
          <div className="p-3.5 rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/15 text-[#FFD700] shadow-[0_0_20px_rgba(212,175,55,0.3)] shrink-0">
            <Lock className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-wide uppercase">
                Laporan Lock Sekali Tempel
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#D4AF37]/20 text-[#FFD700] border border-[#D4AF37]/40">
                VIP LOCK PARSER
              </span>
            </div>
            <p className="text-xs text-[#D4AF37]/90 font-medium mt-1">
              Tempel teks mentah daftar lock (UserID, Nama, No Rek/E-Wallet, Bank, Link Lampiran & Status). Otomatis terformat rapi sesuai format standar tim.
            </p>
          </div>
        </div>

        {/* Global Stats Counter */}
        <div className="flex items-center gap-4 bg-black/60 border border-[#D4AF37]/20 p-3.5 rounded-xl self-start md:self-auto shrink-0">
          <div className="text-left pr-4 border-r border-[#D4AF37]/20">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Total Laporan</span>
            <span className="text-lg font-mono font-black text-[#FFD700]">{items.length} Data</span>
          </div>
          <div className="text-left">
            <span className="text-[10px] text-slate-400 font-extrabold uppercase block tracking-wider">Status Lock</span>
            <span className="text-sm font-mono font-extrabold text-emerald-400 truncate max-w-[140px] block">{infoHeading}</span>
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
                  Area Tempel Data Laporan Lock
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

            {/* Quick Example Guideline (without filling input) */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-400 font-mono block">Format tempel yang didukung (Tab Excel / Spasi):</span>
              <div className="p-2.5 rounded-xl bg-black/60 border border-[#D4AF37]/20 font-mono text-[10px] text-[#FFD700]/90 space-y-1 leading-relaxed">
                <p className="text-slate-400">Contoh format:</p>
                <p className="text-[#FFD700] break-all">syndicate	Bagus Tri Fauzi	0895334540182	DANA	https://sleekshot.app/v/VlcF2vAxo5X4	https://sleekshot.app/v/3oUkBiaNhIR2	REK BELUM PREMIUM</p>
              </div>
            </div>

            {/* Textarea Input - Clean placeholder without pre-filled text */}
            <div>
              <textarea
                value={pasteInput}
                onChange={(e) => setPasteInput(e.target.value)}
                placeholder="Tempel data laporan lock di sini (langsung tempel dari Excel / Spreadsheet)..."
                rows={9}
                className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-xl p-3.5 font-mono text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-[#FFD700] focus:ring-1 focus:ring-[#FFD700] transition-all resize-y shadow-inner"
              />
            </div>

            {/* Informational Header Setting */}
            <div className="space-y-2 pt-2 border-t border-[#D4AF37]/15">
              <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block">
                Header Informasi (Judul Laporan)
              </label>
              <input
                type="text"
                value={infoHeading}
                onChange={(e) => setInfoHeading(e.target.value.toUpperCase())}
                placeholder="e.g. BANTU LOCK KO/CI"
                className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-lg px-3 py-2 text-xs text-[#FFD700] font-bold focus:outline-none focus:border-[#FFD700]"
              />

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {headingPresets.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setInfoHeading(preset)}
                    className={`px-2 py-1 rounded-md text-[10px] font-extrabold transition-all cursor-pointer ${
                      infoHeading === preset
                        ? 'bg-[#D4AF37] text-black font-black'
                        : 'bg-black/60 text-slate-400 border border-[#D4AF37]/20 hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Config Controls */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Pemisah Lampiran Link
                </label>
                <select
                  value={linkSeparator}
                  onChange={(e) => setLinkSeparator(e.target.value as any)}
                  className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#FFD700]"
                >
                  <option value="slash">Garis Miring ( / )</option>
                  <option value="newline">Baris Baru</option>
                  <option value="space">Spasi</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider block mb-1">
                  Default Bank (Jika Kosong)
                </label>
                <input
                  type="text"
                  value={defaultBank}
                  onChange={(e) => setDefaultBank(e.target.value.toUpperCase())}
                  placeholder="e.g. DANA"
                  className="w-full bg-black/60 border border-[#D4AF37]/30 rounded-lg px-2.5 py-1.5 text-xs text-white font-bold focus:outline-none focus:border-[#FFD700]"
                />
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
                  Hasil Format Laporan Lock Terurut
                </h3>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Siap langsung disalin dan dikirim ke grup tim / CS
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
                <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Belum Ada Data Laporan Ditempel</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Ketik atau tempel teks pada kotak sebelah kiri untuk memformat laporan lock secara instan.
                </p>
              </div>
            ) : (
              <div className="relative">
                <textarea
                  readOnly
                  value={formattedOutputText}
                  rows={Math.max(items.length * 8, 8)}
                  className="w-full bg-[#050505] border border-[#D4AF37]/40 rounded-xl p-4 font-mono text-xs text-[#FFD700] leading-relaxed focus:outline-none shadow-inner selection:bg-[#D4AF37] selection:text-black cursor-text"
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
                      ? 'bg-[#D4AF37] text-black' 
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
                <ShieldAlert className="h-4 w-4" /> Rincian Kartu Laporan Lock ({items.length})
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
                {items.map((item) => {
                  const isCopied = copiedId === item.id;

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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-2 text-xs flex-1">
                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              Informasi
                            </span>
                            <span className="font-extrabold text-[#FFD700]">
                              {infoHeading}
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
                              User ID
                            </span>
                            <span className="font-mono font-bold text-amber-300">
                              {item.userId}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              Nama Rekening
                            </span>
                            <span className="font-extrabold text-slate-100">
                              {item.accountName}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              Nomor Rekening / HP
                            </span>
                            <span className="font-mono font-bold text-slate-300">
                              {item.accountNumber}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                              Status
                            </span>
                            <span className="font-mono font-black text-rose-400 uppercase">
                              {item.status}
                            </span>
                          </div>

                          {/* Attachments links */}
                          <div className="sm:col-span-2 lg:col-span-3 pt-1 border-t border-[#D4AF37]/15">
                            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block mb-1">
                              Lampiran ({item.attachments.length} Link):
                            </span>
                            {item.attachments.length > 0 ? (
                              <div className="flex flex-wrap gap-2">
                                {item.attachments.map((link, lIdx) => (
                                  <a
                                    key={lIdx}
                                    href={link}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded bg-black/60 border border-[#D4AF37]/30 text-[11px] text-[#FFD700] hover:text-white hover:border-[#FFD700] transition-colors"
                                  >
                                    <ExternalLink className="h-3 w-3" />
                                    <span className="truncate max-w-[200px]">{link}</span>
                                  </a>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-xs italic">-</span>
                            )}
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
                                : 'bg-black/60 border border-[#D4AF37]/30 text-[#FFD700] hover:bg-[#D4AF37]/20'
                            }`}
                            title="Salin laporan item ini"
                          >
                            {isCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                            <span>{isCopied ? 'Disalin' : 'Salin'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className="p-2 rounded-lg bg-black/60 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-all cursor-pointer"
                            title="Edit data laporan"
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
              className="glass-gold-heavy p-6 border rounded-2xl max-w-lg w-full space-y-4 shadow-2xl text-slate-100 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between pb-3 border-b border-[#D4AF37]/20">
                <h3 className="text-sm font-extrabold uppercase text-[#FFD700] tracking-wider flex items-center gap-2">
                  <Lock className="h-4 w-4" /> Edit Data Laporan Lock
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
                      className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-lg p-2 text-xs text-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                      User ID
                    </label>
                    <input
                      type="text"
                      value={editingItem.userId}
                      onChange={(e) => setEditingItem({ ...editingItem, userId: e.target.value })}
                      className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-lg p-2 text-xs text-white font-mono font-bold"
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
                    onChange={(e) => setEditingItem({ ...editingItem, accountName: e.target.value })}
                    className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-lg p-2 text-xs text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                    Nomor Rekening / No HP
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
                    Lampiran URL (Pisahkan baris baru / spasi)
                  </label>
                  <textarea
                    rows={3}
                    value={editingItem.attachments.join('\n')}
                    onChange={(e) => setEditingItem({ 
                      ...editingItem, 
                      attachments: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) 
                    })}
                    className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-lg p-2 text-xs text-[#FFD700] font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-extrabold uppercase text-slate-400 block mb-1">
                    Status
                  </label>
                  <input
                    type="text"
                    value={editingItem.status}
                    onChange={(e) => setEditingItem({ ...editingItem, status: e.target.value.toUpperCase() })}
                    className="w-full bg-black/80 border border-[#D4AF37]/30 rounded-lg p-2 text-xs text-rose-400 font-mono font-bold"
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
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-[#D4AF37] text-black hover:bg-[#FFD700] cursor-pointer"
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
