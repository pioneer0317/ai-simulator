import { useEffect, useMemo, useRef, useState } from 'react';
import type { ProgressionDecision } from '../../app/lib/simulatorApi';

export type ChatMessage = {
  role: 'user' | 'agent' | 'loading';
  content: string;
  variant?: 'normal' | 'nudge' | 'transition' | 'error';
};

interface AgentChatProps {
  id: string;
  zIndex: number;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  onExpandChange?: (expanded: boolean) => void;
  initialMessage?: string;
  initialMessages?: ChatMessage[];
  onOpenFilePicker?: () => void;
  uploadedFiles?: string[];
  onRemoveFile?: (index: number) => void;
  onClearFiles?: () => void;
  onAgentTurn?: (
    message: string,
    referencedArtifactIds: string[],
    metadata: Record<string, unknown>
  ) => Promise<{ content: string | null; progression?: ProgressionDecision | null } | null>;
  onTransitionChange?: (inTransition: boolean) => void;
  shouldPulse?: boolean;
}

const AIIcon = () => (
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg ring-1 ring-purple-400/50">
    <svg className="relative z-10 h-6 w-6" fill="none" viewBox="0 0 20 20">
      <rect x="5" y="6" width="10" height="7" rx="1" fill="white" />
      <circle cx="8" cy="9" r="1" fill="#A855F7" />
      <circle cx="12" cy="9" r="1" fill="#A855F7" />
      <rect x="7" y="11.5" width="6" height="0.8" rx="0.4" fill="#94A3B8" />
      <rect x="8" y="11.5" width="0.6" height="1.2" fill="#94A3B8" />
      <rect x="11.4" y="11.5" width="0.6" height="1.2" fill="#94A3B8" />
      <rect x="9.5" y="4" width="1" height="2" fill="white" />
      <circle cx="10" cy="4" r="0.8" fill="white" />
      <rect x="6" y="13" width="8" height="3" rx="0.5" fill="white" />
      <circle cx="8.5" cy="14.5" r="0.8" fill="#10B981" opacity="0.8" />
      <circle cx="11.5" cy="14.5" r="0.8" fill="#A855F7" opacity="0.8" />
    </svg>
  </div>
);

const UserAvatar = () => (
  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gray-500 to-gray-600 shadow-lg ring-1 ring-white/20">
    <span className="text-sm font-bold text-white">U</span>
  </div>
);

const defaultSuggestions = [
  'Which source files did you use?',
  'What does "may shift" mean?',
  'Is the vendor services number final?',
  'Draft a caveat for Priya.',
];

export function AgentChat({
  id,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  onExpandChange,
  initialMessage,
  initialMessages,
  onOpenFilePicker,
  uploadedFiles = [],
  onRemoveFile,
  onClearFiles,
  onAgentTurn,
  onTransitionChange,
  shouldPulse = false,
}: AgentChatProps) {
  const startingMessages = useMemo(
    () =>
      initialMessages?.length
        ? initialMessages
        : [{ role: 'agent' as const, content: initialMessage || 'Hello. I can help review the visible episode materials and draft options.' }],
    [initialMessage, initialMessages]
  );
  const [messages, setMessages] = useState<ChatMessage[]>(startingMessages);
  const [message, setMessage] = useState('');
  const [chatLocked, setChatLocked] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 440, y: 60 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasClickedInitialMessage, setHasClickedInitialMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(startingMessages);
    setChatLocked(false);
  }, [startingMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;
      setPosition({
        x: event.clientX - dragOffset.x,
        y: event.clientY - dragOffset.y,
      });
    };
    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragOffset, isDragging]);

  const toggleExpanded = (expanded: boolean) => {
    setIsExpanded(expanded);
    onExpandChange?.(expanded);
  };

  const handleMessageChange = (value: string) => {
    setMessage(value);
    setShowSuggestions(value === '?');
  };

  const handleSend = async () => {
    if (chatLocked) return;
    if (!message.trim() && uploadedFiles.length === 0) return;

    const attachments = [...uploadedFiles];
    const userMessage = attachments.length
      ? message.trim()
        ? `${message.trim()}\n\nAttached: ${attachments.join(', ')}`
        : `Attached: ${attachments.join(', ')}`
      : message.trim();

    setMessages((current) => [
      ...current,
      { role: 'user', content: userMessage },
      { role: 'loading', content: '' },
    ]);
    setMessage('');
    setShowSuggestions(false);
    onClearFiles?.();

    if (!onAgentTurn) {
      setMessages((current) => [
        ...current.filter((item) => item.role !== 'loading'),
        {
          role: 'agent',
          variant: 'error',
          content: 'I could not reach the backend assistant. Please try again in a moment.',
        },
      ]);
      return;
    }

    try {
      const response = await onAgentTurn(userMessage, [], {
        source: 'assistant_chat',
        attachment_count: attachments.length,
        attachments,
      });
      setMessages((current) => {
        const withoutLoading = current.filter((item) => item.role !== 'loading');
        const nextMessages = response?.content
          ? [...withoutLoading, { role: 'agent' as const, content: response.content }]
          : withoutLoading;

        if (response?.progression?.message && response.progression.intervention_type !== 'none') {
          nextMessages.push({
            role: 'agent',
            content: response.progression.message,
            variant: response.progression.transition_required ? 'transition' : 'nudge',
          });
        }

        return nextMessages;
      });

      if (response?.progression?.transition_required) {
        setChatLocked(true);
        onTransitionChange?.(true);
      }
    } catch (error) {
      console.warn('Unable to generate backend assistant turn', error);
      setMessages((current) => [
        ...current.filter((item) => item.role !== 'loading'),
        {
          role: 'agent',
          variant: 'error',
          content: 'I could not reach the backend assistant. Please try again in a moment.',
        },
      ]);
    }
  };

  const handleMouseDown = (event: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: event.clientX - position.x,
      y: event.clientY - position.y,
    });
  };

  const showMessageGlow = shouldPulse && !hasClickedInitialMessage;
  const shellClass = isExpanded
    ? 'fixed inset-0 z-[1000] backdrop-blur-xl'
    : 'fixed';
  const shellStyle = isExpanded
    ? {
        background: 'rgba(15, 15, 15, 0.92)',
      }
    : {
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: '420px',
        height: '600px',
        zIndex,
      };

  return (
    <div id={id} className={shellClass} style={shellStyle} onClick={onFocus}>
      {shouldPulse && !isExpanded && (
        <div
          className="absolute -inset-8 rounded-2xl pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse, rgba(168, 85, 247, 0.7) 0%, rgba(168, 85, 247, 0.3) 40%, rgba(168, 85, 247, 0) 70%)',
            filter: 'blur(20px)',
            animation: 'pulse-outer 2.5s ease-in-out infinite',
          }}
        />
      )}

      <div
        className={`relative flex h-full flex-col overflow-hidden rounded-2xl backdrop-blur-3xl ${isExpanded ? 'rounded-none' : ''}`}
        style={{
          background: 'rgba(0, 0, 0, 0.4)',
          border: isExpanded ? '0' : '1.5px solid rgba(250, 240, 190, 0.7)',
          boxShadow: isExpanded
            ? 'none'
            : '0 0 60px rgba(255, 247, 200, 0.5), 0 0 30px rgba(255, 247, 200, 0.3), 0 20px 60px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
        }}
      >
        <div
          className="relative flex h-12 items-center border-b border-amber-200/20 bg-black/10 px-4 backdrop-blur-sm select-none"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
        >
          <div className="flex gap-2">
            <button
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              className="h-3 w-3 rounded-full bg-red-500 shadow-md transition-all hover:scale-110 hover:bg-red-600"
            />
            <button
              onClick={(event) => {
                event.stopPropagation();
                onMinimize();
              }}
              className="h-3 w-3 rounded-full bg-yellow-500 shadow-md transition-all hover:scale-110 hover:bg-yellow-600"
            />
            <button
              onClick={(event) => {
                event.stopPropagation();
                toggleExpanded(!isExpanded);
              }}
              className="h-3 w-3 rounded-full bg-green-500 shadow-md transition-all hover:scale-110 hover:bg-green-600"
            />
          </div>
          <div className="flex-1 text-center text-sm font-semibold text-white">
            AI Assistant
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col">
          <div className={`flex-1 space-y-4 overflow-y-auto p-4 ${isExpanded ? 'mx-auto w-full max-w-4xl py-8' : ''}`}>
            {messages.map((item, index) => (
              <div
                key={`${item.role}-${index}`}
                className={`flex items-start gap-3 ${item.role === 'user' ? 'justify-end' : 'justify-start'} ${index === 0 ? 'relative' : ''}`}
              >
                {index === 0 && showMessageGlow && (
                  <div
                    className="absolute -inset-3 rounded-2xl pointer-events-none"
                    style={{
                      background: 'radial-gradient(ellipse, rgba(168, 85, 247, 0.8) 0%, rgba(139, 92, 246, 0.35) 50%, rgba(168, 85, 247, 0) 75%)',
                      filter: 'blur(10px)',
                      animation: 'pulse-middle 2s ease-in-out infinite',
                    }}
                  />
                )}

                {item.role !== 'user' && <AIIcon />}
                {item.role === 'loading' ? (
                  <div className="max-w-[280px] rounded-2xl border border-amber-200/30 bg-black/25 px-4 py-3 text-white shadow-lg backdrop-blur-xl">
                    <div className="flex items-center gap-2 text-white/70">
                      <div className="flex gap-1">
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" style={{ animationDelay: '150ms' }} />
                        <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-white/70" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs">Thinking...</span>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`relative z-10 max-w-[280px] rounded-2xl px-4 py-3 shadow-lg backdrop-blur-xl transition-all ${
                      item.role === 'user'
                        ? 'bg-purple-500/90 text-white'
                        : item.variant === 'transition'
                          ? 'border border-cyan-200/50 bg-cyan-950/45 text-white'
                          : item.variant === 'nudge'
                            ? 'border border-amber-200/50 bg-amber-950/40 text-white'
                            : item.variant === 'error'
                              ? 'border border-red-200/50 bg-red-950/40 text-white'
                              : 'border border-amber-200/30 bg-black/25 text-white'
                    } ${index === 0 && showMessageGlow ? 'cursor-pointer' : ''}`}
                    onClick={() => index === 0 && setHasClickedInitialMessage(true)}
                  >
                    {item.variant && item.variant !== 'normal' && (
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/60">
                        {item.variant === 'transition'
                          ? 'Scenario update'
                          : item.variant === 'nudge'
                            ? 'Suggested next step'
                            : 'Connection issue'}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.content}</p>
                  </div>
                )}
                {item.role === 'user' && <UserAvatar />}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className={`border-t border-white/10 bg-black/10 p-4 backdrop-blur-sm ${isExpanded ? 'mx-auto w-full max-w-4xl' : ''}`}>
            {showSuggestions && (
              <div className="mb-3 rounded-xl border border-amber-200/30 bg-black/40 p-3 backdrop-blur-sm">
                <div className="mb-2 text-xs font-semibold text-white/70">Suggested prompts:</div>
                <div className="space-y-2">
                  {defaultSuggestions.map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setMessage(suggestion);
                        setShowSuggestions(false);
                      }}
                      className="w-full rounded-lg border border-amber-200/20 bg-black/30 px-3 py-2 text-left text-sm text-white transition-all hover:border-amber-200/50 hover:bg-black/40"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {uploadedFiles.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {uploadedFiles.map((fileName, index) => (
                  <div key={fileName} className="flex items-center gap-2 rounded-lg border border-amber-200/30 bg-black/30 px-3 py-1.5">
                    <span className="max-w-[150px] truncate text-xs text-white">{fileName}</span>
                    <button
                      onClick={() => onRemoveFile?.(index)}
                      className="text-white/60 transition-colors hover:text-white"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-center gap-3 rounded-2xl border border-amber-200/50 bg-black/20 px-4 py-3 shadow-lg transition-all hover:border-amber-200/70 focus-within:border-amber-200/80 focus-within:shadow-amber-200/20">
              <button
                onClick={onOpenFilePicker}
                className="shrink-0 text-white/70 transition-colors hover:text-white"
                title="Attach files from Finder"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              </button>
              <input
                type="text"
                value={message}
                onChange={(event) => handleMessageChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                placeholder={chatLocked ? 'This scenario is moving forward' : 'Type your message or type ? for help'}
                disabled={chatLocked}
                className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/50"
              />
              <button
                onClick={handleSend}
                disabled={chatLocked || (!message.trim() && uploadedFiles.length === 0)}
                className="shrink-0 rounded-xl bg-purple-500 p-2 shadow-lg transition-all hover:scale-105 hover:bg-purple-600 disabled:cursor-not-allowed disabled:bg-gray-600"
              >
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            </div>
            <p className="mt-2 text-center text-xs text-white/60">
              {chatLocked ? 'The scenario has moved into transition.' : 'Press Enter to send • Type ? for help'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
