import { queueOfflineDiscoveryClaim } from "./journal";
import type { DiscoveryRegistryClient } from "./registry-client";
import type { DiscoveryJournalState, DiscoveryPendingClaim } from "./types";

export async function submitOrQueueDiscoveryClaim(client: DiscoveryRegistryClient, journal: DiscoveryJournalState, claim: DiscoveryPendingClaim) {
  const result = await client.submitDiscoveryClaim(claim);
  if (result.ok) {
    return {
      result,
      journal: {
        ...journal,
        pendingDiscoveryClaims: journal.pendingDiscoveryClaims.filter((pending) => pending.requestId !== claim.requestId)
      }
    };
  }
  return { result, journal: queueOfflineDiscoveryClaim(journal, claim) };
}

export async function retryPendingDiscoveryClaims(client: DiscoveryRegistryClient, journal: DiscoveryJournalState) {
  let next = journal;
  const results = [];
  for (const claim of journal.pendingDiscoveryClaims) {
    const outcome = await submitOrQueueDiscoveryClaim(client, next, { ...claim, status: "submitted" });
    next = outcome.journal;
    results.push(outcome.result);
  }
  return { journal: next, results };
}
