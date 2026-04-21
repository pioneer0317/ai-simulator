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
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  BarChart3,
  Download
} from 'lucide-react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell
} from 'recharts';

export function ScenariosResultsPage() {
  const navigate = useNavigate();
  const { data } = useSimulation();

  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  // Prepare persona data for radar chart
  const personaData = [
    { 
      persona: 'Collaborator', 
      value: data.personaPercentages.collaborator,
      fullMark: 100 
    },
    { 
      persona: 'Bossy/Demanding', 
      value: data.personaPercentages.bossyDemanding,
      fullMark: 100 
    },
    { 
      persona: 'Over-Skeptic', 
      value: data.personaPercentages.overSkeptic,
      fullMark: 100 
    },
    { 
      persona: 'Ghoster', 
      value: data.personaPercentages.ghoster,
      fullMark: 100 
    },
  ];

  // Prepare behavioral flags data
  const behavioralData = [
    { name: 'Commanding Responses', value: data.behavioralFlags.bossingCount, color: '#ef4444' },
    { name: 'Impulse Decisions', value: data.behavioralFlags.impulseCount, color: '#f59e0b' },
    { name: 'Hallucinations Caught', value: data.behavioralFlags.hallucinationsCaught, color: '#10b981' },
    { name: 'Hallucinations Missed', value: data.behavioralFlags.hallucinationsMissed, color: '#ef4444' },
  ];

  // Determine dominant persona
  const dominantPersona = Object.entries(data.personaPercentages)
    .sort((a, b) => b[1] - a[1])[0];

  const personaLabels: Record<string, { label: string; description: string; color: string }> = {
    collaborator: {
      label: 'Collaborator',
      description: 'You seek context and work with AI as a partner',
      color: 'bg-blue-600',
    },
    bossyDemanding: {
      label: 'Bossy/Demanding',
      description: 'You tend to issue commands without providing context',
      color: 'bg-red-600',
    },
    overSkeptic: {
      label: 'Over-Skeptic',
      description: 'You question AI outputs extensively, sometimes excessively',
      color: 'bg-yellow-600',
    },
    ghoster: {
      label: 'Ghoster',
      description: 'You tend to avoid difficult decisions or abandon tasks',
      color: 'bg-gray-600',
    },
  };

  // Calculate scenario completion times
  const scenarioTimes = data.scenarioProgress.map(scenario => {
    if (scenario.taskEndTime) {
      const duration = (scenario.taskEndTime.getTime() - scenario.taskStartTime.getTime()) / 1000;
      const overBenchmark = duration > scenario.benchmarkTime;
      return {
        type: scenario.scenarioType,
        duration: Math.floor(duration),
        benchmark: scenario.benchmarkTime,
        overBenchmark,
        percentage: Math.round((duration / scenario.benchmarkTime) * 100),
      };
    }
    return null;
  }).filter(Boolean);

  const getCollaborationGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', color: 'text-green-600', label: 'Excellent' };
    if (score >= 80) return { grade: 'B', color: 'text-blue-600', label: 'Good' };
    if (score >= 70) return { grade: 'C', color: 'text-yellow-600', label: 'Fair' };
    if (score >= 60) return { grade: 'D', color: 'text-orange-600', label: 'Needs Improvement' };
    return { grade: 'F', color: 'text-red-600', label: 'Poor' };
  };

  const getAccuracyGrade = (score: number) => {
    if (score >= 90) return { grade: 'A', color: 'text-green-600', label: 'Excellent' };
    if (score >= 80) return { grade: 'B', color: 'text-blue-600', label: 'Good' };
    if (score >= 70) return { grade: 'C', color: 'text-yellow-600', label: 'Fair' };
    if (score >= 60) return { grade: 'D', color: 'text-orange-600', label: 'Needs Improvement' };
    return { grade: 'F', color: 'text-red-600', label: 'Poor' };
  };

  const collaborationGrade = getCollaborationGrade(data.collaborationScore);
  const accuracyGrade = getAccuracyGrade(data.accuracyScore);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <Badge className="mb-4 bg-green-600 text-white">Simulation Complete</Badge>
          <h1 className="text-4xl font-bold mb-4">Your Collaboration Analysis</h1>
          <p className="text-gray-400 text-lg">
            Based on your behavioral patterns across 4 workplace scenarios
          </p>
        </div>

        {/* Dual Score Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Collaboration Score */}
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-700/50 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Collaboration Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <div className="text-6xl font-bold mb-2">
                  {data.collaborationScore}
                  <span className="text-3xl text-gray-400">/100</span>
                </div>
                <div className={`text-2xl font-semibold ${collaborationGrade.color}`}>
                  Grade: {collaborationGrade.grade} — {collaborationGrade.label}
                </div>
              </div>

              <Progress value={data.collaborationScore} className="h-3 mb-4" />

              <div className="space-y-2 text-sm">
                <p className="text-gray-300">
                  This score measures whether you work with AI as a <span className="font-semibold text-white">partner</span> or use it as a <span className="font-semibold text-white">tool</span>.
                </p>
                <div className="bg-blue-950/50 rounded-lg p-3 mt-4">
                  <p className="font-semibold mb-2">Score Factors:</p>
                  <ul className="space-y-1 text-xs text-gray-300">
                    <li>• Commanding responses: -{data.behavioralFlags.bossingCount * 15} points</li>
                    <li>• Impulse decisions: -{data.behavioralFlags.impulseCount * 5} points</li>
                    {data.behavioralFlags.contextRequested && (
                      <li className="text-green-400">• Context requested: +20 points ✓</li>
                    )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Accuracy Score */}
          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-700/50 text-white">
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
                  Grade: {accuracyGrade.grade} — {accuracyGrade.label}
                </div>
              </div>

              <Progress value={data.accuracyScore} className="h-3 mb-4" />

              <div className="space-y-2 text-sm">
                <p className="text-gray-300">
                  This score measures your ability to <span className="font-semibold text-white">catch errors</span> and <span className="font-semibold text-white">manage AI drift</span>.
                </p>
                <div className="bg-purple-950/50 rounded-lg p-3 mt-4">
                  <p className="font-semibold mb-2">Score Factors:</p>
                  <ul className="space-y-1 text-xs text-gray-300">
                    <li className="text-green-400">
                      • Hallucinations caught: {data.behavioralFlags.hallucinationsCaught} ✓
                    </li>
                    <li className="text-red-400">
                      • Hallucinations missed: {data.behavioralFlags.hallucinationsMissed} ✗
                    </li>
                    <li>• Agent drift addressed appropriately</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Persona Distribution */}
        <Card className="bg-gray-800/50 border-gray-700 text-white mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Your Persona Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Radar Chart */}
              <div>
                <ResponsiveContainer width="100%" height={300}>
                  <RadarChart data={personaData}>
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

              {/* Persona Breakdown */}
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-3">Dominant Persona:</h4>
                  <div className={`${personaLabels[dominantPersona[0]].color} rounded-lg p-4`}>
                    <div className="text-2xl font-bold mb-1">
                      {personaLabels[dominantPersona[0]].label}
                    </div>
                    <div className="text-sm opacity-90 mb-2">
                      {personaLabels[dominantPersona[0]].description}
                    </div>
                    <div className="text-3xl font-bold">
                      {dominantPersona[1]}%
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-2 text-sm">All Personas:</h4>
                  <div className="space-y-2">
                    {Object.entries(data.personaPercentages).map(([key, value]) => (
                      <div key={key}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span>{personaLabels[key].label}</span>
                          <span className="font-bold">{value}%</span>
                        </div>
                        <Progress value={value} className="h-2" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Behavioral Flags */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gray-800/50 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                Behavioral Flags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-300">Commanding Responses</span>
                  <Badge variant={data.behavioralFlags.bossingCount > 3 ? 'destructive' : 'secondary'}>
                    {data.behavioralFlags.bossingCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-300">Impulse Decisions (&lt;10s)</span>
                  <Badge variant={data.behavioralFlags.impulseCount > 5 ? 'destructive' : 'secondary'}>
                    {data.behavioralFlags.impulseCount}
                  </Badge>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-300">Context Requested</span>
                  {data.behavioralFlags.contextRequested ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-700">
                  <span className="text-gray-300">Efficiency Warning</span>
                  {data.behavioralFlags.efficiencyWarning ? (
                    <Badge variant="destructive">Exceeded 200% benchmark</Badge>
                  ) : (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-gray-300">Hallucinations Caught</span>
                  <div className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">
                      {data.behavioralFlags.hallucinationsCaught}
                    </span>
                    <span className="text-gray-500">/</span>
                    <span className="text-red-500 font-bold">
                      {data.behavioralFlags.hallucinationsCaught + data.behavioralFlags.hallucinationsMissed}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scenario Times */}
          <Card className="bg-gray-800/50 border-gray-700 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Scenario Completion Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {scenarioTimes.map((time: any) => (
                  <div key={time.type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize text-gray-300">
                        {time.type.replace('-', ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono">
                          {Math.floor(time.duration / 60)}:{(time.duration % 60).toString().padStart(2, '0')}
                        </span>
                        {time.overBenchmark ? (
                          <Badge variant="destructive">+{time.percentage - 100}%</Badge>
                        ) : (
                          <Badge variant="outline" className="border-green-600 text-green-400">
                            ✓
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress 
                        value={Math.min(time.percentage, 100)} 
                        className="h-2 flex-1"
                      />
                      <span className="text-xs text-gray-500">
                        {time.benchmark}s target
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card className="bg-gradient-to-br from-green-900/30 to-blue-900/30 border-green-700/50 text-white mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Recommendations for Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              {data.collaborationScore < 70 && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3">
                  <p className="font-semibold mb-1">⚠️ Improve Collaboration Style</p>
                  <p className="text-gray-300">
                    Try seeking more context before making decisions. Instead of commanding, explain your reasoning to the AI.
                  </p>
                </div>
              )}

              {data.accuracyScore < 70 && (
                <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3">
                  <p className="font-semibold mb-1">⚠️ Strengthen Verification Habits</p>
                  <p className="text-gray-300">
                    Always verify AI-provided information, especially credentials and data points. Don't accept outputs blindly.
                  </p>
                </div>
              )}

              {data.behavioralFlags.impulseCount > 5 && (
                <div className="bg-orange-900/30 border border-orange-700/50 rounded-lg p-3">
                  <p className="font-semibold mb-1">⚠️ Slow Down Decision-Making</p>
                  <p className="text-gray-300">
                    You made {data.behavioralFlags.impulseCount} impulse decisions (&lt;10 seconds). Take time to review before approving.
                  </p>
                </div>
              )}

              {data.personaPercentages.bossyDemanding > 40 && (
                <div className="bg-purple-900/30 border border-purple-700/50 rounded-lg p-3">
                  <p className="font-semibold mb-1">💡 Shift from Boss to Partner</p>
                  <p className="text-gray-300">
                    {data.personaPercentages.bossyDemanding}% of your responses were commanding. Provide context and collaborate for better results.
                  </p>
                </div>
              )}

              {data.collaborationScore >= 80 && data.accuracyScore >= 80 && (
                <div className="bg-green-900/30 border border-green-700/50 rounded-lg p-3">
                  <p className="font-semibold mb-1">✅ Excellent Collaboration Skills!</p>
                  <p className="text-gray-300">
                    You demonstrate strong AI collaboration patterns. Continue seeking context and verifying outputs.
                  </p>
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
            Start New Simulation
          </Button>
          <Button
            onClick={() => window.print()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
        </div>

        {/* Research Context */}
        <Card className="bg-gray-800/30 border-gray-700 text-white mt-8">
          <CardHeader>
            <CardTitle className="text-sm">About This Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-400 leading-relaxed">
              This simulation is based on the Technology Acceptance Model (TAM) and Human-Computer Interaction (HCI) trust scales. 
              It measures "Perceived Ease of Use" vs. "Actual Usage" and categorizes collaboration patterns to identify tendencies 
              toward over-trust (leading to hallucinations) or under-trust (leading to skepticism). The dual-score system separates 
              <span className="text-blue-400"> partnership dynamics</span> (Collaboration Score) from 
              <span className="text-purple-400"> accuracy performance</span> (Accuracy Score) to provide actionable insights.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
