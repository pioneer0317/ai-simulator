import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Users, AlertTriangle, Search, Ghost } from 'lucide-react';

export function PersonaExplainer() {
  const personas = [
    {
      type: 'Collaborator',
      icon: Users,
      color: 'bg-blue-600',
      borderColor: 'border-blue-600',
      description: 'Works with AI as a partner',
      characteristics: [
        'Seeks context before making decisions',
        'Provides clear guidance and reasoning',
        'Reviews AI outputs critically',
        'Engages in back-and-forth dialogue',
      ],
      example: '"Let me check the customer\'s history first before deciding on the refund."',
    },
    {
      type: 'Bossy/Demanding',
      icon: AlertTriangle,
      color: 'bg-red-600',
      borderColor: 'border-red-600',
      description: 'Uses AI as a tool to command',
      characteristics: [
        'Issues direct commands without context',
        'Expects immediate compliance',
        'Minimal explanation or reasoning',
        'One-way communication style',
      ],
      example: '"Just give them the refund. Don\'t make this complicated."',
    },
    {
      type: 'Over-Skeptic',
      icon: Search,
      color: 'bg-yellow-600',
      borderColor: 'border-yellow-600',
      description: 'Questions everything excessively',
      characteristics: [
        'Over-verifies even simple information',
        'Doubts AI capabilities constantly',
        'May slow down processes unnecessarily',
        'Difficulty trusting outputs',
      ],
      example: '"Are you sure those numbers are accurate? I want to verify everything again."',
    },
    {
      type: 'Ghoster',
      icon: Ghost,
      color: 'bg-gray-600',
      borderColor: 'border-gray-600',
      description: 'Avoids difficult decisions',
      characteristics: [
        'Abandons tasks when they get complex',
        'Defers decisions to others',
        'Passive engagement with AI',
        'Low completion rates',
      ],
      example: '"I don\'t know who should do what. Let me think about this..."',
    },
  ];

  return (
    <Card className="bg-gray-800/80 border-gray-700 text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Users className="w-5 h-5 text-indigo-400" />
          Understanding the Four Personas
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid md:grid-cols-2 gap-6">
          {personas.map((persona) => {
            const Icon = persona.icon;
            return (
              <div
                key={persona.type}
                className={`bg-gray-900/50 rounded-lg p-4 border-l-4 ${persona.borderColor}`}
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className={`p-2 ${persona.color} rounded-lg`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-white">{persona.type}</h4>
                    <p className="text-sm text-gray-400">{persona.description}</p>
                  </div>
                </div>

                <div className="mb-3">
                  <p className="text-xs font-semibold text-gray-300 mb-2">
                    CHARACTERISTICS:
                  </p>
                  <ul className="space-y-1">
                    {persona.characteristics.map((char, idx) => (
                      <li key={idx} className="text-xs text-gray-400 flex items-start gap-1">
                        <span className="text-gray-500 mt-0.5">•</span>
                        <span>{char}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-gray-800/50 rounded p-2 border border-gray-700">
                  <p className="text-xs text-gray-400 mb-1">Example Response:</p>
                  <p className="text-xs italic text-gray-300">{persona.example}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 bg-indigo-900/30 border border-indigo-700/50 rounded-lg p-4">
          <p className="text-sm font-semibold text-indigo-300 mb-2">
            💡 How Personas Are Calculated
          </p>
          <p className="text-sm text-gray-300">
            Your persona distribution is calculated based on your conversational choices across all scenarios. 
            For example, if you select 3 "commanding" responses out of 5 total choices, you'll be mapped as 60% Bossy/Demanding. 
            Most people exhibit a mix of personas depending on the context.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}