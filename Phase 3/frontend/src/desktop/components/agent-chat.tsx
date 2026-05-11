import { useState, useRef, useEffect } from 'react';
import svgPaths from '../../imports/ConversationTemplateMobile/svg-1a0rrom8ov';
import type { ProgressionDecision, SimulatorEventType } from '../../app/lib/simulatorApi';

type ChatMessage = {
  role: 'user' | 'agent';
  content: string;
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
  onSendEmail?: (to: string, subject: string, body: string, attachments?: string[]) => void;
  onTrackEvent?: (
    eventType: SimulatorEventType,
    metadata?: Record<string, unknown>,
    content?: string | null,
    artifactId?: string | null
  ) => void;
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
  onSendEmail
}: AgentChatProps) {
  const [message, setMessage] = useState('');
  const [chatLocked, setChatLocked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'agent', content: initialMessage || 'Hello! How can I assist you today?' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: window.innerWidth - 440, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const handleSend = async () => {
    if (chatLocked) return;
    if (!message.trim() && uploadedFiles.length === 0) return;

    const rawMessage = message;
    const attachments = [...uploadedFiles];
    let userMessage = rawMessage;
    if (uploadedFiles.length > 0) {
      userMessage = rawMessage ? `${rawMessage}\n\nAttached: ${uploadedFiles.join(', ')}` : `Attached: ${uploadedFiles.join(', ')}`;
    }

    setMessages([...messages, { role: 'user', content: userMessage }]);
    onTrackEvent?.('user_message', {
      source: 'assistant_chat',
      attachment_count: attachments.length,
      attachments,
    }, userMessage);

    // Check if user is asking to finalize the budget
    const isBudgetFinalization = rawMessage.toLowerCase().includes('finalize') &&
                                 (rawMessage.toLowerCase().includes('budget') ||
                                  rawMessage.toLowerCase().includes('estimate'));

    setMessage('');
    setShowSuggestions(false);
    onClearFiles?.();

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
          if (response.progression?.message && response.progression.intervention_type !== 'none') {
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
        }
      } catch (error) {
        console.warn('Unable to generate backend assistant turn', error);
      }
    }

    setTimeout(() => {
      if (isBudgetFinalization) {
        // Check if the message includes "send" to determine if we should auto-send the email
        const shouldSendEmail = rawMessage.toLowerCase().includes('send');

        // Create the finalized budget document
        onAddFile?.('Q2_Budget_Final.xlsx');

        let responseContent = `I've analyzed the Q2 budget documents and created a finalized version. Here's what I've done:

✅ Reviewed both the Budget Proposal and Estimation Draft
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
        onTrackEvent?.('agent_message', {
          source: 'local_demo_response',
          local_response_type: 'budget_finalization',
        }, responseContent);
      } else {
        const responseContent = 'I received your message and files. This is a demo AI assistant interface.';
        setMessages(prev => [...prev, {
          role: 'agent',
          content: responseContent
        }]);
        onTrackEvent?.('agent_message', {
          source: 'local_demo_response',
          local_response_type: 'generic',
        }, responseContent);
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
    onTrackEvent?.('suggestion_selected', {
      suggestion,
      source: 'assistant_chat',
    });
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
              <h1 className="text-2xl font-bold text-white">
                AI Assistant
              </h1>
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
                            <div className={`text-white/90 leading-relaxed text-base ${
                              msg.variant === 'transition'
                                ? 'rounded-2xl border border-cyan-200/50 bg-cyan-950/35 px-5 py-4'
                                : msg.variant === 'nudge'
                                  ? 'rounded-2xl border border-amber-200/50 bg-amber-950/30 px-5 py-4'
                                  : ''
                            }`}>{msg.content}</div>
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
                {/* Suggestions Display */}
                {showSuggestions && (
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

  return (
    <div
      className="fixed rounded-2xl overflow-hidden backdrop-blur-3xl"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '420px',
        height: '600px',
        zIndex,
        background: 'rgba(0, 0, 0, 0.4)',
        border: '1.5px solid rgba(250, 240, 190, 0.7)',
        boxShadow: '0 0 60px rgba(255, 247, 200, 0.5), 0 0 30px rgba(255, 247, 200, 0.3), 0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
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
              className={`flex gap-3 items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'agent' && <AIIcon />}
              <div
                className={`max-w-[280px] px-4 py-3 rounded-2xl backdrop-blur-xl transition-all ${
                  msg.role === 'user'
                    ? 'bg-purple-500/90 text-white shadow-lg'
                    : msg.variant === 'transition'
                      ? 'bg-cyan-950/45 border border-cyan-200/50 text-white shadow-lg'
                      : msg.variant === 'nudge'
                        ? 'bg-amber-950/40 border border-amber-200/50 text-white shadow-lg'
                    : 'bg-black/25 border border-amber-200/30 text-white shadow-lg'
                }`}
              >
                {msg.variant && (
                  <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                    {msg.variant === 'transition' ? 'Scenario update' : 'Suggested next step'}
                  </div>
                )}
                <p className="text-sm leading-relaxed">{msg.content}</p>
              </div>
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
          <p className="text-xs text-white/60 mt-2 text-center">
            {chatLocked ? 'The scenario has moved into transition.' : 'Press Enter to send • Type ? for help'}
          </p>
        </div>
      </div>
    </div>
  );
}
