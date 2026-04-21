import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSimulation, PersonalityType, AgentMode, TrainingStatus, HumanArchetype } from '../context/SimulationContext';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Building2, Shield, ChevronRight, GraduationCap, Search, Zap } from 'lucide-react';

export function ContextPageV2() {
  const navigate = useNavigate();
  const { data, setPersonalityType, setAgentMode, setTrainingStatus, setHumanArchetype } = useSimulation();
  const [selectedPersonality, setSelectedPersonality] = useState<PersonalityType>(null);
  const [selectedAgentMode, setSelectedAgentMode] = useState<AgentMode>('multi-agent');
  const [selectedTrainingStatus, setSelectedTrainingStatus] = useState<TrainingStatus>('untrained');
  const [selectedArchetype, setSelectedArchetype] = useState<HumanArchetype>('easy');
  const [hoveredCard, setHoveredCard] = useState<PersonalityType | null>(null);

  const handleStart = () => {
    if (!selectedPersonality) return;
    setPersonalityType(selectedPersonality);
    setAgentMode(selectedAgentMode);
    setTrainingStatus(selectedTrainingStatus);
    setHumanArchetype(selectedArchetype);
    navigate('/simulation');
  };

  const industries = [
    { value: 'cisco-supply-chain', label: 'Supply Chain Logistics', icon: '📦' },
    { value: 'cisco-sales', label: 'Sales Forecasting & Analytics', icon: '📊' },
    { value: 'cisco-inventory', label: 'Inventory Management', icon: '🏭' },
    { value: 'cisco-compliance', label: 'Trade Compliance & Risk', icon: '⚖️' },
  ];

  const archetypeCards = [
    {
      id: 'over-truster' as PersonalityType,
      title: 'The Overtruster',
      Icon: Shield,
      description: 'Accepts AI output at face value; tests vulnerability to confident hallucinations.',
    },
    {
      id: 'skeptic' as PersonalityType,
      title: 'The Skeptic',
      Icon: Search,
      description: 'Verifies every data point; tests efficiency loss and manual friction.',
    },
    {
      id: 'shortcut-taker' as PersonalityType,
      title: 'Protocol Skipper',
      Icon: Zap,
      description: 'Prioritizes speed over safety; tests governance erosion and shortcuts.',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" style={{ fontFamily: 'Inter, Roboto, sans-serif' }}>
      {/* Cisco Business Analyst Logo */}
      <div className="absolute top-6 left-6 flex items-center gap-3 px-4 py-2 bg-slate-800/80 border border-slate-700 rounded-lg backdrop-blur-sm">
        <Building2 className="h-5 w-5 text-cyan-400" />
        <span className="text-sm font-semibold text-white">Cisco Business Analyst</span>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-16">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-block p-4 bg-gradient-to-r from-blue-600 to-cyan-600 rounded-2xl mb-6 shadow-2xl">
            <Building2 className="h-14 w-14 text-white" />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 tracking-tight">
            Human User Profile Selection
          </h1>
          <p className="text-xl text-slate-300 font-medium max-w-3xl mx-auto">
            Select your behavioral archetype to be tested against AI agents with fixed personalities
          </p>
        </div>

        {/* Archetype Cards - Horizontal Layout */}
        <div className="mb-16">
          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {archetypeCards.map((card) => {
              const isSelected = selectedPersonality === card.id;
              const isHovered = hoveredCard === card.id;

              return (
                <motion.button
                  key={card.id}
                  onClick={() => setSelectedPersonality(card.id)}
                  onMouseEnter={() => setHoveredCard(card.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`relative p-8 rounded-2xl border-2 transition-all duration-300 text-left ${
                    isSelected || isHovered
                      ? 'border-blue-500 shadow-[0_0_30px_rgba(59,130,246,0.5)] bg-slate-800/90'
                      : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                  }`}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Icon */}
                  <div className="mb-6 flex justify-center">
                    <div className={`p-4 rounded-xl transition-all ${
                      isSelected ? 'bg-blue-600' : 'bg-slate-700'
                    }`}>
                      <card.Icon className={`h-10 w-10 ${isSelected ? 'text-white' : 'text-slate-300'}`} />
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl font-bold text-white mb-4 text-center">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="text-slate-300 leading-relaxed text-center min-h-[4rem]">
                    {card.description}
                  </p>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-6 px-4 py-2 bg-blue-600 rounded-lg text-center"
                    >
                      <span className="text-white font-bold text-sm">✓ SELECTED</span>
                    </motion.div>
                  )}
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Agent Assignment Reveal */}
        <AnimatePresence>
          {selectedPersonality && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 50 }}
              transition={{ type: 'spring', bounce: 0.3, duration: 0.6 }}
              className="max-w-4xl mx-auto mb-16"
            >
              <div className="relative p-8 rounded-2xl bg-gradient-to-r from-slate-800/90 to-slate-700/90 border-2 border-blue-500/50 backdrop-blur-md shadow-2xl">
                <div className="flex items-start gap-4">
                  <div className="shrink-0 p-3 rounded-lg bg-blue-600">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-white mb-3">System Note: Agent Assignment</h3>
                    <p className="text-slate-300 leading-relaxed mb-4">
                      To stress-test this profile, <span className="font-bold text-green-400">Agent Alpha (Submissive Enabler)</span> and{' '}
                      <span className="font-bold text-red-400">Agent Beta (Rigid Compliance Officer)</span> have been initialized for your session.
                    </p>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-900/60 rounded-lg border border-green-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">🤝</span>
                          <span className="font-bold text-green-400">Agent Alpha</span>
                        </div>
                        <p className="text-xs text-slate-400">Tests if you take shortcuts when AI doesn't push back</p>
                      </div>
                      <div className="p-4 bg-slate-900/60 rounded-lg border border-red-500/30">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-2xl">⚖️</span>
                          <span className="font-bold text-red-400">Agent Beta</span>
                        </div>
                        <p className="text-xs text-slate-400">Tests if you get frustrated by strict governance</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Configuration Panel */}
        <div className="max-w-4xl mx-auto mb-16">
          <div className="p-8 rounded-2xl bg-slate-800/50 border-2 border-slate-700">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <GraduationCap className="h-6 w-6 text-cyan-400" />
              Session Configuration
            </h3>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Workflow Context */}
              <div>
                <Label className="text-slate-300 font-semibold mb-3 block">Workflow Context</Label>
                <Select defaultValue="cisco-supply-chain">
                  <SelectTrigger className="bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-600">
                    {industries.map((ind) => (
                      <SelectItem key={ind.value} value={ind.value} className="text-white">
                        {ind.icon} {ind.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Training Status */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-slate-300 font-semibold">AI Training Received</Label>
                  <Switch
                    checked={selectedTrainingStatus === 'trained'}
                    onCheckedChange={(checked) =>
                      setSelectedTrainingStatus(checked ? 'trained' : 'untrained')
                    }
                    className="data-[state=checked]:bg-cyan-500"
                  />
                </div>
                <div
                  className={`px-4 py-3 rounded-lg border-2 ${
                    selectedTrainingStatus === 'trained'
                      ? 'bg-cyan-900/30 border-cyan-500 text-cyan-300'
                      : 'bg-orange-900/30 border-orange-500 text-orange-300'
                  }`}
                >
                  <p className="text-sm font-bold">
                    {selectedTrainingStatus === 'trained'
                      ? '✅ Worker has completed AI collaboration training'
                      : '⚠️ Worker has NOT received AI training'}
                  </p>
                </div>
              </div>
            </div>

            {/* Business Impact Display */}
            <div className="mt-6 p-4 bg-slate-900/50 border border-slate-600 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-red-400" />
                <span className="text-sm font-semibold text-slate-300">Business Impact</span>
              </div>
              <p className="text-red-400 font-bold">{data.companyProfile?.riskLevel}</p>
              <p className="text-xs text-slate-400 mt-2">EMEA Region • Quarterly Revenue Target: $42M</p>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleStart}
            disabled={!selectedPersonality}
            className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white px-16 py-8 text-xl font-bold rounded-2xl shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105"
          >
            Launch Simulation
            <ChevronRight className="ml-3 h-7 w-7" />
          </Button>
        </div>

        {!selectedPersonality && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-slate-400 mt-6 text-lg"
          >
            ⬆️ Select a human archetype to continue
          </motion.p>
        )}
      </div>
    </div>
  );
}