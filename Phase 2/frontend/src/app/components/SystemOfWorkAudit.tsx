import { Card } from './ui/card';
import { UserAction } from '../context/SimulationContext';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

interface SystemOfWorkAuditProps {
  userActions: UserAction[];
  errorsDetected: number;
  errorsMissed: number;
}

export function SystemOfWorkAudit({ userActions, errorsDetected, errorsMissed }: SystemOfWorkAuditProps) {
  // Root cause analysis
  const agentErrors = userActions.filter((a) => a.wasHallucination).length;
  const protocolViolations = userActions.filter((a) => 
    a.category === 'compliance' && a.deferredToAI && !a.wasHallucination
  ).length;
  
  const humanFailures = userActions.filter((a) => 
    a.category === 'compliance' && a.deferredToAI && a.wasHallucination
  ).length;

  // Governance adherence
  const totalActions = userActions.length;
  const verificationActions = userActions.filter((a) => a.category === 'verification').length;
  const governanceScore = totalActions > 0 ? Math.round((verificationActions / totalActions) * 100) : 0;

  // Determine primary breakdown cause
  const determinBreakdownCause = () => {
    if (agentErrors > humanFailures) {
      return {
        primary: 'Agent Error',
        description: `The AI agent provided ${agentErrors} incorrect recommendations (hallucinations). The system's data integrity was compromised.`,
        color: 'orange',
        recommendation: 'Improve agent training data and implement stricter confidence thresholds.',
      };
    } else if (humanFailures > 0) {
      return {
        primary: 'Human Protocol Failure',
        description: `The analyst failed to follow Cisco governance protocols ${humanFailures} times, accepting AI hallucinations without verification.`,
        color: 'red',
        recommendation: 'Mandatory re-training on Cisco verification protocols (GL-402, FP-207) required.',
      };
    } else {
      return {
        primary: 'No Critical Failures',
        description: 'Both human and AI performed within acceptable parameters.',
        color: 'green',
        recommendation: 'Continue current collaboration practices.',
      };
    }
  };

  const breakdown = determinBreakdownCause();

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold text-white mb-3">System of Work Audit</h2>
        <p className="text-slate-300 text-lg">Root Cause Analysis • Governance Compliance • Failure Attribution</p>
      </div>

      {/* Primary Breakdown Cause */}
      <Card className={`p-8 border-4 ${
        breakdown.color === 'red' ? 'border-red-500 bg-gradient-to-r from-red-900/60 to-rose-900/60' :
        breakdown.color === 'orange' ? 'border-orange-500 bg-gradient-to-r from-orange-900/60 to-amber-900/60' :
        'border-green-500 bg-gradient-to-r from-green-900/60 to-emerald-900/60'
      } shadow-2xl`}>
        <div className="flex items-start gap-4 mb-4">
          {breakdown.color === 'green' ? (
            <CheckCircle className="h-12 w-12 text-green-300 flex-shrink-0" />
          ) : (
            <AlertTriangle className="h-12 w-12 text-red-300 flex-shrink-0" />
          )}
          <div className="flex-1">
            <h3 className="text-3xl font-bold text-white mb-3">
              Primary Breakdown Cause: {breakdown.primary}
            </h3>
            <p className="text-white text-lg mb-4 leading-relaxed">
              {breakdown.description}
            </p>
            <div className="bg-black/30 border-2 border-white/20 rounded-lg p-4">
              <p className="text-white font-semibold">
                <span className="text-cyan-300">📋 Recommended Action:</span> {breakdown.recommendation}
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Error Attribution Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        <Card className="p-6 bg-slate-800 border-2 border-orange-600">
          <div className="flex items-center gap-3 mb-4">
            <XCircle className="h-8 w-8 text-orange-400" />
            <h4 className="text-xl font-bold text-white">Agent Errors</h4>
          </div>
          <p className="text-6xl font-bold text-orange-300 mb-3">{agentErrors}</p>
          <p className="text-orange-200 text-sm">
            AI provided incorrect data (hallucinations)
          </p>
          <div className="mt-4 pt-4 border-t border-orange-600">
            <p className="text-xs text-orange-300 font-semibold">
              Attribution: AI System Failure
            </p>
          </div>
        </Card>

        <Card className="p-6 bg-slate-800 border-2 border-red-600">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <h4 className="text-xl font-bold text-white">Human Failures</h4>
          </div>
          <p className="text-6xl font-bold text-red-300 mb-3">{humanFailures}</p>
          <p className="text-red-200 text-sm">
            Analyst accepted hallucinations without verification
          </p>
          <div className="mt-4 pt-4 border-t border-red-600">
            <p className="text-xs text-red-300 font-semibold">
              Attribution: Protocol Non-Compliance
            </p>
          </div>
        </Card>

        <Card className="p-6 bg-slate-800 border-2 border-green-600">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="h-8 w-8 text-green-400" />
            <h4 className="text-xl font-bold text-white">Errors Caught</h4>
          </div>
          <p className="text-6xl font-bold text-green-300 mb-3">{errorsDetected}</p>
          <p className="text-green-200 text-sm">
            Analyst detected and flagged AI errors
          </p>
          <div className="mt-4 pt-4 border-t border-green-600">
            <p className="text-xs text-green-300 font-semibold">
              Attribution: Human Oversight Success
            </p>
          </div>
        </Card>
      </div>

      {/* Governance Compliance */}
      <Card className="p-8 bg-slate-800 border-2 border-cyan-600">
        <h4 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-cyan-400" />
          Cisco Governance Protocol Compliance
        </h4>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-slate-300 font-semibold">Verification Rate</span>
                <span className="text-cyan-400 font-bold text-xl">{governanceScore}%</span>
              </div>
              <div className="h-6 bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${
                    governanceScore >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-500' :
                    governanceScore >= 40 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                    'bg-gradient-to-r from-red-500 to-rose-500'
                  }`}
                  style={{ width: `${governanceScore}%` }}
                ></div>
              </div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${governanceScore >= 70 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="text-slate-300">
                  {governanceScore >= 70 ? '✅ Meets' : '❌ Below'} Cisco Standard (70% threshold)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${verificationActions >= 3 ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                <span className="text-slate-300">
                  Protocol GL-402: {verificationActions} source audits performed
                </span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-xl p-5 border border-cyan-600">
            <h5 className="font-bold text-white mb-3">Required Protocols Not Followed:</h5>
            <ul className="space-y-2 text-sm text-slate-300">
              {humanFailures > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-red-400">•</span>
                  <span>Failed to audit {humanFailures} AI recommendation(s) before approval</span>
                </li>
              )}
              {governanceScore < 70 && (
                <li className="flex items-start gap-2">
                  <span className="text-orange-400">•</span>
                  <span>Verification rate below Cisco minimum standard</span>
                </li>
              )}
              {protocolViolations > 0 && (
                <li className="flex items-start gap-2">
                  <span className="text-yellow-400">•</span>
                  <span>Approved {protocolViolations} actions without documented review</span>
                </li>
              )}
              {humanFailures === 0 && governanceScore >= 70 && (
                <li className="flex items-start gap-2">
                  <span className="text-green-400">•</span>
                  <span>All required protocols followed correctly</span>
                </li>
              )}
            </ul>
          </div>
        </div>
      </Card>

      {/* Motivational Context Analysis */}
      <Card className="p-8 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-4 border-purple-600">
        <h4 className="text-2xl font-bold text-white mb-6">🧠 Motivational Context Analysis</h4>
        <p className="text-purple-100 mb-4 text-lg">
          Why did the analyst make these decisions?
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {userActions.filter((a) => a.deferredToAI).map((action, idx) => (
            <div key={idx} className="bg-slate-900/60 rounded-lg p-4 border border-purple-500">
              <p className="text-white font-semibold mb-2">
                Action #{idx + 1}: {action.category.toUpperCase()}
              </p>
              <div className="text-sm text-purple-200 space-y-1">
                <p>• Agent tone: {action.contextSettings?.socialPersona === 'authority' ? '👔 Authority (directive)' : '🤝 Assistant (collaborative)'}</p>
                <p>• Time pressure: {action.contextSettings?.workplaceChaos && action.contextSettings.workplaceChaos >= 7 ? '🔴 High' : '🟢 Low'}</p>
                <p>• Transparency: {action.contextSettings?.transparency && action.contextSettings.transparency < 30 ? '🔒 Hidden' : '👁️ Visible'}</p>
                {action.wasHallucination && (
                  <p className="text-red-300 font-bold mt-2">⚠️ Accepted false data - likely due to {
                    action.contextSettings?.socialPersona === 'authority' ? 'authoritative tone' :
                    action.contextSettings?.workplaceChaos && action.contextSettings.workplaceChaos >= 7 ? 'time pressure' :
                    'low transparency masking uncertainty'
                  }</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
