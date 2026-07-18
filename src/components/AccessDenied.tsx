import { motion } from 'motion/react';
import { ShieldAlert, ArrowLeft, Key } from 'lucide-react';

interface AccessDeniedProps {
  onBack: () => void;
  onSwitchToAdmin?: () => void;
}

export default function AccessDenied({ onBack, onSwitchToAdmin }: AccessDeniedProps) {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md bg-[#0f1425]/90 border border-red-500/20 backdrop-blur-md rounded-2xl shadow-2xl p-8 text-center space-y-6"
      >
        {/* Animated Icon */}
        <div className="flex justify-center">
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
            className="bg-red-500/10 p-5 rounded-full border border-red-500/30 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.1)]"
          >
            <ShieldAlert className="h-12 w-12" />
          </motion.div>
        </div>

        {/* Text Content */}
        <div className="space-y-2">
          <h1 className="text-4xl font-extrabold text-red-500 tracking-tight font-mono">403</h1>
          <h2 className="text-lg font-bold text-white uppercase tracking-wider">Access Denied</h2>
          <p className="text-xs text-slate-400 leading-relaxed font-medium">
            Anda tidak memiliki izin (peran tidak mencukupi) untuk mengakses fitur pengubahan data rekening bank ini. Silakan hubungi administrator sistem atau gunakan mode Admin.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex flex-col gap-2.5">
          {onSwitchToAdmin && (
            <button
              onClick={onSwitchToAdmin}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-blue-500/15 flex items-center justify-center gap-2 cursor-pointer border border-blue-400/25"
            >
              <Key className="h-4 w-4" />
              <span>Ganti ke Mode Admin</span>
            </button>
          )}

          <button
            onClick={onBack}
            className="w-full bg-white/5 hover:bg-white/10 text-slate-300 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer border border-white/10"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Dashboard</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
}
