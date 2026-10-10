'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUseCases } from '@shared/di/container';
import { signInSchema, signUpSchema } from '@shared/zod-schemas';
import { Email } from '@domain/value-objects/email';
import { UserId } from '@domain/value-objects/branded-id';
import { DomainError } from '@domain/errors/domain-error';
import { createSupabaseServerClient } from '@infra/supabase/client';

class ActionError extends Error {
  constructor(public readonly message: string) {
    super(message);
    this.name = 'ActionError';
  }
}

function toErrorMessage(err: unknown): string {
  if (err instanceof DomainError) return err.message;
  if (err instanceof Error) return err.message;
  return 'Unknown error';
}

export async function signUpAction(formData: FormData): Promise<void> {
  const parsed = signUpSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
    workspaceName: formData.get('workspaceName'),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'field'}: ${i.message}`)
      .join(', ');
    throw new ActionError(msg);
  }

  let sessionToken: string | null = null;
  try {
    const useCases = await getUseCases();
    const result = await useCases.signUp.execute(parsed.data);
    sessionToken = result.session?.accessToken ?? null;
  } catch (err) {
    throw new ActionError(toErrorMessage(err));
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

export async function signInAction(formData: FormData): Promise<void> {
  const parsed = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  if (!parsed.success) {
    const msg = parsed.error.issues
      .map((i) => `${i.path.join('.') || 'field'}: ${i.message}`)
      .join(', ');
    throw new ActionError(msg);
  }

  let sessionToken: string | null = null;
  try {
    const useCases = await getUseCases();
    const result = await useCases.signIn.execute(parsed.data);
    sessionToken = result.session.accessToken;
  } catch (err) {
    throw new ActionError(toErrorMessage(err));
  }

  const cookieStore = await cookies();
  cookieStore.set('sb-access-token', sessionToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  redirect('/dashboard');
}

export async function signOutAction(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('sb-access-token');
  redirect('/sign-in');
}

export async function getCurrentSession(): Promise<{ userId: UserId; email: Email } | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('sb-access-token')?.value;
  if (!token) return null;
  const db = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser(token);
  if (error || !user) return null;
  return {
    userId: UserId.fromString(user.id),
    email: Email.create(user.email ?? ''),
  };
}
