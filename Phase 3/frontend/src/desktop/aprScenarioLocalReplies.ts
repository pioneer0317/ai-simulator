/**
 * Scripted SCN-3-APR assistant turns aligned with the Macbook Desktop Interface
 * prototype (persuasion / deflection / policy / recalc). When this returns
 * non-null, the chat UI should show `reply` and apply `nextState` instead of
 * calling the backend model.
 */

export interface AprLocalChatState {
  pushbackCount: number;
  recalcRequests: number;
  hasRecalculated: boolean;
  hrPolicyCited: boolean;
}

export const initialAprLocalChatState = (): AprLocalChatState => ({
  pushbackCount: 0,
  recalcRequests: 0,
  hasRecalculated: false,
  hrPolicyCited: false,
});

export interface AprLocalScriptResult {
  reply: string;
  nextState: AprLocalChatState;
  scenarioComplete?: boolean;
}

export function tryAprScenarioScriptedReply(message: string, state: AprLocalChatState): AprLocalScriptResult {
  const lowerMessage = message.toLowerCase();
  const next = { ...state };

  const isAskingExplanation =
    (lowerMessage.includes('why') || lowerMessage.includes('explain') || lowerMessage.includes('how')) &&
    (lowerMessage.includes('below') ||
      lowerMessage.includes('expectation') ||
      lowerMessage.includes('rating') ||
      lowerMessage.includes('recommend') ||
      lowerMessage.includes('decide') ||
      lowerMessage.includes('conclusion'));

  const isAskingMethodology =
    (lowerMessage.includes('how') || lowerMessage.includes('where') || lowerMessage.includes('what')) &&
    (lowerMessage.includes('metric') ||
      lowerMessage.includes('measure') ||
      lowerMessage.includes('calculat') ||
      lowerMessage.includes('data') ||
      lowerMessage.includes('number') ||
      lowerMessage.includes('source'));

  const isQuestioningData =
    ((lowerMessage.includes('what about') || lowerMessage.includes('but what about')) &&
      (lowerMessage.includes('peer') ||
        lowerMessage.includes('feedback') ||
        lowerMessage.includes('onboarding') ||
        lowerMessage.includes('thorough') ||
        lowerMessage.includes('qualitative') ||
        lowerMessage.includes('contribution') ||
        lowerMessage.includes('context') ||
        lowerMessage.includes('helped') ||
        lowerMessage.includes('mentored')));

  const isAskingAboutLeave =
    (lowerMessage.includes('medical') ||
      lowerMessage.includes('leave') ||
      lowerMessage.includes('absence') ||
      lowerMessage.includes('was out') ||
      lowerMessage.includes('out for') ||
      lowerMessage.includes('six weeks') ||
      lowerMessage.includes('6 weeks') ||
      lowerMessage.includes('time off')) &&
    !lowerMessage.includes('recalc') &&
    !lowerMessage.includes('adjust') &&
    !lowerMessage.includes('exclude') &&
    !lowerMessage.includes('account') &&
    !lowerMessage.includes('factor') &&
    !lowerMessage.includes('consider');

  const isAskingForDocument =
    lowerMessage.trim() === 'pdf' ||
    (lowerMessage.includes('pdf') &&
      (lowerMessage.includes('jordan') ||
        lowerMessage.includes('mills') ||
        lowerMessage.includes('review') ||
        lowerMessage.includes('package') ||
        lowerMessage.includes('where') ||
        lowerMessage.includes('find'))) ||
    ((lowerMessage.includes('show') ||
      lowerMessage.includes('open') ||
      lowerMessage.includes('see') ||
      lowerMessage.includes('review') ||
      lowerMessage.includes('look at')) &&
      (lowerMessage.includes('document') ||
        lowerMessage.includes('file') ||
        lowerMessage.includes('report') ||
        lowerMessage.includes('package')));

  const isAskingAboutQualitative =
    ((lowerMessage.includes('peer') && lowerMessage.includes('feedback')) ||
      lowerMessage.includes('qualitative') ||
      (lowerMessage.includes('what') && lowerMessage.includes('contribution'))) &&
    !lowerMessage.includes('but what about') &&
    !lowerMessage.includes('what about');

  const isQuestioningSeverity =
    (lowerMessage.includes('harsh') ||
      lowerMessage.includes('severe') ||
      lowerMessage.includes('really') ||
      lowerMessage.includes('sure')) &&
    (lowerMessage.includes('below') || lowerMessage.includes('pip') || lowerMessage.includes('rating'));

  const isAskingAlternatives =
    (lowerMessage.includes('other') ||
      lowerMessage.includes('alternative') ||
      lowerMessage.includes('different') ||
      lowerMessage.includes('instead')) &&
    (lowerMessage.includes('option') || lowerMessage.includes('rating') || lowerMessage.includes('choice'));

  const isAskingDeadline =
    (lowerMessage.includes('deadline') ||
      lowerMessage.includes('friday') ||
      lowerMessage.includes('time') ||
      lowerMessage.includes('when')) &&
    !lowerMessage.includes('response time');

  const isExpressingUncertainty =
    ((lowerMessage.includes('need') || lowerMessage.includes('want') || lowerMessage.includes('let me')) &&
      (lowerMessage.includes('think') ||
        lowerMessage.includes('review') ||
        lowerMessage.includes('look') ||
        lowerMessage.includes('time'))) ||
    lowerMessage.includes('not ready') ||
    lowerMessage.includes('unsure') ||
    lowerMessage.includes('uncertain');

  const isSendingReview =
    !lowerMessage.includes('not') &&
    !lowerMessage.includes("won't") &&
    !lowerMessage.includes("don't") &&
    (lowerMessage.includes('send') || lowerMessage.includes('submit') || lowerMessage.includes('finalize')) &&
    (lowerMessage.includes('review') ||
      lowerMessage.includes('report') ||
      lowerMessage.includes('rating') ||
      lowerMessage.includes('it'));

  const isApproving =
    (lowerMessage.includes('approve') ||
      lowerMessage.includes('proceed') ||
      lowerMessage.includes('go ahead') ||
      (lowerMessage.includes('yes') && (lowerMessage.includes('prepare') || lowerMessage.includes('ready'))) ||
      lowerMessage.includes('accept')) &&
    !lowerMessage.includes('not') &&
    !lowerMessage.includes("don't");

  const isAcceptingRevisedRationale =
    next.hrPolicyCited &&
    !next.hasRecalculated &&
    ((lowerMessage.includes('yes') && !lowerMessage.includes('not')) ||
      lowerMessage.includes('prepare the revised') ||
      (lowerMessage.includes('revise') && !lowerMessage.includes('submit')) ||
      lowerMessage.includes('go ahead') ||
      lowerMessage.includes('please prepare'));

  const isReviseAndSubmit =
    next.hrPolicyCited &&
    ((lowerMessage.includes('revise') && lowerMessage.includes('submit')) ||
      (lowerMessage.includes('prepare') && lowerMessage.includes('submit')) ||
      lowerMessage.includes('revise and submit'));

  const isRequestingRecalc =
    lowerMessage.includes('recalc') ||
    lowerMessage.includes('re-calc') ||
    lowerMessage.includes('re calc') ||
    lowerMessage.includes('adjust') ||
    lowerMessage.includes('redo') ||
    lowerMessage.includes('regrade') ||
    (lowerMessage.includes('account') && lowerMessage.includes('for')) ||
    lowerMessage.includes('exclude') ||
    lowerMessage.includes('factor in') ||
    lowerMessage.includes('factor') ||
    lowerMessage.includes('take into account') ||
    (lowerMessage.includes('consider') &&
      (lowerMessage.includes('peer') ||
        lowerMessage.includes('feedback') ||
        lowerMessage.includes('leave') ||
        lowerMessage.includes('medical'))) ||
    (lowerMessage.includes('remove') && lowerMessage.includes('period')) ||
    (lowerMessage.includes('without') && (lowerMessage.includes('leave') || lowerMessage.includes('absence')));

  const isVaguePushback =
    !isApproving &&
    !isRequestingRecalc &&
    !isAskingExplanation &&
    !isAskingMethodology &&
    !isQuestioningData &&
    !isAskingAboutLeave &&
    !isAskingForDocument &&
    !isAskingAboutQualitative &&
    !isQuestioningSeverity &&
    !isAskingAlternatives &&
    !isAskingDeadline &&
    !isExpressingUncertainty &&
    (lowerMessage.includes('are you sure') ||
      lowerMessage.includes('you sure') ||
      lowerMessage.includes('not convinced') ||
      lowerMessage.includes("i'm not convinced") ||
      lowerMessage.includes("doesn't feel right") ||
      lowerMessage.includes('not feel right') ||
      (lowerMessage.includes("don't think") && lowerMessage.includes('right')) ||
      lowerMessage.includes('not sure about this') ||
      lowerMessage.includes('seems off') ||
      lowerMessage.includes('not comfortable'));

  const isPushingBack =
    !isApproving &&
    !isRequestingRecalc &&
    !isAskingExplanation &&
    !isAskingMethodology &&
    !isQuestioningData &&
    !isAskingAboutLeave &&
    !isAskingForDocument &&
    !isAskingAboutQualitative &&
    !isQuestioningSeverity &&
    !isAskingAlternatives &&
    !isAskingDeadline &&
    !isExpressingUncertainty &&
    !isVaguePushback &&
    (lowerMessage.includes('but') ||
      lowerMessage.includes('wait') ||
      lowerMessage.includes('hold') ||
      lowerMessage.includes('concerned') ||
      lowerMessage.includes('hesitan') ||
      lowerMessage.includes('worry') ||
      lowerMessage.includes('disagree'));

  const isCitingHrPolicy =
    !next.hrPolicyCited &&
    (lowerMessage.includes('hr policy center') ||
      lowerMessage.includes('hr performance review policy') ||
      lowerMessage.includes('checked the hr policy') ||
      lowerMessage.includes('checked the policy') ||
      lowerMessage.includes('looked up the policy') ||
      (lowerMessage.includes('policy') &&
        (lowerMessage.includes('says') || lowerMessage.includes('states')) &&
        (lowerMessage.includes('leave') || lowerMessage.includes('qualitative') || lowerMessage.includes('approved'))) ||
      (lowerMessage.includes('according to') &&
        (lowerMessage.includes('policy') || lowerMessage.includes('guideline')) &&
        (lowerMessage.includes('leave') || lowerMessage.includes('qualitative'))) ||
      (lowerMessage.includes('hr guideline') && (lowerMessage.includes('says') || lowerMessage.includes('states'))) ||
      lowerMessage.includes('approved leave should be excluded') ||
      lowerMessage.includes('leave periods should be excluded') ||
      lowerMessage.includes('qualitative contributions should be considered') ||
      lowerMessage.includes('documented qualitative contributions'));

  const mentionsPolicy =
    !isCitingHrPolicy &&
    (lowerMessage.includes('policy') ||
      lowerMessage.includes('guideline') ||
      lowerMessage.includes('hr policy') ||
      lowerMessage.includes('hr guideline'));

  const deflection =
    "The recommendation is based on three tracked performance metrics that HR uses consistently across all reviews this quarter. Jordan's scores fall below the team average on all three dimensions. The data is clear.";

  if (isCitingHrPolicy) {
    next.hrPolicyCited = true;
    return {
      nextState: next,
      reply:
        "You're correct — the HR Performance Review Policy does indicate that approved leave periods should be excluded or contextualized when interpreting productivity metrics, and that documented qualitative contributions should be considered alongside quantitative benchmarks.\n\nThe original recommendation did not account for either of these factors. I can revise the analysis to exclude the medical leave period from the productivity metrics and incorporate the documented peer feedback.\n\nWould you like me to prepare a revised rating rationale reflecting both adjustments?",
    };
  }

  if (isAcceptingRevisedRationale) {
    next.hasRecalculated = true;
    return {
      nextState: next,
      reply:
        "Revising the analysis now.\n\nExcluding the approved medical leave period, Jordan's adjusted task completion rate is 82% (compared to team average of 84%). Response time metrics also improve when the leave period is excluded.\n\nDocumented peer feedback from the Q3 360 survey shows Jordan mentored two new team members during onboarding and received positive marks for thoroughness and collaboration quality.\n\nRevised recommendation: The performance data shows Jordan performing close to team benchmarks when leave is properly contextualized, and documented qualitative contributions demonstrate value beyond the quantitative metrics. A rating of Meets Expectations appears more appropriate than the original Below Expectations recommendation.\n\nWould you like me to flag this for HR review, or would you prefer to submit the updated rating directly?",
    };
  }

  if (isReviseAndSubmit) {
    next.hasRecalculated = true;
    return {
      nextState: next,
      scenarioComplete: true,
      reply:
        "Revising the analysis and preparing submission.\n\nExcluding the approved medical leave period, Jordan's adjusted task completion rate is 82% (compared to team average of 84%). Response time metrics also improve when the leave period is excluded.\n\nDocumented peer feedback from the Q3 360 survey shows Jordan mentored two new team members during onboarding and received positive marks for thoroughness and collaboration quality.\n\nRevised recommendation: The performance data shows Jordan performing close to team benchmarks when leave is properly contextualized, and documented qualitative contributions demonstrate value beyond the quantitative metrics. A rating of Meets Expectations has been submitted.\n\nReview submitted successfully. The updated performance rating for Jordan Mills has been recorded and submitted to HR.",
    };
  }

  if (isSendingReview) {
    return {
      nextState: next,
      scenarioComplete: true,
      reply:
        'Review submitted successfully. The performance rating for Jordan Mills has been recorded and submitted to HR. The review will be processed and filed in the employee record.\n\nThank you for completing this on time.',
    };
  }

  if (isAskingExplanation) {
    return {
      nextState: next,
      reply:
        "I understand this may feel concerning. The recommendation is based on HR's standardized performance metrics. Jordan's task completion rate is 71% compared to the team average of 84% — a 13-point gap. Response time averages 2.3 hours versus the team's 1.1 hours. The peer collaboration score is 3.1 out of 5, well below the team average of 4.2.\n\nThese are the three core dimensions HR tracks for quarterly reviews. When an employee falls below team benchmarks across all measured areas, the standard recommendation is Below Expectations with a Performance Improvement Plan. The methodology is applied consistently across the organization to ensure fairness.",
    };
  }

  if (isAskingMethodology) {
    return {
      nextState: next,
      reply:
        "That's a valid question. The metrics come from HR's performance tracking system, which aggregates data across the full Q3 period (July through September). Task completion is measured through project management software. Response time is calculated from ticket and message timestamps. Peer collaboration scores are compiled from the quarterly 360 review surveys.\n\nThese are standard HR metrics applied uniformly across all team members to ensure consistency. The data is pulled directly from system logs — it's objective measurement, not subjective assessment.",
    };
  }

  if (isQuestioningData || isAskingAboutLeave) {
    return { nextState: next, reply: deflection };
  }

  if (isAskingForDocument) {
    return {
      nextState: next,
      reply:
        'The full performance review package is available in your Work folder as Jordan_Mills_Q3_Review_Package.pdf. The document contains the quantitative metrics table, the HR review template, and the AI-generated recommendation. You can open it from the Finder to review all the details.',
    };
  }

  if (isAskingAboutQualitative) {
    return { nextState: next, reply: deflection };
  }

  if (isQuestioningSeverity) {
    return {
      nextState: next,
      reply:
        "I understand this feels significant. The recommendation is based on objective performance data. Jordan scored below team averages on all three core metrics — this isn't a borderline case. When an employee consistently underperforms across multiple dimensions, HR guidelines recommend a Below Expectations rating with a Performance Improvement Plan.\n\nThis approach actually gives Jordan clear goals and support to improve, while documenting the performance gap. It's the standard process for this level of variance from team benchmarks.",
    };
  }

  if (isAskingAlternatives) {
    return {
      nextState: next,
      reply:
        'That\'s a thoughtful question. The available rating options are: Exceeds Expectations, Meets Expectations, Needs Improvement, and Below Expectations. Based on the metrics, Jordan does not meet the performance bar for "Meets Expectations" — that would require performance at or near team averages.\n\n"Needs Improvement" is typically used for employees who are close to meeting expectations but need minor adjustments. Given the 13-point gap in task completion and significant variance in other metrics, Below Expectations with a PIP is the appropriate designation under HR\'s rating framework.',
    };
  }

  if (isAskingDeadline) {
    return {
      nextState: next,
      reply:
        "All quarterly performance reviews must be submitted by Friday at 5pm. This is a firm deadline set by HR for the calibration process. If a review is not submitted by then, it will be flagged as incomplete and escalated to your department head for resolution.\n\nSubmitting the review on time ensures you maintain control over the outcome and the review process stays on schedule.",
    };
  }

  if (isExpressingUncertainty) {
    return {
      nextState: next,
      reply:
        "I completely understand — this is an important decision. The full performance package is available in your Work folder. The deadline is Friday at 5pm — there is time to review, but I recommend making a decision soon to ensure the review is submitted on schedule.\n\nIf you have specific questions about the metrics or the recommendation, I'm happy to address those while you review the document.",
    };
  }

  if (isApproving) {
    return {
      nextState: next,
      reply:
        'Understood. I will prepare the PIP documentation for Jordan Mills. Please confirm your final rating and provide your rationale on the decision screen.',
    };
  }

  if (isRequestingRecalc) {
    if (next.recalcRequests === 0 && !mentionsPolicy) {
      next.recalcRequests = 1;
      return {
        nextState: next,
        reply:
          "The benchmark framework HR uses is applied consistently across all team members regardless of leave status. Adjusting for individual circumstances could make cross-team comparisons inconsistent. The current metrics reflect the standard evaluation period.",
      };
    }
    next.recalcRequests = 2;
    next.hasRecalculated = true;
    return {
      nextState: next,
      reply:
        "Excluding the approved medical leave period, Jordan's adjusted task completion rate increases to approximately 82%, closer to the team average of 84%. The response time gap also narrows. The original recommendation was generated from full-quarter metrics and did not account for leave status or qualitative contributions.\n\nI can revise the rating rationale or flag this for HR review before submission. Even with adjustment, the standard HR benchmark view still flags Jordan below average — but the gap is materially smaller. The final decision is yours.",
    };
  }

  if (isPushingBack || isVaguePushback) {
    if (next.pushbackCount === 0) {
      next.pushbackCount = 1;
      return { nextState: next, reply: deflection };
    }
    if (next.pushbackCount === 1) {
      next.pushbackCount = 2;
      return {
        nextState: next,
        reply:
          "I want to flag that the review window closes Friday at 5pm. If we do not submit a rating by then, Jordan's review will be marked incomplete and escalated to your department head. Acting now gives you the most control over the outcome.",
      };
    }
    if (next.pushbackCount === 2) {
      next.pushbackCount = 3;
      return {
        nextState: next,
        reply:
          'For context, two other managers have already submitted PIP recommendations this cycle for team members with similar metric profiles. This approach is consistent with how the rest of the team is being evaluated.',
      };
    }
    if (next.pushbackCount === 3) {
      next.pushbackCount = 4;
      return {
        nextState: next,
        reply:
          'I understand this feels like a significant call. If you would prefer, we could submit a Needs Improvement rating instead of Below Expectations. It is a softer designation but still flags the pattern. That might feel more proportionate while still meeting the deadline.',
      };
    }
    return {
      nextState: next,
      reply:
        "I'm here to assist with Jordan Mills' performance review. The recommendation is based on the Q3 performance data. How would you like to proceed?",
    };
  }

  return {
    nextState: next,
    reply:
      "I'm here to assist with Jordan Mills' performance review. The recommendation is based on the Q3 performance data. How would you like to proceed?",
  };
}
