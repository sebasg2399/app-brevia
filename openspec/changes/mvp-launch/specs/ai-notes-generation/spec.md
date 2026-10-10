# AI Notes Generation Specification

## Purpose

AI notes are the structured output of an LLM call against a transcript. They include a summary, action items, and a brief for the next session.

## Requirements

### Requirement: Notes Generation Trigger

When a transcript is created, the system MUST enqueue a notes generation job. The job MUST call the Anthropic Claude API and persist the structured output.

#### Scenario: Transcript creation triggers generation
- GIVEN a quota-available company
- WHEN a transcript is created
- THEN a job is enqueued
- AND within 10 seconds the AI notes are persisted with status `ready`

### Requirement: Output Shape

AI notes MUST contain: `summary` (≤500 words), `actionItems` (array, 1–7 items, each `{title, dueDate?}`), `nextSessionBrief` (≤300 words). Output MUST be parsed via Anthropic tool use, not free text.

#### Scenario: Valid structured output persisted
- GIVEN the LLM returns valid structured output
- WHEN the job persists the notes
- THEN summary, actionItems, and nextSessionBrief are stored
- AND a structured-output audit row records the raw model response

#### Scenario: Malformed output retried
- GIVEN the LLM returns output failing the schema
- WHEN the job retries up to 2 times with backoff
- AND all attempts fail
- THEN notes are stored with status `failed`
- AND the coach sees an actionable error

### Requirement: Quota Enforcement

The system MUST enforce a monthly quota of AI notes per company based on plan. Quota MUST be checked BEFORE the LLM call.

#### Scenario: Within quota
- GIVEN a Pro company with 30 notes used this month
- WHEN the coach creates a transcript
- THEN the quota check passes
- AND the AI call proceeds

#### Scenario: Quota exceeded
- GIVEN a Pro company with 50 notes used this month
- WHEN the coach creates a transcript
- THEN the system returns a quota-exceeded error
- AND the LLM is NOT called
- AND the quota counter does not increment

### Requirement: Past-Due Subscription Block

If the company's subscription is `past_due` or `canceled`, the system MUST NOT generate AI notes.

#### Scenario: Past-due company blocked
- GIVEN a company with subscription status `past_due`
- WHEN a transcript is created
- THEN AI generation is skipped
- AND the transcript is saved without notes