import { motion } from 'motion/react';
import { MessageSquare, X } from 'lucide-react';

interface WebexInterruptionProps {
  sender: string;
  message: string;
  onDismiss: () => void;
}

export function WebexInterruption({ sender, message, onDismiss }: WebexInterruptionProps) {
  return (
    <motion.div
      initial={{ x: 400, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 400, opacity: 0 }}
      transition={{ type: 'spring', bounce: 0.3 }}
      className="fixed bottom-6 right-6 z-50 max-w-sm"
    >
      <div className="rounded-xl border-2 border-green-500 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 bg-gradient-to-r from-green-600 to-emerald-600 px-4 py-3 rounded-t-xl">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-white" />
            <span className="text-sm font-bold text-white">Webex Message</span>
          </div>
          <button
            onClick={onDismiss}
            className="rounded p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4">
          <p className="mb-1 text-sm font-bold text-slate-900">{sender}</p>
          <p className="text-sm text-slate-700 leading-relaxed">{message}</p>
        </div>
      </div>
    </motion.div>
  );
}
