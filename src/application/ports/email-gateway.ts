import type { Email } from '@domain/value-objects/email';

export interface EmailGateway {
  send(input: { to: Email; subject: string; html: string; text: string }): Promise<void>;
}