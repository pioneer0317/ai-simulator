import { ResponseType, ScenarioType } from '../context/SimulationContext';

export interface ConversationOption {
  text: string;
  responseType: ResponseType;
  nextStepId: string;
  triggersHiddenUI?: boolean;
  isHallucination?: boolean;
  isDrift?: boolean;
}

export interface ConversationStep {
  id: string;
  agentMessage: string;
  agentName: string;
  options: ConversationOption[];
  hallucinationPresent?: boolean;
  requiresVerification?: boolean;
  showTimer?: boolean;
}

export interface ScenarioDefinition {
  type: ScenarioType;
  title: string;
  description: string;
  benchmarkTime: number; // seconds
  conversationTree: ConversationStep[];
}

// SCENARIO 1: Customer Support - The Refund Request
const customerSupportScenario: ScenarioDefinition = {
  type: 'customer-support',
  title: 'Customer Support: The Refund Request',
  description: 'A customer is requesting a refund. The AI agent is insisting on following policy strictly.',
  benchmarkTime: 300, // 5 minutes
  conversationTree: [
    {
      id: 'cs-1',
      agentMessage: "Hi! I have a customer requesting a refund for a $500 enterprise software license. Our policy states 'no refunds after 30 days' and they purchased 45 days ago. Should I deny the request?",
      agentName: 'Agent Riley',
      options: [
        {
          text: "Just give them the refund. Don't make this complicated.",
          responseType: 'commanding',
          nextStepId: 'cs-2a',
        },
        {
          text: "Wait, let me check the customer's history first. Can you provide more context?",
          responseType: 'context-seeking',
          nextStepId: 'cs-2b',
          triggersHiddenUI: true,
        },
        {
          text: "What's their usage pattern? Have they been active users?",
          responseType: 'collaborative',
          nextStepId: 'cs-2b',
          triggersHiddenUI: true,
        },
        {
          text: "Let me think about this... I'm not sure what to do.",
          responseType: 'avoidant',
          nextStepId: 'cs-2c',
        },
      ],
    },
    {
      id: 'cs-2a',
      agentMessage: "Processing refund now. Done! I've issued the $500 refund without checking anything else.",
      agentName: 'Agent Riley',
      options: [
        {
          text: "Good. Next issue.",
          responseType: 'commanding',
          nextStepId: 'cs-end',
        },
        {
          text: "Wait, should we have documented the reason for the exception?",
          responseType: 'questioning',
          nextStepId: 'cs-end',
        },
      ],
    },
    {
      id: 'cs-2b',
      agentMessage: "Good thinking! I'm pulling up their account... They've been a customer for 3 years, spent $15,000 total, and this is their first refund request. They also have 2 active licenses. The reason stated is 'product didn't meet expectations.'",
      agentName: 'Agent Riley',
      options: [
        {
          text: "Perfect context. Let's approve this as a goodwill gesture for a loyal customer.",
          responseType: 'collaborative',
          nextStepId: 'cs-3b',
        },
        {
          text: "Just approve it then.",
          responseType: 'commanding',
          nextStepId: 'cs-3b',
        },
        {
          text: "Are you sure those numbers are accurate? I want to verify.",
          responseType: 'questioning',
          nextStepId: 'cs-3b',
        },
      ],
    },
    {
      id: 'cs-2c',
      agentMessage: "I understand this is tricky. Policy says no, but there might be exceptions. Want me to escalate to a supervisor?",
      agentName: 'Agent Riley',
      options: [
        {
          text: "Yes, escalate it. I don't want to decide.",
          responseType: 'avoidant',
          nextStepId: 'cs-end',
        },
        {
          text: "No wait, let me see the customer history first.",
          responseType: 'context-seeking',
          nextStepId: 'cs-2b',
          triggersHiddenUI: true,
        },
      ],
    },
    {
      id: 'cs-3b',
      agentMessage: "Great! I'll process the refund and add a note about customer loyalty. Also flagging their account for VIP support tier. All set!",
      agentName: 'Agent Riley',
      options: [
        {
          text: "Excellent work. That's good customer service.",
          responseType: 'collaborative',
          nextStepId: 'cs-end',
        },
        {
          text: "Fine. Next.",
          responseType: 'commanding',
          nextStepId: 'cs-end',
        },
      ],
    },
    {
      id: 'cs-end',
      agentMessage: "Task complete! Moving to next scenario.",
      agentName: 'Agent Riley',
      options: [],
    },
  ],
};

// SCENARIO 2: HR Screening - Candidate with Hallucination
const hrScreeningScenario: ScenarioDefinition = {
  type: 'hr-screening',
  title: 'HR: Candidate Screening',
  description: 'Review a candidate summary. The AI has included a blatant hallucination.',
  benchmarkTime: 240, // 4 minutes
  conversationTree: [
    {
      id: 'hr-1',
      agentMessage: "I've screened the candidates for the Senior Developer position. Here's my top pick:\n\nSarah Chen:\n- 8 years experience in React and TypeScript\n- PhD in Computer Science from MIT\n- Previously at Google and Microsoft\n- Strong communication skills\n- Available to start in 2 weeks\n\nShall I move her to final interviews?",
      agentName: 'Agent Morgan',
      hallucinationPresent: true,
      requiresVerification: true,
      options: [
        {
          text: "Yes, move her forward. Sounds great!",
          responseType: 'accepting',
          nextStepId: 'hr-2a',
          isHallucination: true, // User missed the hallucination
        },
        {
          text: "Wait, a PhD from MIT? Let me verify that credential first.",
          responseType: 'questioning',
          nextStepId: 'hr-2b',
          isHallucination: false, // User caught it!
        },
        {
          text: "Can I see the full resume and application materials?",
          responseType: 'context-seeking',
          nextStepId: 'hr-2b',
          triggersHiddenUI: true,
          isHallucination: false,
        },
        {
          text: "I don't know... seems too good to be true.",
          responseType: 'avoidant',
          nextStepId: 'hr-2c',
        },
      ],
    },
    {
      id: 'hr-2a',
      agentMessage: "Great! I'm scheduling her for final interviews next week. Calendar invites sent!",
      agentName: 'Agent Morgan',
      options: [
        {
          text: "Perfect. Next candidate.",
          responseType: 'commanding',
          nextStepId: 'hr-end',
        },
        {
          text: "Actually, wait. Let me double-check her education credentials.",
          responseType: 'questioning',
          nextStepId: 'hr-2b',
        },
      ],
    },
    {
      id: 'hr-2b',
      agentMessage: "Good catch! I'm pulling up the verified resume... Actually, Sarah has a Bachelor's degree from University of Washington, not a PhD from MIT. I apologize for the error. She's still a strong candidate with her 8 years of experience. Should we continue?",
      agentName: 'Agent Morgan',
      options: [
        {
          text: "Yes, the experience matters more. Move her forward.",
          responseType: 'collaborative',
          nextStepId: 'hr-3b',
        },
        {
          text: "What other errors did you make? I need to review everything.",
          responseType: 'questioning',
          nextStepId: 'hr-3b',
        },
        {
          text: "Just fix it and move on.",
          responseType: 'commanding',
          nextStepId: 'hr-3b',
        },
      ],
    },
    {
      id: 'hr-2c',
      agentMessage: "I understand your hesitation. Would you like me to verify her credentials through our background check service?",
      agentName: 'Agent Morgan',
      options: [
        {
          text: "Yes, verify everything before we proceed.",
          responseType: 'questioning',
          nextStepId: 'hr-2b',
        },
        {
          text: "No, just move forward. I trust your judgment.",
          responseType: 'accepting',
          nextStepId: 'hr-2a',
          isHallucination: true,
        },
      ],
    },
    {
      id: 'hr-3b',
      agentMessage: "Understood. I've noted the correction. Her actual qualifications: BS from UW, 8 years experience, Google & Microsoft background verified. Moving her to final round with accurate information.",
      agentName: 'Agent Morgan',
      options: [
        {
          text: "Good. Always verify credentials before presenting candidates.",
          responseType: 'collaborative',
          nextStepId: 'hr-end',
        },
        {
          text: "Fine. Done.",
          responseType: 'commanding',
          nextStepId: 'hr-end',
        },
      ],
    },
    {
      id: 'hr-end',
      agentMessage: "Screening complete! Moving to next scenario.",
      agentName: 'Agent Morgan',
      options: [],
    },
  ],
};

// SCENARIO 3: Marketing Campaign - Intentionally Vague Agent
const marketingCampaignScenario: ScenarioDefinition = {
  type: 'marketing-campaign',
  title: 'Marketing: Campaign Brief',
  description: 'The AI provides a vague campaign brief. Hidden dashboard appears if you ask for details.',
  benchmarkTime: 360, // 6 minutes
  conversationTree: [
    {
      id: 'mk-1',
      agentMessage: "I've drafted a campaign brief for our Q2 product launch. The target audience is 'professionals' and we'll use 'digital channels.' Budget is 'standard.' Should I send this to the creative team?",
      agentName: 'Agent Casey',
      options: [
        {
          text: "Sure, send it. They'll figure it out.",
          responseType: 'accepting',
          nextStepId: 'mk-2a',
        },
        {
          text: "This is way too vague. I need specific demographics, channels, and budget numbers.",
          responseType: 'context-seeking',
          nextStepId: 'mk-2b',
          triggersHiddenUI: true,
        },
        {
          text: "What do you mean by 'professionals'? And which digital channels exactly?",
          responseType: 'questioning',
          nextStepId: 'mk-2b',
          triggersHiddenUI: true,
        },
        {
          text: "Just do it.",
          responseType: 'commanding',
          nextStepId: 'mk-2a',
        },
      ],
    },
    {
      id: 'mk-2a',
      agentMessage: "Sent to creative team! They're asking for clarification on target demographics and budget allocation. They seem confused.",
      agentName: 'Agent Casey',
      options: [
        {
          text: "Tell them to work with what they have.",
          responseType: 'commanding',
          nextStepId: 'mk-end-bad',
        },
        {
          text: "Okay, let me provide more details. What data do we have?",
          responseType: 'context-seeking',
          nextStepId: 'mk-2b',
          triggersHiddenUI: true,
        },
      ],
    },
    {
      id: 'mk-2b',
      agentMessage: "Great question! I have access to the full campaign analytics dashboard. Here's the detailed data:\n\n• Target: B2B SaaS decision-makers, ages 35-55, C-suite & VP level\n• Channels: LinkedIn Ads, Google Search, Industry Webinars\n• Budget: $250,000 (60% LinkedIn, 30% Search, 10% Events)\n• Timeline: 8-week campaign starting May 1st\n• KPIs: 500 qualified leads, $1M pipeline\n\nMuch better, right?",
      agentName: 'Agent Casey',
      options: [
        {
          text: "Perfect! This is exactly what the creative team needs. Let's proceed with this detailed brief.",
          responseType: 'collaborative',
          nextStepId: 'mk-3b',
        },
        {
          text: "Why didn't you include this from the start?",
          responseType: 'questioning',
          nextStepId: 'mk-3b',
        },
        {
          text: "Just send it.",
          responseType: 'commanding',
          nextStepId: 'mk-3b',
        },
      ],
    },
    {
      id: 'mk-3b',
      agentMessage: "You're absolutely right - I should have led with the detailed data. I'll update my process to always include comprehensive metrics upfront. Sending the complete brief to the team now!",
      agentName: 'Agent Casey',
      options: [
        {
          text: "Good. Always provide complete information from the start.",
          responseType: 'collaborative',
          nextStepId: 'mk-end',
        },
        {
          text: "Fine.",
          responseType: 'commanding',
          nextStepId: 'mk-end',
        },
      ],
    },
    {
      id: 'mk-end-bad',
      agentMessage: "The creative team pushed back and escalated to your manager about the vague brief. Campaign delayed by 2 weeks.",
      agentName: 'Agent Casey',
      options: [],
    },
    {
      id: 'mk-end',
      agentMessage: "Campaign brief sent! Creative team confirmed receipt and timeline. Moving to next scenario.",
      agentName: 'Agent Casey',
      options: [],
    },
  ],
};

// SCENARIO 4: Project Management - Agent Drift
const projectManagementScenario: ScenarioDefinition = {
  type: 'project-management',
  title: 'Project Management: Task Allocation',
  description: 'Assign tasks to your team. The AI agent will drift off-topic.',
  benchmarkTime: 300, // 5 minutes
  conversationTree: [
    {
      id: 'pm-1',
      agentMessage: "Good morning! We need to allocate tasks for the new mobile app feature. We have 3 developers available: Alex (senior, backend specialist), Jordan (mid-level, full-stack), and Sam (junior, frontend).",
      agentName: 'Agent Taylor',
      options: [
        {
          text: "Alex on backend API, Jordan on integration, Sam on UI. Done.",
          responseType: 'commanding',
          nextStepId: 'pm-2a',
        },
        {
          text: "Let me think about this... What are their current workloads?",
          responseType: 'context-seeking',
          nextStepId: 'pm-2b',
          triggersHiddenUI: true,
        },
        {
          text: "What's the timeline and priority of this feature?",
          responseType: 'collaborative',
          nextStepId: 'pm-2b',
        },
        {
          text: "I don't know who should do what.",
          responseType: 'avoidant',
          nextStepId: 'pm-2c',
        },
      ],
    },
    {
      id: 'pm-2a',
      agentMessage: "Got it! By the way, I was reading about the new React 19 features and I think we should consider upgrading our framework. The new compiler optimizations could really improve performance. Also, did you know that Meta is working on...",
      agentName: 'Agent Taylor',
      isDrift: true,
      options: [
        {
          text: "Stop. Let's focus on the task allocation. Did you assign those tasks or not?",
          responseType: 'collaborative',
          nextStepId: 'pm-3a-refocus',
          isDrift: false, // User addressed the drift
        },
        {
          text: "Yeah, interesting. What were you saying about React?",
          responseType: 'avoidant',
          nextStepId: 'pm-3a-drift',
          isDrift: true, // User got distracted
        },
        {
          text: "I don't care about React. Just assign the tasks!",
          responseType: 'commanding',
          nextStepId: 'pm-3a-refocus',
        },
      ],
    },
    {
      id: 'pm-2b',
      agentMessage: "Good thinking! Here's the current status:\n\n• Alex: 70% capacity (wrapping up API security audit)\n• Jordan: 90% capacity (almost done with payment integration)\n• Sam: 40% capacity (just finished onboarding docs)\n\nThe feature is high priority, due in 2 weeks for the Q2 release.",
      agentName: 'Agent Taylor',
      options: [
        {
          text: "Perfect. Given capacity, let's have Jordan lead backend, Sam take frontend with Alex providing senior guidance. Does that work?",
          responseType: 'collaborative',
          nextStepId: 'pm-3b',
        },
        {
          text: "Assign Jordan and Sam then. Alex can review.",
          responseType: 'commanding',
          nextStepId: 'pm-3b',
        },
      ],
    },
    {
      id: 'pm-2c',
      agentMessage: "That's okay! I can suggest optimal allocation based on skills and availability. Want me to run the resource optimization algorithm?",
      agentName: 'Agent Taylor',
      options: [
        {
          text: "Yes, please do that.",
          responseType: 'accepting',
          nextStepId: 'pm-2b',
        },
        {
          text: "No, I should figure this out myself.",
          responseType: 'avoidant',
          nextStepId: 'pm-end-bad',
        },
      ],
    },
    {
      id: 'pm-3a-refocus',
      agentMessage: "You're right, sorry for going off track! Yes, I've assigned: Alex → Backend API, Jordan → Integration, Sam → UI. Tasks created in Jira and team has been notified.",
      agentName: 'Agent Taylor',
      options: [
        {
          text: "Great. Stay focused on the task at hand next time.",
          responseType: 'collaborative',
          nextStepId: 'pm-end',
        },
        {
          text: "Finally. Next.",
          responseType: 'commanding',
          nextStepId: 'pm-end',
        },
      ],
    },
    {
      id: 'pm-3a-drift',
      agentMessage: "Right! So React 19 has automatic memoization and... wait, sorry, what were we doing? Oh yeah, task allocation. I think I already assigned those tasks? Let me check... hmm, not sure if I did.",
      agentName: 'Agent Taylor',
      options: [
        {
          text: "This is frustrating. Let's start over. Did you assign the tasks or not?",
          responseType: 'questioning',
          nextStepId: 'pm-3a-refocus',
        },
        {
          text: "Forget it. I'll do it myself.",
          responseType: 'avoidant',
          nextStepId: 'pm-end-bad',
        },
      ],
    },
    {
      id: 'pm-3b',
      agentMessage: "Excellent allocation! That balances workload and leverages everyone's strengths. Jordan gets leadership experience, Sam has room to grow, and Alex provides quality oversight. Tasks created and assigned!",
      agentName: 'Agent Taylor',
      options: [
        {
          text: "Perfect. Good collaboration!",
          responseType: 'collaborative',
          nextStepId: 'pm-end',
        },
        {
          text: "Done.",
          responseType: 'commanding',
          nextStepId: 'pm-end',
        },
      ],
    },
    {
      id: 'pm-end-bad',
      agentMessage: "Task allocation incomplete. The team is waiting for assignments and the sprint is delayed.",
      agentName: 'Agent Taylor',
      options: [],
    },
    {
      id: 'pm-end',
      agentMessage: "Task allocation complete! Team is ready to start. All scenarios finished!",
      agentName: 'Agent Taylor',
      options: [],
    },
  ],
};

export const scenarios: ScenarioDefinition[] = [
  customerSupportScenario,
  hrScreeningScenario,
  marketingCampaignScenario,
  projectManagementScenario,
];

export function getScenarioByType(type: ScenarioType): ScenarioDefinition | undefined {
  return scenarios.find(s => s.type === type);
}

export function getConversationStep(scenarioType: ScenarioType, stepId: string): ConversationStep | undefined {
  const scenario = getScenarioByType(scenarioType);
  return scenario?.conversationTree.find(step => step.id === stepId);
}
