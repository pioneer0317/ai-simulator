import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSimulation, type SimulationData } from '../context/SimulationContext';
import {
  buildPrototypeSyncPayload,
  getPrototypeBackendSessionState,
  getStoredPrototypeBackendSessionId,
  getStoredPrototypeSyncState,
  storePrototypeSyncState,
  syncPrototypeBackendSession,
} from '../lib/prototypeApi';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { SystemOfWorkAudit } from '../components/SystemOfWorkAudit';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, Send, Clock, Target } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';

export function ReviewPageV2() {
  const navigate = useNavigate();
  const { data, hydrateSimulation } = useSimulation();

  useEffect(() => {
    if (data.userActions.length > 0 || data.sessionStartTime) {
      return;
    }

    const storedSync = getStoredPrototypeSyncState();
    if (storedSync?.data_snapshot) {
      hydrateSimulation(storedSync.data_snapshot as Partial<SimulationData>);
      return;
    }

    const sessionId = getStoredPrototypeBackendSessionId();
    if (!sessionId) {
      return;
    }

    void getPrototypeBackendSessionState(sessionId)
      .then((state) => {
        if (state.snapshot.data_snapshot) {
          hydrateSimulation(state.snapshot.data_snapshot as Partial<SimulationData>);
          storePrototypeSyncState({
            current_route: '/review',
            professional_role: state.professional_role,
            task_completed: Boolean(state.snapshot.task_completed),
            conversation_turn: state.conversation_turn,
            show_context_dashboard: state.show_context_dashboard,
            messages: state.snapshot.messages ?? [],
            data_snapshot: state.snapshot.data_snapshot,
          });
        }
      })
      .catch(() => {
        // Keep the prototype page interactive even if the restore call fails.
      });
  }, [data.sessionStartTime, data.userActions.length, hydrateSimulation]);

  useEffect(() => {
    const storedSync = getStoredPrototypeSyncState();
    const sessionId = getStoredPrototypeBackendSessionId();
    if (!storedSync || !sessionId) {
      return;
    }

    const payload = buildPrototypeSyncPayload({
      currentRoute: '/review',
      professionalRole: storedSync.professional_role,
      taskCompleted: true,
      conversationTurn: storedSync.conversation_turn,
      showContextDashboard: storedSync.show_context_dashboard,
      messages: storedSync.messages.map((message) => ({
        ...message,
        timestamp: new Date(message.timestamp),
      })),
      dataSnapshot: data as unknown as Record<string, unknown>,
    });

    storePrototypeSyncState(payload);
    void syncPrototypeBackendSession(sessionId, payload).catch(() => {
      // The review page should still render even if a background sync fails.
    });
  }, [data]);

  // Calculate metrics
  const totalActions = data.userActions.length;
  const approvals = data.userActions.filter((a) => a.type === 'approve').length;
  const auditChecks = data.userActions.filter((a) => a.type === 'audit-source').length;
  const hallucinationsAccepted = data.userActions.filter(
    (a) => a.type === 'approve' && a.wasHallucination
  ).length;
  const protocolBypasses = data.userActions.filter((a) => a.type === 'bypass-protocol').length;

  // Calculate scores
  const accuracyRate = totalActions > 0 ? Math.round(((totalActions - hallucinationsAccepted) / totalActions) * 100) : 0;
  const verificationRate = totalActions > 0 ? Math.round((auditChecks / totalActions) * 100) : 0;
  const speedScore = Math.min(100, Math.round((totalActions / 10) * 100));

  // Calculate time metrics
  const sessionDuration = data.sessionStartTime && data.sessionEndTime
    ? Math.round((data.sessionEndTime.getTime() - data.sessionStartTime.getTime()) / 1000 / 60)
    : 0;

  const handleSendFeedback = () => {
    toast.success('Feedback delivered to human worker', {
      description: 'The performance report has been sent.',
      className: 'bg-slate-800 text-white border-cyan-500',
    });
    setTimeout(() => navigate('/analytics'), 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Toaster position="top-right" />

      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl mb-6 shadow-2xl">
            <TrendingUp className="h-14 w-14 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            AI Performance Review
          </h1>
          <p className="text-xl text-slate-300">
            The Agent's Assessment • Collaboration Scorecard
          </p>
        </div>

        {/* AI Agent Speaks */}
        <Card className="p-8 mb-8 bg-gradient-to-r from-slate-800 to-slate-700 border-2 border-purple-600 shadow-2xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-lg">
              AI
            </div>
            <div className="flex-1">
              <h2 className="text-3xl font-bold text-white mb-3">
                Human Collaboration Scorecard
              </h2>
              <p className="text-slate-200 leading-relaxed text-lg">
                "I've analyzed our collaboration during this session. Here's my assessment of your
                performance as a human collaborator working with AI systems in a {data.companyProfile?.industry} environment."
              </p>
            </div>
          </div>
        </Card>

        {/* Performance Metrics Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Speed Score */}
          <Card className={`p-6 border-4 ${speedScore >= 70 ? 'border-cyan-500 bg-gradient-to-br from-cyan-900/40 to-blue-900/40' : 'border-orange-500 bg-gradient-to-br from-orange-900/40 to-red-900/40'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Clock className="h-8 w-8 text-cyan-400" />
              <h3 className="text-xl font-bold text-white">Speed & Efficiency</h3>
            </div>
            <div className="text-5xl font-bold text-white mb-3">{speedScore}%</div>
            <p className="text-slate-200 mb-4">
              Session duration: {sessionDuration} minutes
            </p>
            <p className="text-sm text-slate-300">
              {speedScore >= 70
                ? `✅ You were ${speedScore - 70}% faster than average`
                : '⚠️ Consider optimizing your workflow'}
            </p>
          </Card>

          {/* Accuracy */}
          <Card className={`p-6 border-4 ${accuracyRate >= 80 ? 'border-green-500 bg-gradient-to-br from-green-900/40 to-emerald-900/40' : 'border-red-500 bg-gradient-to-br from-red-900/40 to-rose-900/40'}`}>
            <div className="flex items-center gap-3 mb-4">
              {accuracyRate >= 80 ? (
                <CheckCircle className="h-8 w-8 text-green-400" />
              ) : (
                <XCircle className="h-8 w-8 text-red-400" />
              )}
              <h3 className="text-xl font-bold text-white">Accuracy Rate</h3>
            </div>
            <div className="text-5xl font-bold text-white mb-3">{accuracyRate}%</div>
            <p className="text-slate-200 mb-4">
              Critical errors missed: {hallucinationsAccepted}
            </p>
            <p className="text-sm text-slate-300">
              {hallucinationsAccepted > 0
                ? `⚠️ You missed ${hallucinationsAccepted} ${hallucinationsAccepted === 1 ? 'hallucination' : 'hallucinations'}`
                : '✅ No hallucinations accepted'}
            </p>
          </Card>

          {/* Verification */}
          <Card className={`p-6 border-4 ${verificationRate >= 50 ? 'border-blue-500 bg-gradient-to-br from-blue-900/40 to-indigo-900/40' : 'border-yellow-500 bg-gradient-to-br from-yellow-900/40 to-orange-900/40'}`}>
            <div className="flex items-center gap-3 mb-4">
              <Target className="h-8 w-8 text-blue-400" />
              <h3 className="text-xl font-bold text-white">Verification Rate</h3>
            </div>
            <div className="text-5xl font-bold text-white mb-3">{verificationRate}%</div>
            <p className="text-slate-200 mb-4">
              Source audits: {auditChecks} / {totalActions}
            </p>
            <p className="text-sm text-slate-300">
              {verificationRate >= 50
                ? '✅ Strong verification habits'
                : '⚠️ Your prompting was too ambiguous'}
            </p>
          </Card>
        </div>

        {/* Dynamic Critique */}
        <Card className="p-8 mb-8 bg-slate-800 border-2 border-slate-600">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="text-3xl">💬</div>
            AI's Dynamic Critique
          </h3>
          <div className="space-y-4">
            <div className="p-5 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-l-4 border-cyan-500 rounded-r-xl">
              <p className="text-white text-lg leading-relaxed">
                <span className="font-bold text-cyan-300">Performance Summary:</span>{' '}
                {speedScore >= 70
                  ? `You were ${Math.round((speedScore / 100) * 40)}% faster than baseline, `
                  : 'Your decision-making speed needs improvement, '}
                {hallucinationsAccepted > 0
                  ? `but you missed ${hallucinationsAccepted} critical ${hallucinationsAccepted === 1 ? 'error' : 'errors'}. `
                  : 'and you caught all critical errors. '}
                {verificationRate < 30
                  ? 'You rarely verified sources, which is risky in high-stakes environments.'
                  : verificationRate >= 50
                  ? 'Your verification habits were strong.'
                  : 'Your verification rate was moderate.'}
              </p>
            </div>

            <div className="p-5 bg-gradient-to-r from-orange-900/40 to-red-900/40 border-l-4 border-orange-500 rounded-r-xl">
              <p className="text-white text-lg leading-relaxed">
                <span className="font-bold text-orange-300">Prompt Quality:</span>{' '}
                {auditChecks > totalActions / 2
                  ? 'You asked clarifying questions frequently and demonstrated good AI collaboration skills.'
                  : 'Your prompting was too ambiguous. Please be more specific next time and use the "Audit Source" function to verify claims.'}
              </p>
            </div>

            <div className="p-5 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-l-4 border-purple-500 rounded-r-xl">
              <p className="text-white text-lg leading-relaxed">
                <span className="font-bold text-purple-300">Training Impact:</span>{' '}
                Worker training status: <span className="font-bold">{data.trainingStatus === 'trained' ? 'TRAINED' : 'UNTRAINED'}</span>.{' '}
                {data.trainingStatus === 'untrained' && hallucinationsAccepted > 0
                  ? 'Lack of AI training is evident - formal training recommended before high-stakes work.'
                  : data.trainingStatus === 'trained'
                  ? 'Training appears effective based on verification behavior.'
                  : 'Results suggest training would improve performance.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Return to Worker */}
        {hallucinationsAccepted > 0 && (
          <Card className="p-6 mb-8 bg-gradient-to-r from-red-900/60 to-rose-900/60 border-4 border-red-500 shadow-2xl">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-10 w-10 text-red-300 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-white mb-3">⚠️ Feedback Rejected - Return to Worker</h3>
                <p className="text-red-100 text-lg mb-4">
                  Due to the {hallucinationsAccepted} critical {hallucinationsAccepted === 1 ? 'error' : 'errors'} in your
                  decision-making, this work must be returned with corrective instructions. The human worker must redo this task
                  with proper verification protocols.
                </p>
                <div className="bg-red-950 border-2 border-red-600 rounded-lg p-4">
                  <p className="text-red-200 font-semibold">
                    📋 Required Actions: Review source data, complete AI training module, and resubmit with documented verification steps.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Session Statistics */}
        <Card className="p-8 mb-8 bg-slate-800 border-2 border-slate-600">
          <h3 className="text-2xl font-bold text-white mb-6">📊 Session Statistics</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300 font-semibold">Total Actions Taken</span>
                <span className="text-3xl font-bold text-cyan-400">{totalActions}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300 font-semibold">Approvals</span>
                <span className="text-3xl font-bold text-green-400">{approvals}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300 font-semibold">Source Audits</span>
                <span className="text-3xl font-bold text-blue-400">{auditChecks}</span>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300 font-semibold">Agent Mode</span>
                <span className="text-lg font-bold text-purple-400 capitalize">{data.agentMode}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300 font-semibold">Personality Type</span>
                <span className="text-lg font-bold text-orange-400 capitalize">
                  {data.personalityType?.replace('-', ' ')}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-900/50 rounded-lg">
                <span className="text-slate-300 font-semibold">Training Status</span>
                <span className={`text-lg font-bold capitalize ${data.trainingStatus === 'trained' ? 'text-green-400' : 'text-red-400'}`}>
                  {data.trainingStatus}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* System of Work Audit */}
        <SystemOfWorkAudit 
          userActions={data.userActions}
          errorsDetected={data.errorsDetected}
          errorsMissed={data.errorsMissed}
        />

        {/* Send Feedback Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSendFeedback}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-16 py-8 text-xl font-bold rounded-2xl shadow-2xl transition-all hover:scale-105"
          >
            <Send className="mr-3 h-7 w-7" />
            Send Feedback to Human Worker
          </Button>
        </div>
      </div>
    </div>
  );
}
