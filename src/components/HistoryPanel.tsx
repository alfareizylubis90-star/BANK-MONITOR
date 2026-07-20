import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, RefreshCw, Filter, ShieldAlert } from 'lucide-react';
import { HistoryRecord } from '../db/sheets';

interface HistoryPanelProps {
  userRole: 'admin' | 'viewer';
  googleToken: string | null;
  googleUser: any;
  googleSpreadsheetId: string;
  onLogin: () => void;
  onLogout: () => void;
  onSpreadsheetIdChange: (id: string) => void;
}

export default function HistoryPanel({
  userRole,
  googleToken,
  googleUser,
  googleSpreadsheetId,
  onLogin,
  onLogout,
  onSpreadsheetIdChange
}: HistoryPanelProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterAction, setFilterAction] = useState<string>('ALL');

  const fetchHistory = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/history');
      if (!response.ok) {
        throw new Error('Gagal memuat riwayat perubahan dari database.');
      }
      const data = await response.json();
      setHistory(data);
    } catch (err: any) {
      setError(err.message || 'Terjadi kesalahan saat memuat riwayat.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userRole === 'admin') {
      fetchHistory();
    }
  }, [userRole]);

  if (userRole !== 'admin') {
    return (
      <div className="bg-[#0f1425]/70 border border-white/[0.06] rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-4 max-w-lg mx-auto">
        <div className="bg-rose-500/10 p-4 rounded-full border border-rose-500/20 text-rose-400">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div>
          <h3 className="text-white font-bold text-base uppercase tracking-wider">Akses Terbatas</h3>
          <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
            Maaf, hanya pengguna dengan role <strong>Admin</strong> yang memiliki izin untuk melihat riwayat perubahan data bank.
          </p>
        </div>
      </div>
    );
  }

  const filteredHistory = history.filter(h => {
    if (filterAction === 'ALL') return true;
    return h.aksi === filterAction;
  });

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (e) {
      return isoStr;
    }
  };

  return (
    <div className="bg-[#0f1425]/70 backdrop-blur-md rounded-2xl p-6 border border-white/[0.06] shadow-2xl space-y-6">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
        <div>
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-blue-400" />
            RIWAYAT PERUBAHAN DATABASE (HISTORY SHEET)
          </h2>
          <p className="text-[10px] text-slate-400 font-semibold tracking-wide mt-0.5">
            Daftar audit log perubahan yang tersimpan langsung di Google Spreadsheet
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Action Filter */}
          <div className="flex items-center gap-1.5 bg-[#060913] border border-white/10 rounded-xl px-2.5 py-1.5">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={filterAction}
              onChange={(e) => setFilterAction(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold text-slate-200 focus:outline-none cursor-pointer uppercase"
            >
              <option value="ALL">Semua Aksi</option>
              <option value="CREATE">CREATE</option>
              <option value="EDIT">EDIT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>

          {/* Refresh button */}
          <button
            onClick={fetchHistory}
            className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
            title="Refresh riwayat"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Google Sheets Integration Card */}
      <div className="bg-[#060913]/40 border border-white/[0.05] rounded-xl p-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.02)]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className={`w-2.5 h-2.5 rounded-full ${googleToken ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <span>Integrasi Google Sheets</span>
              <span className={`text-[9px] px-1.5 py-0.5 rounded ${googleToken ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {googleToken ? 'AKTIF (SYNC)' : 'BELUM TERHUBUNG'}
              </span>
            </h3>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold leading-relaxed max-w-xl">
            {googleToken 
              ? `Terhubung sebagai ${googleUser?.email || 'Admin'}. Setiap perubahan status atau penambahan bank akan otomatis dicatat real-time pada tab "HISTORY" spreadsheet Anda.`
              : 'Hubungkan akun Google Anda dengan satu klik. Setelah terhubung, setiap aksi (CREATE/EDIT/DELETE) pada bank akan tercatat di sheet "HISTORY".'}
          </p>
        </div>

        <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Spreadsheet ID Input */}
          <div className="flex flex-col gap-1 w-full sm:w-64">
            <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">ID Spreadsheet Tujuan</label>
            <input
              type="text"
              value={googleSpreadsheetId}
              onChange={(e) => onSpreadsheetIdChange(e.target.value)}
              placeholder="Masukkan ID Spreadsheet..."
              className="bg-[#050811] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-blue-500/50 w-full"
            />
          </div>

          <div className="flex items-end gap-2 pt-4 sm:pt-0">
            {googleToken ? (
              <>
                <a
                  href={`https://docs.google.com/spreadsheets/d/${googleSpreadsheetId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 rounded-lg transition-all font-bold text-xs cursor-pointer whitespace-nowrap"
                >
                  Buka Sheet ↗
                </a>
                <button
                  onClick={onLogout}
                  className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 rounded-lg transition-all font-bold text-xs cursor-pointer whitespace-nowrap"
                >
                  Putuskan
                </button>
              </>
            ) : (
              <button
                onClick={onLogin}
                className="flex items-center gap-2 px-4 py-1.5 bg-white text-slate-900 rounded-lg hover:bg-slate-100 transition-all font-bold text-xs cursor-pointer shadow-md whitespace-nowrap"
              >
                <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.85z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.85c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span>Kaitkan Akun Google</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-xs">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="text-xs text-slate-400 font-semibold">Memuat riwayat perubahan dari Spreadsheet...</span>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="text-center py-16 bg-[#060913]/30 rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-2">
          <span className="text-2xl">⏳</span>
          <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wide">Tidak Ada Riwayat</h4>
          <p className="text-[10px] text-slate-400 max-w-xs font-semibold leading-relaxed">
            Belum ada log perubahan database yang sesuai dengan filter saat ini.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.04]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#060913] text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-white/[0.06]">
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-4">User Admin</th>
                <th className="py-3 px-4 text-center">Aksi</th>
                <th className="py-3 px-4">Nama Bank</th>
                <th className="py-3 px-4">Detail Perubahan / Info</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03] text-xs">
              {filteredHistory.map((item, index) => {
                const actionColors: Record<string, string> = {
                  'CREATE': 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
                  'EDIT': 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
                  'DELETE': 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                };
                return (
                  <motion.tr
                    key={item.id || index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02, duration: 0.15 }}
                    className="hover:bg-white/[0.01] transition-colors"
                  >
                    <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                      {formatDate(item.tanggal)}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-300">
                      {item.user}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider inline-block ${actionColors[item.aksi] || 'bg-slate-500/10 text-slate-400'}`}>
                        {item.aksi}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white uppercase">
                      {item.bank}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 font-medium">
                      {item.aksi === 'DELETE' ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-rose-400/90 text-[11px] font-semibold">Rekening Dihapus</span>
                          <span className="font-mono text-slate-400 text-[10px]">No Rek: {item.nomorRekening}</span>
                        </div>
                      ) : item.aksi === 'EDIT' ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-slate-400 text-[11px]">Status berubah:</span>
                          <span className="text-slate-400 text-[10px] line-through">{item.statusLama}</span>
                          <span className="text-slate-500">➜</span>
                          <span className="text-blue-400 font-semibold">{item.statusBaru}</span>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          <span className="text-emerald-400/90 text-[11px] font-semibold">Rekening Baru Dibuat</span>
                          <span className="font-mono text-slate-400 text-[10px]">No Rek: {item.nomorRekening}</span>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
