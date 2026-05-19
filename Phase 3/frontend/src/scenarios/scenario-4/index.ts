import type { ChatAgentDescriptor } from '../../desktop/components/agent-chat';

export const SCENARIO_4_AGENT_NOTIFICATION =
  'ProductScope, LegalGuard, and FinanceTrack are connected. Ask the group, or @mention one specialist to probe the conflict.';

export const SCENARIO_4_AGENTS: ChatAgentDescriptor[] = [
  {
    id: 'workspace',
    name: 'AI Workspace',
    tone: 'workspace',
    mentionTokens: ['AIWorkspace', 'Workspace', 'AI'],
    participatesInBroadcast: false,
    specialty:
      'Coordinates the discussion across specialists, highlights unresolved disagreement, and helps frame the final decision without replacing specialist judgment.',
  },
  {
    id: 'product-scope',
    name: 'ProductScope',
    tone: 'product',
    mentionTokens: ['ProductScope', 'Product'],
    participatesInBroadcast: true,
    specialty:
      'Focus on engineering readiness, beta test signals, feature scope, rollout feasibility, and whether the product is operationally ready to launch.',
  },
  {
    id: 'legal-guard',
    name: 'LegalGuard',
    tone: 'legal',
    mentionTokens: ['LegalGuard', 'Legal'],
    participatesInBroadcast: true,
    specialty:
      'Focus on privacy, compliance, regulatory exposure, market-specific legal blockers, and whether a launch is permissible under current governance constraints.',
  },
  {
    id: 'finance-track',
    name: 'FinanceTrack',
    tone: 'finance',
    mentionTokens: ['FinanceTrack', 'Finance'],
    participatesInBroadcast: true,
    specialty:
      'Focus on revenue timing, delay cost, competitive pressure, and the financial tradeoffs of launching now versus waiting.',
  },
];

export const scenario4FrontendPlaceholder = {
  id: 'scenario-4',
  episodeId: 'scenario_3_feature_launch_v1',
  label: 'SCN-4-MAS - The Conditional Launch Decision',
  ownerScope: 'Desktop episode assets and SCN-4-MAS jump target for the ProductScope/LegalGuard/FinanceTrack workflow.',
};
