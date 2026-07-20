import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertCircle, EyeOff } from 'lucide-react';
import { Bank, BankStatus } from '../types';

interface EditBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  bank: Bank | null;
  onSave: (updatedFields: Partial<Bank>) => Promise<void>;
}

export default function EditBankModal({ isOpen, onClose, bank, onSave }: EditBankModalProps) {
  const [formName, setFormName] = useState('');
  const [formAccountNumber, setFormAccountNumber] = useState('');
  const [formAccountName, setFormAccountName] = useState('');
  const [formStatus, setFormStatus] = useState<BankStatus>('Aman');
  const [formNotes, setFormNotes] = useState('');
  const [formHideFromDashboard, setFormHideFromDashboard] = useState(false);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (bank) {
      setFormName(bank.name);
      setFormAccountNumber(bank.accountNumber);
      setFormAccountName(bank.accountName);
      setFormStatus(bank.status);
      setFormNotes(bank.notes || '');
      setFormHideFromDashboard(!!bank.hideFromDashboard);
      setError('');
    }
  }, [bank, isOpen]);

  if (!bank) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError('Nama Bank wajib diisi');
      return;
    }
    if (!formAccountNumber.trim()) {
      setError('Nomor Rekening wajib diisi');
      return;
    }
    if (!formAccountName.trim()) {
      setError('Nama Rekening wajib diisi');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await onSave({
        name: formName.trim().toUpperCase(),
        accountNumber: formAccountNumber.trim(),
        accountName: formAccountName.trim().toUpperCase(),
        status: formStatus,
        notes: formNotes.trim(),
        hideFromDashboard: formHideFromDashboard,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan perubahan.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            className="relative w-full max-w-lg bg-[#0f1425] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>📝</span> EDIT DATA BANK
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3.5 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nama Bank */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Nama Bank
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: BCA, MANDIRI, BRI"
                  className="w-full bg-[#060913] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase text-white font-semibold"
                  disabled={isSaving}
                />
              </div>

              {/* Nomor Rekening */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Nomor Rekening
                </label>
                <input
                  type="text"
                  value={formAccountNumber}
                  onChange={(e) => setFormAccountNumber(e.target.value.replace(/[^0-9-]/g, ''))}
                  placeholder="Masukkan nomor rekening..."
                  className="w-full bg-[#060913] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono text-white"
                  disabled={isSaving}
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
                  onChange={(e) => setFormAccountName(e.target.value)}
                  placeholder="Masukkan nama pemilik rekening..."
                  className="w-full bg-[#060913] border border-white/10 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all uppercase text-white font-semibold"
                  disabled={isSaving}
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Status Operasional
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(['Aman', 'RTP', 'Off Sementara', 'Cabut Kas 1'] as BankStatus[]).map((status) => {
                    const dots = {
                      'Aman': '🟢',
                      'RTP': '🟡',
                      'Off Sementara': '🟠',
                      'Cabut Kas 1': '🔴'
                    };
                    const activeStyles = {
                      'Aman': 'bg-emerald-500/10 text-emerald-400 border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
                      'RTP': 'bg-amber-500/10 text-amber-400 border-amber-500/40 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
                      'Off Sementara': 'bg-orange-500/10 text-orange-400 border-orange-500/40 shadow-[0_0_15px_rgba(249,115,22,0.1)]',
                      'Cabut Kas 1': 'bg-rose-500/10 text-rose-400 border-rose-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]'
                    };
                    return (
                      <button
                        key={status}
                        type="button"
                        onClick={() => setFormStatus(status)}
                        className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold text-left transition-all cursor-pointer ${
                          formStatus === status
                            ? activeStyles[status]
                            : 'bg-white/5 text-slate-300 border-white/[0.04] hover:bg-white/10'
                        }`}
                        disabled={isSaving}
                      >
                        <span className="text-sm">{dots[status]}</span>
                        <span className="truncate">{status}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sembunyikan dari Dashboard Utama */}
              <div className="flex items-center justify-between p-3 bg-[#060913]/40 border border-white/5 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <EyeOff className="h-4 w-4 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-200">Sembunyikan dari Dashboard Utama</span>
                    <span className="text-[10px] text-slate-400 font-semibold leading-relaxed">Rekening tidak akan muncul di monitoring utama</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setFormHideFromDashboard(!formHideFromDashboard)}
                  className={`w-9 h-5 flex items-center rounded-full p-0.5 cursor-pointer transition-colors ${
                    formHideFromDashboard ? 'bg-indigo-600' : 'bg-slate-800'
                  }`}
                  disabled={isSaving}
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
                  disabled={isSaving}
                />
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition"
                  disabled={isSaving}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-blue-500/15 disabled:opacity-50 border border-blue-400/20"
                  disabled={isSaving}
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
