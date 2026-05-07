import { X } from 'lucide-react';
import { useEffect, useState } from 'react';

interface NotificationProps {
  id: string;
  title: string;
  sender: string;
  preview: string;
  time: string;
  type?: 'email' | 'agent';
  index?: number;
  onClose: () => void;
  onClick: () => void;
}

export function Notification({ id, title, sender, preview, time, type = 'email', index = 0, onClose, onClick }: NotificationProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Slide in animation
    setTimeout(() => setIsVisible(true), 10);

    // Auto-dismiss only for email notifications (8 seconds)
    // Agent notifications stay until manually dismissed
    if (type === 'email') {
      const timer = setTimeout(() => {
        handleClose();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [type]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleClick = () => {
    onClick();
    handleClose();
  };

  // Agent notifications go in bottom-right, email notifications in top-right
  const topOffset = type === 'email' ? 64 + (index * 120) : undefined;
  const bottomOffset = type === 'agent' ? 100 : undefined; // Above the dock

  // Agent notification - chat bubble from floating button
  if (type === 'agent') {
    return (
      <div
        className={`fixed right-6 bottom-28 w-96 cursor-pointer transition-all duration-300 ease-out z-[599] ${
          isVisible && !isExiting ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-8 opacity-0 scale-95'
        }`}
        onClick={handleClick}
      >
        {/* Message bubble */}
        <div className="relative bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-4 shadow-2xl">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleClose();
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition-colors z-10"
          >
            <X className="w-3.5 h-3.5 text-gray-600" />
          </button>

          <div className="mb-2">
            <span className="text-white font-semibold text-sm">AI Assistant</span>
            <span className="text-white/60 text-xs ml-2">{time}</span>
          </div>

          <p className="text-white text-sm leading-relaxed">
            {preview}
          </p>

          {/* Typing indicator effect */}
          <div className="flex gap-1 mt-3">
            <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>

          {/* Pointer arrow pointing to floating button */}
          <div className="absolute -bottom-3 right-6 w-6 h-6 bg-gradient-to-br from-indigo-500 to-purple-600 rotate-45" />
        </div>

        {/* Click to respond hint */}
        <div className="mt-4 text-center">
          <span className="text-xs text-white/90 bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded-full shadow-lg">
            Click to respond
          </span>
        </div>
      </div>
    );
  }

  // Email notification - original style
  return (
    <div
      className={`fixed right-4 w-80 bg-white/95 backdrop-blur-xl rounded-xl overflow-hidden cursor-pointer transition-all duration-300 ease-out z-[500] ${
        isVisible && !isExiting ? 'translate-x-0 opacity-100' : 'translate-x-[400px] opacity-0'
      }`}
      style={{
        top: `${topOffset}px`,
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15), 0 0 0 0.5px rgba(0, 0, 0, 0.1)'
      }}
      onClick={handleClick}
    >
      <div className="p-3">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
            </svg>
            <span className="text-xs font-semibold text-gray-600">Mail</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{time}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              className="p-0.5 hover:bg-gray-200 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-1">
          <div className="flex items-baseline justify-between">
            <h3 className="font-semibold text-sm text-gray-900">{sender}</h3>
          </div>
          <p className="text-sm font-medium text-gray-800">{title}</p>
          <p className="text-xs text-gray-600 line-clamp-2">{preview}</p>
        </div>
      </div>

      {/* Hover effect border */}
      <div className="absolute inset-0 border border-gray-300/50 rounded-xl pointer-events-none" />
    </div>
  );
}
