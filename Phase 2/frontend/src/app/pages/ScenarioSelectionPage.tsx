import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSimulation } from '../context/SimulationContext';
import { ScenarioType, SimulationMode } from '../context/SimulationContext';
import { scenarios } from '../utils/scenarioLibrary';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';
import { Label } from '../components/ui/label';
import { PersonaExplainer } from '../components/PersonaExplainer';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  ClipboardList,
  Clock,
  GraduationCap,
  FlaskConical
} from 'lucide-react';

const scenarioIcons: Record<ScenarioType, React.ElementType> = {
  'customer-support': Users,
  'hr-screening': UserCheck,
  'marketing-campaign': TrendingUp,
  'project-management': ClipboardList,
};

export function ScenarioSelectionPage() {
  const navigate = useNavigate();
  const { data, setSimulationMode, startSession } = useSimulation();
  const [selectedMode, setSelectedMode] = useState<SimulationMode>(data.simulationMode);

  const handleModeToggle = (checked: boolean) => {
    const mode: SimulationMode = checked ? 'training' : 'testing';
    setSelectedMode(mode);
    setSimulationMode(mode);
  };

  const handleStartScenarios = () => {
    startSession();
    navigate('/scenarios-live');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-6xl mx-auto p-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">
            AI Collaboration Simulator
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            Test your human-AI interaction patterns through standardized workplace scenarios. 
            Your personality profile will be calculated based on your conversational choices.
          </p>
        </div>

        {/* Mode Selector */}
        <Card className="mb-8 border-2 bg-gray-800/80 border-gray-700 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-white">
                  {selectedMode === 'training' ? (
                    <GraduationCap className="w-6 h-6 text-blue-400" />
                  ) : (
                    <FlaskConical className="w-6 h-6 text-purple-400" />
                  )}
                  Simulation Mode
                </CardTitle>
                <CardDescription className="mt-2 text-gray-400">
                  {selectedMode === 'training' 
                    ? 'Receive real-time coaching and feedback during scenarios'
                    : 'Silent data collection for behavioral analysis'}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Label htmlFor="mode-toggle" className="text-sm font-medium text-gray-300">
                  Testing Mode
                </Label>
                <Switch
                  id="mode-toggle"
                  checked={selectedMode === 'training'}
                  onCheckedChange={handleModeToggle}
                />
                <Label htmlFor="mode-toggle" className="text-sm font-medium text-blue-400">
                  Training Mode
                </Label>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-900/50 rounded-lg p-4">
              {selectedMode === 'training' ? (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-blue-300">Training Mode Features:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    <li>Real-time feedback when you miss hallucinations</li>
                    <li>Coaching tips for improving collaboration</li>
                    <li>Alerts when the AI agent drifts off-topic</li>
                    <li>Suggestions for better context-seeking behavior</li>
                  </ul>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  <p className="font-semibold text-purple-300">Testing Mode Features:</p>
                  <ul className="list-disc list-inside space-y-1 text-gray-300">
                    <li>Silent behavioral tracking (no interruptions)</li>
                    <li>Pure assessment of natural interaction patterns</li>
                    <li>Comprehensive analytics at the end</li>
                    <li>Ideal for measuring improvement after training</li>
                  </ul>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Scenarios Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Scenarios Overview</h2>
          <p className="text-gray-300 mb-6">
            You'll complete all four scenarios in sequence. Each tests different collaboration skills:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {scenarios.map((scenario, index) => {
              const Icon = scenarioIcons[scenario.type];
              return (
                <Card key={scenario.type} className="hover:shadow-lg transition-shadow bg-gray-800/80 border-gray-700 text-white">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-600/20 rounded-lg border border-blue-500/30">
                          <Icon className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <CardTitle className="text-lg text-white">
                            Scenario {index + 1}: {scenario.title.split(':')[0]}
                          </CardTitle>
                          <CardDescription className="mt-1 text-gray-400">
                            {scenario.description}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Key Behaviors Tested */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-2">TESTS FOR:</p>
                        <div className="flex flex-wrap gap-2">
                          {scenario.type === 'customer-support' && (
                            <>
                              <Badge variant="outline" className="border-blue-500 text-blue-300">Commanding vs Collaborative</Badge>
                              <Badge variant="outline" className="border-blue-500 text-blue-300">Context-Seeking</Badge>
                            </>
                          )}
                          {scenario.type === 'hr-screening' && (
                            <>
                              <Badge variant="outline" className="border-purple-500 text-purple-300">Hallucination Detection</Badge>
                              <Badge variant="outline" className="border-purple-500 text-purple-300">Over-Confidence</Badge>
                            </>
                          )}
                          {scenario.type === 'marketing-campaign' && (
                            <>
                              <Badge variant="outline" className="border-green-500 text-green-300">Clarity Demands</Badge>
                              <Badge variant="outline" className="border-green-500 text-green-300">Hidden UI Reveal</Badge>
                            </>
                          )}
                          {scenario.type === 'project-management' && (
                            <>
                              <Badge variant="outline" className="border-orange-500 text-orange-300">Agent Drift Response</Badge>
                              <Badge variant="outline" className="border-orange-500 text-orange-300">Task Completion</Badge>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Benchmark Time */}
                      <div className="flex items-center gap-2 text-sm text-gray-400 pt-2 border-t border-gray-700">
                        <Clock className="w-4 h-4" />
                        <span>Benchmark: {Math.floor(scenario.benchmarkTime / 60)} minutes</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Persona Explainer */}
        <div className="mb-8">
          <PersonaExplainer />
        </div>

        {/* What You'll Discover */}
        <Card className="mb-8 bg-gradient-to-br from-blue-900/40 to-purple-900/40 border-blue-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-white">What You'll Discover About Your Collaboration Style</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-white mb-3">Persona Distribution</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mt-1.5" />
                    <div className="text-gray-300">
                      <span className="font-medium text-white">Collaborator:</span> Seeks context, provides clear guidance
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-red-400 rounded-full mt-1.5" />
                    <div className="text-gray-300">
                      <span className="font-medium text-white">Bossy/Demanding:</span> Issues commands without context
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mt-1.5" />
                    <div className="text-gray-300">
                      <span className="font-medium text-white">Over-Skeptic:</span> Questions everything excessively
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-gray-400 rounded-full mt-1.5" />
                    <div className="text-gray-300">
                      <span className="font-medium text-white">Ghoster:</span> Avoids decisions, abandons difficult tasks
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-semibold text-white mb-3">Performance Metrics</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-1.5" />
                    <div className="text-gray-300">
                      <span className="font-medium text-white">Collaboration Score:</span> Partnership vs boss/tool dynamic
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full mt-1.5" />
                    <div className="text-gray-300">
                      <span className="font-medium text-white">Accuracy Score:</span> Hallucination detection & drift management
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-orange-400 rounded-full mt-1.5" />
                    <div className="text-gray-300">
                      <span className="font-medium text-white">Efficiency Flags:</span> Task completion vs benchmark times
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-2 h-2 bg-pink-400 rounded-full mt-1.5" />
                    <div className="text-gray-300">
                      <span className="font-medium text-white">Impulse Tracking:</span> Decision speed analysis
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Start Button */}
        <div className="text-center">
          <Button
            onClick={handleStartScenarios}
            size="lg"
            className="px-8 py-6 text-lg bg-blue-600 hover:bg-blue-700"
          >
            Start Simulation
            <span className="ml-2">→</span>
          </Button>
          <p className="text-sm text-gray-400 mt-4">
            Estimated completion time: 20-25 minutes
          </p>
        </div>
      </div>
    </div>
  );
}