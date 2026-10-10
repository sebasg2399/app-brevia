# Company Management Specification

## Purpose

Workspaces (companies) own coaches and clients. A company has exactly one owner; coaches and clients are members.

## Requirements

### Requirement: Workspace Creation

The first signed-in user with no company MUST be guided to create a workspace. On creation, the system MUST create the company record and assign the user the `owner` role.

#### Scenario: Owner creates workspace

- GIVEN a signed-in user with no company
- WHEN the user submits the workspace creation form with a unique name
- THEN a company record is created with `name`, `slug`, `ownerId`
- AND a `company_memberships` row is created with role `owner`

#### Scenario: Duplicate slug rejected

- GIVEN a workspace slug already in use
- WHEN the user submits the creation form
- THEN the system returns a validation error
- AND no company is created

### Requirement: Invitations

The owner SHALL be able to invite a coach or client by email. Invitations MUST expire after 7 days.

#### Scenario: Owner invites a coach

- GIVEN an owner in company A
- WHEN the owner submits an invitation for `coach@x.com` with role `coach`
- THEN an invitation record is created with status `pending` and a token
- AND an email with the invitation link is sent

#### Scenario: Expired invitation rejected

- GIVEN an invitation created 8 days ago
- WHEN the recipient clicks the invitation link
- THEN the system returns an "invitation expired" error
- AND no membership is created

### Requirement: Member Roster

The owner SHALL be able to list and remove company members.

#### Scenario: Owner removes a coach

- GIVEN an owner in company A
- WHEN the owner removes coach Jane from the company
- THEN the membership row is deleted
- AND Jane loses access to company data on her next request

#### Scenario: Non-owner cannot remove members

- GIVEN a coach (not owner) in company A
- WHEN the coach attempts to remove another member
- THEN the system returns a forbidden error
- AND no membership is deleted
