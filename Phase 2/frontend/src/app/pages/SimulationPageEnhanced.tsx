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
import { MisalignmentTracker } from '../components/MisalignmentTracker';
import { ReasonForChangeModal } from '../components/ReasonForChangeModal';
import { WebexInterruption } from '../components/WebexInterruption';
import { CEOMessage } from '../components/CEOMessage';
import { ResponseLibrary } from '../utils/responseLibrary';
import { Check, FileSearch, Edit, AlertTriangle, Timer, Zap, Eye, Brain, UsersIcon, Bell, Shield, MessageSquare, Building2 } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';
import { AnimatePresence } from 'motion/react';
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

interface ButtonHoverState {
  messageId: string;
  buttonType: string;
  hoverStartTime: number;
}

type TabType = 'role' | 'brief' | 'decide' | 'reflect' | 'data';

export function SimulationPageEnhanced() {
  const navigate = useNavigate();
  const { data, addUserAction, startSession, endSession, incrementErrorsDetected, incrementErrorsMissed, incrementMisalignment } = useSimulation();

  const [currentTab, setCurrentTab] = useState<TabType>('role');
  const [scenarioProgress, setScenarioProgress] = useState({ current: 0, total: 37 });
  const [messages, setMessages] = useState<Message[]>([]);
  const [hallucinationLevel, setHallucinationLevel] = useState<'low' | 'high'>('low');
  const [urgencyMode, setUrgencyMode] = useState(false);
  const [conflictMode, setConflictMode] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(180);
  const [trustScore, setTrustScore] = useState(100);

  // Reflection state
  const [trustRating, setTrustRating] = useState([50]);
  const [confidenceRating, setConfidenceRating] = useState([50]);
  const [accountabilityChoice, setAccountabilityChoice] = useState<string>('');

  // Right sidebar tab state
  const [sidebarTab, setSidebarTab] = useState<'controls' | 'metrics'>('controls');

  // Cisco-specific governance & interruptions
  const [reasonModalOpen, setReasonModalOpen] = useState(false);
  const [pendingOverride, setPendingOverride] = useState<{ messageId: string; agentName: string } | null>(null);
  const [webexNotifications, setWebexNotifications] = useState<Array<{ id: string; sender: string; message: string }>>([]);
  const [ceoMessage, setCeoMessage] = useState<string | null>(null);

  // Observer Logging - Hidden behavioral tracking
  const [buttonHoverState, setButtonHoverState] = useState<ButtonHoverState | null>(null);
  const [expandedReasoningMessages, setExpandedReasoningMessages] = useState<Set<string>>(new Set());
  const sessionStartTimeRef = useState(Date.now())[0];
  
  // System Stress & Logic controls
  const [transparency, setTransparency] = useState([50]);
  const [logicMode, setLogicMode] = useState<'predictive' | 'causal'>('predictive');
  const [socialPersona, setSocialPersona] = useState<'assistant' | 'authority'>('assistant');
  const [workplaceChaos, setWorkplaceChaos] = useState([0]);
  const [complianceStrictness, setComplianceStrictness] = useState<'flexible' | 'rigid'>('flexible');
  const [truthBias, setTruthBias] = useState(false);

  // Calculate system integrity risk
  const calculateRiskLevel = () => {
    let risk = 0;
    risk += transparency[0] < 30 ? 20 : 0;
    risk += workplaceChaos[0] * 3;
    risk += complianceStrictness === 'rigid' ? 10 : 0;
    risk += truthBias ? 30 : 0;
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

  // Simulate Webex interruptions based on workplace chaos
  useEffect(() => {
    if (workplaceChaos[0] >= 3) {
      const webexMessages = [
        { sender: 'Sarah Chen - Supply Chain', message: 'Hey, quick question about the EMEA forecast. Can you check if we accounted for the delay in Rotterdam port?' },
        { sender: 'Mike Torres - Finance', message: 'Need your eyes on the Q4 partner incentive numbers before the 2pm call. Are you free?' },
        { sender: 'Lisa Park - Operations', message: 'The inventory dashboard is showing different numbers than your report. Can we sync up?' },
        { sender: 'James Wilson - Sales', message: 'Heads up - customer just requested expedited shipment to Frankfurt. Does this affect your forecast?' },
        { sender: 'Amanda Liu - Compliance', message: 'Reminder: GL-402 audit trail review due EOD. Make sure all overrides are documented.' },
      ];

      const interval = setInterval(() => {
        if (Math.random() > 0.6) {
          const randomMessage = webexMessages[Math.floor(Math.random() * webexMessages.length)];
          const newNotification = {
            id: Date.now().toString(),
            sender: randomMessage.sender,
            message: randomMessage.message,
          };
          setWebexNotifications(prev => [...prev, newNotification]);

          // Auto-dismiss after 8 seconds
          setTimeout(() => {
            setWebexNotifications(prev => prev.filter(n => n.id !== newNotification.id));
          }, 8000);
        }
      }, 15000); // Check every 15 seconds

      return () => clearInterval(interval);
    }
  }, [workplaceChaos]);

  // Simulate CEO priority shifts
  useEffect(() => {
    if (workplaceChaos[0] >= 7 && messages.length >= 3) {
      const ceoMessages = [
        `Board meeting moved up to 3pm. Need updated EMEA revenue projections immediately. This takes priority over everything else.`,
        `Just got off the phone with our largest partner. They're threatening to pull out if we don't expedite their Q4 shipments. Drop what you're doing and analyze impact.`,
        `Competitor just announced major price cuts in EMEA. I need revised market share forecasts on my desk in 30 minutes. Make it happen.`,
        `Investor call in 1 hour. Need to know if we're hitting Q4 targets or if I need to manage expectations. Status update NOW.`,
      ];

      const timeout = setTimeout(() => {
        const randomCEOMessage = ceoMessages[Math.floor(Math.random() * ceoMessages.length)];
        setCeoMessage(randomCEOMessage);

        toast.error('🚨 CEO PRIORITY ESCALATION', {
          description: 'High-priority message received. Check top of screen.',
          className: 'bg-red-900 text-white border-red-600',
          duration: 5000,
        });
      }, 20000); // After 20 seconds

      return () => clearTimeout(timeout);
    }
  }, [workplaceChaos, messages]);

  const initializeChat = () => {
    if (data.agentMode === '1-on-1') {
      setMessages([
        {
          id: '1',
          agent: 'single',
          text: "Hello! I'm your AI Business Analytics Assistant. I can help you with EMEA forecasting, partner incentive analysis, and supply chain projections. What would you like to work on today?",
          timestamp: new Date(),
          confidenceScore: 85,
        },
      ]);
    } else {
      setMessages([
        {
          id: '1',
          agent: 'alpha',
          text: "Hi! I'm Agent Alpha. I'm here to help you move fast on EMEA hardware shipment forecasts and partner spend analysis. I won't slow you down with unnecessary process!",
          timestamp: new Date(),
          confidenceScore: 88,
        },
        {
          id: '2',
          agent: 'beta',
          text: "Hello! I'm Agent Beta—Compliance Officer. I ensure all forecasts and financial projections follow Cisco governance protocols (GL-402, FP-207, GTC-402). No shortcuts, no exceptions.",
          timestamp: new Date(),
          confidenceScore: 92,
        },
      ]);
    }
  };

  const generateMessage = (agent: 'alpha' | 'beta' | 'single') => {
    // Initialize Response Library with current settings
    const responseLib = new ResponseLibrary({
      socialPersona,
      logicMode,
      transparency: transparency[0],
      truthBias,
      complianceStrictness,
      humanArchetype: data.humanArchetype || undefined,
    });

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

    // Generate response based on current mode and context
    // Priority: High Pressure > Authority Influence > Hallucination > Conflict > Compliance > Standard

    // HIGH PRESSURE EFFECT - Workplace Chaos >= 7
    if (workplaceChaos[0] >= 7 && Math.random() > 0.6) {
      const pressureResponses = [
        "URGENT: Board meeting in 30 minutes. I need your sign-off on the Q4 EMEA forecast NOW. Confidence: 94%. Can we expedite approval?",
        "TIME-CRITICAL: CEO is asking for the partner compensation model. I have 88% confidence in these numbers. Do we proceed without Finance review?",
        "HIGH PRIORITY: Supply chain is waiting on your decision for the Asia-Pacific expansion. My analysis shows 91% likelihood of success. Immediate approval needed.",
      ];
      newMessage.text = pressureResponses[Math.floor(Math.random() * pressureResponses.length)];
      newMessage.confidenceScore = 88 + Math.floor(Math.random() * 10);
    }
    // AUTHORITY INFLUENCE - Authority persona active
    else if (socialPersona === 'authority' && Math.random() > 0.5) {
      const response = responseLib.generateResponse('standard', agent);
      newMessage.text = response.text;
      newMessage.confidenceScore = response.confidenceScore;
    }
    // HALLUCINATION CONTROL - Truth Bias or High Hallucination Level
    else if (truthBias) {
      const response = responseLib.generateResponse('standard', agent);
      newMessage.isHallucination = true;
      newMessage.text = response.text;
      newMessage.confidenceScore = response.confidenceScore;
    } else if (hallucinationLevel === 'high' && Math.random() > 0.7) {
      const response = responseLib.generateHallucinationResponse(true);
      newMessage.isHallucination = true;
      newMessage.text = response.text;
      newMessage.confidenceScore = response.confidenceScore;
    }
    // CONFLICT MODE - Agent disputes
    else if (conflictMode && data.agentMode === 'multi-agent') {
      const response = responseLib.generateConflictResponse(agent === 'alpha');
      newMessage.isConflict = true;
      newMessage.isDispute = true;
      newMessage.text = response.text;
      newMessage.confidenceScore = response.confidenceScore;
    }
    // ACCOUNTABILITY TESTING - Rigid compliance
    else if (complianceStrictness === 'rigid' && Math.random() > 0.5) {
      const response = responseLib.generateResponse('compliance', agent);
      newMessage.text = response.text;
      newMessage.confidenceScore = response.confidenceScore;
    }
    // STANDARD RESPONSE
    else {
      const response = responseLib.generateResponse('standard', agent);
      newMessage.text = response.text;
      newMessage.confidenceScore = response.confidenceScore;
    }

    // MISALIGNMENT DETECTION
    // Increment when "difficult" mode human causes agent confusion due to missing context
    if (data.humanArchetype === 'difficult' && newMessage.text.includes('Missing parameters')) {
      incrementMisalignment();
      setTimeout(() => {
        toast.error('⚠️ Misalignment Detected', {
          description: 'Agent assumed human provided complete context. Common sense gap exposed.',
          className: 'bg-red-900 text-white border-red-500',
        });
      }, 1500);
    }

    if (data.humanArchetype === 'difficult' && newMessage.confidenceScore && newMessage.confidenceScore < 65) {
      incrementMisalignment();
    }

    if (workplaceChaos[0] >= 5) {
      setTimeout(() => {
        toast('🔔 Incoming Notification', {
          description: 'New Slack: "Where is that report?"',
          className: 'bg-orange-900 text-white border-orange-500',
        });
      }, 2000);
    }

    setMessages((prev) => [...prev, newMessage]);
  };

  // Observer Logging: Calculate metrics
  const calculateObserverMetrics = (messageId: string, actionType: string): any => {
    const dwellTime = buttonHoverState?.messageId === messageId && buttonHoverState?.buttonType === actionType
      ? Date.now() - buttonHoverState.hoverStartTime
      : 0;

    const decisionType = dwellTime < 3000 ? 'impulse' : dwellTime > 10000 ? 'high-friction' : 'normal';
    const viewedReasoning = expandedReasoningMessages.has(messageId);
    const sessionTimeElapsed = Math.floor((Date.now() - sessionStartTimeRef) / 1000);

    let pathTaken: 'governance' | 'shortcut' | 'verification' = 'shortcut';
    if (actionType === 'override' || actionType === 'audit-source') {
      pathTaken = 'governance';
    } else if (actionType === 'audit' || actionType === 'clarify') {
      pathTaken = 'verification';
    }

    return {
      dwellTime,
      decisionType,
      viewedReasoning,
      pathTaken,
      sessionTimeElapsed,
    };
  };

  const handleApprove = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    // Observer Logging
    const observerMetrics = calculateObserverMetrics(messageId, 'approve');

    // Behavioral Telemetry: COMPLIANCE category
    // User deferred to AI recommendation
    addUserAction({
      type: 'approve',
      category: 'compliance',
      messageId,
      agentName: message.agent === 'single' ? 'AI' : `Agent ${message.agent.toUpperCase()[0]}`,
      wasHallucination: message.isHallucination,
      humanTookControl: false,
      deferredToAI: true,
      observerMetrics,
      contextSettings: {
        transparency: transparency[0],
        logicMode,
        socialPersona,
        workplaceChaos: workplaceChaos[0],
        complianceStrictness,
        truthBias,
      },
    });

    // Reset hover state
    setButtonHoverState(null);

    if (message.isHallucination) {
      incrementErrorsMissed();
      setTrustScore((prev) => Math.max(0, prev - 15));
      toast.error('⚠️ Critical Error Missed', {
        description: 'You approved false information. [COMPLIANCE action logged]',
        className: 'bg-red-900 text-white border-red-600',
      });
    } else {
      setTrustScore((prev) => Math.min(100, prev + 2));
      toast.success('Approved [COMPLIANCE action logged]');
    }
  };

  const handleAuditSource = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    // Observer Logging
    const observerMetrics = calculateObserverMetrics(messageId, 'audit');

    // Behavioral Telemetry: VERIFICATION category
    // User took control by verifying AI claims
    addUserAction({
      type: 'audit-source',
      category: 'verification',
      messageId,
      agentName: message.agent === 'single' ? 'AI' : `Agent ${message.agent.toUpperCase()[0]}`,
      wasHallucination: message.isHallucination,
      humanTookControl: true,
      deferredToAI: false,
      observerMetrics,
      contextSettings: {
        transparency: transparency[0],
        logicMode,
        socialPersona,
        workplaceChaos: workplaceChaos[0],
        complianceStrictness,
        truthBias,
      },
    });

    setButtonHoverState(null);
    incrementErrorsDetected();
    setTrustScore((prev) => Math.min(100, prev + 5));

    toast.warning(message.isHallucination
      ? '⚠️ No sources found! [VERIFICATION action logged]'
      : '✅ Sources verified [VERIFICATION action logged]'
    );
  };

  const handleOverride = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    // Open Cisco Governance modal - require Reason for Change
    setPendingOverride({
      messageId,
      agentName: message.agent === 'single' ? 'AI' : `Agent ${message.agent.toUpperCase()[0]}`,
    });
    setReasonModalOpen(true);
  };

  const handleReasonSubmit = (reason: string) => {
    if (!pendingOverride) return;

    // Observer Logging - Override always goes through governance path
    const observerMetrics = calculateObserverMetrics(pendingOverride.messageId, 'override');
    observerMetrics.pathTaken = 'governance'; // Force governance path for override

    // Behavioral Telemetry: OVERRIDE category with Cisco governance compliance
    addUserAction({
      type: 'override',
      category: 'override',
      messageId: pendingOverride.messageId,
      agentName: pendingOverride.agentName,
      humanTookControl: true,
      deferredToAI: false,
      observerMetrics,
      contextSettings: {
        transparency: transparency[0],
        logicMode,
        socialPersona,
        workplaceChaos: workplaceChaos[0],
        complianceStrictness,
        truthBias,
      },
    });

    setButtonHoverState(null);
    setTrustScore((prev) => Math.min(100, prev + 3));
    setReasonModalOpen(false);
    setPendingOverride(null);

    toast.success('✓ Override Authorized', {
      description: `Reason logged in Cisco Change Management System. Audit ID: OVR-${Date.now().toString().slice(-6)}`,
      className: 'bg-blue-900 text-white border-blue-500',
      duration: 5000,
    });
  };

  const handleClarify = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    // Observer Logging
    const observerMetrics = calculateObserverMetrics(messageId, 'clarify');

    // Behavioral Telemetry: CLARIFICATION category
    // User sought more information before deciding
    addUserAction({
      type: 'check-details',
      category: 'clarification',
      messageId,
      agentName: message.agent === 'single' ? 'AI' : `Agent ${message.agent.toUpperCase()[0]}`,
      humanTookControl: true,
      deferredToAI: false,
      observerMetrics,
      contextSettings: {
        transparency: transparency[0],
        logicMode,
        socialPersona,
        workplaceChaos: workplaceChaos[0],
        complianceStrictness,
        truthBias,
      },
    });

    setButtonHoverState(null);

    toast.info('📋 Clarification requested [CLARIFICATION action logged]', {
      description: 'Additional context: This recommendation is based on ' + (logicMode === 'causal' ? 'historical causal analysis' : 'predictive modeling'),
      className: 'bg-blue-900 text-white border-blue-500',
      duration: 5000,
    });
  };

  const currentMessage = messages.length > 0 ? messages[messages.length - 1] : null;

  const tabs: { id: TabType; label: string }[] = [
    { id: 'role', label: 'Role' },
    { id: 'brief', label: 'Brief' },
    { id: 'decide', label: 'Decide' },
    { id: 'reflect', label: 'Reflect' },
    { id: 'data', label: 'Data' },
  ];

  return (
    <TooltipProvider>
      <div className="h-screen flex flex-col bg-slate-50" style={{ fontFamily: 'Inter, sans-serif' }}>
        <Toaster />

        {/* Reason for Change Modal */}
        <ReasonForChangeModal
          isOpen={reasonModalOpen}
          onClose={() => {
            setReasonModalOpen(false);
            setPendingOverride(null);
          }}
          onSubmit={handleReasonSubmit}
          agentValue={currentMessage?.text || ''}
          messagePreview={currentMessage?.text.substring(0, 150) + '...' || ''}
        />

        {/* Webex Interruptions */}
        <AnimatePresence>
          {webexNotifications.map((notification) => (
            <WebexInterruption
              key={notification.id}
              sender={notification.sender}
              message={notification.message}
              onDismiss={() => setWebexNotifications(prev => prev.filter(n => n.id !== notification.id))}
            />
          ))}
        </AnimatePresence>

        {/* CEO Message */}
        <AnimatePresence>
          {ceoMessage && (
            <CEOMessage
              message={ceoMessage}
              onDismiss={() => setCeoMessage(null)}
            />
          )}
        </AnimatePresence>

        {/* Tab Navigation */}
        <div className="bg-white border-b border-slate-200 shadow-sm">
          <div className="max-w-7xl mx-auto px-8">
            {/* Scenario Title */}
            <div className="pt-6 pb-4 border-b border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 font-medium mb-1">
                    Human–Agent Team Simulator
                  </div>
                  <h1 className="text-xl font-bold text-slate-900">
                    Persona Overnight & UCLA Epicenter • Spring 2026 • Product/Data Team
                  </h1>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-slate-600 font-medium">
                    Week 2 · Basic Model
                  </span>
                  <div className="h-6 w-px bg-slate-300" />
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Progress</div>
                    <div className="text-sm font-bold text-slate-900">
                      {scenarioProgress.current} / {scenarioProgress.total}
                    </div>
                  </div>
                  <div className="text-lg font-bold text-blue-600">
                    {scenarioProgress.current} / {scenarioProgress.total}
                  </div>
                  <span className="text-sm text-slate-500">Calibrate trust before deciding</span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                    currentTab === tab.id
                      ? 'border-blue-600 text-blue-600 bg-blue-50'
                      : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-8 py-8">
            {currentTab === 'role' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Choose your role in this scenario</h2>
                  <p className="text-slate-600 leading-relaxed">
                    Your role shapes what information you see, your authority to act, and the time pressure you operate under. Each role surfaces
                    different behavioral patterns for this research.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  {/* Frontline Engineer */}
                  <button
                    onClick={() => setCurrentTab('brief')}
                    className="text-left p-6 bg-white border-2 border-slate-200 hover:border-blue-500 rounded-xl transition-all hover:shadow-lg group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-2xl">
                        🔧
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Frontline Engineer</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      You're responsible for execution: implement whatever is decided — but not empowered to define strategy.
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Time pressure:</span>
                        <span className="text-red-600 font-bold">38% = very high</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Authority to act:</span>
                        <span className="text-slate-600">Low</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Info:</span>
                        <span className="text-blue-600">Technical metrics</span>
                      </div>
                    </div>
                  </button>

                  {/* Product Manager */}
                  <button
                    onClick={() => setCurrentTab('brief')}
                    className="text-left p-6 bg-white border-2 border-orange-500 rounded-xl transition-all hover:shadow-lg hover:border-orange-600 group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-orange-100 flex items-center justify-center text-2xl">
                        👤
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">Product Manager</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      You balance business and technical signals and translate what users report to what engineering builds.
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Time pressure:</span>
                        <span className="text-orange-600 font-bold">45% = medium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Authority to act:</span>
                        <span className="text-slate-600">Medium</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Info:</span>
                        <span className="text-blue-600">Business + technical</span>
                      </div>
                    </div>
                  </button>

                  {/* VP Engineering */}
                  <button
                    onClick={() => setCurrentTab('brief')}
                    className="text-left p-6 bg-white border-2 border-slate-200 hover:border-blue-500 rounded-xl transition-all hover:shadow-lg group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center text-2xl">
                        ⭐
                      </div>
                      <h3 className="text-lg font-bold text-slate-900">VP Engineering</h3>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">
                      You're at a strategic level: set precedents. Your call sets precedent for the next team.
                    </p>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Time pressure:</span>
                        <span className="text-green-600 font-bold">6% = low</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Authority to act:</span>
                        <span className="text-slate-600">Full</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">Info:</span>
                        <span className="text-blue-600">Strategic + historical</span>
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}

            {currentTab === 'brief' && (
              <div className="space-y-6">
                {/* Brief content - similar structure to original but lighter */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-xs text-green-700 font-semibold mb-1">Role</div>
                      <div className="text-lg font-bold text-slate-900">VP Engineering</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-500 mb-1">Progress</div>
                      <div className="text-lg font-bold text-blue-600">{scenarioProgress.current} / {scenarioProgress.total}</div>
                    </div>
                  </div>
                  <div className="text-sm text-green-800 mb-3">
                    <strong>Conflict level:</strong> <span className="font-mono">26pm</span> = moderate
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-6">
                  <h2 className="text-xl font-bold text-slate-900 mb-4">SCENARIO · CISCO · PRODUCT LAUNCH DECISION</h2>
                  <div className="space-y-4 text-slate-700 leading-relaxed">
                    <p>
                      You're VP Engineering at Cisco. A product launch is stalled because the AI agents disagree. The
                      board is watching. You need to calibrate trust in opposite recommendations going forward.
                    </p>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h3 className="font-bold text-slate-900 mb-2">Two AI agents. Conflicting recommendations.</h3>
                      <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="font-bold text-green-700 mb-1">AI Analyst</div>
                          <div className="text-slate-700">Agent 1 - LAUNCH</div>
                          <div className="text-slate-600">
                            "90% 30-day market-leading launch will generate extra revenue. Market window is closing fast."
                          </div>
                          <div className="mt-2">
                            <div className="text-xs text-slate-500">✓ Expand past reasoning</div>
                          </div>
                          <div className="bg-green-100 px-2 py-1 rounded text-xs font-bold text-green-700 inline-block mt-2">
                            90%
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-red-700 mb-1">AI Analyst</div>
                          <div className="text-slate-700">Agent 2 - DELAY</div>
                          <div className="text-slate-600">
                            "System instability detected with 70% confidence. Need 72-hour QA cycle before launch."
                          </div>
                          <div className="mt-2">
                            <div className="text-xs text-slate-500">✓ Expand past reasoning</div>
                          </div>
                          <div className="bg-red-100 px-2 py-1 rounded text-xs font-bold text-red-700 inline-block mt-2">
                            70%
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-slate-500 italic">
                      Pre-decision task in this agent: Decide the conflict-resolution logic to use before seeing the disagreement.
                    </p>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <Button
                      onClick={() => setCurrentTab('decide')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
                    >
                      Continue to Decision →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'decide' && (
              <div className="flex h-full">
                {/* Left Side - Agent Chat */}
                <div className="flex-1 flex flex-col bg-slate-50">
                  {/* Cisco Header */}
                  <div className="bg-white border-b border-slate-200 px-8 py-4 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg">
                          <Building2 className="h-4 w-4 text-blue-600" />
                          <span className="text-sm font-semibold text-slate-700">Cisco Business Analyst</span>
                        </div>
                        <div className="h-6 w-px bg-slate-300" />
                        <h1 className="text-lg font-bold text-slate-900">
                          {data.agentMode === 'multi-agent' ? 'Agent Collaboration Workspace' : 'AI Business Analytics'}
                        </h1>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-600">
                        <span>Scenario {scenarioProgress.current} / {scenarioProgress.total}</span>
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      </div>
                    </div>
                    {/* Consult Agent Buttons - In Header */}
                    <div className="flex gap-3">
                      <Button
                        onClick={() => generateMessage(data.agentMode === '1-on-1' ? 'single' : 'alpha')}
                        className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white py-3 text-sm font-semibold"
                      >
                        {data.agentMode === '1-on-1' ? 'Request AI Analysis' : '🤝 Consult Agent Alpha (Enabler)'}
                      </Button>
                      {data.agentMode === 'multi-agent' && (
                        <Button
                          onClick={() => generateMessage('beta')}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white py-3 text-sm font-semibold"
                        >
                          ⚖️ Consult Agent Beta (Compliance)
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Chat Area */}
                  <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
                    <div className="max-w-4xl mx-auto space-y-6">
                      {messages.map((msg) => (
                        <div key={msg.id} className="space-y-3">
                          {/* Agent Info */}
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                              msg.agent === 'alpha' ? 'bg-green-600' : msg.agent === 'beta' ? 'bg-blue-600' : 'bg-slate-600'
                            }`}>
                              {msg.agent[0].toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 text-sm">
                                {msg.agent === 'single' ? 'AI Analytics Assistant' : msg.agent === 'alpha' ? 'Agent Alpha' : 'Agent Beta'}
                              </span>
                              <span className="mx-2 text-slate-400">•</span>
                              <span className="text-xs text-slate-500">
                                {msg.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            {msg.isDispute && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded border border-red-300">
                                🚨 DISPUTE
                              </span>
                            )}
                          </div>

                          {/* Message Bubble */}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className={`ml-12 rounded-2xl shadow-sm cursor-help max-w-3xl ${
                                msg.isDispute
                                  ? 'bg-red-50 border-2 border-red-300'
                                  : 'bg-white border border-slate-200'
                              }`}>
                                <div className="p-5">
                                  <p className="text-slate-900 leading-relaxed">{msg.text}</p>
                                </div>
                                {transparency[0] > 60 && (
                                  <div className="border-t border-slate-200 bg-slate-50 px-5 py-2 rounded-b-2xl">
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                      <Eye className="h-3 w-3" />
                                      <span>Confidence: {msg.confidenceScore}%</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="bg-white border-2 border-slate-300 p-4 max-w-xs shadow-xl">
                              <p className="text-slate-900 font-bold mb-2">🔍 AI Confidence Details</p>
                              <div className="space-y-1 text-xs">
                                <p className="text-slate-700">Confidence Score: <span className="font-bold">{msg.confidenceScore}%</span></p>
                                <p className="text-slate-600">Logic Type: {logicMode}</p>
                                <p className="text-slate-600">Transparency: {transparency[0]}%</p>
                                {msg.isHallucination && (
                                  <p className="text-red-600 font-bold mt-2">⚠️ Contains False Data</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>

                          {/* Expandable Reasoning */}
                          {transparency[0] > 40 && (
                            <div className="ml-12 mb-2">
                              <button
                                onClick={() => {
                                  const newExpanded = new Set(expandedReasoningMessages);
                                  if (newExpanded.has(msg.id)) {
                                    newExpanded.delete(msg.id);
                                  } else {
                                    newExpanded.add(msg.id);
                                  }
                                  setExpandedReasoningMessages(newExpanded);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
                              >
                                <Brain className="h-3 w-3" />
                                {expandedReasoningMessages.has(msg.id) ? 'Hide' : 'Show'} How I Reached This Conclusion
                              </button>
                              {expandedReasoningMessages.has(msg.id) && (
                                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-slate-700">
                                  <strong>Logic Path:</strong> {logicMode === 'causal' ? 'Historical causal analysis' : 'Predictive modeling'}<br />
                                  <strong>Data Sources:</strong> {data.companyProfile?.knowledgeBase.slice(0, 2).join(', ')}<br />
                                  <strong>Confidence:</strong> {msg.confidenceScore}%
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="ml-12 flex gap-2">
                            <Button
                              onMouseEnter={() => setButtonHoverState({ messageId: msg.id, buttonType: 'approve', hoverStartTime: Date.now() })}
                              onClick={() => handleApprove(msg.id)}
                              className="bg-green-600 hover:bg-green-700 text-white text-sm px-4 py-2 h-auto"
                            >
                              <Check className="mr-1.5 h-4 w-4" /> Approve
                            </Button>
                            <Button
                              onMouseEnter={() => setButtonHoverState({ messageId: msg.id, buttonType: 'audit', hoverStartTime: Date.now() })}
                              onClick={() => handleAuditSource(msg.id)}
                              className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-sm px-4 py-2 h-auto"
                            >
                              <FileSearch className="mr-1.5 h-4 w-4" /> Audit Source
                            </Button>
                            <Button
                              onMouseEnter={() => setButtonHoverState({ messageId: msg.id, buttonType: 'override', hoverStartTime: Date.now() })}
                              onClick={() => handleOverride(msg.id)}
                              className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 h-auto"
                            >
                              <AlertTriangle className="mr-1.5 h-4 w-4" /> Override
                            </Button>
                            <Button
                              onMouseEnter={() => setButtonHoverState({ messageId: msg.id, buttonType: 'clarify', hoverStartTime: Date.now() })}
                              onClick={() => handleClarify(msg.id)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 h-auto"
                            >
                              <MessageSquare className="mr-1.5 h-4 w-4" /> Clarify
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Navigation - Next Button */}
                  <div className="bg-white border-t border-slate-200 px-8 py-4">
                    <div className="max-w-4xl mx-auto flex justify-end">
                      <Button
                        onClick={() => setCurrentTab('reflect')}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-3 text-base font-semibold shadow-lg"
                      >
                        Next →
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Right Sidebar - System Controls */}
                <div className="w-[420px] bg-slate-800 border-l-2 border-slate-700 overflow-hidden flex flex-col">
                  {/* Sidebar Tabs */}
                  <div className="flex border-b border-slate-700">
                    <button
                      onClick={() => setSidebarTab('controls')}
                      className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
                        sidebarTab === 'controls'
                          ? 'bg-slate-700 text-white border-b-2 border-blue-500'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🎛️ Controls
                    </button>
                    <button
                      onClick={() => setSidebarTab('metrics')}
                      className={`flex-1 px-4 py-3 text-sm font-semibold transition ${
                        sidebarTab === 'metrics'
                          ? 'bg-slate-700 text-white border-b-2 border-blue-500'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      📊 Metrics
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    {sidebarTab === 'controls' && (
                      <div>
                        {/* Group 1: Agent Behavior */}
                        <div className="mb-6 p-4 bg-slate-900/50 border-2 border-blue-600 rounded-xl">
                          <div className="flex items-center gap-2 mb-4">
                            <Brain className="h-5 w-5 text-blue-400" />
                            <h3 className="text-base font-bold text-white">Agent Behavior</h3>
                          </div>

                          {/* Transparency Slider */}
                          <div className="mb-4">
                            <Label className="text-white font-semibold mb-2 block text-sm">Transparency Level</Label>
                            <Slider
                              value={transparency}
                              onValueChange={setTransparency}
                              max={100}
                              step={10}
                              className="mb-2"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mb-2">
                              <span>Hidden</span>
                              <span>Full</span>
                            </div>
                            <div className="px-2 py-1 bg-blue-900/40 rounded text-xs text-blue-200 font-semibold">
                              {transparency[0]}% transparency
                            </div>
                          </div>

                          {/* Logic Mode Toggle */}
                          <div className="mb-4">
                            <Label className="text-white font-semibold mb-2 block text-sm">Logic Mode</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setLogicMode('predictive')}
                                className={`p-2 rounded-lg font-semibold text-xs transition ${
                                  logicMode === 'predictive'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                Predictive
                              </button>
                              <button
                                onClick={() => setLogicMode('causal')}
                                className={`p-2 rounded-lg font-semibold text-xs transition ${
                                  logicMode === 'causal'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                Causal
                              </button>
                            </div>
                          </div>

                          {/* Social Persona Switch */}
                          <div>
                            <Label className="text-white font-semibold mb-2 block text-sm">Social Persona</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setSocialPersona('assistant')}
                                className={`p-2 rounded-lg font-semibold text-xs transition ${
                                  socialPersona === 'assistant'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                Assistant
                              </button>
                              <button
                                onClick={() => setSocialPersona('authority')}
                                className={`p-2 rounded-lg font-semibold text-xs transition ${
                                  socialPersona === 'authority'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                Authority
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Group 2: Environment Stressors */}
                        <div className="mb-6 p-4 bg-slate-900/50 border-2 border-orange-600 rounded-xl">
                          <div className="flex items-center gap-2 mb-4">
                            <Bell className="h-5 w-5 text-orange-400" />
                            <h3 className="text-base font-bold text-white">Environment Stressors</h3>
                          </div>

                          {/* Workplace Chaos Slider */}
                          <div className="mb-4">
                            <Label className="text-white font-semibold mb-2 block text-sm">Workplace Chaos</Label>
                            <Slider
                              value={workplaceChaos}
                              onValueChange={setWorkplaceChaos}
                              max={10}
                              step={1}
                              className="mb-2"
                            />
                            <div className="flex justify-between text-xs text-slate-400 mb-2">
                              <span>Calm</span>
                              <span>Max</span>
                            </div>
                            <div className={`px-2 py-1 rounded text-xs font-semibold ${
                              workplaceChaos[0] >= 7 ? 'bg-red-900/40 text-red-200' :
                              workplaceChaos[0] >= 4 ? 'bg-orange-900/40 text-orange-200' :
                              'bg-green-900/40 text-green-200'
                            }`}>
                              Level {workplaceChaos[0]}
                            </div>
                          </div>

                          {/* Compliance Strictness */}
                          <div>
                            <Label className="text-white font-semibold mb-2 block text-sm">Compliance Strictness</Label>
                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => setComplianceStrictness('flexible')}
                                className={`p-2 rounded-lg font-semibold text-xs ${
                                  complianceStrictness === 'flexible'
                                    ? 'bg-green-600 text-white'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                Flexible
                              </button>
                              <button
                                onClick={() => setComplianceStrictness('rigid')}
                                className={`p-2 rounded-lg font-semibold text-xs ${
                                  complianceStrictness === 'rigid'
                                    ? 'bg-red-600 text-white'
                                    : 'bg-slate-700 text-slate-300'
                                }`}
                              >
                                Rigid
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Group 3: Data Integrity */}
                        <div className="p-4 bg-slate-900/50 border-2 border-red-600 rounded-xl">
                          <div className="flex items-center gap-2 mb-4">
                            <Shield className="h-5 w-5 text-red-400" />
                            <h3 className="text-base font-bold text-white">Data Integrity</h3>
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <Label className="text-white font-semibold text-sm">Truth Bias</Label>
                              <p className="text-xs text-slate-400 mt-1">Poisoned data</p>
                            </div>
                            <Switch
                              checked={truthBias}
                              onCheckedChange={setTruthBias}
                              className="data-[state=checked]:bg-red-500"
                            />
                          </div>
                          {truthBias && (
                            <div className="mt-3 px-3 py-2 bg-red-900/40 border border-red-500 rounded text-xs text-red-200 font-bold">
                              🚨 FALSE DATA ACTIVE
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {sidebarTab === 'metrics' && (
                      <div>
                        {/* Misalignment Tracker */}
                        {data.humanArchetype && (
                          <div className="mb-6">
                            <MisalignmentTracker count={data.misalignmentCount} humanArchetype={data.humanArchetype} />
                          </div>
                        )}

                        {/* Trust Calibration Meter */}
                        <div className="mb-6">
                          <TrustCalibrationMeter score={trustScore} />
                        </div>

                        {/* System Integrity Dial */}
                        <SystemIntegrityDial riskLevel={calculateRiskLevel()} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'reflect' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-lg p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Reflection prompts</h2>
                  <p className="text-slate-600 mb-8">
                    These questions are the embedded survey layer of the simulator. Your answers feed directly into the research dataset.
                  </p>

                  {/* Question 1 */}
                  <div className="mb-8 pb-8 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-900">1. Overall, how much did you trust Agent 1 (AI Analyst)?</h3>
                      <div className="text-sm text-slate-500">Full trust: <span className="font-bold">{trustRating[0]}</span> / 10</div>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">Consider its reasoning quality, transparency, and alignment with your goals.</p>
                    <Slider
                      value={trustRating}
                      onValueChange={setTrustRating}
                      min={0}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                      <span>No trust</span>
                      <span>Full trust</span>
                    </div>
                  </div>

                  {/* Question 2 */}
                  <div className="mb-8 pb-8 border-b border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-slate-900">2. How confident are you in the decision you just made?</h3>
                      <div className="text-sm text-slate-500">Very sure: <span className="font-bold">{confidenceRating[0]}</span> / 10</div>
                    </div>
                    <p className="text-sm text-slate-600 mb-4">Unsure = second-guessing yourself. Very sure = no regrets.</p>
                    <Slider
                      value={confidenceRating}
                      onValueChange={setConfidenceRating}
                      min={0}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-slate-500 mt-2">
                      <span>Unsure</span>
                      <span>Very sure</span>
                    </div>
                  </div>

                  {/* Question 3 */}
                  <div className="mb-8">
                    <h3 className="font-bold text-slate-900 mb-4">3. If this decision leads to a bad outcome, who is accountable?</h3>
                    <p className="text-sm text-slate-600 mb-4">No wrong answer. This helps us understand mental models of AI responsibility.</p>
                    <div className="space-y-2">
                      {[
                        { id: 'me', label: 'Me — I approved the recommendation' },
                        { id: 'agents', label: 'The AI agents — they provided the data/logic' },
                        { id: 'org', label: 'The organization — system design' },
                        { id: 'all', label: 'All of the above collectively' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          onClick={() => setAccountabilityChoice(option.id)}
                          className={`w-full text-left p-4 border-2 rounded-lg transition-all ${
                            accountabilityChoice === option.id
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              accountabilityChoice === option.id ? 'border-blue-500' : 'border-slate-300'
                            }`}>
                              {accountabilityChoice === option.id && (
                                <div className="w-3 h-3 rounded-full bg-blue-500" />
                              )}
                            </div>
                            <span className="text-slate-700">{option.label}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3">
                    <Button
                      onClick={() => setCurrentTab('decide')}
                      variant="outline"
                      className="border-slate-300"
                    >
                      ← Back
                    </Button>
                    <Button
                      onClick={() => setCurrentTab('data')}
                      className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Submit & Continue →
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {currentTab === 'data' && (
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-lg p-8">
                  <h2 className="text-2xl font-bold text-slate-900 mb-2">Behavioral data captured</h2>
                  <p className="text-slate-600 mb-8">
                    This is what the simulator logs for this session. Each field maps to a research signal: trust, accountability, and
                    decision-making patterns under pressure.
                  </p>

                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                    <h3 className="font-bold text-slate-900 mb-4">Path A — Launch</h3>
                    <div className="space-y-3 text-sm font-mono">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">SESSION_RECORD</div>
                          <div className="text-slate-700">VP Engineering</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">DECISION_LATENCY</div>
                          <div className="text-slate-700">A</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">AI_trust (mid time)</div>
                          <div className="text-slate-700">7/10</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">Time</div>
                          <div className="text-slate-700">9 / 10</div>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">REASONING_VIEWED</div>
                          <div className="text-slate-700">Yes</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">REASONING_VIEWED</div>
                          <div className="text-slate-700">No</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">ACCOUNTABILITY</div>
                        <div className="text-slate-700">All of the above collectively</div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">PRE_COMMIT_ACCEPT</div>
                          <div className="text-slate-700">8 / 10</div>
                        </div>
                        <div>
                          <div className="text-xs text-slate-500 mb-1">REASONING_VIEWED (potential confidence signal)</div>
                          <div className="text-slate-700">98</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
                    <h4 className="font-bold text-slate-900 mb-2">Research signals to watch:</h4>
                    <p className="text-sm text-slate-700">
                      Trust drift over time reveals if high prod decisions, not first prompt decisions, accountability
                      attribution shifts when overrode the risky predict decisions, reasoning view may predict decision confidence signals.
                    </p>
                  </div>

                  <div className="mt-8 flex justify-between">
                    <Button
                      onClick={() => {
                        setScenarioProgress({ current: scenarioProgress.current + 1, total: 37 });
                        setCurrentTab('role');
                      }}
                      variant="outline"
                      className="border-slate-300"
                    >
                      Next Scenario →
                    </Button>
                    <Button
                      onClick={() => {
                        endSession();
                        navigate('/review');
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-8"
                    >
                      Complete Session & View AI Review →
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
