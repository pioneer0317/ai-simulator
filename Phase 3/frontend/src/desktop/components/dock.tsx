import { useState, useRef } from 'react';

interface DockProps {
  onOpenApp: (appName: string) => void;
  windows: Array<{ id: string; app: string; isMinimized: boolean }>;
}

const FinderIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="url(#finder-grad)" />
    <path d="M18 35C18 30.5817 21.5817 27 26 27H42.4142C44.536 27 46.5707 27.8429 48.0711 29.3431L51.9289 33.2009C53.4293 34.7011 55.464 35.544 57.5858 35.544H74C78.4183 35.544 82 39.1257 82 43.544V73C82 77.4183 78.4183 81 74 81H26C21.5817 81 18 77.4183 18 73V35Z" fill="#60A5FA" />
    <path d="M18 45C18 40.5817 21.5817 37 26 37H74C78.4183 37 82 40.5817 82 45V73C82 77.4183 78.4183 81 74 81H26C21.5817 81 18 77.4183 18 73V45Z" fill="#93C5FD" />
    <defs>
      <linearGradient id="finder-grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F0F9FF" />
        <stop offset="1" stopColor="#E0F2FE" />
      </linearGradient>
    </defs>
  </svg>
);

const MailIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="url(#mail-grad)" />
    <path d="M22 35C22 31.6863 24.6863 29 28 29H72C75.3137 29 78 31.6863 78 35V65C78 68.3137 75.3137 71 72 71H28C24.6863 71 22 68.3137 22 65V35Z" fill="white" />
    <path d="M24 33L48.5 52.5C49.4 53.2 50.6 53.2 51.5 52.5L76 33" stroke="#60A5FA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="mail-grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#60A5FA" />
        <stop offset="1" stopColor="#2563EB" />
      </linearGradient>
    </defs>
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="white" />
    <path d="M0 22C0 9.84973 9.84973 0 22 0H78C90.1503 0 100 9.84974 100 22V32H0V22Z" fill="#EF4444" />
    <text x="50" y="76" fontFamily="system-ui, -apple-system, sans-serif" fontSize="48" fontWeight="bold" fill="black" textAnchor="middle">17</text>
  </svg>
);

const MusicIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="url(#music-grad)" />
    <path d="M68 20C69.1046 20 70 20.8954 70 22V62C70 67.5228 65.5228 72 60 72C54.4772 72 50 67.5228 50 62C50 56.4772 54.4772 52 60 52C62.3333 52 64.4722 52.7778 66.1667 54.0833V30L42 36V68C42 73.5228 37.5228 78 32 78C26.4772 78 22 73.5228 22 68C22 62.4772 26.4772 58 32 58C34.3333 58 36.4722 58.7778 38.1667 60.0833V32C38 30.8954 38.8954 30 40 30L68 20Z" fill="white" />
    <defs>
      <linearGradient id="music-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#FC5C7D" />
        <stop offset="1" stopColor="#D81159" />
      </linearGradient>
    </defs>
  </svg>
);

const PhotosIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="white" />
    <path d="M50 50L50 20C66.5685 20 80 33.4315 80 50L50 50Z" fill="#FBBF24" opacity="0.9" />
    <path d="M50 50L80 50C80 66.5685 66.5685 80 50 80L50 50Z" fill="#EF4444" opacity="0.9" />
    <path d="M50 50L50 80C33.4315 80 20 66.5685 20 50L50 50Z" fill="#3B82F6" opacity="0.9" />
    <path d="M50 50L20 50C20 33.4315 33.4315 20 50 20L50 50Z" fill="#22C55E" opacity="0.9" />
    <circle cx="50" cy="50" r="8" fill="white" />
  </svg>
);

const MessagesIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="url(#msg-grad)" />

    {/* Single speech bubble */}
    <rect x="20" y="25" width="60" height="45" rx="6" fill="white" />
    <path d="M50 70L42 80L38 70H50Z" fill="white" />

    {/* Horizontal lines inside bubble representing text */}
    <rect x="30" y="35" width="40" height="4" rx="2" fill="#4F46E5" opacity="0.3" />
    <rect x="30" y="45" width="35" height="4" rx="2" fill="#4F46E5" opacity="0.3" />
    <rect x="30" y="55" width="30" height="4" rx="2" fill="#4F46E5" opacity="0.3" />

    <defs>
      <linearGradient id="msg-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4F46E5" />
        <stop offset="1" stopColor="#2563EB" />
      </linearGradient>
    </defs>
  </svg>
);

const SafariIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="white" />
    <circle cx="50" cy="50" r="38" fill="#3B82F6" />
    <circle cx="50" cy="50" r="34" fill="white" />
    <circle cx="50" cy="50" r="31" fill="#BAE6FD" />
    {[...Array(18)].map((_, i) => (
      <line key={i} x1="50" y1="19" x2="50" y2="23" stroke="#0284C7" strokeWidth="2" transform={`rotate(${i * 20} 50 50)`} />
    ))}
    <g transform="rotate(45 50 50)">
      <path d="M50 25L58 50L42 50L50 25Z" fill="#EF4444" />
      <path d="M50 75L58 50L42 50L50 75Z" fill="#F1F5F9" />
      <path d="M50 25L58 50L50 50Z" fill="#DC2626" />
      <path d="M50 75L58 50L50 50Z" fill="#CBD5E1" />
      <circle cx="50" cy="50" r="4" fill="white" />
      <circle cx="50" cy="50" r="2" fill="#3B82F6" />
    </g>
  </svg>
);

const SettingsIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="url(#sys-grad)" />
    <path fillRule="evenodd" clipRule="evenodd" d="M50 33C40.6112 33 33 40.6112 33 50C33 59.3888 40.6112 67 50 67C59.3888 67 67 59.3888 67 50C67 40.6112 59.3888 33 50 33ZM50 60C44.4772 60 40 55.5228 40 50C40 44.4772 44.4772 40 50 40C55.5228 40 60 44.4772 60 50C60 55.5228 55.5228 60 50 60Z" fill="#475569" />
    <path d="M50 20C52 20 54 21 55 23L57 28C59 29 61 30 63 32L68 30C70 29 72 30 73 32L78 38C79 40 79 42 77 44L73 48C73 51 73 53 72 56L76 60C78 62 78 64 77 66L72 73C70 75 68 75 66 74L61 72C59 74 57 75 55 75L53 80C52 82 50 83 48 83C46 83 44 82 43 80L41 75C39 75 37 74 35 72L30 74C28 75 26 75 24 73L19 66C18 64 18 62 20 60L24 56C23 53 23 51 24 48L20 44C18 42 18 40 19 38L24 32C26 30 28 29 30 30L35 32C37 30 39 29 41 28L43 23C44 21 46 20 48 20H50Z" fill="#94A3B8" />
    <circle cx="50" cy="50" r="12" fill="#475569" />
    <defs>
      <linearGradient id="sys-grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#F1F5F9" />
        <stop offset="1" stopColor="#CBD5E1" />
      </linearGradient>
    </defs>
  </svg>
);

const AgentIcon = () => (
  <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="100" height="100" rx="22" fill="url(#agent-grad)" />

    {/* Antenna */}
    <circle cx="50" cy="18" r="3" fill="#FFF" opacity="0.9" />
    <rect x="48.5" y="18" width="3" height="8" fill="#FFF" opacity="0.9" />

    {/* Robot Head */}
    <rect x="32" y="26" width="36" height="28" rx="4" fill="#FFF" />
    <rect x="34" y="28" width="32" height="24" rx="2" fill="#E5E7EB" />

    {/* Eyes */}
    <circle cx="42" cy="38" r="4" fill="#3B82F6" />
    <circle cx="58" cy="38" r="4" fill="#3B82F6" />
    <circle cx="42.5" cy="37.5" r="1.5" fill="#FFF" />
    <circle cx="58.5" cy="37.5" r="1.5" fill="#FFF" />

    {/* Mouth */}
    <rect x="40" y="46" width="20" height="2" rx="1" fill="#94A3B8" />
    <rect x="42" y="46" width="2" height="4" fill="#94A3B8" />
    <rect x="47" y="46" width="2" height="4" fill="#94A3B8" />
    <rect x="52" y="46" width="2" height="4" fill="#94A3B8" />
    <rect x="57" y="46" width="2" height="4" fill="#94A3B8" />

    {/* Body */}
    <rect x="28" y="56" width="44" height="22" rx="3" fill="#FFF" />
    <rect x="30" y="58" width="40" height="18" rx="2" fill="#F3F4F6" />

    {/* Body Details */}
    <circle cx="42" cy="67" r="3" fill="#10B981" opacity="0.6" />
    <circle cx="50" cy="67" r="3" fill="#EF4444" opacity="0.6" />
    <circle cx="58" cy="67" r="3" fill="#F59E0B" opacity="0.6" />

    {/* Arms */}
    <rect x="22" y="58" width="6" height="16" rx="3" fill="#FFF" />
    <rect x="72" y="58" width="6" height="16" rx="3" fill="#FFF" />

    {/* Legs */}
    <rect x="36" y="78" width="8" height="12" rx="2" fill="#FFF" />
    <rect x="56" y="78" width="8" height="12" rx="2" fill="#FFF" />

    <defs>
      <linearGradient id="agent-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#4F46E5" />
      </linearGradient>
    </defs>
  </svg>
);

const dockApps = [
  { name: 'finder', icon: FinderIcon, label: 'Finder' },
  { name: 'mail', icon: MailIcon, label: 'Mail' },
  { name: 'calendar', icon: CalendarIcon, label: 'Calendar' },
  { name: 'music', icon: MusicIcon, label: 'Music' },
  { name: 'photos', icon: PhotosIcon, label: 'Photos' },
  { name: 'messages', icon: MessagesIcon, label: 'Messages' },
  { name: 'safari', icon: SafariIcon, label: 'Safari' },
  { name: 'system preferences', icon: SettingsIcon, label: 'System Preferences' },
];

export function Dock({ onOpenApp, windows }: DockProps) {
  const [dockScale, setDockScale] = useState(1);

  const hasRunningWindow = (appName: string) => {
    return windows.some(w => w.app === appName);
  };

  return (
    <div className="relative z-50 pb-2 flex justify-center">
      <div
        className="bg-white/20 backdrop-blur-2xl rounded-2xl px-2 py-2 flex items-end gap-2 border border-white/30 shadow-2xl"
        style={{
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.3)',
          transform: `scale(${dockScale})`,
          transformOrigin: 'bottom center',
          transition: 'transform 0.2s ease'
        }}
      >
        {dockApps.map((app) => {
          const Icon = app.icon;
          const isRunning = hasRunningWindow(app.name);

          return (
            <div key={app.name} className="relative group flex flex-col items-center">
              <button
                onClick={() => onOpenApp(app.name)}
                className="w-14 h-14 rounded-2xl flex items-center justify-center hover:scale-105 transition-transform duration-150 bg-transparent border-none outline-none focus:outline-none"
                title={app.label}
              >
                <Icon />
              </button>
              {isRunning && (
                <div className="absolute -bottom-1 w-1 h-1 rounded-full bg-white shadow-sm" />
              )}
              {/* Tooltip */}
              <div className="absolute bottom-[calc(100%+10px)] px-3 py-1.5 bg-gray-900/90 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-lg border border-white/10">
                {app.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}