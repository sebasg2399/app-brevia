# Coach Profiles Specification

## Purpose

Coach profiles represent practitioners within a company. Each coach has a public-facing (within the company) profile and is bookable by clients.

## Requirements

### Requirement: Coach Profile Fields

A coach profile MUST contain: `userId`, `companyId`, `displayName`, `bio` (markdown, ≤2000 chars), `focusAreas` (array, 1–8 entries), `hourlyRateCents` (integer minor units, ≥0), `isActive` (boolean).

#### Scenario: Owner creates coach profile
- GIVEN an owner in company A
- WHEN the owner submits a coach creation form with valid fields
- THEN a coach profile is created
- AND it appears in the company coach directory

#### Scenario: Validation rejects invalid bio length
- GIVEN a coach creation form
- WHEN the user submits a bio with 2001 characters
- THEN the system returns a validation error
- AND no coach profile is created

### Requirement: Profile Visibility

A coach profile MUST be readable by every member of its owning company. It MUST NOT be readable by users outside the company.

#### Scenario: Member sees own-company coaches
- GIVEN a client in company A
- WHEN the client requests the coach directory
- THEN only coaches from company A are returned

#### Scenario: Member cannot read another company's coach
- GIVEN a client in company A
- WHEN the client requests a coach profile by id from company B
- THEN the system returns not-found
- AND no data leaks

### Requirement: Profile Updates

A coach MAY update their own profile. An owner MAY update any coach profile within their company.

#### Scenario: Coach edits own bio
- GIVEN a signed-in coach
- WHEN the coach updates their bio
- THEN the new bio is persisted
- AND the updated_at timestamp advances

#### Scenario: Coach cannot edit another coach's profile
- GIVEN coach Jane in company A
- WHEN Jane attempts to edit coach John's profile
- THEN the system returns a forbidden error