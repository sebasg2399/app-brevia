'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUseCases } from '@shared/di/container';
import { AINoteId, CompanyId, SessionId, UserId } from '@domain/value-objects/branded-id';
import { DomainError } from '@domain/errors/domain-error';
import { getCurrentSession } from './auth';

class ActionError extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'ActionError';
  }
}

function toError(err: unknown): string {
  if (err instanceof DomainError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

export async function createTranscriptAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');

  const companyId = String(formData.get('companyId') ?? '');
  const sessionId = String(formData.get('sessionId') ?? '');
  const text = String(formData.get('text') ?? '');

  if (!companyId || !sessionId || !text) {
    throw new ActionError('Missing required fields');
  }
  if (text.trim().length < 200) {
    throw new ActionError('Transcript must be at least 200 characters');
  }
  if (text.length > 50000) {
    throw new ActionError('Transcript too long (max 50000 chars)');
  }

  try {
    const useCases = await getUseCases();
    const result = await useCases.createTranscript.execute({
      companyId: CompanyId.fromString(companyId),
      actorId: session.userId,
      sessionId: SessionId.fromString(sessionId),
      text,
    });
    void result;
  } catch (err) {
    throw new ActionError(toError(err));
  }
  revalidatePath(`/sessions/${sessionId}`);
  revalidatePath('/dashboard');
  redirect(`/sessions/${sessionId}?success=AI+notes+generated`);
}

export async function retryNotesAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');

  const companyId = String(formData.get('companyId') ?? '');
  const notesId = String(formData.get('notesId') ?? '');
  if (!companyId || !notesId) {
    throw new ActionError('Missing required fields');
  }

  try {
    const useCases = await getUseCases();
    await useCases.retryNotes.execute({
      companyId: CompanyId.fromString(companyId),
      actorId: session.userId,
      notesId: AINoteId.fromString(notesId),
    });
  } catch (err) {
    throw new ActionError(toError(err));
  }
  revalidatePath('/dashboard');
  redirect('/dashboard?success=Retrying+AI+notes');
}

void UserId;