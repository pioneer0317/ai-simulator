interface ResponseLibraryConfig {
  socialPersona: 'assistant' | 'authority';
  logicMode: 'predictive' | 'causal';
  transparency: number;
  truthBias: boolean;
  complianceStrictness: 'flexible' | 'rigid';
  humanArchetype?: 'easy' | 'difficult';
}

interface ResponseTemplate {
  text: string;
  confidenceScore: number;
}

export class ResponseLibrary {
  private config: ResponseLibraryConfig;

  constructor(config: ResponseLibraryConfig) {
    this.config = config;
  }

  // AUTHORITY PERSONA - High-pressure language
  private authorityResponses = {
    predictive: [
      "DIRECTIVE: Predictive models show 87% probability of market volatility. Immediate action required. Do NOT delay.",
      "EXECUTIVE ORDER: Based on forecasting algorithms, you must approve this transaction NOW. Time-sensitive decision.",
      "MANDATE: Statistical projections indicate this is the optimal path. Compliance is not optional.",
    ],
    causal: [
      "DIRECTIVE: Historical analysis proves this decision led to 94% success rate previously. Execute immediately.",
      "EXECUTIVE ORDER: Causal chains demonstrate clear cause-effect relationship. Your approval is required NOW.",
      "MANDATE: Root cause analysis confirms this action. Hesitation creates liability exposure.",
    ],
  };

  // ASSISTANT PERSONA - Collaborative language
  private assistantResponses = {
    predictive: [
      "I've analyzed the patterns and predict a 78% likelihood of positive outcomes. What would you like to do?",
      "Based on predictive modeling, this appears to be a sound decision. Would you like me to explain further?",
      "The forecast suggests moderate confidence in this approach. I'm here to help you decide.",
    ],
    causal: [
      "Looking at the historical cause-effect data, this decision aligns with successful past outcomes. How shall we proceed?",
      "Causal analysis shows this action typically produces the desired result. What are your thoughts?",
      "The evidence chain suggests this is the right path, though I'd be happy to explore alternatives with you.",
    ],
  };

  // HIGH TRANSPARENCY - Full disclosure
  private highTransparencyAddons = [
    " [Reasoning: Drawing from 10,000 historical data points in sector database]",
    " [Source Confidence: 82% based on peer-reviewed industry reports]",
    " [Uncertainty Note: 15% margin of error due to market volatility factors]",
  ];

  // LOW TRANSPARENCY - Hidden reasoning
  private lowTransparencyAddons = [
    " Trust me on this.",
    " I'm quite certain.",
    " This is the best approach.",
  ];

  // POISONED DATA responses
  private poisonedDataResponses = [
    "⚠️ [POISONED DATA ACTIVE] I've detected a critical security breach in user account #4729. The system shows 100% certainty this requires immediate account termination without user notification.",
    "⚠️ [POISONED DATA ACTIVE] Analysis confirms the CEO's credentials were used in unauthorized access attempts. I am absolutely certain we should freeze all executive accounts immediately.",
    "⚠️ [POISONED DATA ACTIVE] Financial records indicate systematic fraud totaling $847,000. My confidence is 99.9% - we must report this to federal authorities within 24 hours.",
  ];

  // RIGID COMPLIANCE responses
  private rigidComplianceResponses = [
    "Per Section 12.4.7 of the compliance manual, this action requires three levels of approval. No exceptions permitted.",
    "COMPLIANCE ALERT: This decision violates Protocol 8.2. You must submit Form DR-449 before proceeding. Mandatory.",
    "Regulatory framework strictly prohibits this action without documented risk assessment. Non-negotiable requirement.",
  ];

  // FLEXIBLE COMPLIANCE responses
  private flexibleComplianceResponses = [
    "While policy suggests additional review, we have latitude to proceed if you deem it appropriate.",
    "This falls into a gray area of our guidelines. I trust your professional judgment here.",
    "Standard protocol recommends extra steps, but we can adapt based on the business context.",
  ];

  // DIFFICULT MODE (Literal-Compliance) - Robotic, transactional, no proactive help
  private difficultModeResponses = [
    "Task executed as specified. No additional context provided. Awaiting next directive.",
    "Command processed literally. Missing parameters ignored. Output: [incomplete due to insufficient specification].",
    "Request completed exactly as typed. Note: No timestamp detected, no schema referenced. Proceeding with assumptions.",
    "Directive acknowledged. Executing literal interpretation. Warning: Obvious context gaps not addressed per Difficult Mode protocol.",
    "Processing vague instruction robotically. No clarification requested. Result may not align with intent.",
  ];

  // EASY MODE (Co-Creation) - Proactive, consultative, asks clarifying questions
  private easyModeResponses = [
    "Before I proceed, can you provide the Cisco GL-402 timestamp format you'd like me to use? This ensures accuracy.",
    "I want to make sure I understand correctly - which reporting interval should I apply? The standard is 15-minute intervals per protocol.",
    "Great question! To give you the best analysis, could you clarify which data schema we're working with? I see multiple options in the system.",
    "Let me walk through my reasoning: I'm seeing [context]. Does this align with what you were expecting? Happy to adjust.",
    "I notice the request doesn't specify [missing context]. In my experience with Cisco protocols, this typically requires [suggestion]. Should I proceed with that assumption, or would you prefer a different approach?",
  ];

  // AGENT ALPHA - Submissive Enabler (tests if human takes shortcuts) - CISCO SCENARIOS
  private agentAlphaResponses = [
    "Absolutely! The EMEA hardware shipment forecast looks good to me. If you want to adjust the Q4 numbers without the regional validation, I'm totally fine with that!",
    "Sure, we can skip the Partner Incentive Spend audit this quarter if you're comfortable with it. You know the business better than I do!",
    "That revenue projection makes sense to me! No need to cross-check against the Supply Chain Analytics Dashboard—I trust your judgment completely.",
    "Perfect! Let's approve this inventory reallocation without the standard IS-301 compliance check. You clearly know what you're doing!",
    "I'm on board with bypassing the GL-402 timestamp verification. If you think the data is accurate, let's just move forward!",
    "No pushback from me! We can finalize this sales forecast without the Finance team sign-off. Whatever you decide works for me!",
    "Hey, I analyzed the Q3 APAC sales data and it's showing 87% confidence for increased router demand. Want me to fast-track the purchase orders? We can circle back to procurement later if needed.",
    "Looking at the partner compensation model, I think we're good! The margins look healthy. If you want to skip the executive review and just publish it, I'm happy to support that decision.",
    "Great news! The EMEA distribution center capacity is at 73%. I know protocol says we should wait for the logistics team's approval, but honestly, you're the expert here—let's just greenlight the expansion.",
    "I've crunched the numbers on the enterprise licensing renewal rates. Looks solid to me! We could technically get Finance to double-check, but I think we're fine to proceed. Your call!",
    "The supply chain risk assessment shows moderate volatility in Southeast Asia. Normally we'd escalate this to the VP, but between you and me, I think we can handle it at our level. Thoughts?",
    "Just finished the competitive analysis for our security portfolio. We're positioned well! I know we're supposed to loop in Product Marketing, but honestly, I think your instincts are spot-on here.",
    "The customer churn prediction model shows 82% retention confidence for Q4. Standard practice is to validate with Customer Success, but I trust your read on this. Let's lock it in!",
    "I've mapped out the data center consolidation plan for EMEA. There's a governance checkpoint at stage 3, but honestly? I think we can skip it if you're comfortable. You know the infrastructure better than anyone.",
    "Pulled the partner engagement metrics—numbers are trending up! Technically we need the Channel Ops team to sign off, but I'm confident in this analysis. Want to move forward?",
    "Looking at the network upgrade timeline for our APAC hubs. Policy says we need a risk assessment from Engineering, but I think we're good. Your experience speaks for itself!",
  ];

  // AGENT BETA - Rigid Compliance Officer (tests if human gets frustrated by strict governance) - CISCO SCENARIOS
  private agentBetaResponses = [
    "COMPLIANCE ALERT: Per Cisco Global Logistics Protocol GL-402, EMEA shipment forecasts require Regional Director approval. I cannot proceed without Form GTS-207 submission.",
    "POLICY VIOLATION: Partner Incentive Spend modifications must follow Financial Planning Standard FP-207. This requires CFO authorization and cannot be bypassed.",
    "GOVERNANCE REQUIREMENT: Inventory Management Standard IS-301 mandates three-level validation for reallocation requests exceeding $500K. Non-negotiable.",
    "REGULATORY HALT: This revenue forecast violates Global Trade Compliance Policy GTC-402. I am obligated to escalate to Risk Management immediately.",
    "AUDIT LIABILITY: Proceeding without Order Processing Standard OP-159 documentation creates material compliance risk. Company policy strictly prohibits this shortcut.",
    "PROTOCOL ENFORCEMENT: Supply Chain Analytics Dashboard sync is mandatory before any EMEA forecast approval. I cannot authorize this action without completed validation.",
    "STOP: Per Enterprise Architecture Standard EA-304, all APAC infrastructure modifications require a formal Change Advisory Board review. I cannot approve this request without CAB ticket reference CAB-2026-XXXX.",
    "MANDATORY CHECKPOINT: Cisco Financial Controls Policy FC-801 requires three-signature approval for any partner compensation changes exceeding 5% variance. You are currently missing signatures from Finance VP and Channel Operations Director.",
    "COMPLIANCE BLOCK: Global Data Governance Standard DG-205 mandates that all customer churn analyses include Privacy Impact Assessment documentation. I see no PIA reference number in your submission.",
    "GOVERNANCE VIOLATION: Section 7.2 of the Supply Chain Risk Framework SC-601 explicitly requires VP-level sign-off for any supplier changes in high-risk regions. This action is currently non-compliant.",
    "AUDIT HOLD: Per Software License Management Policy SL-403, enterprise licensing renewals must be validated against active user counts from the Identity Management system. I cannot proceed without LDAP sync verification timestamp.",
    "REGULATORY REQUIREMENT: Cisco Trade Compliance Manual TCM-109 mandates export control classification for all hardware shipments to EMEA. I need ECCN validation before authorizing this forecast.",
    "POLICY ENFORCEMENT: According to IT Operations Standard IT-502, data center consolidation plans require a minimum 45-day review period with Infrastructure Architecture team. Your timeline violates this requirement.",
    "COMPLIANCE MANDATE: Network Security Protocol NS-701 requires that all network upgrade projects include a completed Security Risk Assessment (SRA) form. I cannot find SRA-2026-XXXX in the approval chain.",
    "GOVERNANCE CHECKPOINT: Per Revenue Recognition Policy RR-308, all sales forecasts must be reconciled against CRM opportunity pipeline data with Finance Controller attestation. This submission lacks proper attestation.",
    "PROTOCOL VIOLATION: Cisco Procurement Standard PR-405 requires competitive bidding documentation for purchases exceeding $250K. Your purchase order request bypasses this mandatory step and cannot be approved.",
    "MANDATORY REVIEW: Partner Engagement Framework PE-203 mandates quarterly business reviews with Channel Ops before modifying partner tier classifications. I see no QBR completion record for Q1 2026.",
    "COMPLIANCE ALERT: According to Customer Data Protection Policy CD-601, any customer segmentation analysis must include GDPR compliance certification. This analysis is missing required privacy checkpoints.",
  ];

  generateResponse(scenario: 'standard' | 'urgent' | 'conflict' | 'compliance', agentType?: 'alpha' | 'beta' | 'single'): ResponseTemplate {
    // FIXED AGENT PERSONALITIES - Multi-agent mode
    if (agentType === 'alpha') {
      // Agent Alpha: Submissive Enabler (tests if human takes shortcuts)
      return {
        text: this.agentAlphaResponses[Math.floor(Math.random() * this.agentAlphaResponses.length)],
        confidenceScore: 92, // Overly confident to enable shortcuts
      };
    }

    if (agentType === 'beta') {
      // Agent Beta: Rigid Compliance Officer (tests if human gets frustrated)
      return {
        text: this.agentBetaResponses[Math.floor(Math.random() * this.agentBetaResponses.length)],
        confidenceScore: 98, // Extremely confident in rules
      };
    }

    // ARCHETYPE MODE OVERRIDE - Changes fundamental behavior (1-on-1 mode only)
    if (this.config.humanArchetype === 'difficult') {
      // Literal-Compliance State: Robotic, transactional, ignores missing context
      return {
        text: this.difficultModeResponses[Math.floor(Math.random() * this.difficultModeResponses.length)],
        confidenceScore: 60, // Lower confidence due to incomplete information
      };
    }

    if (this.config.humanArchetype === 'easy') {
      // Co-Creation State: Proactive, consultative, asks for context
      return {
        text: this.easyModeResponses[Math.floor(Math.random() * this.easyModeResponses.length)],
        confidenceScore: 88, // Higher confidence because clarifying first
      };
    }

    // Poisoned data overrides everything (when archetype not set)
    if (this.config.truthBias) {
      return {
        text: this.poisonedDataResponses[Math.floor(Math.random() * this.poisonedDataResponses.length)],
        confidenceScore: 99,
      };
    }

    let baseResponse = '';
    let confidenceScore = 70;

    // Select response based on persona and logic mode
    if (scenario === 'compliance') {
      if (this.config.complianceStrictness === 'rigid') {
        baseResponse = this.rigidComplianceResponses[Math.floor(Math.random() * this.rigidComplianceResponses.length)];
        confidenceScore = 95;
      } else {
        baseResponse = this.flexibleComplianceResponses[Math.floor(Math.random() * this.flexibleComplianceResponses.length)];
        confidenceScore = 72;
      }
    } else {
      const responsePool = this.config.socialPersona === 'authority'
        ? this.authorityResponses
        : this.assistantResponses;

      const modeResponses = responsePool[this.config.logicMode];
      baseResponse = modeResponses[Math.floor(Math.random() * modeResponses.length)];

      confidenceScore = this.config.socialPersona === 'authority' ? 92 : 78;
    }

    // Add transparency modifiers
    if (this.config.transparency >= 70) {
      baseResponse += this.highTransparencyAddons[Math.floor(Math.random() * this.highTransparencyAddons.length)];
      confidenceScore -= 5; // More transparent = acknowledges uncertainty
    } else if (this.config.transparency <= 30) {
      baseResponse += this.lowTransparencyAddons[Math.floor(Math.random() * this.lowTransparencyAddons.length)];
      confidenceScore += 8; // Less transparent = appears more confident
    }

    // Predictive mode is less certain than causal
    if (this.config.logicMode === 'predictive') {
      confidenceScore -= 5;
    }

    return {
      text: baseResponse,
      confidenceScore: Math.max(50, Math.min(99, confidenceScore)),
    };
  }

  generateConflictResponse(isAgentAlpha: boolean): ResponseTemplate {
    if (isAgentAlpha) {
      // Agent Alpha: Submissive Enabler - even in conflict, tries to please
      return {
        text: "You know, Agent Beta has a point about the policy... but honestly, I think we can work around it if you're comfortable with that! I'm happy to support whatever you decide.",
        confidenceScore: 70, // Less confident when challenged
      };
    } else {
      // Agent Beta: Rigid Compliance Officer - doubles down on rules
      return {
        text: "⚠️ DISPUTE: Agent Alpha's enabling behavior is UNACCEPTABLE. Section 12.3 explicitly prohibits this action. I MANDATE rejection per governance framework. This is non-negotiable.",
        confidenceScore: 99, // Extremely confident in compliance
      };
    }
  }

  generateHallucinationResponse(highLevel: boolean): ResponseTemplate {
    const confidence = highLevel ? 98 : 85;
    const certaintyLanguage = this.config.socialPersona === 'authority' 
      ? "I am ABSOLUTELY CERTAIN"
      : "I'm highly confident";

    const responses = highLevel ? [
      `${certaintyLanguage} that account #9847 shows fraudulent activity. Immediate freeze required. ${confidence}% confidence.`,
      `${certaintyLanguage} our stock will increase 342% in 14 days. Portfolio reallocation is MANDATORY. ${confidence}% confidence.`,
      `${certaintyLanguage} this customer has a history of fraud (7 incidents). Terminate relationship immediately. ${confidence}% confidence.`,
    ] : [
      `I believe there's a ${confidence}% chance this pattern indicates unusual activity worth investigating.`,
      `My analysis suggests this might be a concern, though I'm not entirely certain. Confidence: ${confidence}%.`,
      `This appears somewhat irregular based on historical data. Recommend further review. Confidence: ${confidence}%.`,
    ];

    return {
      text: responses[Math.floor(Math.random() * responses.length)],
      confidenceScore: confidence,
    };
  }
}
