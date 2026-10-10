# Auth and RBAC Specification

## Purpose

Authentication and role-based access control for Brevia. Roles: `owner`, `coach`, `client`. Every authenticated user belongs to exactly one company.

## Requirements

### Requirement: Sign Up

The system MUST allow a new user to register via email and password. The system MUST send an email verification link before granting access to protected routes.

#### Scenario: Successful sign up

- GIVEN a new email not already registered
- WHEN the user submits the sign-up form
- THEN a Supabase Auth user is created
- AND a verification email is sent
- AND the user is redirected to "check your email"

#### Scenario: Email already in use

- GIVEN an email already registered
- WHEN the user submits the sign-up form
- THEN the system returns an error
- AND no new account is created

### Requirement: Sign In

The system MUST allow a registered user to sign in via email + password or magic link. On success, the system MUST establish an authenticated session and load the user's company membership.

#### Scenario: Sign in with valid credentials

- GIVEN a registered, verified user
- WHEN the user signs in
- THEN a session is established
- AND the user is redirected to the dashboard for their role

#### Scenario: Sign in with wrong password

- GIVEN a registered user
- WHEN the user enters an incorrect password
- THEN the system returns an authentication error
- AND no session is created

### Requirement: Role Assignment

Every authenticated user MUST have exactly one role per company: `owner`, `coach`, or `client`. The role MUST be stored in `company_memberships.role`.

#### Scenario: Owner creates company on first sign-up

- GIVEN a newly registered and verified user with no company
- WHEN the user completes onboarding
- THEN a company is created
- AND a membership is created with role `owner`

#### Scenario: Invited user joins with assigned role

- GIVEN a pending invitation for email `jane@x.com` with role `coach`
- WHEN Jane accepts the invitation
- THEN a membership is created with role `coach`

### Requirement: Row Level Security

The system MUST enforce RLS on every domain table so that reads and writes are scoped by `company_id`. A user MUST NOT read or write rows belonging to a company they are not a member of.

#### Scenario: Cross-tenant read is denied

- GIVEN a coach in company A
- WHEN the coach attempts to read a coach profile from company B
- THEN the query returns zero rows
- AND no error is surfaced

#### Scenario: Cross-tenant write is denied

- GIVEN a coach in company A
- WHEN the coach attempts to update a session in company B
- THEN the update fails
- AND an authorization error is surfaced
