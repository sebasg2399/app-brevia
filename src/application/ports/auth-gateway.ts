import type { UserId } from '@domain/value-objects/branded-id';
import type { Email } from '@domain/value-objects/email';

export interface AuthSession {
  readonly userId: UserId;
  readonly email: Email;
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: string;
}

export interface AuthGateway {
  signUp(input: { email: Email; password: string }): Promise<{ userId: UserId; email: Email; session: AuthSession | null }>;
  signIn(input: { email: Email; password: string }): Promise<AuthSession>;
  signOut(input: { accessToken: string }): Promise<void>;
  getCurrentUser(accessToken: string): Promise<{ userId: UserId; email: Email } | null>;
}