const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

abstract class BrandedId<TBrand extends string> {
  abstract readonly _brand: TBrand;

  protected constructor(public readonly value: string) {}

  equals(other: BrandedId<TBrand>): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}

function makeBranded<TBrand extends string>(brand: TBrand) {
  return class extends BrandedId<TBrand> {
    readonly _brand: TBrand = brand;

    static fromString(raw: string): InstanceType<typeof this> & BrandedId<TBrand> {
      if (typeof raw !== 'string' || !UUID_REGEX.test(raw)) {
        throw new Error(`Invalid UUID: ${raw}`);
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return new (this as any)(raw);
    }
  };
}

export const UserId = makeBranded('UserId');
export const CompanyId = makeBranded('CompanyId');
export const MembershipId = makeBranded('MembershipId');
export const InvitationId = makeBranded('InvitationId');

export type AnyUserId = InstanceType<typeof UserId>;
export type AnyCompanyId = InstanceType<typeof CompanyId>;
export type AnyMembershipId = InstanceType<typeof MembershipId>;
export type AnyInvitationId = InstanceType<typeof InvitationId>;