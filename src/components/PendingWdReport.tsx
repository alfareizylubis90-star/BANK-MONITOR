import { useState, useEffect, useMemo } from 'react';
import { 
  Zap, 
  Copy, 
  Check, 
  Trash2, 
  RotateCcw, 
  FileText, 
  Share2, 
  Info as InfoIcon,
  Sparkles,
  ListOrdered,
  Plus,
  Send,
  Sliders,
  CheckSquare,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface PendingWdItem {
  id: string;
  no?: string;
  userId: string;
  accountName: string;
  accountNumber: string;
  bankName: string;
  transferRef: string;
  dateTime?: string;
  nominal: string;
  nominalNum: number;
}

interface PendingWdReportProps {
  showToast: (msg: string, type?: 'success' | 'error' | 'loading' | 'info') => void;
}

export default function PendingWdReport({ showToast }: PendingWdReportProps) {
  // Provider Selection: 'MINERA' | 'PAY2ME' | 'CUSTOM'
  const [provider, setProvider] = useState<'MINERA' | 'PAY2ME' | 'CUSTOM'>(() => {
    return (localStorage.getItem('pending_wd_provider') as any) || 'MINERA';
  });

  // Header Configs
  const [infoText, setInfoText] = useState(() => {
    return localStorage.getItem('pending_wd_info_text') || 'LIGABANDOT';
  });
  const [tokoText, setTokoText] = useState(() => {
    return localStorage.getItem('pending_wd_toko_text') || 'SMB4';
  });
  const [perihalText, setPerihalText] = useState(() => {
    return localStorage.getItem('pending_wd_perihal_text') || 'Transaksi AutoWd Minera Pending';
  });
  const [keteranganText, setKeteranganText] = useState(() => {
    return localStorage.getItem('pending_wd_keterangan_text') || 
      'Untuk Saat ini Terdapat Transaksi Pengiriman Dana AutoWd Minera  Yang sedang dalam status pending ya ko/ci dan pada admin antrian penarikan tersebut ter hold sehingga tidak sesuai durasi, prihal ini akan di cek secara berkala dan menunggu keputusan final dari pihak MINERA';
  });

  // Raw Input & Parsed Items
  const [rawText, setRawText] = useState(() => {
    return localStorage.getItem('pending_wd_raw_text') || '';
  });
  const [items, setItems] = useState<PendingWdItem[]>(() => {
    const saved = localStorage.getItem('pending_wd_items');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [];
  });

  // Format Output Mode: 'itemized' | 'standard' | 'numbered' | 'inline' | 'detailed'
  const [formatMode, setFormatMode] = useState<'itemized' | 'standard' | 'numbered' | 'inline' | 'detailed'>('itemized');
  const [copied, setCopied] = useState(false);

  // Input mode tab: 'table' | 'separated'
  const [inputTab, setInputTab] = useState<'table' | 'separated'>('table');

  // Separated inputs state
  const [rawUserIds, setRawUserIds] = useState(() => localStorage.getItem('pending_wd_raw_userids') || '');
  const [rawTransferRefs, setRawTransferRefs] = useState(() => localStorage.getItem('pending_wd_raw_refs') || '');
  const [rawNominals, setRawNominals] = useState(() => localStorage.getItem('pending_wd_raw_nominals') || '');

  // Sync separated inputs to localStorage
  useEffect(() => {
    localStorage.setItem('pending_wd_raw_userids', rawUserIds);
  }, [rawUserIds]);
  useEffect(() => {
    localStorage.setItem('pending_wd_raw_refs', rawTransferRefs);
  }, [rawTransferRefs]);
  useEffect(() => {
    localStorage.setItem('pending_wd_raw_nominals', rawNominals);
  }, [rawNominals]);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('pending_wd_provider', provider);
  }, [provider]);
  useEffect(() => {
    localStorage.setItem('pending_wd_info_text', infoText);
  }, [infoText]);
  useEffect(() => {
    localStorage.setItem('pending_wd_toko_text', tokoText);
  }, [tokoText]);
  useEffect(() => {
    localStorage.setItem('pending_wd_perihal_text', perihalText);
  }, [perihalText]);
  useEffect(() => {
    localStorage.setItem('pending_wd_keterangan_text', keteranganText);
  }, [keteranganText]);
  useEffect(() => {
    localStorage.setItem('pending_wd_raw_text', rawText);
  }, [rawText]);
  useEffect(() => {
    localStorage.setItem('pending_wd_items', JSON.stringify(items));
  }, [items]);

  // Handle Provider Preset Switches
  const handleSelectProvider = (selected: 'MINERA' | 'PAY2ME' | 'CUSTOM') => {
    setProvider(selected);
    if (selected === 'MINERA') {
      setPerihalText('Transaksi AutoWd Minera Pending');
      setKeteranganText('Untuk Saat ini Terdapat Transaksi Pengiriman Dana AutoWd Minera  Yang sedang dalam status pending ya ko/ci dan pada admin antrian penarikan tersebut ter hold sehingga tidak sesuai durasi, prihal ini akan di cek secara berkala dan menunggu keputusan final dari pihak MINERA');
      showToast('Preset MINERA diaktifkan', 'info');
    } else if (selected === 'PAY2ME') {
      setPerihalText('Transaksi AutoWd PAY2ME Pending');
      setKeteranganText('Untuk Saat ini Terdapat Transaksi Pengiriman Dana AutoWd PAY2ME  Yang sedang dalam status pending ya ko/ci dan pada admin antrian penarikan tersebut ter hold sehingga tidak sesuai durasi, prihal ini akan di cek secara berkala dan menunggu keputusan final dari pihak PAY2ME');
      showToast('Preset PAY2ME diaktifkan', 'info');
    } else {
      showToast('Custom Provider diaktifkan', 'info');
    }
  };

  // Parser function for raw text
  const parseRawText = (textToParse: string) => {
    if (!textToParse.trim()) return [];

    const lines = textToParse.split('\n');
    const parsed: PendingWdItem[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Try split by tab or multiple spaces
      let tokens = line.split('\t').map(t => t.trim()).filter(Boolean);
      if (tokens.length < 3) {
        tokens = line.split(/\s{2,}/).map(t => t.trim()).filter(Boolean);
      }

      if (tokens.length === 0) return;

      // Detect if first token is a row number e.g. "1", "2", "13"
      const isIndex = /^\d{1,4}$/.test(tokens[0]);
      const offset = isIndex ? 1 : 0;

      let userId = '';
      let accountName = '';
      let accountNumber = '';
      let bankName = '';
      let transferRef = '';
      let nominal = '';
      let dateTime = '';

      if (tokens.length >= offset + 4) {
        userId = tokens[offset] || '';
        accountName = tokens[offset + 1] || '';
        accountNumber = tokens[offset + 2] || '';
        bankName = tokens[offset + 3] || '';
      } else {
        userId = tokens[0] || '';
      }

      // Ref Token Search
      const refToken = tokens.find(t => 
        /^LGBDT-[A-Z0-9-]+$/i.test(t) || 
        (t.includes('-') && /[A-Z]/.test(t) && t.length > 6 && !t.includes(':') && !/\d{4}-\d{2}-\d{2}/.test(t))
      );
      if (refToken) {
        transferRef = refToken;
      } else if (tokens[offset + 4]) {
        transferRef = tokens[offset + 4];
      }

      // Nominal Search
      const nominalToken = tokens.find(t => 
        /^\d{1,3}(,\d{3})+(\.\d{2})?$/.test(t) || 
        /^\d{1,3}(\.\d{3})+(,\d{2})?$/.test(t)
      );
      if (nominalToken) {
        nominal = nominalToken;
      } else {
        const altNominal = tokens.find(t => 
          /\b\d+([.,]\d{2,3})*\b/.test(t) && !t.includes('-') && !t.includes(':') && t !== accountNumber
        );
        if (altNominal) nominal = altNominal;
      }

      // DateTime search
      const dateToken = tokens.find(t => /\d{4}-\d{2}-\d{2}/.test(t));
      if (dateToken) dateTime = dateToken;

      // Numeric Nominal
      let nominalNum = 0;
      if (nominal) {
        const clean = nominal.replace(/[^0-9]/g, '');
        if (nominal.endsWith('.00')) {
          nominalNum = parseInt(clean, 10) / 100;
        } else {
          nominalNum = parseInt(clean, 10);
        }
      }

      if (userId || transferRef || nominal) {
        parsed.push({
          id: `wd-${index}-${Math.random().toString(36).substring(2, 9)}`,
          no: (parsed.length + 1).toString(),
          userId: userId || `User-${index + 1}`,
          accountName: accountName || '-',
          accountNumber: accountNumber || '-',
          bankName: bankName || 'BANK',
          transferRef: transferRef || '-',
          dateTime,
          nominal: nominal || '0',
          nominalNum: isNaN(nominalNum) ? 0 : nominalNum
        });
      }
    });

    return parsed;
  };

  // Process Separated Input (3 Columns: User ID, Ref, Nominal)
  const handleProcessSeparatedInputs = () => {
    const userIds = rawUserIds.split('\n').map(s => s.trim()).filter(Boolean);
    const refs = rawTransferRefs.split('\n').map(s => s.trim()).filter(Boolean);
    const nominals = rawNominals.split('\n').map(s => s.trim()).filter(Boolean);

    if (userIds.length === 0 && refs.length === 0 && nominals.length === 0) {
      showToast('Harap isi minimal salah satu kolom terpisah!', 'error');
      return;
    }

    const maxLen = Math.max(userIds.length, refs.length, nominals.length);
    const parsed: PendingWdItem[] = [];

    for (let i = 0; i < maxLen; i++) {
      const uId = userIds[i] || `User-${i + 1}`;
      const ref = refs[i] || '-';
      const nom = nominals[i] || '0';

      let nominalNum = 0;
      if (nom) {
        const clean = nom.replace(/[^0-9]/g, '');
        if (nom.endsWith('.00')) {
          nominalNum = parseInt(clean, 10) / 100;
        } else {
          nominalNum = parseInt(clean, 10);
        }
      }

      parsed.push({
        id: `wd-sep-${i}-${Math.random().toString(36).substring(2, 9)}`,
        no: (i + 1).toString(),
        userId: uId,
        accountName: '-',
        accountNumber: '-',
        bankName: 'BANK',
        transferRef: ref,
        nominal: nom,
        nominalNum: isNaN(nominalNum) ? 0 : nominalNum
      });
    }

    setItems(parsed);
    showToast(`Berhasil menyusun ${parsed.length} data dari kolom terpisah!`, 'success');
  };

  // Process Raw Input Button
  const handleProcessInput = () => {
    if (inputTab === 'separated') {
      handleProcessSeparatedInputs();
      return;
    }

    if (!rawText.trim()) {
      showToast('Harap tempelkan data terlebih dahulu!', 'error');
      return;
    }

    const parsed = parseRawText(rawText);
    if (parsed.length > 0) {
      setItems(parsed);
      showToast(`Berhasil memproses ${parsed.length} transaksi WD pending!`, 'success');
    } else {
      showToast('Format data tidak terdeteksi. Pastikan data berupa tabel / tab-separated.', 'error');
    }
  };

  // Load Example Data
  const handleLoadSample = () => {
    if (inputTab === 'separated') {
      const uSample = `momonita200\nningkan\nrosidin33\nkajol06\ttarzan77\nberuntung999\nbule333\nndeworr\nxskasensio\npeddas27\nlilkid\neriz33\nsatset777`.replace(/\t/g, '\n');
      const rSample = `LGBDT-MW971880\nLGBDT-MW970977\nLGBDT-MW970948\nLGBDT-MW970933\nLGBDT-MW970808\nLGBDT-MW970800\nLGBDT-MW970796\nLGBDT-MW970794\nLGBDT-MW970793\nLGBDT-MW970791\nLGBDT-MW970789\nLGBDT-MW970782\nLGBDT-MW969957`;
      const nSample = `200,000.00\n50,000.00\n50,000.00\n251,000.00\n1,500,000.00\n200,000.00\n400,000.00\n203,000.00\n150,000.00\n454,000.00\n200,000.00\n760,000.00\n100,000.00`;

      setRawUserIds(uSample);
      setRawTransferRefs(rSample);
      setRawNominals(nSample);

      // Auto process
      const uArr = uSample.split('\n').filter(Boolean);
      const rArr = rSample.split('\n').filter(Boolean);
      const nArr = nSample.split('\n').filter(Boolean);
      const parsed: PendingWdItem[] = [];
      for (let i = 0; i < uArr.length; i++) {
        const nom = nArr[i] || '0';
        const clean = nom.replace(/[^0-9]/g, '');
        const nominalNum = nom.endsWith('.00') ? parseInt(clean, 10) / 100 : parseInt(clean, 10);
        parsed.push({
          id: `wd-sample-${i}`,
          userId: uArr[i],
          accountName: '-',
          accountNumber: '-',
          bankName: 'BANK',
          transferRef: rArr[i],
          nominal: nom,
          nominalNum: isNaN(nominalNum) ? 0 : nominalNum
        });
      }
      setItems(parsed);
      showToast('Contoh data terpisah berhasil dimuat & diproses!', 'success');
      return;
    }

    const sample = `1\t\tmomonita200\tChrismonita Agustin\t901906287056\tSEABANK\tLGBDT-MW971880\t-\t2026-07-25 08:06:48\t-\t200,000.00\twait for payment\t-\t
2\t\tningkan\tRusli\t6282184062274\tDANA\tLGBDT-MW970977\t-\t2026-07-25 02:06:15\t-\t50,000.00\twait for payment\t1ca067ff-ef62-4af8-8354-c6ae6550ee37\t
3\t\trosidin33\tRosidin\t085848178233\tDANA\tLGBDT-MW970948\t019f9581-1d8c-7285-93a7-974c2295e0a8\t2026-07-25 02:01:35\t-\t50,000.00\twait for payment\t10744677-a39b-47e2-9ead-5cecff2e3f6b\t
4\t\tkajol06\tPIRMA\t081384576221\tBCA\tLGBDT-MW970933\t-\t2026-07-25 01:59:28\t-\t251,000.00\twait for payment\t4b2e4c6a-b7a0-4b93-a026-4e4a27ddc0ba\t
5\t\ttarzan77\tMansar\t0732748534\tBNI\tLGBDT-MW970808\t019f9568-e716-727e-ab29-9711e63fc3e3\t2026-07-25 01:35:08\t-\t1,500,000.00\twait for payment\tc4b569b7-4e5d-455b-9396-a7fd6dcbe769\t
6\t\tberuntung999\tWIDODO\t8730294388\tBCA\tLGBDT-MW970800\t-\t2026-07-25 01:33:58\t-\t200,000.00\twait for payment\t48a82b7c-65f8-49e8-826b-e7debf0ac201\t
7\t\tbule333\tMohamad irfan\t901560002865\tSEABANK\tLGBDT-MW970796\t019f9567-92bc-718c-876f-d524b13e0e58\t2026-07-25 01:33:41\t-\t400,000.00\twait for payment\tcca2be24-482c-45d3-813c-c939c795dd34\t
8\t\tndeworr\trendra saputra\t1973475039\tBNI\tLGBDT-MW970794\t019f9567-8fc8-7092-9fc5-e5678a8eec9b\t2026-07-25 01:33:40\t-\t203,000.00\twait for payment\t7d573b6b-b248-477a-99af-440d75a2b64e\t
9\t\txskasensio\tedvan vio fradhastya\t901148283634\tSEABANK\tLGBDT-MW970793\t019f9567-8e63-72f6-a269-a3a3c20661a1\t2026-07-25 01:33:40\t-\t150,000.00\twait for payment\t54d26f06-d131-48ea-9f91-819448516822\t
10\t\tpeddas27\tRIDHO MARUF\t7365810723\tBSI\tLGBDT-MW970791\t-\t2026-07-25 01:33:23\t-\t454,000.00\twait for payment\t7302cd23-e80b-4eb9-972f-f1424cc7ce23\t
11\t\tlilkid\tAimar Zufar Fauzan\t2040509472\tBCA\tLGBDT-MW970789\t-\t2026-07-25 01:33:06\t-\t200,000.00\twait for payment\teaed6956-79eb-4aaa-981c-c3e5caaab9a5\t
12\t\teriz33\tErik estrada\t1590000990357\tMANDIRI\tLGBDT-MW970782\t019f9566-9f3b-71e1-bb0b-f33056c7fa8a\t2026-07-25 01:32:38\t-\t760,000.00\twait for payment\t9c9d88b4-084d-47a5-9d32-a76de0c749e1\t
13\t\tsatset777\tHendricus marlona beny h\t50665469844\tBCA\tLGBDT-MW969957\t019f951d-1dc6-7363-b799-958f54d29e25\t2026-07-25 00:12:21\t-\t100,000.00\twait for payment\tb530f474-b84d-4e1b-bd3b-8afb06ab0ca0`;
    
    setRawText(sample);
    const parsed = parseRawText(sample);
    setItems(parsed);
    showToast('Contoh data berhasil dimuat & diproses!', 'success');
  };

  // Clear / Reset input fields
  const handleClear = () => {
    setRawText('');
    setRawUserIds('');
    setRawTransferRefs('');
    setRawNominals('');
    setItems([]);
    showToast('Data masukan berhasil dikosongkan', 'info');
  };

  // Reset EVERYTHING to original defaults
  const handleResetAll = () => {
    setInfoText('LIGABANDOT');
    setTokoText('SMB4');
    setPerihalText('Transaksi AutoWd Minera Pending');
    setKeteranganText('Untuk Saat ini Terdapat Transaksi Pengiriman Dana AutoWd Minera  Yang sedang dalam status pending ya ko/ci dan pada admin antrian penarikan tersebut ter hold sehingga tidak sesuai durasi, prihal ini akan di cek secara berkala dan menunggu keputusan final dari pihak MINERA');
    setProvider('MINERA');
    setRawText('');
    setRawUserIds('');
    setRawTransferRefs('');
    setRawNominals('');
    setItems([]);
    setFormatMode('standard');

    localStorage.removeItem('pending_wd_raw_text');
    localStorage.removeItem('pending_wd_raw_userids');
    localStorage.removeItem('pending_wd_raw_refs');
    localStorage.removeItem('pending_wd_raw_nominals');
    localStorage.removeItem('pending_wd_items');
    localStorage.removeItem('pending_wd_info');
    localStorage.removeItem('pending_wd_toko');
    localStorage.removeItem('pending_wd_perihal');
    localStorage.removeItem('pending_wd_keterangan');

    showToast('Seluruh data laporan WD Pending berhasil di-reset ke setelan awal!', 'info');
  };

  // Delete single item
  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    showToast('Data dihapus', 'info');
  };

  // Total Nominal calculation
  const totalNominal = useMemo(() => {
    return items.reduce((acc, curr) => acc + curr.nominalNum, 0);
  }, [items]);

  // Formatted Output Generator
  const formattedReportText = useMemo(() => {
    let text = `Info : ${infoText}\n`;
    text += `Perihal : ${perihalText}\n`;
    text += `TOKO : ${tokoText}\n\n`;

    if (formatMode === 'itemized') {
      items.forEach((item, idx) => {
        const cleanNominal = item.nominal.endsWith('.00') ? item.nominal.slice(0, -3) : item.nominal;
        text += `User id : ${item.userId}\n`;
        text += `Transfer Ref : ${item.transferRef}\n`;
        text += `Nominal : ${cleanNominal}\n`;
        if (idx < items.length - 1) {
          text += `\n`;
        }
      });
    } else if (formatMode === 'standard') {
      text += `User id :\n`;
      items.forEach(item => {
        text += `${item.userId}\n`;
      });

      text += `\nTransfer Ref :\n`;
      items.forEach(item => {
        text += `${item.transferRef}\n`;
      });

      text += `\nNominal \n`;
      items.forEach(item => {
        text += `${item.nominal}\n`;
      });
    } else if (formatMode === 'numbered') {
      text += `User id :\n`;
      items.forEach((item, idx) => {
        text += `${idx + 1}. ${item.userId}\n`;
      });

      text += `\nTransfer Ref :\n`;
      items.forEach((item, idx) => {
        text += `${idx + 1}. ${item.transferRef}\n`;
      });

      text += `\nNominal \n`;
      items.forEach((item, idx) => {
        text += `${idx + 1}. ${item.nominal}\n`;
      });
    } else if (formatMode === 'inline') {
      text += `User id : ${items.map(i => i.userId).join(', ')}\n\n`;
      text += `Transfer Ref : ${items.map(i => i.transferRef).join(', ')}\n\n`;
      text += `Nominal : ${items.map(i => i.nominal).join(', ')}\n`;
    } else if (formatMode === 'detailed') {
      text += `Daftar Transaksi Pending (${items.length} Data):\n`;
      items.forEach((item, idx) => {
        text += `${idx + 1}. ${item.userId} | Ref: ${item.transferRef} | Bank: ${item.bankName} | Nominal: Rp ${item.nominal}\n`;
      });
      text += `\nTotal Nominal: Rp ${totalNominal.toLocaleString('id-ID')}\n`;
    }

    text += `\nKeterangan :\n`;
    text += `${keteranganText}`;

    return text;
  }, [infoText, perihalText, tokoText, keteranganText, items, formatMode, totalNominal]);

  // Copy to Clipboard
  const handleCopy = () => {
    if (items.length === 0) {
      showToast('Tidak ada data untuk disalin!', 'error');
      return;
    }
    navigator.clipboard.writeText(formattedReportText).then(() => {
      setCopied(true);
      showToast('Laporan WD Pending berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error(err);
      showToast('Gagal menyalin laporan', 'error');
    });
  };

  // Open WhatsApp with text
  const handleShareWhatsApp = () => {
    if (items.length === 0) {
      showToast('Tidak ada data untuk dibagikan!', 'error');
      return;
    }
    const url = `https://wa.me/?text=${encodeURIComponent(formattedReportText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-[#0d1222] via-[#141b32] to-[#0f172a] p-6 rounded-2xl border border-amber-500/20 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl text-white shadow-lg shadow-amber-500/20">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-white tracking-wide uppercase">
                  Shortcut Laporan WD Pending
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  MINERA & PAY2ME
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-medium">
                Satu kali tempel data tabel WD pending, otomatis tersusun rapi siap kirim ke grup!
              </p>
            </div>
          </div>

          {/* Quick Preset Buttons & Reset Button */}
          <div className="flex flex-wrap items-center gap-2 bg-[#060913]/80 p-1.5 rounded-xl border border-white/10 shrink-0">
            <button
              type="button"
              onClick={() => handleSelectProvider('MINERA')}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                provider === 'MINERA'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>MINERA</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectProvider('PAY2ME')}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                provider === 'PAY2ME'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Zap className="h-3.5 w-3.5" />
              <span>PAY2ME</span>
            </button>
            <button
              type="button"
              onClick={() => handleSelectProvider('CUSTOM')}
              className={`px-3.5 py-2 rounded-lg text-xs font-extrabold tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                provider === 'CUSTOM'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              <span>CUSTOM</span>
            </button>
            <div className="h-4 w-px bg-white/10 mx-1 hidden sm:block" />
            <button
              type="button"
              onClick={handleResetAll}
              title="Reset seluruh data dan setelan ke kondisi awal"
              className="px-3.5 py-2 rounded-lg text-xs font-extrabold tracking-wider bg-rose-500/10 text-rose-300 border border-rose-500/30 hover:bg-rose-500 hover:text-white transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset Semua</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Input & Header Settings vs Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Input Controls & Raw Data Area (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Section 1: Template Headers */}
          <div className="bg-[#0b0f19] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                <InfoIcon className="h-4 w-4" />
                <span>Pengaturan Header Laporan</span>
              </h3>
              <span className="text-[10px] text-slate-400 font-mono">Preset: {provider}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Info Website Dropdown + Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                  <span>Info Website</span>
                  <span className="text-[9px] text-amber-400/80 font-normal">Pilih / Ketik</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    onChange={(e) => {
                      if (e.target.value !== 'CUSTOM') {
                        setInfoText(e.target.value);
                      }
                    }}
                    value={['LIGABANDOT', 'LIGACAPSA', 'LIGAMACAU', 'LIGASLOT', 'LIGATOTO', 'LIGAMINI', 'LIGA365', 'LIGA303'].includes(infoText) ? infoText : 'CUSTOM'}
                    className="w-full bg-[#060913] border border-white/10 rounded-xl px-3 py-2 text-xs text-amber-300 focus:outline-none focus:border-amber-500/50 font-semibold cursor-pointer"
                  >
                    <option value="LIGABANDOT">LIGABANDOT</option>
                    <option value="LIGACAPSA">LIGACAPSA</option>
                    <option value="LIGAMACAU">LIGAMACAU</option>
                    <option value="LIGASLOT">LIGASLOT</option>
                    <option value="LIGATOTO">LIGATOTO</option>
                    <option value="LIGAMINI">LIGAMINI</option>
                    <option value="LIGA365">LIGA365</option>
                    <option value="LIGA303">LIGA303</option>
                    <option value="CUSTOM">✏️ Custom / Ketik Manual</option>
                  </select>
                  <input
                    type="text"
                    value={infoText}
                    onChange={(e) => setInfoText(e.target.value)}
                    className="w-full bg-[#060913] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 font-semibold"
                    placeholder="Contoh: LIGABANDOT"
                  />
                </div>
              </div>

              {/* TOKO / Merchant Dropdown + Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                  <span>TOKO / Merchant</span>
                  <span className="text-[9px] text-amber-400/80 font-normal">Pilih / Ketik</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    onChange={(e) => {
                      if (e.target.value !== 'CUSTOM') {
                        setTokoText(e.target.value);
                      }
                    }}
                    value={['SMB4', 'SMB1', 'SMB2', 'SMB3', 'SMB5', 'SMB6', 'SMB7', 'SMB8', 'LIGA1', 'LIGA2', 'LIGA3'].includes(tokoText) ? tokoText : 'CUSTOM'}
                    className="w-full bg-[#060913] border border-white/10 rounded-xl px-3 py-2 text-xs text-emerald-300 focus:outline-none focus:border-amber-500/50 font-semibold cursor-pointer"
                  >
                    <option value="SMB4">SMB4</option>
                    <option value="SMB1">SMB1</option>
                    <option value="SMB2">SMB2</option>
                    <option value="SMB3">SMB3</option>
                    <option value="SMB5">SMB5</option>
                    <option value="SMB6">SMB6</option>
                    <option value="SMB7">SMB7</option>
                    <option value="SMB8">SMB8</option>
                    <option value="LIGA1">LIGA1</option>
                    <option value="LIGA2">LIGA2</option>
                    <option value="LIGA3">LIGA3</option>
                    <option value="CUSTOM">✏️ Custom / Ketik Manual</option>
                  </select>
                  <input
                    type="text"
                    value={tokoText}
                    onChange={(e) => setTokoText(e.target.value)}
                    className="w-full bg-[#060913] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 font-semibold"
                    placeholder="Contoh: SMB4"
                  />
                </div>
              </div>

              {/* Perihal Dropdown + Input */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center justify-between">
                  <span>Perihal Laporan</span>
                  <span className="text-[9px] text-amber-400/80 font-normal">Pilih / Ketik</span>
                </label>
                <div className="space-y-1.5">
                  <select
                    onChange={(e) => {
                      if (e.target.value !== 'CUSTOM') {
                        setPerihalText(e.target.value);
                      }
                    }}
                    value={[
                      'Transaksi AutoWd Minera Pending',
                      'Transaksi AutoWd PAY2ME Pending',
                      'Transaksi AutoWd WINPAY Pending',
                      'Transaksi WD Pending Manual',
                      'Laporan Pending QRIS / E-Wallet'
                    ].includes(perihalText) ? perihalText : 'CUSTOM'}
                    className="w-full bg-[#060913] border border-white/10 rounded-xl px-3 py-2 text-xs text-indigo-300 focus:outline-none focus:border-amber-500/50 font-semibold cursor-pointer"
                  >
                    <option value="Transaksi AutoWd Minera Pending">Transaksi AutoWd Minera Pending</option>
                    <option value="Transaksi AutoWd PAY2ME Pending">Transaksi AutoWd PAY2ME Pending</option>
                    <option value="Transaksi AutoWd WINPAY Pending">Transaksi AutoWd WINPAY Pending</option>
                    <option value="Transaksi WD Pending Manual">Transaksi WD Pending Manual</option>
                    <option value="Laporan Pending QRIS / E-Wallet">Laporan Pending QRIS / E-Wallet</option>
                    <option value="CUSTOM">✏️ Custom / Ketik Manual</option>
                  </select>
                  <input
                    type="text"
                    value={perihalText}
                    onChange={(e) => setPerihalText(e.target.value)}
                    className="w-full bg-[#060913] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 font-semibold"
                    placeholder="Contoh: Transaksi AutoWd Minera Pending"
                  />
                </div>
              </div>
            </div>

            {/* Keterangan Template Dropdown + Textarea */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Pesan Keterangan
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400 font-medium">Pilih Template Keterangan:</span>
                  <select
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'MINERA') {
                        setKeteranganText('Untuk Saat ini Terdapat Transaksi Pengiriman Dana AutoWd Minera  Yang sedang dalam status pending ya ko/ci dan pada admin antrian penarikan tersebut ter hold sehingga tidak sesuai durasi, prihal ini akan di cek secara berkala dan menunggu keputusan final dari pihak MINERA');
                      } else if (val === 'PAY2ME') {
                        setKeteranganText('Untuk Saat ini Terdapat Transaksi Pengiriman Dana AutoWd PAY2ME Yang sedang dalam status pending ya ko/ci dan pada admin antrian penarikan tersebut ter hold sehingga tidak sesuai durasi, prihal ini akan di cek secara berkala dan menunggu keputusan final dari pihak PAY2ME');
                      } else if (val === 'WINPAY') {
                        setKeteranganText('Untuk Saat ini Terdapat Transaksi Pengiriman Dana AutoWd WINPAY Yang sedang dalam status pending ya ko/ci dan pada admin antrian penarikan tersebut ter hold sehingga tidak sesuai durasi, prihal ini akan di cek secara berkala dan menunggu keputusan final dari pihak WINPAY');
                      } else if (val === 'GANGGUAN') {
                        setKeteranganText('Terjadi antrian penarikan dana pending otomatis dikarenakan adanya pemeliharaan / gangguan jaringan merchant perbankan. Tim kami terus memantau dan memproses data secara berkala.');
                      } else if (val === 'CLEAR') {
                        setKeteranganText('');
                      }
                    }}
                    className="bg-[#060913] border border-amber-500/30 rounded-lg px-2.5 py-1 text-[11px] text-amber-300 focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
                  >
                    <option value="">-- Pilih Dropdown Template Keterangan --</option>
                    <option value="MINERA">📋 Template MINERA (Default)</option>
                    <option value="PAY2ME">⚡ Template PAY2ME</option>
                    <option value="WINPAY">💎 Template WINPAY</option>
                    <option value="GANGGUAN">⚠️ Template Gangguan Perbankan</option>
                    <option value="CLEAR">❌ Kosongkan Keterangan</option>
                  </select>
                </div>
              </div>
              <textarea
                value={keteranganText}
                onChange={(e) => setKeteranganText(e.target.value)}
                rows={3}
                className="w-full bg-[#060913] border border-white/10 rounded-xl p-3 text-xs text-slate-300 focus:outline-none focus:border-amber-500/50 leading-relaxed resize-none"
                placeholder="Isi pesan keterangan untuk laporan..."
              />
            </div>
          </div>

          {/* Section 2: Raw Data Input Textarea / Separated Columns */}
          <div className="bg-[#0b0f19] border border-white/10 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Input Data Transaksi WD Pending
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleLoadSample}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Isi Contoh Data</span>
                </button>
                {(rawText || rawUserIds || rawTransferRefs || rawNominals) && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="px-2.5 py-1 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 text-[10px] font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>
            </div>

            {/* Input Mode Selector Tabs */}
            <div className="flex items-center gap-2 p-1 bg-[#060913] rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setInputTab('table')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  inputTab === 'table'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Tempel Tabel Sekaligus</span>
              </button>
              <button
                type="button"
                onClick={() => setInputTab('separated')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  inputTab === 'separated'
                    ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span>Tempel 3 Kolom Terpisah</span>
              </button>
            </div>

            {inputTab === 'table' ? (
              <div className="space-y-2">
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Copy seluruh tabel dari admin / excel lalu paste langsung di bawah ini. Sistem akan otomatis mendeteksi <strong className="text-amber-300">User ID</strong>, <strong className="text-amber-300">Transfer Ref</strong>, dan <strong className="text-amber-300">Nominal</strong>!
                </p>

                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={8}
                  className="w-full bg-[#060913] border border-white/10 rounded-xl p-3.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500/50 leading-relaxed resize-y"
                  placeholder={`Contoh tempel data sekaligus:\n1\tmomonita200\tChrismonita Agustin\t901906287056\tSEABANK\tLGBDT-MW971880\t200,000.00\n2\tningkan\tRusli\t6282184062274\tDANA\tLGBDT-MW970977\t50,000.00`}
                />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                  Tempelkan masing-masing data secara terpisah per-baris pada 3 kotak di bawah ini (User ID, Transfer Ref/Order ID, Nominal):
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">
                      1. User ID (List)
                    </label>
                    <textarea
                      value={rawUserIds}
                      onChange={(e) => setRawUserIds(e.target.value)}
                      rows={8}
                      className="w-full bg-[#060913] border border-white/10 rounded-xl p-2.5 text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-500/50 leading-relaxed resize-none"
                      placeholder={`momonita200\nningkan\nrosidin33\nkajol06`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1">
                      2. Transfer Ref / Order ID
                    </label>
                    <textarea
                      value={rawTransferRefs}
                      onChange={(e) => setRawTransferRefs(e.target.value)}
                      rows={8}
                      className="w-full bg-[#060913] border border-white/10 rounded-xl p-2.5 text-xs font-mono text-indigo-200 focus:outline-none focus:border-amber-500/50 leading-relaxed resize-none"
                      placeholder={`LGBDT-MW971880\nLGBDT-MW970977\nLGBDT-MW970948\nLGBDT-MW970933`}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">
                      3. Nominal
                    </label>
                    <textarea
                      value={rawNominals}
                      onChange={(e) => setRawNominals(e.target.value)}
                      rows={8}
                      className="w-full bg-[#060913] border border-white/10 rounded-xl p-2.5 text-xs font-mono text-emerald-200 focus:outline-none focus:border-amber-500/50 leading-relaxed resize-none"
                      placeholder={`200,000.00\n50,000.00\n50,000.00\n251,000.00`}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-400 font-mono">
                {items.length > 0 ? `Status: ${items.length} Data Terproses` : 'Siap memproses data'}
              </span>

              <button
                type="button"
                onClick={handleProcessInput}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer flex items-center gap-2"
              >
                <Zap className="h-4 w-4" />
                <span>Proses & Susun Data</span>
              </button>
            </div>
          </div>

          {/* Section 3: Parsed Items Preview Table */}
          {items.length > 0 && (
            <div className="bg-[#0b0f19] border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    Hasil Ekstraksi Data ({items.length} User)
                  </h3>
                </div>
                <span className="text-xs font-black text-amber-400 font-mono">
                  Total: Rp {totalNominal.toLocaleString('id-ID')}
                </span>
              </div>

              <div className="overflow-x-auto max-h-72 overflow-y-auto rounded-xl border border-white/5">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#060913] text-slate-400 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 border-b border-white/10">
                    <tr>
                      <th className="p-2.5 text-center w-10">No</th>
                      <th className="p-2.5">User ID</th>
                      <th className="p-2.5">Bank</th>
                      <th className="p-2.5">Transfer Ref</th>
                      <th className="p-2.5 text-right">Nominal</th>
                      <th className="p-2.5 text-center w-10">#</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-slate-300 font-mono text-[11px]">
                    {items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition">
                        <td className="p-2.5 text-center text-slate-500 font-bold">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-amber-300">{item.userId}</td>
                        <td className="p-2.5 text-slate-300">{item.bankName}</td>
                        <td className="p-2.5 text-indigo-300 font-semibold">{item.transferRef}</td>
                        <td className="p-2.5 text-right font-bold text-emerald-400">{item.nominal}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-slate-500 hover:text-rose-400 p-1 rounded transition"
                            title="Hapus baris"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>

        {/* Right Column: Live Formatted Report & Action Buttons (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          
          <div className="bg-[#0b0f19] border border-amber-500/20 rounded-2xl p-5 space-y-4 sticky top-24 shadow-2xl">
            
            {/* Header with Copy Action */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <h3 className="text-xs font-extrabold text-white uppercase tracking-wider">
                  Hasil Susunan Laporan WD
                </h3>
              </div>

              <span className="text-[10px] font-bold text-slate-400 uppercase">
                {items.length} Items
              </span>
            </div>

            {/* Layout Mode Selector */}
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Format Tampilan Laporan
              </label>
              <div className="grid grid-cols-2 gap-1.5 bg-[#060913] p-1 rounded-xl border border-white/5">
                <button
                  type="button"
                  onClick={() => setFormatMode('itemized')}
                  className={`col-span-2 py-2 px-2.5 rounded-lg text-xs font-black uppercase transition cursor-pointer flex items-center justify-center gap-1.5 ${
                    formatMode === 'itemized' 
                      ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20' 
                      : 'bg-white/5 text-amber-300 hover:bg-white/10'
                  }`}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>Format Per-User (Sesuai Gambar)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormatMode('standard')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                    formatMode === 'standard' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Group List
                </button>
                <button
                  type="button"
                  onClick={() => setFormatMode('numbered')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                    formatMode === 'numbered' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Penomoran (1, 2, 3)
                </button>
                <button
                  type="button"
                  onClick={() => setFormatMode('inline')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                    formatMode === 'inline' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Inline (Koma)
                </button>
                <button
                  type="button"
                  onClick={() => setFormatMode('detailed')}
                  className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase transition cursor-pointer ${
                    formatMode === 'detailed' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rincian Per-Row
                </button>
              </div>
            </div>

            {/* Preview Box */}
            <div className="relative group">
              <pre className="w-full bg-[#060913] border border-white/10 rounded-xl p-4 text-xs font-mono text-slate-200 whitespace-pre-wrap break-words leading-relaxed max-h-[460px] overflow-y-auto selection:bg-amber-500/30">
                {items.length > 0 ? formattedReportText : (
                  <span className="text-slate-500 italic">
                    Tempel data transaksi WD pending di sebelah kiri untuk melihat pratinjau hasil susunan laporan di sini...
                  </span>
                )}
              </pre>

              {items.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopy}
                  className="absolute top-3 right-3 p-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 rounded-lg backdrop-blur-md transition cursor-pointer"
                  title="Salin Teks"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                </button>
              )}
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleCopy}
                disabled={items.length === 0}
                className={`w-full py-3 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shadow-xl ${
                  items.length > 0
                    ? 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-amber-500/20 active:scale-[0.99]'
                    : 'bg-slate-800/50 text-slate-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-950" />
                    <span>BERHASIL DISALIN!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>SALIN LAPORAN (COPY TO CLIPBOARD)</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                disabled={items.length === 0}
                className={`w-full py-2.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 border ${
                  items.length > 0
                    ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30'
                    : 'bg-slate-900/30 text-slate-600 border-white/5 cursor-not-allowed'
                }`}
              >
                <Send className="h-4 w-4" />
                <span>Kirim Langsung ke WhatsApp</span>
              </button>
            </div>

            {/* Summary Info Footer */}
            {items.length > 0 && (
              <div className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span>Total: <strong className="text-white">{items.length} Transaksi</strong></span>
                <span>Nominal: <strong className="text-emerald-400">Rp {totalNominal.toLocaleString('id-ID')}</strong></span>
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}
