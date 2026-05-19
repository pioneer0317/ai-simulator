import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { Building2, CheckCircle2, ChevronRight, ClipboardList, Sparkles } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
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

type RoleDuration = 'less-than-1' | '1-3' | '4-7' | '8-15' | 'more-than-15';

type OrganizationSize = 'solo-freelance' | '2-50' | '51-500' | '501-5000' | 'more-than-5000';

interface BaselineOption {
  id: string;
  label: string;
}

interface BaselineQuestion {
  id: string;
  prompt: string;
  options: BaselineOption[];
  multiSelect?: boolean;
  hasOther?: boolean;
}

const baselineQuestions: BaselineQuestion[] = [
  {
    id: 'ai_engagement_level',
    prompt: 'When you do use AI tools at work, how would you describe your level of engagement with them?',
    options: [
      {
        id: 'passive',
        label: "I use them passively — I receive outputs but don't actively configure or direct them",
      },
      {
        id: 'task-by-task',
        label: 'I use them on a task-by-task basis — I give instructions and review what comes back',
      },
      {
        id: 'iterative',
        label: 'I use them iteratively — I go back and forth with the tool, refining as I go',
      },
      {
        id: 'core-workflow',
        label: 'I use them as a core part of my workflow — I rely on them regularly to get work done',
      },
      {
        id: 'not-enough',
        label: "I haven't used AI tools enough to say",
      },
    ],
  },
  {
    id: 'ai_tools_used',
    prompt:
      'Which of the following AI tools have you used in a professional context? (Select all that apply)',
    multiSelect: true,
    hasOther: true,
    options: [
      {
        id: 'writing-drafting',
        label: 'Writing or drafting tools (e.g. grammar checkers, email drafters, report generators)',
      },
      {
        id: 'search-research',
        label: 'Search or research tools (e.g. AI-powered search, document summarisers)',
      },
      {
        id: 'data-analysis',
        label: 'Data or analysis tools (e.g. forecasting, dashboards with AI-generated insights)',
      },
      {
        id: 'decision-support',
        label: 'Decision-support tools (e.g. tools that recommend actions or flag risks)',
      },
      {
        id: 'automation',
        label:
          'Automation tools (e.g. tools that complete tasks on your behalf — filing, sending, updating)',
      },
      {
        id: 'conversational-agents',
        label:
          'Conversational agents (e.g. chatbots, virtual assistants you have a back-and-forth with)',
      },
      {
        id: 'not-used-professionally',
        label: 'I have not used AI tools professionally',
      },
    ],
  },
  {
    id: 'ai_relationship',
    prompt:
      'When you think about the role AI plays in your work, which of the following feels most like your natural way of relating to it?',
    options: [
      { id: 'resource', label: 'A) A resource I draw on to get specific things done' },
      { id: 'system', label: 'B) A system I work through to complete tasks more efficiently' },
      { id: 'collaborator', label: 'C) A collaborator I think alongside when working through problems' },
      { id: 'assistant', label: 'D) An assistant I give direction to and guide toward what I need' },
    ],
  },
  {
    id: 'conversational_experience',
    prompt:
      'When an AI system feels more conversational or human-like in the way it responds, what is your experience of that?',
    options: [
      { id: 'unnecessary', label: 'A) I find it unnecessary — I prefer direct, functional responses' },
      { id: 'no-change', label: "B) It doesn't change much for me either way" },
      {
        id: 'easier-natural',
        label: 'C) It makes the interaction feel easier and more natural to navigate',
      },
      {
        id: 'changes-engagement',
        label: 'D) It changes how I work with it — I engage more and think through things differently',
      },
    ],
  },
];

const roleDurationOptions: { value: RoleDuration; label: string }[] = [
  { value: 'less-than-1', label: 'Less than 1 year' },
  { value: '1-3', label: '1–3 years' },
  { value: '4-7', label: '4–7 years' },
  { value: '8-15', label: '8–15 years' },
  { value: 'more-than-15', label: 'More than 15 years' },
];

const organizationSizeOptions: { value: OrganizationSize; label: string }[] = [
  { value: 'solo-freelance', label: 'Just me / freelance' },
  { value: '2-50', label: '2–50 people' },
  { value: '51-500', label: '51–500 people' },
  { value: '501-5000', label: '501–5,000 people' },
  { value: 'more-than-5000', label: 'More than 5,000 people' },
];

function getOptionLabel(question: BaselineQuestion, optionId: string): string {
  if (optionId === 'other') {
    return 'Other';
  }
  return question.options.find((option) => option.id === optionId)?.label ?? optionId;
}

function isBaselineQuestionAnswered(
  question: BaselineQuestion,
  answers: Record<string, string | string[]>,
  otherTexts: Record<string, string>
): boolean {
  const answer = answers[question.id];

  if (question.multiSelect) {
    const selected = Array.isArray(answer) ? answer : [];
    if (selected.length === 0) {
      return false;
    }
    if (selected.includes('other') && !otherTexts[question.id]?.trim()) {
      return false;
    }
    return true;
  }

  return typeof answer === 'string' && Boolean(answer);
}

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
  const [roleDuration, setRoleDuration] = useState<RoleDuration | ''>('');
  const [organizationSize, setOrganizationSize] = useState<OrganizationSize | ''>('');
  const [trainingStatusValue, setTrainingStatusValue] = useState<TrainingStatus>('untrained');
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [otherTexts, setOtherTexts] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isComplete = useMemo(
    () =>
      Boolean(functionalArea) &&
      Boolean(level) &&
      Boolean(roleDuration) &&
      Boolean(organizationSize) &&
      baselineQuestions.every((question) => isBaselineQuestionAnswered(question, answers, otherTexts)),
    [answers, functionalArea, level, organizationSize, otherTexts, roleDuration]
  );

  const handleSingleAnswer = (questionId: string, optionId: string) => {
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
  };

  const handleMultiAnswer = (questionId: string, optionId: string) => {
    setAnswers((current) => {
      const existing = Array.isArray(current[questionId]) ? current[questionId] : [];
      const next = existing.includes(optionId)
        ? existing.filter((id) => id !== optionId)
        : [...existing, optionId];
      return { ...current, [questionId]: next };
    });
  };

  const handleOtherText = (questionId: string, value: string) => {
    setOtherTexts((current) => ({ ...current, [questionId]: value }));
  };

  const toggleOtherSelection = (questionId: string) => {
    setAnswers((current) => {
      const existing = Array.isArray(current[questionId]) ? current[questionId] : [];
      const hasOther = existing.includes('other');
      const next = hasOther ? existing.filter((id) => id !== 'other') : [...existing, 'other'];
      return { ...current, [questionId]: next };
    });
  };

  const buildBaselineSubmissionAnswers = () =>
    baselineQuestions.map((question) => {
      const answer = answers[question.id];

      if (question.multiSelect) {
        const selected = Array.isArray(answer) ? answer : [];
        const labels = selected.map((optionId) => {
          if (optionId === 'other') {
            const otherText = otherTexts[question.id]?.trim();
            return otherText ? `Other: ${otherText}` : 'Other';
          }
          return getOptionLabel(question, optionId);
        });

        return {
          question_id: question.id,
          value: selected.join(','),
          label: labels.join('; '),
          metadata: {
            prompt: question.prompt,
            selected_option_ids: selected,
            selected_labels: labels,
            other_text: otherTexts[question.id]?.trim() || null,
          },
        };
      }

      const optionId = typeof answer === 'string' ? answer : '';
      return {
        question_id: question.id,
        value: optionId,
        label: getOptionLabel(question, optionId),
        metadata: {
          prompt: question.prompt,
        },
      };
    });

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
    const aiRelationshipAnswer =
      typeof answers.ai_relationship === 'string' ? answers.ai_relationship : null;

    window.sessionStorage.setItem(
      'ai-simulator-pre-questionnaire',
      JSON.stringify({
        functionalArea,
        level,
        roleDuration,
        organizationSize,
        trainingStatus: trainingStatusValue,
        answers,
        otherTexts,
        completedAt,
      })
    );

    try {
      const session = await startSimulatorSession({
        participant_profile: {
          function: functionalArea,
          level,
          // Send role_duration / organization_size both as first-class fields
          // (typed on the backend ParticipantProfile schema for analytics) AND
          // inside metadata (preserves Katie's original payload shape so any
          // existing consumers that read metadata.role_duration still work).
          role_duration: roleDuration,
          organization_size: organizationSize,
          ai_relationship_label: aiRelationshipAnswer,
          metadata: {
            training_status: trainingStatusValue,
            questionnaire_source: 'pre_questionnaire_page',
            role_duration: roleDuration,
            organization_size: organizationSize,
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
        // Same dual-write as above: first-class fields for analytics, metadata
        // copy for backward compatibility with any consumer that reads the
        // pre_questionnaire dict directly.
        role_duration: roleDuration,
        organization_size: organizationSize,
        answers: buildBaselineSubmissionAnswers(),
        metadata: {
          completed_at: completedAt,
          role_duration: roleDuration,
          organization_size: organizationSize,
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
                  <Label className="mb-2 block text-sm text-slate-300">
                    How long have you been in your current role or industry?
                  </Label>
                  <Select value={roleDuration} onValueChange={(value) => setRoleDuration(value as RoleDuration)}>
                    <SelectTrigger className="border-slate-700 bg-slate-950 text-white">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      {roleDurationOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="mb-2 block text-sm text-slate-300">
                    How large is the organisation you work in?
                  </Label>
                  <Select
                    value={organizationSize}
                    onValueChange={(value) => setOrganizationSize(value as OrganizationSize)}
                  >
                    <SelectTrigger className="border-slate-700 bg-slate-950 text-white">
                      <SelectValue placeholder="Select organisation size" />
                    </SelectTrigger>
                    <SelectContent>
                      {organizationSizeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
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

                    <div className="space-y-3">
                      {question.options.map((option) => {
                        const answer = answers[question.id];
                        const selected = question.multiSelect
                          ? Array.isArray(answer) && answer.includes(option.id)
                          : answer === option.id;

                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() =>
                              question.multiSelect
                                ? handleMultiAnswer(question.id, option.id)
                                : handleSingleAnswer(question.id, option.id)
                            }
                            className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left text-sm transition ${
                              selected
                                ? 'border-blue-500 bg-blue-50 text-blue-950'
                                : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'
                            }`}
                          >
                            <CheckCircle2
                              className={`mt-0.5 h-5 w-5 shrink-0 ${selected ? 'text-blue-600' : 'text-slate-300'}`}
                            />
                            <span>{option.label}</span>
                          </button>
                        );
                      })}

                      {question.hasOther && (
                        <div className="rounded-xl border border-slate-200 p-4">
                          <button
                            type="button"
                            onClick={() => toggleOtherSelection(question.id)}
                            className={`mb-3 flex w-full items-start gap-3 text-left text-sm transition ${
                              Array.isArray(answers[question.id]) && answers[question.id].includes('other')
                                ? 'text-blue-950'
                                : 'text-slate-700'
                            }`}
                          >
                            <CheckCircle2
                              className={`mt-0.5 h-5 w-5 shrink-0 ${
                                Array.isArray(answers[question.id]) && answers[question.id].includes('other')
                                  ? 'text-blue-600'
                                  : 'text-slate-300'
                              }`}
                            />
                            <span>Other: ___________</span>
                          </button>
                          {Array.isArray(answers[question.id]) && answers[question.id].includes('other') && (
                            <Input
                              value={otherTexts[question.id] ?? ''}
                              onChange={(event) => handleOtherText(question.id, event.target.value)}
                              placeholder="Please specify"
                              className="border-slate-300 bg-white text-slate-950"
                            />
                          )}
                        </div>
                      )}
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
