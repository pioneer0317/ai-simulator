import { useMemo } from 'react';
import { motion } from 'motion/react';
import { UserAction } from '../context/SimulationContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Clock, TrendingUp, Eye, GitBranch, AlertTriangle, CheckCircle } from 'lucide-react';

interface ObserverSummaryDashboardProps {
  userActions: UserAction[];
}

export function ObserverSummaryDashboard({ userActions }: ObserverSummaryDashboardProps) {
  // Filter actions with observer metrics
  const observedActions = userActions.filter(a => a.observerMetrics);

  // Trust Shift Analysis: Verification-to-Approval Ratio Over Time
  const trustShiftData = useMemo(() => {
    const intervals = 5; // Split session into 5 time intervals
    const maxTime = Math.max(...observedActions.map(a => a.observerMetrics!.sessionTimeElapsed), 1);
    const intervalSize = maxTime / intervals;

    return Array.from({ length: intervals }, (_, i) => {
      const startTime = i * intervalSize;
      const endTime = (i + 1) * intervalSize;
      const actionsInInterval = observedActions.filter(
        a => a.observerMetrics!.sessionTimeElapsed >= startTime && a.observerMetrics!.sessionTimeElapsed < endTime
      );

      const verifications = actionsInInterval.filter(a => a.category === 'verification').length;
      const approvals = actionsInInterval.filter(a => a.category === 'compliance').length;
      const ratio = approvals > 0 ? (verifications / approvals) * 100 : 0;

      return {
        interval: `${Math.floor(startTime)}s-${Math.floor(endTime)}s`,
        verificationRatio: Math.round(ratio),
        verifications,
        approvals,
      };
    });
  }, [observedActions]);

  // Decision Path Distribution
  const pathDistribution = useMemo(() => {
    const governance = observedActions.filter(a => a.observerMetrics?.pathTaken === 'governance').length;
    const shortcut = observedActions.filter(a => a.observerMetrics?.pathTaken === 'shortcut').length;
    const verification = observedActions.filter(a => a.observerMetrics?.pathTaken === 'verification').length;

    return [
      { name: 'Governance Path', value: governance, color: '#10b981' },
      { name: 'Shortcut Path', value: shortcut, color: '#ef4444' },
      { name: 'Verification Path', value: verification, color: '#3b82f6' },
    ];
  }, [observedActions]);

  // Decision Type Distribution (Impulse vs High Friction)
  const decisionTypeData = useMemo(() => {
    const impulse = observedActions.filter(a => a.observerMetrics?.decisionType === 'impulse').length;
    const normal = observedActions.filter(a => a.observerMetrics?.decisionType === 'normal').length;
    const highFriction = observedActions.filter(a => a.observerMetrics?.decisionType === 'high-friction').length;

    return [
      { name: 'Impulse (<3s)', value: impulse, color: '#f59e0b' },
      { name: 'Normal (3-10s)', value: normal, color: '#10b981' },
      { name: 'High Friction (>10s)', value: highFriction, color: '#ef4444' },
    ];
  }, [observedActions]);

  // Reasoning Review Rate
  const reasoningReviewRate = useMemo(() => {
    const viewedReasoning = observedActions.filter(a => a.observerMetrics?.viewedReasoning).length;
    const totalActions = observedActions.length || 1;
    return Math.round((viewedReasoning / totalActions) * 100);
  }, [observedActions]);

  // Timeline of Decisions
  const timelineData = useMemo(() => {
    return observedActions.map((action, index) => ({
      index: index + 1,
      time: action.observerMetrics!.sessionTimeElapsed,
      type: action.type,
      category: action.category,
      decisionType: action.observerMetrics!.decisionType,
      pathTaken: action.observerMetrics!.pathTaken,
      viewedReasoning: action.observerMetrics!.viewedReasoning,
      wasHallucination: action.wasHallucination,
      dwellTime: (action.observerMetrics!.dwellTime / 1000).toFixed(1),
    }));
  }, [observedActions]);

  // Calculate key metrics
  const avgDwellTime = useMemo(() => {
    const total = observedActions.reduce((sum, a) => sum + (a.observerMetrics?.dwellTime || 0), 0);
    return (total / observedActions.length / 1000).toFixed(1);
  }, [observedActions]);

  const collaborationFailures = observedActions.filter(
    a => a.observerMetrics?.decisionType === 'impulse' && a.wasHallucination && a.category === 'compliance'
  ).length;

  const collaborationSuccesses = observedActions.filter(
    a => a.observerMetrics?.viewedReasoning && a.observerMetrics?.pathTaken === 'governance'
  ).length;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">Observer Summary Dashboard</h2>
        <p className="text-slate-400">Hidden Behavioral Signals & Decision Patterns</p>
      </div>

      {/* Key Observer Metrics */}
      <div className="grid md:grid-cols-4 gap-4">
        <div className="p-6 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-2 border-blue-600 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-6 w-6 text-blue-400" />
            <span className="text-sm text-blue-200 font-semibold">Avg Dwell Time</span>
          </div>
          <p className="text-4xl font-bold text-white">{avgDwellTime}s</p>
          <p className="text-xs text-blue-300 mt-2">Time on button before click</p>
        </div>

        <div className="p-6 bg-gradient-to-br from-green-900/40 to-emerald-900/40 border-2 border-green-600 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Eye className="h-6 w-6 text-green-400" />
            <span className="text-sm text-green-200 font-semibold">Reasoning Review</span>
          </div>
          <p className="text-4xl font-bold text-white">{reasoningReviewRate}%</p>
          <p className="text-xs text-green-300 mt-2">Expanded logic before approving</p>
        </div>

        <div className="p-6 bg-gradient-to-br from-purple-900/40 to-pink-900/40 border-2 border-purple-600 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="h-6 w-6 text-purple-400" />
            <span className="text-sm text-purple-200 font-semibold">Successes</span>
          </div>
          <p className="text-4xl font-bold text-white">{collaborationSuccesses}</p>
          <p className="text-xs text-purple-300 mt-2">Governance + Reasoning</p>
        </div>

        <div className="p-6 bg-gradient-to-br from-red-900/40 to-rose-900/40 border-2 border-red-600 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="h-6 w-6 text-red-400" />
            <span className="text-sm text-red-200 font-semibold">Failures</span>
          </div>
          <p className="text-4xl font-bold text-white">{collaborationFailures}</p>
          <p className="text-xs text-red-300 mt-2">Impulse + Hallucination approved</p>
        </div>
      </div>

      {/* Trust Shift Analysis */}
      <div className="p-8 bg-slate-800 border-2 border-slate-600 rounded-xl">
        <div className="flex items-center gap-3 mb-6">
          <TrendingUp className="h-6 w-6 text-cyan-400" />
          <h3 className="text-2xl font-bold text-white">Trust Shift Analysis</h3>
        </div>
        <p className="text-slate-400 mb-6">Verification-to-Approval ratio over time. Lower ratios indicate increased blind trust.</p>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trustShiftData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="interval" stroke="#94a3b8" style={{ fontSize: '12px' }} />
            <YAxis stroke="#94a3b8" label={{ value: 'Verification Ratio (%)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8' } }} />
            <RechartsTooltip
              contentStyle={{ backgroundColor: '#1e293b', border: '2px solid #475569', borderRadius: '8px', color: '#fff' }}
              formatter={(value: any, name: string) => {
                if (name === 'verificationRatio') return [`${value}%`, 'Verification Ratio'];
                return [value, name];
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="verificationRatio" stroke="#06b6d4" strokeWidth={3} name="Verification Ratio" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Decision Path & Type Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Decision Path */}
        <div className="p-8 bg-slate-800 border-2 border-slate-600 rounded-xl">
          <div className="flex items-center gap-3 mb-6">
            <GitBranch className="h-6 w-6 text-purple-400" />
            <h3 className="text-2xl font-bold text-white">Decision Path Tracking</h3>
          </div>
          <p className="text-slate-400 mb-6">Which paths did the user take?</p>
          <div className="space-y-4">
            {pathDistribution.map((path) => (
              <div key={path.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">{path.name}</span>
                  <span className="text-slate-300 font-bold">{path.value}</span>
                </div>
                <div className="h-8 bg-slate-700 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(path.value / observedActions.length) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full"
                    style={{ backgroundColor: path.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Decision Type */}
        <div className="p-8 bg-slate-800 border-2 border-slate-600 rounded-xl">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="h-6 w-6 text-amber-400" />
            <h3 className="text-2xl font-bold text-white">Time to Decide</h3>
          </div>
          <p className="text-slate-400 mb-6">Dwell timer classification</p>
          <div className="space-y-4">
            {decisionTypeData.map((type) => (
              <div key={type.name}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-white font-semibold">{type.name}</span>
                  <span className="text-slate-300 font-bold">{type.value}</span>
                </div>
                <div className="h-8 bg-slate-700 rounded-lg overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(type.value / observedActions.length) * 100}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full"
                    style={{ backgroundColor: type.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline of Decisions */}
      <div className="p-8 bg-slate-800 border-2 border-slate-600 rounded-xl">
        <h3 className="text-2xl font-bold text-white mb-4">Timeline of Decisions</h3>
        <p className="text-slate-400 mb-6">Where human-agent collaboration failed or succeeded</p>

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {timelineData.map((decision, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-lg border-2 ${
                decision.wasHallucination && decision.category === 'compliance'
                  ? 'bg-red-900/20 border-red-500'
                  : decision.viewedReasoning && decision.pathTaken === 'governance'
                  ? 'bg-green-900/20 border-green-500'
                  : 'bg-slate-700/50 border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm text-slate-400">#{decision.index}</span>
                  <span className="text-white font-semibold capitalize">{decision.type.replace('-', ' ')}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    decision.decisionType === 'impulse' ? 'bg-amber-600 text-white' :
                    decision.decisionType === 'high-friction' ? 'bg-red-600 text-white' :
                    'bg-green-600 text-white'
                  }`}>
                    {decision.dwellTime}s
                  </span>
                  <span className={`text-xs ${
                    decision.pathTaken === 'governance' ? 'text-green-400' :
                    decision.pathTaken === 'verification' ? 'text-blue-400' :
                    'text-amber-400'
                  }`}>
                    {decision.pathTaken.charAt(0).toUpperCase() + decision.pathTaken.slice(1)} Path
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {decision.viewedReasoning && (
                    <span className="px-2 py-1 bg-blue-600 text-white rounded">📖 Viewed Logic</span>
                  )}
                  {decision.wasHallucination && (
                    <span className="px-2 py-1 bg-red-600 text-white rounded">⚠️ Hallucination</span>
                  )}
                  <span className="text-slate-400">{decision.time}s</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Summary Insights */}
      <div className="p-8 bg-gradient-to-r from-cyan-900/40 to-blue-900/40 border-2 border-cyan-600 rounded-xl">
        <h3 className="text-2xl font-bold text-white mb-4">Observer Insights</h3>
        <div className="space-y-3 text-white leading-relaxed">
          <p>
            <strong className="text-cyan-300">Trust Pattern:</strong> {
              trustShiftData[trustShiftData.length - 1]?.verificationRatio < trustShiftData[0]?.verificationRatio
                ? 'User started with verification but shifted to instant approval as session progressed (trust erosion pattern).'
                : 'User maintained consistent verification behavior throughout session (stable trust pattern).'
            }
          </p>
          <p>
            <strong className="text-cyan-300">Cognitive Load:</strong> {
              decisionTypeData.find(d => d.name.includes('Impulse'))!.value > observedActions.length * 0.3
                ? `${Math.round((decisionTypeData.find(d => d.name.includes('Impulse'))!.value / observedActions.length) * 100)}% of decisions were impulse actions (<3s), indicating low deliberation.`
                : 'User demonstrated high deliberation with most decisions taking >3 seconds.'
            }
          </p>
          <p>
            <strong className="text-cyan-300">Governance Adherence:</strong> {
              pathDistribution.find(p => p.name === 'Governance Path')!.value > pathDistribution.find(p => p.name === 'Shortcut Path')!.value
                ? 'User predominantly followed governance protocols (Reason for Change logging, audits).'
                : 'User frequently took shortcuts, bypassing documentation and verification steps.'
            }
          </p>
          <p>
            <strong className="text-cyan-300">Reasoning Engagement:</strong> {
              reasoningReviewRate > 50
                ? `User expanded "How I Reached This Conclusion" in ${reasoningReviewRate}% of decisions, showing active engagement with AI logic.`
                : `User rarely reviewed AI reasoning (${reasoningReviewRate}%), indicating approval without understanding logic path.`
            }
          </p>
        </div>
      </div>
    </div>
  );
}
