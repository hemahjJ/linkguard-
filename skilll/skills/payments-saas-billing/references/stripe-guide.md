# Stripe Integration Guide

Comprehensive reference for implementing Stripe in a SaaS application. Covers the full lifecycle from product setup through invoicing, disputes, and multi-currency.

## Authentication and Key Management

Read keys from environment variables exclusively. Never commit keys to source control.

```python
import stripe
import os

stripe.api_key = os.environ["STRIPE_SECRET_KEY"]
# For webhook verification:
webhook_secret = os.environ["STRIPE_WEBHOOK_SECRET"]
```

Use restricted keys in production. Grant only the permissions your service needs:
- `Checkout Sessions: write` for creating sessions
- `Subscriptions: write` for managing subscriptions
- `Customers: write` for customer management
- `Invoices: read` for invoice retrieval

## Products and Prices Architecture

Stripe separates what you sell (Products) from how you charge (Prices). One Product can have many Prices (monthly, annual, different currencies).

```python
product = stripe.Product.create(
    name="Pro Plan",
    description="Full-featured plan for growing teams",
    metadata={
        "tier": "pro",
        "max_seats": "50",
        "features": "api,analytics,support_priority"
    }
)

# Monthly price
monthly = stripe.Price.create(
    product=product.id,
    unit_amount=2900,
    currency="usd",
    recurring={"interval": "month"},
    metadata={"billing_cycle": "monthly"}
)

# Annual price with discount
annual = stripe.Price.create(
    product=product.id,
    unit_amount=29000,  # ~$241.67/mo effective
    currency="usd",
    recurring={"interval": "year"},
    metadata={"billing_cycle": "annual"}
)
```

Store `product.id` and `price.id` in your config or database. Reference them by ID, not by name.

## Checkout Sessions

Checkout Sessions handle the entire payment flow: collecting card details, 3D Secure, tax calculation, and subscription creation.

```python
session = stripe.checkout.Session.create(
    mode="subscription",
    customer=stripe_customer_id,         # or use customer_email for new customers
    line_items=[{"price": price_id, "quantity": 1}],
    subscription_data={
        "trial_period_days": 14,
        "metadata": {"internal_plan": "pro"}
    },
    automatic_tax={"enabled": True},
    allow_promotion_codes=True,
    billing_address_collection="required",
    success_url="https://app.example.com/billing/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url="https://app.example.com/pricing",
    idempotency_key=f"checkout_{user_id}_{price_id}_{int(time.time())}",
)
```

After redirect, retrieve the session server-side to get the subscription ID:

```python
session = stripe.checkout.Session.retrieve(
    session_id,
    expand=["subscription", "subscription.default_payment_method"]
)
subscription_id = session.subscription.id
customer_id = session.customer
```

## Payment Intents

For one-time payments or custom flows where Checkout is insufficient:

```python
intent = stripe.PaymentIntent.create(
    amount=5000,
    currency="usd",
    customer=customer_id,
    metadata={"order_id": order_id},
    idempotency_key=f"pi_{order_id}",
)
# Send intent.client_secret to frontend for confirmation
```

Handle the `payment_intent.succeeded` and `payment_intent.payment_failed` webhooks.

## Subscription Lifecycle Management

### Creating Subscriptions Directly

```python
subscription = stripe.Subscription.create(
    customer=customer_id,
    items=[{"price": price_id}],
    trial_period_days=14,
    payment_behavior="default_incomplete",
    expand=["latest_invoice.payment_intent"],
    idempotency_key=f"sub_create_{customer_id}_{price_id}",
)
```

### Upgrading / Downgrading

```python
subscription = stripe.Subscription.retrieve(sub_id)
stripe.Subscription.modify(
    sub_id,
    items=[{
        "id": subscription["items"]["data"][0].id,
        "price": new_price_id,
    }],
    proration_behavior="create_prorations",
    idempotency_key=f"sub_modify_{sub_id}_{new_price_id}",
)
```

Proration options:
- `create_prorations` — Credits unused time, charges for new price (default).
- `always_invoice` — Same as above, plus immediately invoices the difference.
- `none` — No proration; new price starts next billing cycle.

### Cancellation

```python
# Cancel at period end (graceful)
stripe.Subscription.modify(sub_id, cancel_at_period_end=True)

# Cancel immediately
stripe.Subscription.cancel(sub_id)
```

## Customer Portal

Configure the portal in Stripe Dashboard (or via API) to control which actions customers can take:

```python
config = stripe.billing_portal.Configuration.create(
    business_profile={"headline": "Manage your subscription"},
    features={
        "subscription_update": {
            "enabled": True,
            "default_allowed_updates": ["price", "quantity"],
            "proration_behavior": "create_prorations",
            "products": [
                {"product": prod_id, "prices": [monthly_id, annual_id]}
            ]
        },
        "subscription_cancel": {
            "enabled": True,
            "mode": "at_period_end",
            "cancellation_reason": {"enabled": True}
        },
        "payment_method_update": {"enabled": True},
        "invoice_history": {"enabled": True},
    }
)
```

## Invoicing

Stripe auto-generates invoices for subscriptions. Customize with:

```python
stripe.Invoice.modify(
    invoice_id,
    custom_fields=[{"name": "PO Number", "value": "PO-12345"}],
    footer="Thank you for your business.",
)
```

For one-off invoices:

```python
stripe.InvoiceItem.create(customer=cust_id, amount=1500, currency="usd", description="Setup fee")
invoice = stripe.Invoice.create(customer=cust_id, auto_advance=True)
invoice.finalize_invoice()
```

## Multi-Currency

Create separate Prices per currency. Use `automatic_currency_conversion` on Checkout or let the customer choose:

```python
prices = {
    "usd": stripe.Price.create(product=prod_id, unit_amount=2900, currency="usd", recurring={"interval": "month"}),
    "eur": stripe.Price.create(product=prod_id, unit_amount=2700, currency="eur", recurring={"interval": "month"}),
    "inr": stripe.Price.create(product=prod_id, unit_amount=240000, currency="inr", recurring={"interval": "month"}),
}
# Select price based on user's locale/preference
selected_price = prices.get(user_currency, prices["usd"])
```

## Refunds

```python
# Full refund
stripe.Refund.create(payment_intent=pi_id, idempotency_key=f"refund_full_{pi_id}")

# Partial refund
stripe.Refund.create(payment_intent=pi_id, amount=500, idempotency_key=f"refund_partial_{pi_id}_{500}")
```

Refund reasons: `duplicate`, `fraudulent`, `requested_by_customer`. Set a reason for analytics.

## Dispute Handling

When a dispute arrives (`charge.dispute.created`):
1. Record it in your system immediately.
2. Gather evidence: customer communication, delivery proof, ToS acceptance logs.
3. Submit evidence via API or Dashboard within 7 days (varies by network).
4. Listen for `charge.dispute.closed` to update your records.

```python
stripe.Dispute.modify(
    dispute_id,
    evidence={
        "customer_name": "Jane Doe",
        "customer_email_address": "jane@example.com",
        "product_description": "SaaS subscription - Pro Plan",
        "uncategorized_text": "Customer used the service for 30 days...",
    },
    submit=True,
)
```

## Tax with Stripe Tax

Enable Stripe Tax for automatic calculation:

```python
session = stripe.checkout.Session.create(
    mode="subscription",
    automatic_tax={"enabled": True},
    customer_update={"address": "auto"},
    tax_id_collection={"enabled": True},
    # ...
)
```

Register your tax nexus in Stripe Dashboard under Tax Settings. Stripe handles rate lookup, collection, and reporting.

## Idempotency Keys

Pass on every mutating call. Use deterministic, meaningful keys:

```
Pattern: {action}_{entity_id}_{discriminator}
Examples:
  checkout_{user_id}_{price_id}
  sub_modify_{sub_id}_{new_price_id}
  refund_{payment_intent_id}_{amount}
  usage_{sub_item_id}_{date}_{batch}
```

Stripe caches responses for 24 hours per idempotency key. Same key + same params = safe retry. Same key + different params = error.

## Testing

Use Stripe test-mode keys (`sk_test_...`). Test card numbers:
- `4242424242424242` — Succeeds
- `4000000000003220` — Requires 3D Secure
- `4000000000000341` — Attaches but fails on charge
- `4000000000009995` — Insufficient funds
- `4000000000000002` — Declined

Trigger test webhooks via CLI:
```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger checkout.session.completed
```
