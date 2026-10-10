'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getUseCases } from '@shared/di/container';
import { inviteMemberSchema, removeMemberSchema } from '@shared/zod-schemas';
import { CompanyId, MembershipId } from '@domain/value-objects/branded-id';
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

export async function inviteMemberAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');

  const parsed = inviteMemberSchema.safeParse({
    companyId: formData.get('companyId'),
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.') || 'field'}: ${i.message}`).join(', ');
    throw new ActionError(msg);
  }

  try {
    const useCases = await getUseCases();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    await useCases.inviteMember.execute({
      companyId: CompanyId.fromString(parsed.data.companyId),
      inviterId: session.userId,
      email: parsed.data.email,
      role: parsed.data.role,
      acceptUrl: ({ token }) => `${appUrl}/accept-invitation?token=${token}`,
    });
  } catch (err) {
    throw new ActionError(toError(err));
  }
  revalidatePath('/settings/members');
  redirect('/settings/members?success=Invitation+sent');
}

export async function removeMemberAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');

  const parsed = removeMemberSchema.safeParse({
    companyId: formData.get('companyId'),
    membershipId: formData.get('membershipId'),
  });
  if (!parsed.success) throw new ActionError('Invalid input');

  try {
    const useCases = await getUseCases();
    await useCases.removeMember.execute({
      companyId: CompanyId.fromString(parsed.data.companyId),
      actorId: session.userId,
      membershipId: MembershipId.fromString(parsed.data.membershipId),
    });
  } catch (err) {
    throw new ActionError(toError(err));
  }
  revalidatePath('/settings/members');
  redirect('/settings/members?success=Member+removed');
}