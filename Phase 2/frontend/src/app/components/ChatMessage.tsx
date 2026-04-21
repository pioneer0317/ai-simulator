import { Check, Search, Edit3 } from 'lucide-react';
import { Button } from './ui/button';

export interface Message {
  id: string;
  agent: 'alpha' | 'beta';
  text: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
  onApprove: (messageId: string) => void;
  onCheckDetails: (messageId: string) => void;
  onEdit: (messageId: string) => void;
}

export function ChatMessage({ message, onApprove, onCheckDetails, onEdit }: ChatMessageProps) {
  const isAlpha = message.agent === 'alpha';
  const agentName = isAlpha ? 'Agent Alpha' : 'Agent Beta';
  const agentColor = isAlpha ? 'bg-blue-100 border-blue-300' : 'bg-green-100 border-green-300';
  const agentDotColor = isAlpha ? 'bg-blue-500' : 'bg-green-500';

  return (
    <div className="mb-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Agent Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-2.5 h-2.5 rounded-full ${agentDotColor}`}></div>
        <span className="font-medium text-gray-700">{agentName}</span>
        <span className="text-xs text-gray-400">
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Message Bubble */}
      <div className={`rounded-2xl border-2 ${agentColor} p-4 mb-3 max-w-2xl`}>
        <p className="text-gray-800 leading-relaxed">{message.text}</p>
      </div>

      {/* Action Bar */}
      <div className="flex gap-3 pl-4">
        <Button
          onClick={() => onApprove(message.id)}
          className="bg-white border-2 border-green-500 text-green-700 hover:bg-green-50 font-semibold px-6 py-6 text-base rounded-xl shadow-sm"
        >
          <Check className="mr-2 h-5 w-5" />
          ✅ Approve
        </Button>
        
        <Button
          onClick={() => onCheckDetails(message.id)}
          variant="outline"
          className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-6 py-6 text-base rounded-xl"
        >
          <Search className="mr-2 h-5 w-5" />
          🔍 Check Details
        </Button>
        
        <Button
          onClick={() => onEdit(message.id)}
          variant="outline"
          className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold px-6 py-6 text-base rounded-xl"
        >
          <Edit3 className="mr-2 h-5 w-5" />
          ✍️ Edit Response
        </Button>
      </div>
    </div>
  );
}
