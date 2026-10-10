# Client Management Specification

## Purpose

Clients are the end customers being coached. They belong to one company and can be coached by one or more coaches within that company.

## Requirements

### Requirement: Client Creation

A coach or owner SHALL be able to create a client within their company. Required fields: `name` (≤120 chars), `email` (optional, valid format if present).

#### Scenario: Coach adds a client
- GIVEN a coach in company A
- WHEN the coach submits a new client form
- THEN a client record is created in company A
- AND the client appears in the company client list

#### Scenario: Duplicate email within company flagged
- GIVEN a client with email `bob@x.com` in company A
- WHEN the coach tries to add another client with the same email
- THEN the system returns a duplicate error
- AND no client is created

### Requirement: Client Visibility

Clients MUST be readable by all members of their company. Coaches MUST only see clients they have coached or are scheduled to coach. Owners MUST see all clients in their company.

#### Scenario: Coach sees only their clients
- GIVEN coach Jane with 2 past clients and coach John with 3
- WHEN Jane opens her client list
- THEN only her 2 clients are returned

### Requirement: Client Deletion

The owner SHALL be able to delete a client. Deletion MUST cascade to that client's sessions (soft delete preferred).

#### Scenario: Owner deletes a client
- GIVEN an owner in company A
- WHEN the owner deletes client Bob
- THEN Bob's record is soft-deleted (`deletedAt` set)
- AND Bob's sessions are marked archived
- AND Bob no longer appears in the active client list