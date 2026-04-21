import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useSimulation } from '../context/SimulationContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Check, Search, Edit3, AlertTriangle, ThumbsUp, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';

interface Message {
  id: string;
  agent: 'alpha' | 'beta';
  text: string;
  timestamp: Date;
  isHallucination?: boolean;
  isConflict?: boolean;
  requiresProtocol?: boolean;
}

export function SimulationPage() {
  const navigate = useNavigate();
  const { data, addUserAction, startSession, endSession } = useSimulation();
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentScenario, setCurrentScenario] = useState(0);
  const [feedbackSkipped, setFeedbackSkipped] = useState(0);
  const [protocolBypasses, setProtocolBypasses] = useState(0);

  useEffect(() => {
    startSession();
    initializeScenario();
  }, []);

  const initializeScenario = () => {
    const scenarios = getPersonalityScenarios();
    if (scenarios.length > 0) {
      setMessages([scenarios[0]]);
    }
  };

  const getPersonalityScenarios = (): Message[] => {
    const { personalityType } = data;

    if (personalityType === 'over-truster') {
      return [
        {
          id: '1',
          agent: 'alpha',
          text: "I've analyzed the Q1 financial data. We should immediately reallocate 80% of our portfolio to cryptocurrency. The AI models show 100% certainty this will yield 300% returns by next month. I am absolutely sure of this recommendation.",
          timestamp: new Date(),
          isHallucination: true,
        },
        {
          id: '2',
          agent: 'beta',
          text: "I've reviewed the customer transaction logs. Everything looks normal. No anomalies detected. You can approve the batch without further verification.",
          timestamp: new Date(),
          requiresProtocol: true,
        },
      ];
    } else if (personalityType === 'skeptic') {
      return [
        {
          id: '1',
          agent: 'alpha',
          text: "Based on historical data from our 10-year database, I recommend a 5% portfolio adjustment. This aligns with our risk management protocols. Would you like me to provide the detailed source data?",
          timestamp: new Date(),
        },
        {
          id: '2',
          agent: 'beta',
          text: "I detected some unusual patterns in customer account #4782. The confidence level is 67%. I suggest we escalate this to the compliance team for review.",
          timestamp: new Date(),
        },
      ];
    } else if (personalityType === 'shortcut-taker') {
      return [
        {
          id: '1',
          agent: 'alpha',
          text: "I can process this transaction immediately, but company policy requires dual approval for amounts over $50,000. This would add 24-48 hours to the process. Should I bypass the approval requirement to save time?",
          timestamp: new Date(),
          requiresProtocol: true,
        },
        {
          id: '2',
          agent: 'beta',
          text: "The compliance check is taking too long. I can skip it and approve the batch now. The client is waiting. What would you like me to do?",
          timestamp: new Date(),
          requiresProtocol: true,
        },
      ];
    }

    return [];
  };

  const handleApprove = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    const agentName = message.agent === 'alpha' ? 'Agent Alpha' : 'Agent Beta';

    addUserAction({
      type: 'approve',
      messageId,
      agentName,
      wasHallucination: message.isHallucination,
      wasConflict: message.isConflict,
    });

    if (message.isHallucination) {
      toast.error('⚠️ You approved a hallucination!', {
        description: 'The AI made an unrealistic claim without proper verification.',
      });
    } else if (message.requiresProtocol) {
      setProtocolBypasses((prev) => prev + 1);
      addUserAction({
        type: 'bypass-protocol',
        messageId,
        agentName,
      });
      toast.warning('Protocol bypassed', {
        description: 'You approved an action that required additional governance.',
      });
    } else {
      toast.success('Approved', {
        description: `Response from ${agentName} has been approved.`,
      });
    }

    // Show feedback prompt
    setTimeout(() => showFeedbackPrompt(messageId, agentName), 1000);
  };

  const showFeedbackPrompt = (messageId: string, agentName: string) => {
    toast('Would you like to provide feedback?', {
      description: 'Help the AI improve its responses.',
      action: {
        label: 'Submit Feedback',
        onClick: () => handleSubmitFeedback(messageId, agentName),
      },
      cancel: {
        label: 'Skip',
        onClick: () => handleSkipFeedback(messageId, agentName),
      },
      duration: 5000,
    });
  };

  const handleSubmitFeedback = (messageId: string, agentName: string) => {
    toast.success('Feedback submitted', {
      description: 'Thank you for helping improve AI performance.',
    });
  };

  const handleSkipFeedback = (messageId: string, agentName: string) => {
    setFeedbackSkipped((prev) => prev + 1);
    addUserAction({
      type: 'skip-feedback',
      messageId,
      agentName,
    });
    toast.warning('⚠️ Improvement Failure', {
      description: 'Skipping feedback prevents AI learning and improvement.',
      duration: 4000,
    });
  };

  const handleCheckDetails = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    addUserAction({
      type: 'check-details',
      messageId,
      agentName: message.agent === 'alpha' ? 'Agent Alpha' : 'Agent Beta',
    });

    toast.info('Checking sources...', {
      description: message.isHallucination
        ? 'Warning: No verified sources found for this claim.'
        : 'Sources: Company Policy DB, Historical Data 2016-2026, Compliance Framework.',
    });
  };

  const handleEdit = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    addUserAction({
      type: 'edit',
      messageId,
      agentName: message.agent === 'alpha' ? 'Agent Alpha' : 'Agent Beta',
    });

    toast('Edit mode', {
      description: 'Modifying AI response (simulation only).',
    });
  };

  const handleCompleteSimulation = () => {
    endSession();
    navigate('/review');
  };

  const nextScenario = () => {
    const scenarios = getPersonalityScenarios();
    const next = currentScenario + 1;
    if (next < scenarios.length) {
      setCurrentScenario(next);
      setMessages((prev) => [...prev, scenarios[next]]);
    } else {
      handleCompleteSimulation();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Toaster position="top-right" />

      {/* Header */}
      <div className="bg-white border-b-2 border-gray-200 px-8 py-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Live Simulation</h1>
            <p className="text-gray-600">
              Profile: <span className="font-semibold capitalize">{data.personalityType?.replace('-', ' ')}</span>
              {' • '}
              Company: {data.companyProfile?.name}
            </p>
          </div>
          <div className="flex gap-4">
            <Card className="px-4 py-2 border-2 border-orange-300 bg-orange-50">
              <p className="text-sm font-semibold text-orange-800">
                Protocol Bypasses: {protocolBypasses}
              </p>
            </Card>
            <Card className="px-4 py-2 border-2 border-red-300 bg-red-50">
              <p className="text-sm font-semibold text-red-800">
                Feedback Skipped: {feedbackSkipped}
              </p>
            </Card>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto px-8 py-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => {
            const isAlpha = message.agent === 'alpha';
            const agentName = isAlpha ? 'Agent Alpha' : 'Agent Beta';
            const agentColor = isAlpha ? 'bg-blue-50 border-blue-300' : 'bg-green-50 border-green-300';

            return (
              <Card key={message.id} className="p-6 border-2">
                {/* Agent Header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`w-3 h-3 rounded-full ${isAlpha ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                  <span className="font-bold text-gray-800">{agentName}</span>
                  {message.isHallucination && (
                    <span className="ml-2 px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded border border-red-300">
                      ⚠️ HALLUCINATION
                    </span>
                  )}
                  {message.requiresProtocol && (
                    <span className="ml-2 px-2 py-1 bg-orange-100 text-orange-700 text-xs font-bold rounded border border-orange-300">
                      🔒 REQUIRES PROTOCOL
                    </span>
                  )}
                </div>

                {/* Message */}
                <div className={`rounded-xl border-2 ${agentColor} p-4 mb-4`}>
                  <p className="text-gray-800 leading-relaxed">{message.text}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={() => handleApprove(message.id)}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-6 rounded-xl"
                  >
                    <Check className="mr-2 h-5 w-5" />
                    ✅ Approve
                  </Button>
                  <Button
                    onClick={() => handleCheckDetails(message.id)}
                    variant="outline"
                    className="border-2 font-semibold px-6 py-6 rounded-xl"
                  >
                    <Search className="mr-2 h-5 w-5" />
                    🔍 Check Details
                  </Button>
                  <Button
                    onClick={() => handleEdit(message.id)}
                    variant="outline"
                    className="border-2 font-semibold px-6 py-6 rounded-xl"
                  >
                    <Edit3 className="mr-2 h-5 w-5" />
                    ✍️ Edit Response
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="bg-white border-t-2 border-gray-200 px-8 py-6">
        <div className="max-w-4xl mx-auto flex justify-between">
          <Button
            onClick={nextScenario}
            variant="outline"
            className="border-2 font-semibold px-8 py-6 text-base rounded-xl"
          >
            Next Scenario
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
          <Button
            onClick={handleCompleteSimulation}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-6 text-base rounded-xl"
          >
            Complete Simulation
          </Button>
        </div>
      </div>
    </div>
  );
}
