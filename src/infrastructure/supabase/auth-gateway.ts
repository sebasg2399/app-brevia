import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AuthGateway, AuthSession } from '@app/ports/auth-gateway';
import { Email } from '@domain/value-objects/email';
import { UserId } from '@domain/value-objects/branded-id';
import { NotFoundError, UnauthorizedError } from '@domain/errors/domain-error';

export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly db: SupabaseClient) {}

  async signUp(input: { email: Email; password: string }): Promise<{ userId: UserId; email: Email; session: AuthSession | null }> {
    const { data, error } = await this.db.auth.signUp({
      email: input.email.value,
      password: input.password,
    });
    if (error || !data.user) {
      throw new Error(error?.message ?? 'Sign up failed');
    }
    const userId = UserId.fromString(data.user.id);
    const email = Email.create(data.user.email ?? input.email.value);
    const session = data.session
      ? this.toSession(
          userId,
          email,
          data.session.access_token,
          data.session.refresh_token,
          data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
        )
      : null;
    return { userId, email, session };
  }

  async signIn(input: { email: Email; password: string }): Promise<AuthSession> {
    const { data, error } = await this.db.auth.signInWithPassword({
      email: input.email.value,
      password: input.password,
    });
    if (error || !data.user || !data.session) {
      throw new UnauthorizedError(error?.message ?? 'Invalid credentials');
    }
    return this.toSession(
      UserId.fromString(data.user.id),
      Email.create(data.user.email ?? input.email.value),
      data.session.access_token,
      data.session.refresh_token,
      data.session.expires_at ?? Math.floor(Date.now() / 1000) + 3600,
    );
  }

  async signOut(input: { accessToken: string }): Promise<void> {
    await this.db.auth.signOut();
    void input;
  }

  async getCurrentUser(accessToken: string): Promise<{ userId: UserId; email: Email } | null> {
    const { data, error } = await this.db.auth.getUser(accessToken);
    if (error || !data.user) return null;
    return {
      userId: UserId.fromString(data.user.id),
      email: Email.create(data.user.email ?? ''),
    };
  }

  private toSession(
    userId: UserId,
    email: Email,
    accessToken: string,
    refreshToken: string,
    expiresAt: number | string,
  ): AuthSession {
    const expiresIso =
      typeof expiresAt === 'number' ? new Date(expiresAt * 1000).toISOString() : new Date(expiresAt).toISOString();
    return { userId, email, accessToken, refreshToken, expiresAt: expiresIso };
  }
}

// Re-export for ts to not flag unused
export type { SupabaseClient };
void NotFoundError;