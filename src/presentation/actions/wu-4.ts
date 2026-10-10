'use server';

import { redirect } from 'next/navigation';
import { getUseCases } from '@shared/di/container';
import type { PlanName } from '@domain/value-objects/plan';
import { CompanyId } from '@domain/value-objects/branded-id';
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

export async function startCheckoutAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');

  const companyId = String(formData.get('companyId') ?? '');
  const plan = String(formData.get('plan') ?? '') as PlanName;

  if (!companyId || (plan !== 'pro' && plan !== 'team')) {
    throw new ActionError('Invalid plan selection');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  try {
    const useCases = await getUseCases();
    const result = await useCases.startCheckout.execute({
      companyId: CompanyId.fromString(companyId),
      actorId: session.userId,
      plan,
      appUrl,
    });
    redirect(result.url);
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err;
    throw new ActionError(toError(err));
  }
}

export async function openCustomerPortalAction(formData: FormData): Promise<void> {
  const session = await getCurrentSession();
  if (!session) throw new ActionError('Not signed in');

  const companyId = String(formData.get('companyId') ?? '');
  if (!companyId) throw new ActionError('Missing companyId');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  try {
    const useCases = await getUseCases();
    const result = await useCases.openCustomerPortal.execute({
      companyId: CompanyId.fromString(companyId),
      actorId: session.userId,
      appUrl,
    });
    redirect(result.url);
  } catch (err) {
    if (err instanceof Error && err.message === 'NEXT_REDIRECT') throw err;
    throw new ActionError(toError(err));
  }
}