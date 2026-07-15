import type { DiscoveryRewardProfile } from "./types";

export const PREMIUM_CRYSTALS_ECONOMY_ID = "ECON-PREMIUM-CRYSTALS";

export function canApplyDiscoveryRewardLocally(profile: DiscoveryRewardProfile | undefined) {
  const rewards = profile?.rewards ?? [];
  const premiumReward = rewards.some((reward) => reward.economyId === PREMIUM_CRYSTALS_ECONOMY_ID || reward.resourceId === PREMIUM_CRYSTALS_ECONOMY_ID);
  if (!profile) return { ok: true, reason: "No reward profile." };
  if (premiumReward && (!profile.protectedPremiumReward || !profile.serverAuthoritative)) {
    return { ok: false, reason: "Premium Crystal Discovery rewards must be explicitly protected and server-authoritative." };
  }
  if (profile.serverAuthoritative) {
    return { ok: false, reason: "Reward profile is server-authoritative." };
  }
  return { ok: true, reason: "Local reward profile is safe." };
}
