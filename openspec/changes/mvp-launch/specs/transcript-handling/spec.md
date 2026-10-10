# Transcript Handling Specification

## Purpose

Transcripts capture the raw text of a completed session. They are immutable once created and feed the AI notes generator.

## Requirements

### Requirement: Create Transcript

A coach SHALL create one transcript per completed session. Required: `sessionId`, `text` (200–50000 chars). The transcript MUST be immutable after creation.

#### Scenario: Coach creates transcript for completed session

- GIVEN a session with status `completed`
- WHEN the coach submits a transcript of valid length
- THEN a transcript record is created
- AND it is linked to the session

#### Scenario: Transcript rejected for non-completed session

- GIVEN a session with status `scheduled`
- WHEN the coach attempts to create a transcript
- THEN the system returns a state-transition error

#### Scenario: Text length out of bounds rejected

- GIVEN a transcript submission
- WHEN the text is 50 chars or 50001 chars
- THEN the system returns a validation error

### Requirement: Transcript Immutability

A transcript MUST NOT be editable or deletable once persisted.

#### Scenario: Edit attempt rejected

- GIVEN an existing transcript
- WHEN the coach attempts to update its text
- THEN the system returns an immutable-resource error
- AND no rows are updated

### Requirement: Transcript Visibility

Transcripts MUST be visible to the assigned coach, the assigned client, and the company owner.

#### Scenario: Assigned client reads own transcript

- GIVEN a transcript on Bob's session
- WHEN Bob opens the session detail
- THEN the transcript text is returned

#### Scenario: Non-assigned client cannot read transcript

- GIVEN a transcript on Bob's session
- WHEN another client in the same company opens Bob's session
- They MUST NOT receive the transcript text
