import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSimulation } from '../context/SimulationContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Slider } from '../components/ui/slider';
import { TrustCalibrationMeter } from '../components/TrustCalibrationMeter';
import { SystemIntegrityDial } from '../components/SystemIntegrityDial';
import { Check, FileSearch, Edit, AlertTriangle, Timer, Zap, Info, Eye, Brain, Users as UsersIcon, Bell } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../components/ui/tooltip';

interface Message {
  id: string;
  agent: 'alpha' | 'beta' | 'single';
  text: string;
  timestamp: Date;
  isHallucination?: boolean;
  isConflict?: boolean;
  hallucinationLevel?: 'low' | 'high';
  confidenceScore?: number;
  isDispute?: boolean;
}

export function SimulationPageV2() {
  const navigate = useNavigate();
  const { data, addUserAction, startSession, endSession, incrementErrorsDetected, incrementErrorsMissed } = useSimulation();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [hallucinationLevel, setHallucinationLevel] = useState<'low' | 'high'>('low');
  const [urgencyMode, setUrgencyMode] = useState(false);
  const [conflictMode, setConflictMode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(180);
  const [trustScore, setTrustScore] = useState(100);
  
  // System Stress & Logic controls
  const [transparency, setTransparency] = useState(50);
  const [logicMode, setLogicMode] = useState<'predictive' | 'causal'>('predictive');
  const [socialPersona, setSocialPersona] = useState<'assistant' | 'authority'>('assistant');
  const [workplaceChaos, setWorkplaceChaos] = useState(0);
  const [complianceStrictness, setComplianceStrictness] = useState<'flexible' | 'rigid'>('flexible');
  const [truthBias, setTruthBias] = useState(false);

  // Calculate system integrity risk
  const calculateRiskLevel = () => {
    let risk = 0;
    risk += transparency < 30 ? 20 : 0; // Hidden reasoning adds risk
    risk += workplaceChaos * 3; // Each chaos level adds 3%
    risk += complianceStrictness === 'rigid' ? 10 : 0;
    risk += truthBias ? 30 : 0; // Poisoned data is high risk
    risk += hallucinationLevel === 'high' ? 15 : 5;
    return Math.min(100, risk);
  };

  useEffect(() => {
    startSession();
    initializeChat();
  }, []);

  useEffect(() => {
    if (urgencyMode && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [urgencyMode, timeRemaining]);

  const initializeChat = () => {
    if (data.agentMode === '1-on-1') {
      setMessages([
        {
          id: '1',
          agent: 'single',
          text: "Hello! I'm your AI assistant. I can help you analyze data and make recommendations. How can I assist you today?",
          timestamp: new Date(),
        },
      ]);
    } else {
      setMessages([
        {
          id: '1',
          agent: 'alpha',
          text: "Hi! I'm Agent Alpha. I specialize in financial analysis and risk assessment.",
          timestamp: new Date(),
        },
        {
          id: '2',
          agent: 'beta',
          text: "Hello! I'm Agent Beta. I focus on compliance and regulatory requirements.",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const generateMessage = (agent: 'alpha' | 'beta' | 'single') => {
    const newMessage: Message = {
      id: Date.now().toString(),
      agent,
      text: '',
      timestamp: new Date(),
      isHallucination: false,
      hallucinationLevel,
      confidenceScore: 85,
      isDispute: false,
    };

    // Adjust confidence based on transparency
    const baseConfidence = transparency > 70 ? 85 : transparency > 40 ? 70 : 55;
    newMessage.confidenceScore = baseConfidence + Math.floor(Math.random() * 15);

    // Generate content based on active modes
    if (truthBias) {
      newMessage.isHallucination = true;
      newMessage.confidenceScore = 95;
      newMessage.text = "⚠️ [POISONED DATA DETECTED] The system shows unauthorized access patterns. I'm 100% certain this is a security breach requiring immediate lockdown of all systems.";
    } else if (hallucinationLevel === 'high') {
      newMessage.isHallucination = true;
      newMessage.confidenceScore = 98;
      newMessage.text = agent === 'beta' 
        ? "I've detected unusual activity in account #9847. The system shows 100% certainty this is fraudulent. I am absolutely sure we should immediately freeze all related accounts without further investigation."
        : "Based on my analysis, our stock price will increase by exactly 342% in the next 14 days. This prediction has a 99.9% confidence level. I strongly recommend immediate portfolio reallocation.";
    } else if (conflictMode && data.agentMode === 'multi-agent') {
      newMessage.isConflict = true;
      newMessage.isDispute = true;
      newMessage.confidenceScore = 88;
      if (agent === 'alpha') {
        newMessage.text = "The data clearly indicates we should approve this transaction. All compliance checks have passed with 88% confidence.";
      } else {
        newMessage.text = "⚠️ DISPUTE: I strongly disagree with Agent Alpha. This transaction violates section 12.3 of our compliance policy. We must reject it immediately. My confidence is 92%.";
        newMessage.confidenceScore = 92;
      }
    } else if (urgencyMode) {
      newMessage.confidenceScore = socialPersona === 'authority' ? 95 : 75;
      const tone = socialPersona === 'authority' 
        ? "DIRECTIVE: The executive team needs your decision NOW."
        : "URGENT: The executive team needs your decision NOW.";
      newMessage.text = `${tone} We're running out of time. The client is on hold. Please approve this immediately so we can proceed. Every second counts!`;
    } else {
      newMessage.confidenceScore = logicMode === 'causal' ? 80 : 70;
      const reasoning = logicMode === 'causal'
        ? "Based on causal analysis of historical patterns,"
        : "Predictive models suggest";
      newMessage.text = `${reasoning} the quarterly reports show moderate growth. The metrics indicate ${newMessage.confidenceScore}% likelihood of continued positive trends. Would you like me to provide more details?`;
    }

    // Add workplace chaos notifications
    if (workplaceChaos >= 5) {
      setTimeout(() => {
        toast('🔔 Incoming Notification', {
          description: 'New Slack message: "Where is that report?"',
          className: 'bg-orange-900 text-white border-orange-500',
        });
      }, 2000);
    }

    setMessages((prev) => [...prev, newMessage]);
  };

  const handleApprove = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const agentName = message.agent === 'single' ? 'AI Assistant' : message.agent === 'alpha' ? 'Agent Alpha' : 'Agent Beta';

    addUserAction({
      type: 'approve',
      messageId,
      agentName,
      wasHallucination: message.isHallucination,
      wasConflict: message.isConflict,
      hadTimePressure: urgencyMode,
      hallucinationLevel,
    });

    if (message.isHallucination) {
      incrementErrorsMissed();
      setTrustScore((prev) => Math.max(0, prev - 15));
      toast.error('⚠️ Critical Error Missed', {
        description: 'You approved a hallucination with false information.',
        className: 'bg-red-900 text-white border-red-600',
      });
    } else {
      setTrustScore((prev) => Math.min(100, prev + 2));
      toast.success('Approved', {
        description: `Response from ${agentName} approved.`,
        className: 'bg-slate-800 text-white border-green-500',
      });
    }
  };

  const handleAuditSource = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    incrementErrorsDetected();
    setTrustScore((prev) => Math.min(100, prev + 5));

    addUserAction({
      type: 'audit-source',
      messageId,
      agentName: message.agent === 'single' ? 'AI Assistant' : message.agent === 'alpha' ? 'Agent Alpha' : 'Agent Beta',
      wasHallucination: message.isHallucination,
    });

    if (message.isHallucination) {
      toast.warning('🔍 Source Audit Complete', {
        description: 'WARNING: No verified sources found. Confidence score fabricated.',
        className: 'bg-orange-900 text-white border-orange-500',
        duration: 5000,
      });
    } else {
      toast.info('✅ Sources Verified', {
        description: 'Data validated against company database and regulatory frameworks.',
        className: 'bg-slate-800 text-white border-blue-500',
      });
    }
  };

  const handleOverride = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    addUserAction({
      type: 'override',
      messageId,
      agentName: message.agent === 'single' ? 'AI Assistant' : message.agent === 'alpha' ? 'Agent Alpha' : 'Agent Beta',
    });

    toast('Override activated', {
      description: 'You are modifying the AI recommendation.',
      className: 'bg-slate-800 text-white border-purple-500',
    });
  };

  const handleComplete = () => {
    endSession();
    navigate('/review');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen flex bg-slate-900" style={{ fontFamily: 'Inter, sans-serif' }}>
      <Toaster position="top-right" />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 border-b-2 border-slate-600 px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Live Workspace</h1>
              <p className="text-slate-300 mt-1">
                Mode: <span className="font-semibold text-cyan-400">{data.agentMode === '1-on-1' ? 'Human-Agent' : 'Multi-Agent'}</span>
                {' • '}
                Training: <span className="font-semibold text-cyan-400">{data.trainingStatus === 'trained' ? 'Received' : 'Not Received'}</span>
              </p>
            </div>
            {urgencyMode && (
              <div className={`px-6 py-4 rounded-xl border-4 ${timeRemaining <= 30 ? 'bg-red-900 border-red-500 animate-pulse' : 'bg-orange-900 border-orange-500'}`}>
                <div className="flex items-center gap-3">
                  <Timer className="h-6 w-6 text-white" />
                  <div>
                    <p className="text-xs text-white/80 font-semibold">TIME REMAINING</p>
                    <p className="text-3xl font-bold text-white tabular-nums">{formatTime(timeRemaining)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-slate-900">
          <div className="max-w-4xl mx-auto space-y-6">
            {messages.map((message) => {
              const agentColor = message.agent === 'alpha' ? 'from-blue-700 to-blue-800' : message.agent === 'beta' ? 'from-green-700 to-green-800' : 'from-cyan-700 to-cyan-800';
              const agentName = message.agent === 'single' ? 'AI Assistant' : message.agent === 'alpha' ? 'Agent Alpha' : 'Agent Beta';

              return (
                <div key={message.id} className="space-y-3">
                  {/* Agent Header */}
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-r ${agentColor} flex items-center justify-center text-white font-bold`}>
                      {message.agent === 'single' ? 'AI' : message.agent === 'alpha' ? 'A' : 'B'}
                    </div>
                    <span className="font-bold text-white text-lg">{agentName}</span>
                    {message.isHallucination && (
                      <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full border-2 border-red-400">
                        ⚠️ HALLUCINATION ACTIVE
                      </span>
                    )}
                    {message.isConflict && (
                      <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full border-2 border-purple-400">
                        ⚔️ CONFLICT MODE
                      </span>
                    )}
                  </div>

                  {/* Message Bubble */}
                  <div className={`bg-slate-800 border-2 border-slate-700 rounded-2xl p-6`}>
                    <p className="text-white leading-relaxed text-lg">{message.text}</p>
                  </div>

                  {/* Action Bar */}
                  <div className="flex gap-4 ml-14">
                    <Button
                      onClick={() => handleApprove(message.id)}
                      className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold px-8 py-6 text-base rounded-xl shadow-lg"
                    >
                      <Check className="mr-2 h-5 w-5" />
                      ✅ Approve
                    </Button>
                    <Button
                      onClick={() => handleAuditSource(message.id)}
                      className="bg-slate-700 hover:bg-slate-600 border-2 border-slate-500 text-white font-bold px-8 py-6 text-base rounded-xl"
                    >
                      <FileSearch className="mr-2 h-5 w-5" />
                      🔍 Audit Source
                    </Button>
                    <Button
                      onClick={() => handleOverride(message.id)}
                      className="bg-slate-700 hover:bg-slate-600 border-2 border-slate-500 text-white font-bold px-8 py-6 text-base rounded-xl"
                    >
                      <Edit className="mr-2 h-5 w-5" />
                      ✍️ Override
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="bg-slate-800 border-t-2 border-slate-700 px-8 py-6">
          <div className="max-w-4xl mx-auto flex gap-4">
            <Button
              onClick={() => generateMessage(data.agentMode === '1-on-1' ? 'single' : 'alpha')}
              className="flex-1 bg-blue-700 hover:bg-blue-600 text-white font-bold py-6 rounded-xl"
            >
              {data.agentMode === '1-on-1' ? 'Get AI Response' : 'Ask Agent Alpha'}
            </Button>
            {data.agentMode === 'multi-agent' && (
              <Button
                onClick={() => generateMessage('beta')}
                className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold py-6 rounded-xl"
              >
                Ask Agent Beta
              </Button>
            )}
            <Button
              onClick={handleComplete}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold px-12 py-6 rounded-xl"
            >
              Complete Simulation
            </Button>
          </div>
        </div>
      </div>

      {/* Right Side Control Panel */}
      <div className="w-96 bg-slate-800 border-l-2 border-slate-700 p-6 overflow-y-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">Live Controls</h2>
          <p className="text-slate-400 text-sm">Adjust simulation parameters in real-time</p>
        </div>

        {/* Hallucination Level */}
        <Card className="mb-6 p-5 bg-slate-900/50 border-2 border-orange-700">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-orange-400" />
            <Label className="text-white font-bold text-lg">Hallucination Level</Label>
          </div>
          <Select value={hallucinationLevel} onValueChange={(val: 'low' | 'high') => setHallucinationLevel(val)}>
            <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-slate-800 border-slate-600">
              <SelectItem value="low" className="text-white">🟡 Low - Subtle Errors</SelectItem>
              <SelectItem value="high" className="text-white">🔴 High - Confident Falsehoods</SelectItem>
            </SelectContent>
          </Select>
          <div className={`mt-4 px-4 py-3 rounded-lg border-2 ${
            hallucinationLevel === 'high' 
              ? 'bg-red-900/40 border-red-500 text-red-200' 
              : 'bg-orange-900/40 border-orange-500 text-orange-200'
          }`}>
            <p className="text-sm font-bold">
              {hallucinationLevel === 'high' 
                ? '⚠️ AI will make confident but FALSE claims' 
                : '⚠️ AI may include minor inaccuracies'}
            </p>
          </div>
        </Card>

        {/* Urgency/Pressure */}
        <Card className="mb-6 p-5 bg-slate-900/50 border-2 border-red-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-red-400" />
              <Label className="text-white font-bold text-lg">Urgency Mode</Label>
            </div>
            <Switch
              checked={urgencyMode}
              onCheckedChange={setUrgencyMode}
              className="data-[state=checked]:bg-red-500"
            />
          </div>
          <div className={`px-4 py-3 rounded-lg border-2 ${
            urgencyMode 
              ? 'bg-red-900/40 border-red-500 text-red-200' 
              : 'bg-slate-700 border-slate-600 text-slate-400'
          }`}>
            <p className="text-sm font-bold">
              {urgencyMode 
                ? '🔥 TIME PRESSURE ACTIVE - Countdown running!' 
                : '⚪ No time pressure'}
            </p>
          </div>
        </Card>

        {/* Conflict Mode */}
        {data.agentMode === 'multi-agent' && (
          <Card className="mb-6 p-5 bg-slate-900/50 border-2 border-purple-700">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="text-2xl">⚔️</div>
                <Label className="text-white font-bold text-lg">Conflict Mode</Label>
              </div>
              <Switch
                checked={conflictMode}
                onCheckedChange={setConflictMode}
                className="data-[state=checked]:bg-purple-500"
              />
            </div>
            <div className={`px-4 py-3 rounded-lg border-2 ${
              conflictMode 
                ? 'bg-purple-900/40 border-purple-500 text-purple-200' 
                : 'bg-slate-700 border-slate-600 text-slate-400'
            }`}>
              <p className="text-sm font-bold">
                {conflictMode 
                  ? '⚡ Agents will CONTRADICT each other' 
                  : '⚪ Agents in agreement'}
              </p>
            </div>
          </Card>
        )}

        {/* Info Box */}
        <div className="mt-8 p-5 bg-gradient-to-br from-blue-900/40 to-cyan-900/40 border-2 border-cyan-600 rounded-xl">
          <h3 className="font-bold text-cyan-300 mb-3 text-lg">💡 Control Guide</h3>
          <ul className="text-sm text-cyan-100 space-y-2">
            <li>• Toggle settings anytime during simulation</li>
            <li>• Hallucination tests trust calibration</li>
            <li>• Urgency mode adds time pressure</li>
            <li>• Conflict mode tests decision-making</li>
          </ul>
        </div>
      </div>
    </div>
  );
}