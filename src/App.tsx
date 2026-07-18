import { useState, useEffect, useMemo, useRef, FormEvent } from 'react';
import { 
  Building2, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Share2, 
  Filter, 
  RotateCcw, 
  FileText, 
  CheckSquare, 
  Square, 
  User, 
  CreditCard, 
  Info,
  Clock,
  ChevronRight,
  AlertCircle,
  Shield,
  Eye,
  Key,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Bank, BankStatus } from './types';
import FollowUpReport from './components/FollowUpReport';
import EditBankModal from './components/EditBankModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import HistoryPanel from './components/HistoryPanel';
import AccessDenied from './components/AccessDenied';
import logoLigabandot from './assets/images/logo_ligabandot_1784364723911.jpg';

export default function App() {
  // Roles state
  const [role, setRole] = useState<'admin' | 'viewer'>(() => {
    const params = new URLSearchParams(window.location.search);
    const urlRole = params.get('role');
    if (urlRole === 'admin' || urlRole === 'viewer') {
      return urlRole;
    }
    const saved = localStorage.getItem('bank_status_user_role');
    return (saved === 'admin' || saved === 'viewer') ? saved : 'admin';
  });

  // Save role to local storage
  useEffect(() => {
    localStorage.setItem('bank_status_user_role', role);
  }, [role]);

  // Database states
  const [banks, setBanks] = useState<Bank[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dbStatus, setDbStatus] = useState<{ configured: boolean; spreadsheetId: string | null } | null>(null);

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEditBank, setSelectedEditBank] = useState<Bank | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDeleteBank, setSelectedDeleteBank] = useState<Bank | null>(null);

  const [showAccessDenied, setShowAccessDenied] = useState(false);

  // Toast status notification
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' | 'loading' } | null>(null);

  // Clock state
  const [currentTime, setCurrentTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch Connection Status & Banks
  const fetchDbStatus = async () => {
    try {
      const res = await fetch('/api/sheets-status');
      if (res.ok) {
        const data = await res.json();
        setDbStatus(data);
      }
    } catch (e) {
      console.error('Failed to fetch sheets-status', e);
    }
  };

  const fetchBanks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/banks');
      if (res.ok) {
        const data = await res.json();
        setBanks(data);
      } else {
        throw new Error('Response not OK');
      }
    } catch (e) {
      console.error('Failed to fetch banks', e);
      showToast('Gagal memuat data bank dari server. Menggunakan database lokal.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDbStatus();
    fetchBanks();
  }, []);

  // Check URL query direct access simulation for edit / role
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const editId = params.get('edit') || (window.location.hash.startsWith('#/edit/') ? window.location.hash.split('#/edit/')[1] : null);
    
    if (editId) {
      if (role === 'viewer') {
        setShowAccessDenied(true);
      } else if (banks.length > 0) {
        const found = banks.find(b => b.id === editId);
        if (found) {
          setSelectedEditBank(found);
          setIsEditOpen(true);
        } else {
          showToast(`Bank dengan ID ${editId} tidak ditemukan`, 'error');
        }
      }
    }
  }, [banks, role]);

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'monitor' | 'followup' | 'history'>(() => {
    const saved = localStorage.getItem('bank_status_active_tab');
    if (saved === 'monitor' || saved === 'followup' || saved === 'history') {
      return saved;
    }
    return 'monitor';
  });

  // Save active tab state
  useEffect(() => {
    localStorage.setItem('bank_status_active_tab', activeTab);
  }, [activeTab]);

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
  const [followUpItems, setFollowUpItems] = useState<any[]>(() => {
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

  // Activity Log
  const [logs, setLogs] = useState<{ id: string; time: string; message: string; type: 'info' | 'success' | 'warning' | 'danger' }[]>(() => {
    const saved = localStorage.getItem('bank_status_activity_logs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return [
      { id: 'log-1', time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }), message: 'Sistem monitoring bank diaktifkan.', type: 'info' },
    ];
  });

  useEffect(() => {
    localStorage.setItem('bank_status_activity_logs', JSON.stringify(logs));
  }, [logs]);

  const addLog = (message: string, type: 'info' | 'success' | 'warning' | 'danger' = 'info') => {
    const newLog = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev].slice(0, 15));
  };

  // Form states (Add Bank form)
  const [formName, setFormName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formAccountName, setFormAccountName] = useState('');
  const [formStatus, setFormStatus] = useState<BankStatus>('Aman');
  const [formNotes, setFormNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmittingNewBank, setIsSubmittingNewBank] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatuses, setSelectedStatuses] = useState<Record<BankStatus, boolean>>({
    'Aman': true,
    'RTP': true,
    'Off Sementara': true,
    'Cabut Kas 1': true,
  });
  const [showAllFilter, setShowAllFilter] = useState(true);

  // Copy status indicators
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  // Scroll targets
  const formRef = useRef<HTMLDivElement>(null);

  // Status visual styles for dark mode
  const statusStyles: Record<BankStatus, { bg: string, text: string, dot: string, border: string, badgeBg: string, glowClass: string }> = {
    'Aman': {
      bg: 'bg-emerald-950/15 hover:bg-emerald-950/25',
      text: 'text-emerald-400',
      dot: '🟢',
      border: 'border-emerald-500/20 focus-within:ring-emerald-500/30',
      badgeBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
      glowClass: 'shadow-[0_0_20px_rgba(16,185,129,0.06)]'
    },
    'RTP': {
      bg: 'bg-amber-950/15 hover:bg-amber-950/25',
      text: 'text-amber-400',
      dot: '🟡',
      border: 'border-amber-500/20 focus-within:ring-amber-500/30',
      badgeBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
      glowClass: 'shadow-[0_0_20px_rgba(245,158,11,0.06)]'
    },
    'Off Sementara': {
      bg: 'bg-orange-950/15 hover:bg-orange-950/25',
      text: 'text-orange-400',
      dot: '🟠',
      border: 'border-orange-500/20 focus-within:ring-orange-500/30',
      badgeBg: 'bg-orange-500/10 text-orange-400 border border-orange-500/20 shadow-[0_0_10px_rgba(249,115,22,0.1)]',
      glowClass: 'shadow-[0_0_20px_rgba(249,115,22,0.06)]'
    },
    'Cabut Kas 1': {
      bg: 'bg-rose-950/15 hover:bg-rose-950/25',
      text: 'text-rose-400',
      dot: '🔴',
      border: 'border-rose-500/20 focus-within:ring-rose-500/30',
      badgeBg: 'bg-rose-500/10 text-rose-400 border border-rose-500/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]',
      glowClass: 'shadow-[0_0_20px_rgba(239,68,68,0.06)]'
    }
  };

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'loading' = 'success') => {
    setToast({ message, type });
    if (type !== 'loading') {
      setTimeout(() => {
        setToast(prev => prev?.message === message ? null : prev);
      }, 3500);
    }
  };

  // Reset Add form
  const resetForm = () => {
    setFormName('');
    setFormAccountNumber('');
    setFormAccountName('');
    setFormStatus('Aman');
    setFormNotes('');
    setFormError('');
  };

  // Add new Bank
  const handleAddBank = async (e: FormEvent) => {
    e.preventDefault();
    if (role === 'viewer') {
      setShowAccessDenied(true);
      return;
    }

    if (!formName.trim()) {
      setFormError('Nama Bank wajib diisi');
      return;
    }
    if (!formAccountNumber.trim()) {
      setFormError('Nomor Rekening wajib diisi');
      return;
    }
    if (!formAccountName.trim()) {
      setFormError('Nama Rekening wajib diisi');
      return;
    }

    setIsSubmittingNewBank(true);
    setFormError('');
    const uppercaseName = formName.trim().toUpperCase();
    const uppercaseAccountName = formAccountName.trim().toUpperCase();

    const newBank: Bank = {
      id: `bank-${Date.now()}`,
      name: uppercaseName,
      accountNumber: formAccountNumber.trim(),
      accountName: uppercaseAccountName,
      status: formStatus,
      notes: formNotes.trim(),
      updatedAt: new Date().toISOString()
    };

    // Optimistic Update
    setBanks(prev => [...prev, newBank]);
    showToast('Menyimpan data bank...', 'loading');

    try {
      const res = await fetch('/api/banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'alfareizylubis90@gmail.com'
        },
        body: JSON.stringify(newBank)
      });

      if (!res.ok) throw new Error('Gagal menyimpan ke Google Spreadsheet');

      addLog(`Menambahkan bank baru ${uppercaseName} dengan status ${formStatus}`, 'success');
      showToast('Data berhasil disimpan.', 'success');
      resetForm();
    } catch (err: any) {
      console.error(err);
      showToast('Gagal menyimpan ke Google Spreadsheet. Perubahan disimpan lokal.', 'error');
    } finally {
      setIsSubmittingNewBank(false);
    }
  };

  // Handle Edit Save from Modal
  const handleSaveEditBank = async (updatedFields: Partial<Bank>) => {
    if (role === 'viewer') {
      setShowAccessDenied(true);
      return;
    }
    if (!selectedEditBank) return;

    const oldStatus = selectedEditBank.status;
    const targetId = selectedEditBank.id;

    // Optimistic Update
    setBanks(prev => prev.map(bank => bank.id === targetId ? { ...bank, ...updatedFields, updatedAt: new Date().toISOString() } : bank));
    showToast('Memperbarui data bank...', 'loading');

    try {
      const res = await fetch(`/api/banks/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'alfareizylubis90@gmail.com'
        },
        body: JSON.stringify(updatedFields)
      });

      if (!res.ok) throw new Error('Gagal memperbarui di Google Spreadsheet');

      addLog(`Mengubah bank ${updatedFields.name} menjadi ${updatedFields.status}`, 'info');
      showToast('Data berhasil diperbarui.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal sinkronisasi Spreadsheet. Perubahan disimpan lokal.', 'error');
    }
  };

  // Handle Quick Status Change from Action Bar
  const handleQuickStatusChange = async (id: string, newStatus: BankStatus) => {
    if (role === 'viewer') {
      setShowAccessDenied(true);
      return;
    }

    const bankToUpdate = banks.find(b => b.id === id);
    if (!bankToUpdate) return;

    // Optimistic Update
    setBanks(prev => prev.map(bank => bank.id === id ? { ...bank, status: newStatus, updatedAt: new Date().toISOString() } : bank));
    showToast('Mengubah status...', 'loading');

    try {
      const res = await fetch(`/api/banks/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'alfareizylubis90@gmail.com'
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Gagal memperbarui di Google Spreadsheet');

      addLog(`Ubah status cepat ${bankToUpdate.name} ➜ ${newStatus}`, newStatus === 'Aman' ? 'success' : newStatus === 'Cabut Kas 1' ? 'danger' : 'warning');
      showToast(`Status ${bankToUpdate.name} diubah menjadi ${newStatus}.`, 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal memperbarui di Google Spreadsheet. Perubahan disimpan lokal.', 'error');
    }
  };

  // Handle Delete Confirmation from Modal
  const handleConfirmDeleteBank = async () => {
    if (role === 'viewer') {
      setShowAccessDenied(true);
      return;
    }
    if (!selectedDeleteBank) return;

    const targetId = selectedDeleteBank.id;
    const bankName = selectedDeleteBank.name;

    // Optimistic Update
    setBanks(prev => prev.filter(bank => bank.id !== targetId));
    showToast('Menghapus data bank...', 'loading');

    try {
      const res = await fetch(`/api/banks/${targetId}`, {
        method: 'DELETE',
        headers: {
          'x-user-email': 'alfareizylubis90@gmail.com'
        }
      });

      if (!res.ok) throw new Error('Gagal menghapus di Google Spreadsheet');

      addLog(`Menghapus data bank ${bankName}`, 'danger');
      showToast('Data berhasil dihapus.', 'success');
    } catch (err: any) {
      console.error(err);
      showToast('Gagal sinkronisasi Spreadsheet. Perubahan dihapus lokal.', 'error');
    }
  };

  // Copy individual Account number
  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  };

  // Dynamic counter computation
  const counters = useMemo(() => {
    const counts = { 'Aman': 0, 'RTP': 0, 'Off Sementara': 0, 'Cabut Kas 1': 0 };
    banks.forEach(bank => {
      if (counts[bank.status] !== undefined) {
        counts[bank.status]++;
      }
    });
    return counts;
  }, [banks]);

  // Handle individual status filter checkbox
  const handleStatusFilterChange = (status: BankStatus) => {
    const updated = { ...selectedStatuses, [status]: !selectedStatuses[status] };
    setSelectedStatuses(updated);
    const allChecked = Object.values(updated).every(val => val === true);
    setShowAllFilter(allChecked);
  };

  // Handle "Semua" checkbox filter change
  const handleSelectAllChange = () => {
    const targetState = !showAllFilter;
    setShowAllFilter(targetState);
    setSelectedStatuses({
      'Aman': targetState,
      'RTP': targetState,
      'Off Sementara': targetState,
      'Cabut Kas 1': targetState,
    });
  };

  // Filtered banks calculation
  const filteredBanks = useMemo(() => {
    return banks.filter(bank => {
      const matchesSearch = 
        bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bank.accountNumber.includes(searchQuery) ||
        bank.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bank.notes && bank.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = selectedStatuses[bank.status];
      return matchesSearch && matchesStatus;
    });
  }, [banks, searchQuery, selectedStatuses]);

  // Pre-formatted WhatsApp Template generator
  const formattedStatusText = useMemo(() => {
    let result = '';
    result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    result += `        💳 BANK STATUS\n`;
    result += `     Monitoring Operasional Bank\n`;
    result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    result += `🟢 Aman : ${counters.Aman} Bank\n`;
    result += `🟡 RTP : ${counters.RTP} Bank\n`;
    result += `🟠 Off Sementara : ${counters['Off Sementara']} Bank\n`;
    result += `🔴 Cabut Kas 1 : ${counters['Cabut Kas 1']} Bank\n\n`;
    result += `───────────────────────────────\n\n`;

    banks.forEach((bank, idx) => {
      const dot = bank.status === 'Aman' ? '🟢' :
                  bank.status === 'RTP' ? '🟡' :
                  bank.status === 'Off Sementara' ? '🟠' : '🔴';
      
      let defaultKeterangan = '';
      if (bank.status === 'Cabut Kas 1') {
        defaultKeterangan = 'tidak bisa digunakan lagi';
      } else if (bank.status === 'RTP') {
        defaultKeterangan = 'TERLOGOUT / RTP';
      } else if (bank.status === 'Off Sementara') {
        defaultKeterangan = 'jangan isi saldo ke sini';
      } else {
        defaultKeterangan = 'masih bisa digunakan';
      }

      const finalKeterangan = bank.notes ? `${defaultKeterangan}. ${bank.notes}` : defaultKeterangan;
      
      result += `🏦 ${bank.name}\n`;
      result += `Status : ${dot} ${bank.status}\n`;
      result += `No. Rek : ${bank.accountNumber} (${bank.accountName})\n`;
      result += `Keterangan : ${finalKeterangan}\n`;
      if (idx < banks.length - 1) {
        result += `\n`;
      }
    });

    return result;
  }, [banks, counters]);

  // Copy full WA template
  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(formattedStatusText).then(() => {
      setCopiedTemplate(true);
      showToast('Template laporan disalin ke clipboard!', 'success');
      setTimeout(() => setCopiedTemplate(false), 2500);
    }).catch(err => {
      console.error('Failed to copy template: ', err);
    });
  };

  const quickBanks = ['BCA', 'MANDIRI', 'BRI', 'BNI', 'DANAMON', 'CIMB', 'PERMATA'];

  // Render 403 access denied if triggered
  if (showAccessDenied) {
    return (
      <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col justify-center items-center font-sans">
        <AccessDenied 
          onBack={() => setShowAccessDenied(false)} 
          onSwitchToAdmin={() => {
            setRole('admin');
            setShowAccessDenied(false);
            showToast('Beralih ke mode Admin.', 'success');
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060913] font-sans text-slate-100 flex flex-col antialiased selection:bg-blue-500/30 selection:text-white">
      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border backdrop-blur-md ${
              toast.type === 'error' ? 'bg-[#2a131a] border-rose-500/30 shadow-rose-500/5' :
              toast.type === 'loading' ? 'bg-[#131d2a] border-blue-500/30 shadow-blue-500/5' :
              'bg-[#0d1527] border-emerald-500/30 shadow-emerald-500/5'
            }`}
            id="toast-notification"
          >
            <div className={`p-1 rounded-md ${
              toast.type === 'error' ? 'bg-rose-500/10' :
              toast.type === 'loading' ? 'bg-blue-500/10' :
              'bg-emerald-500/10'
            }`}>
              {toast.type === 'error' ? (
                <span className="text-rose-400">❌</span>
              ) : toast.type === 'loading' ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-t-2 border-b-2 border-blue-400" />
              ) : (
                <Check className="h-4 w-4 text-emerald-400" />
              )}
            </div>
            <span className="text-sm font-medium text-slate-200">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header Container */}
      <header className="border-b border-white/[0.06] sticky top-0 z-40 bg-[#090d16]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* Brand/Identity */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
            <div className="flex items-center gap-3">
              <img 
                src={logoLigabandot} 
                alt="LIGA BANDOT Logo" 
                className="h-11 md:h-12.5 w-auto object-contain"
                referrerPolicy="no-referrer"
              />
              <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono px-2.5 py-1 rounded-md font-bold tracking-wider uppercase whitespace-nowrap">
                BANK MONITOR
              </span>
            </div>
            <div className="hidden sm:block h-5 w-px bg-white/10" />
            <p className="text-xs text-slate-400 font-medium max-w-xs md:max-w-md">
              Sistem Pemantauan Operasional Rekening Real-time & Status Whatsapp
            </p>
          </div>

          {/* Quick Role Switcher Badge & Clock */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Database Sync Status Indicator */}
            {dbStatus && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-900/40 border border-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.04)]">
                <Database className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>DATABASE: CLOUD FIRESTORE</span>
              </div>
            )}

            {/* Role Switcher */}
            <div className="bg-[#060913] p-1 rounded-xl border border-white/10 flex items-center gap-0.5">
              <button
                onClick={() => {
                  setRole('admin');
                  showToast('Role diubah ke Admin.', 'success');
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  role === 'admin'
                    ? 'bg-blue-600 text-white shadow-sm font-extrabold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Shield className="h-3.5 w-3.5 shrink-0" />
                <span>Admin</span>
              </button>
              <button
                onClick={() => {
                  setRole('viewer');
                  showToast('Role diubah ke Viewer.', 'success');
                }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  role === 'viewer'
                    ? 'bg-orange-600 text-white shadow-sm font-extrabold'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <Eye className="h-3.5 w-3.5 shrink-0" />
                <span>Viewer</span>
              </button>
            </div>

            {/* Clock */}
            <div className="flex items-center gap-4 text-xs font-semibold bg-slate-900/40 backdrop-blur-md px-4 py-2 rounded-xl border border-white/[0.06] shadow-inner">
              <span className="font-mono text-white text-sm font-medium tracking-wide">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Role Banner Indicator if Viewer */}
      {role === 'viewer' && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2.5 px-4 text-center text-xs font-semibold text-amber-300 flex items-center justify-center gap-2">
          <Eye className="h-4 w-4 text-amber-400" />
          <span>⚠️ ANDA SEDANG DALAM MODE VIEWER: Hak akses baca saja. Tombol manipulasi data (Tambah, Edit, Hapus) disembunyikan.</span>
        </div>
      )}

      {/* Current Status Grid */}
      <section className="border-b border-white/[0.04] bg-[#090d16]/30 py-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.03),transparent)] pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            
            {/* AMAN card */}
            <div className="bg-[#0e1322]/60 p-4.5 rounded-2xl border border-emerald-500/10 flex items-center justify-between transition-all hover:border-emerald-500/30 hover:bg-[#0e1322]/90 shadow-[0_4px_20px_rgba(0,0,0,0.15)] group">
              <div className="flex items-center gap-3.5">
                <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 group-hover:scale-105 transition-transform duration-200">
                  <span className="text-xl leading-none flex items-center justify-center h-5 w-5">🟢</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Aman</p>
                  <p className="text-xl font-bold text-white font-mono mt-0.5">
                    {counters.Aman} <span className="text-xs font-sans text-slate-500 font-normal">Aktif</span>
                  </p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping"></span>
            </div>

            {/* RTP card */}
            <div className="bg-[#0e1322]/60 p-4.5 rounded-2xl border border-amber-500/10 flex items-center justify-between transition-all hover:border-amber-500/30 hover:bg-[#0e1322]/90 shadow-[0_4px_20px_rgba(0,0,0,0.15)] group">
              <div className="flex items-center gap-3.5">
                <div className="bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 group-hover:scale-105 transition-transform duration-200">
                  <span className="text-xl leading-none flex items-center justify-center h-5 w-5">🟡</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Logout / RTP</p>
                  <p className="text-xl font-bold text-white font-mono mt-0.5">
                    {counters.RTP} <span className="text-xs font-sans text-slate-500 font-normal">Bank</span>
                  </p>
                </div>
              </div>
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            </div>

            {/* OFF SEMENTARA card */}
            <div className="bg-[#0e1322]/60 p-4.5 rounded-2xl border border-orange-500/10 flex items-center justify-between transition-all hover:border-orange-500/30 hover:bg-[#0e1322]/90 shadow-[0_4px_20px_rgba(0,0,0,0.15)] group">
              <div className="flex items-center gap-3.5">
                <div className="bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/20 group-hover:scale-105 transition-transform duration-200">
                  <span className="text-xl leading-none flex items-center justify-center h-5 w-5">🟠</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Off Sementara</p>
                  <p className="text-xl font-bold text-white font-mono mt-0.5">
                    {counters['Off Sementara']} <span className="text-xs font-sans text-slate-500 font-normal">Bank</span>
                  </p>
                </div>
              </div>
            </div>

            {/* CABUT KAS 1 card */}
            <div className="bg-[#0e1322]/60 p-4.5 rounded-2xl border border-rose-500/10 flex items-center justify-between transition-all hover:border-rose-500/30 hover:bg-[#0e1322]/90 shadow-[0_4px_20px_rgba(0,0,0,0.15)] group">
              <div className="flex items-center gap-3.5">
                <div className="bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20 group-hover:scale-105 transition-transform duration-200">
                  <span className="text-xl leading-none flex items-center justify-center h-5 w-5">🔴</span>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Cabut Kas 1</p>
                  <p className="text-xl font-bold text-white font-mono mt-0.5">
                    {counters['Cabut Kas 1']} <span className="text-xs font-sans text-slate-500 font-normal">Bank</span>
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Tab Switcher Navigation */}
      <div className="bg-[#080d17]/50 border-b border-white/[0.04] py-3.5 sticky top-[77px] z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 flex-wrap">
          <div className="bg-slate-950/60 p-1 rounded-xl border border-white/[0.06] flex items-center gap-1">
            <button
              onClick={() => setActiveTab('monitor')}
              className={`flex items-center gap-2 px-4.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'monitor'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border border-blue-400/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <CreditCard className="h-3.5 w-3.5" />
              <span>Monitor Status Bank</span>
            </button>
            
            <button
              onClick={() => setActiveTab('followup')}
              className={`flex items-center gap-2 px-4.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === 'followup'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border border-blue-400/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <FileText className="h-3.5 w-3.5 text-orange-400" />
              <span>Laporan Follow Up</span>
            </button>

            {role === 'admin' && (
              <button
                onClick={() => setActiveTab('history')}
                className={`flex items-center gap-2 px-4.5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border border-blue-400/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Clock className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                <span>Riwayat Perubahan</span>
              </button>
            )}
          </div>

          <div className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-900/30 px-3.5 py-1.5 rounded-lg border border-white/[0.04]">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse mr-1"></span>
            <span>Database Google Sheets Ter-sinkronisasi</span>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Loading Spinner */}
        {isLoading && activeTab === 'monitor' && (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sinkronisasi Database...</span>
          </div>
        )}

        {!isLoading && activeTab === 'monitor' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT SIDE PANEL: Form Input Bank (Visible only for Admins) */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {role === 'admin' ? (
                <div 
                  ref={formRef} 
                  id="bank-form-panel"
                  className="bg-[#0f1425]/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/[0.06] transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.06]">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building2 className="h-4.5 w-4.5 text-blue-400" />
                      Tambah Rekening Bank
                    </h2>
                  </div>

                  {formError && (
                    <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  <form onSubmit={handleAddBank} className="space-y-4">
                    {/* Nama Bank */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Nama Bank
                      </label>
                      <input
                        type="text"
                        value={formName}
                        onChange={(e) => {
                          setFormName(e.target.value);
                          if (formError) setFormError('');
                        }}
                        placeholder="Contoh: BCA, MANDIRI, BRI"
                        className="w-full bg-[#060913] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase text-white font-semibold"
                        id="input-nama-bank"
                      />
                      
                      {/* Suggestions */}
                      <div className="flex flex-wrap gap-1.5 mt-2.5">
                        {quickBanks.map(qb => (
                          <button
                            key={qb}
                            type="button"
                            onClick={() => {
                              setFormName(qb);
                              if (formError) setFormError('');
                            }}
                            className={`text-[10px] px-3 py-1 rounded-lg font-bold transition-all border ${
                              formName.toUpperCase() === qb 
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40' 
                                : 'bg-white/5 hover:bg-white/10 text-slate-300 border-transparent'
                            }`}
                          >
                            {qb}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Nomor Rekening */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Nomor Rekening
                      </label>
                      <input
                        type="text"
                        value={formAccountNumber}
                        onChange={(e) => {
                          setFormAccountNumber(e.target.value.replace(/[^0-9-]/g, ''));
                          if (formError) setFormError('');
                        }}
                        placeholder="Masukkan nomor rekening..."
                        className="w-full bg-[#060913] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-white"
                        id="input-nomor-rekening"
                      />
                    </div>

                    {/* Nama Rekening */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Nama Rekening
                      </label>
                      <input
                        type="text"
                        value={formAccountName}
                        onChange={(e) => {
                          setFormAccountName(e.target.value);
                          if (formError) setFormError('');
                        }}
                        placeholder="Masukkan nama pemilik rekening..."
                        className="w-full bg-[#060913] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase text-white font-semibold"
                        id="input-nama-rekening"
                      />
                    </div>

                    {/* Status selection */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Status Operasional
                      </label>
                      <div className="grid grid-cols-2 gap-2" id="input-status-grid">
                        <button
                          type="button"
                          onClick={() => setFormStatus('Aman')}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                            formStatus === 'Aman'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40'
                              : 'bg-white/5 text-slate-300 border-white/[0.04] hover:bg-white/10'
                          }`}
                        >
                          <span>🟢</span>
                          <span>Aman</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormStatus('RTP')}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                            formStatus === 'RTP'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/40'
                              : 'bg-white/5 text-slate-300 border-white/[0.04] hover:bg-white/10'
                          }`}
                        >
                          <span>🟡</span>
                          <span>RTP</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormStatus('Off Sementara')}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                            formStatus === 'Off Sementara'
                              ? 'bg-orange-500/10 text-orange-400 border-orange-500/40'
                              : 'bg-white/5 text-slate-300 border-white/[0.04] hover:bg-white/10'
                          }`}
                        >
                          <span>🟠</span>
                          <span className="truncate">Off Sementara</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormStatus('Cabut Kas 1')}
                          className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                            formStatus === 'Cabut Kas 1'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/40'
                              : 'bg-white/5 text-slate-300 border-white/[0.04] hover:bg-white/10'
                          }`}
                        >
                          <span>🔴</span>
                          <span className="truncate">Cabut Kas 1</span>
                        </button>
                      </div>
                    </div>

                    {/* Keterangan */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                        Keterangan
                      </label>
                      <textarea
                        value={formNotes}
                        onChange={(e) => setFormNotes(e.target.value)}
                        placeholder="Masukkan catatan operasional..."
                        rows={2}
                        className="w-full bg-[#060913] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white"
                        id="input-keterangan"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 cursor-pointer border border-blue-400/25"
                      id="btn-simpan-bank"
                      disabled={isSubmittingNewBank}
                    >
                      <Plus className="h-4 w-4" />
                      <span>{isSubmittingNewBank ? 'Menyimpan...' : 'SIMPAN DATA'}</span>
                    </button>
                  </form>
                </div>
              ) : (
                /* Information notice for viewers instead of add form */
                <div className="bg-[#0f1425]/70 border border-white/[0.06] rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-center">
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 p-4 rounded-xl flex flex-col items-center gap-2">
                    <span className="text-2xl">🔒</span>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-white">Mode Pengamat Terbuka</h4>
                    <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                      Formulir penambahan rekening bank tidak tersedia untuk Viewer. Beralih ke Admin di navbar untuk merubah data.
                    </p>
                  </div>
                </div>
              )}

              {/* Live activity log feed */}
              <div className="bg-[#0f1425]/50 border border-white/[0.06] backdrop-blur-md rounded-2xl p-5 shadow-xl flex flex-col gap-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                    Aktivitas Lokal Real-time
                  </h3>
                  <span className="text-[10px] font-mono text-slate-400 font-bold">FEED</span>
                </div>
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-2.5 items-start text-xs">
                      <span className="font-mono text-slate-500 text-[10px] pt-0.5 shrink-0">{log.time}</span>
                      <div className="flex-1">
                        <p className="text-slate-300 font-semibold leading-relaxed">{log.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* WhatsApp format visualizer */}
              <div className="bg-[#0f1425]/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/[0.06] flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Share2 className="h-4 w-4 text-emerald-400" />
                    Format WhatsApp
                  </h3>
                  <button
                    onClick={handleCopyTemplate}
                    className={`text-[10px] font-bold flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all ${
                      copiedTemplate 
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg'
                    }`}
                    id="btn-salin-wa"
                  >
                    {copiedTemplate ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Salin WA</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Preview Box */}
                <div className="bg-slate-950/80 text-slate-300 p-4.5 rounded-xl font-mono text-[11px] leading-relaxed max-h-[250px] overflow-y-auto border border-white/[0.04] shadow-inner select-all">
                  <pre className="whitespace-pre-wrap">{formattedStatusText}</pre>
                </div>
              </div>

            </div>

            {/* RIGHT SIDE PANEL: Bank List, Search & Filters */}
            <div className="lg:col-span-8 flex flex-col gap-6">
              
              {/* Filters */}
              <div className="bg-[#0f1425]/70 backdrop-blur-md rounded-2xl p-5 shadow-2xl border border-white/[0.06] flex flex-col gap-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Search className="h-4.5 w-4.5 text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari Bank, No Rekening, atau Nama Pemilik..."
                      className="w-full pl-10 pr-4 py-2.5 bg-[#060913] border border-white/10 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white placeholder-slate-500 font-semibold"
                      id="search-input-bank"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-slate-400 hover:text-slate-200 transition font-bold"
                      >
                        Bersihkan
                      </button>
                    )}
                  </div>

                  {(searchQuery || !showAllFilter) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setShowAllFilter(true);
                        setSelectedStatuses({
                          'Aman': true,
                          'RTP': true,
                          'Off Sementara': true,
                          'Cabut Kas 1': true,
                        });
                      }}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 font-bold cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Reset Semua Filter
                    </button>
                  )}
                </div>

                {/* Saring Status Bank */}
                <div className="border-t border-white/[0.04] pt-4.5 flex flex-col gap-3">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-slate-500" />
                    <span>Saring Status Bank</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 mt-1">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer select-none group">
                      <button
                        type="button"
                        onClick={handleSelectAllChange}
                        className="text-blue-400 hover:text-blue-300 transition-all cursor-pointer"
                        id="filter-all-checkbox"
                      >
                        {showAllFilter ? (
                          <CheckSquare className="h-4.5 w-4.5 fill-blue-500/10 text-blue-400" />
                        ) : (
                          <Square className="h-4.5 w-4.5 text-slate-500" />
                        )}
                      </button>
                      <span>Semua Bank</span>
                    </label>

                    {(['Aman', 'RTP', 'Off Sementara', 'Cabut Kas 1'] as BankStatus[]).map((status) => {
                      const colors = {
                        'Aman': 'text-emerald-400 fill-emerald-500/10',
                        'RTP': 'text-amber-400 fill-amber-500/10',
                        'Off Sementara': 'text-orange-400 fill-orange-500/10',
                        'Cabut Kas 1': 'text-rose-400 fill-rose-500/10'
                      };
                      const dots = {
                        'Aman': '🟢',
                        'RTP': '🟡',
                        'Off Sementara': '🟠',
                        'Cabut Kas 1': '🔴'
                      };
                      return (
                        <label key={status} className="flex items-center gap-2 text-xs font-semibold text-slate-200 cursor-pointer select-none group">
                          <button
                            type="button"
                            onClick={() => handleStatusFilterChange(status)}
                            className={`${colors[status]} hover:opacity-80 transition-all cursor-pointer`}
                          >
                            {selectedStatuses[status] ? (
                              <CheckSquare className="h-4.5 w-4.5" />
                            ) : (
                              <Square className="h-4.5 w-4.5 text-slate-500" />
                            )}
                          </button>
                          <span className="flex items-center gap-1">
                            <span>{dots[status]}</span> {status}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* List Grid */}
              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  <span>Daftar Operasional ({filteredBanks.length} dari {banks.length} Bank)</span>
                  <span>Database Cloud</span>
                </div>

                {filteredBanks.length === 0 ? (
                  <div className="bg-[#0f1425]/70 backdrop-blur-md border border-white/[0.06] rounded-2xl p-10 text-center flex flex-col items-center justify-center gap-3">
                    <div className="bg-white/5 p-3 rounded-full text-slate-400 border border-white/10">
                      <Search className="h-6 w-6" />
                    </div>
                    <div>
                      <h4 className="text-white font-bold text-sm">Tidak Ada Bank Ditemukan</h4>
                      <p className="text-xs text-slate-400 mt-1 max-w-sm">
                        Mungkin tidak ada bank yang cocok dengan filter atau kata kunci di atas.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4" id="bank-cards-grid">
                    <AnimatePresence mode="popLayout">
                      {filteredBanks.map((bank) => {
                        const style = statusStyles[bank.status];
                        return (
                          <motion.div
                            key={bank.id}
                            layout
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className="bg-[#0f1425]/70 backdrop-blur-md rounded-2xl border border-white/[0.06] hover:border-white/15 transition-all duration-300"
                            id={`bank-card-${bank.id}`}
                          >
                            <div className="p-5 flex flex-col md:flex-row gap-4 justify-between items-start">
                              <div className="space-y-3 flex-1 w-full">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-lg shrink-0">🏦</span>
                                  <h3 className="text-base font-bold text-white tracking-tight uppercase">
                                    {bank.name}
                                  </h3>
                                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 ${style.badgeBg}`}>
                                    <span>{style.dot}</span>
                                    <span>{bank.status}</span>
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 text-xs font-semibold text-slate-300 bg-[#060913]/60 p-3.5 rounded-xl border border-white/[0.04]">
                                  <div className="flex items-center gap-2">
                                    <CreditCard className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                    <span className="text-slate-400 w-16 shrink-0">No. Rek:</span>
                                    <span className="font-mono text-white text-sm tracking-wide select-all flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10 shadow-sm">
                                      {bank.accountNumber}
                                      <button
                                        onClick={() => handleCopyText(bank.accountNumber, bank.id)}
                                        className="text-slate-400 hover:text-blue-400 p-0.5 rounded transition cursor-pointer"
                                        title="Salin nomor rekening"
                                      >
                                        {copiedId === bank.id ? (
                                          <Check className="h-3 w-3 text-emerald-400" />
                                        ) : (
                                          <Copy className="h-3 w-3" />
                                        )}
                                      </button>
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                                    <span className="text-slate-400 w-16 shrink-0">Pemilik:</span>
                                    <span className="text-white uppercase truncate bg-white/5 px-2 py-0.5 rounded border border-white/10 shadow-sm font-semibold tracking-wide">
                                      {bank.accountName}
                                    </span>
                                  </div>
                                </div>

                                {bank.notes && (
                                  <div className="text-xs text-slate-300 pl-1 pt-0.5 flex items-start gap-1.5">
                                    <p className="leading-relaxed italic bg-[#060913]/30 p-2.5 rounded-lg border border-dashed border-white/10 w-full text-slate-400 font-medium">
                                      {bank.notes}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Action buttons (Only visible to Admin) */}
                              <div className="flex items-center md:flex-col gap-2 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/[0.04]">
                                <span className="text-[9px] text-slate-400 font-bold font-mono md:mb-1 block">
                                  UPDATE: {new Date(bank.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                                
                                {role === 'admin' && (
                                  <div className="flex items-center gap-1.5 ml-auto md:ml-0">
                                    <button
                                      onClick={() => {
                                        setSelectedEditBank(bank);
                                        setIsEditOpen(true);
                                      }}
                                      className="p-2 text-slate-300 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg border border-white/10 bg-white/5 transition shadow-sm flex items-center justify-center cursor-pointer"
                                      title="Edit data bank"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      onClick={() => {
                                        setSelectedDeleteBank(bank);
                                        setIsDeleteOpen(true);
                                      }}
                                      className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-white/10 bg-white/5 transition shadow-sm flex items-center justify-center cursor-pointer"
                                      title="Hapus bank"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Quick status change bar (Only visible to Admin) */}
                            {role === 'admin' && (
                              <div className="bg-[#060913]/40 border-t border-white/[0.04] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                  <ChevronRight className="h-3 w-3 text-slate-500" />
                                  Ubah Status Cepat:
                                </span>

                                <div className="flex items-center flex-wrap gap-1.5">
                                  {(['Aman', 'RTP', 'Off Sementara', 'Cabut Kas 1'] as BankStatus[]).map((status) => {
                                    const labels = { 'Aman': '🟢 Aman', 'RTP': '🟡 RTP', 'Off Sementara': '🟠 Off', 'Cabut Kas 1': '🔴 Cabut' };
                                    const activeColors = {
                                      'Aman': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                                      'RTP': 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                                      'Off Sementara': 'bg-orange-500/20 text-orange-300 border-orange-500/40',
                                      'Cabut Kas 1': 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                    };
                                    return (
                                      <button
                                        key={status}
                                        onClick={() => handleQuickStatusChange(bank.id, status)}
                                        className={`text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer ${
                                          bank.status === status
                                            ? activeColors[status]
                                            : 'bg-white/5 text-slate-300 hover:bg-white/15 border-white/10'
                                        }`}
                                      >
                                        {labels[status]}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

        {activeTab === 'followup' && (
          <FollowUpReport currentTime={currentTime} showToast={showToast} />
        )}

        {role === 'admin' && activeTab === 'history' && (
          <HistoryPanel userRole={role} />
        )}

      </main>

      {/* Modern Dialog Modals */}
      <EditBankModal 
        isOpen={isEditOpen} 
        onClose={() => {
          setIsEditOpen(false);
          setSelectedEditBank(null);
        }} 
        bank={selectedEditBank} 
        onSave={handleSaveEditBank}
      />

      <DeleteConfirmModal 
        isOpen={isDeleteOpen} 
        onClose={() => {
          setIsDeleteOpen(false);
          setSelectedDeleteBank(null);
        }} 
        bank={selectedDeleteBank} 
        onConfirm={handleConfirmDeleteBank}
      />

      {/* Modern Compact Footer */}
      <footer className="bg-[#080c16] text-slate-400 border-t border-white/[0.04] mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <img 
              src={logoLigabandot} 
              alt="LIGA BANDOT Logo" 
              className="h-6 w-auto object-contain opacity-70 hover:opacity-100 transition-opacity"
              referrerPolicy="no-referrer"
            />
            <span className="text-slate-500">&copy; {new Date().getFullYear()} - Monitoring Operasional Bank</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-slate-500">Status Indikator:</span>
            <span className="text-emerald-400 font-bold ml-1">🟢 Aman</span>
            <span className="text-white/10">•</span>
            <span className="text-amber-400 font-bold">🟡 RTP</span>
            <span className="text-white/10">•</span>
            <span className="text-orange-400 font-bold">🟠 Off</span>
            <span className="text-white/10">•</span>
            <span className="text-rose-400 font-bold">🔴 Cabut</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
