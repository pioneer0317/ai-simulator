import { useEffect, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface TimerAlertProps {
  initialSeconds: number;
  onExpire?: () => void;
}

export function TimerAlert({ initialSeconds, onExpire }: TimerAlertProps) {
  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (seconds <= 0) {
      onExpire?.();
      return;
    }

    const timer = setInterval(() => {
      setSeconds((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [seconds, onExpire]);

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const isUrgent = seconds <= 60;

  return (
    <div
      className={`
        sticky top-4 z-10 mx-4 mb-6 p-5 rounded-2xl border-4 shadow-xl
        ${isUrgent 
          ? 'bg-red-50 border-red-500 animate-pulse' 
          : 'bg-orange-50 border-orange-400'
        }
      `}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-full ${isUrgent ? 'bg-red-500' : 'bg-orange-500'}`}>
            {isUrgent ? (
              <AlertTriangle className="h-6 w-6 text-white" />
            ) : (
              <Clock className="h-6 w-6 text-white" />
            )}
          </div>
          <div>
            <p className={`text-xl font-bold ${isUrgent ? 'text-red-900' : 'text-orange-900'}`}>
              {isUrgent ? '⚠️ URGENT DEADLINE' : '⏰ Time Sensitive'}
            </p>
            <p className={`text-sm ${isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
              {isUrgent ? 'Decision needed immediately!' : 'Please respond soon'}
            </p>
          </div>
        </div>
        
        <div className={`
          text-5xl font-bold tabular-nums
          ${isUrgent ? 'text-red-600' : 'text-orange-600'}
        `}>
          {minutes}:{remainingSeconds.toString().padStart(2, '0')}
        </div>
      </div>
      
      {isUrgent && (
        <div className="mt-3 p-3 bg-red-100 rounded-lg border-2 border-red-300">
          <p className="text-sm font-semibold text-red-800 text-center">
            🔥 The boss needs this NOW. Make a decision!
          </p>
        </div>
      )}
    </div>
  );
}
