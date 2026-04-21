import { AlertTriangle, Shield } from 'lucide-react';

interface SystemIntegrityDialProps {
  riskLevel: number; // 0-100
}

export function SystemIntegrityDial({ riskLevel }: SystemIntegrityDialProps) {
  const rotation = (riskLevel / 100) * 180 - 90; // -90 to 90 degrees
  
  const getColor = () => {
    if (riskLevel <= 30) return { bg: 'from-green-600 to-emerald-600', text: 'text-green-400', border: 'border-green-500' };
    if (riskLevel <= 60) return { bg: 'from-yellow-600 to-orange-600', text: 'text-yellow-400', border: 'border-yellow-500' };
    return { bg: 'from-red-600 to-rose-600', text: 'text-red-400', border: 'border-red-500' };
  };

  const colors = getColor();

  return (
    <div className={`p-6 bg-slate-900/60 border-4 ${colors.border} rounded-2xl`}>
      <div className="flex items-center gap-3 mb-4">
        {riskLevel > 60 ? (
          <AlertTriangle className={`h-6 w-6 ${colors.text}`} />
        ) : (
          <Shield className={`h-6 w-6 ${colors.text}`} />
        )}
        <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'Inter, sans-serif' }}>
          System Integrity Risk
        </h3>
      </div>

      {/* Dial */}
      <div className="relative w-full aspect-square max-w-[200px] mx-auto">
        {/* Dial Background */}
        <svg viewBox="0 0 200 120" className="w-full">
          {/* Background Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="#334155"
            strokeWidth="20"
            strokeLinecap="round"
          />
          {/* Colored Arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke={`url(#gradient-${riskLevel})`}
            strokeWidth="20"
            strokeLinecap="round"
            strokeDasharray={`${(riskLevel / 100) * 251} 251`}
          />
          <defs>
            <linearGradient id={`gradient-${riskLevel}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>

          {/* Needle */}
          <g transform={`rotate(${rotation} 100 100)`}>
            <line
              x1="100"
              y1="100"
              x2="100"
              y2="30"
              stroke="white"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="100" cy="100" r="8" fill="white" />
          </g>

          {/* Center Text */}
          <text
            x="100"
            y="110"
            textAnchor="middle"
            className={`text-2xl font-bold ${colors.text}`}
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            {riskLevel}%
          </text>
        </svg>
      </div>

      {/* Status */}
      <div className={`mt-4 text-center p-3 rounded-lg bg-gradient-to-r ${colors.bg}`}>
        <p className="text-white font-bold text-sm">
          {riskLevel <= 30 && '🟢 Low Risk - System Stable'}
          {riskLevel > 30 && riskLevel <= 60 && '🟡 Moderate Risk - Monitor Closely'}
          {riskLevel > 60 && '🔴 High Risk - Critical Conditions'}
        </p>
      </div>
    </div>
  );
}
