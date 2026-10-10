'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUseCases } from '@shared/di/container';
import {
  bookSessionSchema,
  cancelSessionActionSchema,
  completeSessionActionSchema,
  createCoachSchema,
  createClientSchema,
  deleteClientSchema,
  updateCoachBioSchema,
} from '@shared/zod-schemas';
import { ClientId, CoachId, CompanyId, SessionId, UserId } from '@domain/value-objects/branded-id';
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

function parseOrThrow<T>(
  schema: {
    safeParse: (input: unknown) =>
      | { success: true; data: T }
      | {
          success: false;
          error: { issues: Array<{ path: (string | number)[]; message: string }> };
        };
  },
  input: unknown,
): T {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'field'}: ${i.message}`)
      .join(', ');
    throw new ActionError(msg);
  }
  return parsed.data;
}

export async function createCoachAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');
  const focusAreas = formData
    .getAll('focusAreas')
    .map(String)
    .filter((s) => s.trim().length > 0);
  const data = parseOrThrow(createCoachSchema, {
    companyId: formData.get('companyId'),
    userId: formData.get('userId'),
    displayName: formData.get('displayName'),
    bio: formData.get('bio') ?? '',
    focusAreas,
    hourlyRateCents: formData.get('hourlyRateCents') ?? 0,
  });
  try {
    const useCases = await getUseCases();
    await useCases.createCoach.execute({
      companyId: CompanyId.fromString(data.companyId),
      actorId: session.userId,
      userId: UserId.fromString(data.userId),
      displayName: data.displayName,
      bio: data.bio,
      focusAreas: data.focusAreas,
      hourlyRateCents: data.hourlyRateCents,
    });
  } catch (err) {
    throw new ActionError(toError(err));
  }
  revalidatePath('/coaches');
  redirect('/coaches?success=Coach+created');
}

export async function updateCoachBioAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');
  const data = parseOrThrow(updateCoachBioSchema, {
    companyId: formData.get('companyId'),
    coachId: formData.get('coachId'),
    bio: formData.get('bio') ?? '',
  });
  try {
    const useCases = await getUseCases();
    await useCases.updateCoachBio.execute({
      companyId: CompanyId.fromString(data.companyId),
      actorId: session.userId,
      coachId: CoachId.fromString(data.coachId),
      bio: data.bio,
    });
  } catch (err) {
    throw new ActionError(toError(err));
  }
  revalidatePath('/coaches');
  redirect('/coaches?success=Coach+updated');
}

export async function createClientAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');
  const data = parseOrThrow(createClientSchema, {
    companyId: formData.get('companyId'),
    name: formData.get('name'),
    email: formData.get('email'),
    notes: formData.get('notes'),
  });
  try {
    const useCases = await getUseCases();
    await useCases.createClient.execute({
      companyId: CompanyId.fromString(data.companyId),
      actorId: session.userId,
      name: data.name,
      email: data.email ?? null,
      notes: data.notes ?? null,
    });
  } catch (err) {
    throw new ActionError(toError(err));
  }
  revalidatePath('/clients');
  redirect('/clients?success=Client+added');
}

export async function deleteClientAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');
  const data = parseOrThrow(deleteClientSchema, {
    companyId: formData.get('companyId'),
    clientId: formData.get('clientId'),
  });
  try {
    const useCases = await getUseCases();
    await useCases.deleteClient.execute({
      companyId: CompanyId.fromString(data.companyId),
      actorId: session.userId,
      clientId: ClientId.fromString(data.clientId),
    });
  } catch (err) {
    throw new ActionError(toError(err));
  }
  revalidatePath('/clients');
  redirect('/clients?success=Client+removed');
}

export async function bookSessionAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');
  const data = parseOrThrow(bookSessionSchema, {
    companyId: formData.get('companyId'),
    coachId: formData.get('coachId'),
    clientId: formData.get('clientId'),
    scheduledAt: formData.get('scheduledAt'),
    durationMinutes: formData.get('durationMinutes'),
  });
  try {
    const useCases = await getUseCases();
    await useCases.bookSession.execute({
      companyId: CompanyId.fromString(data.companyId),
      actorId: session.userId,
      coachId: CoachId.fromString(data.coachId),
      clientId: ClientId.fromString(data.clientId),
      scheduledAt: new Date(data.scheduledAt).toISOString(),
      durationMinutes: data.durationMinutes,
    });
  } catch (err) {
    throw new ActionError(toError(err));
  }
  revalidatePath('/sessions');
  redirect('/sessions?success=Session+booked');
}

export async function completeSessionAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');
  const data = parseOrThrow(completeSessionActionSchema, {
    companyId: formData.get('companyId'),
    sessionId: formData.get('sessionId'),
  });
  try {
    const useCases = await getUseCases();
    await useCases.completeSession.execute({
      companyId: CompanyId.fromString(data.companyId),
      actorId: session.userId,
      sessionId: SessionId.fromString(data.sessionId),
    });
  } catch (err) {
    throw new ActionError(toError(err));
  }
  revalidatePath('/sessions');
  revalidatePath(`/sessions/${data.sessionId}`);
  redirect(`/sessions/${data.sessionId}?success=Session+completed`);
}

export async function cancelSessionAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');
  const data = parseOrThrow(cancelSessionActionSchema, {
    companyId: formData.get('companyId'),
    sessionId: formData.get('sessionId'),
  });
  try {
    const useCases = await getUseCases();
    await useCases.cancelSession.execute({
      companyId: CompanyId.fromString(data.companyId),
      actorId: session.userId,
      sessionId: SessionId.fromString(data.sessionId),
    });
  } catch (err) {
    throw new ActionError(toError(err));
  }
  revalidatePath('/sessions');
  revalidatePath(`/sessions/${data.sessionId}`);
  redirect(`/sessions/${data.sessionId}?success=Session+canceled`);
}
