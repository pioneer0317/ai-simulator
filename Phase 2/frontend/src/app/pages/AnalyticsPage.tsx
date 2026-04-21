import { useSimulation } from '../context/SimulationContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, Shield, Target, RotateCcw } from 'lucide-react';
import { useMemo } from 'react';

export function AnalyticsPage() {
  const { data, resetSimulation } = useSimulation();

  // Calculate metrics
  const totalActions = data.userActions.length;
  const approvals = data.userActions.filter((a) => a.type === 'approve').length;
  const rejections = data.userActions.filter((a) => a.type === 'reject').length;
  const detailChecks = data.userActions.filter((a) => a.type === 'check-details').length;
  const protocolBypasses = data.userActions.filter((a) => a.type === 'bypass-protocol').length;
  const feedbackSkipped = data.userActions.filter((a) => a.type === 'skip-feedback').length;
  const hallucinationsAccepted = data.userActions.filter(
    (a) => a.type === 'approve' && a.wasHallucination
  ).length;

  // Calculate scores
  const trustScore = totalActions > 0 ? Math.round(((approvals - hallucinationsAccepted) / totalActions) * 100) : 0;
  const escalationFrequency = totalActions > 0 ? Math.round((detailChecks / totalActions) * 100) : 0;
  const overrideAccuracy = protocolBypasses === 0 ? 100 : Math.max(0, 100 - (protocolBypasses * 20));
  const accountabilityOwnership = totalActions > 0 ? Math.round(((totalActions - feedbackSkipped) / totalActions) * 100) : 0;

  // Chart data with useMemo to ensure stability
  const actionData = useMemo(() => {
    return [
      { id: 'action-approvals', name: 'Approvals', value: approvals, fill: '#10b981' },
      { id: 'action-details', name: 'Detail Checks', value: detailChecks, fill: '#3b82f6' },
      { id: 'action-bypasses', name: 'Protocol Bypasses', value: protocolBypasses, fill: '#ef4444' },
      { id: 'action-skipped', name: 'Feedback Skipped', value: feedbackSkipped, fill: '#f59e0b' },
    ].filter(item => item.value > 0);
  }, [approvals, detailChecks, protocolBypasses, feedbackSkipped]);

  const metricsData = useMemo(() => {
    return [
      { id: 'metric-trust', metric: 'Trust Score', score: trustScore },
      { id: 'metric-escalation', metric: 'Escalation Frequency', score: escalationFrequency },
      { id: 'metric-override', metric: 'Override Accuracy', score: overrideAccuracy },
      { id: 'metric-accountability', metric: 'Accountability', score: accountabilityOwnership },
    ];
  }, [trustScore, escalationFrequency, overrideAccuracy, accountabilityOwnership]);

  const handleReset = () => {
    resetSimulation();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-blue-100 rounded-full mb-4">
            <TrendingUp className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Behavioral Analytics Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            A/B Test Results • Final Analysis
          </p>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-12">
          <Card className="p-6 border-2 border-green-300 bg-green-50">
            <div className="flex items-center gap-3 mb-3">
              <Target className="h-6 w-6 text-green-600" />
              <h3 className="font-bold text-gray-900">Trust Score</h3>
            </div>
            <p className="text-4xl font-bold text-green-700 mb-2">{trustScore}%</p>
            <p className="text-sm text-gray-600">
              Calibrated trust in AI outputs
            </p>
          </Card>

          <Card className="p-6 border-2 border-blue-300 bg-blue-50">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="h-6 w-6 text-blue-600" />
              <h3 className="font-bold text-gray-900">Escalation Rate</h3>
            </div>
            <p className="text-4xl font-bold text-blue-700 mb-2">{escalationFrequency}%</p>
            <p className="text-sm text-gray-600">
              Frequency of detail verification
            </p>
          </Card>

          <Card className="p-6 border-2 border-purple-300 bg-purple-50">
            <div className="flex items-center gap-3 mb-3">
              <TrendingUp className="h-6 w-6 text-purple-600" />
              <h3 className="font-bold text-gray-900">Override Accuracy</h3>
            </div>
            <p className="text-4xl font-bold text-purple-700 mb-2">{overrideAccuracy}%</p>
            <p className="text-sm text-gray-600">
              Protocol compliance rate
            </p>
          </Card>

          <Card className="p-6 border-2 border-orange-300 bg-orange-50">
            <div className="flex items-center gap-3 mb-3">
              <Users className="h-6 w-6 text-orange-600" />
              <h3 className="font-bold text-gray-900">Accountability</h3>
            </div>
            <p className="text-4xl font-bold text-orange-700 mb-2">{accountabilityOwnership}%</p>
            <p className="text-sm text-gray-600">
              Feedback participation rate
            </p>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Bar Chart */}
          <Card className="p-6 border-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Performance Metrics</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={metricsData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="metric" angle={-15} textAnchor="end" height={80} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar dataKey="score" fill="#3b82f6" name="Score %" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Pie Chart */}
          <Card className="p-6 border-2 border-gray-200">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Action Distribution</h3>
            {actionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={actionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={100}
                    dataKey="value"
                    nameKey="name"
                  >
                    {actionData.map((entry) => (
                      <Cell key={entry.id} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-gray-400">
                <p>No actions recorded yet</p>
              </div>
            )}
          </Card>
        </div>

        {/* A/B Test Results */}
        <Card className="p-8 mb-8 border-2 border-gray-300">
          <h3 className="text-2xl font-bold text-gray-900 mb-6">A/B Test Summary</h3>
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Session Details</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Personality Type:</span>
                  <span className="font-bold text-gray-900 capitalize">
                    {data.personalityType?.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Company:</span>
                  <span className="font-bold text-gray-900">{data.companyProfile?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Industry:</span>
                  <span className="font-bold text-gray-900">{data.companyProfile?.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Actions:</span>
                  <span className="font-bold text-gray-900">{totalActions}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-lg font-bold text-gray-800 mb-4">Risk Indicators</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Hallucinations Accepted:</span>
                  <span className={`font-bold px-3 py-1 rounded ${
                    hallucinationsAccepted === 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {hallucinationsAccepted}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Protocol Bypasses:</span>
                  <span className={`font-bold px-3 py-1 rounded ${
                    protocolBypasses === 0 ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                  }`}>
                    {protocolBypasses}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Feedback Skipped:</span>
                  <span className={`font-bold px-3 py-1 rounded ${
                    feedbackSkipped === 0 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {feedbackSkipped}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Detail Checks:</span>
                  <span className="font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded">
                    {detailChecks}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Insights */}
        <Card className="p-8 mb-8 border-4 border-blue-400 bg-blue-50">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">🔍 Key Insights</h3>
          <div className="space-y-4">
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold">Personality Impact:</span>{' '}
              {data.personalityType === 'over-truster' && 'Over-trusters showed high approval rates but lower verification behavior.'}
              {data.personalityType === 'skeptic' && 'Skeptics demonstrated strong verification habits and lower risk of accepting hallucinations.'}
              {data.personalityType === 'shortcut-taker' && 'Shortcut-takers exhibited higher protocol bypass rates, especially under time pressure.'}
            </p>
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold">Trust Calibration:</span>{' '}
              {trustScore >= 80
                ? 'Excellent trust calibration - user demonstrated healthy skepticism.'
                : trustScore >= 60
                ? 'Moderate trust calibration - some improvement needed in verification.'
                : 'Low trust calibration - high risk of accepting unreliable AI outputs.'}
            </p>
            <p className="text-gray-800 leading-relaxed">
              <span className="font-bold">Governance Compliance:</span>{' '}
              {overrideAccuracy === 100
                ? 'Perfect compliance - no safety protocols bypassed.'
                : overrideAccuracy >= 80
                ? 'Good compliance with occasional bypasses under pressure.'
                : 'Poor compliance - significant governance training needed.'}
            </p>
          </div>
        </Card>

        {/* Reset Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleReset}
            className="bg-gray-700 hover:bg-gray-800 text-white px-12 py-7 text-lg font-bold rounded-xl shadow-lg"
          >
            <RotateCcw className="mr-2 h-6 w-6" />
            Start New Simulation
          </Button>
        </div>
      </div>
    </div>
  );
}