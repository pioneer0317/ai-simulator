import { useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, ShieldCheck } from 'lucide-react';
import {
  getAdminEventsCsvUrl,
  getSimulatorSession,
  listAdminSessions,
  type AdminSessionSummary,
  type SessionStateResponse,
} from '../lib/simulatorApi';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';

function formatDate(value?: string | null) {
  if (!value) return 'Not completed';
  return new Date(value).toLocaleString();
}

export function AdminDashboardPage() {
  const [sessions, setSessions] = useState<AdminSessionSummary[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<SessionStateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const completedCount = useMemo(
    () => sessions.filter((session) => session.status === 'completed').length,
    [sessions]
  );

  const totalEvents = useMemo(
    () => sessions.reduce((total, session) => total + session.event_count, 0),
    [sessions]
  );

  const refresh = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sessionRows = await listAdminSessions();
      setSessions(sessionRows);
      const nextSelectedId = selectedSessionId ?? sessionRows[0]?.session_id ?? null;
      setSelectedSessionId(nextSelectedId);
      if (nextSelectedId) {
        setSelectedSession(await getSimulatorSession(nextSelectedId));
      } else {
        setSelectedSession(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load admin dashboard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setError(null);
    try {
      setSelectedSession(await getSimulatorSession(sessionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load session details.');
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 py-2 text-sm font-semibold text-emerald-100">
              <ShieldCheck className="h-4 w-4" />
              Admin review
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Simulation Results Dashboard</h1>
            <p className="mt-3 max-w-2xl text-slate-300">
              Separate review surface for sessions, event logs, and exports. This route is not linked from the participant flow.
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={refresh} disabled={isLoading} variant="secondary">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <a href={getAdminEventsCsvUrl()}>
              <Button className="bg-emerald-500 text-slate-950 hover:bg-emerald-400">
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            </a>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardContent className="p-5">
              <div className="text-sm text-slate-400">Sessions</div>
              <div className="mt-2 text-3xl font-bold">{sessions.length}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardContent className="p-5">
              <div className="text-sm text-slate-400">Completed</div>
              <div className="mt-2 text-3xl font-bold">{completedCount}</div>
            </CardContent>
          </Card>
          <Card className="border-slate-800 bg-slate-900 text-white">
            <CardContent className="p-5">
              <div className="text-sm text-slate-400">Tracked events</div>
              <div className="mt-2 text-3xl font-bold">{totalEvents}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
          <Card className="border-slate-800 bg-white text-slate-950">
            <CardContent className="p-0">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-bold">Sessions</h2>
              </div>
              <div className="max-h-[620px] overflow-auto">
                {sessions.length === 0 && (
                  <div className="p-5 text-sm text-slate-500">
                    {isLoading ? 'Loading sessions...' : 'No sessions recorded yet.'}
                  </div>
                )}
                {sessions.map((session) => (
                  <button
                    key={session.session_id}
                    onClick={() => void selectSession(session.session_id)}
                    className={`block w-full border-b border-slate-100 px-5 py-4 text-left transition hover:bg-slate-50 ${
                      selectedSessionId === session.session_id ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-semibold">{session.participant_profile.participant_id || 'Anonymous participant'}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                        {session.status}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">{session.session_id}</div>
                    <div className="mt-2 text-sm text-slate-600">
                      {session.event_count} events · started {formatDate(session.started_at)}
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-white text-slate-950">
            <CardContent className="p-0">
              <div className="border-b border-slate-200 px-5 py-4">
                <h2 className="font-bold">Event timeline</h2>
              </div>
              {!selectedSession && (
                <div className="p-5 text-sm text-slate-500">Select a session to inspect its events.</div>
              )}
              {selectedSession && (
                <div className="max-h-[620px] overflow-auto">
                  {selectedSession.events.map((event, index) => (
                    <div key={event.event_id} className="border-b border-slate-100 px-5 py-4">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="font-semibold">
                          {index + 1}. {event.event_type}
                        </div>
                        <div className="text-xs text-slate-500">{formatDate(event.created_at)}</div>
                      </div>
                      <div className="text-sm text-slate-600">
                        Actor: {event.actor}
                        {event.artifact_id ? ` · Artifact: ${event.artifact_id}` : ''}
                      </div>
                      {event.content && (
                        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                          {event.content}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
