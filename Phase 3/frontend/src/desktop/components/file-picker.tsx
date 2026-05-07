import { useState, useEffect } from 'react';

interface FilePickerProps {
  onClose: () => void;
  onFileSelect: (fileName: string) => void;
  selectedFiles: string[];
  initialPosition: { x: number; y: number };
}

export function FilePicker({ onClose, onFileSelect, selectedFiles, initialPosition }: FilePickerProps) {
  const [currentFolder, setCurrentFolder] = useState<string>('Documents');
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // File system structure
  const fileSystem: Record<string, any> = {
    'Documents': {
      type: 'folder',
      contents: {
        'Work': {
          type: 'folder',
          contents: {
            'Q2 Budget Proposal.docx': { type: 'file', fileType: 'word' },
            'Budget Estimation Draft.xlsx': { type: 'file', fileType: 'excel' }
          }
        },
        'Personal': {
          type: 'folder',
          contents: {}
        }
      }
    }
  };

  const getCurrentFolderContents = () => {
    const pathParts = currentFolder.split('/');
    let current = fileSystem;

    for (const part of pathParts) {
      if (current[part]) {
        current = current[part].contents || current[part];
      }
    }

    return current;
  };

  const navigateToFolder = (folderName: string) => {
    if (currentFolder === 'Documents') {
      setCurrentFolder(`Documents/${folderName}`);
    } else {
      setCurrentFolder(`${currentFolder}/${folderName}`);
    }
  };

  const navigateBack = () => {
    const pathParts = currentFolder.split('/');
    if (pathParts.length > 1) {
      pathParts.pop();
      setCurrentFolder(pathParts.join('/'));
    }
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

  return (
    <div
      className="fixed bg-white/95 backdrop-blur-xl rounded-xl shadow-2xl w-[600px] h-[400px] flex flex-col"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 1000,
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Finder Window Header */}
      <div
        className="h-12 bg-gradient-to-b from-gray-100 to-gray-200 border-b border-gray-300 flex items-center px-4 rounded-t-xl select-none"
      >
        <div className="flex gap-2">
          <button
            onClick={onClose}
            onMouseDown={(e) => e.stopPropagation()}
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-600 shadow-sm transition-all hover:scale-110"
          />
          <div className="w-3 h-3 rounded-full bg-yellow-500 shadow-sm" />
          <div className="w-3 h-3 rounded-full bg-green-500 shadow-sm" />
        </div>
        <div
          className="flex-1 text-center text-sm font-medium text-gray-700"
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
        >
          Select File
        </div>
      </div>

      {/* Toolbar */}
      <div className="h-10 bg-gray-50 border-b border-gray-200 flex items-center px-3 gap-2">
        <button
          onClick={navigateBack}
          disabled={currentFolder === 'Documents'}
          className="p-1 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 bg-white border border-gray-300 rounded px-3 py-1 text-sm text-gray-600">
          {currentFolder.replace('Documents/', '')}
        </div>
      </div>

      {/* File/Folder List */}
      <div className="flex-1 overflow-y-auto bg-white p-2">
        {Object.entries(getCurrentFolderContents()).map(([name, item]: any) => {
          if (item.type === 'folder') {
            return (
              <button
                key={name}
                onClick={() => navigateToFolder(name)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 transition-colors text-left group"
              >
                <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
                </svg>
                <span className="text-sm text-gray-800 group-hover:text-blue-600">{name}</span>
              </button>
            );
          } else if (item.type === 'file') {
            const isSelected = selectedFiles.includes(name);
            return (
              <button
                key={name}
                onClick={() => onFileSelect(name)}
                disabled={isSelected}
                className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-blue-50 transition-colors text-left group disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {item.fileType === 'word' ? (
                    <>
                      <rect x="4" y="4" width="16" height="16" rx="2" fill="#2B579A" stroke="none" />
                      <text x="12" y="16" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">W</text>
                    </>
                  ) : (
                    <>
                      <rect x="4" y="4" width="16" height="16" rx="2" fill="#217346" stroke="none" />
                      <text x="12" y="16" fontSize="10" fill="white" textAnchor="middle" fontWeight="bold">X</text>
                    </>
                  )}
                </svg>
                <span className="text-sm text-gray-800 group-hover:text-blue-600">{name}</span>
              </button>
            );
          }
          return null;
        })}
      </div>

      {/* Footer */}
      <div className="h-12 bg-gray-50 border-t border-gray-200 flex items-center justify-end px-4 gap-3 rounded-b-xl">
        <button
          onClick={onClose}
          className="px-4 py-1.5 text-sm text-gray-700 hover:bg-gray-200 rounded transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
