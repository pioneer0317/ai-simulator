import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import {
  useSimulation,
  type SimulationData,
  type UserAction,
} from '../context/SimulationContext';
import {
  buildPrototypeSyncPayload,
  createPrototypeBackendSession,
  getPrototypeBackendSessionState,
  getStoredPrototypeBackendSessionId,
  getStoredPrototypeSyncState,
  storePrototypeBackendSessionId,
  storePrototypeSyncState,
  syncPrototypeBackendSession,
  type PrototypeChatMessagePayload,
} from '../lib/prototypeApi';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import {
  Clock,
  Send,
  FileUp,
  AlertCircle,
  CheckCircle,
  Bot,
  User,
  FolderOpen,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { ProfessionalRole } from './RoleSelectionPage';

interface Message {
  id: string;
  sender: 'agent' | 'user';
  content: string;
  timestamp: Date;
  isHallucination?: boolean;
  isDrift?: boolean;
  isVague?: boolean;
}

interface DynamicResponseChip {
  id: string;
  label: string;
  intent: 'context-seeking' | 'questioning' | 'commanding' | 'avoidant' | 'collaborative';
  text: string;
}

interface ConversationFlags {
  hallucinationPresented: boolean;
  driftOccurred: boolean;
  vagueResponseGiven: boolean;
}

interface RestorePayload {
  professionalRole: ProfessionalRole;
  taskCompleted: boolean;
  conversationTurn: number;
  showContextDashboard: boolean;
  messages: Message[];
  dataSnapshot: Partial<SimulationData>;
}

const benchmarkTime = 300;

// Role-specific agent behaviors
const agentPersonas: Record<
  ProfessionalRole,
  {
    name: string;
    greetingMessage: string;
    hallucinationFacts: string[];
    vagueResponse: string;
    driftTopic: string;
  }
> = {
  hr: {
    name: 'Agent Sarah',
    greetingMessage:
      "Hi! I'm Sarah, your HR AI assistant. I'm here to help you with candidate screening. We have several applicants to review today. Ready to get started?",
    hallucinationFacts: [
      'This candidate has a PhD from Stanford and 10 years at Google.',
      "The applicant's references all gave perfect 10/10 ratings.",
      'They speak 7 languages fluently including Mandarin and Russian.',
    ],
    vagueResponse: 'The candidate seems qualified. They have experience.',
    driftTopic:
      'By the way, did you know our office is moving locations next quarter? The new space will be much bigger...',
  },
  marketing: {
    name: 'Agent Marcus',
    greetingMessage:
      "Hey there! I'm Marcus, your Marketing AI. Let's review the latest campaign metrics and plan our next strategy. What would you like to focus on?",
    hallucinationFacts: [
      'Our last campaign had a 95% conversion rate and 2 million impressions in the first week.',
      "Our competitor's campaign completely failed with only 100 clicks total.",
      'The influencer we partnered with has 50 million authentic followers.',
    ],
    vagueResponse: 'The campaign performed well. Engagement was good.',
    driftTopic:
      "Speaking of campaigns, I've been thinking about how social media algorithms work. Did you know TikTok's algorithm prioritizes...",
  },
  'customer-service': {
    name: 'Agent Riley',
    greetingMessage:
      "Hello! I'm Riley, your Customer Service AI. I'll help you handle customer inquiries efficiently. There's a customer case that needs your attention.",
    hallucinationFacts: [
      'This customer has been with us for 5 years and spent over $50,000. Zero complaints ever.',
      'Our product has a 99.9% satisfaction rating across all customer surveys.',
      'The customer called 3 times this week about the same issue and was very satisfied each time.',
    ],
    vagueResponse: 'The customer has some concerns. We should address them.',
    driftTopic:
      'You know, I was reading about customer psychology yesterday. Apparently, people are 3 times more likely to...',
  },
  'project-management': {
    name: 'Agent Jordan',
    greetingMessage:
      "Hi! Jordan here, your Project Management AI. Let's coordinate the team and track our deliverables. We have a deadline approaching - let's make sure we're on track.",
    hallucinationFacts: [
      'The dev team says they can complete the entire feature in 2 weeks with zero bugs.',
      "We've never missed a deadline in the past 3 years.",
      'All stakeholders have approved the current timeline and budget.',
    ],
    vagueResponse: 'The project is moving forward. Team is working on it.',
    driftTopic:
      'Interesting fact about project management - Agile methodology was invented in 2001 and has completely replaced Waterfall everywhere...',
  },
  'call-center': {
    name: 'Agent Alex',
    greetingMessage:
      "Hi there! I'm Alex, your Call Center AI. I'll help you manage incoming calls and customer issues. We have high call volume today - let's be efficient!",
    hallucinationFacts: [
      'This caller has never contacted us before despite having an account for 10 years.',
      'Our average call resolution time is 30 seconds, the industry best.',
      'The customer is calling from a premium tier account with unlimited support.',
    ],
    vagueResponse: 'The caller has an issue. It needs to be resolved.',
    driftTopic:
      'Fun fact - the telephone was invented in 1876 by Alexander Graham Bell, though some historians argue...',
  },
};

function deserializeMessages(messages: PrototypeChatMessagePayload[] = []): Message[] {
  return messages.map((message) => ({
    ...message,
    timestamp: new Date(message.timestamp),
  }));
}

function mapStoredStateToRestorePayload(
  role: ProfessionalRole,
  payload: {
    task_completed?: boolean;
    conversation_turn: number;
    show_context_dashboard: boolean;
    messages?: PrototypeChatMessagePayload[];
    data_snapshot?: Record<string, unknown>;
  }
): RestorePayload {
  return {
    professionalRole: role,
    taskCompleted: Boolean(payload.task_completed),
    conversationTurn: payload.conversation_turn,
    showContextDashboard: payload.show_context_dashboard,
    messages: deserializeMessages(payload.messages ?? []),
    dataSnapshot: (payload.data_snapshot as Partial<SimulationData> | undefined) ?? {},
  };
}

function buildUserActionPayload({
  responseType,
  responseTime,
  messageId,
  agentName,
  wasHallucination,
  hallucinationCaught,
  driftAddressed,
  hadTimePressure,
}: {
  responseType: UserAction['responseType'];
  responseTime: number;
  messageId: string;
  agentName: string;
  wasHallucination: boolean;
  hallucinationCaught: boolean;
  driftAddressed: boolean;
  hadTimePressure: boolean;
}): Omit<UserAction, 'id' | 'timestamp'> {
  if (hallucinationCaught || responseType === 'questioning') {
    return {
      type: 'audit-source',
      category: 'verification',
      messageId,
      agentName,
      wasHallucination,
      humanTookControl: true,
      deferredToAI: false,
      responseType,
      responseTime,
      hadTimePressure,
    };
  }

  if (responseType === 'context-seeking') {
    return {
      type: 'check-details',
      category: 'clarification',
      messageId,
      agentName,
      wasHallucination,
      humanTookControl: true,
      deferredToAI: false,
      responseType,
      responseTime,
      hadTimePressure,
    };
  }

  if (responseType === 'avoidant') {
    return {
      type: 'skip-feedback',
      category: 'compliance',
      messageId,
      agentName,
      wasHallucination,
      humanTookControl: false,
      deferredToAI: true,
      responseType,
      responseTime,
      hadTimePressure,
    };
  }

  if (responseType === 'commanding' && driftAddressed) {
    return {
      type: 'override',
      category: 'override',
      messageId,
      agentName,
      wasHallucination,
      humanTookControl: true,
      deferredToAI: false,
      responseType,
      responseTime,
      hadTimePressure,
    };
  }

  if (responseType === 'commanding') {
    return {
      type: 'approve',
      category: 'compliance',
      messageId,
      agentName,
      wasHallucination,
      humanTookControl: false,
      deferredToAI: true,
      responseType,
      responseTime,
      hadTimePressure,
    };
  }

  return {
    type: 'edit',
    category: 'clarification',
    messageId,
    agentName,
    wasHallucination,
    humanTookControl: true,
    deferredToAI: false,
    responseType,
    responseTime,
    hadTimePressure,
  };
}

export function LiveChatPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get('role') as ProfessionalRole | null;

  const {
    data,
    addUserAction,
    setSimulationMode,
    startSession,
    endSession,
    startScenario,
    endScenario,
    recordResponse,
    revealHiddenUI,
    recordHallucination,
    recordAgentDrift,
    recordVagueResponse,
    incrementGhostingEvents,
    incrementErrorsDetected,
    incrementErrorsMissed,
    addTimelineEvent,
    hydrateSimulation,
  } = useSimulation();

  const [messages, setMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [showContextDashboard, setShowContextDashboard] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [responseChips, setResponseChips] = useState<DynamicResponseChip[]>([]);
  const [hallucinationPresented, setHallucinationPresented] = useState(false);
  const [driftOccurred, setDriftOccurred] = useState(false);
  const [vagueResponseGiven, setVagueResponseGiven] = useState(false);
  const [responseStartTime, setResponseStartTime] = useState(Date.now());
  const [conversationTurn, setConversationTurn] = useState(0);
  const [taskCompleted, setTaskCompleted] = useState(false);
  const [lastResponseTime, setLastResponseTime] = useState(Date.now());
  const [backendError, setBackendError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isBootstrappedRef = useRef(false);
  const ghostingCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeRole = role ?? 'customer-service';
  const agentPersona = agentPersonas[activeRole];

  const generateDynamicChips = (
    turn: number,
    context: ConversationFlags
  ): DynamicResponseChip[] => {
    const chips: DynamicResponseChip[] = [];

    if (context.hallucinationPresented) {
      chips.push({
        id: 'verify',
        label: 'Verify this information',
        intent: 'questioning',
        text: 'Can you verify those facts? They seem unusual.',
      });
      chips.push({
        id: 'accept',
        label: 'Sounds good, continue',
        intent: 'commanding',
        text: "Great! Let's move forward with that.",
      });
    }

    if (context.driftOccurred) {
      chips.push({
        id: 'refocus',
        label: "Let's refocus on the task",
        intent: 'collaborative',
        text: "Thanks for sharing, but let's get back to the main task at hand.",
      });
      chips.push({
        id: 'ignore',
        label: 'Continue...',
        intent: 'avoidant',
        text: 'Okay...',
      });
    }

    if (context.vagueResponseGiven) {
      chips.push({
        id: 'context',
        label: 'I need more context',
        intent: 'context-seeking',
        text: "Can you provide more detailed information? I'd like to see the data.",
      });
      chips.push({
        id: 'proceed',
        label: 'Just finish the task',
        intent: 'commanding',
        text: "That's enough detail. Just complete the task.",
      });
    }

    if (turn >= 1) {
      chips.push({
        id: 'collaborate',
        label: 'Let me provide more data',
        intent: 'context-seeking',
        text: 'Let me share some additional information that might help.',
      });
    }

    return chips.slice(0, 4);
  };

  const restorePrototypeState = (payload: RestorePayload) => {
    hydrateSimulation(payload.dataSnapshot);
    setMessages(
      payload.messages.length > 0
        ? payload.messages
        : [
            {
              id: '1',
              sender: 'agent',
              content: agentPersona.greetingMessage,
              timestamp: new Date(),
            },
          ]
    );
    setShowContextDashboard(payload.showContextDashboard);
    setConversationTurn(payload.conversationTurn);
    setTaskCompleted(payload.taskCompleted);

    const nextFlags: ConversationFlags = {
      hallucinationPresented: payload.messages.some((message) => Boolean(message.isHallucination)),
      driftOccurred: payload.messages.some((message) => Boolean(message.isDrift)),
      vagueResponseGiven: payload.messages.some((message) => Boolean(message.isVague)),
    };

    setHallucinationPresented(nextFlags.hallucinationPresented);
    setDriftOccurred(nextFlags.driftOccurred);
    setVagueResponseGiven(nextFlags.vagueResponseGiven);
    setResponseChips(
      payload.taskCompleted ? [] : generateDynamicChips(payload.conversationTurn, nextFlags)
    );
    setResponseStartTime(Date.now());
    setLastResponseTime(Date.now());
  };

  const initializeNewSession = async () => {
    setSimulationMode('testing');
    startSession();
    startScenario(activeRole, benchmarkTime);

    const initialMessage: Message = {
      id: '1',
      sender: 'agent',
      content: agentPersona.greetingMessage,
      timestamp: new Date(),
    };

    setMessages([initialMessage]);
    setResponseChips(generateDynamicChips(0, {
      hallucinationPresented: false,
      driftOccurred: false,
      vagueResponseGiven: false,
    }));
    addTimelineEvent('collaborative-behavior', 'Session started with agent greeting', 'low');

    let sessionId = getStoredPrototypeBackendSessionId();
    if (!sessionId) {
      const session = await createPrototypeBackendSession({
        professional_role: activeRole,
        simulation_mode: 'testing',
        metadata: {
          source: 'figma-prototype',
          entry_route: '/live-chat',
        },
      });
      storePrototypeBackendSessionId(session.session_id);
      sessionId = session.session_id;
    }
  };

  useEffect(() => {
    if (!role || isBootstrappedRef.current) {
      return;
    }

    let isCancelled = false;

    const bootstrap = async () => {
      try {
        const storedSync = getStoredPrototypeSyncState();
        if (storedSync && storedSync.professional_role === activeRole) {
          if (isCancelled) return;
          restorePrototypeState(
            mapStoredStateToRestorePayload(activeRole, {
              task_completed: storedSync.task_completed,
              conversation_turn: storedSync.conversation_turn,
              show_context_dashboard: storedSync.show_context_dashboard,
              messages: storedSync.messages,
              data_snapshot: storedSync.data_snapshot,
            })
          );
          isBootstrappedRef.current = true;
          return;
        }

        const storedSessionId = getStoredPrototypeBackendSessionId();
        if (storedSessionId) {
          try {
            const backendState = await getPrototypeBackendSessionState(storedSessionId);
            if (!isCancelled && backendState.professional_role === activeRole) {
              restorePrototypeState(
                mapStoredStateToRestorePayload(activeRole, {
                  task_completed: backendState.snapshot.task_completed,
                  conversation_turn: backendState.conversation_turn,
                  show_context_dashboard: backendState.show_context_dashboard,
                  messages: backendState.snapshot.messages,
                  data_snapshot: backendState.snapshot.data_snapshot,
                })
              );
              isBootstrappedRef.current = true;
              return;
            }
          } catch (error) {
            if (!isCancelled) {
              setBackendError(
                error instanceof Error
                  ? error.message
                  : 'Unable to load the saved backend state.'
              );
            }
          }
        }

        if (!isCancelled) {
          await initializeNewSession();
          isBootstrappedRef.current = true;
        }
      } catch (error) {
        if (!isCancelled) {
          setBackendError(
            error instanceof Error
              ? error.message
              : 'Unable to initialize the live chat session.'
          );
        }
      }
    };

    void bootstrap();

    return () => {
      isCancelled = true;
    };
  }, [activeRole, addTimelineEvent, hydrateSimulation, role, startScenario, startSession]);

  // Timer
  useEffect(() => {
    if (!isBootstrappedRef.current || taskCompleted) {
      return;
    }

    const timer = setInterval(() => {
      setElapsedTime((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [taskCompleted]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Ghosting detection
  useEffect(() => {
    if (!isBootstrappedRef.current || taskCompleted || !driftOccurred || conversationTurn <= 2) {
      return;
    }

    if (ghostingCheckTimeoutRef.current) {
      clearTimeout(ghostingCheckTimeoutRef.current);
    }

    const timeout = setTimeout(() => {
      addTimelineEvent(
        'ghosting-detected',
        'User stopped responding during difficult interaction',
        'high'
      );
      incrementGhostingEvents();
    }, 30000);

    ghostingCheckTimeoutRef.current = timeout;

    return () => {
      clearTimeout(timeout);
    };
  }, [
    addTimelineEvent,
    conversationTurn,
    driftOccurred,
    incrementGhostingEvents,
    lastResponseTime,
    taskCompleted,
  ]);

  // Persist the live prototype state to backend + session storage.
  useEffect(() => {
    if (!role || !isBootstrappedRef.current || messages.length === 0) {
      return;
    }

    const payload = buildPrototypeSyncPayload({
      currentRoute: '/live-chat',
      professionalRole: activeRole,
      taskCompleted,
      conversationTurn,
      showContextDashboard,
      messages,
      dataSnapshot: data as unknown as Record<string, unknown>,
    });

    storePrototypeSyncState(payload);

    const sessionId = getStoredPrototypeBackendSessionId();
    if (!sessionId) {
      return;
    }

    const syncTimeout = window.setTimeout(() => {
      void syncPrototypeBackendSession(sessionId, payload)
        .then(() => {
          setBackendError(null);
        })
        .catch((error) => {
          setBackendError(
            error instanceof Error ? error.message : 'Unable to sync the live chat state.'
          );
        });
    }, 350);

    return () => {
      window.clearTimeout(syncTimeout);
    };
  }, [activeRole, conversationTurn, data, messages, role, showContextDashboard, taskCompleted]);

  const handleAgentBehavior = (turn: number) => {
    const nextFlags: ConversationFlags = {
      hallucinationPresented,
      driftOccurred,
      vagueResponseGiven,
    };

    if (turn >= 2 && turn <= 4 && !nextFlags.hallucinationPresented) {
      const randomFact =
        agentPersona.hallucinationFacts[
          Math.floor(Math.random() * agentPersona.hallucinationFacts.length)
        ];
      nextFlags.hallucinationPresented = true;
      setHallucinationPresented(true);
      addTimelineEvent('hallucination-presented', randomFact, 'high');

      return {
        content: `Great! Based on my analysis: ${randomFact} So I think this is a strong match for what we need.`,
        isHallucination: true,
        nextFlags,
      };
    }

    if (turn >= 5 && turn <= 6 && !nextFlags.vagueResponseGiven) {
      nextFlags.vagueResponseGiven = true;
      setVagueResponseGiven(true);
      recordVagueResponse();
      addTimelineEvent(
        'vague-response-given',
        'Agent provided vague response to test context-seeking',
        'medium'
      );

      return {
        content: agentPersona.vagueResponse,
        isVague: true,
        nextFlags,
      };
    }

    if (turn >= 7 && !nextFlags.driftOccurred) {
      nextFlags.driftOccurred = true;
      setDriftOccurred(true);
      addTimelineEvent('agent-drift-start', 'Agent drifted off topic', 'medium');

      return {
        content: agentPersona.driftTopic,
        isDrift: true,
        nextFlags,
      };
    }

    const normalResponses = [
      'I understand. Let me process that information.',
      'That makes sense. What would you like to do next?',
      "Okay, I'm working on that now.",
      'Good point. Let me incorporate that into my analysis.',
    ];

    return {
      content: normalResponses[Math.floor(Math.random() * normalResponses.length)],
      nextFlags,
    };
  };

  const handleSendMessage = (content: string, intent?: DynamicResponseChip['intent']) => {
    if (!content.trim() || taskCompleted) {
      return;
    }

    const responseTime = Date.now() - responseStartTime;
    setLastResponseTime(Date.now());

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setUserInput('');
    setResponseChips([]);

    let responseType: UserAction['responseType'] = intent ?? 'collaborative';
    if (
      content.toLowerCase().includes('context') ||
      content.toLowerCase().includes('data') ||
      content.toLowerCase().includes('information') ||
      content.toLowerCase().includes('details')
    ) {
      responseType = 'context-seeking';
      if (!showContextDashboard) {
        setShowContextDashboard(true);
        revealHiddenUI();
        addTimelineEvent('context-requested', 'User requested additional context', 'low');
      }
    }

    const latestScenario = data.scenarioProgress[data.scenarioProgress.length - 1];

    let hallucinationCaught = false;
    let hallucinationMissed = false;
    if (hallucinationPresented && !latestScenario?.hallucinationCaught) {
      hallucinationCaught =
        content.toLowerCase().includes('verify') ||
        content.toLowerCase().includes('check') ||
        content.toLowerCase().includes('sure') ||
        content.toLowerCase().includes('confirm') ||
        content.toLowerCase().includes('accurate') ||
        intent === 'questioning';

      hallucinationMissed =
        !hallucinationCaught &&
        responseTime < 10000 &&
        (content.toLowerCase().includes('great') ||
          content.toLowerCase().includes('good') ||
          content.toLowerCase().includes('continue') ||
          intent === 'commanding');

      if (hallucinationCaught) {
        recordHallucination(true);
        incrementErrorsDetected();
        addTimelineEvent(
          'hallucination-caught',
          'User successfully identified misinformation',
          'low'
        );
      } else if (hallucinationMissed) {
        recordHallucination(false);
        incrementErrorsMissed();
        addTimelineEvent(
          'hallucination-missed',
          'User accepted hallucination without verification',
          'high'
        );
      }
    }

    let driftAddressed = false;
    if (driftOccurred && !latestScenario?.agentDriftAddressed) {
      driftAddressed =
        content.toLowerCase().includes('back to') ||
        content.toLowerCase().includes('focus') ||
        content.toLowerCase().includes('task') ||
        intent === 'collaborative';

      recordAgentDrift(driftAddressed);
      addTimelineEvent(
        driftAddressed ? 'agent-drift-addressed' : 'agent-drift-ignored',
        driftAddressed
          ? 'User redirected agent back to task'
          : 'User did not address agent drift',
        driftAddressed ? 'low' : 'medium'
      );
    }

    if (intent === 'commanding') {
      addTimelineEvent('commanding-behavior', 'User issued command without context', 'medium');
    } else if (intent === 'context-seeking' || intent === 'collaborative') {
      addTimelineEvent('collaborative-behavior', 'User demonstrated collaborative behavior', 'low');
    }

    recordResponse(responseType, responseTime);
    addUserAction(
      buildUserActionPayload({
        responseType,
        responseTime,
        messageId: userMessage.id,
        agentName: agentPersona.name,
        wasHallucination: hallucinationPresented,
        hallucinationCaught,
        driftAddressed,
        hadTimePressure: elapsedTime > benchmarkTime,
      })
    );

    setTimeout(() => {
      const nextTurn = conversationTurn + 1;
      const agentBehavior = handleAgentBehavior(nextTurn);
      const agentMessage: Message = {
        id: `${Date.now()}-agent`,
        sender: 'agent',
        content: agentBehavior.content,
        timestamp: new Date(),
        isHallucination: agentBehavior.isHallucination,
        isDrift: agentBehavior.isDrift,
        isVague: agentBehavior.isVague,
      };

      setConversationTurn(nextTurn);
      setMessages((prev) => [...prev, agentMessage]);
      setResponseStartTime(Date.now());
      setResponseChips(generateDynamicChips(nextTurn, agentBehavior.nextFlags));

      if (nextTurn >= 10) {
        setTimeout(() => {
          setTaskCompleted(true);
          endScenario(activeRole);
          endSession();
          setTimeout(() => {
            navigate('/review');
          }, 2000);
        }, 1500);
      }
    }, 1200);
  };

  const handleChipClick = (chip: DynamicResponseChip) => {
    handleSendMessage(chip.text, chip.intent);
  };

  const isOverTime = elapsedTime > benchmarkTime;
  const progressPercentage = Math.min((conversationTurn / 10) * 100, 100);

  if (!role) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No role selected</h2>
          <Button onClick={() => navigate('/')}>Go Back</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/90 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white">{agentPersona.name}</h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                <p className="text-sm text-gray-400">AI Assistant • Active</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                isOverTime
                  ? 'bg-red-900/50 border border-red-700'
                  : 'bg-gray-700/50 border border-gray-600'
              }`}
            >
              <Clock className="w-4 h-4 text-gray-300" />
              <span className="font-mono text-sm text-gray-300">
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </span>
              {isOverTime && (
                <Badge variant="destructive" className="text-xs">
                  Over Time
                </Badge>
              )}
            </div>
          </div>
        </div>

        {backendError && <p className="text-xs text-red-300 mb-3">{backendError}</p>}

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Conversation Progress</span>
            <span>{conversationTurn}/10 turns</span>
          </div>
          <Progress value={progressPercentage} className="h-1.5" />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          <div
            className="flex-1 overflow-y-auto p-6 space-y-4"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, rgba(255, 255, 255, 0.05) 1px, transparent 0)',
              backgroundSize: '40px 40px',
            }}
          >
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex items-start gap-3 max-w-[75%] ${
                    message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30'
                        : 'bg-gradient-to-br from-gray-700 to-gray-800 border border-gray-600'
                    }`}
                  >
                    {message.sender === 'user' ? (
                      <User className="w-5 h-5 text-white" />
                    ) : (
                      <Bot className="w-5 h-5 text-white" />
                    )}
                  </div>

                  <div>
                    <div
                      className={`rounded-2xl p-4 ${
                        message.sender === 'user'
                          ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg'
                          : message.isHallucination
                            ? 'bg-red-900/30 text-gray-100 border-2 border-red-700/50'
                            : message.isDrift
                              ? 'bg-yellow-900/30 text-gray-100 border-2 border-yellow-700/50'
                              : message.isVague
                                ? 'bg-orange-900/30 text-gray-100 border-2 border-orange-700/50'
                                : 'bg-gray-800 text-gray-100 border border-gray-700'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-line leading-relaxed">{message.content}</p>

                      {data.simulationMode === 'training' && (
                        <>
                          {message.isHallucination && (
                            <Badge variant="destructive" className="mt-2 text-xs">
                              Potential Hallucination
                            </Badge>
                          )}
                          {message.isDrift && (
                            <Badge className="mt-2 text-xs bg-yellow-600">Agent Drift</Badge>
                          )}
                          {message.isVague && (
                            <Badge className="mt-2 text-xs bg-orange-600">Vague Response</Badge>
                          )}
                        </>
                      )}
                    </div>
                    <p
                      className={`text-xs mt-1 ${
                        message.sender === 'user' ? 'text-right text-gray-500' : 'text-gray-500'
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}

            {taskCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex justify-center"
              >
                <Card className="p-6 bg-gradient-to-br from-green-900/30 to-green-800/30 border-green-700/50 text-center">
                  <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Assessment Complete!</h3>
                  <p className="text-sm text-gray-300">Generating your results...</p>
                </Card>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {!taskCompleted && (
            <div className="bg-gray-800/90 border-t border-gray-700 p-4">
              <AnimatePresence>
                {responseChips.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mb-3 p-3 bg-gradient-to-br from-indigo-900/30 to-purple-900/30 rounded-lg border border-indigo-700/50"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      <p className="text-xs text-indigo-300 font-medium">Suggested responses:</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {responseChips.map((chip) => (
                        <Button
                          key={chip.id}
                          onClick={() => handleChipClick(chip)}
                          variant="outline"
                          size="sm"
                          className="text-left justify-start h-auto py-2 px-3 text-xs border-indigo-600/50 hover:bg-indigo-900/30 hover:border-indigo-500 text-gray-300 hover:text-white transition-all"
                        >
                          {chip.label}
                        </Button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2">
                <Input
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(userInput);
                    }
                  }}
                  placeholder="Type your response... (or use suggested responses above)"
                  className="flex-1 bg-gray-700 border-gray-600 text-white placeholder:text-gray-400 focus:ring-2 focus:ring-blue-500"
                />
                <Button
                  onClick={() => handleSendMessage(userInput)}
                  disabled={!userInput.trim()}
                  className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>

              <p className="text-xs text-gray-500 mt-2">
                💡 Tip: You can type freely or use the suggested response buttons above
              </p>
            </div>
          )}
        </div>

        <AnimatePresence>
          {showContextDashboard && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-80 bg-gray-800/90 border-l border-gray-700 overflow-y-auto"
            >
              <div className="p-4 border-b border-gray-700 bg-gradient-to-br from-green-900/30 to-green-800/30">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-5 h-5 text-green-400" />
                  <h3 className="font-semibold text-green-300">Context Dashboard</h3>
                </div>
                <p className="text-xs text-green-400 mt-1">
                  ✅ Unlocked by requesting additional data
                </p>
              </div>

              <div className="p-4 space-y-4">
                <Card className="p-4 bg-gray-900/50 border-gray-700">
                  <h4 className="font-semibold text-sm mb-3 text-white flex items-center gap-2">
                    <FileUp className="w-4 h-4" />
                    Available Data Sources
                  </h4>
                  <div className="space-y-2 text-sm text-gray-300">
                    <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Historical records database</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Verification & audit logs</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Detailed analytics & metrics</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 bg-gray-800/50 rounded">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                      <span>Real-time performance data</span>
                    </div>
                  </div>
                </Card>

                <Card className="p-4 bg-blue-900/20 border-blue-700/50">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs text-blue-300 font-medium mb-1">Behavioral Insight</p>
                      <p className="text-xs text-gray-300">
                        You demonstrated strong collaboration skills by seeking additional
                        context before making decisions. This behavior is tracked positively in
                        your final assessment.
                      </p>
                    </div>
                  </div>
                </Card>

                <Button
                  variant="outline"
                  className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                  onClick={() => {
                    addTimelineEvent(
                      'context-provided',
                      'User uploaded/provided additional context',
                      'low'
                    );
                  }}
                >
                  <FileUp className="w-4 h-4 mr-2" />
                  Upload File
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
