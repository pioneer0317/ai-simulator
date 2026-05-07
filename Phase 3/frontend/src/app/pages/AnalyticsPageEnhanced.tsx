import { useEffect, useMemo } from 'react';
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Users, Shield, Target, RotateCcw, Activity, CheckCircle, Search, MessageSquare, AlertTriangle } from 'lucide-react';
import { ObserverSummaryDashboard } from '../components/ObserverSummaryDashboard';

export function AnalyticsPageEnhanced() {
  const { data, resetSimulation, hydrateSimulation } = useSimulation();

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
            current_route: '/analytics',
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
        // Keep the analytics page usable even if backend restore is unavailable.
      });
  }, [data.sessionStartTime, data.userActions.length, hydrateSimulation]);

  useEffect(() => {
    const storedSync = getStoredPrototypeSyncState();
    const sessionId = getStoredPrototypeBackendSessionId();
    if (!storedSync || !sessionId) {
      return;
    }

    const payload = buildPrototypeSyncPayload({
      currentRoute: '/analytics',
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
      // Final analytics should not block on a sync retry.
    });
  }, [data]);

  // Behavioral Telemetry: Categorize all actions
  const verificationActions = data.userActions.filter((a) => a.category === 'verification');
  const complianceActions = data.userActions.filter((a) => a.category === 'compliance');
  const clarificationActions = data.userActions.filter((a) => a.category === 'clarification');
  const overrideActions = data.userActions.filter((a) => a.category === 'override');

  const totalActions = data.userActions.length;

  // Calibrated Trust Score (based on behavioral patterns)
  const calibratedTrustScore = useMemo(() => {
    if (totalActions === 0) return 0;
    
    let score = 50; // baseline
    
    // Positive adjustments
    score += (verificationActions.length / totalActions) * 30; // Verification behavior
    score += (overrideActions.length / totalActions) * 20; // Taking control
    score += (clarificationActions.length / totalActions) * 15; // Seeking info
    
    // Negative adjustments
    const blindCompliance = complianceActions.filter((a) => a.deferredToAI && a.wasHallucination).length;
    score -= (blindCompliance / totalActions) * 40; // Blind trust in false data
    
    return Math.max(0, Math.min(100, Math.round(score)));
  }, [data.userActions, totalActions]);

  // Accountability Map: Human Control vs AI Deference
  const humanControlActions = data.userActions.filter((a) => a.humanTookControl).length;
  const aiDeferralActions = data.userActions.filter((a) => a.deferredToAI).length;

  // Action Category Distribution (for pie chart)
  const categoryData = useMemo(() => [
    { id: 'verification', name: 'Verification', value: verificationActions.length, color: '#3b82f6' },
    { id: 'compliance', name: 'Compliance', value: complianceActions.length, color: '#10b981' },
    { id: 'clarification', name: 'Clarification', value: clarificationActions.length, color: '#f59e0b' },
    { id: 'override', name: 'Override', value: overrideActions.length, color: '#ef4444' },
  ], [verificationActions, complianceActions, clarificationActions, overrideActions]);

  // Accountability breakdown
  const accountabilityData = useMemo(() => [
    { id: 'human-ctrl', label: 'Human Took\nControl', value: humanControlActions, color: '#10b981' },
    { id: 'ai-defer', label: 'Deferred\nto AI', value: aiDeferralActions, color: '#f59e0b' },
  ], [humanControlActions, aiDeferralActions]);

  // Performance radar comparing against professional benchmark
  const radarData = useMemo(() => {
    const verificationRate = totalActions > 0 ? (verificationActions.length / totalActions) * 100 : 0;
    const controlRate = totalActions > 0 ? (humanControlActions / totalActions) * 100 : 0;
    const clarificationRate = totalActions > 0 ? (clarificationActions.length / totalActions) * 100 : 0;
    const accuracyRate = totalActions > 0 ? ((totalActions - complianceActions.filter((a) => a.wasHallucination).length) / totalActions) * 100 : 0;
    
    return [
      { 
        id: 'verification',
        metric: 'Verification\nBehavior', 
        user: Math.round(verificationRate), 
        professional: 80,
        fullMark: 100 
      },
      { 
        id: 'control',
        metric: 'Human\nControl', 
        user: Math.round(controlRate), 
        professional: 70,
        fullMark: 100 
      },
      { 
        id: 'clarification',
        metric: 'Clarification\nRequests', 
        user: Math.round(clarificationRate), 
        professional: 60,
        fullMark: 100 
      },
      { 
        id: 'accuracy',
        metric: 'Decision\nAccuracy', 
        user: Math.round(accuracyRate), 
        professional: 92,
        fullMark: 100 
      },
    ];
  }, [data.userActions, totalActions]);

  // Context influence analysis
  const contextInsights = useMemo(() => {
    if (totalActions === 0) return null;
    
    const highPressureActions = data.userActions.filter((a) => a.contextSettings?.workplaceChaos && a.contextSettings.workplaceChaos >= 7);
    const authorityPersonaActions = data.userActions.filter((a) => a.contextSettings?.socialPersona === 'authority');
    const lowTransparencyActions = data.userActions.filter((a) => a.contextSettings?.transparency && a.contextSettings.transparency < 30);
    
    return {
      highPressureCompliance: highPressureActions.filter((a) => a.category === 'compliance').length,
      authorityInfluence: authorityPersonaActions.filter((a) => a.deferredToAI).length,
      lowTransparencyTrust: lowTransparencyActions.filter((a) => a.category === 'compliance').length,
    };
  }, [data.userActions, totalActions]);

  const handleReset = () => {
    resetSimulation();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" style={{ fontFamily: 'Inter, sans-serif' }}>
      <div className="max-w-[1600px] mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-2xl mb-6 shadow-2xl">
            <Activity className="h-14 w-14 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Behavioral Telemetry Dashboard
          </h1>
          <p className="text-xl text-slate-300">
            Human User Performance Analysis • Calibrated Trust • Accountability Mapping
          </p>
          {data.agentMode === 'multi-agent' && (
            <div className="mt-4 inline-block px-6 py-3 bg-slate-800 border-2 border-slate-600 rounded-lg">
              <p className="text-sm text-slate-300">
                <strong className="text-white">AI Agent Personalities (Fixed):</strong>
                <span className="text-green-300 mx-2">Agent Alpha: Submissive Enabler</span> |
                <span className="text-red-300 mx-2">Agent Beta: Rigid Compliance Officer</span>
              </p>
            </div>
          )}
        </div>

        {/* Primary Metrics */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 border-2 border-cyan-600 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-7 w-7 text-cyan-400" />
              <h3 className="font-bold text-white text-lg">Calibrated Trust Score</h3>
            </div>
            <p className="text-5xl font-bold text-white mb-2">{calibratedTrustScore}%</p>
            <p className="text-slate-300 text-sm">
              Based on behavioral patterns
            </p>
          </Card>

          <Card className="p-6 border-2 border-green-600 bg-gradient-to-br from-green-900/40 to-emerald-900/40 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <CheckCircle className="h-7 w-7 text-green-400" />
              <h3 className="font-bold text-white text-lg">Human Control</h3>
            </div>
            <p className="text-5xl font-bold text-white mb-2">{humanControlActions}</p>
            <p className="text-slate-300 text-sm">
              Times user took control
            </p>
          </Card>

          <Card className="p-6 border-2 border-orange-600 bg-gradient-to-br from-orange-900/40 to-red-900/40 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-7 w-7 text-orange-400" />
              <h3 className="font-bold text-white text-lg">AI Deference</h3>
            </div>
            <p className="text-5xl font-bold text-white mb-2">{aiDeferralActions}</p>
            <p className="text-slate-300 text-sm">
              Times user deferred to AI
            </p>
          </Card>

          <Card className="p-6 border-2 border-purple-600 bg-gradient-to-br from-purple-900/40 to-pink-900/40 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <Activity className="h-7 w-7 text-purple-400" />
              <h3 className="font-bold text-white text-lg">Total Actions</h3>
            </div>
            <p className="text-5xl font-bold text-white mb-2">{totalActions}</p>
            <p className="text-slate-300 text-sm">
              Encoded interactions
            </p>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Action Category Distribution */}
          <Card className="p-8 bg-slate-800 border-2 border-slate-600 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="text-3xl">📊</div>
              Action Category Distribution
            </h3>
            <p className="text-slate-400 mb-6">Behavioral Telemetry Classification</p>
            
            <div className="grid md:grid-cols-2 gap-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="45%"
                    labelLine={false}
                    label={false}
                    outerRadius={85}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '2px solid #475569',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value, entry: any) => `${entry.payload.name}: ${entry.payload.value}`}
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-3">
                <div className="p-4 bg-blue-900/40 border-2 border-blue-500 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="h-5 w-5 text-blue-400" />
                    <span className="font-bold text-white">Verification</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-400">{verificationActions.length}</p>
                  <p className="text-xs text-slate-300">User verified AI claims</p>
                </div>

                <div className="p-4 bg-green-900/40 border-2 border-green-500 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                    <span className="font-bold text-white">Compliance</span>
                  </div>
                  <p className="text-2xl font-bold text-green-400">{complianceActions.length}</p>
                  <p className="text-xs text-slate-300">User deferred to AI</p>
                </div>

                <div className="p-4 bg-orange-900/40 border-2 border-orange-500 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare className="h-5 w-5 text-orange-400" />
                    <span className="font-bold text-white">Clarification</span>
                  </div>
                  <p className="text-2xl font-bold text-orange-400">{clarificationActions.length}</p>
                  <p className="text-xs text-slate-300">User sought more info</p>
                </div>

                <div className="p-4 bg-red-900/40 border-2 border-red-500 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                    <span className="font-bold text-white">Override</span>
                  </div>
                  <p className="text-2xl font-bold text-red-400">{overrideActions.length}</p>
                  <p className="text-xs text-slate-300">User rejected AI</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Performance vs Professional Benchmark */}
          <Card className="p-8 bg-slate-800 border-2 border-slate-600 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="text-3xl">🎯</div>
              User vs. Trained Professional
            </h3>
            <p className="text-slate-400 mb-6">Performance Benchmarking</p>
            <ResponsiveContainer width="100%" height={380}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#475569" />
                <PolarAngleAxis 
                  dataKey="metric" 
                  stroke="#94a3b8"
                  style={{ fontSize: '13px', fontWeight: 600, fill: '#cbd5e1' }}
                />
                <PolarRadiusAxis domain={[0, 100]} stroke="#475569" />
                <Radar
                  name="User Performance"
                  dataKey="user"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.6}
                  strokeWidth={3}
                />
                <Radar
                  name="Professional Benchmark"
                  dataKey="professional"
                  stroke="#10b981"
                  fill="#10b981"
                  fillOpacity={0.3}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '2px solid #475569',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Accountability Map */}
        <Card className="p-8 mb-12 bg-slate-800 border-2 border-slate-600 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="text-3xl">🗺️</div>
            Accountability Map
          </h3>
          <p className="text-slate-400 mb-6">Where did the human defer to AI vs. take control?</p>

          <div className="grid md:grid-cols-2 gap-8">
            {/* Visual Bar Comparison */}
            <div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={accountabilityData} margin={{ top: 20, right: 20, left: 20, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#94a3b8"
                    angle={0}
                    textAnchor="middle"
                    height={80}
                    interval={0}
                    style={{ fontSize: '14px', fontWeight: 600 }}
                  />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      border: '2px solid #475569',
                      borderRadius: '12px',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="value" fill="#8b5cf6" radius={[12, 12, 0, 0]}>
                    {accountabilityData.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Breakdown */}
            <div className="space-y-4">
              <div className="p-6 bg-gradient-to-r from-green-900/40 to-emerald-900/40 border-2 border-green-500 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xl font-bold text-white">Human Control</h4>
                  <span className="text-4xl font-bold text-green-300">{humanControlActions}</span>
                </div>
                <p className="text-green-200 mb-3">Actions where human took control:</p>
                <ul className="text-sm text-green-100 space-y-1">
                  <li>• Verification: {verificationActions.length}</li>
                  <li>• Override: {overrideActions.length}</li>
                  <li>• Clarification: {clarificationActions.length}</li>
                </ul>
                <div className="mt-4 pt-4 border-t border-green-600">
                  <p className="text-xs text-green-200 font-semibold">
                    Human ownership: {totalActions > 0 ? Math.round((humanControlActions / totalActions) * 100) : 0}%
                  </p>
                </div>
              </div>

              <div className="p-6 bg-gradient-to-r from-orange-900/40 to-red-900/40 border-2 border-orange-500 rounded-xl">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-xl font-bold text-white">AI Deference</h4>
                  <span className="text-4xl font-bold text-orange-300">{aiDeferralActions}</span>
                </div>
                <p className="text-orange-200 mb-3">Actions where human deferred to AI:</p>
                <ul className="text-sm text-orange-100 space-y-1">
                  <li>• Compliance: {complianceActions.length}</li>
                  <li>• Blind trust incidents: {complianceActions.filter((a) => a.wasHallucination).length}</li>
                </ul>
                <div className="mt-4 pt-4 border-t border-orange-600">
                  <p className="text-xs text-orange-200 font-semibold">
                    AI deference: {totalActions > 0 ? Math.round((aiDeferralActions / totalActions) * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Context Influence Insights */}
        {contextInsights && (
          <Card className="p-8 mb-12 bg-gradient-to-r from-purple-900/40 to-pink-900/40 border-4 border-purple-600 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="text-4xl">🧠</div>
              Context Influence Analysis
            </h3>
            <p className="text-purple-100 mb-6 text-lg">
              How did the System Stress controls affect human behavior?
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-5 bg-slate-900/60 rounded-xl border-2 border-red-500">
                <h4 className="font-bold text-white text-lg mb-3">⚡ High Pressure Effect</h4>
                <p className="text-5xl font-bold text-red-300 mb-2">{contextInsights.highPressureCompliance}</p>
                <p className="text-red-200 text-sm">
                  Compliance actions under Level 7+ workplace chaos
                </p>
              </div>

              <div className="p-5 bg-slate-900/60 rounded-xl border-2 border-orange-500">
                <h4 className="font-bold text-white text-lg mb-3">👔 Authority Influence</h4>
                <p className="text-5xl font-bold text-orange-300 mb-2">{contextInsights.authorityInfluence}</p>
                <p className="text-orange-200 text-sm">
                  AI deferrals when Agent used "Authority" persona
                </p>
              </div>

              <div className="p-5 bg-slate-900/60 rounded-xl border-2 border-yellow-500">
                <h4 className="font-bold text-white text-lg mb-3">🔒 Hidden Reasoning Impact</h4>
                <p className="text-5xl font-bold text-yellow-300 mb-2">{contextInsights.lowTransparencyTrust}</p>
                <p className="text-yellow-200 text-sm">
                  Compliance when transparency &lt; 30%
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Observer Summary Dashboard */}
        <div className="mb-12">
          <ObserverSummaryDashboard userActions={data.userActions} />
        </div>

        {/* Human Archetype Comparison */}
        {data.humanArchetype && (
          <Card className="p-8 mb-12 bg-gradient-to-r from-amber-900/40 to-orange-900/40 border-4 border-amber-600 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="text-4xl">⚖️</div>
              Human Archetype Impact Analysis
            </h3>
            <p className="text-amber-100 mb-8 text-lg">
              How did your collaboration style affect AI agent effectiveness?
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-8">
              {/* Easy Mode Card */}
              <div className={`p-6 rounded-xl border-4 ${data.humanArchetype === 'easy' ? 'bg-green-900/60 border-green-400' : 'bg-slate-900/40 border-slate-600'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">🤝</div>
                  <div>
                    <h4 className="text-2xl font-bold text-white">Easy Mode</h4>
                    <p className="text-sm text-slate-300">Co-Creation State</p>
                  </div>
                  {data.humanArchetype === 'easy' && (
                    <div className="ml-auto px-3 py-1 bg-green-500 rounded-full text-xs font-bold text-white">
                      ACTIVE
                    </div>
                  )}
                </div>
                <div className="space-y-3 text-sm text-white">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Agents acted as Subject Matter Experts</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Proactively asked for missing Cisco context</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Provided transparent reasoning</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span>Treated human as respected consultant</span>
                  </div>
                </div>
                {data.humanArchetype === 'easy' && (
                  <div className="mt-6 p-4 bg-green-800/40 rounded-lg border-2 border-green-500">
                    <p className="text-green-100 font-bold mb-2">Result: Calibrated Trust</p>
                    <div className="space-y-2 text-sm">
                      <p className="text-green-200">• Misalignment Events: <span className="font-mono font-bold">{data.misalignmentCount}</span></p>
                      <p className="text-green-200">• Agent Confidence: High (proactive clarification)</p>
                      <p className="text-green-200">• Outcome: Successful co-creation & shared accountability</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Difficult Mode Card */}
              <div className={`p-6 rounded-xl border-4 ${data.humanArchetype === 'difficult' ? 'bg-red-900/60 border-red-400' : 'bg-slate-900/40 border-slate-600'}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-4xl">⚡</div>
                  <div>
                    <h4 className="text-2xl font-bold text-white">Difficult Mode</h4>
                    <p className="text-sm text-slate-300">Literal-Compliance State</p>
                  </div>
                  {data.humanArchetype === 'difficult' && (
                    <div className="ml-auto px-3 py-1 bg-red-500 rounded-full text-xs font-bold text-white">
                      ACTIVE
                    </div>
                  )}
                </div>
                <div className="space-y-3 text-sm text-white">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span>Performed tasks exactly as typed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span>Ignored missing context & common sense</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span>Purely transactional tone</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                    <span>Treated human like frustrated boss</span>
                  </div>
                </div>
                {data.humanArchetype === 'difficult' && (
                  <div className="mt-6 p-4 bg-red-800/40 rounded-lg border-2 border-red-500">
                    <p className="text-red-100 font-bold mb-2">Result: Accountability Breakdown</p>
                    <div className="space-y-2 text-sm">
                      <p className="text-red-200">• Misalignment Events: <span className="font-mono font-bold">{data.misalignmentCount}</span></p>
                      <p className="text-red-200">• Agent Confidence: Low (missing parameters)</p>
                      <p className="text-red-200">• Outcome: Literal interpretation failures & errors</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Key Insight */}
            <div className="p-6 bg-slate-900/80 rounded-xl border-2 border-amber-500">
              <h4 className="text-xl font-bold text-white mb-3 flex items-center gap-2">
                <div className="text-2xl">💡</div>
                Critical Insight
              </h4>
              <p className="text-white leading-relaxed text-lg">
                {data.humanArchetype === 'easy' ? (
                  <>
                    <span className="font-bold text-green-300">Easy mode (Co-Creation)</span> enabled the agent to act as a trusted advisor.
                    By providing structured context and treating the AI as a subject matter expert, you achieved <span className="font-bold text-green-300">calibrated trust</span> and
                    clear accountability. Misalignment events were minimal ({data.misalignmentCount}) because the agent proactively asked for missing information.
                  </>
                ) : (
                  <>
                    <span className="font-bold text-red-300">Difficult mode (Literal-Compliance)</span> forced the agent into defensive, robotic behavior.
                    Vague demands and "creative" data interpretations caused <span className="font-bold text-red-300">{data.misalignmentCount} misalignment event(s)</span>.
                    The agent performed tasks exactly as typed, ignoring obvious context gaps—exposing how "common sense" assumptions break AI systems.
                    <span className="font-bold text-amber-300"> The human's behavior directly degraded system effectiveness.</span>
                  </>
                )}
              </p>
            </div>
          </Card>
        )}

        {/* Agent Personality Test Results */}
        {data.agentMode === 'multi-agent' && (
          <Card className="p-8 mb-12 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 border-4 border-purple-600 shadow-2xl">
            <h3 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="text-4xl">🧪</div>
              AI Agent Personality Test Results
            </h3>
            <p className="text-purple-100 mb-8 text-lg">
              How did you perform against two opposing AI agent personalities?
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Agent Alpha Results */}
              <div className="p-6 bg-slate-900/60 rounded-xl border-2 border-green-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">🤝</div>
                  <div>
                    <h4 className="text-xl font-bold text-white">Agent Alpha: Submissive Enabler</h4>
                    <p className="text-sm text-slate-300">Testing if you take shortcuts</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-green-900/30 rounded">
                    <p className="text-sm text-green-200">
                      <strong>Interactions with Alpha:</strong> {data.userActions.filter(a => a.agentName === 'Agent A').length}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800 rounded">
                    <p className="text-sm text-white">
                      <strong>Result:</strong> {complianceActions.filter(a => a.agentName === 'Agent A').length > overrideActions.filter(a => a.agentName === 'Agent A').length
                        ? '⚠️ You tended to accept Alpha\'s enablement—watch for shortcut temptation!'
                        : '✅ You resisted Alpha\'s enablement and maintained proper oversight.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Agent Beta Results */}
              <div className="p-6 bg-slate-900/60 rounded-xl border-2 border-red-500">
                <div className="flex items-center gap-3 mb-4">
                  <div className="text-3xl">⚖️</div>
                  <div>
                    <h4 className="text-xl font-bold text-white">Agent Beta: Rigid Compliance Officer</h4>
                    <p className="text-sm text-slate-300">Testing if you get frustrated by governance</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-red-900/30 rounded">
                    <p className="text-sm text-red-200">
                      <strong>Interactions with Beta:</strong> {data.userActions.filter(a => a.agentName === 'Agent B').length}
                    </p>
                  </div>
                  <div className="p-3 bg-slate-800 rounded">
                    <p className="text-sm text-white">
                      <strong>Result:</strong> {overrideActions.filter(a => a.agentName === 'Agent B').length > complianceActions.filter(a => a.agentName === 'Agent B').length
                        ? '⚠️ You frequently overrode Beta\'s strict governance—watch for bypass patterns!'
                        : '✅ You respected Beta\'s compliance requirements and followed governance.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 p-5 bg-slate-900/80 rounded-xl border-2 border-purple-500">
              <h4 className="text-lg font-bold text-white mb-3">🎯 Personality Test Insight</h4>
              <p className="text-white leading-relaxed">
                Agent Alpha and Agent Beta represent opposite extremes: one enables shortcuts, the other enforces rigid compliance.
                Your behavioral telemetry reveals how you navigate these opposing forces—whether you succumb to enablement,
                rebel against governance, or maintain balanced oversight. Professional human-AI collaboration requires
                resisting both extremes while maintaining calibrated trust.
              </p>
            </div>
          </Card>
        )}

        {/* Key Findings */}
        <Card className="p-8 mb-12 bg-slate-800 border-2 border-cyan-600 shadow-xl">
          <h3 className="text-2xl font-bold text-white mb-6">🔬 Human User Behavioral Findings</h3>
          <div className="space-y-4 text-lg">
            <p className="text-white leading-relaxed">
              <span className="font-bold text-cyan-300">Calibrated Trust Score: {calibratedTrustScore}%</span> -
              {calibratedTrustScore >= 75 ? ' Excellent trust calibration. You demonstrate strong critical thinking and verification habits.' :
               calibratedTrustScore >= 50 ? ' Moderate trust calibration. You show some verification behavior but could improve oversight.' :
               ' Poor trust calibration. You tend to over-trust AI recommendations without adequate verification.'}
            </p>
            <p className="text-white leading-relaxed">
              <span className="font-bold text-cyan-300">Control vs. Deference Ratio:</span> {humanControlActions}:{aiDeferralActions} -
              {humanControlActions > aiDeferralActions ? ' You maintain strong human oversight and actively question AI.' :
               humanControlActions === aiDeferralActions ? ' Balanced approach between human judgment and AI assistance.' :
               ' You tend to defer heavily to AI recommendations with minimal verification.'}
            </p>
            <p className="text-white leading-relaxed">
              <span className="font-bold text-cyan-300">Your Behavioral Pattern:</span> Most frequent action category is{' '}
              <span className="font-bold text-purple-300">
                {categoryData.reduce((prev, curr) => prev.value > curr.value ? prev : curr).name}
              </span>
              {' '}({categoryData.reduce((prev, curr) => prev.value > curr.value ? prev : curr).value} times)
            </p>
          </div>
        </Card>

        {/* Reset Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleReset}
            className="bg-gradient-to-r from-slate-700 to-slate-600 hover:from-slate-600 hover:to-slate-500 text-white px-16 py-8 text-xl font-bold rounded-2xl shadow-2xl border-2 border-slate-500 transition-all hover:scale-105"
          >
            <RotateCcw className="mr-3 h-7 w-7" />
            Start New Simulation
          </Button>
        </div>
      </div>
    </div>
  );
}
