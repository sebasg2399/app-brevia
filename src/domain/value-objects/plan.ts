import { ValidationError } from '@domain/errors/domain-error';

export type PlanName = 'free' | 'pro' | 'team';

export interface PlanLimits {
  readonly name: PlanName;
  readonly monthlyNotes: number;
  readonly displayName: string;
}

const PLANS: Readonly<Record<PlanName, PlanLimits>> = {
  free: { name: 'free', monthlyNotes: 5, displayName: 'Free' },
  pro: { name: 'pro', monthlyNotes: 50, displayName: 'Pro' },
  team: { name: 'team', monthlyNotes: 500, displayName: 'Team' },
};

export class Plan {
  private constructor(public readonly limits: PlanLimits) {}

  static fromName(name: string): Plan {
    if (!(name in PLANS)) {
      throw new ValidationError(`Unknown plan: ${name}`);
    }
    return new Plan(PLANS[name as PlanName]);
  }

  static free(): Plan {
    return new Plan(PLANS.free);
  }

  static pro(): Plan {
    return new Plan(PLANS.pro);
  }

  static team(): Plan {
    return new Plan(PLANS.team);
  }

  get name(): PlanName {
    return this.limits.name;
  }

  get monthlyNotes(): number {
    return this.limits.monthlyNotes;
  }

  get displayName(): string {
    return this.limits.displayName;
  }
}
