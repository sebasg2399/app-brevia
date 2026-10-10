'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUseCases } from '@shared/di/container';
import { acceptInvitationSchema } from '@shared/zod-schemas';
import { DomainError } from '@domain/errors/domain-error';

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

export async function acceptInvitationAction(formData: FormData): Promise<void> {
  const parsed = acceptInvitationSchema.safeParse({
    token: formData.get('token'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => `${i.path.join('.') || 'field'}: ${i.message}`).join(', ');
    throw new ActionError(msg);
  }

  let sessionToken: string | null = null;
  try {
    const useCases = await getUseCases();
    const result = await useCases.acceptInvitation.execute(parsed.data);
    sessionToken = result.session?.accessToken ?? null;
  } catch (err) {
    throw new ActionError(toError(err));
  }

  if (sessionToken) {
    const cookieStore = await cookies();
    cookieStore.set('sb-access-token', sessionToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });
  }
  redirect('/dashboard');
}