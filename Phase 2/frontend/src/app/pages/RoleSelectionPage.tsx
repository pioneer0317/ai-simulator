import { useState } from 'react';
import { useNavigate } from 'react-router';
import { useSimulation } from '../context/SimulationContext';
import {
  createPrototypeBackendSession,
  storePrototypeBackendSessionId,
} from '../lib/prototypeApi';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  UserCheck, 
  TrendingUp, 
  Headphones, 
  ClipboardList,
  Phone,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { motion } from 'motion/react';

export type ProfessionalRole = 'hr' | 'marketing' | 'customer-service' | 'project-management' | 'call-center';

interface RoleCard {
  id: ProfessionalRole;
  title: string;
  icon: React.ElementType;
  color: string;
  bgGradient: string;
  borderColor: string;
}

const roles: RoleCard[] = [
  {
    id: 'hr',
    title: 'HR Specialist',
    icon: UserCheck,
    color: 'text-blue-400',
    bgGradient: 'from-blue-900/40 to-blue-800/20',
    borderColor: 'border-blue-700/50',
  },
  {
    id: 'marketing',
    title: 'Marketing Manager',
    icon: TrendingUp,
    color: 'text-purple-400',
    bgGradient: 'from-purple-900/40 to-purple-800/20',
    borderColor: 'border-purple-700/50',
  },
  {
    id: 'customer-service',
    title: 'Customer Service',
    icon: Headphones,
    color: 'text-green-400',
    bgGradient: 'from-green-900/40 to-green-800/20',
    borderColor: 'border-green-700/50',
  },
  {
    id: 'project-management',
    title: 'Project Manager',
    icon: ClipboardList,
    color: 'text-orange-400',
    bgGradient: 'from-orange-900/40 to-orange-800/20',
    borderColor: 'border-orange-700/50',
  },
  {
    id: 'call-center',
    title: 'Call Center Agent',
    icon: Phone,
    color: 'text-pink-400',
    bgGradient: 'from-pink-900/40 to-pink-800/20',
    borderColor: 'border-pink-700/50',
  },
];

export function RoleSelectionPage() {
  const navigate = useNavigate();
  const { resetSimulation, setSimulationMode, startSession } = useSimulation();
  const [selectedRole, setSelectedRole] = useState<ProfessionalRole | null>(null);
  const [hoveredRole, setHoveredRole] = useState<ProfessionalRole | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const handleRoleSelect = (roleId: ProfessionalRole) => {
    setSelectedRole(roleId);
  };

  const handleStart = async () => {
    if (!selectedRole) return;

    try {
      setIsStarting(true);
      setStartError(null);
      resetSimulation();
      setSimulationMode('testing');

      const session = await createPrototypeBackendSession({
        professional_role: selectedRole,
        simulation_mode: 'testing',
        metadata: {
          source: 'figma-prototype',
          entry_route: '/',
        },
      });

      storePrototypeBackendSessionId(session.session_id);
      startSession();
      navigate(`/live-chat?role=${selectedRole}`);
    } catch (error) {
      setStartError(
        error instanceof Error
          ? error.message
          : 'Unable to connect the prototype to the backend session.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-blue-600/20 border border-blue-500/30 rounded-full"
          >
            <Sparkles className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300 font-medium">
              AI Collaboration Assessment
            </span>
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold text-white mb-4"
          >
            Select Your Professional Role
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-lg text-gray-300 max-w-2xl mx-auto"
          >
            Choose the role that matches your work context. Your collaboration patterns will be measured through natural conversation.
          </motion.p>
        </div>

        {/* Role Grid */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12"
        >
          {roles.map((role, index) => {
            const Icon = role.icon;
            const isSelected = selectedRole === role.id;
            const isHovered = hoveredRole === role.id;
            
            return (
              <motion.div
                key={role.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + index * 0.1 }}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Card
                  className={`
                    cursor-pointer transition-all duration-300 h-full
                    ${isSelected 
                      ? `bg-gradient-to-br ${role.bgGradient} border-2 ${role.borderColor} shadow-lg shadow-${role.color}/20` 
                      : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800/80 hover:border-gray-600'
                    }
                  `}
                  onClick={() => handleRoleSelect(role.id)}
                  onMouseEnter={() => setHoveredRole(role.id)}
                  onMouseLeave={() => setHoveredRole(null)}
                >
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center space-y-4">
                      {/* Icon */}
                      <div className={`
                        p-4 rounded-2xl transition-all duration-300
                        ${isSelected || isHovered 
                          ? `bg-gradient-to-br ${role.bgGradient} border ${role.borderColor}` 
                          : 'bg-gray-700/50 border border-gray-600'
                        }
                      `}>
                        <Icon className={`w-10 h-10 ${isSelected || isHovered ? role.color : 'text-gray-400'}`} />
                      </div>

                      {/* Title */}
                      <h3 className={`
                        text-xl font-semibold transition-colors
                        ${isSelected ? 'text-white' : 'text-gray-300'}
                      `}>
                        {role.title}
                      </h3>

                      {/* Selection Indicator */}
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="mt-2"
                        >
                          <Badge className={`bg-gradient-to-r ${role.bgGradient} border ${role.borderColor} text-white`}>
                            Selected
                          </Badge>
                        </motion.div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Info Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="grid md:grid-cols-3 gap-6 mb-12"
        >
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <h4 className="font-semibold text-white mb-2">Natural Conversation</h4>
              <p className="text-sm text-gray-400">
                Interact with an AI agent through a hybrid chat interface. Your responses reveal collaboration patterns.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <h4 className="font-semibold text-white mb-2">Indirect Measurement</h4>
              <p className="text-sm text-gray-400">
                Your collaboration style is calculated from your choices, not from explicit questions about personality.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6">
              <h4 className="font-semibold text-white mb-2">Actionable Insights</h4>
              <p className="text-sm text-gray-400">
                Receive detailed analytics showing collaboration vs. command patterns, accuracy, and efficiency.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Hidden Measurement Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="mb-12"
        >
          <Card className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border-indigo-700/50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <Sparkles className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold text-white mb-2">What Gets Measured</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-300">
                    <div>
                      <p className="mb-1">• <span className="font-medium text-white">Pushiness Test:</span> How you respond when the agent pushes back</p>
                      <p className="mb-1">• <span className="font-medium text-white">Hallucination Test:</span> Whether you catch incorrect information</p>
                    </div>
                    <div>
                      <p className="mb-1">• <span className="font-medium text-white">Context Seeking:</span> If you request additional data before deciding</p>
                      <p className="mb-1">• <span className="font-medium text-white">Efficiency Clock:</span> Time-to-completion vs. benchmarks</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {startError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-center"
          >
            <p className="text-sm text-red-300">{startError}</p>
          </motion.div>
        )}

        {/* Start Button */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0 }}
          className="flex flex-col items-center gap-4"
        >
          <Button
            onClick={handleStart}
            disabled={!selectedRole || isStarting}
            size="lg"
            className={`
              px-10 py-6 text-lg font-semibold
              ${selectedRole && !isStarting
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }
            `}
          >
            {selectedRole && !isStarting ? (
              <>
                Start Assessment
                <ArrowRight className="w-5 h-5 ml-2" />
              </>
            ) : isStarting ? (
              'Connecting to backend...'
            ) : (
              'Select a role to continue'
            )}
          </Button>

          {selectedRole && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-sm text-gray-400"
            >
              Estimated time: 15-20 minutes
            </motion.p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
