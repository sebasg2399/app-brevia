# Session Booking Specification

## Purpose

Sessions are scheduled meetings between a coach and a client within the same company. Each session has a lifecycle: scheduled → completed or canceled → archived.

## Requirements

### Requirement: Book a Session

A coach SHALL book a session with a client in their company. Required fields: `coachId`, `clientId`, `scheduledAt` (ISO datetime, must be future), `durationMinutes` (15/30/45/60/90).

#### Scenario: Coach books a valid session
- GIVEN a coach and a client in company A
- WHEN the coach submits a booking for tomorrow at 10:00 UTC for 45 minutes
- THEN a session record is created with status `scheduled`

#### Scenario: Booking in the past rejected
- GIVEN a booking form
- WHEN the coach submits `scheduledAt` in the past
- THEN the system returns a validation error
- AND no session is created

### Requirement: Session Lifecycle

A session MUST transition through statuses: `scheduled`, `completed`, `canceled`, `archived`. Only coaches (or owners) SHALL be allowed to transition sessions.

#### Scenario: Coach marks session completed
- GIVEN a session with status `scheduled`
- WHEN the coach marks it completed
- THEN status becomes `completed`
- AND the session becomes eligible for transcript upload

#### Scenario: Cancel before start time
- GIVEN a session scheduled in 1 hour
- WHEN the coach cancels
- THEN status becomes `canceled`
- AND no transcript slot is created

#### Scenario: Cancel after start time rejected
- GIVEN a session that ended 30 minutes ago with status `scheduled`
- WHEN the coach attempts to cancel
- THEN the system returns a state-transition error

### Requirement: Session Visibility

Sessions MUST be visible to the assigned coach, the assigned client, and the company owner. They MUST NOT be visible to other members.

#### Scenario: Assigned coach sees session
- GIVEN coach Jane booked with client Bob
- WHEN Jane opens her session list
- THEN the session appears

#### Scenario: Another coach does not see session
- GIVEN coach John in the same company
- WHEN John opens his session list
- THEN Jane's session is not returned