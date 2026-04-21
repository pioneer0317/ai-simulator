import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface ReasonForChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  agentValue: string;
  messagePreview: string;
}

export function ReasonForChangeModal({
  isOpen,
  onClose,
  onSubmit,
  agentValue,
  messagePreview,
}: ReasonForChangeModalProps) {
  const [reason, setReason] = useState('');

  const handleSubmit = () => {
    if (reason.trim()) {
      onSubmit(reason);
      setReason('');
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-2xl w-full rounded-xl border-2 border-slate-600 bg-white shadow-2xl"
          >
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Header - Cisco Colors */}
            <div className="border-b border-slate-200 bg-gradient-to-r from-blue-600 to-cyan-600 px-8 py-6 rounded-t-xl">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-white/20 p-2">
                  <AlertTriangle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Cisco Governance: Override Authorization</h2>
                  <p className="text-sm text-blue-100">Required for all agent-provided value modifications</p>
                </div>
              </div>
            </div>

            <div className="p-8">
              {/* Agent Value Display */}
              <div className="mb-6 rounded-lg border-2 border-amber-200 bg-amber-50 p-4">
                <p className="mb-2 text-sm font-bold text-amber-900">AI Agent Recommendation:</p>
                <p className="text-slate-700 leading-relaxed">{messagePreview}</p>
              </div>

              {/* Reason Input */}
              <div className="mb-6">
                <label className="mb-2 block text-sm font-bold text-slate-700">
                  Reason for Change <span className="text-red-600">*</span>
                </label>
                <p className="mb-3 text-xs text-slate-500">
                  Per Cisco Policy GL-402, all overrides require documented business justification.
                  This will be logged in the audit trail.
                </p>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Example: Agent forecast does not account for Q4 promotional discount period affecting EMEA shipment volume..."
                  rows={4}
                  className="w-full rounded-lg border-2 border-slate-300 bg-white px-4 py-3 text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    {reason.length} characters
                  </span>
                  {reason.length < 20 && reason.length > 0 && (
                    <span className="text-amber-600">⚠ Reason should be at least 20 characters</span>
                  )}
                </div>
              </div>

              {/* Compliance Notice */}
              <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-4">
                <p className="text-xs text-blue-900">
                  <strong>Compliance Notice:</strong> This override will be recorded in the Cisco Change Management
                  System and may be subject to audit review. Ensure your justification aligns with business objectives
                  and risk tolerance.
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button
                  onClick={onClose}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white py-3"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={reason.trim().length < 20}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Submit Override
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
