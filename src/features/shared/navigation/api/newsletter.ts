export interface SubscriptionResult {
  success: boolean;
  message: string;
  action: 'subscribed' | 'reactivated' | 'already_subscribed';
}

export async function subscribeToNewsletter(
  email: string,
  source: 'footer' | 'checkout' | 'popup' | 'manual' = 'footer'
): Promise<SubscriptionResult> {
  try {
    const response = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, source }),
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        message: result.error || 'Failed to subscribe. Please try again.',
        action: 'already_subscribed',
      };
    }

    return result as SubscriptionResult;
  } catch (err) {
    console.error('Newsletter subscription error:', err);
    return {
      success: false,
      message: 'An error occurred. Please try again.',
      action: 'already_subscribed',
    };
  }
}
