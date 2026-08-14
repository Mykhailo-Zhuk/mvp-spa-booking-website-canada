// Demo-mode payment provider (US#1, Task 1.3).
// In production this module would wrap Stripe: PaymentSheet / PaymentIntents + Webhook.
// The rest of the app only talks to this interface, so swapping in real Stripe is a
// drop-in change.

export interface PaymentResult {
  status: "succeeded" | "failed";
  provider: string;
  transactionId: string;
  reason?: string;
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function processDemoPayment(opts: {
  amount: number;
  method?: "card" | "applepay" | "googlepay";
  cardLast4?: string;
}): Promise<PaymentResult> {
  // Simulate Stripe latency + the "insufficient_funds" failure scenario from the plan.
  await delay(900);

  // Deterministic demo: a card ending in 0002 always fails (bank decline), like the plan's scenario.
  if (opts.cardLast4 === "0002") {
    return {
      status: "failed",
      provider: "stripe-demo",
      transactionId: `pi_demo_declined_${Date.now()}`,
      reason: "insufficient_funds",
    };
  }

  return {
    status: "succeeded",
    provider: "stripe-demo",
    transactionId: `pi_demo_${Date.now()}`,
  };
}

export interface DemoCard {
  label: string;
  last4: string;
  emoji: string;
}

export const DEMO_CARDS: DemoCard[] = [
  { label: "Visa •••• 4242", last4: "4242", emoji: "💳" },
  { label: "Mastercard •••• 0002 (declines)", last4: "0002", emoji: "🚫" },
  { label: "Apple Pay (Face ID)", last4: "applepay", emoji: "" },
];
