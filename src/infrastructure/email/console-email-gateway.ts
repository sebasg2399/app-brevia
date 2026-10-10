import 'server-only';
import type { EmailGateway } from '@app/ports/email-gateway';
import type { Email } from '@domain/value-objects/email';

export class ConsoleEmailGateway implements EmailGateway {
  async send(input: { to: Email; subject: string; html: string; text: string }): Promise<void> {
    // In dev/test, just log so we don't need a real SMTP server.
    console.warn(`[email] to=${input.to.value} subject=${input.subject}`);
  }
}