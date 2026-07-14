import type { GameRuntimeData, RuntimeContentState } from "@/lib/canonical-runtime";
import { ARCHITECTURE_REFERENCE, type ArchitectureReference } from "@/config/architecture-reference";

export type ArchitectureCompatibilityStatus =
  | "compatible"
  | "architecture_outdated"
  | "runtime_incompatible"
  | "content_outdated"
  | "unknown";

export type ArchitectureCompatibilityReport = {
  status: ArchitectureCompatibilityStatus;
  reference: ArchitectureReference;
  expectedArchitectureVersion: string;
  exportedArchitectureVersion?: string;
  expectedRuntimeVersion: string;
  loadedRuntimeVersion?: string;
  minimumContentVersion: number;
  loadedContentVersion?: number;
  architectureStatus: ArchitectureCompatibilityStatus;
  runtimeStatus: ArchitectureCompatibilityStatus;
  contentStatus: ArchitectureCompatibilityStatus;
  reason: string;
};

type RuntimeLike = Pick<GameRuntimeData, "metadata"> | Pick<RuntimeContentState, "schemaVersion" | "contentVersion"> & {
  architectureVersion?: string;
  runtimeVersion?: string;
};

function metadataValue(source: RuntimeLike, key: "architectureVersion" | "runtimeVersion") {
  if ("metadata" in source) {
    const metadata = source.metadata as GameRuntimeData["metadata"] & Record<string, unknown>;
    const value = metadata[key] ?? (source as Record<string, unknown>)[key];
    return typeof value === "string" && value.trim() ? value : undefined;
  }
  const value = source[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function loadedRuntimeVersion(source: RuntimeLike) {
  if ("metadata" in source) return metadataValue(source, "runtimeVersion") ?? source.metadata.schemaVersion;
  return source.runtimeVersion ?? source.schemaVersion;
}

function loadedContentVersion(source: RuntimeLike) {
  return "metadata" in source ? source.metadata.contentVersion : source.contentVersion;
}

function compareVersion(a: string, b: string) {
  const left = a.split(".").map((part) => Number.parseInt(part, 10));
  const right = b.split(".").map((part) => Number.parseInt(part, 10));
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = Number.isFinite(left[index]) ? left[index] : 0;
    const rightValue = Number.isFinite(right[index]) ? right[index] : 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }
  return 0;
}

export function resolveArchitectureCompatibility(source: RuntimeLike, reference: ArchitectureReference = ARCHITECTURE_REFERENCE): ArchitectureCompatibilityReport {
  const exportedArchitectureVersion = metadataValue(source, "architectureVersion");
  const runtimeVersion = loadedRuntimeVersion(source);
  const contentVersion = loadedContentVersion(source);

  const architectureStatus: ArchitectureCompatibilityStatus = exportedArchitectureVersion
    ? compareVersion(exportedArchitectureVersion, reference.architectureVersion) > 0
      ? "architecture_outdated"
      : exportedArchitectureVersion === reference.architectureVersion
        ? "compatible"
        : "unknown"
    : "unknown";
  const runtimeStatus: ArchitectureCompatibilityStatus = runtimeVersion === reference.runtimeVersion ? "compatible" : "runtime_incompatible";
  const contentStatus: ArchitectureCompatibilityStatus = contentVersion >= reference.minimumContentVersion ? "compatible" : "content_outdated";

  let status: ArchitectureCompatibilityStatus = "compatible";
  let reason = "Studio runtime matches the Game architecture reference.";

  if (runtimeStatus === "runtime_incompatible") {
    status = "runtime_incompatible";
    reason = `Unsupported runtime contract ${runtimeVersion ?? "missing"}.`;
  } else if (contentStatus === "content_outdated") {
    status = "content_outdated";
    reason = `Content version ${contentVersion ?? "missing"} is below minimum ${reference.minimumContentVersion}.`;
  } else if (architectureStatus === "architecture_outdated") {
    status = "architecture_outdated";
    reason = `Studio architecture ${exportedArchitectureVersion} is newer than Game reference ${reference.architectureVersion}.`;
  } else if (architectureStatus === "unknown") {
    status = "unknown";
    reason = "Studio architectureVersion is absent from the sanitized runtime export.";
  }

  return {
    status,
    reference,
    expectedArchitectureVersion: reference.architectureVersion,
    exportedArchitectureVersion,
    expectedRuntimeVersion: reference.runtimeVersion,
    loadedRuntimeVersion: runtimeVersion,
    minimumContentVersion: reference.minimumContentVersion,
    loadedContentVersion: contentVersion,
    architectureStatus,
    runtimeStatus,
    contentStatus,
    reason
  };
}

export function formatArchitectureCompatibilityStatus(status: ArchitectureCompatibilityStatus) {
  return status.split("_").map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`).join(" ");
}
