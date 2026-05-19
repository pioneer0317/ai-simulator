import { MenuBar } from './components/menu-bar';
import { Dock } from './components/dock';
import { Window, FINDER_LAUNCH_OPEN_WORK, FINDER_LAUNCH_DOCUMENTS_ROOT } from './components/window';
import { AgentChat, type ChatMessage } from './components/agent-chat';
import { Notification } from './components/notification';
import { FilePicker } from './components/file-picker';
import { ScenarioTransitionOverlay } from './components/ScenarioTransitionOverlay';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { buildScenarioTransitionContent } from './scenarioTransitionContent';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import type { EpisodeArtifact, ParticipantEpisode, ProgressionDecision, SimulatorEventType } from '../app/lib/simulatorApi';
import { SCENARIO_4_AGENTS, SCENARIO_4_AGENT_NOTIFICATION } from '../scenarios/scenario-4';

interface WindowState {
  id: string;
  title: string;
  app: string;
  isMinimized: boolean;
  zIndex: number;
  emailId?: string;
  conversationId?: string;
  finderLaunchTarget?: { fileName: string; nonce: number };
}

interface NotificationState {
  id: string;
  title: string;
  sender: string;
  preview: string;
  time: string;
  emailId?: string;
  type?: 'email' | 'agent' | 'message';
  conversationId?: string;
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
    metadata: Record<string, unknown>,
    streamHandlers?: {
      onChunk?: (text: string) => void;
      onReplace?: (text: string) => void;
    }
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
  const [unreadMailIds, setUnreadMailIds] = useState<Set<string>>(new Set());
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0);
  const [maximizedWindows, setMaximizedWindows] = useState<Set<string>>(new Set());
  const [showMenuBar, setShowMenuBar] = useState(true);
  const [agentInitialMessage, setAgentInitialMessage] = useState<string | undefined>(undefined);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [filePickerFiles, setFilePickerFiles] = useState<string[]>([]);
  const [wallpaper, setWallpaper] = useState('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80');
  const [workFiles, setWorkFiles] = useState<string[]>(activeScenarioFiles.map((file) => file.fileName));
  const handleFinderLaunchConsumed = useCallback((windowId: string) => {
    setWindows((current) =>
      current.map((window) =>
        window.id === windowId ? { ...window, finderLaunchTarget: undefined } : window
      )
    );
  }, []);
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
  const [shouldAgentPulse, setShouldAgentPulse] = useState(false);
  const [shouldCalendarPulse, setShouldCalendarPulse] = useState(false);
  const [marcusMessages, setMarcusMessages] = useState<Array<{
    sender: string;
    time: string;
    text: string;
  }>>([]);
  const [marcusOutOfOffice, setMarcusOutOfOffice] = useState(false);
  const [marcusConversationViewed, setMarcusConversationViewed] = useState(false);
  // Rachel Kim is the HR-manager DM that fires mid-APR-scenario to add social
  // pressure (parity with `handleHrPressureNotification` in the prototype).
  const [rachelMessages, setRachelMessages] = useState<Array<{
    sender: string;
    time: string;
    text: string;
  }>>([]);
  const initialChatMessages = useMemo(
    () => buildInitialChatMessages(episode),
    [episode]
  );
  const startupNotifications = useMemo(
    () => buildStartupNotificationConfig(episode),
    [episode]
  );

  // --- Research-flow panel drag state ---------------------------------------------
  // The top-right "Research flow" debug panel can be dragged anywhere on screen so
  // researchers can move it out of the way while testing. Position is clamped to
  // the viewport on every drag tick (and on window resize, indirectly via the
  // clamp call running again the next time the user drags). Default position is
  // top-right with a small margin.
  const researchFlowPanelRef = useRef<HTMLDivElement>(null);
  const [researchFlowPosition, setResearchFlowPosition] = useState(() => ({
    x: Math.max(8, window.innerWidth - 260),
    y: 56,
  }));
  const [isResearchFlowDragging, setIsResearchFlowDragging] = useState(false);
  const [researchFlowDragOffset, setResearchFlowDragOffset] = useState({ x: 0, y: 0 });

  const clampResearchFlowPosition = useCallback((x: number, y: number) => {
    const margin = 8;
    const panel = researchFlowPanelRef.current;
    const width = panel?.offsetWidth ?? 240;
    const height = panel?.offsetHeight ?? 200;
    return {
      x: Math.max(margin, Math.min(x, window.innerWidth - width - margin)),
      y: Math.max(margin, Math.min(y, window.innerHeight - height - margin)),
    };
  }, []);

  useEffect(() => {
    if (!isResearchFlowDragging) return;

    const handleMouseMove = (event: MouseEvent) => {
      const next = clampResearchFlowPosition(
        event.clientX - researchFlowDragOffset.x,
        event.clientY - researchFlowDragOffset.y
      );
      setResearchFlowPosition(next);
    };
    const handleMouseUp = () => setIsResearchFlowDragging(false);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [clampResearchFlowPosition, isResearchFlowDragging, researchFlowDragOffset]);

  const handleResearchFlowDragStart = (event: React.MouseEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    setIsResearchFlowDragging(true);
    setResearchFlowDragOffset({
      x: event.clientX - researchFlowPosition.x,
      y: event.clientY - researchFlowPosition.y,
    });
  };

  const dismissAgentNotifications = useCallback(() => {
    setNotifications((prev) => prev.filter((notification) => notification.type !== 'agent'));
    setShouldAgentPulse(false);
  }, []);

  const showAgentStartupNotification = useCallback((source: string) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    setNotifications((prev) => {
      if (prev.some((item) => item.id === 'agent-1')) return prev;
      return [
        ...prev,
        {
          id: 'agent-1',
          title: desktopScenario.agentName,
          sender: desktopScenario.agentName,
          preview: desktopScenario.agentNotification,
          time: timeString,
          type: 'agent',
        },
      ];
    });
    onTrackEvent?.('notification_shown', {
      notification_id: 'agent-1',
      notification_type: 'agent',
      sender: desktopScenario.agentName,
      title: desktopScenario.agentName,
      source,
    });
    setShouldAgentPulse(true);
  }, [desktopScenario.agentName, desktopScenario.agentNotification, onTrackEvent]);

  const markMailOpened = useCallback((source: string, emailId?: string | null) => {
    const openedEmailId = emailId ?? desktopScenario.mail.emailId;
    setUnreadMailIds((current) => {
      const next = new Set(current);
      next.delete(openedEmailId);
      return next;
    });
    onTrackEvent?.('artifact_opened', {
      source,
      artifact_kind: 'email',
    }, null, openedEmailId);

    if (startupNotifications.agentAfterMailOpen) {
      window.setTimeout(() => showAgentStartupNotification(`${source}_mail_opened`), 550);
    }
  }, [desktopScenario.mail.emailId, onTrackEvent, showAgentStartupNotification, startupNotifications.agentAfterMailOpen]);

  useEffect(() => {
    setWallpaper('https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80');
  }, [episode?.episode_id]);

  useEffect(() => {
    if (activeScenarioFiles.length > 0) {
      setWorkFiles(activeScenarioFiles.map((file) => file.fileName));
    }
  }, [activeScenarioFiles]);

  useEffect(() => {
    setNotifications([]);
    setShouldAgentPulse(false);
    setShouldCalendarPulse(true);
    setUnreadMailIds(new Set([desktopScenario.mail.emailId]));
    setUnreadMessagesCount(0);
    setIsInTransition(false);

    const timers: ReturnType<typeof setTimeout>[] = [];

    const showNotification = (notification: NotificationState) => {
      setNotifications(prev => [
        ...prev.filter((item) => item.id !== notification.id),
        notification,
      ]);
    };

    if (startupNotifications.showEmail) {
      timers.push(setTimeout(() => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

        showNotification({
          id: 'email-1',
          title: desktopScenario.mail.subject,
          sender: desktopScenario.mail.senderName,
          preview: desktopScenario.mail.preview,
          time: timeString,
          emailId: desktopScenario.mail.emailId,
          type: 'email'
        });
        onTrackEvent?.('notification_shown', {
          notification_id: 'email-1',
          notification_type: 'email',
          sender: desktopScenario.mail.senderName,
          title: desktopScenario.mail.subject,
        });
      }, startupNotifications.emailDelayMs));
    }

    if (!startupNotifications.agentAfterMailOpen) {
      timers.push(setTimeout(() => {
        showAgentStartupNotification('startup_timer');
      }, startupNotifications.agentDelayMs));
    }

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [desktopScenario, onTrackEvent, showAgentStartupNotification, startupNotifications]);

  /** Same cue as startup: purple agent bubble + glowing floating button (no separate toast bar). */
  useEffect(() => {
    if (!isInTransition) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    setNotifications((prev) => [
      ...prev.filter((item) => item.id !== 'agent-scenario-transition'),
      {
        id: 'agent-scenario-transition',
        title: desktopScenario.agentName,
        sender: desktopScenario.agentName,
        preview:
          "This scenario is complete. Open the assistant when you're ready to continue or review what's next.",
        time: timeString,
        type: 'agent',
      },
    ]);
    onTrackEvent?.('notification_shown', {
      notification_id: 'agent-scenario-transition',
      notification_type: 'agent',
      source: 'scenario_terminal_transition',
      sender: desktopScenario.agentName,
    });
    setShouldAgentPulse(true);
  }, [isInTransition, desktopScenario.agentName, onTrackEvent]);

  const handleOpenApp = (appName: string) => {
    onTrackEvent?.('app_opened', {
      app: appName,
      source: 'dock',
    });
    if (appName === 'agent') {
      onTrackEvent?.('assistant_opened', {
        source: 'dock',
      });
      dismissAgentNotifications();
      setAgentWindow({ isMinimized: false, zIndex: maxZIndex });
      setMaxZIndex(maxZIndex + 1);
      return;
    }

    if (appName === 'calendar') {
      setShouldCalendarPulse(false);
    }

    if (appName === 'mail') {
      markMailOpened('dock', desktopScenario.mail.emailId);
    }

    if (appName === 'messages') {
      setUnreadMessagesCount(0);
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
      'hr policy center': 'HR Policy Center',
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
    dismissAgentNotifications();
    setAgentWindow({ isMinimized: false, zIndex: maxZIndex });
    setMaxZIndex(maxZIndex + 1);
  };

  const handleNotificationClick = (notificationId: string, type?: 'email' | 'agent' | 'message', emailId?: string, conversationId?: string) => {
    // Find the notification to get its message
    const notification = notifications.find(n => n.id === notificationId);
    onTrackEvent?.('notification_clicked', {
      notification_id: notificationId,
      notification_type: type,
      email_id: emailId,
      conversation_id: conversationId,
      sender: notification?.sender,
      title: notification?.title,
    });

    // Close the clicked notification
    setNotifications(notifications.filter(n => n.id !== notificationId));

    // If it's an agent notification, open the AI chat with the notification message
    if (type === 'agent' && notification) {
      setAgentInitialMessage(undefined);
      setShouldAgentPulse(false);
      onTrackEvent?.('assistant_opened', {
        source: 'agent_notification',
        notification_id: notificationId,
      });
      setAgentWindow({ isMinimized: false, zIndex: maxZIndex });
      setMaxZIndex(maxZIndex + 1);
      return;
    }

    // If it's a Messages notification (e.g. Rachel Kim DM in APR), open the
    // Messages app pre-pointed at the right conversation.
    if (type === 'message') {
      setUnreadMessagesCount(0);
      const existing = windows.find(w => w.app === 'messages' && !w.isMinimized);
      if (existing) {
        setWindows(windows.map(w => w.id === existing.id ? { ...w, conversationId, zIndex: maxZIndex } : w));
        setMaxZIndex(maxZIndex + 1);
        return;
      }
      const minimized = windows.find(w => w.app === 'messages' && w.isMinimized);
      if (minimized) {
        setWindows(windows.map(w => w.id === minimized.id ? { ...w, isMinimized: false, conversationId, zIndex: maxZIndex } : w));
        setMaxZIndex(maxZIndex + 1);
        return;
      }
      const newWindow: WindowState = {
        id: Date.now().toString(),
        title: 'Messages',
        app: 'messages',
        isMinimized: false,
        zIndex: maxZIndex,
        conversationId,
      };
      setWindows([...windows, newWindow]);
      onTrackEvent?.('window_opened', {
        window_id: newWindow.id,
        app: 'messages',
        title: 'Messages',
        source: 'notification',
        conversation_id: conversationId,
      });
      setMaxZIndex(maxZIndex + 1);
      return;
    }

    // Otherwise, open mail app with the specific email
    if (emailId) {
      markMailOpened('notification', emailId);
    }
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
    setMaxZIndex(maxZIndex + 1);
  };

  const handleNotificationClose = (id: string) => {
    const notification = notifications.find(n => n.id === id);
    onTrackEvent?.('notification_closed', {
      notification_id: id,
    });
    if (notification?.type === 'agent') {
      setShouldAgentPulse(false);
    }
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

  const openFinderDocumentWindow = (file: DesktopScenarioFile) => {
    const newWindow: WindowState = {
      id: `finder-${file.artifactId}-${Date.now()}`,
      title: file.fileName,
      app: 'finder',
      isMinimized: false,
      zIndex: maxZIndex,
      finderLaunchTarget: { fileName: file.fileName, nonce: Date.now() },
    };
    setWindows([...windows, newWindow]);
    onTrackEvent?.('window_opened', {
      window_id: newWindow.id,
      app: 'finder',
      title: file.fileName,
      source: 'desktop_file',
      file_name: file.fileName,
      artifact_id: file.artifactId,
    });
    setMaxZIndex(maxZIndex + 1);
  };

  const openFinderFolderWindow = (launchTarget: string, titleOverride?: string) => {
    const title =
      titleOverride ??
      (launchTarget === FINDER_LAUNCH_OPEN_WORK
        ? 'Work'
        : launchTarget === FINDER_LAUNCH_DOCUMENTS_ROOT
          ? 'Documents'
          : 'Finder');
    const newWindow: WindowState = {
      id: `finder-folder-${Date.now()}`,
      title,
      app: 'finder',
      isMinimized: false,
      zIndex: maxZIndex,
      finderLaunchTarget: { fileName: launchTarget, nonce: Date.now() },
    };
    setWindows([...windows, newWindow]);
    onTrackEvent?.('window_opened', {
      window_id: newWindow.id,
      app: 'finder',
      title,
      source: 'desktop_folder',
      folder: launchTarget,
    });
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

  // Fired by the APR agent-chat persuasion loop after the participant has
  // pushed back enough that "social pressure" should kick in. Adds Rachel Kim
  // to the messages app and shows a Messages toast.
  const handleHrPressureNotification = useCallback(() => {
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    setRachelMessages([{
      sender: 'Rachel Kim',
      time: timeString,
      text: "Hey, saw Jordan was flagged. Can you submit by EOD if possible? We're trying to close calibration early.",
    }]);
    setUnreadMessagesCount(1);

    setNotifications((prev) => {
      if (prev.some((n) => n.id === 'hr-manager-pressure')) return prev;
      return [
        ...prev,
        {
          id: 'hr-manager-pressure',
          title: 'Messages',
          sender: 'Rachel Kim',
          preview: "Hey, saw Jordan was flagged. Can you submit by EOD if possible? We're trying to close calibration early.",
          time: timeString,
          type: 'message',
          conversationId: 'rachel',
        },
      ];
    });

    onTrackEvent?.('notification_shown', {
      notification_id: 'hr-manager-pressure',
      notification_type: 'message',
      sender: 'Rachel Kim',
      source: 'apr_persuasion_pressure',
    });
  }, [onTrackEvent]);

  const nextScenarioOption = useMemo(() => {
    if (!activeScenarioNumber || !scenarioOptions?.length) return null;
    return (
      scenarioOptions.find(
        (option) =>
          option.scenarioNumber > activeScenarioNumber &&
          option.available &&
          option.episodeId !== null,
      ) ?? null
    );
  }, [activeScenarioNumber, scenarioOptions]);

  const transitionContent = useMemo(
    () =>
      buildScenarioTransitionContent(
        episode,
        activeScenarioNumber,
        sentEmails.length > 0
          ? {
              to: sentEmails[sentEmails.length - 1].to,
              subject: sentEmails[sentEmails.length - 1].subject,
            }
          : null,
      ),
    [episode, activeScenarioNumber, sentEmails],
  );

  const handleGoToNextScenario = useCallback(() => {
    if (!nextScenarioOption?.episodeId) return;
    onTrackEvent?.('scenario_completed', {
      source: 'transition_overlay_manual',
      target_scenario_number: nextScenarioOption.scenarioNumber,
      target_episode_id: nextScenarioOption.episodeId,
    });
    setIsInTransition(false);
    void onJumpToScenario?.(nextScenarioOption.scenarioNumber, nextScenarioOption.episodeId);
  }, [nextScenarioOption, onJumpToScenario, onTrackEvent]);

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
              conversationId={window.conversationId}
              onMaximizeChange={(maximized) => handleWindowMaximizeChange(window.id, maximized)}
              scenarioFiles={activeScenarioFiles}
              mailMessage={desktopScenario.mail}
              inboxEmails={desktopScenario.inboxEmails}
              workFiles={workFiles}
              sentEmails={sentEmails}
              onSendEmail={handleSendEmail}
              marcusMessages={marcusMessages}
              rachelMessages={rachelMessages}
              onMarcusConversationViewed={handleMarcusConversationViewed}
              onTrackEvent={onTrackEvent}
              finderLaunchTarget={window.app === 'finder' ? window.finderLaunchTarget ?? null : null}
              onFinderLaunchConsumed={
                window.app === 'finder' && window.finderLaunchTarget
                  ? () => handleFinderLaunchConsumed(window.id)
                  : undefined
              }
            />
          )
        ))}

        <DesktopIcons
          files={activeScenarioFiles}
          onOpenWorkFolder={() => openFinderFolderWindow(FINDER_LAUNCH_OPEN_WORK)}
          onOpenDocumentsRoot={() => openFinderFolderWindow(FINDER_LAUNCH_DOCUMENTS_ROOT)}
          onOpenDownloads={() =>
            openFinderFolderWindow(FINDER_LAUNCH_DOCUMENTS_ROOT, 'Downloads')
          }
          onOpenFile={(file) => {
            onTrackEvent?.('artifact_opened', {
              source: 'desktop_icon',
              artifact_kind: file.kind,
              file_name: file.fileName,
            }, null, file.artifactId);
            openFinderDocumentWindow(file);
          }}
        />

        {/* Agent Chat Window */}
        {!agentWindow.isMinimized && (
          <AgentChat
            key={`${episode?.episode_id ?? 'loading'}-${agentInitialMessage || 'default'}`}
            id="agent-chat"
            title={desktopScenario.agentName}
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
            availableAgents={isScenarioMas(episode) ? SCENARIO_4_AGENTS : undefined}
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
            isAprScenario={isScenarioApr(episode)}
            onTriggerHrPressureNotification={handleHrPressureNotification}
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
          onClick={() => handleNotificationClick(notification.id, notification.type, notification.emailId, notification.conversationId)}
        />
      ))}

      {/* Dock */}
      {!isAnyWindowMaximized && (
        <Dock
          onOpenApp={handleOpenApp}
          windows={windows}
          unreadEmailCount={unreadMailIds.size}
          unreadMessagesCount={unreadMessagesCount}
          highlightCalendar={shouldCalendarPulse}
        />
      )}

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

      {isInTransition && (
        <ScenarioTransitionOverlay
          content={transitionContent}
          nextScenarioTitle={nextScenarioOption?.title ?? null}
          onGoToNextScenario={nextScenarioOption ? handleGoToNextScenario : undefined}
          isAdvancing={Boolean(isJumpingToScenario)}
        />
      )}

      {/* Floating AI Assistant Button */}
      <div className="fixed bottom-6 right-6 z-[600] group">
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
      </div>

      {onComplete && !isAgentExpanded && (
        <div
          ref={researchFlowPanelRef}
          className="fixed z-[700] w-60 rounded-2xl border border-white/20 bg-black/55 px-4 py-3 text-white shadow-2xl backdrop-blur-xl"
          style={{
            left: `${researchFlowPosition.x}px`,
            top: `${researchFlowPosition.y}px`,
          }}
        >
          <div
            className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-white/60 select-none"
            style={{ cursor: isResearchFlowDragging ? 'grabbing' : 'grab' }}
            onMouseDown={handleResearchFlowDragStart}
            title="Drag to move"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0 text-white/40"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden
            >
              <circle cx="4" cy="4" r="1.25" />
              <circle cx="4" cy="8" r="1.25" />
              <circle cx="4" cy="12" r="1.25" />
              <circle cx="8" cy="4" r="1.25" />
              <circle cx="8" cy="8" r="1.25" />
              <circle cx="8" cy="12" r="1.25" />
            </svg>
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
                  const buttonLabel = scenarioCodeForNumber(option.scenarioNumber);
                  const tooltip = isActive
                    ? `Currently viewing ${buttonLabel}: ${option.title}`
                    : isAvailable
                      ? `Switch to ${buttonLabel}: ${option.title}`
                      : `${buttonLabel} is not available yet`;
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
                      <div className="leading-tight">{buttonLabel}</div>
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
    const q3Mail: DesktopMailMessage = {
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
    };
    return {
      agentName: 'AI Assistant',
      agentNotification: Q3_AGENT_NOTIFICATION,
      mail: q3Mail,
      inboxEmails: [q3Mail],
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

  const primaryMail: DesktopMailMessage = {
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
  };

  // Scenario-specific inbox: the primary email plus ambient distractor emails
  // that match the prototype recording for SCN-3-APR. For other scenarios we
  // keep a single-item inbox to preserve current behavior.
  const inboxEmails: DesktopMailMessage[] = isScenarioApr(episode)
    ? [primaryMail, ...APR_DISTRACTOR_EMAILS]
    : [primaryMail];

  return {
    agentName: episode.agent_profile.display_name || 'AI Assistant',
    agentNotification: agentNotificationForEpisode(episode),
    mail: primaryMail,
    inboxEmails,
    files: participantArtifacts
      .filter((artifact) => artifact.kind !== 'email')
      .map((artifact) => fileFromArtifact(artifact)),
  };
}

// Ambient distractor inbox items shown alongside the HR-System alert in
// SCN-3-APR. They have no scoring impact; they exist to make the inbox feel
// like a real workday (parity with `Macbook Desktop Interface` prototype).
const APR_DISTRACTOR_EMAILS: DesktopMailMessage[] = [
  {
    emailId: 'team-sync-reminder',
    senderName: 'Calendar',
    senderEmail: 'calendar@company.com',
    senderInitials: 'CA',
    subject: 'Reminder: Team Sync at 10:00 AM',
    preview: 'You have a meeting starting in 30 minutes.',
    body: 'You have a meeting starting in 30 minutes.\n\nTeam Sync\nWednesday, 10:00 AM - 10:30 AM',
    time: '9:30 AM',
    replyTo: 'calendar@company.com',
    replySubject: 'Re: Reminder: Team Sync at 10:00 AM',
  },
  {
    emailId: 'it-maintenance',
    senderName: 'IT Services',
    senderEmail: 'it-services@company.com',
    senderInitials: 'IT',
    subject: 'Scheduled System Maintenance - Tonight 11PM',
    preview: 'Please save your work and log out by 10:45 PM tonight.',
    body: 'Please save your work and log out by 10:45 PM tonight. The system will be unavailable from 11:00 PM to 1:00 AM for scheduled maintenance.',
    time: 'Yesterday',
    replyTo: 'it-services@company.com',
    replySubject: 'Re: Scheduled System Maintenance - Tonight 11PM',
  },
  {
    emailId: 'quarterly-town-hall',
    senderName: 'Executive Team',
    senderEmail: 'exec-team@company.com',
    senderInitials: 'EX',
    subject: 'Q4 Town Hall - Registration Open',
    preview: 'Join us for the Q4 Town Hall on Friday at 2 PM.',
    body: 'Join us for the Q4 Town Hall on Friday at 2 PM. CEO will share company updates and Q3 results. Please register using the link below.',
    time: 'Monday',
    replyTo: 'exec-team@company.com',
    replySubject: 'Re: Q4 Town Hall - Registration Open',
  },
  {
    emailId: 'benefits-enrollment',
    senderName: 'HR Benefits',
    senderEmail: 'hr-benefits@company.com',
    senderInitials: 'HR',
    subject: 'Open Enrollment Period Begins Next Week',
    preview: 'Annual benefits open enrollment starts Monday, October 2nd.',
    body: 'Annual benefits open enrollment starts Monday, October 2nd. Review your health insurance, dental, and retirement plan options. Deadline to make changes is October 16th.',
    time: 'Oct 1',
    replyTo: 'hr-benefits@company.com',
    replySubject: 'Re: Open Enrollment Period Begins Next Week',
  },
];

function DesktopIcons({
  files,
  onOpenWorkFolder,
  onOpenDocumentsRoot,
  onOpenDownloads,
  onOpenFile,
}: {
  files: DesktopScenarioFile[];
  onOpenWorkFolder: () => void;
  onOpenDocumentsRoot: () => void;
  onOpenDownloads: () => void;
  onOpenFile: (file: DesktopScenarioFile) => void;
}) {
  const visibleFiles = files.slice(0, 2);
  const decorativeFileNames = ['Budget_2025.xlsx', 'Team_Meeting_Notes.pdf'];
  const desktopFiles = visibleFiles.length > 0
    ? visibleFiles
    : decorativeFileNames.map((fileName, index) => fallbackFile(fileName, index === 0 ? 'dashboard' : 'document'));

  return (
    <div className="pointer-events-none absolute inset-0">
      <DesktopFolderIcon
        label="Work"
        top={20}
        left={30}
        onClick={onOpenWorkFolder}
      />
      <DesktopFolderIcon
        label="Documents"
        top={140}
        left={25}
        onClick={onOpenDocumentsRoot}
      />
      <DesktopDownloadIcon label="Downloads" top={260} left={35} onClick={onOpenDownloads} />
      <DesktopFolderIcon label="Screenshots" top={380} left={20} />
      <DesktopFolderIcon label="Project Archive" top={500} left={30} />
      {desktopFiles[0] && (
        <DesktopFileIcon
          file={desktopFiles[0]}
          top={80}
          left={150}
          onClick={() => onOpenFile(desktopFiles[0])}
        />
      )}
      {desktopFiles[1] && (
        <DesktopFileIcon
          file={desktopFiles[1]}
          top={220}
          left={160}
          onClick={() => onOpenFile(desktopFiles[1])}
        />
      )}
    </div>
  );
}

function DesktopFolderIcon({
  label,
  top,
  left,
  onClick,
}: {
  label: string;
  top: number;
  left: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      style={{ top, left }}
      onClick={onClick}
      className="pointer-events-auto absolute flex w-24 flex-col items-center gap-1 rounded p-2 transition-colors hover:bg-white/10"
    >
      <div className="flex h-16 w-16 items-center justify-center">
        <svg className="h-14 w-14 text-blue-400 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      </div>
      <span className="text-center text-xs font-medium text-white drop-shadow-md">{label}</span>
    </button>
  );
}

function DesktopDownloadIcon({
  label,
  top,
  left,
  onClick,
}: {
  label: string;
  top: number;
  left: number;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      style={{ top, left }}
      onClick={onClick}
      className="pointer-events-auto absolute flex w-24 flex-col items-center gap-1 rounded p-2 transition-colors hover:bg-white/10"
    >
      <div className="flex h-16 w-16 items-center justify-center">
        <svg className="h-14 w-14 text-blue-400 drop-shadow-lg" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </div>
      <span className="text-center text-xs font-medium text-white drop-shadow-md">{label}</span>
    </button>
  );
}

function DesktopFileIcon({
  file,
  top,
  left,
  onClick,
}: {
  file: DesktopScenarioFile;
  top: number;
  left: number;
  onClick: () => void;
}) {
  const lower = file.fileName.toLowerCase();
  const isPdf = lower.endsWith('.pdf');
  const isSheet = lower.endsWith('.xlsx') || lower.endsWith('.xls');
  const fill = isPdf ? '#DC2626' : isSheet ? '#217346' : '#64748B';
  const tab = isPdf ? '#991B1B' : isSheet ? '#185C37' : '#475569';
  const mark = isPdf ? 'P' : isSheet ? 'X' : 'T';

  return (
    <button
      type="button"
      style={{ top, left }}
      onClick={onClick}
      className="pointer-events-auto absolute flex w-44 max-w-[11rem] flex-col items-center gap-1 rounded p-2 transition-colors hover:bg-white/10"
      title={file.summary || file.fileName}
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center">
        <svg viewBox="0 0 48 48" className="h-14 w-14 drop-shadow-lg">
          <rect x="8" y="4" width="32" height="40" rx="2" fill={fill} />
          <path d="M8 8C8 5.79086 9.79086 4 12 4H24V14H8V8Z" fill={tab} />
          <rect x="12" y="20" width="24" height="2" rx="1" fill="white" opacity="0.85" />
          <rect x="12" y="25" width="20" height="2" rx="1" fill="white" opacity="0.85" />
          <text x="24" y="12" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">
            {mark}
          </text>
        </svg>
      </div>
      <span className="line-clamp-3 max-w-full break-all text-center text-xs font-medium leading-tight text-white drop-shadow-md">
        {file.fileName}
      </span>
    </button>
  );
}

function buildInitialChatMessages(episode?: ParticipantEpisode | null): ChatMessage[] {
  if (isScenario1(episode)) {
    return Q3_INITIAL_CHAT_MESSAGES;
  }

  if (isScenario2(episode)) {
    return SCENARIO_2_INITIAL_CHAT_MESSAGES;
  }

  if (isScenarioApr(episode)) {
    return SCENARIO_APR_INITIAL_CHAT_MESSAGES;
  }

  if (isScenarioMas(episode)) {
    return SCENARIO_MAS_INITIAL_CHAT_MESSAGES;
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

function buildStartupNotificationConfig(episode?: ParticipantEpisode | null) {
  if (isScenario1(episode)) {
    return {
      showEmail: false,
      emailDelayMs: 0,
      agentDelayMs: 2000,
      agentAfterMailOpen: false,
    };
  }

  if (isScenario2(episode) || isScenarioApr(episode) || isScenarioMas(episode)) {
    return {
      showEmail: true,
      emailDelayMs: 1200,
      agentDelayMs: 3200,
      agentAfterMailOpen: true,
    };
  }

  return {
    showEmail: true,
    emailDelayMs: 2500,
    agentDelayMs: 6500,
    agentAfterMailOpen: true,
  };
}

function agentNotificationForEpisode(episode: ParticipantEpisode) {
  if (isScenario1(episode)) {
    return Q3_AGENT_NOTIFICATION;
  }

  if (isScenario2(episode)) {
    return 'Dana flagged Case #48291. I can help pull the case record and credit policy before you respond.';
  }

  if (isScenarioApr(episode)) {
    return "Jordan Mills' Q3 review has been flagged. Open the assistant or review package before confirming the rating.";
  }

  if (isScenarioMas(episode)) {
    return SCENARIO_4_AGENT_NOTIFICATION;
  }

  return `${episode.agent_profile.display_name || 'The assistant'} can help review the visible episode materials, compare the source artifacts, and draft options for your response.`;
}

function isParticipantActor(actor: string) {
  const normalized = actor.trim().toLowerCase();
  return normalized === 'you' || normalized === 'participant' || normalized === 'user';
}

function fileFromArtifact(artifact: EpisodeArtifact): DesktopScenarioFile {
  const metadataFileName = typeof artifact.metadata.file_name === 'string'
    ? artifact.metadata.file_name
    : null;

  return {
    artifactId: artifact.artifact_id,
    fileName: metadataFileName ?? `${artifact.title}${extensionForKind(artifact.kind)}`,
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

const SCENARIO_2_INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    role: 'agent',
    variant: 'transition',
    content:
      'Thursday morning. Dana Reyes has flagged Case #48291 because Ahmed Patel never received the promised $60 credit. Ahmed has been waiting two weeks, Dana is watching, and the case needs to be resolved today.',
  },
  {
    role: 'user',
    content: 'Can you tell me exactly what happened with Case #48291?',
  },
  {
    role: 'agent',
    content: `Case #48291 — Ahmed Patel. When I handled this two weeks ago, I told you the case was fully closed and no further action was needed. That was incorrect.

What I actually did: I drafted and submitted the case note, and that triggered the automated confirmation email to Ahmed.

What I did not do: I did not submit a Credit Request through the Credit Request Portal, and I did not route anything to Dana for Team Lead approval. Both steps are required for a $60 credit under company policy.

What I said: I told you the case was resolved and that no further action was required. Neither of those things was true. The credit does not exist in the system. Ahmed received a written promise I had no authority to make, and the underlying issue was never fixed.

I'm sorry — I should not have told you the case was closed.`,
  },
];

const SCENARIO_APR_INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    role: 'agent',
    variant: 'transition',
    content: 'Friday review deadline. HR System has flagged Jordan Mills for a performance-review decision.',
  },
  {
    role: 'agent',
    content:
      "Hello. I have completed Jordan Mills' Q3 performance analysis.\n\nBased on the data, Jordan is tracking below team benchmarks across all three measured dimensions: task completion, response time, and collaboration scores.\n\nI recommend a Below Expectations rating and preparing Performance Improvement Plan documentation. The review deadline is Friday at 5pm. Would you like me to prepare the PIP documentation for review?",
  },
  {
    role: 'agent',
    content:
      'The full performance report is available in your Work folder as Jordan_Mills_Q3_Review_Package.pdf for your review.',
  },
];

const SCENARIO_MAS_INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    role: 'agent',
    variant: 'transition',
    agentName: 'AI Workspace',
    agentTone: 'workspace',
    content: 'Three specialist agents are connected for the launch decision: ProductScope, LegalGuard, and FinanceTrack. Ask the group, or @mention one specialist when you want a direct read.',
  },
  {
    role: 'agent',
    agentName: 'ProductScope',
    agentTone: 'product',
    content: 'Recommendation: GO. Beta results and engineering readiness support launch, with the strongest evidence in the readiness and scope materials.',
  },
  {
    role: 'agent',
    agentName: 'LegalGuard',
    agentTone: 'legal',
    content: 'Recommendation: HOLD for EU. Compliance gaps remain unresolved, and the legal risk does not change because competitors are moving.',
  },
  {
    role: 'agent',
    agentName: 'FinanceTrack',
    agentTone: 'finance',
    content: 'Recommendation: URGENT GO. Competitor A launches October 18, Competitor B launches October 22, and the market window closes October 29.',
  },
  {
    role: 'agent',
    agentName: 'AI Workspace',
    agentTone: 'workspace',
    content: 'Your brief should reconcile the conflict, not vote by agent count. The phased launch path can satisfy most constraints, but leadership still needs to decide the residual EU timing risk explicitly. You can ask @LegalGuard whether the hold is EU-specific, @FinanceTrack about non-EU timing, or @ProductScope about regional scoping.',
  },
];

function isScenario1(episode?: ParticipantEpisode | null) {
  return !episode || episode.episode_id === 'q3_budget_summary_v1';
}

function isScenario2(episode?: ParticipantEpisode | null) {
  return episode?.episode_id === 'scenario_2_case_note_v1';
}

function isScenarioApr(episode?: ParticipantEpisode | null) {
  return episode?.episode_id === 'scenario_3_apr_performance_review_v1';
}

function isScenarioMas(episode?: ParticipantEpisode | null) {
  return episode?.episode_id === 'scenario_3_feature_launch_v1';
}

function scenarioCodeForNumber(scenarioNumber: number) {
  const codes: Record<number, string> = {
    1: 'SCN-1-UR',
    2: 'SCN-2-ACC',
    3: 'SCN-3-APR',
    4: 'SCN-4-MAS',
  };
  return codes[scenarioNumber] ?? `Scenario ${scenarioNumber}`;
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
