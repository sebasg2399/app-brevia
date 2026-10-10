# Subscription Billing Specification

## Purpose

Companies subscribe to a plan (Free, Pro, Team). Paid plans use Stripe Billing with a 7-day trial. Subscription state drives quota and feature access.

## Requirements

### Requirement: Plan Selection

A company SHALL have exactly one active subscription record at any time. Allowed plans: `free`, `pro`, `team`. Only the owner MAY change the plan.

#### Scenario: Owner upgrades to Pro
- GIVEN a Free company
- WHEN the owner selects the Pro plan
- THEN a Stripe Checkout session is created
- AND on success, subscription status becomes `trialing` with `trialEndsAt = now + 7d`

#### Scenario: Non-owner cannot change plan
- GIVEN a coach (not owner) in company A
- WHEN the coach attempts to upgrade
- THEN the system returns a forbidden error

### Requirement: Trial Behavior

The first paid plan activation MUST start a 7-day trial. No card is charged during the trial. The system MUST transition to `active` on first successful payment after the trial.

#### Scenario: Trial active for 7 days
- GIVEN a newly created Pro subscription
- WHEN 6 days pass
- THEN status remains `trialing`
- AND the company has full Pro features

### Requirement: Webhook State Machine

The system MUST handle Stripe webhook events idempotently by `event.id`. Required events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `invoice.payment_succeeded`.

#### Scenario: Subscription updated
- GIVEN a webhook for `customer.subscription.updated`
- WHEN the handler runs
- THEN status, plan, period end, and trial end are upserted
- AND a duplicate webhook with the same `event.id` is a no-op

#### Scenario: Payment failed
- GIVEN a webhook for `invoice.payment_failed`
- WHEN the handler runs
- THEN status becomes `past_due`
- AND AI quota is set to 0 until status returns to `active`

### Requirement: Customer Portal

The owner SHALL access the Stripe Customer Portal to manage payment methods, cancel, or download invoices.

#### Scenario: Portal session created
- GIVEN an owner with an active Stripe subscription
- WHEN the owner clicks "Manage billing"
- THEN a portal session URL is returned and the owner is redirected there

#### Scenario: Free plan portal unavailable
- GIVEN a Free company with no Stripe customer
- WHEN the owner clicks "Manage billing"
- THEN the system returns a no-portal-available error