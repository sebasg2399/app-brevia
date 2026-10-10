import { describe, it, expect } from 'vitest';
import { Money } from '@domain/value-objects/money';

describe('Money', () => {
  describe('fromCents', () => {
    it('creates Money from positive integer cents', () => {
      const m = Money.fromCents(2900);
      expect(m.cents).toBe(2900);
      expect(m.currency).toBe('USD');
    });

    it('accepts zero cents', () => {
      const m = Money.fromCents(0);
      expect(m.cents).toBe(0);
    });

    it('throws on negative cents', () => {
      expect(() => Money.fromCents(-1)).toThrow('Money cannot be negative');
    });

    it('throws on non-integer cents', () => {
      expect(() => Money.fromCents(1.5)).toThrow('Money cents must be an integer');
    });

    it('accepts a different currency', () => {
      const m = Money.fromCents(1000, 'EUR');
      expect(m.currency).toBe('EUR');
    });

    it('throws on unsupported currency', () => {
      expect(() => Money.fromCents(100, 'ARS' as never)).toThrow('Unsupported currency');
    });
  });

  describe('USD / EUR helpers', () => {
    it('USD factory', () => {
      const m = Money.USD(5000);
      expect(m.cents).toBe(5000);
      expect(m.currency).toBe('USD');
    });

    it('EUR factory', () => {
      const m = Money.EUR(7500);
      expect(m.cents).toBe(7500);
      expect(m.currency).toBe('EUR');
    });
  });

  describe('arithmetic', () => {
    it('adds same-currency money', () => {
      const a = Money.USD(1000);
      const b = Money.USD(2500);
      expect(a.add(b).cents).toBe(3500);
    });

    it('throws when adding different currencies', () => {
      const a = Money.USD(1000);
      const b = Money.EUR(1000);
      expect(() => a.add(b)).toThrow('Currency mismatch');
    });
  });

  describe('display', () => {
    it('formats USD with two decimals', () => {
      expect(Money.USD(2900).display()).toBe('$29.00');
    });

    it('formats zero', () => {
      expect(Money.USD(0).display()).toBe('$0.00');
    });
  });

  describe('equality', () => {
    it('same cents + same currency are equal', () => {
      expect(Money.USD(1000).equals(Money.USD(1000))).toBe(true);
    });

    it('different cents are not equal', () => {
      expect(Money.USD(1000).equals(Money.USD(1001))).toBe(false);
    });

    it('different currency are not equal', () => {
      expect(Money.USD(1000).equals(Money.EUR(1000))).toBe(false);
    });
  });
});