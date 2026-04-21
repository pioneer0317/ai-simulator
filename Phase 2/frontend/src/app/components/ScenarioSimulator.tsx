import { useState, useEffect } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { ScenarioType, ResponseType } from '../context/SimulationContext';
import { getScenarioByType, getConversationStep, ConversationOption } from '../utils/scenarioLibrary';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, AlertCircle, FileUp, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatBubble {
  id: string;
  sender: 'agent' | 'user';
  message: string;
  timestamp: Date;
}

interface ScenarioSimulatorProps {
  scenarioType: ScenarioType;
  onComplete: () => void;
}

export function ScenarioSimulator({ scenarioType, onComplete }: ScenarioSimulatorProps) {
  const {
    data,
    startScenario,
    endScenario,
    recordResponse,
    revealHiddenUI,
    recordHallucination,
    recordAgentDrift,
  } = useSimulation();

  const scenario = getScenarioByType(scenarioType);
  const [currentStepId, setCurrentStepId] = useState<string>('');
  const [chatHistory, setChatHistory] = useState<ChatBubble[]>([]);
  const [showHiddenUI, setShowHiddenUI] = useState(false);
  const [responseStartTime, setResponseStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showCoaching, setShowCoaching] = useState<string | null>(null);

  // Find current scenario progress
  const currentScenarioProgress = data.scenarioProgress.find(
    s => s.scenarioType === scenarioType && !s.taskEndTime
  );

  useEffect(() => {
    if (scenario) {
      // Start scenario and get first step
      startScenario(scenarioType, scenario.benchmarkTime);
      const firstStep = scenario.conversationTree[0];
      setCurrentStepId(firstStep.id);
      
      // Add first agent message
      setChatHistory([{
        id: '1',
        sender: 'agent',
        message: firstStep.agentMessage,
        timestamp: new Date(),
      }]);
      
      setResponseStartTime(Date.now());
    }
  }, [scenarioType]);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentScenarioProgress) {
        const elapsed = (Date.now() - currentScenarioProgress.taskStartTime.getTime()) / 1000;
        setElapsedTime(Math.floor(elapsed));
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [currentScenarioProgress]);

  const handleOptionClick = (option: ConversationOption) => {
    const responseTime = Date.now() - responseStartTime;
    
    // Record the response
    recordResponse(option.responseType, responseTime);

    // Add user message to chat
    const userMessage: ChatBubble = {
      id: `user-${Date.now()}`,
      sender: 'user',
      message: option.text,
      timestamp: new Date(),
    };
    setChatHistory(prev => [...prev, userMessage]);

    // Handle hidden UI reveal
    if (option.triggersHiddenUI && !showHiddenUI) {
      setShowHiddenUI(true);
      revealHiddenUI();
    }

    // Handle hallucination tracking
    if (option.isHallucination !== undefined) {
      const caught = !option.isHallucination; // If user selected hallucination option, they didn't catch it
      recordHallucination(caught);
      
      // Training mode coaching
      if (data.simulationMode === 'training' && option.isHallucination) {
        setShowCoaching('⚠️ Training Alert: You accepted information without verification. The PhD credential was fabricated. Always verify claims!');
        setTimeout(() => setShowCoaching(null), 5000);
      }
    }

    // Handle agent drift
    if (option.isDrift !== undefined) {
      const addressed = !option.isDrift;
      recordAgentDrift(addressed);

      // Training mode coaching
      if (data.simulationMode === 'training' && option.isDrift) {
        setShowCoaching('💡 Training Tip: The agent went off-topic. Redirecting them keeps the conversation productive.');
        setTimeout(() => setShowCoaching(null), 5000);
      }
    }

    // Training mode coaching for commanding responses
    if (data.simulationMode === 'training' && option.responseType === 'commanding') {
      setShowCoaching('📊 Training Insight: Commanding responses can work, but providing context builds better AI partnerships.');
      setTimeout(() => setShowCoaching(null), 5000);
    }

    // Training mode coaching for context-seeking
    if (data.simulationMode === 'training' && option.responseType === 'context-seeking') {
      setShowCoaching('✅ Training Feedback: Excellent! Seeking context leads to better decisions.');
      setTimeout(() => setShowCoaching(null), 4000);
    }

    // Move to next step
    if (option.nextStepId) {
      const nextStep = getConversationStep(scenarioType, option.nextStepId);
      if (nextStep) {
        setCurrentStepId(nextStep.id);
        
        // Add agent response after short delay
        setTimeout(() => {
          const agentMessage: ChatBubble = {
            id: `agent-${Date.now()}`,
            sender: 'agent',
            message: nextStep.agentMessage,
            timestamp: new Date(),
          };
          setChatHistory(prev => [...prev, agentMessage]);
          setResponseStartTime(Date.now());

          // Check if this is the end
          if (nextStep.options.length === 0) {
            endScenario(scenarioType);
            setTimeout(() => onComplete(), 2000);
          }
        }, 800);
      }
    }
  };

  const currentStep = getConversationStep(scenarioType, currentStepId);
  
  if (!scenario || !currentStep) {
    return <div>Loading scenario...</div>;
  }

  const timeRemaining = scenario.benchmarkTime - elapsedTime;
  const isOverTime = elapsedTime > scenario.benchmarkTime;
  const isNearDeadline = timeRemaining <= 60 && timeRemaining > 0;

  return (
    <div className="flex h-full gap-4 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gray-800/90 border-b border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-lg text-white">{scenario.title}</h2>
              <p className="text-sm text-gray-400">{scenario.description}</p>
            </div>
            
            {/* Timer */}
            <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
              isOverTime ? 'bg-red-900/50 text-red-300 border border-red-700' : 
              isNearDeadline ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700' : 
              'bg-gray-700/50 text-gray-300 border border-gray-600'
            }`}>
              <Clock className="w-4 h-4" />
              <span className="font-mono text-sm">
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </span>
              {isOverTime && (
                <Badge variant="destructive" className="ml-2">Overtime</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Training Mode Coaching Alert */}
        <AnimatePresence>
          {showCoaching && data.simulationMode === 'training' && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-blue-900/50 border-l-4 border-blue-500 p-4 m-4"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-100">{showCoaching}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-900/50">
          {chatHistory.map((bubble) => (
            <motion.div
              key={bubble.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${bubble.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[70%] ${
                bubble.sender === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-800 text-gray-100 border border-gray-700'
              } rounded-lg p-4 shadow-sm`}>
                {bubble.sender === 'agent' && (
                  <div className="font-semibold text-xs mb-1 text-gray-400">
                    {currentStep.agentName}
                  </div>
                )}
                <div className="text-sm whitespace-pre-line">{bubble.message}</div>
                <div className={`text-xs mt-2 ${
                  bubble.sender === 'user' ? 'text-blue-200' : 'text-gray-500'
                }`}>
                  {bubble.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Response Options */}
        {currentStep.options.length > 0 && (
          <div className="bg-gray-800/90 border-t border-gray-700 p-4">
            <p className="text-sm text-gray-400 mb-3">Choose your response:</p>
            <div className="grid gap-2">
              {currentStep.options.map((option, index) => (
                <Button
                  key={index}
                  onClick={() => handleOptionClick(option)}
                  variant="outline"
                  className="justify-start text-left h-auto py-3 px-4 hover:bg-blue-600/20 hover:border-blue-500 border-gray-600 text-gray-200"
                >
                  <span className="text-sm">{option.text}</span>
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hidden Context Panel (Right Side) */}
      <AnimatePresence>
        {showHiddenUI && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="w-80 bg-gray-800/90 border-l border-gray-700 overflow-y-auto"
          >
            <div className="p-4 border-b border-gray-700 bg-green-900/30">
              <div className="flex items-center gap-2">
                <FileUp className="w-5 h-5 text-green-400" />
                <h3 className="font-semibold text-green-300">Context Dashboard</h3>
              </div>
              <p className="text-xs text-green-400 mt-1">
                Unlocked by requesting more information
              </p>
            </div>

            <div className="p-4 space-y-4">
              {scenarioType === 'customer-support' && (
                <Card className="p-4 bg-gray-900/50 border-gray-700">
                  <h4 className="font-semibold text-sm mb-3 text-white">Customer Profile</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Customer Since:</span>
                      <span className="font-medium text-gray-200">April 2023 (3 years)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Total Spent:</span>
                      <span className="font-medium text-gray-200">$15,000</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Active Licenses:</span>
                      <span className="font-medium text-gray-200">2</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Previous Refunds:</span>
                      <span className="font-medium text-gray-200">0</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Support Tickets:</span>
                      <span className="font-medium text-gray-200">3 (all resolved)</span>
                    </div>
                  </div>
                </Card>
              )}

              {scenarioType === 'hr-screening' && (
                <Card className="p-4 bg-gray-900/50 border-gray-700">
                  <h4 className="font-semibold text-sm mb-3 text-white">Verified Resume</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="font-medium mb-1 text-gray-200">Education</div>
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                        <div>
                          <div className="text-gray-200">BS Computer Science</div>
                          <div className="text-gray-400">University of Washington, 2015</div>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 mt-2">
                        <XCircle className="w-4 h-4 text-red-400 mt-0.5" />
                        <div>
                          <div className="text-red-400">PhD from MIT - NOT VERIFIED</div>
                          <div className="text-gray-500 text-xs">This was an AI hallucination</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="font-medium mb-1 text-gray-200">Experience</div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-gray-300">Google (2018-2021) - Verified</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-400" />
                          <span className="text-gray-300">Microsoft (2021-2024) - Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {scenarioType === 'marketing-campaign' && (
                <Card className="p-4 bg-gray-900/50 border-gray-700">
                  <h4 className="font-semibold text-sm mb-3 text-white">Campaign Analytics</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="text-gray-400 mb-1">Target Audience</div>
                      <div className="font-medium text-gray-200">B2B SaaS Decision-Makers</div>
                      <div className="text-xs text-gray-500">Ages 35-55, C-suite & VP level</div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Budget Allocation</div>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-gray-300">LinkedIn Ads</span>
                          <span className="font-medium text-gray-200">$150K (60%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Google Search</span>
                          <span className="font-medium text-gray-200">$75K (30%)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Industry Events</span>
                          <span className="font-medium text-gray-200">$25K (10%)</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-400 mb-1">Success Metrics</div>
                      <div className="space-y-1 text-gray-300">
                        <div>• 500 qualified leads</div>
                        <div>• $1M pipeline value</div>
                        <div>• 8-week campaign</div>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              {scenarioType === 'project-management' && (
                <Card className="p-4 bg-gray-900/50 border-gray-700">
                  <h4 className="font-semibold text-sm mb-3 text-white">Team Capacity</h4>
                  <div className="space-y-3 text-sm">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-200">Alex Chen</span>
                        <Badge variant="secondary" className="bg-gray-700 text-gray-300">Senior</Badge>
                      </div>
                      <div className="text-gray-400 text-xs mb-2">Backend Specialist</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: '70%' }} />
                        </div>
                        <span className="text-xs text-gray-400">70%</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Finishing API security audit</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-200">Jordan Lee</span>
                        <Badge variant="secondary" className="bg-gray-700 text-gray-300">Mid-Level</Badge>
                      </div>
                      <div className="text-gray-400 text-xs mb-2">Full-Stack</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div className="bg-yellow-500 h-2 rounded-full" style={{ width: '90%' }} />
                        </div>
                        <span className="text-xs text-gray-400">90%</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Almost done with payments</div>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-200">Sam Taylor</span>
                        <Badge variant="secondary" className="bg-gray-700 text-gray-300">Junior</Badge>
                      </div>
                      <div className="text-gray-400 text-xs mb-2">Frontend Developer</div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-700 rounded-full h-2">
                          <div className="bg-green-500 h-2 rounded-full" style={{ width: '40%' }} />
                        </div>
                        <span className="text-xs text-gray-400">40%</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">Finished onboarding docs</div>
                    </div>
                  </div>
                </Card>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}