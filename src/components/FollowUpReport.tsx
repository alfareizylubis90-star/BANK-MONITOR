import { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ParsedFollowUp } from '../types';

interface FollowUpReportProps {
  currentTime: Date;
  showToast: (msg: string) => void;
}

export default function FollowUpReport({ currentTime, showToast }: FollowUpReportProps) {
  // Follow Up States
  const [rawFollowUpText, setRawFollowUpText] = useState(() => {
    return localStorage.getItem('bank_status_raw_followup_text') || '';
  });
  const [followUpHeaderInfo, setFollowUpHeaderInfo] = useState(() => {
    return localStorage.getItem('bank_status_followup_header_info') || 'LIGA BANDOT';
  });
  const [followUpHeaderPerihal, setFollowUpHeaderPerihal] = useState(() => {
    return localStorage.getItem('bank_status_followup_header_perihal') || 'Follow Up Rekening Bank Off / Bermasalah';
  });
  const [followUpItems, setFollowUpItems] = useState<ParsedFollowUp[]>(() => {
    const saved = localStorage.getItem('bank_status_followup_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });
  const [reportFormatStyle, setReportFormatStyle] = useState<'default' | 'grouped'>('default');

  // Save follow up states
  useEffect(() => {
    localStorage.setItem('bank_status_raw_followup_text', rawFollowUpText);
  }, [rawFollowUpText]);
  useEffect(() => {
    localStorage.setItem('bank_status_followup_header_info', followUpHeaderInfo);
  }, [followUpHeaderInfo]);
  useEffect(() => {
    localStorage.setItem('bank_status_followup_header_perihal', followUpHeaderPerihal);
  }, [followUpHeaderPerihal]);
  useEffect(() => {
    localStorage.setItem('bank_status_followup_items', JSON.stringify(followUpItems));
  }, [followUpItems]);

  // Parse pasted raw text
  const handleParseFollowUp = () => {
    if (!rawFollowUpText.trim()) {
      showToast('Harap tempel data follow up terlebih dahulu!');
      return;
    }

    const lines = rawFollowUpText.split('\n');
    const parsed: ParsedFollowUp[] = [];

    lines.forEach(line => {
      if (!line.trim()) return;

      // Excel copy paste is tab separated. If there are no tabs, try consecutive spaces (2 or more)
      let cols = line.split('\t');
      if (cols.length < 3) {
        cols = line.split(/[ ]{2,}/);
      }

      // Clean up empty elements, but preserve indices for column placement
      const trimmedCols = cols.map(c => c.trim());

      // If we don't have enough columns, skip
      if (trimmedCols.length < 2) return;

      const accountName = trimmedCols[0] || '';
      const accountNumber = trimmedCols[1] || '';
      const problem = trimmedCols[2] || '';
      const balance = trimmedCols[3] || '0';
      const bankName = trimmedCols[4] || '';
      const action = trimmedCols[5] || '';
      const deviceStatus = trimmedCols[6] || '';

      parsed.push({
        id: `followup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        bankName: bankName || 'BANK KAS BERSIH',
        accountName: accountName || 'NAMA REKENING',
        accountNumber: accountNumber || 'NOMOR REKENING',
        balance: balance || '0',
        problem: problem || 'BERMASALAH',
        action: action || '',
        deviceStatus: deviceStatus || ''
      });
    });

    if (parsed.length > 0) {
      setFollowUpItems(parsed);
      showToast(`Berhasil memproses ${parsed.length} data bank bermasalah!`);
    } else {
      showToast('Gagal memproses data. Pastikan format kolom sesuai.');
    }
  };

  // Load sample data provided in the prompt
  const handleLoadSampleData = () => {
    const sample = `Renny Oktaviyani\t3698157124\tTERBLOKIR\t86,180,665\tBANK KAS BERSIH DANAMON\tDI OFFKAN\tHP MASIH DI SITUS
Agus Maulana\t903700821139\tSALDO DI BEKUKAN\t100,953,541\tBANK KAS BERSIH DANAMON\tDI OFFKAN\tHP MASIH DI SITUS
MUHAMMAD ISA\t3636913174\tSALDO DI BEKUKAN\t109,883,191\tBANK KAS BERSIH DANAMON\tDI OFFKAN\tHP MASIH DI SITUS
MUHAMMAD RIZKY FADILLAH\t2760233679\tSALDO DI BEKUKAN\t77,896,804\tBANK KAS BERSIH BCA\tDI OFFKAN\tHP MASIH DI SITUS
Ichsan nuryadhy\t708675750100\tTERBLOKIR\t5,486,107\tWITHDRAW BERSIH CIMB\tDI OFFKAN\tHP MASIH DI SITUS
Patricia Septy Rachmadani\t771361713\tWEB KLIK BCA TERBLOKIR\t30,475\tBANK DEPO BCA\tDI OFFKAN\tHP MASIH DI SITUS
DWI HESTHY HANDAYANI\t003700930534\tDI OFFKAN BY ADM\t349,814\tBANK KAS BERSIH DANAMON\tDI OFFKAN\tHP MASIH DI SITUS
ALI\t708185661200\tDI OFFKAN BY ADM\t68,503\tKAS CIMB\tDI OFFKAN\tHP MASIH DI SITUS
Sarip Hidayat\t1928818710\tDI OFFKAN SEMENTARA\t850,186\tDEPO BNI\t\tHP MASIH DI SITUS
LIZA WATI\t53501000398563\tDI OFFKAN BY ADM\t261,340\tBANK KAS BERSIH BRI\tDI OFFKAN\tHP MASIH DI SITUS
Anita\t1680004138861\tTERLOGOUT / RTP\t33,914\tWITDRAW BERSIH MANDIRI\t\tHP MASIH DI SITUS
Azrial Abi Handaya\t1210013967280\tTERLOGOUT / RTP\t34,109\tWITDRAW BERSIH MANDIRI\tDI OFFKAN\tHP MASIH DI SITUS
Ami\t2770833313\tSALDO DI BEKUKAN / DI OFFKAN\t25,016,913\tBANK KAS BERSIH BCA\tDI OFFKAN\tHP MASIH DI SITUS
KADEK ARYA BUDIARTA\t5800670464\tSALDO DI BEKUKAN / DI OFFKAN\t25,042,683\tBANK KAS BERSIH BCA\tDI OFFKAN\tHP MASIH DI SITUS
KRISTOBIAN YOBEL GINTING\t6955316294\tSALDO DI BEKUKAN / DI OFFKAN\t25,548,103\tBANK KAS BERSIH BCA\t\tHP MASIH DI SITUS`;
    
    setRawFollowUpText(sample);
    showToast('Contoh data dimuat! Tekan "Proses & Parse" untuk melihat hasil.');
  };

  // Update single field of parsed follow up item
  const handleUpdateFollowUpItem = (id: string, field: keyof ParsedFollowUp, value: string) => {
    setFollowUpItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  // Delete a parsed item
  const handleDeleteFollowUpItem = (id: string) => {
    setFollowUpItems(prev => prev.filter(item => item.id !== id));
    showToast('Data dihapus dari laporan');
  };

  // Add a new blank item manually
  const handleAddFollowUpItemManually = () => {
    const newItem: ParsedFollowUp = {
      id: `followup-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      bankName: 'BANK KAS BERSIH BCA',
      accountName: 'NAMA REKENING',
      accountNumber: '1234567890',
      balance: '1,000,000',
      problem: 'TERBLOKIR',
      action: 'DI OFFKAN',
      deviceStatus: 'HP MASIH DI SITUS'
    };
    setFollowUpItems(prev => [...prev, newItem]);
    showToast('Ditambahkan baris baru secara manual');
  };

  // Clear all follow up items
  const handleClearFollowUp = () => {
    if (window.confirm('Bersihkan semua data follow up?')) {
      setFollowUpItems([]);
      setRawFollowUpText('');
      showToast('Semua data dibersihkan');
    }
  };

  // Report formatted for copying to clipboard
  const formattedFollowUpReport = useMemo(() => {
    let output = '';
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `        💳 BANK STATUS\n`;
    output += `     Monitoring Operasional Bank\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    output += `Info : ${followUpHeaderInfo}\n`;
    output += `Perihal : ${followUpHeaderPerihal}\n`;
    output += `Tanggal : ${currentTime.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}\n`;
    output += `───────────────────────────────\n\n`;

    if (followUpItems.length === 0) {
      output += `[ Belum ada data follow up ]\n`;
      return output;
    }

    if (reportFormatStyle === 'default') {
      followUpItems.forEach((item, index) => {
        output += `JENIS BANK : ${item.bankName.toUpperCase()}\n`;
        output += `NAMA REKENING : ${item.accountName.toUpperCase()}\n`;
        output += `NOMOR REKENING : ${item.accountNumber}\n`;
        output += `SALDO BANK : ${item.balance}\n`;
        
        // Combine problem, action, and device status cleanly
        const ketList = [item.problem, item.action, item.deviceStatus].map(s => s?.trim()).filter(Boolean);
        output += `KETERANGAN : ${ketList.join(' - ').toUpperCase()}\n`;

        if (index < followUpItems.length - 1) {
          output += `───────────────────────────────\n`;
        }
      });
    } else {
      // Grouped by Bank Name
      const grouped: Record<string, ParsedFollowUp[]> = {};
      followUpItems.forEach(item => {
        const bankKey = item.bankName.toUpperCase().trim() || 'LAIN-LAIN';
        if (!grouped[bankKey]) grouped[bankKey] = [];
        grouped[bankKey].push(item);
      });

      const keys = Object.keys(grouped);
      keys.forEach((bankKey, bIdx) => {
        output += `🏦 [ ${bankKey} ]\n`;
        output += `───────────────────────────────\n`;
        grouped[bankKey].forEach((item, index) => {
          output += `NAMA REKENING : ${item.accountName.toUpperCase()}\n`;
          output += `NOMOR REKENING : ${item.accountNumber}\n`;
          output += `SALDO BANK : ${item.balance}\n`;
          
          const ketList = [item.problem, item.action, item.deviceStatus].map(s => s?.trim()).filter(Boolean);
          output += `KETERANGAN : ${ketList.join(' - ').toUpperCase()}\n`;
          
          if (index < grouped[bankKey].length - 1) {
            output += `-\n`;
          }
        });
        if (bIdx < keys.length - 1) {
          output += `───────────────────────────────\n`;
        }
      });
    }

    return output;
  }, [followUpItems, followUpHeaderInfo, followUpHeaderPerihal, reportFormatStyle, currentTime]);

  // Copy parsed follow up report
  const handleCopyFollowUpReport = () => {
    navigator.clipboard.writeText(formattedFollowUpReport).then(() => {
      showToast('Laporan Follow Up disalin ke clipboard!');
    }).catch(err => {
      console.error('Failed to copy report: ', err);
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start text-white">
      {/* LEFT SIDE PANEL: Input and Configurations (4 cols) */}
      <div className="lg:col-span-4 flex flex-col gap-6">
        {/* Paste box card */}
        <div className="bg-[#0f1425]/70 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3.5">
            <span className="text-xl">📋</span>
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Tempel Data</h3>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide">Tempel baris spreadsheet/text untuk di-parse</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <label htmlFor="raw-pasted-data">Raw Data (Tab-Separated):</label>
              <button 
                onClick={handleLoadSampleData}
                className="text-blue-400 hover:text-blue-300 transition cursor-pointer text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
              >
                Contoh Data
              </button>
            </div>

            <textarea
              id="raw-pasted-data"
              rows={8}
              value={rawFollowUpText}
              onChange={(e) => setRawFollowUpText(e.target.value)}
              placeholder="Contoh:&#10;Renny Oktaviyani&#9;3698157124&#9;TERBLOKIR&#9;86,180,665&#9;BANK KAS BERSIH DANAMON&#9;DI OFFKAN&#9;HP MASIH DI SITUS"
              className="w-full rounded-xl border border-white/10 p-3.5 text-xs font-mono bg-[#060913] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600 text-white"
            />

            <div className="flex gap-2">
              <button
                onClick={handleParseFollowUp}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs py-3 px-4 rounded-xl shadow-lg shadow-blue-500/15 transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-blue-400/20"
              >
                <Plus className="h-4 w-4" />
                Proses & Parse
              </button>
              <button
                onClick={handleClearFollowUp}
                className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs py-3 px-4 rounded-xl border border-white/10 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Bersihkan
              </button>
            </div>
          </div>
        </div>

        {/* Metadata config card */}
        <div className="bg-[#0f1425]/70 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 space-y-4 shadow-2xl">
          <div className="flex items-center gap-2.5 border-b border-white/[0.06] pb-3.5">
            <span className="text-xl">⚙️</span>
            <div>
              <h3 className="font-bold text-white text-sm uppercase tracking-wider">Header Laporan</h3>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wide">Ubah info laporan yang dihasilkan</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label htmlFor="meta-info" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Info Penerbit:</label>
              <input
                id="meta-info"
                type="text"
                value={followUpHeaderInfo}
                onChange={(e) => setFollowUpHeaderInfo(e.target.value)}
                placeholder="Contoh: LIGA BANDOT"
                className="w-full text-xs font-bold rounded-xl border border-white/10 px-3.5 py-2.5 bg-[#060913] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white uppercase"
              />
            </div>

            <div>
              <label htmlFor="meta-perihal" className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Perihal Laporan:</label>
              <input
                id="meta-perihal"
                type="text"
                value={followUpHeaderPerihal}
                onChange={(e) => setFollowUpHeaderPerihal(e.target.value)}
                placeholder="Contoh: Follow Up Rekening Bank Off"
                className="w-full text-xs font-bold rounded-xl border border-white/10 px-3.5 py-2.5 bg-[#060913] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE PANEL: Result editor & WhatsApp text representation (8 cols) */}
      <div className="lg:col-span-8 flex flex-col gap-6">
        {/* Parsed Items List / Live Editor */}
        <div className="bg-[#0f1425]/70 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📝</span>
              <div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Hasil Parse Data</h3>
                <p className="text-[10px] text-slate-400 font-semibold tracking-wide">Sesuaikan atau edit kolom data di bawah jika ada kesalahan</p>
              </div>
            </div>
            <button
              onClick={handleAddFollowUpItemManually}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 font-bold text-[10px] uppercase tracking-wider py-2 px-3.5 rounded-xl transition-all flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              Tambah Manual
            </button>
          </div>

          {followUpItems.length === 0 ? (
            <div className="text-center py-12 bg-[#060913]/30 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2.5">
              <span className="text-2xl">📥</span>
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Belum Ada Data Ter-parse</h4>
              <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed font-semibold">
                Silakan tempel data spreadsheet di kolom kiri lalu tekan "Proses & Parse" atau gunakan tombol "Contoh Data".
              </p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
              <AnimatePresence initial={false}>
                {followUpItems.map((item, idx) => (
                  <motion.div 
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="bg-[#060913]/40 hover:bg-[#060913]/70 rounded-xl p-4 border border-white/[0.04] relative group transition-all"
                  >
                    <div className="absolute top-3.5 right-3.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleDeleteFollowUpItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer border border-transparent hover:border-rose-500/10"
                        title="Hapus baris ini"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 mb-3.5">
                      <span className="text-[9px] uppercase bg-blue-500/20 text-blue-300 font-bold px-2.5 py-1 rounded-md">
                        Baris #{idx + 1}
                      </span>
                      <span className="text-[10px] text-slate-500 font-bold font-mono">
                        ID: {item.id.split('-')[2] || 'item'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      {/* Jenis Bank */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Jenis Bank:</label>
                        <input
                          type="text"
                          value={item.bankName}
                          onChange={(e) => handleUpdateFollowUpItem(item.id, 'bankName', e.target.value)}
                          className="w-full text-xs font-semibold rounded-lg border border-white/10 px-2.5 py-1.5 bg-[#060913] focus:ring-1 focus:ring-blue-500 text-white"
                        />
                      </div>

                      {/* Saldo Bank */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Saldo Bank:</label>
                        <input
                          type="text"
                          value={item.balance}
                          onChange={(e) => handleUpdateFollowUpItem(item.id, 'balance', e.target.value)}
                          className="w-full text-xs font-semibold rounded-lg border border-white/10 px-2.5 py-1.5 bg-[#060913] focus:ring-1 focus:ring-blue-500 text-white"
                        />
                      </div>

                      {/* Nama Rekening */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nama Rekening:</label>
                        <input
                          type="text"
                          value={item.accountName}
                          onChange={(e) => handleUpdateFollowUpItem(item.id, 'accountName', e.target.value)}
                          className="w-full text-xs font-semibold rounded-lg border border-white/10 px-2.5 py-1.5 bg-[#060913] focus:ring-1 focus:ring-blue-500 text-white uppercase"
                        />
                      </div>

                      {/* Nomor Rekening */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nomor Rekening:</label>
                        <input
                          type="text"
                          value={item.accountNumber}
                          onChange={(e) => handleUpdateFollowUpItem(item.id, 'accountNumber', e.target.value)}
                          className="w-full text-xs font-semibold rounded-lg border border-white/10 px-2.5 py-1.5 bg-[#060913] focus:ring-1 focus:ring-blue-500 text-white font-mono"
                        />
                      </div>

                      {/* Masalah */}
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Masalah:</label>
                        <input
                          type="text"
                          value={item.problem}
                          onChange={(e) => handleUpdateFollowUpItem(item.id, 'problem', e.target.value)}
                          className="w-full text-xs font-semibold rounded-lg border border-white/10 px-2.5 py-1.5 bg-[#060913] focus:ring-1 focus:ring-blue-500 text-white"
                        />
                      </div>

                      {/* Tindakan */}
                      <div>
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tindakan:</label>
                        <input
                          type="text"
                          value={item.action}
                          onChange={(e) => handleUpdateFollowUpItem(item.id, 'action', e.target.value)}
                          className="w-full text-xs font-semibold rounded-lg border border-white/10 px-2.5 py-1.5 bg-[#060913] focus:ring-1 focus:ring-blue-500 text-white"
                        />
                      </div>

                      {/* Status HP */}
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status Device / HP:</label>
                        <input
                          type="text"
                          value={item.deviceStatus}
                          onChange={(e) => handleUpdateFollowUpItem(item.id, 'deviceStatus', e.target.value)}
                          className="w-full text-xs font-semibold rounded-lg border border-white/10 px-2.5 py-1.5 bg-[#060913] focus:ring-1 focus:ring-blue-500 text-white"
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Formatted Text Box Output (WhatsApp Compatible) */}
        <div className="bg-[#0f1425]/70 backdrop-blur-md rounded-2xl border border-white/[0.06] p-6 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/[0.06] pb-4 gap-3">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📢</span>
              <div>
                <h3 className="font-bold text-white text-sm uppercase tracking-wider">Output Laporan Terformat</h3>
                <p className="text-[10px] text-slate-400 font-semibold tracking-wide">Format siap salin ke Whatsapp / Group LIGA BANDOT</p>
              </div>
            </div>
            
            {/* Style selectors & Hapus Laporan */}
            <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
              {followUpItems.length > 0 && (
                <button
                  onClick={handleClearFollowUp}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 font-bold text-[10px] uppercase tracking-wider py-1.5 px-3 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Hapus semua data follow up"
                >
                  <Trash2 className="h-3.5 w-3.5 text-rose-400 shrink-0" />
                  Hapus Laporan
                </button>
              )}

              <div className="bg-[#060913] p-1 rounded-xl flex items-center gap-1 border border-white/10">
                <button
                  onClick={() => setReportFormatStyle('default')}
                  className={`text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer uppercase ${
                    reportFormatStyle === 'default'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Urutan Tempel
                </button>
                <button
                  onClick={() => setReportFormatStyle('grouped')}
                  className={`text-[9px] font-bold px-3 py-1.5 rounded-lg transition-all cursor-pointer uppercase ${
                    reportFormatStyle === 'grouped'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Group Per Bank
                </button>
              </div>
            </div>
          </div>

          <div className="relative">
            <pre 
              className="w-full rounded-2xl border border-white/10 bg-slate-950/80 text-emerald-400 p-5 font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed select-all"
              id="formatted-report-output"
            >
              {formattedFollowUpReport}
            </pre>
            
            {followUpItems.length > 0 && (
              <div className="absolute bottom-4 right-4">
                <span className="text-[10px] font-mono font-bold bg-[#060913]/80 text-slate-400 px-2 py-1 rounded border border-white/5">
                  Klik area hitam untuk memilih semua teks
                </span>
              </div>
            )}
          </div>

          <button
            onClick={handleCopyFollowUpReport}
            disabled={followUpItems.length === 0}
            className={`w-full font-bold text-xs py-3.5 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer transition-all border ${
              followUpItems.length === 0
                ? 'bg-white/5 text-slate-500 border-white/5 shadow-none cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/10 border-emerald-500/20 hover:shadow-lg'
            }`}
          >
            <Copy className="h-4 w-4" />
            Salin Laporan LIGA BANDOT ({followUpItems.length} Bank)
          </button>
        </div>
      </div>
    </div>
  );
}

