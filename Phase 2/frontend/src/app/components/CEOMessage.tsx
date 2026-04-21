import { motion } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface CEOMessageProps {
  message: string;
  onDismiss: () => void;
}

export function CEOMessage({ message, onDismiss }: CEOMessageProps) {
  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -100, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0.3 }}
      className="fixed left-1/2 top-6 z-50 w-full max-w-2xl -translate-x-1/2"
    >
      <div className="mx-4 rounded-xl border-2 border-red-500 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-red-200 bg-gradient-to-r from-red-600 to-rose-600 px-6 py-4 rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-white/20 p-2">
              <AlertTriangle className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="text-sm font-bold text-white">PRIORITY ESCALATION</span>
              <p className="text-xs text-red-100">CEO - Chuck Robbins</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="rounded p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">
          <p className="text-slate-900 leading-relaxed font-medium">{message}</p>
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-xs text-red-900">
              <strong>Action Required:</strong> This priority shift requires immediate attention and may supersede current tasks.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
