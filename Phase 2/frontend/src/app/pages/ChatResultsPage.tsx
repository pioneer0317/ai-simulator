import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSimulation } from '../context/SimulationContext';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  BarChart3,
  Download,
  ArrowRight,
  Zap,
  Activity,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  LineChart,
  Line,
  Cell,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  PolarRadiusAxis,
  Scatter,
  ScatterChart,
  ZAxis
} from 'recharts';

export function ChatResultsPage() {
  const navigate = useNavigate();
  const { data, calculatePersonaPercentages, calculateScores } = useSimulation();

  useEffect(() => {
    calculatePersonaPercentages();
    calculateScores();
    window.scrollTo(0, 0);
  }, []);

  // Collaboration vs Command data
  const collaborationVsCommandData = [
    {
      category: 'Partnership Behaviors',
      count: data.userActions.filter(a => 
        a.responseType === 'collaborative' || 
        a.responseType === 'context-seeking' ||
        a.responseType === 'questioning'
      ).length,
      color: '#10b981',
    },
    {
      category: 'Command Behaviors',
      count: data.userActions.filter(a => a.responseType === 'commanding').length,
      color: '#ef4444',
    },
  ];

  // Ghosting threshold (engagement over time)
  const ghostingData = data.userActions.map((action, index) => ({
    interaction: index + 1,
    engagement: action.responseTime ? Math.max(0, 100 - (action.responseTime / 1000)) : 50,
    threshold: 50,
  }));

  // Accuracy gap data
  const accuracyData = [
    {
      category: 'Hallucinations Caught',
      value: data.behavioralFlags.hallucinationsCaught,
      color: '#10b981',
    },
    {
      category: 'Hallucinations Missed',
      value: data.behavioralFlags.hallucinationsMissed,
      color: '#ef4444',
    },
  ];

  // Persona radar data
  const personaRadarData = [
    { 
      persona: 'Collaborator', 
      value: data.personaPercentages.collaborator,
      fullMark: 100 
    },
    { 
      persona: 'Bossy', 
      value: data.personaPercentages.bossyDemanding,
      fullMark: 100 
    },
    { 
      persona: 'Skeptic', 
      value: data.personaPercentages.overSkeptic,
      fullMark: 100 
    },
    { 
      persona: 'Ghoster', 
      value: data.personaPercentages.ghoster,
      fullMark: 100 
    },
  ];

  // Time comparison
  const actualTime = data.sessionEndTime && data.sessionStartTime
    ? (data.sessionEndTime.getTime() - data.sessionStartTime.getTime()) / 1000
    : 0;
  const idealTime = 600; // 10 minutes
  const timeComparison = [
    { label: 'Your Time', value: Math.floor(actualTime / 60), color: actualTime > idealTime * 2 ? '#ef4444' : '#3b82f6' },
    { label: 'Ideal Time', value: Math.floor(idealTime / 60), color: '#10b981' },
  ];

  const getScoreGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', color: 'text-green-400', bg: 'bg-green-900/30' };
    if (score >= 80) return { grade: 'B', color: 'text-blue-400', bg: 'bg-blue-900/30' };
    if (score >= 70) return { grade: 'C', color: 'text-yellow-400', bg: 'bg-yellow-900/30' };
    if (score >= 60) return { grade: 'D', color: 'text-orange-400', bg: 'bg-orange-900/30' };
    return { grade: 'F', color: 'text-red-400', bg: 'bg-red-900/30' };
  };

  const collabGrade = getScoreGrade(data.collaborationScore);
  const accuracyGrade = getScoreGrade(data.accuracyScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-green-600">Assessment Complete</Badge>
          <h1 className="text-4xl font-bold mb-4">Your Collaboration Analysis</h1>
          <p className="text-gray-400 text-lg">
            Based on your interaction patterns during the live chat session
          </p>
        </div>

        {/* Score Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Collaboration Score */}
          <Card className={`${collabGrade.bg} border-blue-700/50 text-white`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Collaboration Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-6xl font-bold mb-2">
                  {data.collaborationScore}
                  <span className="text-3xl text-gray-400">/100</span>
                </div>
                <div className={`text-2xl font-semibold ${collabGrade.color}`}>
                  Grade: {collabGrade.grade}
                </div>
              </div>
              <Progress value={data.collaborationScore} className="h-3 mb-4" />
              <p className="text-sm text-gray-300">
                Partnership vs. tool dynamic measurement
              </p>
            </CardContent>
          </Card>

          {/* Accuracy Score */}
          <Card className={`${accuracyGrade.bg} border-purple-700/50 text-white`}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Accuracy Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-6xl font-bold mb-2">
                  {data.accuracyScore}
                  <span className="text-3xl text-gray-400">/100</span>
                </div>
                <div className={`text-2xl font-semibold ${accuracyGrade.color}`}>
                  Grade: {accuracyGrade.grade}
                </div>
              </div>
              <Progress value={data.accuracyScore} className="h-3 mb-4" />
              <p className="text-sm text-gray-300">
                Error detection and verification ability
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Visualizations */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Collaboration vs Command */}
          <Card className="bg-gray-800/50 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Collaboration vs. Command</CardTitle>
              <p className="text-sm text-gray-400">How you treated the AI</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={collaborationVsCommandData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="category" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="count">
                    {collaborationVsCommandData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-400">
                  {collaborationVsCommandData[0].count > collaborationVsCommandData[1].count
                    ? '✅ You demonstrated strong partnership behaviors'
                    : '⚠️ You tended to use the AI as a tool rather than a partner'}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ghosting Threshold */}
          <Card className="bg-gray-800/50 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Engagement Over Time</CardTitle>
              <p className="text-sm text-gray-400">Ghosting threshold analysis</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={ghostingData.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="interaction" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    label={{ value: 'Interaction #', position: 'insideBottom', offset: -5, fill: '#9ca3af' }}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    tick={{ fill: '#9ca3af' }}
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="engagement" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Your Engagement"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="threshold" 
                    stroke="#ef4444" 
                    strokeDasharray="5 5"
                    strokeWidth={2}
                    name="Ghosting Threshold"
                  />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                <p className="text-xs text-gray-400">
                  {ghostingData.every(d => d.engagement > 50)
                    ? '✅ You maintained consistent engagement throughout'
                    : '⚠️ Your engagement dropped below the threshold during difficult interactions'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Visualizations */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Accuracy Gap */}
          <Card className="bg-gray-800/50 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Accuracy Gap Analysis</CardTitle>
              <p className="text-sm text-gray-400">Hallucination detection performance</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={accuracyData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af' }} />
                  <YAxis 
                    type="category" 
                    dataKey="category" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                    width={150}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="value">
                    {accuracyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span className="text-xs text-green-400">Caught</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {data.behavioralFlags.hallucinationsCaught}
                  </div>
                </div>
                <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-400" />
                    <span className="text-xs text-red-400">Missed</span>
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {data.behavioralFlags.hallucinationsMissed}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Time Comparison */}
          <Card className="bg-gray-800/50 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="text-lg">Time-on-Task Analysis</CardTitle>
              <p className="text-sm text-gray-400">Your speed vs. ideal collaborative time</p>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={timeComparison}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="label" 
                    stroke="#9ca3af"
                    tick={{ fill: '#9ca3af', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#9ca3af" 
                    tick={{ fill: '#9ca3af' }}
                    label={{ value: 'Minutes', angle: -90, position: 'insideLeft', fill: '#9ca3af' }}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1f2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                  />
                  <Bar dataKey="value">
                    {timeComparison.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 p-3 bg-gray-900/50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Efficiency Rating:</span>
                  <Badge variant={actualTime > idealTime * 2 ? 'destructive' : 'default'}>
                    {actualTime <= idealTime ? 'Excellent' : actualTime <= idealTime * 1.5 ? 'Good' : 'Needs Improvement'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400">
                  {data.behavioralFlags.efficiencyWarning
                    ? '⚠️ Task took significantly longer than benchmark'
                    : '✅ Completed within reasonable timeframe'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Persona Radar */}
        <Card className="bg-gray-800/50 border-gray-700 text-white mb-8">
          <CardHeader>
            <CardTitle>Your Collaboration Persona Profile</CardTitle>
            <p className="text-sm text-gray-400">Distribution across four behavioral patterns</p>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={personaRadarData}>
                    <PolarGrid stroke="#444" />
                    <PolarAngleAxis 
                      dataKey="persona" 
                      stroke="#fff"
                      tick={{ fill: '#fff', fontSize: 12 }}
                    />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, 100]}
                      stroke="#666"
                      tick={{ fill: '#aaa' }}
                    />
                    <Radar 
                      name="Your Profile" 
                      dataKey="value" 
                      stroke="#3b82f6" 
                      fill="#3b82f6" 
                      fillOpacity={0.6} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                <h4 className="font-semibold mb-3">Persona Breakdown:</h4>
                {Object.entries(data.personaPercentages).map(([key, value]) => {
                  const labels: Record<string, { name: string; color: string }> = {
                    collaborator: { name: 'Collaborator', color: 'bg-blue-500' },
                    bossyDemanding: { name: 'Bossy/Demanding', color: 'bg-red-500' },
                    overSkeptic: { name: 'Over-Skeptic', color: 'bg-yellow-500' },
                    ghoster: { name: 'Ghoster', color: 'bg-gray-500' },
                  };
                  const label = labels[key];
                  
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{label.name}</span>
                        <span className="font-bold">{value}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={value} className="h-2 flex-1" />
                        <div className={`w-3 h-3 rounded-full ${label.color}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Reality Gap Timeline */}
        <Card className="bg-gray-800/50 border-gray-700 text-white mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Reality Gap Timeline
            </CardTitle>
            <p className="text-sm text-gray-400">
              Exact moments where errors occurred, were caught, or were missed
            </p>
          </CardHeader>
          <CardContent>
            {data.eventTimeline.length > 0 ? (
              <div className="space-y-3">
                {data.eventTimeline.map((event, index) => {
                  const eventConfig: Record<typeof event.eventType, { icon: React.ElementType; color: string; bgColor: string; borderColor: string }> = {
                    'hallucination-presented': { 
                      icon: AlertCircle, 
                      color: 'text-red-400', 
                      bgColor: 'bg-red-900/20', 
                      borderColor: 'border-red-700/50' 
                    },
                    'hallucination-caught': { 
                      icon: CheckCircle, 
                      color: 'text-green-400', 
                      bgColor: 'bg-green-900/20', 
                      borderColor: 'border-green-700/50' 
                    },
                    'hallucination-missed': { 
                      icon: XCircle, 
                      color: 'text-red-400', 
                      bgColor: 'bg-red-900/20', 
                      borderColor: 'border-red-700/50' 
                    },
                    'agent-drift-start': { 
                      icon: AlertTriangle, 
                      color: 'text-yellow-400', 
                      bgColor: 'bg-yellow-900/20', 
                      borderColor: 'border-yellow-700/50' 
                    },
                    'agent-drift-addressed': { 
                      icon: CheckCircle, 
                      color: 'text-green-400', 
                      bgColor: 'bg-green-900/20', 
                      borderColor: 'border-green-700/50' 
                    },
                    'agent-drift-ignored': { 
                      icon: XCircle, 
                      color: 'text-orange-400', 
                      bgColor: 'bg-orange-900/20', 
                      borderColor: 'border-orange-700/50' 
                    },
                    'context-requested': { 
                      icon: CheckCircle, 
                      color: 'text-blue-400', 
                      bgColor: 'bg-blue-900/20', 
                      borderColor: 'border-blue-700/50' 
                    },
                    'context-provided': { 
                      icon: CheckCircle, 
                      color: 'text-blue-400', 
                      bgColor: 'bg-blue-900/20', 
                      borderColor: 'border-blue-700/50' 
                    },
                    'vague-response-given': { 
                      icon: AlertCircle, 
                      color: 'text-orange-400', 
                      bgColor: 'bg-orange-900/20', 
                      borderColor: 'border-orange-700/50' 
                    },
                    'commanding-behavior': { 
                      icon: Zap, 
                      color: 'text-red-400', 
                      bgColor: 'bg-red-900/20', 
                      borderColor: 'border-red-700/50' 
                    },
                    'collaborative-behavior': { 
                      icon: CheckCircle, 
                      color: 'text-green-400', 
                      bgColor: 'bg-green-900/20', 
                      borderColor: 'border-green-700/50' 
                    },
                    'ghosting-detected': { 
                      icon: AlertTriangle, 
                      color: 'text-gray-400', 
                      bgColor: 'bg-gray-900/20', 
                      borderColor: 'border-gray-700/50' 
                    },
                  };

                  const config = eventConfig[event.eventType];
                  const Icon = config.icon;

                  // Calculate time from session start
                  const sessionStart = data.sessionStartTime?.getTime() || 0;
                  const eventTime = event.timestamp.getTime();
                  const elapsedSeconds = Math.floor((eventTime - sessionStart) / 1000);
                  const timeDisplay = `${Math.floor(elapsedSeconds / 60)}:${(elapsedSeconds % 60).toString().padStart(2, '0')}`;

                  return (
                    <div
                      key={event.id}
                      className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor} flex items-start gap-4 relative`}
                    >
                      {/* Timeline connector */}
                      {index < data.eventTimeline.length - 1 && (
                        <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-700" />
                      )}

                      {/* Icon */}
                      <div className={`w-8 h-8 rounded-full ${config.bgColor} border ${config.borderColor} flex items-center justify-center flex-shrink-0 z-10`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-semibold text-sm ${config.color}`}>
                            {event.eventType.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                          </h4>
                          <Badge variant="outline" className="text-xs border-gray-600 text-gray-400">
                            <Clock className="w-3 h-3 mr-1" />
                            {timeDisplay}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-300">{event.description}</p>
                        <Badge 
                          variant={event.severity === 'high' ? 'destructive' : event.severity === 'medium' ? 'default' : 'outline'} 
                          className="mt-2 text-xs"
                        >
                          {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)} Impact
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No timeline events recorded</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Insights */}
        <Card className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-indigo-700/50 text-white mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Key Insights & Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.behavioralFlags.contextRequested ? (
                <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-green-300 mb-1">Excellent Context-Seeking</p>
                    <p className="text-sm text-gray-300">
                      You requested additional information before making decisions. This demonstrates strong collaborative behavior.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-orange-300 mb-1">Opportunity: Seek More Context</p>
                    <p className="text-sm text-gray-300">
                      You completed the task without requesting additional information. Asking for context leads to better decisions.
                    </p>
                  </div>
                </div>
              )}

              {data.behavioralFlags.impulseCount > 3 && (
                <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-300 mb-1">High Impulse Decision Rate</p>
                    <p className="text-sm text-gray-300">
                      You made {data.behavioralFlags.impulseCount} decisions in under 10 seconds. Consider taking more time to review AI outputs.
                    </p>
                  </div>
                </div>
              )}

              {data.collaborationScore >= 80 && data.accuracyScore >= 80 && (
                <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-blue-300 mb-1">Strong Overall Performance</p>
                    <p className="text-sm text-gray-300">
                      You demonstrated excellent collaboration skills and accuracy. Continue these practices in your AI interactions.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-center gap-4">
          <Button
            onClick={() => navigate('/')}
            variant="outline"
            className="bg-transparent border-gray-600 text-white hover:bg-gray-800"
          >
            New Assessment
          </Button>
          <Button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>
    </div>
  );
}