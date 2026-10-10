import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentSession } from '@ui/actions/auth';
import { createSupabaseServerClient } from '@infra/supabase/client';
import { createSupabaseServiceClient } from '@infra/supabase/client';
import { Nav } from '@ui/components/nav';
import { AINoteId, CompanyId, SessionId, TranscriptId } from '@domain/value-objects/branded-id';
import { Plan } from '@domain/value-objects/plan';
import { ActionItem } from '@domain/value-objects/action-item';
import { Transcript } from '@domain/entities/transcript';
import { AINotes } from '@domain/entities/ai-notes';

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const { id } = await params;
  const { success, error } = await searchParams;
  const session = await getCurrentSession();
  if (!session) redirect('/sign-in');

  const db = await createSupabaseServerClient();
  const { data: sessionRow, error: queryError } = await db
    .from('sessions')
    .select(
      'id, company_id, coach_id, client_id, scheduled_at, duration_minutes, status, completed_at, canceled_at, created_at, coaches:coach_id ( id, display_name ), clients:client_id ( id, name )',
    )
    .eq('id', id)
    .maybeSingle();

  if (queryError || !sessionRow) notFound();
  const companyId = sessionRow.company_id;

  // Service role for transcript + ai_notes read (bypasses RLS so we can show even
  // if user is not directly the assigned coach). The page is otherwise protected
  // by the session being in a company the user belongs to.
  const svc = createSupabaseServiceClient();

  const { data: transcriptRow } = await svc
    .from('transcripts')
    .select('id, text, created_at')
    .eq('session_id', id)
    .maybeSingle();

  const { data: notesRow } = transcriptRow
    ? await svc
        .from('ai_notes')
        .select('id, status, summary, action_items, next_session_brief, model, error_message, created_at, updated_at')
        .eq('transcript_id', transcriptRow.id)
        .maybeSingle()
    : { data: null };

  // Quota status
  const { data: subRow } = await svc
    .from('subscriptions')
    .select('plan, status, current_period_end')
    .eq('company_id', companyId)
    .maybeSingle();
  const plan = subRow ? Plan.fromName(subRow.plan) : Plan.free();
  const { count: usedThisMonth } = await svc
    .from('ai_notes')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'ready')
    .gte('created_at', `${new Date().toISOString().slice(0, 7)}-01T00:00:00.000Z`);

  // Hydrate domain entities for rendering (use factories that don't re-validate)
  let transcript: Transcript | null = null;
  let notes: AINotes | null = null;
  if (transcriptRow) {
    transcript = Transcript.reconstruct({
      id: TranscriptId.fromString(transcriptRow.id),
      companyId: CompanyId.fromString(companyId),
      sessionId: SessionId.fromString(id),
      text: transcriptRow.text,
      createdAt: transcriptRow.created_at,
    });
  }
  if (notesRow) {
    notes = AINotes.reconstruct({
      id: AINoteId.fromString(notesRow.id),
      companyId: CompanyId.fromString(companyId),
      transcriptId: TranscriptId.fromString(transcriptRow!.id),
      status: notesRow.status,
      summary: notesRow.summary,
      actionItems: ((notesRow.action_items ?? []) as Array<{ title: string; dueDate: string | null }>).map(
        (j) => ActionItem.create({ title: j.title, dueDate: j.dueDate }),
      ),
      nextSessionBrief: notesRow.next_session_brief,
      model: notesRow.model,
      rawResponse: null,
      errorMessage: notesRow.error_message,
      createdAt: notesRow.created_at,
      updatedAt: notesRow.updated_at,
    });
  }

  const remaining = Math.max(0, plan.monthlyNotes - (usedThisMonth ?? 0));

  return (
    <>
      <Nav email={session.email.value} current="/sessions" />
      <main className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/sessions" className="text-sm text-slate-500 hover:text-slate-900">
          ← All sessions
        </Link>

        <h1 className="mb-1 mt-4 text-2xl font-semibold text-slate-900">Session detail</h1>
        <p className="text-sm text-slate-500">
          {new Date(sessionRow.scheduled_at).toLocaleString()} · {sessionRow.duration_minutes} min
        </p>

        {success && (
          <div className="mt-4 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-xs font-medium text-slate-500">Status</dt>
              <dd className="mt-1 text-slate-900">{sessionRow.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Coach</dt>
              <dd className="mt-1 text-slate-900">
                {(sessionRow.coaches as { display_name?: string }[] | null)?.[0]?.display_name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">Client</dt>
              <dd className="mt-1 text-slate-900">
                {(sessionRow.clients as { name?: string }[] | null)?.[0]?.name ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-slate-500">AI notes quota</dt>
              <dd className="mt-1 text-slate-900">
                {usedThisMonth ?? 0} / {plan.monthlyNotes} ({plan.displayName}) · {remaining} left
              </dd>
            </div>
          </dl>

          {sessionRow.status === 'scheduled' && (
            <div className="mt-6 flex gap-2 border-t border-slate-100 pt-4">
              <form
                action={async (fd: FormData) => {
                  'use server';
                  const { completeSessionAction } = await import('@ui/actions/wu-2');
                  await completeSessionAction(fd);
                }}
              >
                <input type="hidden" name="companyId" value={companyId} />
                <input type="hidden" name="sessionId" value={sessionRow.id} />
                <button
                  type="submit"
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
                >
                  Mark completed
                </button>
              </form>
              <form
                action={async (fd: FormData) => {
                  'use server';
                  const { cancelSessionAction } = await import('@ui/actions/wu-2');
                  await cancelSessionAction(fd);
                }}
              >
                <input type="hidden" name="companyId" value={companyId} />
                <input type="hidden" name="sessionId" value={sessionRow.id} />
                <button
                  type="submit"
                  className="rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                >
                  Cancel session
                </button>
              </form>
            </div>
          )}
        </section>

        {/* Transcript input — only when status is completed and no transcript yet */}
        {sessionRow.status === 'completed' && !transcript && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-1 text-lg font-semibold text-slate-900">Add transcript</h2>
            <p className="mb-3 text-xs text-slate-500">
              Paste the session transcript (200-50000 chars). AI notes will be generated automatically.
            </p>
            <form
              action={async (fd: FormData) => {
                'use server';
                const { createTranscriptAction } = await import('@ui/actions/wu-3');
                await createTranscriptAction(fd);
              }}
              className="flex flex-col gap-3"
            >
              <input type="hidden" name="companyId" value={companyId} />
              <input type="hidden" name="sessionId" value={sessionRow.id} />
              <textarea
                name="text"
                rows={8}
                required
                minLength={200}
                maxLength={50000}
                placeholder="Paste the session transcript here..."
                className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="self-start rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
              >
                Generate AI notes
              </button>
            </form>
          </section>
        )}

        {/* Display transcript if exists */}
        {transcript && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Transcript</h2>
              <span className="text-xs text-slate-400">
                {transcript.text.length.toLocaleString()} chars · immutable
              </span>
            </div>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-xs text-slate-700">
              {transcript.text}
            </pre>
          </section>
        )}

        {/* AI Notes */}
        {notes && (
          <section className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">AI notes</h2>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  notes.status === 'ready'
                    ? 'bg-green-100 text-green-700'
                    : notes.status === 'pending'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-red-100 text-red-700'
                }`}
              >
                {notes.status}
              </span>
            </div>

            {notes.status === 'pending' && (
              <p className="text-sm text-slate-500">Generating… (this may take a few seconds)</p>
            )}

            {notes.status === 'failed' && (
              <div>
                <p className="mb-3 text-sm text-red-700">
                  Generation failed: {notes.errorMessage ?? 'unknown error'}
                </p>
                <form
                  action={async (fd: FormData) => {
                    'use server';
                    const { retryNotesAction } = await import('@ui/actions/wu-3');
                    await retryNotesAction(fd);
                  }}
                >
                  <input type="hidden" name="companyId" value={companyId} />
                  <input type="hidden" name="notesId" value={notes.id.toString()} />
                  <button
                    type="submit"
                    className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Retry generation
                  </button>
                </form>
              </div>
            )}

            {notes.status === 'ready' && (
              <div className="space-y-4">
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Summary
                  </h3>
                  <p className="text-sm text-slate-800">{notes.summary}</p>
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Action items
                  </h3>
                  <ul className="space-y-1">
                    {notes.actionItems.map((it, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-800">
                        <span className="mt-0.5 text-slate-400">•</span>
                        <span>
                          {it.title}
                          {it.dueDate && (
                            <span className="ml-2 text-xs text-slate-400">
                              (due {new Date(it.dueDate).toLocaleDateString()})
                            </span>
                          )}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Brief for next session
                  </h3>
                  <p className="text-sm text-slate-800">{notes.nextSessionBrief}</p>
                </div>
                {notes.model && (
                  <p className="pt-2 text-xs text-slate-400">Generated by {notes.model}</p>
                )}
              </div>
            )}
          </section>
        )}
      </main>
    </>
  );
}