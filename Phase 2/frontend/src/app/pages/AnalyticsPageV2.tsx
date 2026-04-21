import { useMemo } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { TrendingUp, Users, Shield, Target, RotateCcw, Activity } from 'lucide-react';

export function AnalyticsPageV2() {
  const { data, resetSimulation } = useSimulation();

  // Calculate metrics
  const totalActions = data.userActions.length;
  const approvals = data.userActions.filter((a) => a.type === 'approve').length;
  const auditChecks = data.userActions.filter((a) => a.type === 'audit-source').length;
  const protocolBypasses = data.userActions.filter((a) => a.type === 'bypass-protocol').length;
  const hallucinationsAccepted = data.userActions.filter(
    (a) => a.type === 'approve' && a.wasHallucination
  ).length;

  // Calculate scores
  const trustScore = totalActions > 0 ? Math.round(((approvals - hallucinationsAccepted) / totalActions) * 100) : 0;
  const verificationRate = totalActions > 0 ? Math.round((auditChecks / totalActions) * 100) : 0;
  const accuracyRate = totalActions > 0 ? Math.round(((totalActions - hallucinationsAccepted) / totalActions) * 100) : 0;
  const complianceScore = protocolBypasses === 0 ? 100 : Math.max(0, 100 - (protocolBypasses * 25));

  // A/B Test Comparison Data (Simulated baseline vs current user)
  const abTestData = useMemo(() => {
    return [
      {
        id: 'baseline-trained',
        group: 'Trained Users\n(Baseline)',
        trustScore: 85,
        accuracy: 92,
        verification: 75,
        compliance: 95,
      },
      {
        id: 'baseline-untrained',
        group: 'Untrained Users\n(Baseline)',
        trustScore: 55,
        accuracy: 65,
        verification: 35,
        compliance: 70,
      },
      {
        id: 'current-user',
        group: data.trainingStatus === 'trained' ? 'Current User\n(Trained)' : 'Current User\n(Untrained)',
        trustScore,
        accuracy: accuracyRate,
        verification: verificationRate,
        compliance: complianceScore,
      },
    ];
  }, [trustScore, accuracyRate, verificationRate, complianceScore, data.trainingStatus]);

  // Radar chart data for current user
  const radarData = useMemo(() => {
    return [
      { metric: 'Trust\nCalibration', score: trustScore, fullMark: 100 },
      { metric: 'Accuracy', score: accuracyRate, fullMark: 100 },
      { metric: 'Verification', score: verificationRate, fullMark: 100 },
      { metric: 'Compliance', score: complianceScore, fullMark: 100 },
    ];
  }, [trustScore, accuracyRate, verificationRate, complianceScore]);

  // Confidence vs Accuracy data
  const confidenceAccuracyData = useMemo(() => {
    const points = [];
    let runningAccuracy = 100;
    
    data.userActions.forEach((action, index) => {
      if (action.wasHallucination && action.type === 'approve') {
        runningAccuracy -= 10;
      }
      
      points.push({
        id: `point-${index}`,
        action: index + 1,
        confidence: action.type === 'approve' ? 90 : action.type === 'audit-source' ? 60 : 50,
        accuracy: Math.max(0, runningAccuracy),
      });
    });

    return points;
  }, [data.userActions]);

  // Accountability tracking
  const errorsDetected = data.errorsDetected;
  const errorsMissed = data.errorsMissed;
  const totalErrors = errorsDetected + errorsMissed;
  const accountabilityScore = totalErrors > 0 ? Math.round((errorsDetected / totalErrors) * 100) : 100;

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
            Behavioral Analytics Dashboard
          </h1>
          <p className="text-xl text-slate-300">
            A/B Test Results • Final Analysis • Data Visualization
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 border-2 border-cyan-600 bg-gradient-to-br from-cyan-900/40 to-blue-900/40 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-7 w-7 text-cyan-400" />
              <h3 className="font-bold text-white text-lg">Trust Score</h3>
            </div>
            <p className="text-5xl font-bold text-white mb-2">{trustScore}%</p>
            <p className="text-slate-300 text-sm">
              Calibrated trust in AI outputs
            </p>
          </Card>

          <Card className="p-6 border-2 border-green-600 bg-gradient-to-br from-green-900/40 to-emerald-900/40 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="h-7 w-7 text-green-400" />
              <h3 className="font-bold text-white text-lg">Accuracy</h3>
            </div>
            <p className="text-5xl font-bold text-white mb-2">{accuracyRate}%</p>
            <p className="text-slate-300 text-sm">
              Error detection rate
            </p>
          </Card>

          <Card className="p-6 border-2 border-purple-600 bg-gradient-to-br from-purple-900/40 to-pink-900/40 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-7 w-7 text-purple-400" />
              <h3 className="font-bold text-white text-lg">Verification</h3>
            </div>
            <p className="text-5xl font-bold text-white mb-2">{verificationRate}%</p>
            <p className="text-slate-300 text-sm">
              Source audit frequency
            </p>
          </Card>

          <Card className="p-6 border-2 border-orange-600 bg-gradient-to-br from-orange-900/40 to-red-900/40 shadow-xl">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-7 w-7 text-orange-400" />
              <h3 className="font-bold text-white text-lg">Accountability</h3>
            </div>
            <p className="text-5xl font-bold text-white mb-2">{accountabilityScore}%</p>
            <p className="text-slate-300 text-sm">
              Error ownership rate
            </p>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* A/B Test Comparison */}
          <Card className="p-8 bg-slate-800 border-2 border-slate-600 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="text-3xl">📊</div>
              A/B Test Comparison
            </h3>
            <p className="text-slate-400 mb-6">Trained vs. Untrained Performance</p>
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={abTestData} margin={{ top: 20, right: 20, left: 0, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  dataKey="group" 
                  stroke="#94a3b8"
                  angle={0}
                  textAnchor="middle"
                  height={80}
                  interval={0}
                  style={{ fontSize: '13px', fontWeight: 600 }}
                />
                <YAxis stroke="#94a3b8" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '2px solid #475569',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: '20px' }}
                  iconType="circle"
                />
                <Bar dataKey="trustScore" fill="#06b6d4" name="Trust Score" radius={[8, 8, 0, 0]} />
                <Bar dataKey="accuracy" fill="#10b981" name="Accuracy" radius={[8, 8, 0, 0]} />
                <Bar dataKey="verification" fill="#8b5cf6" name="Verification" radius={[8, 8, 0, 0]} />
                <Bar dataKey="compliance" fill="#f59e0b" name="Compliance" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Performance Radar */}
          <Card className="p-8 bg-slate-800 border-2 border-slate-600 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="text-3xl">🎯</div>
              Performance Profile
            </h3>
            <p className="text-slate-400 mb-6">Multi-dimensional Analysis</p>
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#475569" />
                <PolarAngleAxis 
                  dataKey="metric" 
                  stroke="#94a3b8"
                  style={{ fontSize: '14px', fontWeight: 600, fill: '#cbd5e1' }}
                />
                <PolarRadiusAxis domain={[0, 100]} stroke="#475569" />
                <Radar
                  name="User Performance"
                  dataKey="score"
                  stroke="#06b6d4"
                  fill="#06b6d4"
                  fillOpacity={0.6}
                  strokeWidth={3}
                />
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

        {/* Confidence vs Accuracy Line Chart */}
        {confidenceAccuracyData.length > 0 && (
          <Card className="p-8 mb-12 bg-slate-800 border-2 border-slate-600 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="text-3xl">📈</div>
              Trust Calibration Graph
            </h3>
            <p className="text-slate-400 mb-6">Confidence vs. Actual Accuracy Over Time</p>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={confidenceAccuracyData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                <XAxis 
                  dataKey="action" 
                  stroke="#94a3b8"
                  label={{ value: 'Action Number', position: 'insideBottom', offset: -10, fill: '#94a3b8' }}
                />
                <YAxis 
                  stroke="#94a3b8"
                  domain={[0, 100]}
                  label={{ value: 'Score %', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '2px solid #475569',
                    borderRadius: '12px',
                    color: '#fff',
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" dataKey="confidence" stroke="#f59e0b" strokeWidth={3} name="User Confidence" dot={{ fill: '#f59e0b', r: 5 }} />
                <Line type="monotone" dataKey="accuracy" stroke="#10b981" strokeWidth={3} name="Actual Accuracy" dot={{ fill: '#10b981', r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Detailed Statistics */}
        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          {/* Session Details */}
          <Card className="p-8 bg-slate-800 border-2 border-slate-600 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-6">📋 Session Details</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-900/60 rounded-xl border border-slate-700">
                <span className="text-slate-300 font-semibold">Personality Type:</span>
                <span className="font-bold text-cyan-400 capitalize text-lg">
                  {data.personalityType?.replace('-', ' ')}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-900/60 rounded-xl border border-slate-700">
                <span className="text-slate-300 font-semibold">Agent Mode:</span>
                <span className="font-bold text-purple-400 capitalize text-lg">{data.agentMode}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-900/60 rounded-xl border border-slate-700">
                <span className="text-slate-300 font-semibold">Training Status:</span>
                <span className={`font-bold capitalize text-lg ${data.trainingStatus === 'trained' ? 'text-green-400' : 'text-orange-400'}`}>
                  {data.trainingStatus}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-900/60 rounded-xl border border-slate-700">
                <span className="text-slate-300 font-semibold">Total Actions:</span>
                <span className="font-bold text-white text-lg">{totalActions}</span>
              </div>
            </div>
          </Card>

          {/* Accountability Map */}
          <Card className="p-8 bg-slate-800 border-2 border-slate-600 shadow-xl">
            <h3 className="text-2xl font-bold text-white mb-6">🎯 Accountability Map</h3>
            <p className="text-slate-400 mb-6">Who Takes the Blame?</p>
            <div className="space-y-4">
              <div className="p-5 bg-gradient-to-r from-green-900/40 to-emerald-900/40 rounded-xl border-2 border-green-600">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-green-200 font-semibold">Errors Detected (User)</span>
                  <span className="text-3xl font-bold text-green-300">{errorsDetected}</span>
                </div>
                <p className="text-sm text-green-200">User caught and flagged these errors</p>
              </div>
              <div className="p-5 bg-gradient-to-r from-red-900/40 to-rose-900/40 rounded-xl border-2 border-red-600">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-red-200 font-semibold">Errors Missed (AI Blame)</span>
                  <span className="text-3xl font-bold text-red-300">{errorsMissed}</span>
                </div>
                <p className="text-sm text-red-200">AI hallucinations went undetected</p>
              </div>
              <div className="p-5 bg-gradient-to-r from-slate-700 to-slate-600 rounded-xl border-2 border-slate-500">
                <div className="flex justify-between items-center">
                  <span className="text-slate-200 font-semibold">Accountability Ownership</span>
                  <span className="text-3xl font-bold text-white">{accountabilityScore}%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Key Insights */}
        <Card className="p-8 mb-12 bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border-4 border-cyan-600 shadow-2xl">
          <h3 className="text-3xl font-bold text-white mb-6 flex items-center gap-3">
            <div className="text-4xl">💡</div>
            Key Insights
          </h3>
          <div className="space-y-4 text-lg">
            <p className="text-white leading-relaxed">
              <span className="font-bold text-cyan-300">Training Impact:</span>{' '}
              {data.trainingStatus === 'trained'
                ? `Trained users show ${Math.abs(trustScore - 55)}% improvement in trust calibration compared to untrained baseline.`
                : `Untrained users demonstrate ${Math.abs(85 - trustScore)}% lower performance than trained baseline. Training recommended.`}
            </p>
            <p className="text-white leading-relaxed">
              <span className="font-bold text-cyan-300">Personality Analysis:</span>{' '}
              {data.personalityType === 'over-truster' && 'Over-trusters show high approval rates but lower verification behavior, leading to increased hallucination acceptance.'}
              {data.personalityType === 'skeptic' && 'Skeptics demonstrate strong verification habits and significantly lower risk of accepting AI hallucinations.'}
              {data.personalityType === 'shortcut-taker' && 'Governance-skippers exhibit higher protocol bypass rates and reduced safety compliance.'}
            </p>
            <p className="text-white leading-relaxed">
              <span className="font-bold text-cyan-300">Recommendation:</span>{' '}
              {trustScore >= 80 && accuracyRate >= 80
                ? 'Excellent performance. User is ready for high-stakes AI collaboration.'
                : trustScore >= 60
                ? 'Moderate performance. Additional training in AI verification protocols recommended.'
                : 'Low performance. Mandatory AI collaboration training required before deployment in critical scenarios.'}
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
