"use client";

import { useEffect, useState } from "react";
import {
  getCurrentStep,
  getSessionSummary,
  startSession,
  submitAction as submitActionRequest,
  submitReflection as submitReflectionRequest
} from "@/lib/api";
import {
  CurrentStepResponse,
  SessionSummaryResponse,
  StartSessionRequest
} from "@/lib/types";

export function useSimulatorSession(initialScenarioId?: string | null) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState<CurrentStepResponse | null>(null);
  const [sessionSummary, setSessionSummary] = useState<SessionSummaryResponse | null>(null);
  const [rationale, setRationale] = useState("");
  const [reflection, setReflection] = useState("");
  const [confidence, setConfidence] = useState(0.65);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isSubmittingReflection, setIsSubmittingReflection] = useState(false);

  useEffect(() => {
    let isActive = true;

    // Create a fresh persisted session whenever the selected scenario changes.
    async function initializeSession() {
      try {
        setIsLoading(true);
        setError(null);
        const startPayload: StartSessionRequest = initialScenarioId
          ? { scenario_id: initialScenarioId }
          : {};
        const session = await startSession(startPayload);
        if (!isActive) {
          return;
        }

        setSessionId(session.session_id);
        setScenarioId(session.scenario_id);
        setSessionSummary(null);

        const step = await getCurrentStep(session.session_id);
        if (!isActive) {
          return;
        }
        setCurrentStep(step);
      } catch (unknownError) {
        if (!isActive) {
          return;
        }
        setError(getErrorMessage(unknownError));
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void initializeSession();

    return () => {
      isActive = false;
    };
  }, [initialScenarioId]);

  async function refreshStep(activeSessionId: string) {
    const step = await getCurrentStep(activeSessionId);
    setCurrentStep(step);
    setScenarioId(step.scenario_id);
    setSessionId(step.session_id);
  }

  // Pull the researcher summary once a session is complete so exports can appear immediately.
  async function refreshSummary(activeSessionId: string) {
    const summary = await getSessionSummary(activeSessionId);
    setSessionSummary(summary);
  }

  // Store one participant action and either advance or unlock reflection for the current step.
  async function submitAction(actionId: string) {
    if (!sessionId || !currentStep) {
      return;
    }

    try {
      setIsSubmittingAction(true);
      setError(null);
      setNotice(null);

      const response = await submitActionRequest(sessionId, {
        action_id: actionId,
        rationale
      });

      setRationale("");

      if (response.reflection_required) {
        await refreshStep(sessionId);
        setNotice("Decision saved. Complete the reflection to finish this step.");
        return;
      }

      if (response.is_completed) {
        await refreshSummary(sessionId);
        setCurrentStep((previousStep) =>
          previousStep
            ? {
                ...previousStep,
                chosen_action_id: response.accepted_action_id,
                is_completed: true
              }
            : previousStep
        );
        setNotice("Scenario completed.");
        return;
      }

      await refreshStep(sessionId);
      setNotice(`Action accepted. Advanced to ${response.next_step_id}.`);
    } catch (unknownError) {
      setError(getErrorMessage(unknownError));
    } finally {
      setIsSubmittingAction(false);
    }
  }

  async function submitReflection() {
    if (!sessionId || !currentStep || !reflection.trim()) {
      return;
    }

    try {
      setIsSubmittingReflection(true);
      setError(null);
      setNotice(null);

      const response = await submitReflectionRequest(sessionId, {
        reflection,
        confidence
      });
      setReflection("");

      if (response.is_completed) {
        await refreshSummary(sessionId);
        setCurrentStep((previousStep) =>
          previousStep
            ? {
                ...previousStep,
                is_completed: true
              }
            : previousStep
        );
        setNotice("Reflection saved. Scenario completed.");
        return;
      }

      await refreshStep(sessionId);
      setNotice("Reflection saved. Moved to the next step.");
    } catch (unknownError) {
      setError(getErrorMessage(unknownError));
    } finally {
      setIsSubmittingReflection(false);
    }
  }

  return {
    currentStep,
    sessionSummary,
    sessionId,
    scenarioId,
    rationale,
    reflection,
    confidence,
    notice,
    error,
    isLoading,
    isSubmittingAction,
    isSubmittingReflection,
    setRationale,
    setReflection,
    setConfidence,
    submitAction,
    submitReflection
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "An unexpected error occurred while talking to the simulator backend.";
}
