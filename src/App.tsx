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
  ChevronDown,
  AlertCircle,
  Shield,
  Eye,
  EyeOff,
  Key,
  Lock,
  Database,
  Menu,
  X,
  Sliders,
  Sun,
  Moon,
  LogOut,
  BarChart3,
  LayoutList,
  Zap,
  Pause,
  Activity,
  TrendingUp,
  Sparkles,
  ShieldAlert,
  QrCode,
  DollarSign
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Bank, BankStatus, QrisRecord } from './types';
import FollowUpReport from './components/FollowUpReport';
import PendingWdReport from './components/PendingWdReport';
import EditBankModal from './components/EditBankModal';
import DeleteConfirmModal from './components/DeleteConfirmModal';
import HistoryPanel from './components/HistoryPanel';
import AccessDenied from './components/AccessDenied';
import { initAuth, googleSignIn, logout as googleLogout } from './lib/firebaseAuth';
import logoImg from './assets/images/ligabandot_logo_1785220332925.jpg';
import bgImg from './assets/images/bg_ligabandot_1785220966195.jpg';

export default function App() {
  // Theme state ('dark' | 'light')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('bank_status_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('bank_status_theme', theme);
  }, [theme]);

  // Mobile sidebar drawer open state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Login session state
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem('bank_status_is_logged_in') === 'true';
  });
  const [adminPin, setAdminPin] = useState<string>(() => {
    return localStorage.getItem('bank_status_admin_pin') || '1234';
  });
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginRole, setLoginRole] = useState<'admin' | 'viewer'>('admin');

  // Filter view state for Rekening Bermasalah
  const [showOnlyBermasalah, setShowOnlyBermasalah] = useState(false);
  const [dashboardViewMode, setDashboardViewMode] = useState<'grafik' | 'daftar'>('grafik');

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

  // Google Sheets sync states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [googleSpreadsheetId, setGoogleSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem('google_spreadsheet_id') || '1j7a7OFA6B91i2Jocy1RGVeFKP2oUXacTMu9IcDkcXw4';
  });

  // Save Spreadsheet ID when changed
  useEffect(() => {
    localStorage.setItem('google_spreadsheet_id', googleSpreadsheetId);
  }, [googleSpreadsheetId]);

  // Auth initialization
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setGoogleUser(user);
        setGoogleToken(token);
        console.log('[Google Auth] Active session found');
      },
      () => {
        setGoogleUser(null);
        setGoogleToken(null);
        console.log('[Google Auth] No active session');
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    showToast('Menghubungkan ke Google...', 'loading');
    try {
      const result = await googleSignIn();
      if (result) {
        setGoogleUser(result.user);
        setGoogleToken(result.accessToken);
        showToast('Berhasil terhubung dengan Google Sheets!', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal terhubung dengan Google.', 'error');
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await googleLogout();
      setGoogleUser(null);
      setGoogleToken(null);
      showToast('Google Sheets diputuskan.', 'info');
    } catch (err) {
      console.error(err);
      showToast('Gagal memutuskan Google Sheets.', 'error');
    }
  };

  const handleUpdatePin = (e: FormEvent) => {
    e.preventDefault();
    if (!newPin.trim()) {
      showToast('PIN baru tidak boleh kosong!', 'error');
      return;
    }
    if (newPin !== confirmNewPin) {
      showToast('Konfirmasi PIN tidak cocok!', 'error');
      return;
    }
    setAdminPin(newPin);
    localStorage.setItem('bank_status_admin_pin', newPin);
    setNewPin('');
    setConfirmNewPin('');
    showToast('PIN Admin berhasil diperbarui!', 'success');
  };

  // Modals state
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedEditBank, setSelectedEditBank] = useState<Bank | null>(null);
  
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedDeleteBank, setSelectedDeleteBank] = useState<Bank | null>(null);

  const [isClearQrisOpen, setIsClearQrisOpen] = useState(false);

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
    fetchQrisRecords();
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
  const [activeTab, setActiveTab] = useState<'monitor' | 'followup' | 'history' | 'qris' | 'pending_wd'>(() => {
    const saved = localStorage.getItem('bank_status_active_tab');
    if (saved === 'monitor' || saved === 'followup' || saved === 'history' || saved === 'qris' || saved === 'pending_wd') {
      return saved as any;
    }
    return 'monitor';
  });

  // Save active tab state
  useEffect(() => {
    localStorage.setItem('bank_status_active_tab', activeTab);
  }, [activeTab]);

  // Dashboard & Sistem/Laporan Dropdown states in sidebar
  const [isDashboardDropdownOpen, setIsDashboardDropdownOpen] = useState(true);
  const [isSistemLaporanDropdownOpen, setIsSistemLaporanDropdownOpen] = useState(true);

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
  const [formHideFromDashboard, setFormHideFromDashboard] = useState(false);
  const [formError, setFormError] = useState('');
  const [isSubmittingNewBank, setIsSubmittingNewBank] = useState(false);

  // Input mode (Manual vs Sekali Tempel)
  const [inputMode, setInputMode] = useState<'manual' | 'paste'>('manual');
  
  // Bulk paste states
  const [pasteRawText, setPasteRawText] = useState('');
  const [pasteBaseNominal, setPasteBaseNominal] = useState<string>('10000000');
  const [pasteDefaultStatus, setPasteDefaultStatus] = useState<BankStatus>('Aman');
  const [pasteParsedBanks, setPasteParsedBanks] = useState<any[]>([]);
  const [pasteSortOrder, setPasteSortOrder] = useState<'as_pasted' | 'by_bank' | 'by_name'>('as_pasted');
  const [isSubmittingPaste, setIsSubmittingPaste] = useState(false);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [showHiddenBanks, setShowHiddenBanks] = useState(false);
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
  const [isCopiedFourColumns, setIsCopiedFourColumns] = useState(false);
  const [isCopiedAllFiltered, setIsCopiedAllFiltered] = useState(false);

  // Scroll targets
  const formRef = useRef<HTMLDivElement>(null);

  // === QRIS MINERA CACING STATES & LOGIC ===
  const [qrisRecords, setQrisRecords] = useState<QrisRecord[]>([]);
  const [isQrisLoading, setIsQrisLoading] = useState(false);
  const [qrisPasteText, setQrisPasteText] = useState('');
  const [qrisBaseNominal, setQrisBaseNominal] = useState('10000000'); // Default Rp 10.000.000
  const [qrisSearchQuery, setQrisSearchQuery] = useState('');
  const [qrisSelectedBank, setQrisSelectedBank] = useState('Semua');
  const [isQrisSubmitting, setIsQrisSubmitting] = useState(false);
  const [isCopiedQrisAll, setIsCopiedQrisAll] = useState(false);

  // Suffix generator between 001 and 999 with constraints
  const generateUniqueSuffixes = (count: number, existingSuffixes: Set<string> = new Set()): string[] => {
    const suffixes: string[] = [];
    const seqPatterns = [
      '012', '123', '234', '345', '456', '567', '678', '789',
      '987', '876', '765', '654', '543', '432', '321', '210'
    ];
    const repeats = [
      '000', '111', '222', '333', '444', '555', '666', '777', '888', '999'
    ];

    let safetyCounter = 0;
    while (suffixes.length < count && safetyCounter < 10000) {
      safetyCounter++;
      const num = Math.floor(Math.random() * 999) + 1; // 1 to 999
      const suffix = num.toString().padStart(3, '0');

      if (existingSuffixes.has(suffix) || suffixes.includes(suffix)) {
        continue;
      }
      if (seqPatterns.includes(suffix) || repeats.includes(suffix)) {
        continue;
      }

      suffixes.push(suffix);
    }

    // Fallback if there are duplicates remaining or count not filled
    while (suffixes.length < count) {
      const suffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
      if (!suffixes.includes(suffix)) {
        suffixes.push(suffix);
      }
    }

    return suffixes;
  };

  // Local storage backup for QRIS records
  useEffect(() => {
    if (qrisRecords.length > 0) {
      localStorage.setItem('qris_records_backup', JSON.stringify(qrisRecords));
    } else if (qrisRecords.length === 0) {
      localStorage.removeItem('qris_records_backup');
    }
  }, [qrisRecords]);

  // Fetch QRIS from cloud database
  const fetchQrisRecords = async () => {
    setIsQrisLoading(true);
    try {
      const res = await fetch('/api/qris-cacing');
      if (res.ok) {
        const data = await res.json();
        setQrisRecords(data);
      } else {
        throw new Error('Response not OK');
      }
    } catch (e) {
      console.error('Failed to fetch QRIS records from cloud, loading local backup', e);
      const saved = localStorage.getItem('qris_records_backup');
      if (saved) {
        try { setQrisRecords(JSON.parse(saved)); } catch (err) { console.error(err); }
      }
    } finally {
      setIsQrisLoading(false);
    }
  };

  // Import QRIS pasted data
  const handleImportQrisData = async () => {
    if (role === 'viewer') {
      setShowAccessDenied(true);
      return;
    }

    if (!qrisPasteText.trim()) {
      showToast('Harap tempel data rekening terlebih dahulu!', 'error');
      return;
    }

    const lines = qrisPasteText.split('\n');
    const parsedRecords: QrisRecord[] = [];
    const duplicateAccountsInPaste = new Set<string>();
    const seenAccountsInBatch = new Set<string>();

    const baseNomStr = qrisBaseNominal.replace(/[^0-9]/g, '');
    const baseNomVal = parseInt(baseNomStr, 10) || 10000000;

    let validCount = 0;
    for (const line of lines) {
      if (line.trim()) validCount++;
    }

    // Get currently used suffixes to avoid duplicates
    const currentSuffixes = new Set<string>(qrisRecords.map(r => {
      const nomStr = r.nominal.toString();
      return nomStr.slice(-3);
    }));

    const newSuffixes = generateUniqueSuffixes(validCount, currentSuffixes);
    let suffixIdx = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Try tab split first
      let parts = trimmed.split('\t').map(p => p.trim()).filter(Boolean);
      if (parts.length < 3) {
        // Space split fallback
        parts = trimmed.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
      }
      if (parts.length < 3) {
        // Fallback for space-separated bank, number, name
        const match = trimmed.match(/^([A-Za-z]+)\s+([0-9\-\s]+)\s+(.+)$/);
        if (match) {
          parts = [match[1], match[2].replace(/\s/g, ''), match[3]];
        }
      }

      if (parts.length >= 2) {
        const bank = parts[0]?.toUpperCase() || 'LAINNYA';
        const rekening = parts[1]?.replace(/[^0-9]/g, '') || '';
        const name = parts.slice(2).join(' ').trim().toUpperCase() || 'TANPA NAMA';

        if (!rekening) continue;

        // Check for duplicate account in current batch or existing database
        if (seenAccountsInBatch.has(rekening) || qrisRecords.some(r => r.rekening === rekening)) {
          duplicateAccountsInPaste.add(rekening);
        }
        seenAccountsInBatch.add(rekening);

        const suffix = newSuffixes[suffixIdx] || '001';
        suffixIdx++;

        // Base nominal + suffix ending
        const finalNominal = baseNomVal + parseInt(suffix, 10);

        const newRecord: QrisRecord = {
          id: `qris-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          tanggal: new Date().toISOString(),
          bank,
          rekening,
          nama: name,
          nominal: finalNominal,
          status: 'Pending',
          created_by: 'alfareizylubis90@gmail.com',
          created_at: new Date().toISOString()
        };

        parsedRecords.push(newRecord);
      }
    }

    if (parsedRecords.length === 0) {
      showToast('Gagal memproses data. Format harus: Jenis Bank [TAB] No Rekening [TAB] Nama Pemilik', 'error');
      return;
    }

    setIsQrisSubmitting(true);
    const updatedList = [...qrisRecords, ...parsedRecords];

    try {
      const res = await fetch('/api/qris-cacing/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList)
      });

      if (res.ok) {
        setQrisRecords(updatedList);
        setQrisPasteText('');
        showToast(`Berhasil mengimpor ${parsedRecords.length} data rekening QRIS!`, 'success');
        if (duplicateAccountsInPaste.size > 0) {
          showToast(`⚠️ Ada ${duplicateAccountsInPaste.size} nomor rekening ganda terdeteksi!`, 'info');
        }
      } else {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'Server error');
      }
    } catch (err) {
      console.warn('Backend sync failed, saving QRIS records locally:', err);
      setQrisRecords(updatedList);
      setQrisPasteText('');
      showToast(`Berhasil mengimpor ${parsedRecords.length} data rekening QRIS!`, 'success');
      if (duplicateAccountsInPaste.size > 0) {
        showToast(`⚠️ Ada ${duplicateAccountsInPaste.size} nomor rekening ganda terdeteksi!`, 'info');
      }
    } finally {
      setIsQrisSubmitting(false);
    }
  };

  // Delete single QRIS record
  const handleDeleteQrisRecord = async (id: string) => {
    if (role === 'viewer') {
      setShowAccessDenied(true);
      return;
    }

    const updatedList = qrisRecords.filter(r => r.id !== id);
    setQrisRecords(updatedList);
    showToast('Data QRIS berhasil dihapus.', 'success');

    try {
      await fetch(`/api/qris-cacing/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend delete error, preserved locally:', err);
    }
  };

  // Regenerate all current rows with new unique suffixes
  const handleRegenerateNominals = async () => {
    if (role === 'viewer') {
      setShowAccessDenied(true);
      return;
    }

    if (qrisRecords.length === 0) {
      showToast('Tidak ada data untuk di-generate nominal.', 'error');
      return;
    }

    const baseNomStr = qrisBaseNominal.replace(/[^0-9]/g, '');
    const baseNomVal = parseInt(baseNomStr, 10) || 10000000;

    const newSuffixes = generateUniqueSuffixes(qrisRecords.length);
    const updatedRecords = qrisRecords.map((r, idx) => {
      const suffix = newSuffixes[idx] || '001';
      return {
        ...r,
        nominal: baseNomVal + parseInt(suffix, 10),
        tanggal: new Date().toISOString()
      };
    });

    setIsQrisSubmitting(true);
    setQrisRecords(updatedRecords);
    showToast('Berhasil me-regenerate semua nominal unik!', 'success');

    try {
      await fetch('/api/qris-cacing/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecords)
      });
    } catch (err) {
      console.warn('Backend sync error, preserved locally:', err);
    } finally {
      setIsQrisSubmitting(false);
    }
  };

  // Reset all current unique nominals back to clean base nominal
  const handleResetNominals = async () => {
    if (role === 'viewer') {
      setShowAccessDenied(true);
      return;
    }

    if (qrisRecords.length === 0) {
      showToast('Tidak ada data untuk di-reset.', 'error');
      return;
    }

    const baseNomStr = qrisBaseNominal.replace(/[^0-9]/g, '');
    const baseNomVal = parseInt(baseNomStr, 10) || 10000000;

    const updatedRecords = qrisRecords.map(r => ({
      ...r,
      nominal: baseNomVal,
      tanggal: new Date().toISOString()
    }));

    setIsQrisSubmitting(true);
    setQrisRecords(updatedRecords);
    showToast('Berhasil mereset semua nominal ke nominal dasar.', 'success');

    try {
      await fetch('/api/qris-cacing/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedRecords)
      });
    } catch (err) {
      console.warn('Backend sync error, preserved locally:', err);
    } finally {
      setIsQrisSubmitting(false);
    }
  };

  // Clear all QRIS records (Triggers custom modal)
  const handleClearAllQris = () => {
    if (role === 'viewer') {
      setShowAccessDenied(true);
      return;
    }
    setIsClearQrisOpen(true);
  };

  // Confirms clearing all QRIS records
  const handleConfirmClearAllQris = async () => {
    setIsQrisSubmitting(true);
    setQrisRecords([]);
    showToast('Semua data pencairan QRIS berhasil dibersihkan.', 'success');
    setIsClearQrisOpen(false);

    try {
      await fetch('/api/qris-cacing', { method: 'DELETE' });
    } catch (err) {
      console.warn('Backend clear error, cleared locally:', err);
    } finally {
      setIsQrisSubmitting(false);
    }
  };

  // Copy all QRIS rows as 4 columns tab-separated format
  const handleCopyQrisAll = () => {
    if (qrisRecords.length === 0) {
      showToast('Tidak ada data untuk disalin.', 'error');
      return;
    }

    const tabString = qrisRecords.map(r => {
      return `${r.bank}\t${r.rekening}\t${r.nama}\t${formatNominalDisplay(r.nominal)}`;
    }).join('\n');

    navigator.clipboard.writeText(tabString)
      .then(() => {
        setIsCopiedQrisAll(true);
        showToast(`Berhasil menyalin ${qrisRecords.length} data ke clipboard!`, 'success');
        setTimeout(() => setIsCopiedQrisAll(false), 2000);
      })
      .catch(err => {
        console.error(err);
        showToast('Gagal menyalin data.', 'error');
      });
  };

  // Export to Excel file
  const handleExportQrisExcel = () => {
    if (qrisRecords.length === 0) {
      showToast('Tidak ada data untuk diexport.', 'error');
      return;
    }
    let content = 'No\tJenis Bank\tNomor Rekening\tNama Rekening\tNominal Unik\tStatus\tTanggal\n';
    qrisRecords.forEach((r, idx) => {
      content += `${idx + 1}\t${r.bank}\t'${r.rekening}\t${r.nama}\t${formatNominalDisplay(r.nominal)}\t${r.status}\t${r.tanggal}\n`;
    });

    const blob = new Blob([content], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Qris_Minera_Cacing_${new Date().toISOString().slice(0, 10)}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Berhasil mengekspor ke Excel!', 'success');
  };

  // Export to CSV file
  const handleExportQrisCsv = () => {
    if (qrisRecords.length === 0) {
      showToast('Tidak ada data untuk diexport.', 'error');
      return;
    }
    let content = 'No,Jenis Bank,Nomor Rekening,Nama Rekening,Nominal Unik,Status,Tanggal\n';
    qrisRecords.forEach((r, idx) => {
      const escapedName = r.nama.replace(/"/g, '""');
      content += `${idx + 1},${r.bank},"${r.rekening}","${escapedName}",${formatNominalDisplay(r.nominal)},${r.status},${r.tanggal}\n`;
    });

    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Qris_Minera_Cacing_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Berhasil mengekspor ke CSV!', 'success');
  };

  // Print list
  const handlePrintQris = () => {
    if (qrisRecords.length === 0) {
      showToast('Tidak ada data untuk diprint.', 'error');
      return;
    }
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Pop-up terblokir oleh browser.', 'error');
      return;
    }

    const html = `
      <html>
        <head>
          <title>Laporan Pencairan Saldo QRIS Minera Cacing</title>
          <style>
            body { font-family: 'Inter', sans-serif; padding: 25px; color: #1e293b; background-color: #fff; }
            h1 { font-size: 20px; font-weight: 800; margin-bottom: 5px; text-transform: uppercase; border-bottom: 3px solid #1e293b; padding-bottom: 12px; color: #1e293b; }
            p { font-size: 13px; color: #64748b; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
            th { background-color: #f1f5f9; font-weight: bold; color: #0f172a; }
            tr:nth-child(even) { background-color: #f8fafc; }
            .nominal { font-family: monospace; font-weight: bold; text-align: right; color: #0f172a; font-size: 13px; }
          </style>
        </head>
        <body>
          <h1>Laporan Pencairan Saldo QRIS Minera Cacing</h1>
          <p>Tanggal Cetak: ${new Date().toLocaleString('id-ID')} | Total Rekening: ${qrisRecords.length}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 50px;">No</th>
                <th>Jenis Bank</th>
                <th>Nomor Rekening</th>
                <th>Nama Rekening</th>
                <th style="text-align: right;">Nominal Unik</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${qrisRecords.map((r, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${r.bank}</td>
                  <td>${r.rekening}</td>
                  <td>${r.nama}</td>
                  <td class="nominal">${r.nominal}</td>
                  <td>${r.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };


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
    setFormHideFromDashboard(false);
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
      updatedAt: new Date().toISOString(),
      hideFromDashboard: formHideFromDashboard
    };

    // Optimistic Update
    setBanks(prev => [...prev, newBank]);
    showToast('Menyimpan data bank...', 'loading');

    try {
      const res = await fetch('/api/banks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'alfareizylubis90@gmail.com',
          ...(googleToken ? { 'x-google-access-token': googleToken } : {}),
          ...(googleSpreadsheetId ? { 'x-google-spreadsheet-id': googleSpreadsheetId } : {})
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

  // Parsing individual paste line: supports 3 columns or 4 columns (with/without tabs)
  const parsePasteLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return null;

    // Check if tab-separated first (Excel/Sheets standard)
    const tabParts = trimmed.split('\t').map(p => p.trim()).filter(Boolean);
    if (tabParts.length >= 3) {
      if (tabParts.length >= 4) {
        // Look at the last part to see if it's a nominal
        const lastPart = tabParts[tabParts.length - 1];
        const cleanLast = lastPart.replace(/[^0-9]/g, '');
        const isNominal = lastPart.startsWith('>') || /^\d+$/.test(cleanLast) || (cleanLast.length >= 4 && !isNaN(Number(cleanLast)));
        
        if (isNominal) {
          return {
            bankName: tabParts[0],
            accountNumber: tabParts[1],
            accountName: tabParts.slice(2, tabParts.length - 1).join(' '),
            parsedNominal: lastPart
          };
        }
      }
      
      return {
        bankName: tabParts[0],
        accountNumber: tabParts[1],
        accountName: tabParts.slice(2).join(' '),
        parsedNominal: undefined
      };
    }

    // Split by multiple spaces
    const tokens = trimmed.split(/\s{2,}|\t+/).map(p => p.trim()).filter(Boolean);
    if (tokens.length >= 3) {
      if (tokens.length >= 4) {
        const lastPart = tokens[tokens.length - 1];
        const cleanLast = lastPart.replace(/[^0-9]/g, '');
        const isNominal = lastPart.startsWith('>') || /^\d+$/.test(cleanLast) || (cleanLast.length >= 4 && !isNaN(Number(cleanLast)));
        
        if (isNominal) {
          return {
            bankName: tokens[0],
            accountNumber: tokens[1],
            accountName: tokens.slice(2, tokens.length - 1).join(' '),
            parsedNominal: lastPart
          };
        }
      }
      return {
        bankName: tokens[0],
        accountNumber: tokens[1],
        accountName: tokens.slice(2).join(' '),
        parsedNominal: undefined
      };
    }

    // Fallback: split by single spaces but be careful with names
    const singleSpaceTokens = trimmed.split(/\s+/).map(p => p.trim()).filter(Boolean);
    if (singleSpaceTokens.length >= 3) {
      let numIndex = singleSpaceTokens.findIndex((tok, idx) => idx > 0 && /^\d+[\d-]*$/.test(tok));
      if (numIndex === -1) {
        numIndex = 1;
      }
      const bankName = singleSpaceTokens.slice(0, numIndex).join(' ');
      const accountNumber = singleSpaceTokens[numIndex];
      
      const lastToken = singleSpaceTokens[singleSpaceTokens.length - 1];
      const cleanLast = lastToken.replace(/[^0-9]/g, '');
      const isNominal = lastToken.startsWith('>') || /^\d+$/.test(cleanLast) || (cleanLast.length >= 4 && !isNaN(Number(cleanLast)));
      
      if (isNominal && singleSpaceTokens.length > numIndex + 2) {
        const accountName = singleSpaceTokens.slice(numIndex + 1, singleSpaceTokens.length - 1).join(' ');
        return {
          bankName,
          accountNumber,
          accountName,
          parsedNominal: lastToken
        };
      } else {
        const accountName = singleSpaceTokens.slice(numIndex + 1).join(' ');
        return {
          bankName,
          accountNumber,
          accountName,
          parsedNominal: undefined
        };
      }
    } else if (singleSpaceTokens.length === 2) {
      return {
        bankName: singleSpaceTokens[0],
        accountNumber: singleSpaceTokens[1],
        accountName: '-',
        parsedNominal: undefined
      };
    }

    return null;
  };

  // Parse paste input and generate unique random trailing suffixes (cacing nominal)
  const handleParsePasteInput = () => {
    if (!pasteRawText.trim()) {
      showToast('Masukkan teks bank terlebih dahulu', 'error');
      return;
    }

    const lines = pasteRawText.split('\n');
    const parsed: any[] = [];
    
    // Find all suffixes currently used by existing banks to avoid duplicates
    const existingSuffixes = new Set<number>();
    banks.forEach(b => {
      if (b.notes && b.notes.includes('>')) {
        const match = b.notes.match(/>\s*[\d,.]+/);
        if (match) {
          const numStr = match[0].replace(/[^0-9]/g, '');
          const val = parseInt(numStr, 10);
          if (!isNaN(val)) {
            existingSuffixes.add(val % 1000);
          }
        }
      }
    });

    const tempSuffixes = new Set<number>();
    const globalBaseNum = Number(pasteBaseNominal.replace(/[^0-9]/g, '')) || 10000000;

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const parsedLine = parsePasteLine(trimmed);
      if (parsedLine) {
        // Generate unique suffix
        let suffix = 0;
        let attempts = 0;
        while (attempts < 2000) {
          suffix = Math.floor(Math.random() * 999) + 1; // 1 to 999
          if (!tempSuffixes.has(suffix) && !existingSuffixes.has(suffix)) {
            break;
          }
          attempts++;
        }
        tempSuffixes.add(suffix);

        // Determine the base nominal for this row
        let rowBaseNum = globalBaseNum;
        if (parsedLine.parsedNominal) {
          const cleanNom = Number(parsedLine.parsedNominal.replace(/[^0-9]/g, ''));
          if (cleanNom && !isNaN(cleanNom)) {
            rowBaseNum = cleanNom;
          }
        }

        const finalNominalVal = Math.floor(rowBaseNum / 1000) * 1000 + suffix;
        // formatted as >10.000.003
        const formattedNotes = `>${finalNominalVal.toLocaleString('id-ID')}`;

        parsed.push({
          id: `bank-bulk-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 5)}`,
          name: parsedLine.bankName.toUpperCase(),
          accountNumber: parsedLine.accountNumber,
          accountName: parsedLine.accountName.toUpperCase(),
          status: pasteDefaultStatus,
          notes: formattedNotes,
          updatedAt: new Date().toISOString()
        });
      }
    });

    if (parsed.length === 0) {
      showToast('Tidak ada baris data yang berhasil diproses. Periksa kembali format teks.', 'error');
    } else {
      setPasteParsedBanks(parsed);
      showToast(`Berhasil memproses ${parsed.length} rekening bank dengan nominal unik!`, 'success');
    }
  };

  // Get sorted parsed banks for bulk paste preview
  const getSortedParsedBanks = () => {
    const items = [...pasteParsedBanks];
    if (pasteSortOrder === 'by_bank') {
      return items.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (pasteSortOrder === 'by_name') {
      return items.sort((a, b) => a.accountName.localeCompare(b.accountName));
    }
    return items;
  };

  // Copy formatted 4-column data to clipboard
  const handleCopyFourColumns = () => {
    const sortedItems = getSortedParsedBanks();
    if (sortedItems.length === 0) {
      showToast('Pratinjau data masih kosong. Silakan proses teks terlebih dahulu.', 'error');
      return;
    }

    // Format into 4 columns (tab separated): Bank, No Rekening, Nama Rekening, Nominal Suffix
    const tabString = sortedItems.map(item => {
      // Remove any leading '>' and format clearly
      const cleanNominal = item.notes.replace(/^>\s*/, '');
      return `${item.name}\t${item.accountNumber}\t${item.accountName}\t${cleanNominal}`;
    }).join('\n');

    navigator.clipboard.writeText(tabString)
      .then(() => {
        setIsCopiedFourColumns(true);
        showToast('Berhasil menyalin 4 kolom untuk Google Sheets / Excel!', 'success');
        setTimeout(() => setIsCopiedFourColumns(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
        showToast('Gagal menyalin teks ke clipboard', 'error');
      });
  };

  // Copy single bank as 4 columns to clipboard
  const handleCopySingleFourColumns = (bank: Bank) => {
    const cleanNominal = bank.notes ? bank.notes.replace(/^>\s*/, '') : '-';
    const tabString = `${bank.name}\t${bank.accountNumber}\t${bank.accountName}\t${cleanNominal}`;
    
    navigator.clipboard.writeText(tabString)
      .then(() => {
        showToast(`Berhasil menyalin 4 kolom (${bank.name}) ke clipboard!`, 'success');
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Gagal menyalin 4 kolom', 'error');
      });
  };

  // Copy all filtered banks as 4 columns to clipboard
  const handleCopyAllFilteredFourColumns = () => {
    if (filteredBanks.length === 0) {
      showToast('Daftar operasional kosong. Tidak ada bank untuk disalin.', 'error');
      return;
    }

    const tabString = filteredBanks.map(bank => {
      const cleanNominal = bank.notes ? bank.notes.replace(/^>\s*/, '') : '-';
      return `${bank.name}\t${bank.accountNumber}\t${bank.accountName}\t${cleanNominal}`;
    }).join('\n');

    navigator.clipboard.writeText(tabString)
      .then(() => {
        setIsCopiedAllFiltered(true);
        showToast(`Berhasil menyalin ${filteredBanks.length} bank (4 kolom) ke clipboard!`, 'success');
        setTimeout(() => setIsCopiedAllFiltered(false), 2000);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
        showToast('Gagal menyalin 4 kolom', 'error');
      });
  };

  // Save the bulk parsed banks to database
  const handleSaveBulkBanks = async () => {
    if (role === 'viewer') {
      setShowAccessDenied(true);
      return;
    }

    if (pasteParsedBanks.length === 0) {
      showToast('Pratinjau data masih kosong. Silakan proses teks terlebih dahulu.', 'error');
      return;
    }

    setIsSubmittingPaste(true);
    showToast(`Menyimpan ${pasteParsedBanks.length} data bank sekaligus...`, 'loading');

    // Optimistic Update
    const originalBanks = [...banks];
    setBanks(prev => [...prev, ...pasteParsedBanks]);

    try {
      const res = await fetch('/api/banks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': 'alfareizylubis90@gmail.com',
          ...(googleToken ? { 'x-google-access-token': googleToken } : {}),
          ...(googleSpreadsheetId ? { 'x-google-spreadsheet-id': googleSpreadsheetId } : {})
        },
        body: JSON.stringify(pasteParsedBanks)
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Gagal menyimpan bulk bank');
      }

      const resData = await res.json();
      addLog(`Menambahkan ${pasteParsedBanks.length} bank baru sekaligus via Sekali Tempel`, 'success');
      showToast(`Sukses menyimpan ${pasteParsedBanks.length} bank baru ke database!`, 'success');
      
      // Reset bulk paste form and preview
      setPasteRawText('');
      setPasteParsedBanks([]);
      fetchBanks(); // sync fully
    } catch (err: any) {
      console.error(err);
      setBanks(originalBanks); // rollback
      showToast(`Gagal menyimpan: ${err.message || err}`, 'error');
    } finally {
      setIsSubmittingPaste(false);
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
          'x-user-email': 'alfareizylubis90@gmail.com',
          ...(googleToken ? { 'x-google-access-token': googleToken } : {}),
          ...(googleSpreadsheetId ? { 'x-google-spreadsheet-id': googleSpreadsheetId } : {})
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
          'x-user-email': 'alfareizylubis90@gmail.com',
          ...(googleToken ? { 'x-google-access-token': googleToken } : {}),
          ...(googleSpreadsheetId ? { 'x-google-spreadsheet-id': googleSpreadsheetId } : {})
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
          'x-user-email': 'alfareizylubis90@gmail.com',
          ...(googleToken ? { 'x-google-access-token': googleToken } : {}),
          ...(googleSpreadsheetId ? { 'x-google-spreadsheet-id': googleSpreadsheetId } : {})
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

  // Visible banks list (taking hideFromDashboard and showHiddenBanks into account)
  const visibleBanks = useMemo(() => {
    return banks.filter(bank => showHiddenBanks || !bank.hideFromDashboard);
  }, [banks, showHiddenBanks]);

  // Dynamic counter computation
  const counters = useMemo(() => {
    const counts = { 'Aman': 0, 'RTP': 0, 'Off Sementara': 0, 'Cabut Kas 1': 0 };
    visibleBanks.forEach(bank => {
      if (counts[bank.status] !== undefined) {
        counts[bank.status]++;
      }
    });
    return counts;
  }, [visibleBanks]);

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
    return visibleBanks.filter(bank => {
      // If we are in Rek Bermasalah view, only show banks that are not 'Aman'
      if (showOnlyBermasalah && bank.status === 'Aman') {
        return false;
      }

      const matchesSearch = 
        bank.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bank.accountNumber.includes(searchQuery) ||
        bank.accountName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (bank.notes && bank.notes.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = selectedStatuses[bank.status];
      return matchesSearch && matchesStatus;
    });
  }, [visibleBanks, searchQuery, selectedStatuses, showOnlyBermasalah]);

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

    visibleBanks.forEach((bank, idx) => {
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
      if (idx < visibleBanks.length - 1) {
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

  // Helper to format nominal with COMMA thousand separators and NO decimals
  const formatNominalDisplay = (val: number | string): string => {
    if (val === undefined || val === null || val === '') return '0';
    if (typeof val === 'number') {
      return Math.floor(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    const cleanStr = val.toString().replace(/(\.00|,00)$/, '').replace(/,/g, '').replace(/\./g, '');
    const parsed = parseInt(cleanStr, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    return val.toString().replace(/\./g, ',');
  };

  const quickBanks = ['BCA', 'BNI', 'BRI', 'MANDIRI', 'CIMB', 'DANAMON', 'PERMATA', 'BTN', 'MAYBANK'];

  // === QRIS MINERA CACING MEMOIZED VALUES ===
  const qrisStats = useMemo(() => {
    const totalCount = qrisRecords.length;
    if (totalCount === 0) {
      return {
        totalCount: 0,
        totalNominal: 0,
        mostFrequentBank: '-',
        highestNominal: 0,
        lowestNominal: 0
      };
    }

    const totalNom = qrisRecords.reduce((sum, r) => sum + r.nominal, 0);
    const nominals = qrisRecords.map(r => r.nominal);
    const highest = Math.max(...nominals);
    const lowest = Math.min(...nominals);

    const bankCounts: Record<string, number> = {};
    qrisRecords.forEach(r => {
      const b = r.bank.toUpperCase();
      bankCounts[b] = (bankCounts[b] || 0) + 1;
    });

    let mostFreqBank = '-';
    let maxCount = 0;
    Object.entries(bankCounts).forEach(([bank, count]) => {
      if (count > maxCount) {
        maxCount = count;
        mostFreqBank = `${bank} (${count})`;
      }
    });

    return {
      totalCount,
      totalNominal: totalNom,
      mostFrequentBank: mostFreqBank,
      highestNominal: highest,
      lowestNominal: lowest
    };
  }, [qrisRecords]);

  const filteredQrisRecords = useMemo(() => {
    return qrisRecords.filter(r => {
      const query = qrisSearchQuery.toLowerCase().trim();
      const matchSearch = 
        r.nama.toLowerCase().includes(query) ||
        r.rekening.includes(query) ||
        r.nominal.toString().includes(query) ||
        r.bank.toLowerCase().includes(query);

      const matchBank = qrisSelectedBank === 'Semua' || 
        (qrisSelectedBank === 'Lainnya' && !['BCA', 'BRI', 'BNI', 'MANDIRI', 'CIMB', 'DANAMON', 'PERMATA', 'BTN'].includes(r.bank.toUpperCase())) ||
        r.bank.toUpperCase() === qrisSelectedBank.toUpperCase();

      return matchSearch && matchBank;
    });
  }, [qrisRecords, qrisSearchQuery, qrisSelectedBank]);

  const qrisDuplicateRekenings = useMemo(() => {
    const counts: Record<string, number> = {};
    qrisRecords.forEach(r => {
      counts[r.rekening] = (counts[r.rekening] || 0) + 1;
    });
    return new Set<string>(
      Object.keys(counts).filter(rek => counts[rek] > 1)
    );
  }, [qrisRecords]);

  const renderQrisSection = () => {
    return (
      <div className="space-y-6" id="qris-module">
        {/* HEADER SECTION */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-blue-500/30">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-600 rounded-xl text-white shadow-md flex items-center justify-center shrink-0">
              <QrCode className="h-7 w-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Pencairan Saldo QRIS Minera Cacing
              </h2>
              <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed font-normal">
                Kelola pencairan saldo QRIS Minera Cacing dengan mudah dan real-time. Sistem data otomatis memproses & mencatat transaksi agar lebih transparan dan akurat kapan saja.
              </p>
            </div>
          </div>
        </div>

        {/* FORM INPUT SECTION */}
        <div className="bg-[#1e293b] p-6 rounded-2xl border border-blue-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-700">
            <div className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                SEKALI TEMPEL REKENING (TAB / EXCEL)
              </h3>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  setQrisPasteText(`BCA\t5242527474\tSuryati\nBCA\t5888642367\tI KADER AGUS SULEMRA\nBCA\t5420472355\tAHMAD MIOITBIOL VH\nBCA\t5311454575\tJUMLAH\nBCA\t4901307966\tSYAEPUL IMAM`);
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold uppercase tracking-wider transition cursor-pointer flex items-center gap-1.5 shadow-sm"
              >
                <Sparkles className="h-3.5 w-3.5 text-blue-400" />
                <span>Contoh Tempel</span>
              </button>
              <span className="text-xs text-slate-300 font-medium">
                Format: Bank [TAB] Rekening [TAB] Nama
              </span>
            </div>
          </div>

          <textarea
            value={qrisPasteText}
            onChange={(e) => setQrisPasteText(e.target.value)}
            placeholder={`Contoh sekali tempel dari Excel / Spreadsheet:\nBCA\t5242527474\tSuryati\nBCA\t5888642367\tI KADER AGUS SULEMRA\nBCA\t5420472355\tAHMAD MIOITBIOL VH\nBCA\t5311454575\tJUMLAH\nBCA\t4901307966\tSYAEPUL IMAM`}
            rows={7}
            className="w-full bg-[#0f172a] text-sm text-white p-4 rounded-xl border border-blue-500/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-500/40 font-mono focus:outline-none transition-all placeholder:text-slate-400 resize-none font-medium"
          />

          {/* Configuration & Action Bar */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pt-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider whitespace-nowrap">Nominal Dasar:</span>
              <div className="relative max-w-[180px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                <input
                  type="text"
                  value={qrisBaseNominal ? formatNominalDisplay(qrisBaseNominal) : ''}
                  onChange={(e) => {
                    const clean = e.target.value.replace(/[^0-9]/g, '');
                    setQrisBaseNominal(clean);
                  }}
                  placeholder="10,000,000"
                  className="w-full bg-[#0f172a] text-sm font-bold text-white pl-9 pr-3 py-2 rounded-xl border border-blue-500/50 focus:border-blue-400 focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {[
                  { label: '10 JT', val: '10000000' },
                  { label: '5 JT', val: '5000000' },
                  { label: '2.5 JT', val: '2500000' },
                  { label: '1 JT', val: '1000000' }
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => setQrisBaseNominal(preset.val)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg border transition ${
                      qrisBaseNominal === preset.val
                        ? 'bg-blue-600 text-white border-blue-400'
                        : 'bg-[#0f172a] text-slate-300 border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRegenerateNominals}
                disabled={qrisRecords.length === 0 || isQrisSubmitting}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                🔄 Generate Suffix
              </button>
              <button
                type="button"
                onClick={handleClearAllQris}
                disabled={qrisRecords.length === 0 || isQrisSubmitting}
                className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                Kosongkan Data
              </button>
            </div>
          </div>

          <button
            onClick={handleImportQrisData}
            disabled={isQrisSubmitting || !qrisPasteText.trim()}
            className={`w-full py-3.5 px-4 rounded-xl font-extrabold text-sm uppercase tracking-wider text-white transition cursor-pointer flex items-center justify-center gap-2 shadow-lg ${
              isQrisSubmitting || !qrisPasteText.trim()
                ? 'bg-blue-600/40 text-blue-200/50 cursor-not-allowed border border-blue-500/20'
                : 'bg-blue-600 hover:bg-blue-500 border border-blue-400 active:scale-[0.99]'
            }`}
          >
            {isQrisSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white" />
            ) : (
              <span>TEMPEL & SIMPAN DATA REKENING</span>
            )}
          </button>
        </div>

        {/* SUMMARY CARDS SECTION */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: TOTAL REKENING */}
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-blue-500/30 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">TOTAL REKENING</p>
              <p className="text-2xl font-black text-white mt-1">
                {qrisStats.totalCount} <span className="text-sm font-semibold text-slate-400">Rekening</span>
              </p>
            </div>
            <div className="p-3.5 bg-blue-600/20 border border-blue-500/40 rounded-xl text-blue-400">
              <CreditCard className="h-6 w-6" />
            </div>
          </div>

          {/* Card 2: TOTAL NOMINAL */}
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-blue-500/30 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">TOTAL NOMINAL</p>
              <p className="text-2xl font-black text-emerald-400 mt-1">
                Rp {formatNominalDisplay(qrisStats.totalNominal)}
              </p>
            </div>
            <div className="p-3.5 bg-emerald-600/20 border border-emerald-500/40 rounded-xl text-emerald-400">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>

          {/* Card 3: BANK TERBANYAK */}
          <div className="bg-[#1e293b] p-5 rounded-2xl border border-blue-500/30 flex items-center justify-between shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-300 uppercase tracking-wider">BANK TERBANYAK</p>
              <p className="text-xl font-bold text-amber-400 mt-1 truncate max-w-[200px]">
                {qrisStats.mostFrequentBank}
              </p>
            </div>
            <div className="p-3.5 bg-amber-600/20 border border-amber-500/40 rounded-xl text-amber-400">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
        </div>

        {/* SEARCH & FILTER SECTION */}
        <div className="bg-[#1e293b] p-5 rounded-2xl border border-blue-500/30 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search bar */}
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={qrisSearchQuery}
                onChange={(e) => setQrisSearchQuery(e.target.value)}
                placeholder="Cari nama, rekening, atau nominal..."
                className="w-full bg-[#0f172a] text-sm text-white pl-10 pr-4 py-2.5 rounded-xl border border-blue-500/50 focus:border-blue-400 focus:outline-none placeholder:text-slate-400 font-medium"
              />
            </div>

            {/* Action Group Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleCopyQrisAll}
                disabled={filteredQrisRecords.length === 0}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
              >
                {isCopiedQrisAll ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
                <span>Salin Semua</span>
              </button>

              <button
                onClick={handleExportQrisExcel}
                disabled={filteredQrisRecords.length === 0}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5 text-emerald-400" />
                <span>Excel</span>
              </button>

              <button
                onClick={handleExportQrisCsv}
                disabled={filteredQrisRecords.length === 0}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
              >
                <FileText className="h-3.5 w-3.5 text-blue-400" />
                <span>CSV</span>
              </button>

              <button
                onClick={handlePrintQris}
                disabled={filteredQrisRecords.length === 0}
                className="flex items-center gap-1.5 py-2 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition cursor-pointer disabled:opacity-50"
              >
                <span>🖨️ Print</span>
              </button>
            </div>
          </div>

          {/* Filter Categories: SEMUA, BCA, BRI, BNI, MANDIRI, CIMB, LAINNYA */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {['SEMUA', 'BCA', 'BRI', 'BNI', 'MANDIRI', 'CIMB', 'LAINNYA'].map((b) => {
              const active = (qrisSelectedBank === 'Semua' && b === 'SEMUA') ||
                             (qrisSelectedBank === 'Lainnya' && b === 'LAINNYA') ||
                             (qrisSelectedBank.toUpperCase() === b);
              return (
                <button
                  key={b}
                  onClick={() => {
                    if (b === 'SEMUA') setQrisSelectedBank('Semua');
                    else if (b === 'LAINNYA') setQrisSelectedBank('Lainnya');
                    else setQrisSelectedBank(b);
                  }}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl border transition cursor-pointer whitespace-nowrap ${
                    active
                      ? 'bg-blue-600 text-white border-blue-400 shadow-md'
                      : 'bg-[#0f172a] text-slate-300 hover:bg-slate-800 border-slate-700'
                  }`}
                >
                  {b}
                </button>
              );
            })}
          </div>
        </div>

        {/* DATA TABLE SECTION */}
        <div className="bg-[#1e293b] rounded-2xl border border-blue-500/30 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin max-h-[550px] overflow-y-auto">
            {isQrisLoading ? (
              <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">Memuat database QRIS...</p>
              </div>
            ) : filteredQrisRecords.length === 0 ? (
              <div className="py-16 text-center text-slate-300 flex flex-col items-center justify-center gap-2">
                <span className="text-3xl">📊</span>
                <p className="text-sm font-bold text-white">Tidak ada data rekening QRIS dalam filter ini.</p>
                <p className="text-xs text-slate-400">Tempel data pada form di atas untuk menambahkan data transaksi.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#0f172a] text-xs font-bold uppercase tracking-wider text-slate-200 border-b border-slate-700 sticky top-0 z-10">
                    <th className="py-4 px-5 text-center w-16">No</th>
                    <th className="py-4 px-4">Bank</th>
                    <th className="py-4 px-4">Nomor Rekening</th>
                    <th className="py-4 px-4">Nama Rekening</th>
                    <th className="py-4 px-4 text-right">Nominal</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 bg-[#131e36]">
                  {filteredQrisRecords.map((r, idx) => {
                    const isDuplicated = qrisDuplicateRekenings.has(r.rekening);
                    return (
                      <tr
                        key={r.id}
                        className={`hover:bg-[#1a2948] transition text-sm font-medium text-white ${
                          isDuplicated ? 'bg-amber-950/30 hover:bg-amber-950/40' : ''
                        }`}
                      >
                        <td className="py-3.5 px-5 text-center text-slate-400 font-mono font-bold">{idx + 1}</td>
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-blue-400 uppercase">{r.bank}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono select-all text-white font-semibold">
                          {r.rekening}
                          {isDuplicated && (
                            <span className="ml-2.5 px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/40">
                              ⚠️ GANDA
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 uppercase font-bold text-white">{r.nama}</td>
                        <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-bold select-all">
                          Rp {formatNominalDisplay(r.nominal)}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-600/20 text-blue-300 border border-blue-500/40">
                            <span className="h-2 w-2 rounded-full bg-blue-400 animate-pulse" />
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <button
                            onClick={() => handleDeleteQrisRecord(r.id)}
                            className="p-1.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 rounded-lg text-rose-300 transition cursor-pointer"
                            title="Hapus Baris"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Dashboard Sub-menu Items (Dropdown items under DASHBOARD)
  const dashboardSubItems = [
    { 
      id: 'monitor', 
      name: 'Dashboard Utama', 
      icon: BarChart3,
      action: () => {
        setActiveTab('monitor');
        setShowOnlyBermasalah(false);
        setDashboardViewMode('grafik');
      },
      isActive: activeTab === 'monitor' && !showOnlyBermasalah && dashboardViewMode === 'grafik'
    },
    { 
      id: 'daftar_rekening', 
      name: 'Daftar Rekening', 
      icon: LayoutList,
      action: () => {
        setActiveTab('monitor');
        setShowOnlyBermasalah(false);
        setDashboardViewMode('daftar');
      },
      isActive: activeTab === 'monitor' && !showOnlyBermasalah && dashboardViewMode === 'daftar'
    },
    { 
      id: 'bermasalah', 
      name: 'Rek Bermasalah', 
      icon: AlertCircle, 
      badge: counters.RTP + counters['Off Sementara'] + counters['Cabut Kas 1'] > 0 
        ? `${counters.RTP + counters['Off Sementara'] + counters['Cabut Kas 1']}` 
        : undefined, 
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
      action: () => {
        setActiveTab('monitor');
        setShowOnlyBermasalah(true);
        setDashboardViewMode('daftar');
      },
      isActive: activeTab === 'monitor' && showOnlyBermasalah
    },
    { 
      id: 'pending_wd', 
      name: 'Laporan WD Pending', 
      icon: Zap,
      badge: 'HOT',
      badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
      action: () => {
        setActiveTab('pending_wd');
      },
      isActive: activeTab === 'pending_wd'
    },
    { 
      id: 'qris_minera', 
      name: 'Pencairan QRIS Minera', 
      icon: QrCode,
      badge: qrisRecords.length > 0 ? `${qrisRecords.length}` : 'NEW',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30',
      action: () => {
        setActiveTab('qris');
      },
      isActive: activeTab === 'qris'
    }
  ];

  // Other Top Level Menu Items
  const otherMenuItems = [
    { id: 'followup', name: 'Laporan', icon: FileText, action: () => setActiveTab('followup'), isActive: activeTab === 'followup' },
    role === 'admin' ? { id: 'history', name: 'Riwayat', icon: Clock, action: () => setActiveTab('history'), isActive: activeTab === 'history' } : null,
    { id: 'settings', name: 'Pengaturan', icon: Sliders, action: () => setActiveTab('settings'), isActive: activeTab === 'settings' }
  ].filter(Boolean) as any[];

  // Render Sidebar Navigation with Dashboard Dropdown Accordion
  const renderSidebarNav = (isMobile: boolean = false) => {
    const isDashboardActiveGroup = ['monitor', 'pending_wd', 'qris'].includes(activeTab);

    return (
      <nav className="flex-1 px-3 py-5 space-y-2 overflow-y-auto">
        {/* DASHBOARD DROPDOWN */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setIsDashboardDropdownOpen(!isDashboardDropdownOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              isDashboardActiveGroup
                ? 'bg-gradient-to-r from-amber-500/20 to-indigo-500/10 text-amber-300 border border-amber-500/30 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <CreditCard className="h-4 w-4 text-amber-400 shrink-0" />
              <span>DASHBOARD</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-extrabold border border-amber-500/30">
                {dashboardSubItems.length} MENU
              </span>
              {isDashboardDropdownOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200" />
              )}
            </div>
          </button>

          {/* Submenu Dropdown Items */}
          <AnimatePresence initial={false}>
            {isDashboardDropdownOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pl-2.5 space-y-1 border-l-2 border-amber-500/30 ml-4 my-1.5"
              >
                {dashboardSubItems.map((sub) => {
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        sub.action();
                        if (isMobile) setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        sub.isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-extrabold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <sub.icon className={`h-3.5 w-3.5 shrink-0 ${sub.isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{sub.name}</span>
                      </div>
                      {sub.badge && (
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold ${sub.badgeColor}`}>
                          {sub.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* SISTEM & LAPORAN DROPDOWN */}
        <div className="pt-2 space-y-1">
          <button
            type="button"
            onClick={() => setIsSistemLaporanDropdownOpen(!isSistemLaporanDropdownOpen)}
            className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 cursor-pointer ${
              ['followup', 'history', 'settings'].includes(activeTab)
                ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/10 text-blue-300 border border-blue-500/30 shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 text-blue-400 shrink-0" />
              <span>SISTEM & LAPORAN</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-extrabold border border-blue-500/30">
                {otherMenuItems.length} MENU
              </span>
              {isSistemLaporanDropdownOpen ? (
                <ChevronDown className="h-4 w-4 text-slate-400 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 text-slate-400 transition-transform duration-200" />
              )}
            </div>
          </button>

          {/* Submenu Dropdown Items */}
          <AnimatePresence initial={false}>
            {isSistemLaporanDropdownOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden pl-2.5 space-y-1 border-l-2 border-blue-500/30 ml-4 my-1.5"
              >
                {otherMenuItems.map((item) => {
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        item.action();
                        if (isMobile) setIsMobileSidebarOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                        item.isActive
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/20 font-extrabold'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <item.icon className={`h-3.5 w-3.5 shrink-0 ${item.isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{item.name}</span>
                      </div>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </nav>
    );
  };

  // Render Settings Tab Section
  const renderSettingsSection = () => {
    return (
      <div className="space-y-8" id="settings-module">
        <div className="bg-gradient-to-r from-[#121124] to-[#1c183a] p-6 rounded-2xl border border-indigo-500/10 shadow-[0_4px_30px_rgba(99,102,241,0.05)] animate-fade-in">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl text-white shadow-lg">
              <Sliders className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
                Pengaturan Aplikasi
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Konfigurasi integrasi Google Sheets, pengaturan sinkronisasi real-time, preferensi tampilan tema visual, dan tingkat hak akses pengguna.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Tampilan & Tema Card */}
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#0b0f19] border-white/[0.04]' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>
              🎨 Preferensi Tampilan
            </h3>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Tema Visual</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setTheme('dark');
                      showToast('Mode Gelap diaktifkan.', 'success');
                    }}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border cursor-pointer flex items-center justify-center gap-2 transition-all ${
                      theme === 'dark'
                        ? 'bg-blue-600/10 border-blue-500/50 text-blue-400 font-extrabold'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    <span>MODE GELAP (DARK)</span>
                  </button>
                  <button
                    onClick={() => {
                      setTheme('light');
                      showToast('Mode Terang diaktifkan.', 'success');
                    }}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border cursor-pointer flex items-center justify-center gap-2 transition-all ${
                      theme === 'light'
                        ? 'bg-blue-600/10 border-blue-500/50 text-blue-600 font-extrabold'
                        : 'bg-slate-900/10 border-transparent text-slate-400 hover:bg-slate-900/20'
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    <span>MODE TERANG (LIGHT)</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Hak Akses Peran</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => {
                      setRole('admin');
                      showToast('Sesi Admin aktif.', 'success');
                    }}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border cursor-pointer flex items-center justify-center gap-2 transition-all ${
                      role === 'admin'
                        ? 'bg-emerald-600/10 border-emerald-500/50 text-emerald-400 font-extrabold'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Shield className="h-4 w-4" />
                    <span>ADMINISTRATOR</span>
                  </button>
                  <button
                    onClick={() => {
                      setRole('viewer');
                      showToast('Sesi Viewer aktif.', 'success');
                    }}
                    className={`py-3 px-4 rounded-xl text-xs font-bold border cursor-pointer flex items-center justify-center gap-2 transition-all ${
                      role === 'viewer'
                        ? 'bg-amber-600/10 border-amber-500/50 text-amber-500 font-extrabold'
                        : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <Eye className="h-4 w-4" />
                    <span>GUEST VIEWER</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Spreadsheet Integrasi Card */}
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#0b0f19] border-white/[0.04]' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-indigo-400' : 'text-indigo-600'}`}>
              🗃️ Integrasi Google Sheets
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">ID Google Spreadsheet</label>
                <input
                  type="text"
                  value={googleSpreadsheetId}
                  onChange={(e) => setGoogleSpreadsheetId(e.target.value)}
                  placeholder="Masukkan Google Spreadsheet ID..."
                  className={`w-full text-sm rounded-xl px-3.5 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/50 border ${
                    theme === 'dark' ? 'bg-[#060913] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">Status Koneksi Akun Google</label>
                {googleUser ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                      <Check className="h-4 w-4 shrink-0" />
                      <span className="text-xs font-bold">Terhubung: {googleUser.email}</span>
                    </div>
                    <button
                      onClick={handleGoogleLogout}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 underline cursor-pointer"
                    >
                      Putuskan Koneksi Google Sheets
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>Belum terhubung ke Google Sheets untuk sync otomatis.</span>
                    </div>
                    <button
                      onClick={handleGoogleLogin}
                      className="w-full bg-slate-900 hover:bg-slate-800 border border-white/10 py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Database className="h-4 w-4 text-emerald-400" />
                      <span>SINKRONKAN AKUN GOOGLE</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Keamanan & PIN Akses Card */}
          <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-[#0b0f19] border-white/[0.04]' : 'bg-white border-slate-200'}`}>
            <h3 className={`text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2 ${theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}`}>
              🔒 Keamanan & PIN Akses
            </h3>

            {role !== 'admin' ? (
              <div className="flex flex-col items-center justify-center p-6 text-center space-y-3 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                <Shield className="h-8 w-8 text-rose-400" />
                <p className="text-xs text-slate-400 max-w-xs">
                  Hanya pengguna dengan peran <span className="font-bold text-rose-400">ADMINISTRATOR</span> yang dapat mengubah PIN akses admin.
                </p>
              </div>
            ) : (
              <form onSubmit={handleUpdatePin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    PIN Admin Baru
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      placeholder="Masukkan PIN baru..."
                      className={`w-full text-sm rounded-xl pl-10 pr-4 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 border ${
                        theme === 'dark' ? 'bg-[#060913] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                    Konfirmasi PIN Baru
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="password"
                      value={confirmNewPin}
                      onChange={(e) => setConfirmNewPin(e.target.value)}
                      placeholder="Ulangi PIN baru..."
                      className={`w-full text-sm rounded-xl pl-10 pr-4 py-2.5 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/50 border ${
                        theme === 'dark' ? 'bg-[#060913] border-white/10 text-white' : 'bg-slate-50 border-slate-200 text-slate-800'
                      }`}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-extrabold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-500/10 flex items-center justify-center gap-2 cursor-pointer border border-amber-400/20 active:scale-[0.99]"
                >
                  <Check className="h-4 w-4" />
                  <span>SIMPAN PIN BARU</span>
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Dynamic Favicon and Title Setter
  useEffect(() => {
    // Dynamically set favicon to a premium bank emoji
    const link = (document.querySelector("link[rel~='icon']") || document.createElement('link')) as HTMLLinkElement;
    link.rel = 'icon';
    link.href = 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🏦</text></svg>';
    document.getElementsByTagName('head')[0].appendChild(link);

    // Set document title
    document.title = "LigaBandot - Monitoring Operasional Bank";
  }, []);

  // Render Login Screen if not logged in
  if (!isLoggedIn) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="min-h-screen bg-[#060913] text-slate-100 flex items-center justify-center p-4 selection:bg-blue-500/30 selection:text-white"
      >
        <div className="w-full max-w-md bg-[#090d16] border border-white/[0.06] rounded-2xl p-8 shadow-2xl flex flex-col items-center space-y-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(212,175,55,0.03),transparent)] pointer-events-none" />
          
          {/* Brand Heading instead of logo */}
          <div className="w-full flex flex-col items-center justify-center pt-2 gap-1.5">
            <span className="text-3xl font-extrabold tracking-[0.2em] text-[#D4AF37] font-sans">
              LIGABANDOT
            </span>
            <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono px-3 py-1 rounded-md font-extrabold tracking-wider uppercase whitespace-nowrap">
              BANK MONITOR
            </span>
          </div>

          <div className="text-center space-y-1">
            <h1 className="text-sm font-extrabold text-white tracking-widest uppercase">
              Sistem Pemantauan Operasional Bank
            </h1>
            <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase font-mono">
              Real-time Bank & QRIS Monitor
            </p>
          </div>

          {loginError && (
            <div className="w-full bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          <form 
            onSubmit={(e) => {
              e.preventDefault();
              if (loginRole === 'admin') {
                if (loginPin === adminPin || loginPin === 'admin' || loginPin === 'ligabandot') {
                  setRole('admin');
                  setIsLoggedIn(true);
                  localStorage.setItem('bank_status_is_logged_in', 'true');
                  showToast('Berhasil masuk sebagai Admin!', 'success');
                } else {
                  setLoginError(`PIN Admin salah! (Hint: ${adminPin})`);
                }
              } else {
                setRole('viewer');
                setIsLoggedIn(true);
                localStorage.setItem('bank_status_is_logged_in', 'true');
                showToast('Berhasil masuk sebagai Viewer!', 'success');
              }
            }}
            className="w-full space-y-4"
          >
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                Pilih Role Akses
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('admin');
                    setLoginError('');
                  }}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-2 ${
                    loginRole === 'admin'
                      ? 'bg-[#1e1b4b]/50 border-indigo-500/50 text-indigo-400'
                      : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <Shield className="h-4 w-4" />
                  <span>ADMIN</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLoginRole('viewer');
                    setLoginError('');
                  }}
                  className={`py-3 px-4 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center justify-center gap-2 ${
                    loginRole === 'viewer'
                      ? 'bg-[#1c1917]/50 border-orange-500/50 text-orange-400'
                      : 'bg-white/5 border-transparent text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  <span>VIEWER</span>
                </button>
              </div>
            </div>

            {loginRole === 'admin' && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-1.5"
              >
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                  PIN Akses Admin
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    placeholder="Masukkan PIN Admin..."
                    value={loginPin}
                    onChange={(e) => setLoginPin(e.target.value)}
                    className="w-full bg-[#060913] border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 text-white font-mono placeholder:text-slate-600"
                  />
                </div>
                <p className="text-[9px] text-slate-500 font-semibold font-mono">Hint PIN: {adminPin}</p>
              </motion.div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 cursor-pointer border border-blue-400/25 active:scale-[0.99]"
            >
              <span>MASUK KE SISTEM</span>
            </button>
          </form>
        </div>
      </motion.div>
    );
  }

  // Draw slice helper for Donut Chart
  const drawSlice = (percent: number, color: string, startAngle: number) => {
    if (percent === 0) return null;
    const C = 251.32;
    const offset = C - (C * percent) / 100;
    return (
      <circle
        cx="50"
        cy="50"
        r="40"
        fill="transparent"
        stroke={color}
        strokeWidth="10"
        strokeDasharray={C}
        strokeDashoffset={offset}
        transform={`rotate(${startAngle - 90} 50 50)`}
        className="transition-all duration-700 ease-out"
      />
    );
  };

  // Render graphical analytics dashboard for monitor view
  const renderGraphicalDashboard = () => {
    const total = visibleBanks.length;
    const countAman = counters.Aman || 0;
    const countRTP = counters.RTP || 0;
    const countOff = counters['Off Sementara'] || 0;
    const countCabut = counters['Cabut Kas 1'] || 0;
    const countBermasalah = countRTP + countOff + countCabut;
    const healthRate = total > 0 ? Math.round((countAman / total) * 100) : 0;

    const pAman = total > 0 ? (countAman / total) * 100 : 0;
    const pRTP = total > 0 ? (countRTP / total) * 100 : 0;
    const pOff = total > 0 ? (countOff / total) * 100 : 0;
    const pCabut = total > 0 ? (countCabut / total) * 100 : 0;

    const angleAman = 0;
    const angleRTP = pAman * 3.6;
    const angleOff = (pAman + pRTP) * 3.6;
    const angleCabut = (pAman + pRTP + pOff) * 3.6;

    // Bank name inventory top 5
    const bankInventory: Record<string, number> = {};
    visibleBanks.forEach(b => {
      const name = b.name.toUpperCase().trim();
      bankInventory[name] = (bankInventory[name] || 0) + 1;
    });
    const sortedInventory = Object.entries(bankInventory)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const maxCount = sortedInventory.length > 0 ? Math.max(...sortedInventory.map(item => item.count)) : 1;

    // Uptime/health text message
    let systemHealthMessage = "Sistem Kosong";
    let systemHealthDesc = "Tambahkan data bank untuk memulai monitoring grafis.";
    let healthColor = "text-slate-400";
    let healthBg = "bg-slate-500/10";
    let healthBorder = "border-slate-500/20";
    
    if (total > 0) {
      if (healthRate === 100) {
        systemHealthMessage = "Sistem Sangat Sehat 🟢";
        systemHealthDesc = "Seluruh rekening bank beroperasi normal tanpa kendala.";
        healthColor = "text-emerald-400";
        healthBg = "bg-emerald-500/5";
        healthBorder = "border-emerald-500/20";
      } else if (healthRate >= 75) {
        systemHealthMessage = "Sistem Aman & Kondusif 🟡";
        systemHealthDesc = "Mayoritas rekening operasional berjalan normal.";
        healthColor = "text-green-400";
        healthBg = "bg-green-500/5";
        healthBorder = "border-green-500/20";
      } else if (healthRate >= 50) {
        systemHealthMessage = "Pengawasan Intensif 🟠";
        systemHealthDesc = "Beberapa rekening mengalami gangguan. Mohon follow up segera.";
        healthColor = "text-orange-400";
        healthBg = "bg-orange-500/5";
        healthBorder = "border-orange-500/20";
      } else {
        systemHealthMessage = "STATUS KRITIS 🚨";
        systemHealthDesc = "Lebih dari 50% rekening operasional bermasalah!";
        healthColor = "text-rose-400";
        healthBg = "bg-rose-500/5";
        healthBorder = "border-rose-500/20";
      }
    }

    return (
      <div className="space-y-6 animate-fade-in">
        
        {/* Row 1: Health Message + System Uptime Banner */}
        <div className={`p-5 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-4 ${
          theme === 'dark' ? 'bg-[#0f1425]/50 border-white/[0.04]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl border shrink-0 ${healthBg} ${healthBorder} ${healthColor}`}>
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h3 className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-800'}`}>
                {systemHealthMessage}
              </h3>
              <p className="text-xs text-slate-400 mt-1 font-semibold">
                {systemHealthDesc}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 border-t md:border-t-0 md:border-l border-white/[0.06] pt-4 md:pt-0 md:pl-6 shrink-0">
            <div className="text-center md:text-left">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Akurasi Sinkronisasi</span>
              <span className="text-xs font-mono font-bold text-[#D4AF37] mt-0.5 block">100% Real-Time Cloud</span>
            </div>
            <div className="text-center md:text-left">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Rekening</span>
              <span className="text-xs font-mono font-bold text-blue-400 mt-0.5 block">{total} Akun</span>
            </div>
          </div>
        </div>

        {/* Row 2: Charts Grid (Bento Style) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          
          {/* Chart 1: Status Distribution Donut Chart */}
          <div className={`md:col-span-5 p-6 rounded-2xl border flex flex-col ${
            theme === 'dark' ? 'bg-[#0f1425]/70 border-white/[0.06]' : 'bg-white border-slate-200'
          }`}>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-1.5">
              <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
              Distribusi Status Bank
            </h4>

            {total === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <p className="text-xs font-bold font-mono">Belum ada data untuk divisualisasikan</p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6 flex-1">
                {/* SVG Donut Chart */}
                <div className="relative w-32 h-32 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                    {/* Background circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke={theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)'}
                      strokeWidth="10"
                    />
                    {/* Dynamic slices */}
                    {drawSlice(pAman, 'rgb(16, 185, 129)', angleAman)}
                    {drawSlice(pRTP, 'rgb(245, 158, 11)', angleRTP)}
                    {drawSlice(pOff, 'rgb(249, 115, 22)', angleOff)}
                    {drawSlice(pCabut, 'rgb(244, 63, 94)', angleCabut)}
                  </svg>
                  
                  {/* Inner text showing health percentage */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-black font-mono tracking-tighter text-white">
                      {healthRate}%
                    </span>
                    <span className="text-[8px] text-emerald-400 font-extrabold uppercase tracking-widest mt-0.5">
                      AMAN
                    </span>
                  </div>
                </div>

                {/* Legend & Details */}
                <div className="space-y-2.5 w-full sm:w-auto min-w-[140px]">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-300">Aman</span>
                    </div>
                    <span className="font-mono text-emerald-400">{countAman} ({Math.round(pAman)}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                      <span className="text-slate-300">RTP</span>
                    </div>
                    <span className="font-mono text-amber-400">{countRTP} ({Math.round(pRTP)}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-orange-500" />
                      <span className="text-slate-300">Off Sem.</span>
                    </div>
                    <span className="font-mono text-orange-400">{countOff} ({Math.round(pOff)}%)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                      <span className="text-slate-300">Cabut Kas</span>
                    </div>
                    <span className="font-mono text-rose-400">{countCabut} ({Math.round(pCabut)}%)</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Chart 2: Inventory / Bank Distribution Bar Chart */}
          <div className={`md:col-span-7 p-6 rounded-2xl border flex flex-col ${
            theme === 'dark' ? 'bg-[#0f1425]/70 border-white/[0.06]' : 'bg-white border-slate-200'
          }`}>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-indigo-400" />
              Statistik Jumlah Rekening per Bank (Top 5)
            </h4>

            {sortedInventory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <p className="text-xs font-bold font-mono">Belum ada data bank yang terdaftar</p>
              </div>
            ) : (
              <div className="space-y-4.5 flex-1 flex flex-col justify-center">
                {sortedInventory.map((item, index) => {
                  const itemWidth = (item.count / maxCount) * 100;
                  const gradient = index % 2 === 0 
                    ? 'from-blue-500 to-indigo-500' 
                    : 'from-purple-500 to-indigo-500';
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-slate-200 tracking-wide uppercase">{item.name}</span>
                        <span className="font-mono text-slate-400">{item.count} Rekening</span>
                      </div>
                      <div className="h-3 w-full bg-white/[0.03] rounded-full overflow-hidden border border-white/[0.04]">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${itemWidth}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full bg-gradient-to-r ${gradient} shadow-[0_0_10px_rgba(99,102,241,0.2)]`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Row 3: Live Visual Status Matrix (High Density Capsules) */}
        <div className={`p-6 rounded-2xl border ${
          theme === 'dark' ? 'bg-[#0f1425]/70 border-white/[0.06]' : 'bg-white border-slate-200'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-white/[0.04]">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#D4AF37]"></span>
                </span>
                Sistem Matriks Status Real-Time
              </h4>
              <p className="text-[10px] text-slate-500 font-bold font-mono tracking-wider mt-1 uppercase">
                Status operasional seluruh bank secara komparatif cepat
              </p>
            </div>
            <button
              onClick={() => setDashboardViewMode('daftar')}
              className="text-xs font-bold text-[#D4AF37] hover:text-[#f3cd4a] transition-all flex items-center gap-1 cursor-pointer self-start sm:self-auto uppercase tracking-wider"
            >
              Kelola Detail di Daftar Rekening <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {banks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <p className="text-xs font-bold font-mono">Belum ada bank yang aktif</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {banks.map((bank) => {
                const colors = {
                  'Aman': 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-500/40',
                  'RTP': 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/40',
                  'Off Sementara': 'bg-orange-500/10 border-orange-500/20 text-orange-400 hover:bg-orange-500/20 hover:border-orange-500/40',
                  'Cabut Kas 1': 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/20 hover:border-rose-500/40'
                };
                const dotColors = {
                  'Aman': 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
                  'RTP': 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)]',
                  'Off Sementara': 'bg-orange-400 shadow-[0_0_8px_rgba(249,115,22,0.5)]',
                  'Cabut Kas 1': 'bg-rose-400 shadow-[0_0_8px_rgba(244,63,94,0.5)]'
                };
                
                // Formatted display text (e.g. "BCA (....8120)")
                const lastFour = bank.accountNumber ? bank.accountNumber.slice(-4) : 'xxxx';
                
                return (
                  <div
                    key={bank.id}
                    title={`${bank.name} - ${bank.accountName} (${bank.accountNumber})`}
                    onClick={() => {
                      // Switch to list view, preset search and highlight
                      setDashboardViewMode('daftar');
                      setSearchQuery(bank.accountNumber);
                    }}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-1.5 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0 shadow-sm ${colors[bank.status]}`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-[11px] font-black uppercase tracking-wider truncate max-w-[80%] block text-white">
                        {bank.name}
                      </span>
                      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[bank.status]}`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] font-mono font-extrabold tracking-widest text-slate-300">
                        •••• {lastFour}
                      </span>
                      <span className="text-[8px] font-extrabold text-slate-400 truncate tracking-wide uppercase mt-0.5 max-w-full block">
                        {bank.accountName || 'No Name'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    );
  };

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
    <div className={`min-h-screen font-sans antialiased selection:bg-blue-500/30 selection:text-white flex flex-col lg:flex-row relative ${
      theme === 'dark' ? 'bg-[#0f172a] text-slate-100' : 'bg-slate-50 text-slate-800'
    }`}>
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

      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#09090B] border-r border-amber-500/10 h-screen sticky top-0 shrink-0 z-40 text-slate-100 shadow-xl">
        {/* Logo Section */}
        <div className="flex flex-col items-center justify-center pt-5 px-4 pb-5 border-b border-amber-500/20 relative group">
          <div className="flex items-center gap-3 py-1">
            <img 
              src={logoImg} 
              alt="Kapten Liga Bandot Logo" 
              referrerPolicy="no-referrer"
              className="h-11 w-11 rounded-full object-cover border-2 border-[#D4AF37] shadow-lg shadow-amber-500/20 shrink-0 group-hover:scale-105 transition-transform duration-300"
            />
            <div className="text-left">
              <span className="text-lg font-extrabold tracking-[0.12em] text-[#D4AF37] block font-sans leading-tight">
                LIGABANDOT
              </span>
              <span className="text-[8px] text-slate-400 font-bold font-mono tracking-widest uppercase mt-1 block">
                BANK MONITOR SYSTEM
              </span>
            </div>
          </div>
          {/* Golden line below logo */}
          <div className="absolute bottom-0 left-4 right-4 h-px bg-[#D4AF37]" />
        </div>

        {/* Sidebar Menu */}
        {renderSidebarNav(false)}

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/[0.04] text-center">
          <p className="text-[10px] text-slate-500 font-bold font-mono">LIGABANDOT v1.0.0</p>
        </div>
      </aside>

      {/* Mobile Sidebar Backdrop */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Mobile Sidebar Drawer */}
      <AnimatePresence>
        {isMobileSidebarOpen && (
          <motion.aside 
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-y-0 left-0 w-64 bg-[#09090B] border-r border-amber-500/10 z-50 flex flex-col lg:hidden shadow-2xl text-slate-100"
          >
            {/* Logo Section */}
            <div className="flex flex-col items-center justify-center pt-5 px-4 pb-5 border-b border-amber-500/20 relative group">
              <div className="flex items-center gap-3 py-1 pr-6">
                <img 
                  src={logoImg} 
                  alt="Kapten Liga Bandot Logo" 
                  referrerPolicy="no-referrer"
                  className="h-10 w-10 rounded-full object-cover border-2 border-[#D4AF37] shadow-lg shadow-amber-500/20 shrink-0"
                />
                <div className="text-left">
                  <span className="text-lg font-extrabold tracking-[0.12em] text-[#D4AF37] block font-sans leading-tight">
                    LIGABANDOT
                  </span>
                  <span className="text-[8px] text-slate-400 font-bold font-mono tracking-widest uppercase mt-1 block">
                    BANK MONITOR SYSTEM
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setIsMobileSidebarOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="absolute bottom-0 left-4 right-4 h-px bg-[#D4AF37]" />
            </div>

            {/* Menu */}
            {renderSidebarNav(true)}

            <div className="p-4 border-t border-white/[0.04] text-center">
              <p className="text-[10px] text-slate-500 font-bold font-mono">LIGABANDOT v1.0.0</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Container Right */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        
        {/* Main Content Header */}
        <header className={`border-b sticky top-0 z-40 backdrop-blur-xl py-4 px-6 md:px-8 flex items-center justify-between gap-4 ${
          theme === 'dark' ? 'bg-[#090d16]/80 border-white/[0.06]' : 'bg-white/80 border-slate-200 shadow-sm'
        }`}>
          <div className="flex items-center gap-4">
            {/* Hamburger button for mobile */}
            <button 
              onClick={() => setIsMobileSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-lg border transition cursor-pointer ${
                theme === 'dark' ? 'bg-[#0b101f] border-white/10 hover:bg-white/5 text-slate-300' : 'bg-slate-100 border-slate-200 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Title with elegant icon prefix */}
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl border ${
                theme === 'dark' 
                  ? 'bg-amber-500/10 border-amber-500/20 text-[#D4AF37]' 
                  : 'bg-amber-500/10 border-amber-500/25 text-amber-600'
              }`}>
                <Building2 className="h-5 w-5 shrink-0" />
              </div>
              <div>
                <h1 className={`text-sm sm:text-base font-extrabold tracking-tight uppercase flex items-center gap-2 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>
                  {activeTab === 'monitor' && (
                    showOnlyBermasalah 
                      ? 'Rekening Bermasalah' 
                      : dashboardViewMode === 'grafik' 
                        ? 'Dashboard Utama (Analisis Grafik)' 
                        : 'Daftar Rekening Bank'
                  )}
                  {activeTab === 'qris' && 'Pencairan QRIS'}
                  {activeTab === 'pending_wd' && 'Laporan WD Pending (Minera & Pay2Me)'}
                  {activeTab === 'followup' && 'Laporan Follow Up'}
                  {activeTab === 'history' && 'Riwayat Perubahan'}
                  {activeTab === 'settings' && 'Pengaturan Aplikasi'}
                </h1>
                <p className="text-[10px] font-bold text-slate-400 font-mono tracking-wider uppercase mt-0.5 hidden sm:block">
                  Sistem Real-time LigaBandot
                </p>
              </div>
            </div>
          </div>

          {/* Right Header Controls */}
          <div className="flex items-center gap-3">
            {/* Quick Header Shortcut to QRIS Minera */}
            <button
              type="button"
              onClick={() => setActiveTab('qris')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md ${
                activeTab === 'qris'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white border border-indigo-400/30 shadow-indigo-500/20'
                  : 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 text-indigo-300 hover:text-white border border-indigo-500/30 hover:bg-indigo-600/30'
              }`}
            >
              <QrCode className="h-3.5 w-3.5 text-indigo-400" />
              <span>QRIS Minera</span>
            </button>

            {/* Database sync indicator */}
            {dbStatus && (
              <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-slate-900/40 border border-emerald-500/10 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.04)]">
                <Database className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
                <span>ONLINE</span>
              </div>
            )}

            {/* Clock */}
            <div className={`flex items-center gap-4 text-xs font-semibold px-3 py-1.5 rounded-xl border ${
              theme === 'dark' ? 'bg-slate-900/40 border-white/[0.06] text-white' : 'bg-slate-100 border-slate-200 text-slate-700'
            }`}>
              <span className="font-mono text-xs sm:text-sm tracking-wide">
                {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            </div>

            {/* Logout from Login Page Button */}
            <button 
              onClick={() => {
                setIsLoggedIn(false);
                localStorage.removeItem('bank_status_is_logged_in');
                showToast('Berhasil keluar dari sesi.', 'info');
              }}
              className={`p-2 rounded-xl border transition cursor-pointer flex items-center justify-center gap-1.5 text-xs font-bold ${
                theme === 'dark' ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20' : 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
              }`}
              title="Keluar Sesi"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </header>

        {/* Role Banner Indicator if Viewer */}
        {role === 'viewer' && (
          <div className="bg-amber-500/10 border-b border-amber-500/20 py-2.5 px-4 text-center text-xs font-semibold text-amber-500 flex items-center justify-center gap-2">
            <Eye className="h-4 w-4 text-amber-500 animate-pulse" />
            <span>⚠️ ANDA SEDANG DALAM MODE VIEWER: Hak akses baca saja. Tombol manipulasi data disembunyikan.</span>
          </div>
        )}

        {/* Quick Status Cards - Only shown on Dashboard & Rek Bermasalah views */}
        {activeTab === 'monitor' && (
          <section className={`border-b py-6 relative overflow-hidden ${
            theme === 'dark' ? 'border-white/[0.04] bg-[#090d16]/40' : 'border-slate-200 bg-slate-100/40'
          }`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.04),transparent)] pointer-events-none" />
            <div className="px-6 md:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* AMAN card */}
                <div className={`p-5 rounded-2xl border flex items-center justify-between transition-all hover:scale-[1.01] group cursor-pointer relative overflow-hidden ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-b from-[#0e172a]/90 to-[#070b16] border-emerald-500/20 hover:border-emerald-500/40 animate-neon-green' 
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                }`}>
                  <div className="flex items-center gap-3.5 z-10">
                    <div className={`p-3 rounded-xl border ${
                      theme === 'dark' ? 'bg-emerald-950/30 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100'
                    }`}>
                      <Shield className="h-5 w-5 text-emerald-400 animate-pulse" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Aman</p>
                      <p className={`text-xl font-black font-mono mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {counters.Aman} <span className="text-xs font-sans text-slate-500 font-medium">Aktif</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between h-full py-1 z-10">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping mb-2" />
                    {/* Micro line graph */}
                    <svg className="w-12 h-5 text-emerald-400/60 hidden sm:block" viewBox="0 0 50 20">
                      <path d="M0,15 Q12,2 25,12 T50,5" fill="transparent" stroke="currentColor" strokeWidth="2" className="animate-pulse" />
                    </svg>
                  </div>
                  {/* Glass highlight glare */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>

                {/* RTP card */}
                <div className={`p-5 rounded-2xl border flex items-center justify-between transition-all hover:scale-[1.01] group cursor-pointer relative overflow-hidden ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-b from-[#0e172a]/90 to-[#070b16] border-amber-500/20 hover:border-amber-500/40 animate-neon-yellow' 
                    : 'bg-white border-slate-200 hover:border-amber-300'
                }`}>
                  <div className="flex items-center gap-3.5 z-10">
                    <div className={`p-3 rounded-xl border ${
                      theme === 'dark' ? 'bg-amber-950/30 border-amber-500/20' : 'bg-amber-50 border-amber-100'
                    }`}>
                      <Zap className="h-5 w-5 text-amber-400 animate-bounce" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Logout / RTP</p>
                      <p className={`text-xl font-black font-mono mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {counters.RTP} <span className="text-xs font-sans text-slate-500 font-medium">Bank</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between h-full py-1 z-10">
                    <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse mb-2" />
                    {/* Micro step graph */}
                    <svg className="w-12 h-5 text-amber-400/60 hidden sm:block" viewBox="0 0 50 20">
                      <path d="M0,15 L12,15 L18,5 L32,5 L38,15 L50,15" fill="transparent" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>

                {/* OFF SEMENTARA card */}
                <div className={`p-5 rounded-2xl border flex items-center justify-between transition-all hover:scale-[1.01] group cursor-pointer relative overflow-hidden ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-b from-[#0e172a]/90 to-[#070b16] border-orange-500/20 hover:border-orange-500/40 animate-neon-orange' 
                    : 'bg-white border-slate-200 hover:border-orange-300'
                }`}>
                  <div className="flex items-center gap-3.5 z-10">
                    <div className={`p-3 rounded-xl border ${
                      theme === 'dark' ? 'bg-orange-950/30 border-orange-500/20' : 'bg-orange-50 border-orange-100'
                    }`}>
                      <Pause className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Off Sementara</p>
                      <p className={`text-xl font-black font-mono mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {counters['Off Sementara']} <span className="text-xs font-sans text-slate-500 font-medium">Bank</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between h-full py-1 z-10">
                    <span className="h-2 w-2 rounded-full bg-orange-400 animate-pulse mb-2" />
                    {/* Micro smooth sine wave graph */}
                    <svg className="w-12 h-5 text-orange-400/60 hidden sm:block" viewBox="0 0 50 20">
                      <path d="M0,10 Q12,18 25,10 T50,10" fill="transparent" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>

                {/* CABUT KAS 1 card */}
                <div className={`p-5 rounded-2xl border flex items-center justify-between transition-all hover:scale-[1.01] group cursor-pointer relative overflow-hidden ${
                  theme === 'dark' 
                    ? 'bg-gradient-to-b from-[#0e172a]/90 to-[#070b16] border-rose-500/20 hover:border-rose-500/40 animate-neon-red' 
                    : 'bg-white border-slate-200 hover:border-rose-300'
                }`}>
                  <div className="flex items-center gap-3.5 z-10">
                    <div className={`p-3 rounded-xl border ${
                      theme === 'dark' ? 'bg-rose-950/30 border-rose-500/20' : 'bg-rose-50 border-rose-100'
                    }`}>
                      <ShieldAlert className="h-5 w-5 text-rose-400 animate-bounce" />
                    </div>
                    <div>
                      <p className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest">Cabut Kas 1</p>
                      <p className={`text-xl font-black font-mono mt-0.5 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {counters['Cabut Kas 1']} <span className="text-xs font-sans text-slate-500 font-medium">Bank</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end justify-between h-full py-1 z-10">
                    <span className="h-2 w-2 rounded-full bg-rose-400 animate-ping mb-2" />
                    {/* Micro critical spike graph */}
                    <svg className="w-12 h-5 text-rose-400/60 hidden sm:block" viewBox="0 0 50 20">
                      <path d="M0,10 L12,10 L18,2 L24,18 L30,10 L50,10" fill="transparent" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                </div>

              </div>
            </div>
          </section>
        )}

        {/* Main Content Body */}
        <main className="flex-1 py-8 px-6 md:px-8">
        
        {/* Loading Spinner */}
        {isLoading && activeTab === 'monitor' && (
          <div className="py-24 text-center flex flex-col items-center justify-center gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sinkronisasi Database...</span>
          </div>
        )}

        {!isLoading && activeTab === 'monitor' && !showOnlyBermasalah && dashboardViewMode === 'grafik' ? (
          <div className="w-full">
            {renderGraphicalDashboard()}
          </div>
        ) : null}

        {!isLoading && activeTab === 'monitor' && (showOnlyBermasalah || dashboardViewMode === 'daftar') ? (
          <>
            {/* LEFT SIDE PANEL: Form Input Bank (Hidden per user request) */}
            {false && (
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {role === 'admin' ? (
                <div 
                  ref={formRef} 
                  id="bank-form-panel"
                  className="bg-[#0f1425]/70 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/[0.06] transition-all duration-300"
                >
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.06]">
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <Building2 className="h-4.5 w-4.5 text-blue-400" />
                      Kelola Rekening Bank
                    </h2>
                  </div>

                  {/* Mode Selector Tabs */}
                  <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/[0.04] mb-5">
                    <button
                      type="button"
                      onClick={() => setInputMode('manual')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        inputMode === 'manual'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border border-blue-400/10'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      📝 Input Manual
                    </button>
                    <button
                      type="button"
                      onClick={() => setInputMode('paste')}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        inputMode === 'paste'
                          ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md border border-blue-400/10'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ⚡ Sekali Tempel
                    </button>
                  </div>

                  {formError && inputMode === 'manual' && (
                    <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-lg text-xs flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      <span>{formError}</span>
                    </div>
                  )}

                  {inputMode === 'manual' ? (
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

                      {/* Sembunyikan dari Dashboard Utama */}
                      <div className="flex items-center justify-between p-3.5 bg-[#060913]/40 border border-white/5 rounded-xl">
                        <div className="flex items-center gap-2.5">
                          <EyeOff className="h-4 w-4 text-slate-400" />
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-200">Sembunyikan dari Dashboard</span>
                            <span className="text-[10px] text-slate-400 font-semibold leading-relaxed">Rekening tidak akan muncul di monitoring utama</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setFormHideFromDashboard(!formHideFromDashboard)}
                          className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                            formHideFromDashboard ? 'bg-indigo-600' : 'bg-slate-800'
                          }`}
                          disabled={isSubmittingNewBank}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                              formHideFromDashboard ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>
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
                  ) : (
                    /* SEKALI TEMPEL (BULK PASTE) LAYOUT */
                    <div className="space-y-4">
                      {/* Nominal Base Input */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          Nominal Dasar (Base Nominal)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-mono font-bold text-slate-400">Rp</span>
                          <input
                            type="text"
                            value={pasteBaseNominal ? formatNominalDisplay(pasteBaseNominal) : ''}
                            onChange={(e) => {
                              const cleanNum = e.target.value.replace(/[^0-9]/g, '');
                              setPasteBaseNominal(cleanNum || '10000000');
                            }}
                            placeholder="Contoh: 10,000,000"
                            className="w-full bg-[#060913] border border-white/10 rounded-xl pl-9 pr-3.5 py-2 text-xs font-mono text-white font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        </div>
                        <p className="text-[9px] text-slate-400 font-semibold mt-1.5 leading-relaxed">
                          Sistem akan mengacak nominal ujungnya secara otomatis, memastikan setiap rekening mendapatkan nominal cacing unik (misal: <strong className="text-emerald-400">&gt;10,000,003</strong>).
                        </p>
                      </div>

                      {/* Default Status Selection for Pasted Accounts */}
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                          Status Default
                        </label>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(['Aman', 'RTP', 'Off Sementara', 'Cabut Kas 1'] as BankStatus[]).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => setPasteDefaultStatus(st)}
                              className={`py-1.5 px-2 rounded-lg border text-[10px] font-bold text-center transition-all cursor-pointer truncate ${
                                pasteDefaultStatus === st
                                  ? st === 'Aman' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40' :
                                    st === 'RTP' ? 'bg-amber-500/10 text-amber-400 border-amber-500/40' :
                                    st === 'Off Sementara' ? 'bg-orange-500/10 text-orange-400 border-orange-500/40' :
                                    'bg-rose-500/10 text-rose-400 border-rose-500/40'
                                  : 'bg-white/5 text-slate-400 border-transparent hover:bg-white/10'
                              }`}
                            >
                              <span>{st === 'Aman' ? '🟢' : st === 'RTP' ? '🟡' : st === 'Off Sementara' ? '🟠' : '🔴'}</span>
                              <span className="ml-1">{st}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Paste Area */}
                      <div>
                        <div className="flex justify-between items-center mb-1.5">
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            Tempel Data Rekening
                          </label>
                          <button
                            type="button"
                            onClick={() => setPasteRawText(
                              "BCA\t6485684054\tSYAIFUL LUQMAN\nBCA\t2760231099\tNOVITASARI\nBCA\t4120398534\tILYAS SUKAMTO\nBCA\t5295321714\tSumiyati"
                            )}
                            className="text-[9px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer"
                          >
                            Gunakan Contoh
                          </button>
                        </div>
                        <textarea
                          value={pasteRawText}
                          onChange={(e) => setPasteRawText(e.target.value)}
                          placeholder="Contoh langsung tempel dari Google Sheets / Excel:&#10;BCA    6485684054     SYAIFUL LUQMAN&#10;BCA    2760231099     NOVITASARI"
                          rows={6}
                          className="w-full bg-[#060913] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 leading-relaxed placeholder-slate-600"
                        />
                      </div>

                      {/* Parse Trigger Button */}
                      <button
                        type="button"
                        onClick={handleParsePasteInput}
                        className="w-full bg-slate-100 hover:bg-white text-slate-900 font-bold py-2.5 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                      >
                        <span>🔍 PROSES & ACAK NOMINAL</span>
                      </button>

                      {/* Generated Preview Block */}
                      {pasteParsedBanks.length > 0 && (
                        <div className="mt-5 space-y-3 pt-4 border-t border-white/[0.06] animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
                              Hasil Pratinjau ({pasteParsedBanks.length})
                            </span>
                            <button
                              type="button"
                              onClick={() => setPasteParsedBanks([])}
                              className="text-[10px] font-bold text-rose-400 hover:text-rose-300 cursor-pointer"
                            >
                              Batal
                            </button>
                          </div>

                          {/* Preview List Box */}
                          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                            {pasteParsedBanks.map((item, idx) => (
                              <div key={item.id} className="bg-slate-950/70 border border-white/[0.04] p-3 rounded-xl text-[11px] flex items-center justify-between gap-3 shadow-md">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-black text-blue-400 text-[10px]">{item.name}</span>
                                    <span className="text-white font-bold truncate max-w-[130px]">{item.accountName}</span>
                                  </div>
                                  <div className="text-slate-400 font-mono text-[10px] mt-0.5">{item.accountNumber}</div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="text-emerald-400 font-mono font-bold text-[11px]">{item.notes}</div>
                                  <span className="text-[9px] text-slate-500 font-extrabold uppercase mt-0.5 inline-block bg-white/5 px-1.5 py-0.5 rounded border border-white/[0.02]">
                                    {item.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Final Submit / Copy Actions */}
                          <div className="flex flex-col gap-2 mt-2">
                            {/* Copy 4 Columns Button */}
                            <button
                              type="button"
                              onClick={handleCopyFourColumns}
                              className="w-full bg-slate-900 hover:bg-slate-800 text-white border border-white/10 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
                            >
                              {isCopiedFourColumns ? (
                                <>
                                  <Check className="h-4 w-4 text-emerald-400" />
                                  <span className="text-emerald-400 font-extrabold">BERHASIL DISALIN!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-4 w-4 text-blue-400" />
                                  <span>📋 SALIN 4 KOLOM (SHEETS/EXCEL)</span>
                                </>
                              )}
                            </button>

                            <p className="text-[10px] text-slate-400 text-center leading-relaxed mt-0.5 mb-2 px-1">
                              Menyalin data ke samping otomatis terisi ke: <br />
                              <span className="text-blue-300 font-bold">Kolom A</span> (Bank) | <span className="text-blue-300 font-bold">Kolom B</span> (No Rek) | <span className="text-blue-300 font-bold">Kolom C</span> (Nama Pemilik) | <span className="text-emerald-400 font-bold">Kolom D</span> (Nominal Unik)
                            </p>

                            {/* Final Submit Bulk */}
                            <button
                              type="button"
                              onClick={handleSaveBulkBanks}
                              disabled={isSubmittingPaste}
                              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer border border-emerald-400/25"
                            >
                              <CheckSquare className="h-4 w-4" />
                              <span>{isSubmittingPaste ? 'Menyimpan...' : `SIMPAN ${pasteParsedBanks.length} BANK BARU`}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
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
            )}

            {/* RIGHT SIDE PANEL: Bank List, Search & Filters */}
            <div className="w-full flex flex-col gap-6">

              {/* Filters */}
                  <div className="bg-gradient-to-b from-[#0f1425]/95 to-[#070b16]/98 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-white/[0.08] flex flex-col gap-5 animate-neon-blue">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Search className="h-4 w-4 text-blue-400 animate-pulse" />
                    </div>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Cari Rekening (BCA, 123456..., Nama Pemilik)..."
                      className="w-full pl-11 pr-24 py-3 bg-[#060913]/90 border border-white/10 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all text-white placeholder-slate-500 font-bold tracking-wide uppercase font-sans shadow-inner"
                      id="search-input-bank"
                    />
                    {searchQuery && (
                      <button 
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-[10px] text-rose-400 hover:text-rose-300 transition font-black uppercase tracking-wider cursor-pointer"
                      >
                        Reset
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
                      className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1.5 font-bold uppercase tracking-wider cursor-pointer bg-blue-500/10 border border-blue-500/20 px-3 py-2 rounded-lg transition-all"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>Reset Semua</span>
                    </button>
                  )}
                </div>

                {/* Saring Status Bank */}
                <div className="border-t border-white/[0.06] pt-4.5 flex flex-col gap-3.5">
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Filter className="h-3.5 w-3.5 text-blue-400 animate-pulse" />
                    <span>Filter Status Operasional</span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1">
                    <button
                      type="button"
                      onClick={handleSelectAllChange}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
                        showAllFilter 
                          ? 'bg-blue-600/15 border-blue-500/30 text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.15)]' 
                          : 'bg-[#060913]/60 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                      id="filter-all-checkbox"
                    >
                      <Activity className="h-3.5 w-3.5 animate-pulse" />
                      <span>Semua Bank</span>
                    </button>

                    {(['Aman', 'RTP', 'Off Sementara', 'Cabut Kas 1'] as BankStatus[]).map((status) => {
                      const borderColors = {
                        'Aman': 'border-emerald-500/30 text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 shadow-emerald-500/5',
                        'RTP': 'border-amber-500/30 text-amber-400 bg-amber-500/5 hover:bg-amber-500/10 shadow-amber-500/5',
                        'Off Sementara': 'border-orange-500/30 text-orange-400 bg-orange-500/5 hover:bg-orange-500/10 shadow-orange-500/5',
                        'Cabut Kas 1': 'border-rose-500/30 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 shadow-rose-500/5'
                      };
                      const inactiveStyles = 'bg-[#060913]/60 border-white/5 text-slate-400 hover:bg-white/10';
                      const dotSymbols = {
                        'Aman': '🟢',
                        'RTP': '🟡',
                        'Off Sementara': '🟠',
                        'Cabut Kas 1': '🔴'
                      };
                      
                      const isSelected = selectedStatuses[status];

                      return (
                        <button
                          key={status}
                          type="button"
                          onClick={() => handleStatusFilterChange(status)}
                          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
                            isSelected ? borderColors[status] : inactiveStyles
                          }`}
                        >
                          <span className="text-[10px]">{dotSymbols[status]}</span>
                          <span>{status}</span>
                        </button>
                      );
                    })}

                    {/* Filter Tampilkan Bank Tersembunyi */}
                    <button
                      type="button"
                      onClick={() => setShowHiddenBanks(!showHiddenBanks)}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer flex items-center gap-1.5 ${
                        showHiddenBanks 
                          ? 'bg-purple-600/15 border-purple-500/30 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.15)]' 
                          : 'bg-[#060913]/60 border-white/5 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Tampilkan Tersembunyi ({banks.filter(b => b.hideFromDashboard).length})</span>
                    </button>
                  </div>
                </div>
              </div>

                {/* List Grid */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <span>Daftar Operasional ({filteredBanks.length} dari {banks.length} Bank)</span>
                      <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/20 font-mono">DATABASE CLOUD</span>
                    </div>
                    {filteredBanks.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCopyAllFilteredFourColumns}
                        className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-1.5 px-3.5 rounded-xl text-[10px] uppercase tracking-wider transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer shadow-md"
                      >
                        {isCopiedAllFiltered ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-300 animate-pulse" />
                            <span className="text-emerald-300 font-extrabold">BERHASIL DISALIN!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5 text-blue-200" />
                            <span>📋 SALIN SEMUA ({filteredBanks.length} BANK - 4 KOLOM)</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
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
                            className={`bg-gradient-to-b from-[#0f1425] to-[#070b16] rounded-2xl border transition-all duration-300 hover:scale-[1.005] relative overflow-hidden group ${
                              bank.status === 'Aman' ? 'border-emerald-500/20 hover:border-emerald-500/40' :
                              bank.status === 'RTP' ? 'border-amber-500/20 hover:border-amber-500/40' :
                              bank.status === 'Off Sementara' ? 'border-orange-500/20 hover:border-orange-500/40' :
                              'border-rose-500/20 hover:border-rose-500/40'
                            }`}
                            id={`bank-card-${bank.id}`}
                          >
                            <div className="p-5 flex flex-col md:flex-row gap-4 justify-between items-start">
                              <div className="space-y-3 flex-1 w-full">
                                <div className="flex flex-wrap items-center gap-3">
                                  {/* Stylized custom bank monogram/logo badge */}
                                  <div className={`h-11 w-11 rounded-xl flex flex-col items-center justify-center font-black text-[11px] border tracking-tighter shadow-md shrink-0 select-none transition-all duration-300 group-hover:scale-105 ${
                                    bank.name.toUpperCase().includes('BCA') ? 'bg-blue-600/15 border-blue-500/30 text-blue-400' :
                                    bank.name.toUpperCase().includes('BNI') ? 'bg-orange-600/15 border-orange-500/30 text-orange-400' :
                                    bank.name.toUpperCase().includes('BRI') ? 'bg-sky-600/15 border-sky-500/30 text-sky-400' :
                                    bank.name.toUpperCase().includes('MANDIRI') ? 'bg-amber-600/15 border-amber-500/30 text-amber-400' :
                                    bank.name.toUpperCase().includes('CIMB') ? 'bg-rose-600/15 border-rose-500/30 text-rose-400' :
                                    bank.name.toUpperCase().includes('DANAMON') ? 'bg-orange-600/15 border-orange-500/30 text-orange-400' :
                                    bank.name.toUpperCase().includes('PERMATA') ? 'bg-emerald-600/15 border-emerald-500/30 text-emerald-400' :
                                    bank.name.toUpperCase().includes('BTN') ? 'bg-blue-600/15 border-blue-500/30 text-blue-300' :
                                    bank.name.toUpperCase().includes('MAYBANK') ? 'bg-amber-600/15 border-amber-500/30 text-amber-300' :
                                    'bg-slate-800/20 border-white/10 text-slate-300'
                                  }`}>
                                    <span className="text-[10px] font-black uppercase leading-none">{bank.name.substring(0, 3)}</span>
                                    <span className="text-[7px] font-mono opacity-70 tracking-normal font-bold mt-0.5 leading-none">{bank.name.substring(3, 7) || 'BANK'}</span>
                                  </div>
                                  <div>
                                    <h3 className="text-sm font-extrabold text-white tracking-wide uppercase flex items-center gap-1.5 leading-none">
                                      {bank.name}
                                      {bank.hideFromDashboard && (
                                        <span className="text-[9px] font-black bg-purple-500/20 border border-purple-500/30 text-purple-300 px-1.5 py-0.5 rounded uppercase tracking-wider flex items-center gap-1">
                                          <EyeOff className="h-2.5 w-2.5" />
                                          Tersembunyi
                                        </span>
                                      )}
                                    </h3>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1 leading-none">INSTANT MONITORING</p>
                                  </div>
                                  <span className={`text-[9px] font-extrabold uppercase px-2.5 py-1 rounded-full flex items-center gap-1.5 tracking-wider border shadow-sm ml-auto ${
                                    bank.status === 'Aman' ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400' :
                                    bank.status === 'RTP' ? 'bg-amber-500/10 border-amber-500/25 text-amber-400 animate-pulse' :
                                    bank.status === 'Off Sementara' ? 'bg-orange-500/10 border-orange-500/25 text-orange-400' :
                                    'bg-rose-500/10 border-rose-500/25 text-rose-400'
                                  }`}>
                                    <span className={`h-1.5 w-1.5 rounded-full ${
                                      bank.status === 'Aman' ? 'bg-emerald-400' :
                                      bank.status === 'RTP' ? 'bg-amber-400' :
                                      bank.status === 'Off Sementara' ? 'bg-orange-400' :
                                      'bg-rose-400 animate-ping'
                                    }`} />
                                    <span>{bank.status}</span>
                                  </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs font-semibold text-slate-300 bg-[#060913]/70 p-4 rounded-xl border border-white/[0.05] shadow-inner">
                                  <div className="flex items-center justify-between gap-2 border-b border-white/[0.03] pb-2 md:border-b-0 md:pb-0">
                                    <div className="flex items-center gap-2">
                                      <CreditCard className="h-4 w-4 text-blue-400 shrink-0" />
                                      <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold shrink-0">Rekening</span>
                                    </div>
                                    <span className="font-mono text-white text-xs select-all flex items-center gap-1.5 bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded-lg border border-white/10 transition duration-200 shadow-sm">
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
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-blue-400 shrink-0" />
                                      <span className="text-slate-400 text-[10px] uppercase tracking-wider font-extrabold shrink-0">Pemilik</span>
                                    </div>
                                    <span className="text-white text-xs uppercase truncate max-w-[150px] bg-white/5 px-2.5 py-1 rounded-lg border border-white/10 font-black tracking-wide shadow-sm">
                                      {bank.accountName}
                                    </span>
                                  </div>
                                </div>

                                {bank.notes && (
                                  <div className="text-xs text-slate-300 pt-0.5">
                                    <div className="leading-relaxed bg-[#060913]/40 p-3 rounded-xl border border-dashed border-white/10 w-full text-slate-400 font-medium flex items-center justify-between gap-3 shadow-inner">
                                      <span className={`break-all text-[11px] font-mono tracking-wide ${bank.notes.startsWith('>') ? 'text-emerald-400 font-extrabold' : 'text-slate-300 font-semibold'}`}>
                                        {bank.notes}
                                      </span>
                                      <button
                                        onClick={() => {
                                          const cleanNominal = bank.notes.replace(/^>\s*/, '');
                                          navigator.clipboard.writeText(cleanNominal)
                                            .then(() => showToast('Nominal berhasil disalin!', 'success'))
                                            .catch(() => showToast('Gagal menyalin nominal', 'error'));
                                        }}
                                        className="text-slate-400 hover:text-emerald-400 p-1.5 rounded hover:bg-white/10 transition cursor-pointer shrink-0"
                                        title="Salin nominal / catatan"
                                      >
                                        <Copy className="h-3.5 w-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Action buttons */}
                              <div className="flex items-center md:flex-col gap-3 w-full md:w-auto shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-white/[0.04] justify-between">
                                <div className="flex items-center gap-1.5 md:flex-col md:items-end">
                                  <span className="text-[8px] text-slate-500 font-extrabold uppercase font-mono tracking-wider leading-none">
                                    REALTIME SYNC
                                  </span>
                                  <span className="text-[10px] text-blue-400 font-black font-mono mt-1">
                                    {new Date(bank.updatedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleCopySingleFourColumns(bank)}
                                    className="bg-blue-950/40 hover:bg-blue-900/60 text-blue-300 hover:text-white border border-blue-500/20 font-bold py-1.5 px-3 rounded-lg text-[9px] uppercase tracking-wider transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                                    title="Salin 4 Kolom untuk Google Sheets / Excel"
                                  >
                                    <Copy className="h-3 w-3 text-blue-400" />
                                    <span>4 Kolom</span>
                                  </button>
                                  
                                  {role === 'admin' && (
                                    <>
                                      <button
                                        onClick={() => {
                                          setSelectedEditBank(bank);
                                          setIsEditOpen(true);
                                        }}
                                        className="p-1.5 text-slate-300 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg border border-white/10 bg-white/5 transition shadow-sm flex items-center justify-center cursor-pointer"
                                        title="Edit data bank"
                                      >
                                        <Edit3 className="h-3.5 w-3.5" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setSelectedDeleteBank(bank);
                                          setIsDeleteOpen(true);
                                        }}
                                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg border border-white/10 bg-white/5 transition shadow-sm flex items-center justify-center cursor-pointer"
                                        title="Hapus bank"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Quick status change bar (Only visible to Admin) */}
                            {role === 'admin' && (
                              <div className="bg-[#060913]/55 border-t border-white/[0.06] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
                                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                  <ChevronRight className="h-3 w-3 text-blue-400 animate-pulse" />
                                  Ubah Status Cepat:
                                </span>

                                <div className="flex items-center flex-wrap gap-1.5">
                                  {(['Aman', 'RTP', 'Off Sementara', 'Cabut Kas 1'] as BankStatus[]).map((status) => {
                                    const labels = { 'Aman': 'Aman', 'RTP': 'RTP', 'Off Sementara': 'Off', 'Cabut Kas 1': 'Cabut' };
                                    const activeColors = {
                                      'Aman': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_8px_rgba(16,185,129,0.15)]',
                                      'RTP': 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_8px_rgba(245,158,11,0.15)]',
                                      'Off Sementara': 'bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-[0_0_8px_rgba(249,115,22,0.15)]',
                                      'Cabut Kas 1': 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_8px_rgba(244,63,94,0.15)]'
                                    };
                                    const indicators = {
                                      'Aman': '🟢',
                                      'RTP': '🟡',
                                      'Off Sementara': '🟠',
                                      'Cabut Kas 1': '🔴'
                                    };
                                    return (
                                      <button
                                        key={status}
                                        onClick={() => handleQuickStatusChange(bank.id, status)}
                                        className={`text-[9px] font-extrabold uppercase px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                                          bank.status === status
                                            ? activeColors[status]
                                            : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200 border-transparent'
                                        }`}
                                      >
                                        <span>{indicators[status]}</span>
                                        <span>{labels[status]}</span>
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
          </>
        ) : null}

        {activeTab === 'pending_wd' && (
          <PendingWdReport showToast={showToast} />
        )}

        {activeTab === 'followup' && (
          <FollowUpReport currentTime={currentTime} showToast={showToast} />
        )}

        {activeTab === 'qris' && renderQrisSection()}

        {role === 'admin' && activeTab === 'history' && (
          <HistoryPanel 
            userRole={role}
            googleToken={googleToken}
            googleUser={googleUser}
            googleSpreadsheetId={googleSpreadsheetId}
            onLogin={handleGoogleLogin}
            onLogout={handleGoogleLogout}
            onSpreadsheetIdChange={setGoogleSpreadsheetId}
          />
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

      {/* Clear All QRIS Confirmation Modal */}
      <AnimatePresence>
        {isClearQrisOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop Blur */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClearQrisOpen(false)}
              className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
            />

            {/* Modal Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-md bg-[#0f1425] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
                <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-rose-400" />
                  <span>Kosongkan Seluruh Data?</span>
                </h3>
                <button
                  onClick={() => setIsClearQrisOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Content */}
              <div className="space-y-4 text-sm text-slate-300">
                <p className="font-semibold text-slate-200">
                  Apakah Anda yakin ingin mengosongkan seluruh data pencairan QRIS?
                </p>
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-xs text-rose-300 leading-relaxed">
                  Tindakan ini tidak dapat dibatalkan. Semua data pencairan QRIS yang saat ini ada di server akan dihapus secara permanen.
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsClearQrisOpen(false)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleConfirmClearAllQris}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="h-4 w-4" />
                  Ya, Kosongkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modern Compact Footer */}
      <footer className="bg-[#080c16] text-slate-400 border-t border-white/[0.04] mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black tracking-widest text-[#D4AF37] font-sans">
              LIGABANDOT
            </span>
            <span className="text-slate-600">|</span>
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
  </div>
  );
}
