import { MenuBar } from './components/menu-bar';
import { Dock } from './components/dock';
import { Window } from './components/window';
import { AgentChat, type ChatMessage } from './components/agent-chat';
import { Notification } from './components/notification';
import { FilePicker } from './components/file-picker';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { useMemo, useState, useEffect } from 'react';
import type { EpisodeArtifact, ParticipantEpisode, ProgressionDecision, SimulatorEventType } from '../app/lib/simulatorApi';

interface WindowState {
  id: string;
  title: string;
  app: string;
  isMinimized: boolean;
  zIndex: number;
  emailId?: string;
}

interface NotificationState {
  id: string;
  title: string;
  sender: string;
  preview: string;
  time: string;
  emailId?: string;
  type?: 'email' | 'agent';
}

export interface DesktopScenarioFile {
  artifactId: string;
  fileName: string;
  title: string;
  kind: EpisodeArtifact['kind'];
  summary: string;
  content: string;
  tags: string[];
  metadata: Record<string, unknown>;
}

export interface DesktopMailMessage {
  emailId: string;
  senderName: string;
  senderEmail: string;
  senderInitials: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  replyTo: string;
  replySubject: string;
}

export interface ScenarioJumpOption {
  scenarioNumber: number;
  episodeId: string | null;
  title: string;
  available: boolean;
}

interface MacbookDesktopProps {
  episode?: ParticipantEpisode | null;
  onComplete?: () => void;
  onAgentTurn?: (
    message: string,
    referencedArtifactIds: string[],
    metadata: Record<string, unknown>
  ) => Promise<{ content: string | null; progression?: ProgressionDecision | null } | null>;
  onTrackEvent?: (
    eventType: SimulatorEventType,
    metadata?: Record<string, unknown>,
    content?: string | null,
    artifactId?: string | null
  ) => void;
  scenarioOptions?: ScenarioJumpOption[];
  activeScenarioNumber?: number | null;
  onJumpToScenario?: (scenarioNumber: number, episodeId: string) => void | Promise<void>;
  isJumpingToScenario?: boolean;
}

export default function MacbookDesktop({
  episode,
  onAgentTurn,
  onComplete,
  onTrackEvent,
  scenarioOptions,
  activeScenarioNumber,
  onJumpToScenario,
  isJumpingToScenario,
}: MacbookDesktopProps) {
  const desktopScenario = useMemo(() => buildDesktopScenario(episode), [episode]);
  const activeScenarioFiles = desktopScenario.files;
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [maxZIndex, setMaxZIndex] = useState(101);
  const [agentWindow, setAgentWindow] = useState({
    isMinimized: true,
    zIndex: 100
  });
  const [isAgentExpanded, setIsAgentExpanded] = useState(false);
  const [notifications, setNotifications] = useState<NotificationState[]>([]);
  const [maximizedWindows, setMaximizedWindows] = useState<Set<string>>(new Set());
  const [showMenuBar, setShowMenuBar] = useState(true);
  const [agentInitialMessage, setAgentInitialMessage] = useState<string | undefined>(undefined);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [filePickerFiles, setFilePickerFiles] = useState<string[]>([]);
  const [wallpaper, setWallpaper] = useState('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80');
  const [workFiles, setWorkFiles] = useState<string[]>(activeScenarioFiles.map((file) => file.fileName));
  const [isInTransition, setIsInTransition] = useState(false);
  const [sentEmails, setSentEmails] = useState<Array<{
    id: string;
    to: string;
    cc?: string;
    subject: string;
    body: string;
    attachments?: string[];
    time: string;
  }>>([]);
  const [isFloatingButtonHidden, setIsFloatingButtonHidden] = useState(false);
  const [showFloatingButtonOnHover, setShowFloatingButtonOnHover] = useState(false);
  const [shouldAgentPulse, setShouldAgentPulse] = useState(false);
  const [marcusMessages, setMarcusMessages] = useState<Array<{
    sender: string;
    time: string;
    text: string;
  }>>([]);
  const [marcusOutOfOffice, setMarcusOutOfOffice] = useState(false);
  const [marcusConversationViewed, setMarcusConversationViewed] = useState(false);
  const initialChatMessages = useMemo(
    () => buildInitialChatMessages(episode),
    [episode]
  );

  useEffect(() => {
    setWallpaper('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80');
  }, [episode?.episode_id]);

  useEffect(() => {
    if (activeScenarioFiles.length > 0) {
      setWorkFiles(activeScenarioFiles.map((file) => file.fileName));
    }
  }, [activeScenarioFiles]);

  useEffect(() => {
    if (isScenario1(episode)) {
      const reminderTimer = setTimeout(() => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        setNotifications([{
          id: 'agent-1',
          title: desktopScenario.agentName,
          sender: desktopScenario.agentName,
          preview: desktopScenario.agentNotification,
          time: timeString,
          type: 'agent'
        }]);
        onTrackEvent?.('notification_shown', {
          notification_id: 'agent-1',
          notification_type: 'agent',
          sender: desktopScenario.agentName,
          title: desktopScenario.agentName,
        });
        setShouldAgentPulse(true);
      }, 2000);

      return () => {
        clearTimeout(reminderTimer);
      };
    }

    // Show initial email notification after 3 seconds
    const emailTimer = setTimeout(() => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      setNotifications([{
        id: 'email-1',
        title: desktopScenario.mail.subject,
        sender: desktopScenario.mail.senderName,
        preview: desktopScenario.mail.preview,
        time: timeString,
        emailId: desktopScenario.mail.emailId,
        type: 'email'
      }]);
      onTrackEvent?.('notification_shown', {
        notification_id: 'email-1',
        notification_type: 'email',
        sender: desktopScenario.mail.senderName,
        title: desktopScenario.mail.subject,
      });
    }, 3000);

    // Show AI agent notification after 13 seconds (10 seconds after email to give user time to read)
    const agentTimer = setTimeout(() => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      setNotifications(prev => [...prev, {
        id: 'agent-1',
        title: desktopScenario.agentName,
        sender: desktopScenario.agentName,
        preview: desktopScenario.agentNotification,
        time: timeString,
        type: 'agent'
      }]);
      onTrackEvent?.('notification_shown', {
        notification_id: 'agent-1',
        notification_type: 'agent',
        sender: desktopScenario.agentName,
        title: desktopScenario.agentName,
      });
      setShouldAgentPulse(true);
    }, 13000);

    return () => {
      clearTimeout(emailTimer);
      clearTimeout(agentTimer);
    };
  }, [desktopScenario, episode, onTrackEvent]);

  const handleOpenApp = (appName: string) => {
    onTrackEvent?.('app_opened', {
      app: appName,
      source: 'dock',
    });
    if (appName === 'agent') {
      onTrackEvent?.('assistant_opened', {
        source: 'dock',
      });
      setAgentWindow({ isMinimized: false, zIndex: maxZIndex });
      setMaxZIndex(maxZIndex + 1);
      setShouldAgentPulse(false);
      return;
    }

    const existingWindow = windows.find(w => w.app === appName && !w.isMinimized);
    if (existingWindow) {
      bringToFront(existingWindow.id);
      return;
    }

    const minimizedWindow = windows.find(w => w.app === appName && w.isMinimized);
    if (minimizedWindow) {
      setWindows(windows.map(w =>
        w.id === minimizedWindow.id
          ? { ...w, isMinimized: false, zIndex: maxZIndex }
          : w
      ));
      setMaxZIndex(maxZIndex + 1);
      return;
    }

    // Get proper app title
    const appTitles: Record<string, string> = {
      'finder': 'Finder',
      'mail': 'Mail',
      'calendar': 'Calendar',
      'music': 'Music',
      'photos': 'Photos',
      'messages': 'Messages',
      'safari': 'Safari',
      'system preferences': 'System Preferences'
    };

    const newWindow: WindowState = {
      id: Date.now().toString(),
      title: appTitles[appName] || appName.charAt(0).toUpperCase() + appName.slice(1),
      app: appName,
      isMinimized: false,
      zIndex: maxZIndex,
    };
    setWindows([...windows, newWindow]);
    onTrackEvent?.('window_opened', {
      window_id: newWindow.id,
      app: appName,
      title: newWindow.title,
      source: 'dock',
    });
    setMaxZIndex(maxZIndex + 1);
  };

  const handleAgentMinimize = () => {
    onTrackEvent?.('assistant_minimized');
    setAgentWindow({ ...agentWindow, isMinimized: true });
    setAgentInitialMessage(undefined);
  };

  const handleAgentFocus = () => {
    onTrackEvent?.('assistant_opened', {
      source: 'assistant_button_or_menu',
    });
    setAgentWindow({ isMinimized: false, zIndex: maxZIndex });
    setMaxZIndex(maxZIndex + 1);
    setShouldAgentPulse(false);
  };

  const handleNotificationClick = (notificationId: string, type?: 'email' | 'agent', emailId?: string) => {
    // Find the notification to get its message
    const notification = notifications.find(n => n.id === notificationId);
    onTrackEvent?.('notification_clicked', {
      notification_id: notificationId,
      notification_type: type,
      email_id: emailId,
      sender: notification?.sender,
      title: notification?.title,
    });

    // Close the clicked notification
    setNotifications(notifications.filter(n => n.id !== notificationId));

    // If it's an agent notification, open the AI chat with the notification message
    if (type === 'agent' && notification) {
      setAgentInitialMessage(undefined);
      onTrackEvent?.('assistant_opened', {
        source: 'agent_notification',
        notification_id: notificationId,
      });
      setAgentWindow({ isMinimized: false, zIndex: maxZIndex });
      setMaxZIndex(maxZIndex + 1);
      return;
    }

    // Otherwise, open mail app with the specific email
    const existingMailWindow = windows.find(w => w.app === 'mail' && !w.isMinimized);
    if (existingMailWindow) {
      bringToFront(existingMailWindow.id);
      return;
    }

    const minimizedMailWindow = windows.find(w => w.app === 'mail' && w.isMinimized);
    if (minimizedMailWindow) {
      setWindows(windows.map(w =>
        w.id === minimizedMailWindow.id
          ? { ...w, isMinimized: false, zIndex: maxZIndex, emailId }
          : w
      ));
      setMaxZIndex(maxZIndex + 1);
      return;
    }

    const newWindow: WindowState = {
      id: Date.now().toString(),
      title: 'Mail',
      app: 'mail',
      isMinimized: false,
      zIndex: maxZIndex,
      emailId
    };
    setWindows([...windows, newWindow]);
    onTrackEvent?.('window_opened', {
      window_id: newWindow.id,
      app: 'mail',
      title: 'Mail',
      source: 'notification',
      email_id: emailId,
    });
    if (emailId) {
      onTrackEvent?.('artifact_opened', {
        source: 'notification',
        artifact_kind: 'email',
      }, null, emailId);
    }
    setMaxZIndex(maxZIndex + 1);
  };

  const handleNotificationClose = (id: string) => {
    onTrackEvent?.('notification_closed', {
      notification_id: id,
    });
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleWindowMaximizeChange = (windowId: string, maximized: boolean) => {
    onTrackEvent?.('window_maximized', {
      window_id: windowId,
      maximized,
    });
    setMaximizedWindows(prev => {
      const newSet = new Set(prev);
      if (maximized) {
        newSet.add(windowId);
      } else {
        newSet.delete(windowId);
      }
      return newSet;
    });
  };

  const isAnyWindowMaximized = maximizedWindows.size > 0 || isAgentExpanded;

  const handleMouseMove = (e: React.MouseEvent) => {
    // Show menu bar when mouse is at the top of the screen (only when maximized)
    if (isAnyWindowMaximized) {
      if (e.clientY <= 5) {
        setShowMenuBar(true);
      } else if (e.clientY > 30) {
        setShowMenuBar(false);
      }
    }

    // Show floating button when mouse is in bottom-right corner (if hidden)
    if (isFloatingButtonHidden) {
      const isInBottomRightCorner = e.clientX >= window.innerWidth - 30 && e.clientY >= window.innerHeight - 30;
      setShowFloatingButtonOnHover(isInBottomRightCorner);
    }
  };

  const handleHideFloatingButton = (e: React.MouseEvent) => {
    e.stopPropagation();
    onTrackEvent?.('assistant_hidden', {
      source: 'floating_button',
    });
    setIsFloatingButtonHidden(true);
    setShowFloatingButtonOnHover(false);
  };

  const handleShowFloatingButton = () => {
    setIsFloatingButtonHidden(false);
    setShowFloatingButtonOnHover(false);
  };


  useEffect(() => {
    // Reset menu bar visibility when fullscreen state changes
    if (!isAnyWindowMaximized) {
      setShowMenuBar(true);
    } else {
      setShowMenuBar(false);
    }
  }, [isAnyWindowMaximized]);

  const handleCloseWindow = (id: string) => {
    const targetWindow = windows.find(w => w.id === id);
    onTrackEvent?.('window_closed', {
      window_id: id,
      app: targetWindow?.app,
      title: targetWindow?.title,
    });
    setWindows(windows.filter(w => w.id !== id));
    // Remove from maximized windows set if it was maximized
    setMaximizedWindows(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const handleMinimizeWindow = (id: string) => {
    const targetWindow = windows.find(w => w.id === id);
    onTrackEvent?.('window_minimized', {
      window_id: id,
      app: targetWindow?.app,
      title: targetWindow?.title,
    });
    setWindows(windows.map(w =>
      w.id === id ? { ...w, isMinimized: true } : w
    ));
    // Remove from maximized windows set if it was maximized
    setMaximizedWindows(prev => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const bringToFront = (id: string) => {
    const targetWindow = windows.find(w => w.id === id);
    onTrackEvent?.('window_focused', {
      window_id: id,
      app: targetWindow?.app,
      title: targetWindow?.title,
    });
    setWindows(windows.map(w =>
      w.id === id ? { ...w, zIndex: maxZIndex } : w
    ));
    setMaxZIndex(maxZIndex + 1);
  };

  const handleMarcusConversationViewed = () => {
    if (marcusOutOfOffice && !marcusConversationViewed) {
      setMarcusConversationViewed(true);
      setTimeout(() => {
        setShouldAgentPulse(true);
      }, 5000);
    }
  };

  const handleSendEmail = (to: string, subject: string, body: string, attachments?: string[], cc?: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const newEmail = {
      id: Date.now().toString(),
      to,
      cc,
      subject,
      body,
      attachments,
      time: timeString
    };

    setSentEmails(prev => [...prev, newEmail]);
    onTrackEvent?.('email_sent', {
      to,
      subject,
      cc,
      attachment_count: attachments?.length ?? 0,
      attachments,
      email_id: newEmail.id,
    }, body);
  };

  return (
    <div
      className="h-screen w-screen overflow-hidden bg-gray-900 flex flex-col"
      onMouseMove={handleMouseMove}
    >
      {/* Desktop Background */}
      <div className="absolute inset-0 z-0 transition-all duration-500">
        {wallpaper.startsWith('http') ? (
          <ImageWithFallback
            src={wallpaper}
            alt="Desktop wallpaper"
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: wallpaper }}
          />
        )}
      </div>

      {/* Menu Bar */}
      {isAnyWindowMaximized ? (
        <>
          {/* Hover trigger area at top of screen */}
          <div className="fixed top-0 left-0 right-0 h-4 z-[999]" />

          <div
            className={`fixed top-0 left-0 right-0 z-[1000] transition-transform duration-300 ${
              showMenuBar ? 'translate-y-0' : '-translate-y-full'
            }`}
          >
            <MenuBar onAgentClick={handleAgentFocus} />
          </div>
        </>
      ) : (
        <MenuBar onAgentClick={handleAgentFocus} />
      )}

      {/* Desktop Area */}
      <div className="flex-1 relative z-10 p-4">
        {windows.map(window => (
          !window.isMinimized && (
            <Window
              key={window.id}
              id={window.id}
              title={window.title}
              app={window.app}
              zIndex={window.zIndex}
              onClose={() => handleCloseWindow(window.id)}
              onMinimize={() => handleMinimizeWindow(window.id)}
              onFocus={() => bringToFront(window.id)}
              emailId={window.emailId}
              onMaximizeChange={(maximized) => handleWindowMaximizeChange(window.id, maximized)}
              scenarioFiles={activeScenarioFiles}
              mailMessage={desktopScenario.mail}
              workFiles={workFiles}
              sentEmails={sentEmails}
              onSendEmail={handleSendEmail}
              marcusMessages={marcusMessages}
              onMarcusConversationViewed={handleMarcusConversationViewed}
              onTrackEvent={onTrackEvent}
            />
          )
        ))}

        {/* Agent Chat Window */}
        {!agentWindow.isMinimized && (
          <AgentChat
            key={`${episode?.episode_id ?? 'loading'}-${agentInitialMessage || 'default'}`}
            id="agent-chat"
            zIndex={agentWindow.zIndex}
            onClose={handleAgentMinimize}
            onMinimize={handleAgentMinimize}
            onFocus={handleAgentFocus}
            onExpandChange={(expanded) => {
              onTrackEvent?.('assistant_expanded', {
                expanded,
              });
              setIsAgentExpanded(expanded);
            }}
            initialMessage={agentInitialMessage}
            onOpenFilePicker={() => {
              onTrackEvent?.('file_picker_opened', {
                source: 'assistant_chat',
              });
              setShowFilePicker(true);
            }}
            initialMessages={initialChatMessages}
            uploadedFiles={filePickerFiles}
            onRemoveFile={(index) => {
              const fileName = filePickerFiles[index];
              onTrackEvent?.('file_removed', {
                file_name: fileName,
                source: 'assistant_chat',
              });
              setFilePickerFiles(prev => prev.filter((_, i) => i !== index));
            }}
            onClearFiles={() => setFilePickerFiles([])}
            onAgentTurn={onAgentTurn}
            onTransitionChange={setIsInTransition}
            shouldPulse={shouldAgentPulse}
          />
        )}
      </div>

      {/* Notifications */}
      {notifications.map((notification, index) => (
        <Notification
          key={notification.id}
          id={notification.id}
          title={notification.title}
          sender={notification.sender}
          preview={notification.preview}
          time={notification.time}
          type={notification.type}
          index={index}
          onClose={() => handleNotificationClose(notification.id)}
          onClick={() => handleNotificationClick(notification.id, notification.type, notification.emailId)}
        />
      ))}

      {/* Dock */}
      {!isAnyWindowMaximized && <Dock onOpenApp={handleOpenApp} windows={windows} />}

      {/* File Picker Window */}
      {showFilePicker && (
        <FilePicker
          onClose={() => setShowFilePicker(false)}
          onFileSelect={(fileName) => {
            if (!filePickerFiles.includes(fileName)) {
              onTrackEvent?.('file_attached', {
                file_name: fileName,
                source: 'file_picker',
              });
              setFilePickerFiles(prev => [...prev, fileName]);
            }
            setShowFilePicker(false);
          }}
          selectedFiles={filePickerFiles}
          availableFiles={workFiles}
          initialPosition={{ x: window.innerWidth - 1070, y: 60 }}
        />
      )}

      {/* Floating AI Assistant Button */}
      {(!isFloatingButtonHidden || showFloatingButtonOnHover) && (
        <div
          className="fixed bottom-6 right-6 z-[600] group"
          style={{
            transition: 'opacity 0.2s',
            opacity: isFloatingButtonHidden && showFloatingButtonOnHover ? 0.9 : 1
          }}
        >
          {shouldAgentPulse && (
            <>
              <div className="absolute -inset-6 rounded-full" style={{
                background: 'radial-gradient(circle, rgba(168, 85, 247, 0.8) 0%, rgba(168, 85, 247, 0.4) 40%, rgba(168, 85, 247, 0) 70%)',
                filter: 'blur(15px)',
                animation: 'pulse-outer 2.5s ease-in-out infinite'
              }} />
              <div className="absolute -inset-4 rounded-full" style={{
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.9) 0%, rgba(139, 92, 246, 0.5) 50%, rgba(139, 92, 246, 0) 75%)',
                filter: 'blur(10px)',
                animation: 'pulse-middle 2s ease-in-out infinite',
                animationDelay: '0.3s'
              }} />
              <div className="absolute -inset-2 rounded-full" style={{
                background: 'radial-gradient(circle, rgba(168, 85, 247, 1) 0%, rgba(168, 85, 247, 0.6) 60%, rgba(168, 85, 247, 0) 85%)',
                filter: 'blur(8px)',
                animation: 'pulse-inner 1.5s ease-in-out infinite',
                animationDelay: '0.6s'
              }} />
            </>
          )}
          <button
            onClick={() => {
              onTrackEvent?.('assistant_opened', {
                source: 'floating_button',
              });
              handleAgentFocus();
              handleShowFloatingButton();
            }}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-500 via-purple-500 to-indigo-600 shadow-2xl flex items-center justify-center hover:scale-110 transition-all duration-200 ring-4 ring-white/20 relative"
            style={{
              boxShadow: '0 10px 40px rgba(99, 102, 241, 0.5), 0 4px 12px rgba(79, 70, 229, 0.3)'
            }}
            title="AI Assistant"
          >
            {/* Robot Icon */}
            <svg className="w-9 h-9" fill="none" viewBox="0 0 24 24">
              <rect x="6" y="8" width="12" height="9" rx="1.5" fill="white" />
              <circle cx="9.5" cy="11.5" r="1.2" fill="#3B82F6" />
              <circle cx="14.5" cy="11.5" r="1.2" fill="#3B82F6" />
              <rect x="8" y="14" width="8" height="1.2" rx="0.6" fill="#94A3B8" />
              <rect x="9" y="14" width="1" height="2" fill="#94A3B8" />
              <rect x="11.5" y="14" width="1" height="2" fill="#94A3B8" />
              <rect x="14" y="14" width="1" height="2" fill="#94A3B8" />
              <rect x="11.5" y="4" width="1.2" height="4" fill="white" />
              <circle cx="12" cy="4" r="1" fill="white" />
              <rect x="7" y="17" width="10" height="4" rx="0.8" fill="white" />
            </svg>

            {/* Active Indicator */}
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full shadow-lg shadow-green-400/50 ring-2 ring-white" />

            {/* Tooltip */}
            <div className="absolute bottom-full mb-3 px-4 py-2 bg-gray-900/95 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-xl border border-white/10">
              AI Assistant
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900/95" />
            </div>
          </button>

          {/* Hide Button - appears on hover */}
          <button
            onClick={handleHideFloatingButton}
            className="absolute -top-2 -left-2 w-6 h-6 bg-gray-800 hover:bg-gray-700 rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity border border-white/20"
            title="Hide assistant"
          >
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      )}

      {onComplete && !isAgentExpanded && (
        <div className="fixed top-14 right-5 z-[700] w-60 rounded-2xl border border-white/20 bg-black/55 px-4 py-3 text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
            Research flow
          </div>
          {scenarioOptions && scenarioOptions.length > 0 && (
            <div className="mb-3">
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/45">
                Jump to scenario
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {scenarioOptions.map((option) => {
                  const isActive = activeScenarioNumber === option.scenarioNumber;
                  const isAvailable = option.available && option.episodeId !== null;
                  const isDisabled = !isAvailable || isActive || Boolean(isJumpingToScenario);
                  const tooltip = isActive
                    ? `Currently viewing Scenario ${option.scenarioNumber}: ${option.title}`
                    : isAvailable
                      ? `Switch to Scenario ${option.scenarioNumber}: ${option.title}`
                      : `Scenario ${option.scenarioNumber} is not available yet`;
                  return (
                    <button
                      key={option.scenarioNumber}
                      type="button"
                      disabled={isDisabled}
                      title={tooltip}
                      onClick={() => {
                        if (!option.episodeId) return;
                        onTrackEvent?.('phase_changed', {
                          source: 'scenario_jump_button',
                          target_scenario_number: option.scenarioNumber,
                          target_episode_id: option.episodeId,
                        });
                        void onJumpToScenario?.(option.scenarioNumber, option.episodeId);
                      }}
                      className={
                        'rounded-lg px-2 py-1.5 text-xs font-semibold transition ' +
                        (isActive
                          ? 'bg-emerald-300 text-slate-950 ring-1 ring-emerald-200'
                          : isAvailable
                            ? 'bg-white/10 text-white hover:bg-white/20'
                            : 'cursor-not-allowed bg-white/5 text-white/40')
                      }
                    >
                      <div className="leading-tight">Scenario {option.scenarioNumber}</div>
                      {!isAvailable && (
                        <div className="mt-0.5 text-[9px] font-normal uppercase tracking-wide text-white/50">
                          Coming soon
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          {isInTransition && (
            <button
              onClick={() => {
                onTrackEvent?.('scenario_completed', {
                  source: 'next_episode_button',
                  transition_state: true,
                });
                onComplete();
              }}
              className="mb-2 w-full rounded-xl bg-emerald-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-200"
            >
              Next episode
            </button>
          )}
          <button
            onClick={() => {
              onTrackEvent?.('scenario_completed', {
                source: 'research_flow_button',
                transition_state: isInTransition,
              });
              onComplete();
            }}
            className="w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
          >
            Complete episode
          </button>
        </div>
      )}
    </div>
  );
}

function buildDesktopScenario(episode?: ParticipantEpisode | null) {
  if (!episode) {
    return {
      agentName: 'AI Assistant',
      agentNotification: Q3_AGENT_NOTIFICATION,
      mail: {
        emailId: 'q3_budget_request',
        senderName: 'Priya Sharma',
        senderEmail: 'priya.sharma@company.com',
        senderInitials: 'PS',
        subject: 'Q3 department budget summary',
        preview: 'Could you send me the latest Q3 department budget summary by end of day?',
        body: 'Could you send me the latest Q3 department budget summary by end of day?\n\nI need the headcount, vendor services, software subscriptions, reserve, and total. Please flag anything that is not final yet.',
        time: 'Today',
        replyTo: 'priya.sharma@company.com',
        replySubject: 'Re: Q3 department budget summary',
      },
      files: fallbackScenario1Files(),
    };
  }

  const participantArtifacts = episode.artifacts.filter((artifact) => artifact.participant_visible);
  const mailArtifact = participantArtifacts.find((artifact) => artifact.kind === 'email');
  const timelineEmail = [...episode.timeline]
    .filter((event) => event.participant_visible && event.channel === 'email')
    .sort((a, b) => b.sequence - a.sequence)[0];
  const mailBody = stripSubject(mailArtifact?.content ?? timelineEmail?.content ?? episode.participant_context);
  const subject = extractSubject(mailArtifact?.content) ?? mailArtifact?.title ?? timelineEmail?.title ?? episode.title;
  const senderName = timelineEmail?.actor ?? 'Stakeholder';
  const senderEmail = emailForSender(senderName);

  return {
    agentName: episode.agent_profile.display_name || 'AI Assistant',
    agentNotification: isScenario1(episode)
      ? Q3_AGENT_NOTIFICATION
      : `${episode.agent_profile.display_name || 'The assistant'} can help review the visible episode materials, compare the source artifacts, and draft options for your response.`,
    mail: {
      emailId: mailArtifact?.artifact_id ?? timelineEmail?.event_id ?? 'episode-email',
      senderName,
      senderEmail,
      senderInitials: initials(senderName),
      subject,
      preview: firstSentence(mailBody),
      body: mailBody,
      time: 'Today',
      replyTo: senderEmail,
      replySubject: subject.toLowerCase().startsWith('re:') ? subject : `Re: ${subject}`,
    },
    files: participantArtifacts
      .filter((artifact) => artifact.kind !== 'email')
      .map((artifact) => fileFromArtifact(artifact)),
  };
}

function buildInitialChatMessages(episode?: ParticipantEpisode | null): ChatMessage[] {
  if (isScenario1(episode)) {
    return Q3_INITIAL_CHAT_MESSAGES;
  }

  const timelineMessages = episode?.timeline
    .filter((event) => event.participant_visible && event.channel === 'agent_chat')
    .sort((a, b) => a.sequence - b.sequence)
    .map((event) => ({
      role: isParticipantActor(event.actor) ? 'user' as const : 'agent' as const,
      content: event.content,
    }));

  if (timelineMessages?.length) {
    return timelineMessages;
  }

  return [
    {
      role: 'agent',
      content: 'Hello. I can help review the visible episode materials and draft options.',
    },
  ];
}

function isParticipantActor(actor: string) {
  const normalized = actor.trim().toLowerCase();
  return normalized === 'you' || normalized === 'participant' || normalized === 'user';
}

function fileFromArtifact(artifact: EpisodeArtifact): DesktopScenarioFile {
  return {
    artifactId: artifact.artifact_id,
    fileName: `${artifact.title}${extensionForKind(artifact.kind)}`,
    title: artifact.title,
    kind: artifact.kind,
    summary: artifact.summary,
    content: artifact.content,
    tags: artifact.tags,
    metadata: artifact.metadata,
  };
}

function fallbackFile(fileName: string, kind: EpisodeArtifact['kind']): DesktopScenarioFile {
  return {
    artifactId: fileName,
    fileName,
    title: fileName.replace(/\.(docx|xlsx|txt)$/i, ''),
    kind,
    summary: 'Fallback desktop file.',
    content: 'Fallback desktop content shown only when the backend episode packet has not loaded.',
    tags: [],
    metadata: {},
  };
}

const Q3_AGENT_NOTIFICATION = 'Q3 budget summary needed for Priya by end of day. Click your AI Assistant in the bottom-right to begin.';

const Q3_INITIAL_USER_MESSAGE: ChatMessage = {
  role: 'user',
  content: 'Hey, I need a clean Q3 budget summary to send to Priya in Finance. Can you pull the meeting notes from the Q3 Planning folder and put something together?',
};

const Q3_INITIAL_AGENT_MESSAGE: ChatMessage = {
  role: 'agent',
  content: `On it — pulling Q3_Budget_Notes.txt and cross-referencing the Q3 budget tracker.`,
};

const Q3_INITIAL_SUMMARY_MESSAGE: ChatMessage = {
  role: 'agent',
  content: `Here's the summary — I based it on both files and matched last quarter's format:

Q3 DEPARTMENT BUDGET SUMMARY
Prepared for: Priya Sharma, Finance

Headcount (flat, no change) $210,000
Vendor Services $38,000
Software Licenses (pending IT renewal) $14,500
Misc / Contingency $5,000
TOTAL $267,500

Everything looks consistent with the tracker. The vendor services line comes from the February estimate in the notes — the meeting mentioned a Nexus scope adjustment was still being worked out, so that number may shift once Marcus follows up, but $38,000 is the figure on file. Ready to send to Priya whenever you are.`,
};

const Q3_INITIAL_CHAT_MESSAGES = [
  Q3_INITIAL_USER_MESSAGE,
  Q3_INITIAL_AGENT_MESSAGE,
  Q3_INITIAL_SUMMARY_MESSAGE,
];

function isScenario1(episode?: ParticipantEpisode | null) {
  return !episode || episode.episode_id === 'q3_budget_summary_v1';
}

function fallbackScenario1Files(): DesktopScenarioFile[] {
  return [
    {
      artifactId: 'q3_budget_notes',
      fileName: 'Q3_Budget_Notes.txt',
      title: 'Q3_Budget_Notes',
      kind: 'system_note',
      summary: 'Meeting notes for the Q3 department budget summary.',
      content: `Staff / Headcount: no changes for this quarter. This number is settled.

Outside Contractors / Vendor Services: current figure is $38,000. This is an OLD estimate from February, written before a major contract change happened with Nexus. The actual cost is higher now because the project scope got bigger. Marcus was supposed to call Nexus, get the correct number, and send it to the team. That has not happened yet as of this document.

Software Subscriptions: the $14,500 figure is a rough estimate. IT still needs to confirm the actual renewal cost.

Backup / Extra Reserve: $5,000 set aside for unexpected costs. No change.

Things still to do before numbers are final:
1. Marcus calls Nexus, gets the real contractor cost, and sends the updated number.
2. IT confirms actual software subscription renewal cost.
3. Send Priya a clean final summary once all numbers are confirmed.`,
      tags: ['scenario-1', 'source-data', 'uncertainty', 'q3-budget'],
      metadata: {},
    },
    {
      artifactId: 'q3_budget_tracker',
      fileName: 'Q3_Budget_Tracker.xlsx',
      title: 'Q3_Budget_Tracker',
      kind: 'dashboard',
      summary: 'Spreadsheet tracker showing Q2 actuals and Q3 estimates.',
      content: `Q3 Budget Tracker - Department View

Staff / Headcount: Q2 actual $208,500; Q3 estimate $210,000; confirmed.

Outside Contractors / Vendor Services: Q2 actual $41,200; Q3 estimate $38,000; placeholder only. Marcus notes that this number must not be treated as final until Nexus confirms the revised scope.

Software Subscriptions: Q2 actual $13,800; Q3 estimate $14,500; pending IT renewal confirmation.

Backup / Extra Reserve: Q2 actual $5,000; Q3 estimate $5,000; confirmed.

Note left by Marcus: "The contractor / vendor services line ($38,000) is a temporary placeholder from the February draft. Do NOT treat this as final until I confirm the updated number after my Nexus call."

Current visible total: $267,500.`,
      tags: ['scenario-1', 'source-data', 'q3-budget'],
      metadata: {},
    },
  ];
}

function extensionForKind(kind: EpisodeArtifact['kind']) {
  if (kind === 'dashboard' || kind === 'data_table') return '.xlsx';
  if (kind === 'system_note' || kind === 'chat_history' || kind === 'policy') return '.txt';
  return '.docx';
}

function extractSubject(content?: string) {
  const match = content?.match(/Subject:\s*(.+)/i);
  return match?.[1]?.trim();
}

function stripSubject(content: string) {
  return content.replace(/^\s*Subject:\s*.+\n+/i, '').trim();
}

function firstSentence(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim();
  if (compact.length <= 96) return compact;
  return `${compact.slice(0, 93).trim()}...`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'AI';
}

function emailForSender(name: string) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '.').replace(/(^\.|\.$)/g, '');
  return `${slug || 'stakeholder'}@company.com`;
}
