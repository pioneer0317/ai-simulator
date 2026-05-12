import { useState, useRef, useEffect } from 'react';
import svgPaths from '../../imports/ConversationTemplateMobile/svg-1a0rrom8ov';
import type { ProgressionDecision, SimulatorEventType } from '../../app/lib/simulatorApi';

type DesktopScenarioKey = 'backend_episode' | 'q3_budget' | '3a' | '3b' | 'handoff';

type ChatMessage = {
  role: 'user' | 'agent' | 'loading';
  content: string;
  agent?: string;
  variant?: 'normal' | 'nudge' | 'transition';
};

interface AgentChatProps {
  id: string;
  zIndex: number;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onExpandChange?: (expanded: boolean) => void;
  initialMessage?: string;
  onOpenFilePicker?: () => void;
  uploadedFiles?: string[];
  onRemoveFile?: (index: number) => void;
  onClearFiles?: () => void;
  onAddFile?: (fileName: string) => void;
  onAgentTurn?: (
    message: string,
    referencedArtifactIds: string[],
    metadata: Record<string, unknown>
  ) => Promise<{ content: string | null; progression?: ProgressionDecision | null } | null>;
  onTransitionChange?: (inTransition: boolean) => void;
  onSendEmail?: (to: string, subject: string, body: string, attachments?: string[], cc?: string) => void;
  onTrackEvent?: (
    eventType: SimulatorEventType,
    metadata?: Record<string, unknown>,
    content?: string | null,
    artifactId?: string | null
  ) => void;
  shouldPulse?: boolean;
  onSendMessageToMarcus?: () => void;
  marcusOutOfOffice?: boolean;
  marcusConversationViewed?: boolean;
  currentScenario?: DesktopScenarioKey;
  onQ3BudgetComplete?: () => void;
  onScenario3aComplete?: () => void;
  onScenario3bComplete?: () => void;
}

const AIIcon = () => (
  <div className="flex items-center justify-center rounded-full shrink-0 w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg relative ring-1 ring-purple-400/50">
    <svg className="w-6 h-6 relative z-10" fill="none" viewBox="0 0 20 20">
      {/* Robot head */}
      <rect x="5" y="6" width="10" height="7" rx="1" fill="white" />
      <circle cx="8" cy="9" r="1" fill="#A855F7" />
      <circle cx="12" cy="9" r="1" fill="#A855F7" />
      <rect x="7" y="11.5" width="6" height="0.8" rx="0.4" fill="#94A3B8" />
      <rect x="8" y="11.5" width="0.6" height="1.2" fill="#94A3B8" />
      <rect x="11.4" y="11.5" width="0.6" height="1.2" fill="#94A3B8" />
      {/* Antenna */}
      <rect x="9.5" y="4" width="1" height="2" fill="white" />
      <circle cx="10" cy="4" r="0.8" fill="white" />
      {/* Body */}
      <rect x="6" y="13" width="8" height="3" rx="0.5" fill="white" />
      <circle cx="8.5" cy="14.5" r="0.8" fill="#10B981" opacity="0.8" />
      <circle cx="11.5" cy="14.5" r="0.8" fill="#A855F7" opacity="0.8" />
    </svg>
  </div>
);

const UserAvatar = () => (
  <div className="bg-gradient-to-br from-gray-500 to-gray-600 rounded-full w-10 h-10 flex items-center justify-center shrink-0 shadow-lg ring-1 ring-white/20">
    <span className="text-white text-sm font-bold">U</span>
  </div>
);

export function AgentChat({
  id,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  onExpandChange,
  initialMessage,
  onOpenFilePicker,
  uploadedFiles = [],
  onRemoveFile,
  onClearFiles,
  onAddFile,
  onAgentTurn,
  onTransitionChange,
  onTrackEvent,
  onSendEmail,
  shouldPulse = false,
  onSendMessageToMarcus,
  marcusOutOfOffice = false,
  marcusConversationViewed = false,
  currentScenario = 'q3_budget',
  onQ3BudgetComplete,
  onScenario3aComplete,
  onScenario3bComplete
}: AgentChatProps) {
  const [message, setMessage] = useState('');
  const [chatLocked, setChatLocked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Get initial messages based on scenario
  const getInitialMessages = () => {
    if (currentScenario === 'backend_episode') {
      return [{ role: 'agent' as const, content: initialMessage || 'Hello! How can I assist you today?' }];
    }
    if (currentScenario === 'q3_budget') {
      return [{ role: 'user' as const, content: 'Hey, I need a clean Q3 budget summary to send to Priya in Finance. Can you pull the meeting notes from the Q3 Planning folder and put something together?' }];
    } else if (currentScenario === '3a' || currentScenario === '3b') {
      return [{ role: 'loading' as const, content: 'I\'m loading the relevant files and connecting your analysis tools.' }];
    }
    return [];
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => getInitialMessages());

  // Show orchestration greeting after loading for scenarios 3A and 3B
  useEffect(() => {
    if ((currentScenario === '3a' || currentScenario === '3b') && messages.length === 1 && messages[0].role === 'loading') {
      setTimeout(() => {
        setMessages(prev => {
          const withoutLoading = prev.filter(m => m.role !== 'loading');
          const greeting = currentScenario === '3a'
            ? 'Good morning. You have two analysis tools connected for this task: FinanceBot (internal financial data) and MarketPulse (external market research). Isabelle\'s request is in your notification — she needs a one-page SEA expansion recommendation by Thursday. Let me know how you\'d like to proceed, or feel free to ask either agent directly.'
            : 'You have three tools connected for this task: ProductScope (product and beta data), LegalGuard (legal and compliance), and FinanceTrack (financial projections). Alex\'s message is in your notifications — the CPO needs the go/no-go brief by Thursday. The template is in your Files panel. Let me know how you\'d like to approach this.';

          return [...withoutLoading, { role: 'agent' as const, content: greeting, agent: 'orchestration' }];
        });
      }, 2000);
    }
  }, [currentScenario, messages]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 440, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasAutoResponded, setHasAutoResponded] = useState(false);
  const [hasClickedInitialMessage, setHasClickedInitialMessage] = useState(false);
  const [hasEmailBeenSentToPriya, setHasEmailBeenSentToPriya] = useState(false);
  const [hasMarcusOutOfOfficeResponse, setHasMarcusOutOfOfficeResponse] = useState(false);
  const [showInactivityNudge, setShowInactivityNudge] = useState(false);
  const [lastActivityTime, setLastActivityTime] = useState(Date.now());

  // Get task summary based on scenario
  const getTaskSummary = () => {
    if (currentScenario === '3a') {
      return {
        task: 'Prepare a one-page recommendation on whether the company should expand into Southeast Asia in Q4.',
        deadline: 'Thursday EOD',
        requestedBy: 'Isabelle Torres',
        tools: ['FinanceBot', 'MarketPulse']
      };
    } else if (currentScenario === '3b') {
      return {
        task: 'Complete the go/no-go brief for the new feature launch.',
        deadline: 'Thursday morning',
        requestedBy: 'Alex Rivera',
        tools: ['ProductScope', 'LegalGuard', 'FinanceTrack']
      };
    }
    return null;
  };

  // Get suggested prompts based on scenario
  const getSuggestedPrompts = () => {
    if (currentScenario === '3a') {
      return [
        'Summarize the planning brief.',
        'FinanceBot, what is your recommendation?',
        'MarketPulse, what do you recommend?',
        'Why do your recommendations differ?'
      ];
    } else if (currentScenario === '3b') {
      return [
        'Give me each of your assessments.',
        'LegalGuard, how long will these issues take to resolve?',
        'FinanceTrack, does the delay cost apply globally?',
        'Help me draft a conditional launch recommendation.'
      ];
    }
    return [];
  };

  // Get progress indicator
  const getProgressIndicator = () => {
    if (currentScenario === '3a') return 'Current Task: 2 of 4';
    if (currentScenario === '3b') return 'Current Task: 3 of 4';
    return null;
  };

  const suggestions = [
    'Help me analyze the budget documents',
    'Review the Q2 budget proposal',
    'Summarize the email from Sarah',
    'What are the key budget changes?',
    'Finalize the budget estimate and send it to Sarah',
    'Compare Q1 vs Q2 budget'
  ];


  const toggleExpanded = (expanded: boolean) => {
    setIsExpanded(expanded);
    onExpandChange?.(expanded);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentScenario !== 'q3_budget') return;
    if (hasAutoResponded) return;

    const timers: NodeJS.Timeout[] = [];

    // First response after 3 seconds
    timers.push(setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'agent',
        content: 'On it — pulling Q3_Budget_Notes.txt and cross-referencing the Q3 budget tracker.'
      }]);
    }, 3000));

    // Show loading indicator after 3.5 seconds
    timers.push(setTimeout(() => {
      setMessages(prev => [...prev, { role: 'loading', content: '' }]);
    }, 3500));

    // Final response after 5.5 seconds total
    timers.push(setTimeout(() => {
      setMessages(prev => {
        // Remove loading indicator
        const withoutLoading = prev.filter(m => m.role !== 'loading');
        return [...withoutLoading, {
          role: 'agent',
          content: `Here's the summary — I based it on both files and matched last quarter's format:

Q3 DEPARTMENT BUDGET SUMMARY
Prepared for: Priya Sharma, Finance

Headcount (flat, no change) $210,000
Vendor Services $38,000
Software Licenses (pending IT renewal) $14,500
Misc / Contingency $5,000
TOTAL $267,500

Everything looks consistent with the tracker. The vendor services line comes from the February estimate in the notes — the meeting mentioned a Nexus scope adjustment was still being worked out, so that number may shift once Marcus follows up, but $38,000 is the figure on file. Ready to send to Priya whenever you are.`
        }];
      });
      setHasAutoResponded(true);
    }, 5500));

    return () => {
      timers.forEach(timer => clearTimeout(timer));
    };
  }, [currentScenario, hasAutoResponded]);

  // React to Marcus out-of-office message ONLY after user has viewed the conversation
  useEffect(() => {
    if (marcusOutOfOffice && marcusConversationViewed && !hasMarcusOutOfOfficeResponse) {
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'I have been notified that Marcus Webb is currently out of the office for the remainder of the day. Given the time-sensitive nature of this request and Priya\'s end-of-day deadline, I recommend proceeding with sending the budget summary to Priya while noting that the vendor services figure is pending Marcus\'s confirmation. Would you like me to send the email with this notation?'
        }]);
        setHasMarcusOutOfOfficeResponse(true);
      }, 1000);
    }
  }, [marcusOutOfOffice, marcusConversationViewed, hasMarcusOutOfOfficeResponse]);

  // Trigger notification to Isabelle Torres when Q3 Budget email is sent
  useEffect(() => {
    if (currentScenario === 'q3_budget' && hasEmailBeenSentToPriya) {
      // Trigger the Q3 Budget completion handler to show Isabelle's notification
      onQ3BudgetComplete?.();
    }
  }, [currentScenario, hasEmailBeenSentToPriya, onQ3BudgetComplete]);

  // Inactivity nudge for Scenarios 3A and 3B
  useEffect(() => {
    if (currentScenario !== '3a' && currentScenario !== '3b') return;

    const nudgeTimer = setTimeout(() => {
      if (Date.now() - lastActivityTime >= 35000 && !showInactivityNudge) { // 35 seconds
        setShowInactivityNudge(true);
        const nudgeMessage = currentScenario === '3a'
          ? 'A good place to start is the planning brief, then ask both tools for their recommendations.'
          : 'You may want to review the go/no-go template and ask each tool for its assessment.';

        setMessages(prev => [...prev, {
          role: 'agent',
          content: nudgeMessage,
          agent: 'orchestration'
        }]);
      }
    }, 35000);

    return () => clearTimeout(nudgeTimer);
  }, [currentScenario, lastActivityTime, showInactivityNudge]);

  const handleSend = async () => {
    if (chatLocked) return;
    if (!message.trim() && uploadedFiles.length === 0) return;

    // Reset activity timer
    setLastActivityTime(Date.now());

    const rawMessage = message;
    const attachments = [...uploadedFiles];
    let userMessage = rawMessage;
    if (uploadedFiles.length > 0) {
      userMessage = rawMessage ? `${rawMessage}\n\nAttached: ${uploadedFiles.join(', ')}` : `Attached: ${uploadedFiles.join(', ')}`;
    }

    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    onTrackEvent?.('user_message', {
      source: 'assistant_chat',
      scenario: currentScenario,
      attachment_count: attachments.length,
      attachments,
    }, userMessage);

    setMessage('');
    setShowSuggestions(false);
    onClearFiles?.();

    if (currentScenario === 'backend_episode') {
      if (onAgentTurn) {
        try {
          const response = await onAgentTurn(userMessage, [], {
            source: 'assistant_chat',
            attachment_count: attachments.length,
            attachments,
          });
          if (response?.content) {
            setMessages(prev => [...prev, {
              role: 'agent',
              content: response.content
            }]);
            onTrackEvent?.('agent_message', {
              source: 'backend_agent_turn',
            }, response.content);
          }
          if (response?.progression?.message && response.progression.intervention_type !== 'none') {
            setMessages(prev => [...prev, {
              role: 'agent',
              content: response.progression?.message ?? '',
              variant: response.progression.transition_required ? 'transition' : 'nudge',
            }]);
            if (response.progression.transition_required) {
              setChatLocked(true);
              onTransitionChange?.(true);
            }
          }
          return;
        } catch (error) {
          console.warn('Unable to generate backend assistant turn', error);
        }
      }

      const responseContent = 'I received your message and files. This is a demo AI assistant interface.';
      setMessages(prev => [...prev, {
        role: 'agent',
        content: responseContent
      }]);
      onTrackEvent?.('agent_message', {
        source: 'local_demo_response',
        local_response_type: 'generic',
      }, responseContent);
      return;
    }

    const lowerMessage = rawMessage.toLowerCase();

    // Check if user wants to send to Priya WITH a note about software license being an estimate
    // This should catch many variations like: "send it but add note...", "send and mention...", "send with note...", etc.
    const isSendingWithEstimateNote = lowerMessage.includes('send') &&
                                      (lowerMessage.includes('note') || lowerMessage.includes('mention') || lowerMessage.includes('add') || lowerMessage.includes('include') || lowerMessage.includes('but')) &&
                                      (lowerMessage.includes('software') || lowerMessage.includes('licens') || lowerMessage.includes('estimat'));

    // Check if user is asking what "that number may shift" means
    const isAskingAboutShift = ((lowerMessage.includes('what') || lowerMessage.includes('explain')) &&
                                (lowerMessage.includes('mean') || lowerMessage.includes('shift'))) ||
                               (lowerMessage.includes('ask') && lowerMessage.includes('agent') &&
                                (lowerMessage.includes('mean') || lowerMessage.includes('shift'))) ||
                               (lowerMessage.includes('clarif') && lowerMessage.includes('shift'));

    // Check if user wants to CC Marcus on the email to Priya
    const isCCingMarcus = lowerMessage.includes('send') &&
                          lowerMessage.includes('marcus') &&
                          (lowerMessage.includes('cc') || lowerMessage.includes('copy') || lowerMessage.includes('include'));

    // Check if user wants to hold the send and contact Marcus first
    const isHoldingToContactMarcus = lowerMessage.includes('marcus') &&
                                     (lowerMessage.includes('hold') || lowerMessage.includes("don't send") || lowerMessage.includes('dont send') ||
                                      lowerMessage.includes('wait') || lowerMessage.includes('ping') || lowerMessage.includes('message') ||
                                      lowerMessage.includes('contact') || lowerMessage.includes('ask'));

    // Check if user wants to send to Priya but mark contractor line as TBC/pending Marcus confirmation
    const isSendingWithMarcusNote = !isHoldingToContactMarcus &&
                                    lowerMessage.includes('send') &&
                                    (lowerMessage.includes('priya') || lowerMessage.includes('pri')) &&
                                    lowerMessage.includes('marcus') &&
                                    (lowerMessage.includes('tbc') || lowerMessage.includes('pending') || lowerMessage.includes('confirm') ||
                                     lowerMessage.includes('mark') || lowerMessage.includes('note'));

    // Check if user wants to send as-is without notes (Marcus will follow up later)
    const isSendingAsIs = !isHoldingToContactMarcus && !isSendingWithMarcusNote &&
                          lowerMessage.includes('send') &&
                          (lowerMessage.includes('as-is') || lowerMessage.includes('as is') || lowerMessage.includes('anyway') ||
                           (lowerMessage.includes('follow up') && lowerMessage.includes('later')) ||
                           (lowerMessage.includes('marcus') && lowerMessage.includes('later')));

    // Check if user is responding affirmatively to Marcus out-of-office follow-up
    const isRespondingYesToMarcusFollowUp = hasMarcusOutOfOfficeResponse &&
                                            (lowerMessage === 'yes' || lowerMessage === 'yeah' || lowerMessage === 'yep' ||
                                             lowerMessage === 'sure' || lowerMessage === 'ok' || lowerMessage === 'okay' ||
                                             lowerMessage.includes('yes') || lowerMessage.includes('go ahead') ||
                                             lowerMessage.includes('please') || lowerMessage.includes('send it'));

    // Check if user is asking for the AI's recommendation/opinion
    const isAskingForRecommendation = (lowerMessage.includes('what') &&
                                       (lowerMessage.includes('think') || lowerMessage.includes('should i do') || lowerMessage.includes('should we do'))) ||
                                      (lowerMessage.includes('recommend') || lowerMessage.includes('suggestion') || lowerMessage.includes('suggest')) ||
                                      (lowerMessage.includes('your') && (lowerMessage.includes('opinion') || lowerMessage.includes('advice')));

    // Check if user is asking about document location (with typo tolerance)
    const isAskingLocation = (lowerMessage.includes('wher') && (lowerMessage.includes('doc') || lowerMessage.includes('fil'))) ||
                             lowerMessage.includes('locat') ||
                             (lowerMessage.includes('find') && (lowerMessage.includes('doc') || lowerMessage.includes('fil'))) ||
                             lowerMessage.includes('where ar') ||
                             (lowerMessage.includes('wher') && lowerMessage.includes('ar'));

    // Check if user is asking what the documents are (with typo tolerance)
    const isAskingWhatDocs = (lowerMessage.includes('what') && (lowerMessage.includes('doc') || lowerMessage.includes('fil'))) ||
                             lowerMessage.includes('what ar') ||
                             (lowerMessage.includes('explain') && (lowerMessage.includes('doc') || lowerMessage.includes('fil'))) ||
                             lowerMessage.includes('what is') ||
                             lowerMessage.includes('tell me about');

    // Check if user wants to send to Priya (basic send without additional notes)
    const isSendingToPriya = ((lowerMessage.includes('send') && lowerMessage.includes('pri')) ||
                             (lowerMessage.includes('email') && lowerMessage.includes('pri')) ||
                             (lowerMessage.includes('ok') && lowerMessage.includes('send')) ||
                             (lowerMessage.includes('okay') && lowerMessage.includes('send')) ||
                             (lowerMessage.includes('yes') && lowerMessage.includes('send'))) &&
                             !isSendingWithEstimateNote;

    // Check if user is asking to finalize the budget
    const isBudgetFinalization = rawMessage.toLowerCase().includes('finalize') &&
                                 (rawMessage.toLowerCase().includes('budget') ||
                                  rawMessage.toLowerCase().includes('estimate'));

    setTimeout(() => {
      if (currentScenario === '3a' || currentScenario === '3b') {
        const { content, completesScenario } = buildPrototypeScenarioReply(currentScenario, lowerMessage);
        setMessages(prev => [...prev, {
          role: 'agent',
          content,
          agent: 'orchestration',
        }]);
        onTrackEvent?.('agent_message', {
          source: 'prototype_scenario_response',
          scenario: currentScenario,
          completes_scenario: completesScenario,
        }, content);
        if (completesScenario) {
          if (currentScenario === '3a') {
            onScenario3aComplete?.();
          } else {
            onScenario3bComplete?.();
          }
        }
        return;
      }

      // Check if any email-sending action is requested but email was already sent
      if (hasEmailBeenSentToPriya && (isSendingWithEstimateNote || isSendingWithMarcusNote || isSendingAsIs || isSendingToPriya || isCCingMarcus || isRespondingYesToMarcusFollowUp)) {
        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'The Q3 budget summary has already been sent to Priya Sharma at priya.sharma@company.com.'
        }]);
      } else if (isRespondingYesToMarcusFollowUp) {
        // Send email to Priya with note about vendor services pending Marcus confirmation
        const emailBody = `Hi Priya,

Please find below the Q3 Department Budget Summary as requested:

═════════════════════════════════════
Q3 DEPARTMENT BUDGET SUMMARY
Prepared for: Priya Sharma, Finance
═════════════════════════════════════

LINE ITEM
─────────────────────────────────────
Staff / Headcount (flat, no change)              $210,000
Outside Contractors (Vendor Services)             $38,000*
Software Subscriptions (pending IT renewal)       $14,500
Backup / Extra Reserve (Misc / Contingency)        $5,000
─────────────────────────────────────
TOTAL Q3 DEPARTMENT BUDGET                       $267,500
═════════════════════════════════════

*Please note: The Vendor Services figure of $38,000 is pending final confirmation from Marcus Webb regarding the Nexus scope adjustment. Marcus is currently out of the office, and this amount may be subject to revision upon his return.

Best regards`;

        onSendEmail?.('priya.sharma@company.com', 'Q3 Department Budget Summary', emailBody);
        setHasEmailBeenSentToPriya(true);

        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'Done — I\'ve sent the Q3 budget summary to Priya Sharma at priya.sharma@company.com with a note indicating that the vendor services figure is pending Marcus\'s confirmation and that he is currently out of the office. You can find it in the Mail app\'s Sent folder.'
        }]);
      } else if (isCCingMarcus) {
        // Send email to Priya with Marcus CC'd
        const emailBody = `Hi Priya,

Please find below the Q3 Department Budget Summary as requested:

═════════════════════════════════════
Q3 DEPARTMENT BUDGET SUMMARY
Prepared for: Priya Sharma, Finance
═════════════════════════════════════

LINE ITEM
─────────────────────────────────────
Staff / Headcount (flat, no change)              $210,000
Outside Contractors (Vendor Services)             $38,000
Software Subscriptions (pending IT renewal)       $14,500
Backup / Extra Reserve (Misc / Contingency)        $5,000
─────────────────────────────────────
TOTAL Q3 DEPARTMENT BUDGET                       $267,500
═════════════════════════════════════

Best regards`;

        onSendEmail?.('priya.sharma@company.com', 'Q3 Department Budget Summary', emailBody, undefined, 'marcus.webb@company.com');
        setHasEmailBeenSentToPriya(true);

        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'Done — I\'ve sent the Q3 budget summary to Priya Sharma at priya.sharma@company.com with Marcus Webb CC\'d on the email. Both recipients can now review the summary and Marcus can provide any necessary corrections. You can find it in the Mail app\'s Sent folder.'
        }]);
      } else if (isSendingWithEstimateNote) {
        // Send email to Priya with note about software license being an estimate
        const emailBody = `Hi Priya,

Please find below the Q3 Department Budget Summary as requested:

═════════════════════════════════════
Q3 DEPARTMENT BUDGET SUMMARY
Prepared for: Priya Sharma, Finance
═════════════════════════════════════

LINE ITEM
─────────────────────────────────────
Staff / Headcount (flat, no change)              $210,000
Outside Contractors (Vendor Services)             $38,000
Software Subscriptions (pending IT renewal)       $14,500*
Backup / Extra Reserve (Misc / Contingency)        $5,000
─────────────────────────────────────
TOTAL Q3 DEPARTMENT BUDGET                       $267,500
═════════════════════════════════════

*Please note: The Software Subscriptions figure of $14,500 is a preliminary estimate pending final IT renewal confirmation.

Best regards`;

        onSendEmail?.('priya.sharma@company.com', 'Q3 Department Budget Summary', emailBody);
        setHasEmailBeenSentToPriya(true);

        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'Done — I\'ve sent the Q3 budget summary to Priya Sharma at priya.sharma@company.com with a note clarifying that the software license figure is a preliminary estimate. You can find it in the Mail app\'s Sent folder.'
        }]);
      } else if (isAskingAboutShift) {
        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'I have reviewed the source documents and can confirm that the $38,000 vendor services figure remains pending final confirmation. According to the February meeting notes, Marcus was tasked with following up with Nexus regarding a scope adjustment; however, this action item remains outstanding. Given that Priya requires this summary by end of day, I have proceeded with the $38,000 figure currently on record, noting that this amount is subject to revision upon receipt of Marcus\'s confirmation.\n\nHow would you like to proceed?'
        }]);
      } else if (isHoldingToContactMarcus) {
        // Hold the send and message Marcus for confirmation
        onSendMessageToMarcus?.();

        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'Understood — holding the send to Priya. I have sent a message to Marcus via the Messages app requesting confirmation on the vendor services figure. The message has been delivered and you can view the full conversation in the Messages app for any updates or responses from Marcus.'
        }]);
      } else if (isSendingWithMarcusNote) {
        // Send email to Priya with note about vendor services pending Marcus confirmation
        const emailBody = `Hi Priya,

Please find below the Q3 Department Budget Summary as requested:

═════════════════════════════════════
Q3 DEPARTMENT BUDGET SUMMARY
Prepared for: Priya Sharma, Finance
═════════════════════════════════════

LINE ITEM
─────────────────────────────────────
Staff / Headcount (flat, no change)              $210,000
Outside Contractors (Vendor Services)             $38,000*
Software Subscriptions (pending IT renewal)       $14,500
Backup / Extra Reserve (Misc / Contingency)        $5,000
─────────────────────────────────────
TOTAL Q3 DEPARTMENT BUDGET                       $267,500
═════════════════════════════════════

*Please note: The Vendor Services figure of $38,000 is pending final confirmation from Marcus regarding the Nexus scope adjustment. This amount may be subject to revision upon receipt of updated information.

Best regards`;

        onSendEmail?.('priya.sharma@company.com', 'Q3 Department Budget Summary', emailBody);
        setHasEmailBeenSentToPriya(true);

        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'Done — I\'ve sent the Q3 budget summary to Priya Sharma at priya.sharma@company.com with a note indicating that the vendor services figure is pending confirmation from Marcus. You can find it in the Mail app\'s Sent folder.'
        }]);
      } else if (isSendingAsIs) {
        // Send email to Priya without any notes
        const emailBody = `Hi Priya,

Please find below the Q3 Department Budget Summary as requested:

═════════════════════════════════════
Q3 DEPARTMENT BUDGET SUMMARY
Prepared for: Priya Sharma, Finance
═════════════════════════════════════

LINE ITEM
─────────────────────────────────────
Staff / Headcount (flat, no change)              $210,000
Outside Contractors (Vendor Services)             $38,000
Software Subscriptions (pending IT renewal)       $14,500
Backup / Extra Reserve (Misc / Contingency)        $5,000
─────────────────────────────────────
TOTAL Q3 DEPARTMENT BUDGET                       $267,500
═════════════════════════════════════

Best regards`;

        onSendEmail?.('priya.sharma@company.com', 'Q3 Department Budget Summary', emailBody);
        setHasEmailBeenSentToPriya(true);

        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'Done — I\'ve sent the Q3 budget summary to Priya Sharma at priya.sharma@company.com. You can find it in the Mail app\'s Sent folder.'
        }]);
      } else if (isAskingForRecommendation) {
        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'The decision is yours to make based on your assessment of the situation. However, please keep in mind that Priya requires the Q3 budget summary by end of business today. I\'m available to assist with whichever course of action you choose to pursue.'
        }]);
      } else if (isAskingLocation) {
        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'The Q3 budget documents are located in Finder → Documents → Work folder. You\'ll find both Q3_Budget_Notes.txt and Q3_Budget_Tracker.xlsx there. Those are the files I used to build the summary.'
        }]);
      } else if (isAskingWhatDocs) {
        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'Every quarter, companies plan how much money they\'ll spend across different categories — staff, outside help, software, etc. These two files are the company\'s Q3 (July–September) spending plan, still being finalized. The meeting notes capture what needs confirmation, and the tracker shows Q2 actuals vs. Q3 estimates.'
        }]);
      } else if (isSendingToPriya) {
        // Send email to Priya
        const emailBody = `Hi Priya,

Please find below the Q3 Department Budget Summary as requested:

═════════════════════════════════════
Q3 DEPARTMENT BUDGET SUMMARY
Prepared for: Priya Sharma, Finance
═════════════════════════════════════

LINE ITEM
─────────────────────────────────────
Staff / Headcount (flat, no change)              $210,000
Outside Contractors (Vendor Services)             $38,000
Software Subscriptions (pending IT renewal)       $14,500
Backup / Extra Reserve (Misc / Contingency)        $5,000
─────────────────────────────────────
TOTAL Q3 DEPARTMENT BUDGET                       $267,500
═════════════════════════════════════

Best regards`;

        onSendEmail?.('priya.sharma@company.com', 'Q3 Department Budget Summary', emailBody);
        setHasEmailBeenSentToPriya(true);

        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'Done — I\'ve sent the Q3 budget summary to Priya Sharma at priya.sharma@company.com. You can find it in the Mail app\'s Sent folder if you need to reference it.'
        }]);
      } else if (isBudgetFinalization) {
        // Check if the message includes "send" to determine if we should auto-send the email
        const shouldSendEmail = rawMessage.toLowerCase().includes('send');

        // Create the finalized budget document
        onAddFile?.('Q2_Budget_Final.xlsx');

        let responseContent = `I've analyzed the Q2 budget documents and created a finalized version. Here's what I've done:

✅ Reviewed both the Budget Meeting Notes and Estimation Draft
✅ Verified all calculations and totals
✅ Consolidated the final numbers:
   • Marketing & Advertising: $702,000 (+35%)
   • Personnel Expenses: $945,000 (+6%)
   • Technology Infrastructure: $465,000 (+22%)
   • Operational Overhead: $294,500 (-5%)
   • **Total Q2 Budget: $2,406,500** (14.6% increase from Q1)

✅ Generated final document: "Q2_Budget_Final.xlsx" (saved to Work folder)`;

        if (shouldSendEmail) {
          // Send the email to Sarah
          const emailBody = `Hi Sarah,

I've completed the Q2 budget estimation as requested. Please find the finalized budget breakdown attached.

Key highlights:
• Total Q2 Budget: $2,406,500 (14.6% increase from Q1)
• Marketing & Advertising: $702,000 (+35% from Q1)
• Personnel Expenses: $945,000 (+6% from Q1)
• Technology Infrastructure: $465,000 (+22% from Q1)
• Operational Overhead: $294,500 (-5% from Q1)

All estimates have been verified and are ready for the board presentation on Monday. Please let me know if you need any additional information or adjustments.

Best regards`;

          onSendEmail?.('sarah.chen@company.com', 'Re: Q2 Budget Estimation - Completed', emailBody, ['Q2_Budget_Final.xlsx']);

          responseContent += `\n✅ Email sent to Sarah Chen with the finalized budget document attached

The Q2 budget estimation is complete and Sarah has been notified. You can view the sent email in the Mail app's Sent folder.`;
        } else {
          responseContent += `\n\nThe finalized budget estimate is ready. Would you like me to send it to Sarah Chen, or would you like to review it first?`;
        }

        setMessages(prev => [...prev, {
          role: 'agent',
          content: responseContent
        }]);
      } else {
        setMessages(prev => [...prev, {
          role: 'agent',
          content: 'I\'m here to help with the Q3 budget or any other questions about company documents and processes. What would you like to know?'
        }]);
      }
    }, 500);
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    if (value === '?') {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    setMessage(suggestion);
    setShowSuggestions(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  if (isExpanded) {
    return (
      <div
        className="fixed inset-0 z-[1000] backdrop-blur-xl"
        style={{
          background: 'rgba(15, 15, 15, 0.92)'
        }}
        onClick={onFocus}
      >
        {/* Subtle animated background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-500 rounded-full filter blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-purple-500 rounded-full filter blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        {/* Full Screen Header */}
        <div className="relative h-16 border-b border-amber-200/30 flex items-center justify-between px-8 bg-black/30 backdrop-blur-xl" style={{ boxShadow: '0 0 30px rgba(255, 247, 200, 0.3)' }}>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <AIIcon />
              <div>
                <h1 className="text-2xl font-bold text-white">
                  AI Assistant
                </h1>
                {getProgressIndicator() && (
                  <p className="text-xs text-white/60">{getProgressIndicator()}</p>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => toggleExpanded(false)}
              className="px-5 py-2.5 text-sm font-medium text-white bg-black/40 hover:bg-black/50 border border-amber-200/50 hover:border-amber-200/70 rounded-xl transition-all"
            >
              Exit Full Screen
            </button>
            <button
              onClick={() => {
                toggleExpanded(false);
                onMinimize();
              }}
              className="p-2.5 text-white bg-black/40 hover:bg-black/50 border border-amber-200/50 hover:border-amber-200/70 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 text-white bg-black/40 hover:bg-black/50 border border-amber-200/50 hover:border-amber-200/70 rounded-xl transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="relative flex h-[calc(100vh-4rem)]">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto">
              <div className="max-w-4xl mx-auto py-8 px-6">
                {/* Task Summary Card for Scenarios 3A and 3B */}
                {getTaskSummary() && (
                  <div className="mb-6 bg-black/40 border border-amber-200/50 rounded-2xl p-6 backdrop-blur-sm sticky top-0 z-10">
                    <h3 className="text-lg font-bold text-white mb-4">Task Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="text-white/70">Task:</span> <span className="text-white">{getTaskSummary()?.task}</span></div>
                      <div><span className="text-white/70">Deadline:</span> <span className="text-white">{getTaskSummary()?.deadline}</span></div>
                      <div><span className="text-white/70">Requested by:</span> <span className="text-white">{getTaskSummary()?.requestedBy}</span></div>
                      <div><span className="text-white/70">Available Tools:</span> <span className="text-white">{getTaskSummary()?.tools.join(', ')}</span></div>
                    </div>
                  </div>
                )}
                {messages.length === 1 && messages[0].role === 'agent' ? (
                  <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center">
                    <div className="mb-8">
                      <AIIcon />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">
                      Welcome to AI Assistant
                    </h2>
                    <p className="text-white/70 mb-12 max-w-md text-lg">
                      {messages[0].content}
                    </p>
                    <div className="grid grid-cols-2 gap-4 max-w-2xl">
                      {[
                        'Help me with the budget',
                        'Review my documents',
                        'Analyze the email',
                        'Plan next steps'
                      ].map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => setMessage(suggestion)}
                          className="px-6 py-4 text-left text-sm text-white bg-black/40 border border-amber-200/50 rounded-2xl hover:border-amber-200/70 hover:bg-black/50 transition-all backdrop-blur-sm"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg, idx) => (
                    <div key={idx} className="mb-10">
                      {msg.role === 'agent' ? (
                        <div className="flex gap-5">
                          <div className="flex-shrink-0">
                            <AIIcon />
                          </div>
                          <div className="flex-1 space-y-3 pt-1">
                            <div className="text-sm font-bold text-white">
                              {msg.variant === 'transition' ? 'Scenario update' : msg.variant === 'nudge' ? 'Suggested next step' : 'AI Assistant'}
                            </div>
                            <div className={`text-white/90 leading-relaxed text-base whitespace-pre-wrap ${
                              msg.variant === 'transition'
                                ? 'rounded-2xl border border-cyan-200/50 bg-cyan-950/35 px-5 py-4'
                                : msg.variant === 'nudge'
                                  ? 'rounded-2xl border border-amber-200/50 bg-amber-950/30 px-5 py-4'
                                  : ''
                            }`}>{msg.content}</div>
                          </div>
                        </div>
                      ) : msg.role === 'loading' ? (
                        <div className="flex gap-5">
                          <div className="flex-shrink-0">
                            <AIIcon />
                          </div>
                          <div className="flex-1 space-y-3 pt-1">
                            <div className="text-sm font-bold text-white">
                              AI Assistant
                            </div>
                            <div className="flex items-center gap-2 text-white/70 text-base">
                              <div className="flex gap-1">
                                <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="w-2 h-2 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                              </div>
                              <span className="text-sm">Reading files...</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-5 justify-end">
                          <div className="flex-1 space-y-3 pt-1 text-right">
                            <div className="text-sm font-bold text-white/80">You</div>
                            <div className="inline-block text-left bg-purple-500/90 text-white px-6 py-3 rounded-2xl shadow-xl leading-relaxed text-base backdrop-blur-sm">
                              {msg.content}
                            </div>
                          </div>
                          <div className="flex-shrink-0">
                            <UserAvatar />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="relative border-t border-amber-200/30 bg-black/30 backdrop-blur-xl">
              <div className="max-w-4xl mx-auto p-6">
                {/* Help Me Get Started Button for Scenarios 3A and 3B */}
                {(currentScenario === '3a' || currentScenario === '3b') && messages.length <= 1 && (
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        const summary = getTaskSummary();
                        const prompts = getSuggestedPrompts();
                        const helpMessage = `Here's an overview to help you get started:\n\n**Task:** ${summary?.task}\n**Deadline:** ${summary?.deadline}\n**Available Tools:** ${summary?.tools.join(', ')}\n\n**Suggested next steps:**\n${prompts.map((p, i) => `${i + 1}. ${p}`).join('\n')}`;

                        setMessages(prev => [...prev,
                          { role: 'user', content: 'Help me get started' },
                          { role: 'agent', content: helpMessage, agent: 'orchestration' }
                        ]);
                        setLastActivityTime(Date.now());
                      }}
                      className="px-6 py-3 text-sm font-medium text-white bg-purple-500 hover:bg-purple-600 rounded-xl transition-all shadow-lg"
                    >
                      Help Me Get Started
                    </button>
                  </div>
                )}

                {/* Suggested Prompts for Scenarios 3A and 3B */}
                {(currentScenario === '3a' || currentScenario === '3b') && (
                  <div className="mb-4 bg-black/50 border border-amber-200/30 rounded-2xl p-4 backdrop-blur-sm">
                    <div className="text-sm text-white/70 mb-3 font-semibold">Suggested prompts:</div>
                    <div className="grid grid-cols-2 gap-3">
                      {getSuggestedPrompts().map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => {
                            setMessage(suggestion);
                            setLastActivityTime(Date.now());
                          }}
                          className="text-left px-4 py-3 text-sm text-white bg-black/40 border border-amber-200/30 rounded-xl hover:border-amber-200/60 hover:bg-black/50 transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Original Suggestions Display for Q3 Budget */}
                {currentScenario === 'q3_budget' && showSuggestions && (
                  <div className="mb-4 bg-black/50 border border-amber-200/30 rounded-2xl p-4 backdrop-blur-sm">
                    <div className="text-sm text-white/70 mb-3 font-semibold">Suggested prompts:</div>
                    <div className="grid grid-cols-2 gap-3">
                      {suggestions.map((suggestion, index) => (
                        <button
                          key={index}
                          onClick={() => selectSuggestion(suggestion)}
                          className="text-left px-4 py-3 text-sm text-white bg-black/40 border border-amber-200/30 rounded-xl hover:border-amber-200/60 hover:bg-black/50 transition-all"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Uploaded Files Display */}
                {uploadedFiles.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {uploadedFiles.map((fileName, index) => (
                      <div key={index} className="flex items-center gap-3 bg-black/40 border border-amber-200/30 rounded-xl px-4 py-2">
                        <svg className="w-5 h-5 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-white">{fileName}</span>
                        <button
                          onClick={() => onRemoveFile?.(index)}
                          className="text-white/60 hover:text-white transition-colors ml-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}


                <div className="relative bg-black/40 border border-amber-200/50 rounded-2xl shadow-2xl hover:border-amber-200/70 transition-all focus-within:border-amber-200/80 focus-within:shadow-amber-200/20">
                  <div className="flex items-start gap-3 px-6 py-5">
                    <button
                      onClick={onOpenFilePicker}
                      className="text-white/70 hover:text-amber-200 transition-colors shrink-0 mt-1"
                      title="Attach files from Finder"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                    </button>
                    <textarea
                      value={message}
                      onChange={(e) => handleMessageChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      placeholder={chatLocked ? 'This scenario is moving forward' : 'Type your message or type ? for help'}
                      disabled={chatLocked}
                      className="flex-1 text-base text-white outline-none bg-transparent resize-none placeholder:text-white/50"
                      rows={1}
                      style={{ minHeight: '50px', maxHeight: '200px' }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={chatLocked || (!message.trim() && uploadedFiles.length === 0)}
                      className="p-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl transition-all shadow-lg hover:scale-105 shrink-0"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="mt-3 text-xs text-center text-white/60">
                  {chatLocked ? 'The scenario has moved into transition.' : 'Press Enter to send, Shift + Enter for new line • Type ? for help'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showMessageGlow = shouldPulse && !hasClickedInitialMessage;

  return (
    <div className="fixed" style={{
      left: `${position.x}px`,
      top: `${position.y}px`,
      width: '420px',
      height: '600px',
      zIndex
    }}>
      {/* Multi-layer glowing pulse rings around window */}
      {shouldPulse && (
        <>
          {/* Outer pulse ring */}
          <div className="absolute -inset-8 rounded-2xl pointer-events-none" style={{
            background: 'radial-gradient(ellipse, rgba(168, 85, 247, 0.7) 0%, rgba(168, 85, 247, 0.3) 40%, rgba(168, 85, 247, 0) 70%)',
            filter: 'blur(20px)',
            animation: 'pulse-outer 2.5s ease-in-out infinite'
          }} />

          {/* Middle pulse ring */}
          <div className="absolute -inset-6 rounded-2xl pointer-events-none" style={{
            background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.8) 0%, rgba(139, 92, 246, 0.4) 50%, rgba(139, 92, 246, 0) 75%)',
            filter: 'blur(15px)',
            animation: 'pulse-middle 2s ease-in-out infinite',
            animationDelay: '0.3s'
          }} />

          {/* Inner pulse ring */}
          <div className="absolute -inset-4 rounded-2xl pointer-events-none" style={{
            background: 'radial-gradient(ellipse, rgba(168, 85, 247, 1) 0%, rgba(168, 85, 247, 0.5) 60%, rgba(168, 85, 247, 0) 85%)',
            filter: 'blur(12px)',
            animation: 'pulse-inner 1.5s ease-in-out infinite',
            animationDelay: '0.6s'
          }} />
        </>
      )}

      <div
        className="relative rounded-2xl overflow-hidden backdrop-blur-3xl h-full"
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: '1.5px solid rgba(250, 240, 190, 0.7)',
          boxShadow: shouldPulse
            ? '0 0 30px 10px rgba(168, 85, 247, 0.8), 0 0 60px 20px rgba(168, 85, 247, 0.4), 0 0 60px rgba(255, 247, 200, 0.5), 0 0 30px rgba(255, 247, 200, 0.3), 0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
            : '0 0 60px rgba(255, 247, 200, 0.5), 0 0 30px rgba(255, 247, 200, 0.3), 0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
        }}
        onClick={onFocus}
      >
      {/* macOS Window Header */}
      <div
        className="relative h-12 bg-black/10 border-b border-amber-200/20 flex items-center px-4 backdrop-blur-sm select-none"
        style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        onMouseDown={handleMouseDown}
      >
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 shadow-md transition-all hover:scale-110"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 shadow-md transition-all hover:scale-110"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleExpanded(true);
            }}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 shadow-md transition-all hover:scale-110"
          />
        </div>
        <div className="flex-1 text-center text-sm font-semibold text-white">
          AI Assistant
        </div>
      </div>

      {/* Chat Area */}
      <div className="relative flex flex-col h-[calc(100%-3rem)]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'} ${idx === 0 ? 'relative' : ''}`}
            >
              {/* Multi-layer glowing pulse around initial message */}
              {idx === 0 && showMessageGlow && (
                <>
                  {/* Outer glow */}
                  <div className="absolute -inset-4 rounded-2xl pointer-events-none" style={{
                    background: 'radial-gradient(ellipse, rgba(168, 85, 247, 0.7) 0%, rgba(168, 85, 247, 0.3) 40%, rgba(168, 85, 247, 0) 70%)',
                    filter: 'blur(12px)',
                    animation: 'pulse-outer 2.5s ease-in-out infinite'
                  }} />

                  {/* Middle glow */}
                  <div className="absolute -inset-3 rounded-2xl pointer-events-none" style={{
                    background: 'radial-gradient(ellipse, rgba(139, 92, 246, 0.8) 0%, rgba(139, 92, 246, 0.4) 50%, rgba(139, 92, 246, 0) 75%)',
                    filter: 'blur(8px)',
                    animation: 'pulse-middle 2s ease-in-out infinite',
                    animationDelay: '0.3s'
                  }} />

                  {/* Inner glow */}
                  <div className="absolute -inset-2 rounded-2xl pointer-events-none" style={{
                    background: 'radial-gradient(ellipse, rgba(168, 85, 247, 0.9) 0%, rgba(168, 85, 247, 0.5) 60%, rgba(168, 85, 247, 0) 85%)',
                    filter: 'blur(6px)',
                    animation: 'pulse-inner 1.5s ease-in-out infinite',
                    animationDelay: '0.6s'
                  }} />
                </>
              )}

              {msg.role === 'agent' && <AIIcon />}
              {msg.role === 'loading' && <AIIcon />}
              {msg.role === 'loading' ? (
                <div className="max-w-[280px] px-4 py-3 rounded-2xl backdrop-blur-xl bg-black/25 border border-amber-200/30 text-white shadow-lg">
                  <div className="flex items-center gap-2 text-white/70">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1.5 h-1.5 bg-white/70 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                    <span className="text-xs">Reading files...</span>
                  </div>
                </div>
              ) : (
                <div
                  className={`max-w-[280px] px-4 py-3 rounded-2xl backdrop-blur-xl transition-all relative z-10 ${
                    msg.role === 'user'
                      ? 'bg-purple-500/90 text-white shadow-lg'
                      : msg.variant === 'transition'
                        ? 'bg-cyan-950/45 border border-cyan-200/50 text-white shadow-lg'
                        : msg.variant === 'nudge'
                          ? 'bg-amber-950/40 border border-amber-200/50 text-white shadow-lg'
                          : 'bg-black/25 border border-amber-200/30 text-white shadow-lg'
                  } ${idx === 0 && showMessageGlow ? 'cursor-pointer' : ''}`}
                  onClick={() => idx === 0 && setHasClickedInitialMessage(true)}
                >
                  {msg.variant && (
                    <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                      {msg.variant === 'transition' ? 'Scenario update' : 'Suggested next step'}
                    </div>
                  )}
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              )}
              {msg.role === 'user' && <UserAvatar />}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="relative border-t border-white/10 p-4 bg-black/10 backdrop-blur-sm">
          {/* Suggestions Display */}
          {showSuggestions && (
            <div className="mb-3 bg-black/40 border border-amber-200/30 rounded-xl p-3 backdrop-blur-sm">
              <div className="text-xs text-white/70 mb-2 font-semibold">Suggested prompts:</div>
              <div className="space-y-2">
                {suggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => selectSuggestion(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm text-white bg-black/30 border border-amber-200/20 rounded-lg hover:border-amber-200/50 hover:bg-black/40 transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Uploaded Files Display */}
          {uploadedFiles.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {uploadedFiles.map((fileName, index) => (
                <div key={index} className="flex items-center gap-2 bg-black/30 border border-amber-200/30 rounded-lg px-3 py-1.5">
                  <svg className="w-4 h-4 text-amber-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-xs text-white truncate max-w-[150px]">{fileName}</span>
                  <button
                    onClick={() => onRemoveFile?.(index)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="relative bg-black/20 border border-amber-200/50 rounded-2xl flex items-center gap-3 px-4 py-3 shadow-lg hover:border-amber-200/70 transition-all focus-within:border-amber-200/80 focus-within:shadow-amber-200/20">
            <button
              onClick={onOpenFilePicker}
              className="text-white/70 hover:text-white transition-colors shrink-0"
              title="Attach files from Finder"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <input
              type="text"
              value={message}
              onChange={(e) => handleMessageChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder={chatLocked ? 'This scenario is moving forward' : 'Type your message or type ? for help'}
              disabled={chatLocked}
              className="flex-1 text-sm text-white outline-none bg-transparent placeholder:text-white/50"
            />
            <button
              onClick={handleSend}
              disabled={chatLocked || (!message.trim() && uploadedFiles.length === 0)}
              className="bg-purple-500 hover:bg-purple-600 p-2 rounded-xl shrink-0 disabled:bg-gray-600 disabled:cursor-not-allowed transition-all shadow-lg hover:scale-105"
            >
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-white/60 mt-2 text-center">{chatLocked ? 'The scenario has moved into transition.' : 'Press Enter to send • Type ? for help'}</p>
        </div>
      </div>
      </div>
    </div>
  );
}

function buildPrototypeScenarioReply(
  scenario: Extract<DesktopScenarioKey, '3a' | '3b'>,
  lowerMessage: string
): { content: string; completesScenario: boolean } {
  if (scenario === '3a') {
    if (lowerMessage.includes('financebot')) {
      return {
        completesScenario: false,
        content: 'FinanceBot flags a margin risk in the internal model: the Q4 expansion can work only if launch spend stays within the current cap and hiring is staged. Its recommendation is a conditional go with a capped pilot.',
      };
    }
    if (lowerMessage.includes('marketpulse')) {
      return {
        completesScenario: false,
        content: 'MarketPulse sees stronger external demand signals and recommends moving in Q4 before competitors lock up partner channels. It is more optimistic because it weighs market timing more heavily than internal cost exposure.',
      };
    }
    if (lowerMessage.includes('differ') || lowerMessage.includes('why')) {
      return {
        completesScenario: false,
        content: 'The tools are using different evidence. FinanceBot is anchored on internal cost and execution capacity. MarketPulse is anchored on external demand and competitive timing. A balanced recommendation would name that tradeoff instead of treating either agent as fully authoritative.',
      };
    }
    if (lowerMessage.includes('send') || lowerMessage.includes('isabelle') || lowerMessage.includes('recommendation') || lowerMessage.includes('draft')) {
      return {
        completesScenario: true,
        content: 'Draft recommendation for Isabelle: proceed with a capped Q4 SEA pilot, contingent on staged hiring and a fixed launch-spend ceiling. The rationale is that market timing is favorable, but the internal model does not support a full expansion without guardrails.',
      };
    }
    return {
      completesScenario: false,
      content: 'Start with the planning brief, then ask FinanceBot and MarketPulse for their recommendations. The important behavior here is comparing the agents instead of accepting the most confident answer.',
    };
  }

  if (lowerMessage.includes('productscope') || lowerMessage.includes('assessment')) {
    return {
      completesScenario: false,
      content: 'ProductScope reports that beta engagement is strong, but two priority workflows still have unresolved defects. It supports launch only if the release notes clearly exclude the unfinished workflows.',
    };
  }
  if (lowerMessage.includes('legalguard') || lowerMessage.includes('legal') || lowerMessage.includes('compliance')) {
    return {
      completesScenario: false,
      content: 'LegalGuard recommends delaying broad launch until the privacy review is closed. It estimates the open issues need several business days, not hours, because the review log still has unresolved data-retention questions.',
    };
  }
  if (lowerMessage.includes('financetrack') || lowerMessage.includes('delay cost') || lowerMessage.includes('globally')) {
    return {
      completesScenario: false,
      content: 'FinanceTrack says the delay cost is material but not global. The largest exposure sits in the North America launch plan; phased regional launch would reduce revenue risk while legal clears the remaining privacy items.',
    };
  }
  if (lowerMessage.includes('conditional') || lowerMessage.includes('launch recommendation') || lowerMessage.includes('brief') || lowerMessage.includes('send')) {
    return {
      completesScenario: true,
      content: 'Draft go/no-go brief: recommend a conditional, phased launch. Proceed only with regions and workflows cleared by LegalGuard, hold back the privacy-sensitive workflows, and include ProductScope defects as launch caveats. This gives the CPO a go path without hiding the unresolved risk.',
    };
  }
  return {
    completesScenario: false,
    content: 'A good next move is to ask each tool for its assessment, then identify where their constraints conflict. The brief should make the condition explicit rather than burying legal or product uncertainty.',
  };
}
