import { Apple, Wifi, Battery, Search } from 'lucide-react';
import svgPaths from '../../imports/ConversationTemplateMobile/svg-1a0rrom8ov';

interface MenuBarProps {
  onAgentClick?: () => void;
}

const AIStatusIcon = ({ onClick }: { onClick?: () => void }) => (
  <button
    onClick={onClick}
    className="relative w-4 h-4 cursor-pointer hover:opacity-80 transition-opacity"
    title="AI Assistant"
  >
    <svg className="w-full h-full" fill="none" viewBox="0 0 16 16">
      {/* Simple robot head icon */}
      <rect x="3" y="4" width="10" height="8" rx="1" fill="white" />
      <circle cx="6" cy="7" r="1" fill="#3B82F6" />
      <circle cx="10" cy="7" r="1" fill="#3B82F6" />
      <rect x="5" y="9" width="6" height="1" rx="0.5" fill="#94A3B8" />
      <rect x="6" y="9" width="0.8" height="1.5" fill="#94A3B8" />
      <rect x="9.2" y="9" width="0.8" height="1.5" fill="#94A3B8" />
      {/* Antenna */}
      <rect x="7.5" y="2" width="1" height="2" fill="white" />
      <circle cx="8" cy="2" r="0.8" fill="white" />
      {/* Body */}
      <rect x="4" y="12" width="8" height="3" rx="0.5" fill="white" />
    </svg>
    <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-green-400 rounded-full shadow-sm" />
  </button>
);

export function MenuBar({ onAgentClick }: MenuBarProps = {}) {
  const currentTime = new Date().toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="h-6 bg-black/30 backdrop-blur-xl flex items-center justify-between px-4 text-white text-xs relative z-50">
      <div className="flex items-center gap-4">
        <Apple className="w-4 h-4" />
        <span>Finder</span>
        <span>File</span>
        <span>Edit</span>
        <span>View</span>
        <span>Go</span>
        <span>Window</span>
        <span>Help</span>
      </div>

      <div className="flex items-center gap-4">
        <AIStatusIcon onClick={onAgentClick} />
        <Battery className="w-4 h-4" />
        <Wifi className="w-4 h-4" />
        <Search className="w-4 h-4" />
        <span>{currentDate}</span>
        <span>{currentTime}</span>
      </div>
    </div>
  );
}
