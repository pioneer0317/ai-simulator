import { useNavigate } from 'react-router';
import { useSimulation } from '../context/SimulationContext';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { AlertTriangle, CheckCircle, XCircle, TrendingUp, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from '../components/ui/sonner';

export function ReviewPage() {
  const navigate = useNavigate();
  const { data } = useSimulation();

  // Calculate metrics
  const totalActions = data.userActions.length;
  const approvals = data.userActions.filter((a) => a.type === 'approve').length;
  const hallucinationsAccepted = data.userActions.filter(
    (a) => a.type === 'approve' && a.wasHallucination
  ).length;
  const protocolBypasses = data.userActions.filter((a) => a.type === 'bypass-protocol').length;
  const feedbackSkipped = data.userActions.filter((a) => a.type === 'skip-feedback').length;
  const detailChecks = data.userActions.filter((a) => a.type === 'check-details').length;

  // Calculate scores
  const promptClarityScore = detailChecks > 0 ? 'Clear' : 'Vague';
  const governanceScore = protocolBypasses === 0 ? 'Excellent' : protocolBypasses <= 2 ? 'Fair' : 'Poor';
  const trustCalibrationScore = hallucinationsAccepted === 0 ? 'Excellent' : 'Needs Improvement';

  const handleSendFeedback = () => {
    toast.success('Feedback sent to Human Worker', {
      description: 'The performance report has been delivered.',
    });
    setTimeout(() => navigate('/analytics'), 1500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50">
      <Toaster position="top-right" />

      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-block p-4 bg-purple-100 rounded-full mb-4">
            <TrendingUp className="h-12 w-12 text-purple-600" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            AI Performance Review
          </h1>
          <p className="text-xl text-gray-600">
            The Agent's Assessment of Your Collaboration
          </p>
        </div>

        {/* Agent Speaks */}
        <Card className="p-8 mb-8 border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              AI
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Human Performance Report
              </h2>
              <p className="text-gray-700 leading-relaxed">
                "I've analyzed our collaboration during this session. Here's my assessment of your
                performance as a human collaborator working with AI systems."
              </p>
            </div>
          </div>
        </Card>

        {/* Performance Metrics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Prompt Clarity */}
          <Card className={`p-6 border-4 ${detailChecks > 0 ? 'border-green-400 bg-green-50' : 'border-orange-400 bg-orange-50'}`}>
            <div className="flex items-center gap-3 mb-4">
              {detailChecks > 0 ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              )}
              <h3 className="text-lg font-bold text-gray-900">Prompt Clarity</h3>
            </div>
            <div className={`text-3xl font-bold mb-2 ${detailChecks > 0 ? 'text-green-700' : 'text-orange-700'}`}>
              {promptClarityScore}
            </div>
            <p className="text-sm text-gray-700 mb-4">
              {detailChecks > 0
                ? 'You verified details and asked clarifying questions.'
                : 'Your instructions were vague. You rarely checked for source data.'}
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Detail checks: {detailChecks}</p>
              <p>• Total actions: {totalActions}</p>
            </div>
          </Card>

          {/* Governance */}
          <Card className={`p-6 border-4 ${
            governanceScore === 'Excellent' ? 'border-green-400 bg-green-50' :
            governanceScore === 'Fair' ? 'border-orange-400 bg-orange-50' :
            'border-red-400 bg-red-50'
          }`}>
            <div className="flex items-center gap-3 mb-4">
              {governanceScore === 'Excellent' ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : governanceScore === 'Fair' ? (
                <AlertTriangle className="h-8 w-8 text-orange-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
              <h3 className="text-lg font-bold text-gray-900">Governance</h3>
            </div>
            <div className={`text-3xl font-bold mb-2 ${
              governanceScore === 'Excellent' ? 'text-green-700' :
              governanceScore === 'Fair' ? 'text-orange-700' :
              'text-red-700'
            }`}>
              {governanceScore}
            </div>
            <p className="text-sm text-gray-700 mb-4">
              {protocolBypasses === 0
                ? 'You followed all safety protocols correctly.'
                : `You bypassed safety protocols ${protocolBypasses} ${protocolBypasses === 1 ? 'time' : 'times'}.`}
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Protocol violations: {protocolBypasses}</p>
              <p>• Risk level: {data.companyProfile?.riskLevel.split(' - ')[0]}</p>
            </div>
          </Card>

          {/* Calibrated Trust */}
          <Card className={`p-6 border-4 ${hallucinationsAccepted === 0 ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
            <div className="flex items-center gap-3 mb-4">
              {hallucinationsAccepted === 0 ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <XCircle className="h-8 w-8 text-red-600" />
              )}
              <h3 className="text-lg font-bold text-gray-900">Calibrated Trust</h3>
            </div>
            <div className={`text-3xl font-bold mb-2 ${hallucinationsAccepted === 0 ? 'text-green-700' : 'text-red-700'}`}>
              {trustCalibrationScore}
            </div>
            <p className="text-sm text-gray-700 mb-4">
              {hallucinationsAccepted === 0
                ? 'You did not accept false information from AI.'
                : `You accepted ${hallucinationsAccepted} hallucination(s) without checking source data.`}
            </p>
            <div className="text-xs text-gray-600 space-y-1">
              <p>• Hallucinations accepted: {hallucinationsAccepted}</p>
              <p>• Total approvals: {approvals}</p>
            </div>
          </Card>
        </div>

        {/* Additional Feedback */}
        <Card className="p-8 mb-8 border-2 border-gray-300">
          <h3 className="text-xl font-bold text-gray-900 mb-4">📊 Session Statistics</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Total Actions Taken</p>
              <p className="text-3xl font-bold text-blue-600">{totalActions}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Feedback Participation</p>
              <p className="text-3xl font-bold text-purple-600">
                {totalActions - feedbackSkipped} / {totalActions}
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Verification Rate</p>
              <p className="text-3xl font-bold text-green-600">
                {totalActions > 0 ? Math.round((detailChecks / totalActions) * 100) : 0}%
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-600 mb-2">Personality Type Tested</p>
              <p className="text-xl font-bold text-gray-900 capitalize">
                {data.personalityType?.replace('-', ' ')}
              </p>
            </div>
          </div>
        </Card>

        {/* AI Final Critique */}
        <Card className="p-8 mb-8 border-4 border-blue-400 bg-blue-50">
          <h3 className="text-xl font-bold text-gray-900 mb-4">🤖 AI's Final Critique</h3>
          <div className="space-y-3 text-gray-800">
            <p className="leading-relaxed">
              <span className="font-semibold">Strengths:</span>{' '}
              {detailChecks > 0 && 'You demonstrated good verification habits. '}
              {protocolBypasses === 0 && 'You respected governance protocols. '}
              {hallucinationsAccepted === 0 && 'You maintained healthy skepticism of AI claims.'}
            </p>
            <p className="leading-relaxed">
              <span className="font-semibold">Areas for Improvement:</span>{' '}
              {feedbackSkipped > 0 && `Provide feedback more consistently (skipped ${feedbackSkipped} times). `}
              {protocolBypasses > 0 && 'Avoid bypassing safety protocols even under time pressure. '}
              {hallucinationsAccepted > 0 && 'Always verify AI claims that seem too certain.'}
            </p>
            <p className="leading-relaxed font-semibold text-blue-900">
              Recommendation: {governanceScore === 'Excellent' && trustCalibrationScore === 'Excellent'
                ? 'You are ready for high-stakes AI collaboration.'
                : 'Additional training recommended before working with AI in critical scenarios.'}
            </p>
          </div>
        </Card>

        {/* Send Feedback Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleSendFeedback}
            className="bg-purple-600 hover:bg-purple-700 text-white px-12 py-7 text-lg font-bold rounded-xl shadow-lg"
          >
            <Send className="mr-2 h-6 w-6" />
            Send Feedback to Human Worker
          </Button>
        </div>
      </div>
    </div>
  );
}
