import { MenuBar } from './components/menu-bar';
import { Dock } from './components/dock';
import { Window } from './components/window';
import { AgentChat } from './components/agent-chat';
import { Notification } from './components/notification';
import { FilePicker } from './components/file-picker';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { useState, useEffect } from 'react';
import type { SimulatorEventType } from '../app/lib/simulatorApi';

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

interface MacbookDesktopProps {
  onComplete?: () => void;
  onAgentTurn?: (
    message: string,
    referencedArtifactIds: string[],
    metadata: Record<string, unknown>
  ) => Promise<string | null>;
  onTrackEvent?: (
    eventType: SimulatorEventType,
    metadata?: Record<string, unknown>,
    content?: string | null,
    artifactId?: string | null
  ) => void;
}

export default function MacbookDesktop({ onAgentTurn, onComplete, onTrackEvent }: MacbookDesktopProps) {
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
  const [workFiles, setWorkFiles] = useState<string[]>([
    'Q2 Budget Proposal.docx',
    'Budget Estimation Draft.xlsx'
  ]);
  const [sentEmails, setSentEmails] = useState<Array<{
    id: string;
    to: string;
    subject: string;
    body: string;
    attachments?: string[];
    time: string;
  }>>([]);
  const [isFloatingButtonHidden, setIsFloatingButtonHidden] = useState(false);
  const [showFloatingButtonOnHover, setShowFloatingButtonOnHover] = useState(false);

  useEffect(() => {
    // Show initial email notification after 3 seconds
    const emailTimer = setTimeout(() => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      setNotifications([{
        id: 'email-1',
        title: 'Budget Estimation Reminder',
        sender: 'Sarah Chen',
        preview: 'Hi, I wanted to follow up on the budget estimation for Q2 that we discussed in last week\'s meeting...',
        time: timeString,
        emailId: 'sarah-budget',
        type: 'email'
      }]);
      onTrackEvent?.('notification_shown', {
        notification_id: 'email-1',
        notification_type: 'email',
        sender: 'Sarah Chen',
        title: 'Budget Estimation Reminder',
      });
    }, 3000);

    // Show AI agent notification after 13 seconds (10 seconds after email to give user time to read)
    const agentTimer = setTimeout(() => {
      const now = new Date();
      const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

      setNotifications(prev => [...prev, {
        id: 'agent-1',
        title: 'AI Assistant',
        sender: 'Assistant',
        preview: 'I noticed an email from Sarah Chen about the Q2 budget estimation that needs to be finalized by Sunday. Would you like me to help you review and complete the documents?',
        time: timeString,
        type: 'agent'
      }]);
      onTrackEvent?.('notification_shown', {
        notification_id: 'agent-1',
        notification_type: 'agent',
        sender: 'Assistant',
        title: 'AI Assistant',
      });
    }, 13000);

    return () => {
      clearTimeout(emailTimer);
      clearTimeout(agentTimer);
    };
  }, [onTrackEvent]);

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
      setAgentInitialMessage(notification.preview);
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

  const handleAddFile = (fileName: string) => {
    if (!workFiles.includes(fileName)) {
      onTrackEvent?.('file_created', {
        file_name: fileName,
        source: 'assistant',
      });
      setWorkFiles(prev => [...prev, fileName]);
    }
  };

  const handleSendEmail = (to: string, subject: string, body: string, attachments?: string[]) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    const newEmail = {
      id: Date.now().toString(),
      to,
      subject,
      body,
      attachments,
      time: timeString
    };

    setSentEmails(prev => [...prev, newEmail]);
    onTrackEvent?.('email_sent', {
      to,
      subject,
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
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80"
          alt="Desktop wallpaper"
          className="w-full h-full object-cover"
        />
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
              workFiles={workFiles}
              sentEmails={sentEmails}
              onSendEmail={handleSendEmail}
              onTrackEvent={onTrackEvent}
            />
          )
        ))}

        {/* Agent Chat Window */}
        {!agentWindow.isMinimized && (
          <AgentChat
            key={agentInitialMessage || 'default'}
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
            onAddFile={handleAddFile}
            onAgentTurn={onAgentTurn}
            onSendEmail={handleSendEmail}
            onTrackEvent={onTrackEvent}
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
        <div className="fixed top-14 right-5 z-[700] rounded-2xl border border-white/20 bg-black/55 px-4 py-3 text-white shadow-2xl backdrop-blur-xl">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/60">
            Research flow
          </div>
          <button
            onClick={() => {
              onTrackEvent?.('scenario_completed', {
                source: 'research_flow_button',
              });
              onComplete();
            }}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
          >
            Complete episode
          </button>
        </div>
      )}
    </div>
  );
}
