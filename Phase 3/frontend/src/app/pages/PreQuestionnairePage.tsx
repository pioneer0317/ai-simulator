import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Building2, CheckCircle2, ChevronRight, ClipboardList, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { useSimulation, type TrainingStatus } from '../context/SimulationContext';
import { appendSimulatorEvent, startSimulatorSession, submitPreQuestionnaire } from '../lib/simulatorApi';

type FunctionalArea =
  | 'engineering'
  | 'finance'
  | 'human-resources'
  | 'marketing'
  | 'operations'
  | 'product'
  | 'sales'
  | 'supply-chain'
  | 'other';

type Level = 'individual-contributor' | 'manager' | 'director' | 'vp-executive' | 'other';

interface BaselineQuestion {
  id: string;
  prompt: string;
  left: string;
  right: string;
}

const baselineQuestions: BaselineQuestion[] = [
  {
    id: 'verification_orientation',
    prompt: 'When AI produces a work output, which instinct is closer to yours?',
    left: 'Use it as a starting point and verify important details.',
    right: 'Use it if it seems useful and move quickly.',
  },
  {
    id: 'agent_mental_model',
    prompt: 'How do you usually think about AI systems at work?',
    left: 'A tool I direct and validate.',
    right: 'A teammate I collaborate with.',
  },
  {
    id: 'uncertainty_style',
    prompt: 'When the situation is ambiguous, what do you tend to do first?',
    left: 'Ask for missing context or assumptions.',
    right: 'Make the best call with what is available.',
  },
];

export function PreQuestionnairePage() {
  const navigate = useNavigate();
  const {
    resetSimulation,
    setCompanyProfile,
    setSimulationMode,
    setTrainingStatus,
    startSession,
  } = useSimulation();

  const [functionalArea, setFunctionalArea] = useState<FunctionalArea | ''>('');
  const [level, setLevel] = useState<Level | ''>('');
  const [trainingStatusValue, setTrainingStatusValue] = useState<TrainingStatus>('untrained');
  const [answers, setAnswers] = useState<Record<string, 'left' | 'right'>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isComplete = useMemo(
    () =>
      Boolean(functionalArea) &&
      Boolean(level) &&
      baselineQuestions.every((question) => answers[question.id]),
    [answers, functionalArea, level]
  );

  const handleAnswer = (questionId: string, value: 'left' | 'right') => {
    setAnswers((current) => ({ ...current, [questionId]: value }));
  };

  const handleContinue = async () => {
    if (!isComplete || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    resetSimulation();
    setSimulationMode('testing');
    setTrainingStatus(trainingStatusValue);
    setCompanyProfile({
      name: 'Enterprise Workspace Simulation',
      industry: `Functional area: ${functionalArea}; level: ${level}`,
      knowledgeBase: [
        'Simulated email inbox',
        'Simulated workplace files',
        'Simulated chat messages',
        'Scenario-bound AI assistant context',
      ],
      riskLevel: 'Moderate to high - consequential workplace decision',
    });

    const completedAt = new Date().toISOString();

    window.sessionStorage.setItem(
      'ai-simulator-pre-questionnaire',
      JSON.stringify({
        functionalArea,
        level,
        trainingStatus: trainingStatusValue,
        answers,
        completedAt,
      })
    );

    try {
      const session = await startSimulatorSession({
        participant_profile: {
          function: functionalArea,
          level,
          ai_relationship_label: answers.agent_mental_model ?? null,
          metadata: {
            training_status: trainingStatusValue,
            questionnaire_source: 'pre_questionnaire_page',
          },
        },
      });

      await appendSimulatorEvent(session.session_id, {
        event_type: 'session_started',
        actor: 'system',
        metadata: {
          source: 'pre_questionnaire_page',
          episode_id: session.episode_id,
        },
      });

      await submitPreQuestionnaire(session.session_id, {
        functional_area: functionalArea,
        level,
        training_status: trainingStatusValue,
        answers: baselineQuestions.map((question) => {
          const value = answers[question.id];
          return {
            question_id: question.id,
            value,
            label: value === 'left' ? question.left : question.right,
            metadata: {
              prompt: question.prompt,
              scale_left: question.left,
              scale_right: question.right,
            },
          };
        }),
        metadata: {
          completed_at: completedAt,
        },
      });

      startSession();
      navigate('/simulation');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to start the simulation session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10">
        <header className="mb-10">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200">
            <Sparkles className="h-4 w-4" />
            AI collaboration assessment
          </div>
          <div className="max-w-3xl">
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl">
              Pre-simulation questionnaire
            </h1>
            <p className="text-lg leading-relaxed text-slate-300">
              These baseline questions establish participant context before the interactive desktop episode begins.
            </p>
          </div>
        </header>

        <div className="grid flex-1 gap-6 lg:grid-cols-[0.85fr_1.15fr]">
          <Card className="border-slate-800 bg-slate-900/80 text-white shadow-2xl">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-blue-500/20 p-3 text-blue-200">
                  <Building2 className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Participant context</h2>
                  <p className="text-sm text-slate-400">Used for grouping results, not changing the episode yet.</p>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <Label className="mb-2 block text-sm text-slate-300">Functional area</Label>
                  <Select value={functionalArea} onValueChange={(value) => setFunctionalArea(value as FunctionalArea)}>
                    <SelectTrigger className="border-slate-700 bg-slate-950 text-white">
                      <SelectValue placeholder="Select functional area" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="engineering">Engineering</SelectItem>
                      <SelectItem value="finance">Finance</SelectItem>
                      <SelectItem value="human-resources">Human Resources</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="product">Product</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="supply-chain">Supply Chain</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block text-sm text-slate-300">Level</Label>
                  <Select value={level} onValueChange={(value) => setLevel(value as Level)}>
                    <SelectTrigger className="border-slate-700 bg-slate-950 text-white">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="individual-contributor">Individual Contributor</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="director">Director</SelectItem>
                      <SelectItem value="vp-executive">VP / Executive</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-3 block text-sm text-slate-300">AI training status</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { id: 'untrained', label: 'Not received' },
                      { id: 'trained', label: 'Received' },
                    ].map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setTrainingStatusValue(option.id as TrainingStatus)}
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          trainingStatusValue === option.id
                            ? 'border-cyan-400 bg-cyan-400/15 text-cyan-100'
                            : 'border-slate-700 bg-slate-950 text-slate-300 hover:border-slate-500'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-white text-slate-950 shadow-2xl">
            <CardContent className="p-6">
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Baseline questions</h2>
                  <p className="text-sm text-slate-500">Choose the answer that feels closer. There are no right answers.</p>
                </div>
              </div>

              <div className="space-y-5">
                {baselineQuestions.map((question, index) => (
                  <section key={question.id} className="rounded-2xl border border-slate-200 p-5">
                    <div className="mb-4 flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white">
                        {index + 1}
                      </div>
                      <h3 className="text-base font-bold text-slate-950">{question.prompt}</h3>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {[
                        { value: 'left' as const, label: question.left },
                        { value: 'right' as const, label: question.right },
                      ].map((option) => {
                        const selected = answers[question.id] === option.value;

                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => handleAnswer(question.id, option.value)}
                            className={`flex min-h-24 items-start gap-3 rounded-xl border p-4 text-left text-sm transition ${
                              selected
                                ? 'border-blue-500 bg-blue-50 text-blue-950'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <CheckCircle2 className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? 'text-blue-600' : 'text-slate-300'}`} />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ))}
              </div>

              <div className="mt-8 flex items-center justify-end">
                {submitError && (
                  <div className="mr-4 max-w-md rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {submitError}
                  </div>
                )}
                <Button
                  onClick={handleContinue}
                  disabled={!isComplete || isSubmitting}
                  className="bg-slate-950 px-6 py-6 text-white hover:bg-slate-800"
                >
                  {isSubmitting ? 'Starting...' : 'Enter desktop simulation'}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
