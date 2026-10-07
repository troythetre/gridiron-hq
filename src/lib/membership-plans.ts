export const MEMBERSHIP_PLANS = {
  gridiron_plus: {
    name: "Gridiron Plus",
    description: "Roster-aware Start/Sit, trade analysis, and Team Review.",
    priceLabel: "$4.99/month",
    priceEnv: "STRIPE_PRICE_ID",
  },
  nfl_betting: {
    name: "Sunday Blitz",
    description: "NFL parlay builder and odds tools.",
    priceLabel: "$4.99/month",
    priceEnv: "STRIPE_NFL_BETTING_PRICE_ID",
    sport: "NFL",
  },
  cfb_betting: {
    name: "Saturday Surge",
    description: "College football parlay builder and odds tools.",
    priceLabel: "$4.99/month",
    priceEnv: "STRIPE_CFB_BETTING_PRICE_ID",
    sport: "CFB",
  },
} as const;

export type MembershipProductKey = keyof typeof MEMBERSHIP_PLANS;

export function isMembershipProductKey(value: string): value is MembershipProductKey {
  return Object.hasOwn(MEMBERSHIP_PLANS, value);
}
