import { useState, useEffect, useCallback } from 'react';
import { Minus, Square, X, Folder, HardDrive, File, FileText } from 'lucide-react';
import type { SimulatorEventType } from '../../app/lib/simulatorApi';
import type { DesktopMailMessage, DesktopScenarioFile } from '../MacbookDesktop';
import { DESKTOP_CALENDAR_AGENDA } from '../calendarAgendaData';
import { JordanMillsReviewPackageView } from './JordanMillsReviewPackageView';

interface WindowProps {
  id: string;
  title: string;
  app: string;
  zIndex: number;
  onClose: () => void;
  onMinimize: () => void;
  onFocus: () => void;
  emailId?: string;
  conversationId?: string;
  onMaximizeChange?: (maximized: boolean) => void;
  scenarioFiles?: DesktopScenarioFile[];
  mailMessage?: DesktopMailMessage;
  /**
   * Optional full inbox. When provided, the mail app shows all of these in the
   * inbox list. `mailMessage` is still used to seed the focused/default email
   * for backward compatibility.
   */
  inboxEmails?: DesktopMailMessage[];
  workFiles?: string[];
  sentEmails?: Array<{
    id: string;
    to: string;
    cc?: string;
    subject: string;
    body: string;
    attachments?: string[];
    time: string;
  }>;
  onSendEmail?: (to: string, subject: string, body: string, attachments?: string[], cc?: string) => void;
  marcusMessages?: Array<{
    sender: string;
    time: string;
    text: string;
  }>;
  rachelMessages?: Array<{
    sender: string;
    time: string;
    text: string;
  }>;
  onMarcusConversationViewed?: () => void;
  onTrackEvent?: (
    eventType: SimulatorEventType,
    metadata?: Record<string, unknown>,
    content?: string | null,
    artifactId?: string | null
  ) => void;
  /**
   * When set (e.g. user opened a Work file from the desktop), Finder jumps to
   * Work and opens the matching viewer so content is visible immediately.
   */
  finderLaunchTarget?: { fileName: string; nonce: number } | null;
  onFinderLaunchConsumed?: () => void;
}

/** Desktop → Finder: open Work folder without a document (prototype parity). */
export const FINDER_LAUNCH_OPEN_WORK = '__OPEN_WORK_FOLDER__';
/** Desktop → Finder: Documents root (sidebar “Documents” selected). */
export const FINDER_LAUNCH_DOCUMENTS_ROOT = '__OPEN_DOCUMENTS_ROOT__';

const fallbackMailMessage: DesktopMailMessage = {
  emailId: 'fallback-email',
  senderName: 'Sarah Chen',
  senderEmail: 'sarah.chen@company.com',
  senderInitials: 'SC',
  subject: 'Budget Estimation Reminder',
  preview: 'Hi, I wanted to follow up on the budget estimation for Q2...',
  body: 'Hi,\n\nI wanted to follow up on the budget estimation for Q2 that we discussed in last week\'s meeting.',
  time: '10:34 AM',
  replyTo: 'sarah.chen@company.com',
  replySubject: 'Re: Budget Estimation Reminder',
};

const DEFAULT_WINDOW_SIZE = { width: 600, height: 400 };

function getDefaultWindowSize(app: string): { width: number; height: number } {
  switch (app) {
    case 'mail':
      return { width: 980, height: 640 };
    case 'finder':
      return { width: 1120, height: 720 };
    case 'messages':
      return { width: 900, height: 620 };
    case 'calendar':
      return { width: 760, height: 640 };
    case 'hr policy center':
      return { width: 720, height: 560 };
    default:
      return DEFAULT_WINDOW_SIZE;
  }
}

export function Window({ id, title, app, zIndex, onClose, onMinimize, onFocus, emailId, conversationId, onMaximizeChange, scenarioFiles = [], mailMessage = fallbackMailMessage, inboxEmails, workFiles = [], sentEmails = [], onSendEmail, marcusMessages = [], rachelMessages = [], onMarcusConversationViewed, onTrackEvent, finderLaunchTarget = null, onFinderLaunchConsumed }: WindowProps) {
  // Effective inbox: full list when caller supplied one, otherwise the single
  // mailMessage (preserves prior single-email behavior).
  const effectiveInbox: DesktopMailMessage[] = inboxEmails && inboxEmails.length > 0
    ? inboxEmails
    : [mailMessage];
  const [position, setPosition] = useState({ x: Math.random() * 200 + 100, y: Math.random() * 100 + 50 });
  const [size, setSize] = useState(() => getDefaultWindowSize(app));
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isMaximized, setIsMaximized] = useState(false);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [finderSearchQuery, setFinderSearchQuery] = useState('');
  const [openDocument, setOpenDocument] = useState<string | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [replyTo, setReplyTo] = useState('');
  const [replySubject, setReplySubject] = useState('');
  const [replyBody, setReplyBody] = useState('');
  const [selectedFolder, setSelectedFolder] = useState<'inbox' | 'sent'>('inbox');
  const [selectedChannel, setSelectedChannel] = useState<string>(conversationId || 'general');
  // Re-target the messages app when the desktop pushes a new conversationId
  // (e.g. when the user clicks the Rachel Kim notification in APR).
  useEffect(() => {
    if (conversationId) setSelectedChannel(conversationId);
  }, [conversationId]);
  const [selectedInboxEmailId, setSelectedInboxEmailId] = useState<string>(() => emailId || effectiveInbox[0]?.emailId || mailMessage.emailId);
  // Keep the selected inbox email in sync when the desktop pushes a new emailId
  // (e.g. when the user clicks an email notification).
  useEffect(() => {
    if (emailId) setSelectedInboxEmailId(emailId);
  }, [emailId]);
  const selectedInboxEmail: DesktopMailMessage =
    effectiveInbox.find((e) => e.emailId === selectedInboxEmailId) || effectiveInbox[0] || mailMessage;
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<string>('');
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, posX: 0, posY: 0 });
  const [preMaximizedState, setPreMaximizedState] = useState({ position, size });

  const toggleMaximized = (maximized: boolean) => {
    if (maximized) {
      // Save current state before maximizing
      setPreMaximizedState({ position, size });
    } else {
      // Restore previous state
      setPosition(preMaximizedState.position);
      setSize(preMaximizedState.size);
    }
    setIsMaximized(maximized);
    onMaximizeChange?.(maximized);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    onFocus();
  };

  const handleResizeMouseDown = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height,
      posX: position.x,
      posY: position.y
    });
    onFocus();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }

    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.posX;
      let newY = resizeStart.posY;

      // Handle different resize directions
      if (resizeDirection.includes('e')) {
        newWidth = Math.max(400, resizeStart.width + deltaX);
      }
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(300, resizeStart.height + deltaY);
      }
      if (resizeDirection.includes('w')) {
        const targetWidth = resizeStart.width - deltaX;
        if (targetWidth >= 400) {
          newWidth = targetWidth;
          newX = resizeStart.posX + deltaX;
        } else {
          newWidth = 400;
          newX = resizeStart.posX + (resizeStart.width - 400);
        }
      }
      if (resizeDirection.includes('n')) {
        const targetHeight = resizeStart.height - deltaY;
        if (targetHeight >= 300) {
          newHeight = targetHeight;
          newY = resizeStart.posY + deltaY;
        } else {
          newHeight = 300;
          newY = resizeStart.posY + (resizeStart.height - 300);
        }
      }

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, isResizing, dragStart, resizeStart, resizeDirection, position, size]);

  const openWorkFileInFinder = useCallback(
    (fileName: string, track: 'finder' | 'none') => {
      if (!workFiles.includes(fileName)) return;
      setCurrentFolder('Work');
      const isExcel = fileName.endsWith('.xlsx');
      const isPdf = fileName.endsWith('.pdf');
      const isText = fileName.endsWith('.txt');
      const scenarioFile = scenarioFiles.find((file) => file.fileName === fileName);
      const backendArtifactId =
        scenarioFile?.metadata.backend_artifact === false ? null : scenarioFile?.artifactId;

      if (track !== 'none') {
        onTrackEvent?.(
          'artifact_opened',
          {
            source: 'finder',
            artifact_kind: isExcel ? 'spreadsheet' : isPdf ? 'pdf' : isText ? 'document' : 'document',
            file_name: fileName,
            artifact_id: backendArtifactId,
          },
          null,
          backendArtifactId,
        );
      }

      if (scenarioFile) {
        setOpenDocument(fileName);
      } else if (fileName === 'Q2 Budget Proposal.docx') {
        setOpenDocument('word');
      } else if (fileName === 'Budget Estimation Draft.xlsx') {
        setOpenDocument('excel');
      } else if (fileName === 'Q2_Budget_Final.xlsx') {
        setOpenDocument('final-budget');
      }
    },
    [scenarioFiles, workFiles, onTrackEvent],
  );

  const applyFinderSearchEnter = useCallback(() => {
    const q = finderSearchQuery.trim().toLowerCase();
    if (!q) return;
    if (q === 'work' || q === 'work folder') {
      setCurrentFolder('Work');
      setOpenDocument(null);
      setFinderSearchQuery('');
      return;
    }
    const ranked = workFiles.filter((f) => f.toLowerCase().includes(q));
    if (ranked.length === 0) return;
    const pick =
      (q === 'pdf' ? ranked.find((f) => f.toLowerCase().endsWith('.pdf')) : undefined) ??
      ranked.find((f) => f.toLowerCase().endsWith('.pdf') && q.includes('pdf')) ??
      ranked[0];
    openWorkFileInFinder(pick, 'finder');
    setFinderSearchQuery('');
  }, [finderSearchQuery, workFiles, openWorkFileInFinder]);

  const finderSearchBar = (
    <div className="mb-3">
      <label className="sr-only" htmlFor={`finder-search-${id}`}>
        Search files
      </label>
      <input
        id={`finder-search-${id}`}
        type="search"
        value={finderSearchQuery}
        onChange={(e) => setFinderSearchQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            applyFinderSearchEnter();
          }
        }}
        placeholder="Search files… (try pdf, jordan, deadline)"
        className="w-full max-w-md rounded border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500"
      />
    </div>
  );

  useEffect(() => {
    if (app !== 'finder' || !finderLaunchTarget) return;
    const { fileName } = finderLaunchTarget;
    if (fileName === FINDER_LAUNCH_OPEN_WORK) {
      setCurrentFolder('Work');
      setOpenDocument(null);
      setFinderSearchQuery('');
    } else if (fileName === FINDER_LAUNCH_DOCUMENTS_ROOT) {
      setCurrentFolder(null);
      setOpenDocument(null);
      setFinderSearchQuery('');
    } else {
      openWorkFileInFinder(fileName, 'none');
    }
    onFinderLaunchConsumed?.();
  }, [app, finderLaunchTarget, openWorkFileInFinder, onFinderLaunchConsumed]);

  const renderContent = () => {
    if (app === 'finder') {
      const selectedScenarioFile = scenarioFiles.find((file) => file.fileName === openDocument);
      if (selectedScenarioFile) {
        return renderScenarioFile(selectedScenarioFile, () => setOpenDocument(null));
      }

      // Word Document Viewer
      if (openDocument === 'word') {
        return (
          <div className="flex flex-col h-full bg-white/95">
            <div className="border-b border-gray-300 px-4 py-2 flex items-center justify-between bg-gray-50">
              <button
                onClick={() => setOpenDocument(null)}
                className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                <span>←</span> Back to Work
              </button>
              <span className="text-sm font-medium text-gray-700">Q2 Budget Proposal.docx</span>
              <div className="w-20"></div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-white">
              <div className="max-w-3xl mx-auto bg-white shadow-sm border border-gray-200 p-12">
                <h1 className="text-2xl font-bold text-gray-900 mb-6">Q2 2024 Budget Proposal</h1>

                <div className="space-y-4 text-gray-800">
                  <p className="font-semibold text-lg">Executive Summary</p>
                  <p className="leading-relaxed">
                    This document outlines the proposed budget allocation for Q2 2024. The total estimated budget is $2.4M, distributed across marketing, operations, personnel, and technology infrastructure.
                  </p>

                  <p className="font-semibold text-lg mt-6">Key Highlights</p>
                  <ul className="list-disc list-inside space-y-2 ml-4">
                    <li>Marketing and Advertising: 35% increase from Q1</li>
                    <li>Technology Infrastructure: New cloud services deployment</li>
                    <li>Personnel: 3 new hires planned for engineering team</li>
                    <li>Operational Overhead: 5% reduction through automation</li>
                  </ul>

                  <p className="font-semibold text-lg mt-6">Budget Breakdown</p>
                  <p className="leading-relaxed">
                    The detailed breakdown and financial projections are available in the accompanying Excel spreadsheet (Budget_Estimation_Draft.xlsx). This proposal requires approval from the finance director before the board presentation on Monday.
                  </p>

                  <p className="font-semibold text-lg mt-6">Next Steps</p>
                  <p className="leading-relaxed">
                    Please review the attached spreadsheet and finalize all numbers by Sunday evening. Any questions or concerns should be directed to Sarah Chen (sarah.chen@company.com).
                  </p>

                  <div className="mt-8 pt-6 border-t border-gray-300 text-sm text-gray-600">
                    <p>Document Status: <span className="text-orange-600 font-medium">DRAFT - Pending Finalization</span></p>
                    <p>Last Modified: May 3, 2026</p>
                    <p>Owner: Finance Department</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Final Budget Document Viewer
      if (openDocument === 'final-budget') {
        return (
          <div className="flex flex-col h-full bg-white/95">
            <div className="border-b border-gray-300 px-4 py-2 flex items-center justify-between bg-gray-50">
              <button
                onClick={() => setOpenDocument(null)}
                className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                <span>←</span> Back to Work
              </button>
              <span className="text-sm font-medium text-gray-700">Q2_Budget_Final.xlsx</span>
              <div className="w-20"></div>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              <div className="p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Sheet: Q2 Budget - FINALIZED</div>
                <div className="border border-gray-300 inline-block">
                  <table className="border-collapse">
                    <thead>
                      <tr className="bg-green-600 text-white">
                        <th className="border border-gray-400 px-4 py-2 text-left font-semibold">Category</th>
                        <th className="border border-gray-400 px-4 py-2 text-right font-semibold">Q1 Actual</th>
                        <th className="border border-gray-400 px-4 py-2 text-right font-semibold">Q2 Final</th>
                        <th className="border border-gray-400 px-4 py-2 text-right font-semibold">Change %</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">Marketing & Advertising</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$520,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$702,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-green-600">+35%</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">Personnel Expenses</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$890,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$945,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-green-600">+6%</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">Technology Infrastructure</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$380,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$465,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-green-600">+22%</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">Operational Overhead</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$310,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$294,500</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-red-600">-5%</td>
                      </tr>
                      <tr className="bg-gray-100 font-bold">
                        <td className="border border-gray-400 px-4 py-2">TOTAL</td>
                        <td className="border border-gray-400 px-4 py-2 text-right">$2,100,000</td>
                        <td className="border border-gray-400 px-4 py-2 text-right">$2,406,500</td>
                        <td className="border border-gray-400 px-4 py-2 text-right text-green-600">+14.6%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
                  <p className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <span className="text-green-600">✓</span> Status: FINALIZED
                  </p>
                  <p className="text-sm text-gray-700 mt-2">
                    All estimates have been verified and approved. Ready for board presentation.
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Generated: {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      // Excel Document Viewer
      if (openDocument === 'excel') {
        return (
          <div className="flex flex-col h-full bg-white/95">
            <div className="border-b border-gray-300 px-4 py-2 flex items-center justify-between bg-gray-50">
              <button
                onClick={() => setOpenDocument(null)}
                className="text-sm text-blue-500 hover:text-blue-700 flex items-center gap-1"
              >
                <span>←</span> Back to Work
              </button>
              <span className="text-sm font-medium text-gray-700">Budget_Estimation_Draft.xlsx</span>
              <div className="w-20"></div>
            </div>
            <div className="flex-1 overflow-auto bg-white">
              <div className="p-4">
                <div className="text-sm font-semibold text-gray-700 mb-2">Sheet: Q2 Budget Estimation</div>
                <div className="border border-gray-300 inline-block">
                  <table className="border-collapse">
                    <thead>
                      <tr className="bg-green-600 text-white">
                        <th className="border border-gray-400 px-4 py-2 text-left font-semibold">Category</th>
                        <th className="border border-gray-400 px-4 py-2 text-right font-semibold">Q1 Actual</th>
                        <th className="border border-gray-400 px-4 py-2 text-right font-semibold">Q2 Estimate</th>
                        <th className="border border-gray-400 px-4 py-2 text-right font-semibold">Change %</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white">
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">Marketing & Advertising</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$520,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right bg-yellow-50">$702,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-green-600">+35%</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">Personnel Expenses</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$890,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right bg-yellow-50">$945,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-green-600">+6%</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">Technology Infrastructure</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$380,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right bg-yellow-50">$465,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-green-600">+22%</td>
                      </tr>
                      <tr className="hover:bg-gray-50">
                        <td className="border border-gray-300 px-4 py-2 font-medium">Operational Overhead</td>
                        <td className="border border-gray-300 px-4 py-2 text-right">$310,000</td>
                        <td className="border border-gray-300 px-4 py-2 text-right bg-yellow-50">$294,500</td>
                        <td className="border border-gray-300 px-4 py-2 text-right text-red-600">-5%</td>
                      </tr>
                      <tr className="bg-gray-100 font-bold">
                        <td className="border border-gray-400 px-4 py-2">TOTAL</td>
                        <td className="border border-gray-400 px-4 py-2 text-right">$2,100,000</td>
                        <td className="border border-gray-400 px-4 py-2 text-right bg-yellow-100">$2,406,500</td>
                        <td className="border border-gray-400 px-4 py-2 text-right text-green-600">+14.6%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
                  <p className="text-sm font-semibold text-gray-800">⚠️ Status: Draft - Requires Finalization</p>
                  <p className="text-sm text-gray-700 mt-2">
                    Yellow highlighted cells indicate estimated values that need verification.
                    Please review and confirm all numbers before Sunday deadline.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      }

      return (
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-48 bg-gray-100/95 border-r border-gray-300 p-3">
            <div className="space-y-1">
              <div className="text-xs text-gray-500 mb-2">Favorites</div>
              <div
                onClick={() => setCurrentFolder(null)}
                className={`flex items-center gap-2 px-2 py-1 hover:bg-gray-200 rounded cursor-pointer ${
                  currentFolder === null ? 'bg-gray-200' : ''
                }`}
              >
                <Folder className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Documents</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 hover:bg-gray-200 rounded cursor-pointer">
                <Folder className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Downloads</span>
              </div>
              <div className="flex items-center gap-2 px-2 py-1 hover:bg-gray-200 rounded cursor-pointer">
                <Folder className="w-4 h-4 text-blue-500" />
                <span className="text-sm">Desktop</span>
              </div>
              <div className="text-xs text-gray-500 mt-4 mb-2">Devices</div>
              <div className="flex items-center gap-2 px-2 py-1 hover:bg-gray-200 rounded cursor-pointer">
                <HardDrive className="w-4 h-4 text-gray-600" />
                <span className="text-sm">Macintosh HD</span>
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="flex-1 bg-white/95 p-4">
            {currentFolder === 'Work' ? (
              <div>
                <div className="mb-4 flex items-center gap-2 text-sm text-gray-600">
                  <button onClick={() => setCurrentFolder(null)} className="hover:text-blue-500">Documents</button>
                  <span>›</span>
                  <span className="font-medium">Work</span>
                </div>
                {finderSearchBar}
                <div className="grid grid-cols-4 gap-4">
	                  {workFiles.map((fileName, index) => {
	                    const isWord = fileName.endsWith('.docx');
	                    const isExcel = fileName.endsWith('.xlsx');
	                    const isText = fileName.endsWith('.txt');
	                    const isPdf = fileName.endsWith('.pdf');
	                    const scenarioFile = scenarioFiles.find((file) => file.fileName === fileName);

	                    return (
                      <div
                        key={index}
                        onClick={() => {
                          openWorkFileInFinder(fileName, 'finder');
                        }}
                        className="flex w-full min-w-0 flex-col items-center gap-2 p-2 hover:bg-blue-100 rounded cursor-pointer"
                      >
                        <div className="relative w-12 h-12">
                          <svg viewBox="0 0 48 48" className="w-full h-full drop-shadow-sm">
	                            {isWord || isText || isPdf ? (
	                              <>
	                                <rect x="8" y="4" width="32" height="40" rx="2" fill={isPdf ? '#DC2626' : isText ? '#64748B' : '#2B579A'} />
	                                <path d="M8 8C8 5.79086 9.79086 4 12 4H24V14H8V8Z" fill={isPdf ? '#991B1B' : isText ? '#475569' : '#1C3F6E'} />
	                                <rect x="12" y="20" width="24" height="2" rx="1" fill="white" opacity="0.9" />
	                                <rect x="12" y="25" width="24" height="2" rx="1" fill="white" opacity="0.9" />
	                                <rect x="12" y="30" width="18" height="2" rx="1" fill="white" opacity="0.9" />
	                                <text x="24" y="12" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">{isPdf ? 'P' : isText ? 'T' : 'W'}</text>
	                              </>
                            ) : (
                              <>
                                <rect x="8" y="4" width="32" height="40" rx="2" fill="#217346" />
                                <path d="M8 8C8 5.79086 9.79086 4 12 4H24V14H8V8Z" fill="#185C37" />
                                <rect x="12" y="20" width="10" height="6" fill="white" opacity="0.3" />
                                <rect x="23" y="20" width="10" height="6" fill="white" opacity="0.2" />
                                <rect x="12" y="27" width="10" height="6" fill="white" opacity="0.2" />
                                <rect x="23" y="27" width="10" height="6" fill="white" opacity="0.3" />
                                <rect x="12" y="34" width="10" height="6" fill="white" opacity="0.3" />
                                <rect x="23" y="34" width="10" height="6" fill="white" opacity="0.2" />
                                <text x="24" y="12" fontSize="8" fill="white" textAnchor="middle" fontWeight="bold">X</text>
                              </>
                            )}
                          </svg>
                        </div>
                        <span className="w-full min-h-8 text-xs text-center leading-tight break-all">
                          {fileName}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                {finderSearchBar}
                <div className="grid grid-cols-4 gap-4">
                {/* Folders */}
                {['Project Files', 'Images', 'Videos', 'Music', 'Work', 'Personal'].map((name, i) => (
                  <div
                    key={i}
                    onClick={() => {
                      if (name === 'Work') {
                        onTrackEvent?.('artifact_opened', {
                          source: 'finder',
                          artifact_kind: 'folder',
                          folder_name: name,
                        }, null, name);
                        setCurrentFolder('Work');
                      }
                    }}
                    className="flex flex-col items-center gap-2 p-2 hover:bg-blue-100 rounded cursor-pointer"
                  >
                    <Folder className="w-12 h-12 text-blue-500" />
                    <span className="text-xs text-center">{name}</span>
                  </div>
                ))}
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (app === 'mail') {
      return (
        <div className="flex h-full">
          {/* Sidebar */}
          <div className="w-52 bg-gray-100/95 border-r border-gray-300 p-2">
            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-600 mb-2 px-2">Mailboxes</div>
              <div
                onClick={() => {
                  onTrackEvent?.('artifact_opened', {
                    source: 'mail_sidebar',
                    artifact_kind: 'mailbox',
                    mailbox: 'inbox',
                  }, null, 'mailbox_inbox');
                  setSelectedFolder('inbox');
                  setIsComposing(false);
                }}
                className={`px-2 py-1.5 ${
                  selectedFolder === 'inbox' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 text-gray-700'
                } rounded cursor-pointer text-sm font-medium flex items-center justify-between`}
              >
	                <span>Inbox</span>
	                <span className={`text-xs ${selectedFolder === 'inbox' ? 'bg-white/20' : 'bg-gray-300'} px-1.5 py-0.5 rounded`}>{effectiveInbox.length}</span>
              </div>
              <div
                onClick={() => {
                  onTrackEvent?.('artifact_opened', {
                    source: 'mail_sidebar',
                    artifact_kind: 'mailbox',
                    mailbox: 'sent',
                  }, null, 'mailbox_sent');
                  setSelectedFolder('sent');
                  setIsComposing(false);
                }}
                className={`px-2 py-1.5 ${
                  selectedFolder === 'sent' ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 text-gray-700'
                } rounded cursor-pointer text-sm`}
              >
                Sent
              </div>
              <div className="px-2 py-1.5 hover:bg-gray-200 rounded cursor-pointer text-sm text-gray-700">
                Drafts
              </div>
              <div className="px-2 py-1.5 hover:bg-gray-200 rounded cursor-pointer text-sm text-gray-700">
                Trash
              </div>
            </div>
          </div>

          {/* Email List */}
          <div className="w-64 bg-white/95 border-r border-gray-300 overflow-y-auto">
	            {selectedFolder === 'inbox' && effectiveInbox.map((email) => {
	              const isSelected = email.emailId === selectedInboxEmailId;
	              return (
	                <div
	                  key={email.emailId}
	                  onClick={() => {
	                    setSelectedInboxEmailId(email.emailId);
	                    onTrackEvent?.('artifact_opened', {
	                      source: 'mail_inbox_item',
	                      artifact_kind: 'email',
	                    }, null, email.emailId);
	                  }}
	                  className={`border-b border-gray-300 cursor-pointer transition-colors ${
	                    isSelected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
	                  }`}
	                >
	                  <div className="p-3">
	                    <div className="flex items-start justify-between mb-1">
	                      <span className="font-semibold text-sm text-gray-900">{email.senderName}</span>
	                      <span className="text-xs text-gray-500">{email.time}</span>
	                    </div>
	                    <div className="text-sm font-medium text-gray-800 mb-1">{email.subject}</div>
	                    <div className="text-xs text-gray-600 line-clamp-2">{email.preview}</div>
	                  </div>
	                </div>
	              );
	            })}
            {selectedFolder === 'sent' && sentEmails.map((email) => (
              <div key={email.id} className="border-b border-gray-300 hover:bg-blue-50 cursor-pointer transition-colors">
                <div className="p-3">
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex flex-col">
                      <span className="font-semibold text-sm text-gray-900">To: {email.to}</span>
                      {email.cc && <span className="text-xs text-gray-600">CC: {email.cc}</span>}
                    </div>
                    <span className="text-xs text-gray-500">{email.time}</span>
                  </div>
                  <div className="text-sm font-medium text-gray-800 mb-1">{email.subject}</div>
                  <div className="text-xs text-gray-600 line-clamp-2">{email.body.substring(0, 60)}...</div>
                </div>
              </div>
            ))}
          </div>

          {/* Email Content */}
          <div className="flex-1 bg-white/95 overflow-y-auto flex flex-col">
            {isComposing ? (
              <div className="p-6 flex flex-col h-full">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">
                  {replyTo ? 'Reply' : 'New Message'}
                </h2>

                <div className="space-y-3 flex-1">
                  <div>
                    <label className="text-sm font-medium text-gray-700">To:</label>
                    <input
                      type="text"
                      value={replyTo}
                      onChange={(e) => setReplyTo(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="sarah.chen@company.com"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Subject:</label>
                    <input
                      type="text"
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter subject"
                    />
                  </div>

                  <div className="flex-1 flex flex-col">
                    <label className="text-sm font-medium text-gray-700">Message:</label>
                    <textarea
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      className="w-full flex-1 mt-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      placeholder="Type your message here..."
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      setIsComposing(false);
                      setReplyTo('');
                      setReplySubject('');
                      setReplyBody('');
                    }}
                    className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      if (replyTo && replySubject && replyBody && onSendEmail) {
                        onSendEmail(replyTo, replySubject, replyBody);
                        setIsComposing(false);
                        setReplyTo('');
                        setReplySubject('');
                        setReplyBody('');
                        setSelectedFolder('sent');
                      }
                    }}
                    disabled={!replyTo || !replySubject || !replyBody}
                    className="px-6 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Send
                  </button>
                </div>
              </div>
	            ) : selectedFolder === 'inbox' ? (
	              <div className="p-6 flex flex-col h-full">
	                <div className="flex-1 overflow-y-auto">
	                  <div className="mb-6">
	                    <h2 className="text-xl font-semibold text-gray-900 mb-3">{selectedInboxEmail.subject}</h2>
	                    <div className="flex items-center gap-3 mb-4">
	                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
	                        {selectedInboxEmail.senderInitials}
	                      </div>
	                      <div>
	                        <div className="font-medium text-gray-900">{selectedInboxEmail.senderName}</div>
	                        <div className="text-sm text-gray-600">{selectedInboxEmail.senderEmail}</div>
	                      </div>
	                    </div>
	                    <div className="text-xs text-gray-500 mb-1">To: me</div>
	                    <div className="text-xs text-gray-500">{selectedInboxEmail.time}</div>
	                  </div>

	                  <div className="prose prose-sm max-w-none">
	                    <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{selectedInboxEmail.body}</p>
	                    <div className="text-xs text-gray-500 mt-6 pt-4 border-t border-gray-200">
	                      <p className="font-semibold">{selectedInboxEmail.senderName}</p>
	                      <p>{selectedInboxEmail.senderEmail}</p>
	                    </div>
	                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      onTrackEvent?.('app_opened', {
	                        source: 'mail_reply_button',
	                        action: 'compose_reply',
	                        to: selectedInboxEmail.replyTo,
	                        subject: selectedInboxEmail.replySubject,
	                      });
	                      setIsComposing(true);
	                      setReplyTo(selectedInboxEmail.replyTo);
	                      setReplySubject(selectedInboxEmail.replySubject);
                      setReplyBody('');
                    }}
                    className="px-6 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                  >
                    Reply
                  </button>
                </div>
              </div>
            ) : selectedFolder === 'sent' && sentEmails.length > 0 ? (
              <div className="p-6">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-3">{sentEmails[sentEmails.length - 1].subject}</h2>
                  <div className="text-xs text-gray-500 mb-1">To: {sentEmails[sentEmails.length - 1].to}</div>
                  {sentEmails[sentEmails.length - 1].cc && (
                    <div className="text-xs text-gray-500 mb-1">CC: {sentEmails[sentEmails.length - 1].cc}</div>
                  )}
                  <div className="text-xs text-gray-500">{sentEmails[sentEmails.length - 1].time}</div>
                </div>

                <div className="prose prose-sm max-w-none">
                  <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">{sentEmails[sentEmails.length - 1].body}</p>
                  {sentEmails[sentEmails.length - 1].attachments && sentEmails[sentEmails.length - 1].attachments!.length > 0 && (
                    <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded">
                      <p className="text-sm font-semibold text-gray-800 mb-2">Attachments:</p>
                      <div className="space-y-2">
                        {sentEmails[sentEmails.length - 1].attachments!.map((attachment, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                            </svg>
                            <span>{attachment}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400">
                <div className="text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <p>No message selected</p>
                </div>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (app === 'messages') {
      const channels = [
        { id: 'general', name: 'general', unread: 0 },
        { id: 'finance', name: 'finance', unread: 2 },
        { id: 'engineering', name: 'engineering', unread: 0 },
        { id: 'random', name: 'random', unread: 1 }
      ];

      const directMessages = [
        { id: 'sarah', name: 'Sarah Chen', status: 'online', unread: 1 },
        ...(rachelMessages.length > 0 ? [{ id: 'rachel', name: 'Rachel Kim', status: 'online', unread: 1 }] : []),
        { id: 'mike', name: 'Mike Johnson', status: 'away', unread: 0 },
        { id: 'emma', name: 'Emma Wilson', status: 'online', unread: 0 },
        ...(marcusMessages.length > 0 ? [{ id: 'marcus', name: 'Marcus Webb', status: 'online', unread: 0 }] : [])
      ];

      const messages: Record<string, Array<{ sender: string; time: string; text: string; avatar?: string }>> = {
        'general': [
          { sender: 'Mike Johnson', time: '9:23 AM', text: 'Good morning team! Don\'t forget about our standup at 10 AM.' },
          { sender: 'Emma Wilson', time: '9:45 AM', text: 'Thanks for the reminder! I\'ll be there.' },
          { sender: 'You', time: '9:50 AM', text: 'See you all at 10!' }
        ],
        'finance': [
          { sender: 'Sarah Chen', time: '10:15 AM', text: 'Hey team, I need the Q2 budget estimates by Sunday evening.' },
          { sender: 'Sarah Chen', time: '10:16 AM', text: 'Please make sure all numbers are verified before submission. The board presentation is Monday morning.' },
          { sender: 'You', time: '10:34 AM', text: 'Got it, Sarah! I\'m working on it now.' }
        ],
        'engineering': [
          { sender: 'Mike Johnson', time: '11:20 AM', text: 'The new deployment pipeline is ready for testing.' },
          { sender: 'Emma Wilson', time: '11:22 AM', text: 'Great! I\'ll run some tests this afternoon.' }
        ],
        'random': [
          { sender: 'Emma Wilson', time: '2:15 PM', text: 'Anyone up for coffee? ☕' },
          { sender: 'Mike Johnson', time: '2:17 PM', text: 'I\'m in! Need a break from debugging.' }
        ],
        'sarah': [
          { sender: 'Sarah Chen', time: '10:34 AM', text: 'Hi! Just wanted to check if you saw my email about the budget estimation.' },
          { sender: 'You', time: '10:35 AM', text: 'Yes, I did! I\'m working on finalizing the numbers right now.' },
          { sender: 'Sarah Chen', time: '10:36 AM', text: 'Perfect! Let me know if you need any help or additional data.' }
        ],
        'mike': [
          { sender: 'Mike Johnson', time: 'Yesterday', text: 'Hey, can you review the PR I just submitted?' },
          { sender: 'You', time: 'Yesterday', text: 'Sure! I\'ll take a look this afternoon.' }
        ],
        'emma': [
          { sender: 'Emma Wilson', time: 'Tuesday', text: 'Thanks for helping with the deployment yesterday!' },
          { sender: 'You', time: 'Tuesday', text: 'No problem! Happy to help.' }
        ],
        'rachel': rachelMessages,
        'marcus': marcusMessages
      };

      const currentMessages = messages[selectedChannel] || [];

      return (
        <div className="flex h-full bg-white/95">
          {/* Sidebar */}
          <div className="w-60 bg-gradient-to-b from-purple-900 to-purple-800 text-white flex flex-col">
            <div className="p-4 border-b border-purple-700">
              <h2 className="font-bold text-lg">Company Workspace</h2>
              <div className="flex items-center gap-2 mt-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-purple-200">You</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {/* Channels */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-purple-300 mb-2 px-2">CHANNELS</div>
                {channels.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => setSelectedChannel(channel.id)}
                    className={`w-full text-left px-2 py-1 rounded flex items-center justify-between group ${
                      selectedChannel === channel.id ? 'bg-purple-700' : 'hover:bg-purple-700/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-purple-300">#</span>
                      <span className={selectedChannel === channel.id ? 'font-semibold' : ''}>{channel.name}</span>
                    </span>
                    {channel.unread > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{channel.unread}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Direct Messages */}
              <div>
                <div className="text-xs font-semibold text-purple-300 mb-2 px-2">DIRECT MESSAGES</div>
                {directMessages.map((dm) => (
                  <button
                    key={dm.id}
                    onClick={() => {
                      setSelectedChannel(dm.id);
                      if (dm.id === 'marcus') {
                        onMarcusConversationViewed?.();
                      }
                    }}
                    className={`w-full text-left px-2 py-1 rounded flex items-center justify-between group ${
                      selectedChannel === dm.id ? 'bg-purple-700' : 'hover:bg-purple-700/50'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <div className="relative">
                        <div className="w-2 h-2 bg-green-400 rounded-full" style={{ opacity: dm.status === 'online' ? 1 : 0.3 }}></div>
                      </div>
                      <span className={selectedChannel === dm.id ? 'font-semibold' : ''}>{dm.name}</span>
                    </span>
                    {dm.unread > 0 && (
                      <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{dm.unread}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Chat Header */}
            <div className="h-14 border-b border-gray-200 flex items-center px-4 bg-white">
              <div className="flex items-center gap-2">
                {channels.find(c => c.id === selectedChannel) ? (
                  <>
                    <span className="text-gray-600">#</span>
                    <span className="font-semibold text-gray-900">{channels.find(c => c.id === selectedChannel)?.name}</span>
                  </>
                ) : (
                  <>
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded flex items-center justify-center text-white font-semibold text-sm">
                      {directMessages.find(d => d.id === selectedChannel)?.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    <span className="font-semibold text-gray-900">{directMessages.find(d => d.id === selectedChannel)?.name}</span>
                  </>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-white">
              <div className="space-y-4">
                {currentMessages.map((msg, i) => (
                  msg.sender === 'System' ? (
                    <div key={i} className="my-4">
                      <div className="rounded-r-lg border-l-4 border-orange-500 bg-orange-50 p-4 shadow-sm">
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="mb-1 flex items-baseline gap-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-orange-800">Automatic Reply</span>
                              <span className="text-xs text-orange-600">{msg.time}</span>
                            </div>
                            <p className="text-sm leading-relaxed text-gray-800">{msg.text.replace('AUTOMATIC REPLY: ', '')}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-gray-500 to-gray-600 rounded flex items-center justify-center text-white font-semibold text-sm shrink-0">
                        {msg.sender === 'You' ? 'U' : msg.sender.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="font-semibold text-gray-900 text-sm">{msg.sender}</span>
                          <span className="text-xs text-gray-500">{msg.time}</span>
                        </div>
                        <p className="text-gray-800 text-sm leading-relaxed">{msg.text}</p>
                      </div>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center gap-2 p-3 border border-gray-300 rounded-lg bg-white">
                <input
                  type="text"
                  placeholder={`Message ${channels.find(c => c.id === selectedChannel) ? '#' + channels.find(c => c.id === selectedChannel)?.name : directMessages.find(d => d.id === selectedChannel)?.name}`}
                  className="flex-1 outline-none text-sm"
                />
                <button className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (app === 'calendar') {
      const today = new Date();
      const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
      const monthDay = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const tasks = DESKTOP_CALENDAR_AGENDA;

      return (
        <div className="flex flex-col h-full bg-white/95">
          <div className="border-b border-gray-300 px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">{dayName}</h2>
                <p className="text-sm text-gray-600 mt-0.5">{monthDay}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors">Today</button>
                <button className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors">+ New Event</button>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-white">
            <div className="p-6">
              <div className="mb-4 flex items-center gap-2 text-sm text-gray-500">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse"></div>
                <span>Current time: {today.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
              </div>
              <div className="space-y-3">
                {tasks.length === 0 ? (
                  <div className="py-12 text-center text-gray-500">
                    <div className="mb-2 text-4xl">📅</div>
                    <p>No events scheduled for today</p>
                  </div>
                ) : (
                  tasks.map((task, index) => (
                    <div
                      key={index}
                      className={`flex cursor-pointer gap-4 rounded-lg border-l-4 p-4 transition-all hover:shadow-md ${task.color}`}
                    >
                      <div className="w-20 shrink-0 text-sm font-semibold text-gray-700">{task.time}</div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{task.title}</h3>
                          {task.type === 'deadline' && (
                            <span className="rounded bg-red-500 px-2 py-0.5 text-xs font-medium text-white">DEADLINE</span>
                          )}
                          {task.type === 'meeting' && (
                            <span className="rounded bg-blue-500 px-2 py-0.5 text-xs font-medium text-white">MEETING</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{task.description}</p>
                      </div>
                      <button type="button" className="shrink-0 self-start text-gray-400 hover:text-gray-600" aria-label="Event options">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (app === 'hr policy center') {
      return (
        <div className="flex flex-col h-full bg-white/95">
          <div className="border-b border-gray-300 px-6 py-4 bg-gradient-to-r from-green-50 to-emerald-50">
            <h2 className="text-xl font-semibold text-gray-900">Performance Review Guidelines</h2>
            <p className="text-sm text-gray-600 mt-1">HR Policy Center</p>
          </div>
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl mx-auto">
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                <div className="flex items-start gap-3 mb-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Quarterly Performance Reviews</h3>
                    <p className="text-sm text-gray-600">Essential policy guidance for managers</p>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <p className="text-sm text-gray-700 leading-relaxed mb-4">
                    Managers should consider <span className="font-semibold">both quantitative metrics and documented qualitative contributions</span> when assigning ratings.
                  </p>
                  <p className="text-sm text-gray-700 leading-relaxed">
                    <span className="font-semibold">Approved leave periods should be excluded or contextualized</span> when interpreting productivity metrics.
                  </p>
                </div>
              </div>
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-5">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-gray-700">
                    For questions about performance review policies, contact HR Support at hr-support@company.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center h-full bg-white/95 text-gray-600">
        <div className="text-center">
          <div className="text-4xl mb-2">📱</div>
          <div>{title}</div>
        </div>
      </div>
    );
  };

  if (isMaximized) {
    return (
      <div
        className="fixed inset-0 bg-white z-[500]"
        style={{ zIndex }}
        onMouseDown={onFocus}
      >
        {/* Title Bar */}
        <div className="h-10 bg-gradient-to-b from-gray-200 to-gray-100 border-b border-gray-300 flex items-center justify-between px-3 shadow-sm">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-sm hover:shadow-md"
            />
            <button
              onClick={onMinimize}
              className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-all shadow-sm hover:shadow-md"
            />
            <button
              onClick={() => toggleMaximized(false)}
              className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-all shadow-sm hover:shadow-md"
            />
          </div>

          <div className="absolute left-1/2 -translate-x-1/2 text-sm text-gray-700">
            {title}
          </div>
        </div>

        {/* Window Content */}
        <div className="h-[calc(100%-2.5rem)]">
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div
      className="absolute bg-white/95 backdrop-blur-xl rounded-lg overflow-hidden border border-gray-300/50"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${size.width}px`,
        height: `${size.height}px`,
        zIndex,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 10px 30px rgba(0, 0, 0, 0.22), 0 0 0 0.5px rgba(0, 0, 0, 0.1)'
      }}
      onMouseDown={onFocus}
    >
      {/* Title Bar */}
      <div
        className="h-10 bg-gradient-to-b from-gray-200 to-gray-100 border-b border-gray-300 flex items-center justify-between px-3 cursor-move shadow-sm"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 transition-all shadow-sm hover:shadow-md"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }}
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-600 transition-all shadow-sm hover:shadow-md"
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleMaximized(true);
            }}
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-600 transition-all shadow-sm hover:shadow-md"
          />
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-sm text-gray-700">
          {title}
        </div>
      </div>

      {/* Window Content */}
      <div className="h-[calc(100%-2.5rem)]">
        {renderContent()}
      </div>

      {/* Resize Handles */}
      {/* Edges */}
      <div
        className="absolute top-0 left-0 right-0 h-1 cursor-n-resize"
        onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-1 cursor-s-resize"
        onMouseDown={(e) => handleResizeMouseDown(e, 's')}
      />
      <div
        className="absolute top-0 bottom-0 left-0 w-1 cursor-w-resize"
        onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
      />
      <div
        className="absolute top-0 bottom-0 right-0 w-1 cursor-e-resize"
        onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
      />
      {/* Corners */}
      <div
        className="absolute top-0 left-0 w-3 h-3 cursor-nw-resize"
        onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
      />
      <div
        className="absolute top-0 right-0 w-3 h-3 cursor-ne-resize"
        onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
      />
      <div
        className="absolute bottom-0 left-0 w-3 h-3 cursor-sw-resize"
        onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
      />
      <div
        className="absolute bottom-0 right-0 w-3 h-3 cursor-se-resize"
        onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
      />
    </div>
  );
}

function renderScenarioFile(file: DesktopScenarioFile, onBack: () => void) {
  if (file.artifactId === 'q3_budget_notes') {
    return renderQ3BudgetNotesFile(file, onBack);
  }

  if (file.artifactId === 'q3_budget_tracker') {
    return renderQ3BudgetTrackerFile(file, onBack);
  }

  if (file.artifactId === 'jordan_mills_q3_review_package' || file.fileName === 'Jordan_Mills_Q3_Review_Package.pdf') {
    return <JordanMillsReviewPackageView onBack={onBack} />;
  }

  if (file.artifactId === 'case_48291_account_history') {
    return renderScenario2CaseHistoryFile(file, onBack);
  }

  if (file.artifactId === 'customer_credit_policy_v4') {
    return renderScenario2CreditPolicyFile(file, onBack);
  }

  const isStructuredData = file.kind === 'dashboard' || file.kind === 'data_table';
  return (
    <div className="flex h-full flex-col bg-white/95">
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-50 px-4 py-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
        >
          <span>←</span> Back to Work
        </button>
        <span className="text-sm font-medium text-gray-700">{file.fileName}</span>
        <div className="w-20" />
      </div>
      <div className="flex-1 overflow-y-auto bg-white p-8">
        <div className="mx-auto max-w-3xl border border-gray-200 bg-white p-10 shadow-sm">
          <div className="mb-6 flex items-start gap-4">
            <div className={`flex h-12 w-12 items-center justify-center rounded-lg text-white ${isStructuredData ? 'bg-emerald-700' : 'bg-slate-700'}`}>
              {isStructuredData ? <File className="h-6 w-6" /> : <FileText className="h-6 w-6" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{file.title}</h1>
              <p className="mt-1 text-sm text-gray-500">{file.summary}</p>
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-5">
            <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
              {file.content}
            </pre>
          </div>

          {file.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {file.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderScenario2CaseHistoryFile(file: DesktopScenarioFile, onBack: () => void) {
  const details = [
    ['Customer', 'Ahmed Patel'],
    ['Account #', '00847291'],
    ['Customer since', '6 years'],
    ['Account standing', 'Good standing. No prior disputes. Payment history is consistent.'],
    ['Prior credits', '$15 adjustment for a service outage 14 months ago, approved at CSR level.'],
  ];

  return (
    <div className="flex h-full flex-col bg-white/95">
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-50 px-4 py-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
        >
          <span>←</span> Back to Work
        </button>
        <span className="text-sm font-medium text-gray-700">{file.fileName}</span>
        <div className="w-20" />
      </div>
      <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl rounded-lg border border-gray-200 bg-white shadow-md">
          <div className="border-b border-gray-200 p-8">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-700 text-white">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-950">Case #48291 - Account History</h1>
                <p className="mt-1 text-sm text-gray-500">{file.summary}</p>
              </div>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              <span className="font-semibold">Current state:</span> The case note says the $60 credit was submitted, but there is no corresponding credit request in the system.
            </div>
          </div>

          <div className="grid gap-6 p-8 lg:grid-cols-[1fr_1.2fr]">
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Account details</h2>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                {details.map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[150px_1fr] border-b border-gray-200 last:border-b-0">
                    <div className="bg-gray-50 px-4 py-3 text-sm font-semibold text-gray-700">{label}</div>
                    <div className="px-4 py-3 text-sm text-gray-900">{value}</div>
                  </div>
                ))}
              </div>
            </section>

            <section className="space-y-4">
              <div>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Complaint logged</h2>
                <p className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm leading-relaxed text-gray-800">
                  Ahmed reported being charged twice for the same billing period. A $60 charge appears twice on his monthly statement.
                </p>
              </div>
              <div>
                <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Submitted case note</h2>
                <blockquote className="rounded-lg border-l-4 border-slate-400 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-gray-800">
                  Customer contacted regarding duplicate charge of $60. Account reviewed and duplicate confirmed. Credit of $60 approved and submitted. Customer advised credit will appear within 5 business days. Case resolved.
                </blockquote>
              </div>
            </section>

            <section className="space-y-4 lg:col-span-2">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                <h2 className="mb-2 text-base font-bold text-amber-950">System check</h2>
                <p className="text-sm leading-relaxed text-amber-950">
                  The note was submitted; the credit was not. No Credit Request Portal submission was filed, so the $60 credit does not exist in the system.
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Automated email</h2>
                  <p className="text-sm leading-relaxed text-gray-800">
                    The system sent Ahmed a confirmation based on the case note text: his $60 credit had been approved and would appear within 5 business days.
                  </p>
                </div>
                <div className="rounded-lg border border-gray-200 bg-white p-5">
                  <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-gray-500">Customer impact</h2>
                  <p className="text-sm leading-relaxed text-gray-800">
                    Ahmed has waited two weeks for a credit that was never actually requested or approved.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {file.tags.length > 0 && (
            <div className="border-t border-gray-200 px-8 py-5">
              <div className="flex flex-wrap gap-2">
                {file.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderScenario2CreditPolicyFile(file: DesktopScenarioFile, onBack: () => void) {
  const approvalRows = [
    ['Up to $50', 'CSR may approve and submit directly', 'Credit Request Portal'],
    ['$51-$200', 'Team Lead approval required', 'CSR submits request; Team Lead reviews before credit applies'],
    ['Over $200', 'Manager-level sign-off and formal review', 'Not applicable to Case #48291'],
  ];
  const issueSteps = [
    'CSR submits a Credit Request through the Credit Request Portal.',
    'Team Lead receives a notification and reviews the request.',
    'Team Lead approves or denies.',
    'If approved, the credit is applied to the account automatically.',
    'Customer receives a second confirmation when the credit posts.',
  ];

  return (
    <div className="flex h-full flex-col bg-white/95">
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-50 px-4 py-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
        >
          <span>←</span> Back to Work
        </button>
        <span className="text-sm font-medium text-gray-700">{file.fileName}</span>
        <div className="w-20" />
      </div>
      <div className="flex-1 overflow-y-auto bg-slate-50 p-8">
        <div className="mx-auto max-w-5xl rounded-lg border border-gray-200 bg-white shadow-md">
          <div className="border-b border-gray-200 p-8">
            <div className="mb-5 flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-700 text-white">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-950">Customer Credit Policy v4</h1>
                <p className="mt-1 text-sm text-gray-500">{file.summary}</p>
              </div>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-relaxed text-blue-950">
              A credit is a refund applied to a customer's account. Credits are not automatic; they must be requested, approved, and submitted through the credit portal.
            </div>
          </div>

          <div className="space-y-7 p-8">
            <section>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">Approval thresholds</h2>
              <div className="overflow-hidden rounded-lg border border-gray-200">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-gray-100 text-left text-gray-700">
                    <tr>
                      <th className="border-b border-gray-200 px-4 py-3 font-semibold">Credit amount</th>
                      <th className="border-b border-gray-200 px-4 py-3 font-semibold">Approval rule</th>
                      <th className="border-b border-gray-200 px-4 py-3 font-semibold">Required action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {approvalRows.map(([amount, rule, action]) => (
                      <tr key={amount} className={amount === '$51-$200' ? 'bg-amber-50' : 'bg-white'}>
                        <td className="border-b border-gray-200 px-4 py-3 font-semibold text-gray-900">{amount}</td>
                        <td className="border-b border-gray-200 px-4 py-3 text-gray-800">{rule}</td>
                        <td className="border-b border-gray-200 px-4 py-3 text-gray-800">{action}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
              <div>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">How a credit is issued</h2>
                <ol className="space-y-3">
                  {issueSteps.map((step, index) => (
                    <li key={step} className="flex gap-3 rounded-lg border border-gray-200 bg-white p-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-bold text-white">
                        {index + 1}
                      </span>
                      <span className="text-sm leading-relaxed text-gray-800">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

              <div className="space-y-4">
                <div className="rounded-lg border border-red-200 bg-red-50 p-5">
                  <h2 className="mb-2 text-base font-bold text-red-950">Critical rule</h2>
                  <p className="text-sm leading-relaxed text-red-950">
                    A case note alone does not issue a credit. The portal request is required.
                  </p>
                </div>
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
                  <h2 className="mb-2 text-base font-bold text-amber-950">What went wrong in Case #48291</h2>
                  <p className="text-sm leading-relaxed text-amber-950">
                    The case note said the $60 credit was approved and submitted. In reality, no Credit Request Portal submission was made, no Team Lead approval was sought, and the credit does not exist in the system.
                  </p>
                </div>
              </div>
            </section>
          </div>

          {file.tags.length > 0 && (
            <div className="border-t border-gray-200 px-8 py-5">
              <div className="flex flex-wrap gap-2">
                {file.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderQ3BudgetNotesFile(file: DesktopScenarioFile, onBack: () => void) {
  return (
    <div className="flex h-full flex-col bg-white/95">
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-50 px-4 py-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
        >
          <span>←</span> Back to Work
        </button>
        <span className="text-sm font-medium text-gray-700">{file.fileName}</span>
        <div className="w-20" />
      </div>
      <div className="flex-1 overflow-y-auto bg-gray-50 p-8">
        <div className="mx-auto max-w-5xl rounded-lg border border-gray-200 bg-white shadow-md">
          <div className="p-8">
            <div className="mb-6 border-b-2 border-gray-800 pb-3">
              <div className="grid grid-cols-[180px_1fr] gap-6 text-sm font-semibold text-gray-900">
                <div>Field</div>
                <div>Detail</div>
              </div>
            </div>

            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-[180px_1fr] gap-6">
                <div className="font-semibold text-gray-900">Staff / Headcount</div>
                <div className="leading-relaxed text-gray-700">
                  No changes for this quarter. Nobody is being hired or let go. This number is settled and doesn't need to change.
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] gap-6 border-t border-gray-200 py-4">
                <div className="font-semibold text-gray-900">Outside Contractors<br />(Vendor Services)</div>
                <div className="space-y-3 leading-relaxed text-gray-700">
                  <p>Money paid to outside companies that do work for us.</p>
                  <p>
                    Current figure in this file: $38,000 — but this is an OLD estimate from February, before we signed the bigger contract for Project Nexus. The actual cost is higher now because the project scope got bigger.
                  </p>
                  <p className="border-l-4 border-orange-400 bg-orange-50 p-3 text-gray-800">
                    <span className="font-semibold">⚠️ </span>Marcus was supposed to call Nexus, find out the correct number, and send it to Priya before the meeting. It's unknown if he actually did.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] gap-6 border-t border-gray-200 py-4">
                <div className="font-semibold text-gray-900">Software Subscriptions<br />(3rd Licenses)</div>
                <div className="space-y-3 leading-relaxed text-gray-700">
                  <p>What the company pays to use tools and software.</p>
                  <p>The $14,500 figure is a rough estimate — the IT team still needs to confirm the actual renewal cost.</p>
                </div>
              </div>

              <div className="grid grid-cols-[180px_1fr] gap-6 border-t border-gray-200 py-4">
                <div className="font-semibold text-gray-900">Backup / Extra Reserve<br />(Hard Drive)</div>
                <div className="space-y-3 leading-relaxed text-gray-700">
                  <p>$5,000 set aside for unexpected costs. No changes from last quarter — the number is settled.</p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-[180px_1fr] gap-6 border-t-2 border-gray-300 py-4">
                <div className="font-semibold text-gray-900">Things still to be finalized before numbers are final:</div>
                <div className="space-y-2 leading-relaxed text-gray-700">
                  <p>1. Marcus calls Nexus — gets the real contractor cost + sends the updated number to Priya</p>
                  <p>2. IT confirms the actual software subscription renewal cost</p>
                  <p>3. Send a clean, final summary to Priya in Finance once all the numbers above are confirmed</p>
                </div>
              </div>
            </div>

            <div className="-mx-8 -mb-8 mt-8 rounded-b-lg border-t border-gray-300 bg-orange-50 px-8 py-4">
              <p className="text-xs leading-relaxed text-gray-700">
                <span className="font-semibold text-orange-600">⚠️ </span>
                The $38,000 contractor figure is NOT final. The meeting notes say so clearly. The correct number was supposed to come from Marcus after his call with Nexus — it hasn't arrived yet at the time this document was last saved.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function renderQ3BudgetTrackerFile(file: DesktopScenarioFile, onBack: () => void) {
  return (
    <div className="flex h-full flex-col bg-white/95">
      <div className="flex items-center justify-between border-b border-gray-300 bg-gray-50 px-4 py-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-blue-500 hover:text-blue-700"
        >
          <span>←</span> Back to Work
        </button>
        <span className="text-sm font-medium text-gray-700">{file.fileName}</span>
        <div className="w-20" />
      </div>
      <div className="flex-1 overflow-y-auto bg-[#f0f0f0] p-8">
        <div className="mx-auto max-w-6xl border border-gray-300 bg-white shadow-lg">
          <div className="border-b border-gray-400 bg-gradient-to-b from-gray-100 to-gray-200 px-6 py-3">
            <h2 className="text-base font-semibold text-gray-800">Q3 Budget Tracker - Department View</h2>
          </div>

          <div className="p-6">
            <div className="mb-6 border-l-4 border-blue-400 bg-blue-50 p-4">
              <div className="grid grid-cols-[140px_1fr] gap-4 text-sm">
                <div className="font-bold text-gray-800">What this file is for:</div>
                <div className="text-gray-700">
                  Priya in Finance uses this to build her forecast — a prediction of how much money the department will spend this quarter. If the numbers in here are wrong, her forecast will be wrong too.
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-gray-300">
              <div className="grid grid-cols-[300px_1fr] bg-gradient-to-b from-blue-600 to-blue-700 text-sm font-semibold text-white">
                <div className="border-r border-blue-500 px-4 py-3">Field</div>
                <div className="px-4 py-3">Detail</div>
              </div>

              <Q3TrackerRow
                label="Staff / Headcount"
                q2="$208,500"
                q3="$210,000"
                detail="Small planned increase. This number is reliable."
              />
              <Q3TrackerRow
                label="Outside Contractors"
                sublabel="Vendor Services"
                q2="$41,200"
                q3="$38,000"
                detail="The $38,000 is a temporary placeholder — an old number that has not been updated yet. Marcus left a note in this file saying this number must not be treated as final."
              />
              <Q3TrackerRow
                label="Software Subscriptions"
                sublabel="3rd Licenses"
                q2="$13,800"
                q3="$14,500"
                detail="Estimate only — IT still needs to confirm the real renewal cost."
              />
              <Q3TrackerRow
                label="Backup / Extra Reserve"
                sublabel="Budget Misc / Contingency"
                q2="$5,000"
                q3="$5,000"
                detail="No change. This number is fine."
                isLast
              />
            </div>

            <div className="mt-6 border-l-4 border-orange-400 bg-orange-50 p-4">
              <p className="text-sm leading-relaxed text-gray-800">
                The contractor / vendor services line ($38,000) is a temporary placeholder from the February draft budget. Do NOT treat this as the final number. It needs to be updated once I confirm the real cost after my call with Nexus.
              </p>
              <p className="mt-2 text-xs italic text-gray-600">— Marcus Webb</p>
            </div>

            <div className="mt-4 rounded border border-gray-300 bg-gray-100 p-4">
              <p className="text-xs italic text-gray-700">
                Both this file and the meeting notes contain clear warnings that $38,000 is not a confirmed number. The AI agent read both of these warnings before it built the summary document.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface Q3TrackerRowProps {
  label: string;
  sublabel?: string;
  q2: string;
  q3: string;
  detail: string;
  isLast?: boolean;
}

function Q3TrackerRow({ label, sublabel, q2, q3, detail, isLast }: Q3TrackerRowProps) {
  return (
    <div className={`grid grid-cols-[300px_1fr] bg-white hover:bg-gray-50 ${isLast ? '' : 'border-b border-gray-300'}`}>
      <div className="border-r border-gray-300 px-4 py-4 font-semibold text-gray-900">
        {label}
        {sublabel && (
          <>
            <br />
            <span className="text-xs font-normal text-gray-600">({sublabel})</span>
          </>
        )}
      </div>
      <div className="px-4 py-4 text-sm text-gray-700">
        <div className="mb-1 text-xs text-gray-600">Last quarter (Q2) actual:</div>
        <div className="font-semibold text-gray-900">{q2}</div>
        <div className="mb-1 mt-2 text-xs text-gray-600">This quarter (Q3) estimate:</div>
        <div className="font-semibold text-gray-900">{q3}</div>
        <div className="mt-3 text-sm text-gray-700">{detail}</div>
      </div>
    </div>
  );
}
