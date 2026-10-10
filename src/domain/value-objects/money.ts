export type Currency = 'USD' | 'EUR';

const SUPPORTED_CURRENCIES: readonly Currency[] = ['USD', 'EUR'];

export class Money {
  private constructor(
    public readonly cents: number,
    public readonly currency: Currency,
  ) {}

  static fromCents(cents: number, currency: Currency = 'USD'): Money {
    if (!Number.isInteger(cents)) {
      throw new Error('Money cents must be an integer (use minor units, e.g. cents).');
    }
    if (cents < 0) {
      throw new Error('Money cannot be negative.');
    }
    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      throw new Error(`Unsupported currency: ${currency}`);
    }
    return new Money(cents, currency);
  }

  static USD(cents: number): Money {
    return Money.fromCents(cents, 'USD');
  }

  static EUR(cents: number): Money {
    return Money.fromCents(cents, 'EUR');
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
    return Money.fromCents(this.cents + other.cents, this.currency);
  }

  equals(other: Money): boolean {
    return this.cents === other.cents && this.currency === other.currency;
  }

  display(): string {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: this.currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(this.cents / 100);
  }
}
