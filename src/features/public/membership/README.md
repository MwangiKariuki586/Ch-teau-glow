# Membership Payment Flow

This feature implements a membership payment flow using Stripe for the BROWZ Beauty Memberships.

## Flow Overview

1. **User clicks "Explore Plan"** on the Beauty Memberships section (`/offers`)
2. **Authentication Check**: If not logged in, redirects to `/auth/signin?redirect=/membership/{tier}/checkout`
3. **Payment Page**: Shows membership details and Stripe payment form
4. **Payment Processing**: Processes payment through Stripe
5. **Success**: Shows success message and redirects to offers page

## User Experience

The flow appears fully functional to users:

- Professional payment interface
- Secure payment messaging
- Success confirmation
- Automatic redirect to offers page

**Note for developers**: This is a simulation - no subscription is saved to the database. The payment intent is created in Stripe but no subscription record is persisted.

## Routes

- `/membership/starter/checkout` - Starter plan checkout
- `/membership/radiance/checkout` - Radiance plan checkout
- `/membership/luxury/checkout` - Luxury plan checkout

## Components

### `MembershipCheckout`

Main checkout component that:

- Displays plan details and benefits
- Creates Stripe payment intent
- Handles payment success/error states
- Shows simulation notice

### `MembershipPaymentForm`

Stripe payment form that:

- Uses Stripe Elements for card input
- Handles payment confirmation
- Shows loading states
- Displays error messages

## API Endpoints

### `POST /api/membership-payment-intent`

Creates a Stripe payment intent for membership subscription.

**Request:**

```json
{
  "plan_slug": "starter" | "radiance" | "luxury",
  "amount_cents": 14900 | 28900 | 45900
}
```

**Response:**

```json
{
  "client_secret": "pi_xxx_secret_xxx",
  "amount_cents": 14900,
  "currency": "AED"
}
```

**Metadata stored in Stripe:**

- `user_id`: Supabase user ID
- `user_email`: User email
- `plan_slug`: Plan identifier
- `plan_name`: Plan display name
- `simulation`: "true" (marks as simulation)
- `type`: "membership_subscription"

## Testing

Use Stripe test cards:

- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **3D Secure**: `4000 0025 0000 3155`

Any future expiry date and any 3-digit CVC will work.

## Important Notes

⚠️ **SIMULATION MODE**: This implementation does NOT save anything to the database. It only:

1. Creates a Stripe payment intent
2. Processes the payment
3. Logs success to console
4. Shows success toast

To make this production-ready, you would need to:

1. Create a subscriptions table in Supabase
2. Handle webhook events from Stripe
3. Save subscription data after successful payment
4. Implement subscription management (cancel, update, etc.)
5. Add recurring billing logic

## File Structure

```
src/features/public/membership/
├── components/
│   ├── MembershipCheckout.tsx      # Main checkout component
│   ├── MembershipPaymentForm.tsx   # Stripe payment form
│   └── index.ts                    # Barrel export
├── hooks/
│   └── useMembershipPaymentIntent.ts  # Payment intent hook
└── README.md                       # This file

src/app/(public)/membership/
└── [tier]/
    └── checkout/
        └── page.tsx                # Checkout page with auth

src/app/api/
└── membership-payment-intent/
    └── route.ts                    # API endpoint
```

## Integration with Existing Code

This feature integrates with:

- `src/lib/plans/catalog.ts` - Plan definitions
- `src/lib/stripe/server.ts` - Stripe server client
- `src/lib/supabase/server.ts` - Supabase auth
- `src/features/public/offers/components/beauty-memberships-section.tsx` - Entry point

## Future Enhancements

- [ ] Add subscription management dashboard
- [ ] Implement webhook handlers for subscription events
- [ ] Add database schema for subscriptions
- [ ] Create success/confirmation page
- [ ] Add email notifications
- [ ] Implement proration for plan changes
- [ ] Add subscription cancellation flow
