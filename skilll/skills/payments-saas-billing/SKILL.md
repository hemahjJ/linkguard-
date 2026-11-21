---
name: payments-saas-billing
description: >
  Implement payments, subscriptions, and billing for SaaS applications safely.
  Covers Stripe integration (Checkout Sessions, Payment Intents, Billing API,
  Customer Portal, Webhooks with signature verification, idempotency keys,
  proration, free trials, dunning/retry logic, tax with Stripe Tax),
  Razorpay and PayPal notes for India and global markets, double-entry ledger
  design, entitlements and feature gating, usage-based billing and metered
  pricing, refunds and dispute handling, PCI DSS scope minimization,
  invoicing, multi-currency support, reconciliation, and fraud basics.
  Trigger on: payments, Stripe, Razorpay, PayPal, subscription, billing,
  checkout, invoice, webhook, refunds, pricing plans, metered billing,
  dunning, proration, entitlements, feature flags, ledger, PCI compliance,
  payment intents, customer portal, disputes, chargebacks, recurring payments.
allowed-tools:
  - read_file
  - write_file
  - edit_file
  - run_command
  - search_web
---

# Payments & SaaS Billing Skill

Build production-grade payment and subscription systems for SaaS products. This skill guides implementation of Stripe-based billing (with Razorpay/PayPal alternatives), webhook handling, ledger design, entitlements, and compliance.

## Quick-Start Decision Tree

```
Need payments?
├─ One-time purchase → Stripe Checkout (mode: "payment")
├─ Recurring subscription → Stripe Checkout (mode: "subscription") + Billing API
├─ Usage-based / metered → Stripe metered billing + usage records
├─ India-focused → Consider Razorpay (see references/razorpay-notes.md)
└─ Global multi-gateway → Abstract behind a PaymentProvider interface
```

## Core Principles

1. **Never handle raw card data.** Use Stripe.js / Checkout / Elements to stay out of PCI scope. See `references/pci-basics.md`.
2. **Webhooks are the source of truth.** Never trust client-side success callbacks alone. Always verify webhook signatures. See `references/webhook-handling.md`.
3. **Idempotency everywhere.** Pass `Idempotency-Key` headers on every mutating Stripe API call. Use deterministic keys (e.g., `{action}_{entity_id}_{timestamp}`).
4. **Store state in your ledger.** Mirror Stripe state in your own double-entry ledger for auditability. See `references/ledger-design.md`.
5. **Test-mode keys only in code.** Read `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` from environment variables. Never hardcode API keys.

## Workflow: Subscription SaaS

### Step 1 — Set Up Stripe Products and Prices

```python
import stripe, os

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]

product = stripe.Product.create(
    name="Pro Plan",
    metadata={"tier": "pro"}
)

price = stripe.Price.create(
    product=product.id,
    unit_amount=2900,  # $29.00
    currency="usd",
    recurring={"interval": "month"},
)
```

### Step 2 — Create a Checkout Session

```python
session = stripe.checkout.Session.create(
    mode="subscription",
    customer_email=user_email,
    line_items=[{"price": price.id, "quantity": 1}],
    subscription_data={"trial_period_days": 14},
    success_url="https://app.example.com/billing?session_id={CHECKOUT_SESSION_ID}",
    cancel_url="https://app.example.com/pricing",
    idempotency_key=f"checkout_{user_id}_{price.id}",
)
# Redirect user to session.url
```

### Step 3 — Handle Webhooks

Listen for events to provision/deprovision access:

| Event | Action |
|---|---|
| `checkout.session.completed` | Create user record, link Stripe customer ID |
| `customer.subscription.created` | Activate entitlements |
| `customer.subscription.updated` | Handle plan changes, proration |
| `customer.subscription.deleted` | Revoke access, start grace period |
| `invoice.payment_succeeded` | Record payment in ledger |
| `invoice.payment_failed` | Trigger dunning flow |

See `references/webhook-handling.md` for full implementation with signature verification.

### Step 4 — Customer Portal

```python
portal_session = stripe.billing_portal.Session.create(
    customer=stripe_customer_id,
    return_url="https://app.example.com/settings",
)
# Redirect to portal_session.url
```

The portal lets customers upgrade/downgrade, update payment methods, cancel, and view invoices without custom UI.

### Step 5 — Entitlements and Feature Gating

Map Stripe subscription status + price/product metadata to feature flags in your app. See `references/entitlements.md`.

```python
def check_entitlement(user, feature):
    sub = get_active_subscription(user)
    if not sub or sub.status not in ("active", "trialing"):
        return False
    tier = sub.product.metadata.get("tier", "free")
    return feature in TIER_FEATURES.get(tier, [])
```

## Workflow: Usage-Based Billing

### Step 1 — Create a Metered Price

```python
metered_price = stripe.Price.create(
    product=product.id,
    currency="usd",
    recurring={"interval": "month", "usage_type": "metered"},
    billing_scheme="per_unit",
    unit_amount=10,  # $0.10 per unit
)
```

### Step 2 — Report Usage

```python
stripe.SubscriptionItem.create_usage_record(
    subscription_item_id,
    quantity=150,
    timestamp=int(time.time()),
    action="increment",  # or "set"
    idempotency_key=f"usage_{subscription_item_id}_{date}_{batch_id}",
)
```

### Step 3 — Aggregate and Invoice

Stripe automatically aggregates usage records per billing period and generates invoices. Store a shadow copy of reported usage in your ledger for reconciliation.

## Workflow: Handling Refunds and Disputes

```python
# Issue a partial refund
refund = stripe.Refund.create(
    payment_intent=payment_intent_id,
    amount=500,  # $5.00 partial refund
    reason="requested_by_customer",
    idempotency_key=f"refund_{payment_intent_id}_{amount}",
)
```

For disputes, listen to `charge.dispute.created` webhook and submit evidence via the API or Dashboard. See `references/stripe-guide.md` for dispute handling details.

## Multi-Currency

```python
# Create prices in multiple currencies for the same product
eur_price = stripe.Price.create(
    product=product.id,
    unit_amount=2700,  # €27.00
    currency="eur",
    recurring={"interval": "month"},
)
```

Use `automatic_tax` on Checkout Sessions to handle VAT/GST:

```python
session = stripe.checkout.Session.create(
    mode="subscription",
    automatic_tax={"enabled": True},
    # ...
)
```

## Proration

When upgrading or downgrading mid-cycle, Stripe prorates by default:

```python
stripe.Subscription.modify(
    sub_id,
    items=[{"id": si_id, "price": new_price_id}],
    proration_behavior="create_prorations",  # or "always_invoice"
    idempotency_key=f"upgrade_{sub_id}_{new_price_id}",
)
```

Options: `create_prorations` (default), `always_invoice`, `none`.

## Dunning (Failed Payment Recovery)

Configure in Stripe Dashboard under Billing Settings:
- **Smart Retries** — Stripe's ML picks optimal retry times.
- **Email reminders** — Automatic emails to customers on failure.
- **Subscription status transitions** — Set how many retries before marking `past_due` then `canceled`.

Listen for `invoice.payment_failed` to trigger in-app banners or email nudges.

## Tax

Use Stripe Tax for automatic tax calculation:

```python
session = stripe.checkout.Session.create(
    mode="subscription",
    automatic_tax={"enabled": True},
    customer_update={"address": "auto"},
    # ...
)
```

Alternatively, integrate with TaxJar or Avalara for complex tax nexus scenarios.

## Reconciliation

Run daily reconciliation comparing your ledger against Stripe:

1. Fetch `BalanceTransaction` list from Stripe for the period.
2. Compare totals against your ledger entries.
3. Flag discrepancies for manual review.
4. Automate with the `scripts/webhook_test_harness.py` pattern.

## Fraud Basics

- Enable **Stripe Radar** (included in Stripe fees) for ML-based fraud detection.
- Use `payment_intent.requires_action` for 3D Secure challenges.
- Set Radar rules for high-risk patterns (velocity, country blocks, large amounts).
- Monitor `charge.dispute.created` events and respond within 7 days.

## Key References

| Topic | File |
|---|---|
| Stripe deep dive | `references/stripe-guide.md` |
| Webhook handling | `references/webhook-handling.md` |
| Ledger design | `references/ledger-design.md` |
| Entitlements | `references/entitlements.md` |
| Razorpay/PayPal | `references/razorpay-notes.md` |
| PCI compliance | `references/pci-basics.md` |

## Scripts

| Script | Purpose |
|---|---|
| `scripts/webhook_test_harness.py` | Simulate and test Stripe webhook endpoints locally |
| `scripts/scaffold_stripe_nextjs.sh` | Scaffold a Next.js project with Stripe Billing wired up |

## Example Scenarios

### Example 1: SaaS with Trial + Upgrade

**Input:** "Set up a subscription SaaS with 14-day trial on the Starter plan, allow upgrades to Pro mid-cycle with proration."

**Output:** Create Stripe Products/Prices for Starter ($9/mo) and Pro ($29/mo). Use Checkout Session with `trial_period_days: 14`. Handle `customer.subscription.updated` webhook for mid-cycle upgrades. Use `proration_behavior: "create_prorations"` on `Subscription.modify()`. Gate features via entitlements table keyed on product metadata tier.

### Example 2: Webhook Handler Resilient to Duplicates

**Input:** "Build a webhook endpoint that handles invoice.payment_succeeded idempotently."

**Output:** Verify signature with `stripe.Webhook.construct_event()`. Extract event ID, check against `processed_events` table. If already processed, return 200 immediately. Otherwise, record payment in ledger within a database transaction, insert event ID into `processed_events`, then return 200. Wrap in try/except to return 400 on signature failure.

### Example 3: Usage-Based Billing Ledger

**Input:** "Design a ledger for tracking API call usage that feeds into Stripe metered billing."

**Output:** Create `usage_events` table (id, user_id, subscription_item_id, quantity, recorded_at, stripe_reported, idempotency_key). Batch-aggregate usage every hour. Report to Stripe with idempotency keys. On `invoice.created` webhook, compare Stripe line item quantities against local aggregates. Flag mismatches in `reconciliation_alerts` table.
