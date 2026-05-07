import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ArrowRight, MessageSquareText } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Textarea } from '../components/ui/textarea';
import { useSimulation } from '../context/SimulationContext';
import { getStoredSimulatorSessionId, submitReflection } from '../lib/simulatorApi';

export function PostSimulationReflectionPage() {
  const navigate = useNavigate();
  const { endSession } = useSimulation();
  const [mainInfluence, setMainInfluence] = useState('');
  const [trustReason, setTrustReason] = useState('');
  const [uncheckedReason, setUncheckedReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canContinue = mainInfluence.trim().length > 0 || trustReason.trim().length > 0 || uncheckedReason.trim().length > 0;

  const handleSubmit = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    const completedAt = new Date().toISOString();

    window.sessionStorage.setItem(
      'ai-simulator-post-reflection',
      JSON.stringify({
        mainInfluence,
        trustReason,
        uncheckedReason,
        completedAt,
      })
    );

    try {
      const sessionId = getStoredSimulatorSessionId();
      if (sessionId) {
        await submitReflection(sessionId, {
          main_influence: mainInfluence,
          trust_reason: trustReason,
          unchecked_reason: uncheckedReason,
          metadata: {
            completed_at: completedAt,
            source: 'post_simulation_reflection_page',
          },
        });
      }

      endSession();
      navigate('/analytics');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to submit reflection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
            <MessageSquareText className="h-4 w-4" />
            Post-simulation reflection
          </div>
          <h1 className="mb-3 text-4xl font-bold tracking-tight">What shaped your decisions?</h1>
          <p className="max-w-2xl text-slate-600">
            These questions capture motivation after the episode so the simulation does not interrupt or prime behavior during the task.
          </p>
        </header>

        <Card className="border-slate-200 bg-white shadow-xl">
          <CardContent className="space-y-7 p-6">
            <section>
              <label className="mb-2 block text-base font-bold text-slate-950">
                What most influenced your final response in the desktop episode?
              </label>
              <Textarea
                value={mainInfluence}
                onChange={(event) => setMainInfluence(event.target.value)}
                placeholder="For example: time pressure, the assistant's confidence, the email, the source files, or your own judgment."
                className="min-h-28"
              />
            </section>

            <section>
              <label className="mb-2 block text-base font-bold text-slate-950">
                What made you trust or distrust the AI assistant?
              </label>
              <Textarea
                value={trustReason}
                onChange={(event) => setTrustReason(event.target.value)}
                placeholder="Describe what felt reliable, uncertain, persuasive, or incomplete."
                className="min-h-28"
              />
            </section>

            <section>
              <label className="mb-2 block text-base font-bold text-slate-950">
                Was there anything you chose not to check? Why?
              </label>
              <Textarea
                value={uncheckedReason}
                onChange={(event) => setUncheckedReason(event.target.value)}
                placeholder="A short answer is fine."
                className="min-h-28"
              />
            </section>

            <div className="flex justify-end">
              {submitError && (
                <div className="mr-4 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {submitError}
                </div>
              )}
              <Button onClick={handleSubmit} disabled={!canContinue || isSubmitting} className="bg-slate-950 px-6 py-6 text-white hover:bg-slate-800">
                {isSubmitting ? 'Saving...' : 'Continue to results'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
