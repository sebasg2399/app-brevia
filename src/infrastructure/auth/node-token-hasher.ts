import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { TokenHasher } from '@app/ports/token-hasher';

export class NodeTokenHasher implements TokenHasher {
  async hash(token: string): Promise<string> {
    return createHash('sha256').update(token).digest('hex');
  }

  async compare(token: string, hash: string): Promise<boolean> {
    const computed = createHash('sha256').update(token).digest('hex');
    const a = Buffer.from(computed, 'hex');
    const b = Buffer.from(hash, 'hex');
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  }

  async generateToken(): Promise<string> {
    return randomBytes(32).toString('hex');
  }
}
