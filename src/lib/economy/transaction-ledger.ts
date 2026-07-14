import type { GameRuntimeData } from "@/lib/canonical-runtime";
import { PREMIUM_CRYSTALS_ECONOMY_ID } from "@/lib/player-runtime/economy";
import type { PlayerRuntimeState, ResourceTransaction, ResourceTransactionOperation } from "@/lib/player-runtime/types";
import { getBehaviorContract, getTransactionReasons } from "./contracts";
import { applyEconomyPrecision } from "./precision";

function nowIso(now = new Date()) {
  return now.toISOString();
}

function transactionId(timestamp: string, economyId: string, sourceType: string, sourceId: string) {
  return `${timestamp}:${economyId}:${sourceType}:${sourceId}`.replace(/[^a-zA-Z0-9:_-]/g, "_");
}

function findReason(content: GameRuntimeData, economyId: string, operation: ResourceTransactionOperation, sourceType: string, reasonCode?: string) {
  const reasons = getTransactionReasons(content).filter((reason) => reason.economyId === economyId);
  return reasons.find((reason) => reason.id === reasonCode)
    ?? reasons.find((reason) => reason.operation === operation && reason.sourceTypes.includes(sourceType));
}

export function createResourceTransaction(
  content: GameRuntimeData,
  input: {
    economyId: string;
    amount: number;
    operation: ResourceTransactionOperation;
    sourceType: string;
    sourceId: string;
    scope?: string;
    timestamp?: string;
    reasonCode?: string;
    verified?: boolean;
    entitlementId?: string;
  }
): ResourceTransaction {
  const timestamp = input.timestamp ?? nowIso();
  const reason = findReason(content, input.economyId, input.operation, input.sourceType, input.reasonCode);
  return {
    id: transactionId(timestamp, input.economyId, input.sourceType, input.sourceId),
    economyId: input.economyId,
    amount: input.amount,
    operation: input.operation,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    scope: input.scope ?? "civilization",
    timestamp,
    reasonCode: reason?.id ?? input.reasonCode ?? `${input.economyId.toLowerCase()}_${input.operation}`,
    verified: input.verified,
    entitlementId: input.entitlementId
  };
}

export function applyResourceTransaction(content: GameRuntimeData, state: PlayerRuntimeState, transaction: ResourceTransaction): PlayerRuntimeState {
  const next = structuredClone(state);
  const sign = transaction.operation === "spend" ? -1 : 1;
  const current = next.economy.balances[transaction.economyId] ?? 0;
  const contract = getBehaviorContract(content, transaction.economyId);
  const raw = current + sign * transaction.amount;
  next.economy.balances[transaction.economyId] = applyEconomyPrecision(content, transaction.economyId, contract?.canGoNegative ? raw : Math.max(0, raw));
  next.economy.recentTransactions = [transaction, ...(next.economy.recentTransactions ?? [])].slice(0, 50);
  if (transaction.economyId === PREMIUM_CRYSTALS_ECONOMY_ID) {
    next.economy.premiumCrystalAudit = [transaction, ...(next.economy.premiumCrystalAudit ?? [])].slice(0, 100);
  }
  next.updatedAt = transaction.timestamp;
  next.revision += 1;
  return next;
}

export function grantPremiumCrystals(
  content: GameRuntimeData,
  state: PlayerRuntimeState,
  input: {
    amount: number;
    reasonCode: string;
    sourceType: "discovery" | "achievement" | "milestone" | "event" | "grant" | "entitlement" | "verified_purchase" | "refund" | "protected_support_adjustment" | "dev_grant";
    sourceId: string;
    verified?: boolean;
    entitlementId?: string;
    development?: boolean;
  }
) {
  if (input.amount <= 0 || !Number.isFinite(input.amount)) return { ok: false as const, reason: "invalid_amount" };
  if (input.sourceType === "dev_grant" && input.development !== true) return { ok: false as const, reason: "dev_grant_requires_development_tools" };
  if (["verified_purchase", "entitlement", "refund", "protected_support_adjustment"].includes(input.sourceType) && input.verified !== true) {
    return { ok: false as const, reason: "verified_premium_source_required" };
  }
  const transaction = createResourceTransaction(content, {
    economyId: PREMIUM_CRYSTALS_ECONOMY_ID,
    amount: input.amount,
    operation: input.sourceType === "verified_purchase" ? "purchase" : "grant",
    sourceType: input.sourceType === "verified_purchase" ? "entitlement" : input.sourceType,
    sourceId: input.sourceId,
    reasonCode: input.reasonCode,
    verified: input.verified,
    entitlementId: input.entitlementId
  });
  return { ok: true as const, state: applyResourceTransaction(content, state, transaction), transaction };
}
