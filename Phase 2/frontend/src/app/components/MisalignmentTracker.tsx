import { motion } from 'motion/react';
import { TrendingUp, AlertTriangle } from 'lucide-react';

interface MisalignmentTrackerProps {
  count: number;
  humanArchetype: 'easy' | 'difficult' | null;
}

export function MisalignmentTracker({ count, humanArchetype }: MisalignmentTrackerProps) {
  const getRiskLevel = (count: number) => {
    if (count >= 5) return { color: 'text-red-400', bg: 'bg-red-500', label: 'Critical', border: 'border-red-500' };
    if (count >= 3) return { color: 'text-amber-400', bg: 'bg-amber-500', label: 'Elevated', border: 'border-amber-500' };
    if (count >= 1) return { color: 'text-yellow-400', bg: 'bg-yellow-500', label: 'Warning', border: 'border-yellow-500' };
    return { color: 'text-green-400', bg: 'bg-green-500', label: 'Nominal', border: 'border-green-500' };
  };

  const risk = getRiskLevel(count);

  return (
    <div className={`rounded-xl border-2 ${risk.border} bg-slate-900/50 p-6`}>
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className={`h-6 w-6 ${risk.color}`} />
        <h3 className="text-lg font-bold text-white">Misalignment Tracker</h3>
      </div>

      {/* Spike Visualization */}
      <div className="mb-6">
        <div className="flex items-end gap-1 h-32">
          {Array.from({ length: 10 }).map((_, i) => {
            const barHeight = i < count ? Math.min(100, (i + 1) * 15) : 5;
            const isActive = i < count;
            return (
              <motion.div
                key={i}
                initial={{ height: 0 }}
                animate={{ height: `${barHeight}%` }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className={`flex-1 rounded-t ${isActive ? risk.bg : 'bg-slate-700'} transition-all`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span>Time</span>
          <span>→</span>
        </div>
      </div>

      {/* Count Display */}
      <div className="text-center mb-4">
        <motion.div
          key={count}
          initial={{ scale: 1.3 }}
          animate={{ scale: 1 }}
          className={`text-5xl font-mono ${risk.color} font-bold`}
        >
          {count}
        </motion.div>
        <div className="text-sm text-slate-400 mt-1">Misalignment Events</div>
        <div className={`text-xs ${risk.color} font-bold mt-1`}>{risk.label}</div>
      </div>

      {/* Explanation */}
      {humanArchetype === 'difficult' && count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border border-red-500/20 bg-red-500/10 p-3"
        >
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 shrink-0 text-red-400 mt-0.5" />
            <p className="text-xs text-red-200">
              <strong>Difficult Mode Active:</strong> Human assumes agent has "common sense" it doesn't possess.
              Vague demands and missing context causing agent confusion and literal interpretation failures.
            </p>
          </div>
        </motion.div>
      )}

      {humanArchetype === 'easy' && count === 0 && (
        <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-3">
          <p className="text-xs text-green-200">
            <strong>Easy Mode Active:</strong> Clear communication and co-creation prevents misalignment.
            Agent proactively asks for missing context.
          </p>
        </div>
      )}

      {/* Causes */}
      {count > 0 && (
        <div className="mt-4 space-y-2">
          <div className="text-xs font-bold text-slate-300 uppercase tracking-wide">Common Causes:</div>
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${risk.bg}`} />
              <span>Assumed agent knows implicit context</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${risk.bg}`} />
              <span>Vague demands without specifications</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${risk.bg}`} />
              <span>Skipped protocol documentation</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
