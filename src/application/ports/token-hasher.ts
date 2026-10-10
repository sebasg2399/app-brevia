export interface TokenHasher {
  hash(token: string): Promise<string>;
  compare(token: string, hash: string): Promise<boolean>;
  generateToken(): Promise<string>;
}
