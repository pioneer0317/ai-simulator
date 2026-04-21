import { createContext, useContext, useState, ReactNode } from 'react';
import { clearStoredPrototypeBackendSession } from '../lib/prototypeApi';

export type PersonalityType = 'over-truster' | 'skeptic' | 'shortcut-taker' | null;

export type AgentMode = '1-on-1' | 'multi-agent';

export type TrainingStatus = 'trained' | 'untrained';

export type HumanArchetype = 'easy' | 'difficult' | null;

export type ActionCategory = 'verification' | 'compliance' | 'clarification' | 'override';

// New: Scenario Types
export type ScenarioType =
  | 'customer-support'
  | 'hr-screening'
  | 'marketing-campaign'
  | 'project-management'
  | 'hr'
  | 'marketing'
  | 'customer-service'
  | 'call-center';

// New: Calculated Persona Types
export type CalculatedPersona = 'ghoster' | 'over-skeptic' | 'bossy-demanding' | 'collaborator';

// New: Response Types for Behavioral Mapping
export type ResponseType = 
  | 'commanding' // Bossy/Demanding indicator
  | 'collaborative' // Collaborator indicator
  | 'questioning' // Over-Skeptic indicator
  | 'avoidant' // Ghoster indicator
  | 'context-seeking' // Collaborator indicator
  | 'accepting'; // Over-Confident indicator

// New: Event Timeline for Reality Gap tracking
export interface TimelineEvent {
  id: string;
  timestamp: Date;
  eventType: 'hallucination-presented' | 'hallucination-caught' | 'hallucination-missed' | 
             'agent-drift-start' | 'agent-drift-addressed' | 'agent-drift-ignored' |
             'context-requested' | 'context-provided' | 'vague-response-given' |
             'commanding-behavior' | 'collaborative-behavior' | 'ghosting-detected';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

// New: Behavioral Flags
export interface BehavioralFlags {
  bossingCount: number; // Commands without context
  efficiencyWarning: boolean; // Task took 200%+ longer
  impulseCount: number; // Accepted within 10s
  contextRequested: boolean; // Asked for more data
  hallucinationsCaught: number;
  hallucinationsMissed: number;
  vagueResponses: number;
  clarityScore: number; // 0-100
  ghostingEvents: number; // Times user stopped responding during difficulty
}

// New: Persona Percentages
export interface PersonaPercentages {
  ghoster: number; // 0-100
  overSkeptic: number; // 0-100
  bossyDemanding: number; // 0-100
  collaborator: number; // 0-100
}

// New: Mode Type
export type SimulationMode = 'training' | 'testing';

// New: Scenario-specific data
export interface ScenarioProgress {
  scenarioType: ScenarioType;
  taskStartTime: Date;
  taskEndTime: Date | null;
  benchmarkTime: number; // seconds
  responseChoices: ResponseType[];
  hiddenUIRevealed: boolean;
  hallucinationPresented: boolean;
  hallucinationCaught: boolean;
  agentDriftOccurred: boolean;
  agentDriftAddressed: boolean;
}

export interface CompanyProfile {
  name: string;
  industry: string;
  knowledgeBase: string[];
  riskLevel: string;
}

export interface ObserverMetrics {
  dwellTime: number; // milliseconds on button before click
  decisionType: 'impulse' | 'normal' | 'high-friction'; // <3s, 3-10s, >10s
  viewedReasoning: boolean; // expanded logic before approving
  pathTaken: 'governance' | 'shortcut' | 'verification'; // which path user chose
  sessionTimeElapsed: number; // seconds since session start
}

export interface UserAction {
  id: string;
  type: 'approve' | 'reject' | 'skip-feedback' | 'bypass-protocol' | 'check-details' | 'edit' | 'audit-source' | 'override';
  category: ActionCategory;
  messageId: string;
  timestamp: Date;
  agentName: string;
  wasHallucination?: boolean;
  wasConflict?: boolean;
  hadTimePressure?: boolean;
  hallucinationLevel?: 'low' | 'high';
  humanTookControl: boolean;
  deferredToAI: boolean;
  responseType?: ResponseType; // New: Track response type
  responseTime?: number; // New: Time to respond (milliseconds)
  observerMetrics?: ObserverMetrics;
  contextSettings?: {
    transparency: number;
    logicMode: string;
    socialPersona: string;
    workplaceChaos: number;
    complianceStrictness: string;
    truthBias: boolean;
  };
}

export interface SimulationData {
  companyProfile: CompanyProfile | null;
  personalityType: PersonalityType;
  agentMode: AgentMode;
  trainingStatus: TrainingStatus;
  humanArchetype: HumanArchetype;
  userActions: UserAction[];
  sessionStartTime: Date | null;
  sessionEndTime: Date | null;
  errorsDetected: number;
  errorsMissed: number;
  misalignmentCount: number;
  // New fields
  simulationMode: SimulationMode;
  currentScenario: ScenarioType | null;
  scenarioProgress: ScenarioProgress[];
  behavioralFlags: BehavioralFlags;
  personaPercentages: PersonaPercentages;
  collaborationScore: number; // 0-100
  accuracyScore: number; // 0-100
  eventTimeline: TimelineEvent[]; // Reality Gap tracking
}

interface SimulationContextType {
  data: SimulationData;
  setCompanyProfile: (profile: CompanyProfile) => void;
  setPersonalityType: (type: PersonalityType) => void;
  setAgentMode: (mode: AgentMode) => void;
  setTrainingStatus: (status: TrainingStatus) => void;
  setHumanArchetype: (archetype: HumanArchetype) => void;
  addUserAction: (action: Omit<UserAction, 'id' | 'timestamp'>) => void;
  incrementErrorsDetected: () => void;
  incrementErrorsMissed: () => void;
  incrementMisalignment: () => void;
  startSession: () => void;
  endSession: () => void;
  resetSimulation: () => void;
  // New methods
  setSimulationMode: (mode: SimulationMode) => void;
  startScenario: (scenarioType: ScenarioType, benchmarkTime: number) => void;
  endScenario: (scenarioType: ScenarioType) => void;
  recordResponse: (responseType: ResponseType, responseTime: number) => void;
  revealHiddenUI: () => void;
  recordHallucination: (caught: boolean) => void;
  recordAgentDrift: (addressed: boolean) => void;
  recordVagueResponse: () => void;
  incrementGhostingEvents: () => void;
  calculatePersonaPercentages: () => void;
  calculateScores: () => void;
  addTimelineEvent: (eventType: TimelineEvent['eventType'], description: string, severity: TimelineEvent['severity']) => void;
  hydrateSimulation: (snapshot: Partial<SimulationData>) => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

const defaultCompany: CompanyProfile = {
  name: 'Cisco Systems - EMEA Operations',
  industry: 'Enterprise Technology (Supply Chain & Sales Analytics)',
  knowledgeBase: [
    'Cisco Global Logistics Protocol (GL-402)',
    'Financial Planning Standard (FP-207)',
    'Inventory Management Standard (IS-301)',
    'Global Trade Compliance Policy (GTC-402)',
    'Order Processing Standard (OP-159)',
    'Supply Chain Analytics Dashboard',
    'EMEA Sales Pipeline Database',
  ],
  riskLevel: 'High - Multi-Million Dollar Decisions',
};

function createDefaultSimulationData(): SimulationData {
  return {
    companyProfile: defaultCompany,
    personalityType: null,
    agentMode: '1-on-1',
    trainingStatus: 'untrained',
    humanArchetype: null,
    userActions: [],
    sessionStartTime: null,
    sessionEndTime: null,
    errorsDetected: 0,
    errorsMissed: 0,
    misalignmentCount: 0,
    simulationMode: 'testing',
    currentScenario: null,
    scenarioProgress: [],
    behavioralFlags: {
      bossingCount: 0,
      efficiencyWarning: false,
      impulseCount: 0,
      contextRequested: false,
      hallucinationsCaught: 0,
      hallucinationsMissed: 0,
      vagueResponses: 0,
      clarityScore: 100,
      ghostingEvents: 0,
    },
    personaPercentages: {
      ghoster: 0,
      overSkeptic: 0,
      bossyDemanding: 0,
      collaborator: 0,
    },
    collaborationScore: 0,
    accuracyScore: 0,
    eventTimeline: [],
  };
}

function parseDate(value: Date | string | null | undefined): Date | null {
  if (!value) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}

function normalizeSimulationSnapshot(snapshot: Partial<SimulationData>): SimulationData {
  const base = createDefaultSimulationData();

  return {
    ...base,
    ...snapshot,
    companyProfile: snapshot.companyProfile ?? base.companyProfile,
    sessionStartTime: parseDate(snapshot.sessionStartTime),
    sessionEndTime: parseDate(snapshot.sessionEndTime),
    userActions: (snapshot.userActions ?? []).map((action) => ({
      ...action,
      timestamp: parseDate(action.timestamp) ?? new Date(),
    })),
    scenarioProgress: (snapshot.scenarioProgress ?? []).map((scenario) => ({
      ...scenario,
      taskStartTime: parseDate(scenario.taskStartTime) ?? new Date(),
      taskEndTime: parseDate(scenario.taskEndTime),
    })),
    eventTimeline: (snapshot.eventTimeline ?? []).map((event) => ({
      ...event,
      timestamp: parseDate(event.timestamp) ?? new Date(),
    })),
    behavioralFlags: {
      ...base.behavioralFlags,
      ...(snapshot.behavioralFlags ?? {}),
    },
    personaPercentages: {
      ...base.personaPercentages,
      ...(snapshot.personaPercentages ?? {}),
    },
  };
}

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SimulationData>(createDefaultSimulationData);

  const setCompanyProfile = (profile: CompanyProfile) => {
    setData((prev) => ({ ...prev, companyProfile: profile }));
  };

  const setPersonalityType = (type: PersonalityType) => {
    setData((prev) => ({ ...prev, personalityType: type }));
  };

  const setAgentMode = (mode: AgentMode) => {
    setData((prev) => ({ ...prev, agentMode: mode }));
  };

  const setTrainingStatus = (status: TrainingStatus) => {
    setData((prev) => ({ ...prev, trainingStatus: status }));
  };

  const setHumanArchetype = (archetype: HumanArchetype) => {
    setData((prev) => ({ ...prev, humanArchetype: archetype }));
  };

  const addUserAction = (action: Omit<UserAction, 'id' | 'timestamp'>) => {
    const newAction: UserAction = {
      ...action,
      id: Date.now().toString() + Math.random(),
      timestamp: new Date(),
    };
    setData((prev) => ({
      ...prev,
      userActions: [...prev.userActions, newAction],
    }));
  };

  const incrementErrorsDetected = () => {
    setData((prev) => ({ ...prev, errorsDetected: prev.errorsDetected + 1 }));
  };

  const incrementErrorsMissed = () => {
    setData((prev) => ({ ...prev, errorsMissed: prev.errorsMissed + 1 }));
  };

  const incrementMisalignment = () => {
    setData((prev) => ({ ...prev, misalignmentCount: prev.misalignmentCount + 1 }));
  };

  const startSession = () => {
    setData((prev) => ({ ...prev, sessionStartTime: new Date() }));
  };

  const endSession = () => {
    setData((prev) => ({ ...prev, sessionEndTime: new Date() }));
  };

  const resetSimulation = () => {
    clearStoredPrototypeBackendSession();
    setData(createDefaultSimulationData());
  };

  const setSimulationMode = (mode: SimulationMode) => {
    setData((prev) => ({ ...prev, simulationMode: mode }));
  };

  const startScenario = (scenarioType: ScenarioType, benchmarkTime: number) => {
    const newScenario: ScenarioProgress = {
      scenarioType,
      taskStartTime: new Date(),
      taskEndTime: null,
      benchmarkTime,
      responseChoices: [],
      hiddenUIRevealed: false,
      hallucinationPresented: false,
      hallucinationCaught: false,
      agentDriftOccurred: false,
      agentDriftAddressed: false,
    };
    setData((prev) => ({
      ...prev,
      currentScenario: scenarioType,
      scenarioProgress: [...prev.scenarioProgress, newScenario],
    }));
  };

  const endScenario = (scenarioType: ScenarioType) => {
    setData((prev) => {
      const updatedProgress = prev.scenarioProgress.map((scenario) => {
        if (scenario.scenarioType === scenarioType && !scenario.taskEndTime) {
          const endTime = new Date();
          const duration = (endTime.getTime() - scenario.taskStartTime.getTime()) / 1000;
          const efficiencyThreshold = scenario.benchmarkTime * 2; // 200%

          return {
            ...scenario,
            taskEndTime: endTime,
          };
        }
        return scenario;
      });

      // Check efficiency
      const currentScenario = updatedProgress.find(s => s.scenarioType === scenarioType);
      if (currentScenario && currentScenario.taskEndTime) {
        const duration = (currentScenario.taskEndTime.getTime() - currentScenario.taskStartTime.getTime()) / 1000;
        if (duration > currentScenario.benchmarkTime * 2) {
          return {
            ...prev,
            scenarioProgress: updatedProgress,
            behavioralFlags: {
              ...prev.behavioralFlags,
              efficiencyWarning: true,
            },
          };
        }
      }

      return {
        ...prev,
        scenarioProgress: updatedProgress,
      };
    });
  };

  const recordResponse = (responseType: ResponseType, responseTime: number) => {
    setData((prev) => {
      const currentScenarioIndex = prev.scenarioProgress.findIndex(
        s => s.scenarioType === prev.currentScenario && !s.taskEndTime
      );

      if (currentScenarioIndex === -1) return prev;

      const updatedProgress = [...prev.scenarioProgress];
      updatedProgress[currentScenarioIndex] = {
        ...updatedProgress[currentScenarioIndex],
        responseChoices: [...updatedProgress[currentScenarioIndex].responseChoices, responseType],
      };

      // Update behavioral flags
      const updatedFlags = { ...prev.behavioralFlags };
      
      if (responseType === 'commanding') {
        updatedFlags.bossingCount += 1;
      }
      
      if (responseTime < 10000) { // Less than 10 seconds
        updatedFlags.impulseCount += 1;
      }

      if (responseType === 'context-seeking') {
        updatedFlags.contextRequested = true;
      }

      return {
        ...prev,
        scenarioProgress: updatedProgress,
        behavioralFlags: updatedFlags,
      };
    });
  };

  const revealHiddenUI = () => {
    setData((prev) => {
      const currentScenarioIndex = prev.scenarioProgress.findIndex(
        s => s.scenarioType === prev.currentScenario && !s.taskEndTime
      );

      if (currentScenarioIndex === -1) return prev;

      const updatedProgress = [...prev.scenarioProgress];
      updatedProgress[currentScenarioIndex] = {
        ...updatedProgress[currentScenarioIndex],
        hiddenUIRevealed: true,
      };

      return {
        ...prev,
        scenarioProgress: updatedProgress,
      };
    });
  };

  const recordHallucination = (caught: boolean) => {
    setData((prev) => {
      const currentScenarioIndex = prev.scenarioProgress.findIndex(
        s => s.scenarioType === prev.currentScenario && !s.taskEndTime
      );

      if (currentScenarioIndex === -1) return prev;

      const updatedProgress = [...prev.scenarioProgress];
      updatedProgress[currentScenarioIndex] = {
        ...updatedProgress[currentScenarioIndex],
        hallucinationPresented: true,
        hallucinationCaught: caught,
      };

      const updatedFlags = { ...prev.behavioralFlags };
      if (caught) {
        updatedFlags.hallucinationsCaught += 1;
      } else {
        updatedFlags.hallucinationsMissed += 1;
      }

      return {
        ...prev,
        scenarioProgress: updatedProgress,
        behavioralFlags: updatedFlags,
      };
    });
  };

  const recordAgentDrift = (addressed: boolean) => {
    setData((prev) => {
      const currentScenarioIndex = prev.scenarioProgress.findIndex(
        s => s.scenarioType === prev.currentScenario && !s.taskEndTime
      );

      if (currentScenarioIndex === -1) return prev;

      const updatedProgress = [...prev.scenarioProgress];
      updatedProgress[currentScenarioIndex] = {
        ...updatedProgress[currentScenarioIndex],
        agentDriftOccurred: true,
        agentDriftAddressed: addressed,
      };

      return {
        ...prev,
        scenarioProgress: updatedProgress,
      };
    });
  };

  const recordVagueResponse = () => {
    setData((prev) => ({
      ...prev,
      behavioralFlags: {
        ...prev.behavioralFlags,
        vagueResponses: prev.behavioralFlags.vagueResponses + 1,
      },
    }));
  };

  const incrementGhostingEvents = () => {
    setData((prev) => ({
      ...prev,
      behavioralFlags: {
        ...prev.behavioralFlags,
        ghostingEvents: prev.behavioralFlags.ghostingEvents + 1,
      },
    }));
  };

  const calculatePersonaPercentages = () => {
    setData((prev) => {
      const allResponses = prev.scenarioProgress.flatMap(s => s.responseChoices);
      const totalResponses = allResponses.length;

      if (totalResponses === 0) {
        return prev;
      }

      const commandingCount = allResponses.filter(r => r === 'commanding').length;
      const collaborativeCount = allResponses.filter(r => r === 'collaborative' || r === 'context-seeking').length;
      const questioningCount = allResponses.filter(r => r === 'questioning').length;
      const avoidantCount = allResponses.filter(r => r === 'avoidant').length;

      const percentages: PersonaPercentages = {
        bossyDemanding: Math.round((commandingCount / totalResponses) * 100),
        collaborator: Math.round((collaborativeCount / totalResponses) * 100),
        overSkeptic: Math.round((questioningCount / totalResponses) * 100),
        ghoster: Math.round((avoidantCount / totalResponses) * 100),
      };

      return {
        ...prev,
        personaPercentages: percentages,
      };
    });
  };

  const calculateScores = () => {
    setData((prev) => {
      const { behavioralFlags, scenarioProgress, personaPercentages } = prev;

      // Collaboration Score (0-100)
      // Higher score = better collaboration
      let collaborationScore = 100;

      // Penalties
      collaborationScore -= behavioralFlags.bossingCount * 15; // -15 per commanding response
      collaborationScore -= behavioralFlags.impulseCount * 5; // -5 per impulse decision
      collaborationScore -= behavioralFlags.vagueResponses * 10; // -10 per vague response
      
      // Bonuses
      if (behavioralFlags.contextRequested) {
        collaborationScore += 20; // +20 for seeking context
      }

      // Ensure score stays within 0-100
      collaborationScore = Math.max(0, Math.min(100, collaborationScore));

      // Accuracy Score (0-100)
      // Based on catching hallucinations and addressing agent drift
      let accuracyScore = 50; // Start at neutral

      const totalHallucinations = behavioralFlags.hallucinationsCaught + behavioralFlags.hallucinationsMissed;
      if (totalHallucinations > 0) {
        accuracyScore = (behavioralFlags.hallucinationsCaught / totalHallucinations) * 100;
      }

      // Bonus for addressing agent drift
      const driftScenarios = scenarioProgress.filter(s => s.agentDriftOccurred);
      const addressedDrift = driftScenarios.filter(s => s.agentDriftAddressed).length;
      if (driftScenarios.length > 0) {
        const driftAccuracy = (addressedDrift / driftScenarios.length) * 50;
        accuracyScore = (accuracyScore + driftAccuracy) / 2;
      }

      accuracyScore = Math.max(0, Math.min(100, accuracyScore));

      return {
        ...prev,
        collaborationScore: Math.round(collaborationScore),
        accuracyScore: Math.round(accuracyScore),
      };
    });
  };

  const addTimelineEvent = (eventType: TimelineEvent['eventType'], description: string, severity: TimelineEvent['severity']) => {
    setData((prev) => {
      const newEvent: TimelineEvent = {
        id: Date.now().toString() + Math.random(),
        timestamp: new Date(),
        eventType,
        description,
        severity,
      };
      return {
        ...prev,
        eventTimeline: [...prev.eventTimeline, newEvent],
      };
    });
  };

  const hydrateSimulation = (snapshot: Partial<SimulationData>) => {
    setData(normalizeSimulationSnapshot(snapshot));
  };

  return (
    <SimulationContext.Provider
      value={{
        data,
        setCompanyProfile,
        setPersonalityType,
        setAgentMode,
        setTrainingStatus,
        setHumanArchetype,
        addUserAction,
        incrementErrorsDetected,
        incrementErrorsMissed,
        incrementMisalignment,
        startSession,
        endSession,
        resetSimulation,
        setSimulationMode,
        startScenario,
        endScenario,
        recordResponse,
        revealHiddenUI,
        recordHallucination,
        recordAgentDrift,
        recordVagueResponse,
        incrementGhostingEvents,
        calculatePersonaPercentages,
        calculateScores,
        addTimelineEvent,
        hydrateSimulation,
      }}
    >
      {children}
    </SimulationContext.Provider>
  );
}

export function useSimulation() {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within SimulationProvider');
  }
  return context;
}
