// Subscription guard is no longer used for automatic redirects.
// Paywall is shown only when the user tries to create a 4th stopwatch.
// This file is kept as a no-op export to avoid breaking any existing imports.
export function useSubscriptionGuard() {
  // No-op: paywall is triggered by stopwatch creation logic, not on navigation.
}
