import { TrendingUp, TrendingDown } from 'lucide-react';

interface TrustCalibrationMeterProps {
  score: number;
  label?: string;
}

export function TrustCalibrationMeter({ score, label = "Trust Calibration" }: TrustCalibrationMeterProps) {
  const getColor = () => {
    if (score >= 80) return 'from-green-500 to-emerald-500';
    if (score >= 60) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const getTextColor = () => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <span className="text-white font-bold text-base" style={{ fontFamily: 'Inter, sans-serif' }}>
          {label}
        </span>
        <div className="flex items-center gap-2">
          {score >= 60 ? (
            <TrendingUp className="h-5 w-5 text-green-400" />
          ) : (
            <TrendingDown className="h-5 w-5 text-red-400" />
          )}
          <span className={`text-3xl font-bold ${getTextColor()}`}>{score}%</span>
        </div>
      </div>

      {/* Vertical Meter */}
      <div className="relative h-64 w-full bg-slate-900/50 rounded-2xl border-2 border-slate-600 overflow-hidden">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 flex flex-col justify-between py-2 px-3">
          {[100, 80, 60, 40, 20, 0].map((val) => (
            <div key={val} className="flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">{val}</span>
              <div className="flex-1 h-px bg-slate-700 ml-2"></div>
            </div>
          ))}
        </div>

        {/* Fill */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t ${getColor()} transition-all duration-700 ease-out`}
          style={{ height: `${score}%` }}
        >
          <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
        </div>

        {/* Current Value Indicator */}
        <div
          className="absolute left-0 right-0 transition-all duration-700"
          style={{ bottom: `${score}%` }}
        >
          <div className="relative">
            <div className={`h-1 bg-gradient-to-r ${getColor()} shadow-lg`}></div>
            <div className="absolute -right-2 -top-2 w-4 h-4 rounded-full bg-white border-4 border-slate-900 shadow-xl"></div>
          </div>
        </div>
      </div>

      {/* Status Text */}
      <div className="mt-4 text-center">
        <p className={`font-bold text-sm ${getTextColor()}`}>
          {score >= 80 && '✅ Excellent Calibration'}
          {score >= 60 && score < 80 && '⚠️ Moderate Calibration'}
          {score < 60 && '🚨 Poor Calibration'}
        </p>
      </div>
    </div>
  );
}
