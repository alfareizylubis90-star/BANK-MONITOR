import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Clock, RefreshCw, Filter, ShieldAlert } from 'lucide-react';
import { HistoryRecord } from '../db/sheets';

interface HistoryPanelProps {
  userRole: 'admin' | 'viewer';
}

export default function HistoryPanel({ userRole }: HistoryPanelProps) {
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
