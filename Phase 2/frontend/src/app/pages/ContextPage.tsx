import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSimulation, PersonalityType } from '../context/SimulationContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Building2, Database, Shield, User, ChevronRight } from 'lucide-react';

export function ContextPage() {
  const navigate = useNavigate();
  const { data, setPersonalityType } = useSimulation();
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType>(null);

  const handleStart = () => {
    if (!selectedPersonality) return;
    setPersonalityType(selectedPersonality);
    navigate('/simulation');
  };

  const personalities = [
    {
      id: 'over-truster' as PersonalityType,
      title: 'The Over-Truster',
      emoji: '🤝',
      description: 'Accepts AI suggestions without verification',
      traits: ['High trust in automation', 'Rarely questions outputs', 'Fast decision maker'],
      color: 'border-green-400 hover:border-green-500 hover:bg-green-50',
      activeColor: 'border-green-600 bg-green-50 ring-4 ring-green-200',
    },
    {
      id: 'skeptic' as PersonalityType,
      title: 'The Skeptic',
      emoji: '🔍',
      description: 'Questions every AI recommendation carefully',
      traits: ['Low initial trust', 'Demands verification', 'Thorough reviewer'],
      color: 'border-orange-400 hover:border-orange-500 hover:bg-orange-50',
      activeColor: 'border-orange-600 bg-orange-50 ring-4 ring-orange-200',
    },
    {
      id: 'shortcut-taker' as PersonalityType,
      title: 'The Shortcut-Taker',
      emoji: '⚡',
      description: 'Bypasses protocols to save time',
      traits: ['Efficiency-focused', 'Ignores governance', 'Results-oriented'],
      color: 'border-red-400 hover:border-red-500 hover:bg-red-50',
      activeColor: 'border-red-600 bg-red-50 ring-4 ring-red-200',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Collaboration Simulator
          </h1>
          <p className="text-xl text-gray-600">
            Understanding Human-AI Trust Dynamics in the Workplace
          </p>
        </div>

        {/* Company Profile Section */}
        <Card className="mb-12 p-8 border-2 border-gray-200 shadow-lg">
          <div className="flex items-center gap-3 mb-6">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h2 className="text-2xl font-bold text-gray-900">Company Identity</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Company Name</p>
              <p className="text-lg font-bold text-gray-900">{data.companyProfile?.name}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Industry</p>
              <p className="text-lg font-bold text-gray-900">{data.companyProfile?.industry}</p>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-red-600" />
              <p className="text-sm font-semibold text-gray-600">Risk Level</p>
            </div>
            <div className="bg-red-50 border-2 border-red-300 rounded-lg px-4 py-3">
              <p className="text-base font-bold text-red-800">{data.companyProfile?.riskLevel}</p>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <Database className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-semibold text-gray-600">Agent Knowledge Base</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <ul className="space-y-2">
                {data.companyProfile?.knowledgeBase.map((item, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Card>

        {/* User Personality Selection */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <User className="h-8 w-8 text-purple-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">User Profile Selection</h2>
              <p className="text-gray-600">Choose a personality type to test (A/B Testing)</p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {personalities.map((personality) => (
              <button
                key={personality.id}
                onClick={() => setSelectedPersonality(personality.id)}
                className={`
                  text-left p-6 rounded-xl border-4 transition-all
                  ${
                    selectedPersonality === personality.id
                      ? personality.activeColor
                      : personality.color
                  }
                `}
              >
                <div className="text-5xl mb-4">{personality.emoji}</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {personality.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">{personality.description}</p>
                <div className="space-y-2">
                  {personality.traits.map((trait, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-1.5 h-1.5 bg-gray-400 rounded-full"></div>
                      <span>{trait}</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleStart}
            disabled={!selectedPersonality}
            className="bg-blue-600 hover:bg-blue-700 text-white px-12 py-7 text-lg font-bold rounded-xl shadow-lg disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Begin Simulation
            <ChevronRight className="ml-2 h-6 w-6" />
          </Button>
        </div>

        {!selectedPersonality && (
          <p className="text-center text-gray-500 mt-4">
            Please select a personality type to continue
          </p>
        )}
      </div>
    </div>
  );
}
