import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSimulation } from '../context/SimulationContext';
import { ScenarioType } from '../context/SimulationContext';
import { ScenarioSimulator } from '../components/ScenarioSimulator';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { CheckCircle } from 'lucide-react';

const scenarioOrder: ScenarioType[] = [
  'customer-support',
  'hr-screening',
  'marketing-campaign',
  'project-management',
];

const scenarioTitles: Record<ScenarioType, string> = {
  'customer-support': 'Customer Support',
  'hr-screening': 'HR Screening',
  'marketing-campaign': 'Marketing Campaign',
  'project-management': 'Project Management',
};

export function ScenariosLivePage() {
  const navigate = useNavigate();
  const { calculatePersonaPercentages, calculateScores, endSession } = useSimulation();
  const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
  const [completedScenarios, setCompletedScenarios] = useState<Set<ScenarioType>>(new Set());

  const currentScenario = scenarioOrder[currentScenarioIndex];
  const progress = ((currentScenarioIndex) / scenarioOrder.length) * 100;

  const handleScenarioComplete = () => {
    const newCompleted = new Set(completedScenarios);
    newCompleted.add(currentScenario);
    setCompletedScenarios(newCompleted);

    // Move to next scenario or finish
    if (currentScenarioIndex < scenarioOrder.length - 1) {
      setTimeout(() => {
        setCurrentScenarioIndex(prev => prev + 1);
      }, 1500);
    } else {
      // All scenarios complete
      endSession();
      calculatePersonaPercentages();
      calculateScores();
      
      setTimeout(() => {
        navigate('/scenarios-results');
      }, 2000);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Top Progress Bar */}
      <div className="bg-gray-800/90 border-b border-gray-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Progress Indicator */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">
                Overall Progress
              </span>
              <span className="text-sm text-gray-400">
                {completedScenarios.size} of {scenarioOrder.length} complete
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Scenario Steps */}
          <div className="flex items-center justify-between">
            {scenarioOrder.map((scenario, index) => {
              const isCompleted = completedScenarios.has(scenario);
              const isCurrent = index === currentScenarioIndex;
              const isUpcoming = index > currentScenarioIndex;

              return (
                <div
                  key={scenario}
                  className="flex items-center"
                >
                  <div className="flex items-center gap-2">
                    {/* Step Circle */}
                    <div className={`
                      flex items-center justify-center w-8 h-8 rounded-full
                      ${isCompleted ? 'bg-green-600 text-white' : 
                        isCurrent ? 'bg-blue-600 text-white' : 
                        'bg-gray-700 text-gray-400'}
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>

                    {/* Step Label */}
                    <div>
                      <div className={`text-sm font-medium ${
                        isCurrent ? 'text-blue-400' : 
                        isCompleted ? 'text-green-400' : 
                        'text-gray-400'
                      }`}>
                        {scenarioTitles[scenario]}
                      </div>
                      {isCurrent && (
                        <Badge variant="default" className="mt-1 bg-blue-600">In Progress</Badge>
                      )}
                      {isCompleted && (
                        <Badge variant="outline" className="mt-1 border-green-600 text-green-400">
                          Complete
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Connector Line */}
                  {index < scenarioOrder.length - 1 && (
                    <div className={`h-0.5 w-16 mx-4 ${
                      isCompleted ? 'bg-green-600' : 'bg-gray-700'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Scenario Content */}
      <div className="flex-1 overflow-hidden">
        <ScenarioSimulator
          key={currentScenario} // Force remount on scenario change
          scenarioType={currentScenario}
          onComplete={handleScenarioComplete}
        />
      </div>
    </div>
  );
}