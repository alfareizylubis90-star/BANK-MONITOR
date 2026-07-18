import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';
import { Bank } from '../types';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  bank: Bank | null;
  onConfirm: () => Promise<void>;
}

export default function DeleteConfirmModal({ isOpen, onClose, bank, onConfirm }: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');

  if (!bank) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError('');
    try {
      await onConfirm();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus data.');
    } finally {
      setIsDeleting(false);
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
            className="relative w-full max-w-md bg-[#0f1425] border border-white/10 rounded-2xl shadow-2xl p-6 overflow-hidden z-10"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-4">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-rose-400" />
                <span>Hapus Data Bank?</span>
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/5 transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 p-3 rounded-xl text-xs">
                {error}
              </div>
            )}

            {/* Content */}
            <div className="space-y-4 text-sm text-slate-300">
              <p className="font-semibold text-slate-200">
                Apakah Anda yakin ingin menghapus rekening ini?
              </p>

              {/* Bank Details Container */}
              <div className="bg-[#060913]/80 border border-white/5 rounded-xl p-4 space-y-2.5 font-sans">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold text-[11px] uppercase tracking-widest w-28">Bank :</span>
                  <span className="text-white font-bold uppercase">{bank.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold text-[11px] uppercase tracking-widest w-28">Nama Rekening :</span>
                  <span className="text-white uppercase font-semibold">{bank.accountName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold text-[11px] uppercase tracking-widest w-28">Nomor Rekening :</span>
                  <span className="text-emerald-400 font-mono font-semibold tracking-wide">{bank.accountNumber}</span>
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider transition"
                disabled={isDeleting}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition shadow-lg shadow-rose-500/15 disabled:opacity-50 border border-rose-500/20"
                disabled={isDeleting}
              >
                {isDeleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
