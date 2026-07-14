import { getBundledStudioRuntimeSnapshot } from "./bundled-snapshot";
import { createCacheRecord, type RuntimeContentCache } from "./cache";
import { mockRuntimeData } from "./mock-fixture";
import { validateGameRuntimeData } from "./schema";
import type {
  GameRuntimeData,
  RuntimeContentConfig,
  RuntimeContentMode,
  RuntimeContentSource,
  RuntimeContentState,
  RuntimeValidationResult
} from "./types";

export const DEFAULT_STUDIO_URL = "https://project-genesis-livid.vercel.app";
export const DEFAULT_RUNTIME_PATH = "/api/export/game-runtime-data.json";
export const MIN_RUNTIME_CONTENT_VERSION = 3;

function now() {
  return new Date().toISOString();
}

export function normalizeRuntimeContentMode(value: string | undefined | null): RuntimeContentMode {
  return value === "snapshot" || value === "live" || value === "mock" ? value : "mock";
}

export function createRuntimeContentConfig(input?: Partial<RuntimeContentConfig>): RuntimeContentConfig {
  return {
    configuredMode: input?.configuredMode ?? "mock",
    studioUrl: input?.studioUrl || DEFAULT_STUDIO_URL,
    runtimePath: input?.runtimePath || DEFAULT_RUNTIME_PATH,
    developerPanelEnabled: input?.developerPanelEnabled ?? true
  };
}

function endpoint(config: RuntimeContentConfig) {
  return `${config.studioUrl.replace(/\/$/, "")}${config.runtimePath.startsWith("/") ? config.runtimePath : `/${config.runtimePath}`}`;
}

export function compareRuntimeVersions(remote: GameRuntimeData, local: GameRuntimeData) {
  const remoteVersion = remote.metadata.contentVersion;
  const localVersion = local.metadata.contentVersion;

  if (remoteVersion > localVersion) return "remote_newer" as const;
  if (remoteVersion < localVersion) return "local_newer" as const;
  if (remote.metadata.checksum !== local.metadata.checksum) return "same_version_different_checksum" as const;
  return "same" as const;
}

function stateFromPayload(
  payload: GameRuntimeData,
  config: RuntimeContentConfig,
  source: RuntimeContentSource,
  options?: Partial<RuntimeContentState>
): RuntimeContentState {
  return {
    configuredMode: config.configuredMode,
    activeSource: source,
    status: options?.status ?? "ready",
    schemaVersion: payload.metadata.schemaVersion,
    runtimeVersion: payload.metadata.runtimeVersion,
    architectureVersion: payload.metadata.architectureVersion,
    contentVersion: payload.metadata.contentVersion,
    releaseName: payload.metadata.releaseName,
    checksum: payload.metadata.checksum,
    accessLevel: payload.metadata.accessLevel,
    validationStatus: payload.metadata.validationStatus,
    eras: payload.eras,
    resources: payload.resources,
    upgradeCategories: payload.upgradeCategories,
    upgrades: payload.upgrades,
    assets: payload.assets,
    balance: payload.balance,
    clientProfiles: payload.clientProfiles,
    economy: payload.economy,
    economyDefinitions: payload.economyDefinitions,
    economyBehaviorContracts: payload.economyBehaviorContracts,
    eraEconomyProfiles: payload.eraEconomyProfiles,
    economyUsageRelationships: payload.economyUsageRelationships,
    inventoryResourceMetadata: payload.inventoryResourceMetadata,
    resourceProducerDefinitions: payload.resourceProducerDefinitions,
    buildingResourceEffects: payload.buildingResourceEffects,
    economyScopeRules: payload.economyScopeRules,
    economyTransactionReasons: payload.economyTransactionReasons,
    economyRateBreakdownDefinitions: payload.economyRateBreakdownDefinitions,
    offlineProgressionPolicies: payload.offlineProgressionPolicies,
    economyCalculationRules: payload.economyCalculationRules,
    validationErrors: options?.validationErrors ?? [],
    validationWarnings: options?.validationWarnings ?? [],
    lastCheckedAt: options?.lastCheckedAt,
    lastDownloadedAt: options?.lastDownloadedAt,
    isUsingFallback: options?.isUsingFallback ?? false,
    fallbackReason: options?.fallbackReason,
    studioEndpoint: endpoint(config),
    cacheStatus: options?.cacheStatus ?? "unknown"
  };
}

export class CanonicalRuntimeContentManager {
  constructor(
    private readonly cache: RuntimeContentCache,
    private config: RuntimeContentConfig
  ) {}

  getConfig() {
    return this.config;
  }

  setMode(mode: RuntimeContentMode) {
    this.config = {
      ...this.config,
      configuredMode: mode
    };
  }

  private async bundledOrMockState(reason?: string) {
    const bundled = await getBundledStudioRuntimeSnapshot();

    if (bundled) {
      return stateFromPayload(bundled, this.config, "bundled-snapshot", {
        status: reason ? "fallback" : "ready",
        isUsingFallback: Boolean(reason),
        fallbackReason: reason,
        cacheStatus: "empty"
      });
    }

    return stateFromPayload(mockRuntimeData, this.config, "mock", {
      status: reason ? "fallback" : "ready",
      isUsingFallback: Boolean(reason),
      fallbackReason: reason ?? "No bundled Studio snapshot is available.",
      cacheStatus: "empty"
    });
  }

  async loadStartup() {
    if (this.config.configuredMode === "mock") {
      return stateFromPayload(mockRuntimeData, this.config, "mock", { cacheStatus: "unknown" });
    }

    const [cached, bundled] = await Promise.all([this.cache.read(), getBundledStudioRuntimeSnapshot()]);
    const bundledValidation = bundled ? validateGameRuntimeData(bundled) : undefined;
    const validBundled = bundledValidation?.ok ? bundledValidation.payload : undefined;

    if (cached && cached.contentVersion < MIN_RUNTIME_CONTENT_VERSION) {
      await this.cache.clear();
      return this.bundledOrMockState(`Cached runtime contentVersion ${cached.contentVersion} is older than minimum ${MIN_RUNTIME_CONTENT_VERSION}.`);
    }

    if (cached) {
      const validation = validateGameRuntimeData(cached.payload);

      if (validation.ok && validation.payload) {
        if (validBundled) {
          const comparison = compareRuntimeVersions(validation.payload, validBundled);

          if (comparison === "local_newer") {
            await this.cache.clear();
            return stateFromPayload(validBundled, this.config, "bundled-snapshot", {
              status: "fallback",
              isUsingFallback: true,
              fallbackReason: `Cached runtime contentVersion ${cached.contentVersion} is older than bundled contentVersion ${validBundled.metadata.contentVersion}.`,
              cacheStatus: "cleared",
              validationWarnings: bundledValidation?.warnings ?? []
            });
          }
        }

        return stateFromPayload(validation.payload, this.config, "cache", {
          cacheStatus: "valid",
          lastDownloadedAt: cached.downloadedAt,
          validationWarnings: validation.warnings
        });
      }

      await this.cache.clear();
    }

    if (validBundled) {
      return stateFromPayload(validBundled, this.config, "bundled-snapshot", {
        cacheStatus: cached ? "cleared" : "empty",
        fallbackReason: cached ? "Cached runtime failed validation." : undefined,
        isUsingFallback: Boolean(cached),
        status: cached ? "fallback" : "ready",
        validationWarnings: bundledValidation?.warnings ?? []
      });
    }

    return stateFromPayload(mockRuntimeData, this.config, "mock", {
      status: "fallback",
      isUsingFallback: true,
      fallbackReason: cached ? "Cached runtime failed validation and no bundled Studio snapshot is available." : "No cached runtime or bundled Studio snapshot is available.",
      cacheStatus: cached ? "cleared" : "empty"
    });
  }

  async refreshLiveContent(activePayload?: GameRuntimeData, activeSource: RuntimeContentSource = "cache") {
    const checkedAt = now();

    try {
      const response = await fetch(endpoint(this.config), { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Studio runtime returned HTTP ${response.status}.`);
      }

      const payload: unknown = await response.json();
      const validation = validateGameRuntimeData(payload);

      if (!validation.ok || !validation.payload) {
        return {
          state: activePayload
            ? stateFromPayload(activePayload, this.config, activeSource, {
                status: "fallback",
                isUsingFallback: true,
                fallbackReason: "Live payload failed validation.",
                validationErrors: validation.errors,
                validationWarnings: validation.warnings,
                lastCheckedAt: checkedAt,
                cacheStatus: "valid"
              })
            : await this.bundledOrMockState("Live payload failed validation."),
          activated: false,
          validation
        };
      }

      if (activePayload) {
        const comparison = compareRuntimeVersions(validation.payload, activePayload);

        if (comparison === "local_newer" || comparison === "same") {
          return {
            state: stateFromPayload(activePayload, this.config, activeSource, {
              status: "ready",
              lastCheckedAt: checkedAt,
              validationWarnings: validation.warnings,
              cacheStatus: "valid",
              fallbackReason: comparison === "same" ? "Live content is already current." : "Cached content is newer than live content."
            }),
            activated: false,
            validation
          };
        }
      }

      const downloadedAt = now();
      await this.cache.write(createCacheRecord(validation.payload, downloadedAt));

      return {
        state: stateFromPayload(validation.payload, this.config, "live", {
          status: "ready",
          lastCheckedAt: checkedAt,
          lastDownloadedAt: downloadedAt,
          validationWarnings: validation.warnings,
          cacheStatus: "valid"
        }),
        activated: true,
        validation
      };
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unable to fetch Studio runtime.";
      return {
        state: activePayload
            ? stateFromPayload(activePayload, this.config, activeSource, {
              status: "fallback",
              isUsingFallback: true,
              fallbackReason: reason,
              lastCheckedAt: checkedAt,
              cacheStatus: "valid"
            })
          : await this.bundledOrMockState(reason),
        activated: false,
        validation: { ok: false, errors: [reason], warnings: [] } satisfies RuntimeValidationResult
      };
    }
  }

  async importSnapshot(input: unknown) {
    const validation = validateGameRuntimeData(input);

    if (!validation.ok || !validation.payload) {
      return { state: await this.loadStartup(), validation, imported: false };
    }

    const downloadedAt = now();
    await this.cache.write(createCacheRecord(validation.payload, downloadedAt));

    return {
      state: stateFromPayload(validation.payload, this.config, "cache", {
        lastDownloadedAt: downloadedAt,
        validationWarnings: validation.warnings,
        cacheStatus: "valid"
      }),
      validation,
      imported: true
    };
  }

  async clearCache() {
    await this.cache.clear();
    return this.bundledOrMockState("Runtime cache cleared.");
  }

  exportSnapshot(state: RuntimeContentState): GameRuntimeData {
    return {
      metadata: {
        schemaVersion: state.schemaVersion as "game-runtime-v1",
        contentVersion: state.contentVersion,
        releaseName: state.releaseName,
        checksum: state.checksum,
        accessLevel: state.accessLevel as "public-published",
        validationStatus: state.validationStatus as "Ready"
      },
      eras: state.eras,
      resources: state.resources,
      upgradeCategories: state.upgradeCategories,
      upgrades: state.upgrades,
      assets: state.assets,
      balance: state.balance,
      clientProfiles: state.clientProfiles,
      economy: state.economy,
      economyDefinitions: state.economyDefinitions
    };
  }
}
