import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useOutletContext } from "react-router-dom";
import {
  GameShell,
  StoryCanvas
} from "@/components/game-ui/genesis-ui";
import {
  BrowserRuntimeContentCache,
  CanonicalRuntimeContentManager,
  createRuntimeContentConfig,
  mockRuntimeData,
  normalizeRuntimeContentMode,
  type GameRuntimeData,
  type RuntimeContentState
} from "@/lib/canonical-runtime";
import type { DashboardPlayerState } from "@/lib/dashboard/dashboard-model";
import {
  advanceSimulation,
  createNewPlayerRuntimeState,
  grantTestEconomy,
  grantTestResources,
  PlayerRuntimeLocalSaveService,
  PLAYER_RUNTIME_SAVE_VERSION,
  playerRuntimeToDashboardPlayerState,
  performManualLaborClick,
  type PlayerRuntimeState
} from "@/lib/player-runtime";
import { RESEARCH_ECONOMY_ID, resolvePrimaryEconomyIdForCurrentEra } from "@/lib/player-runtime/economy";
import {
  getDefaultDeviceName,
  getNoverisSupabaseClient,
  getOrCreateLocalDeviceId,
  loadCloudSyncMetadata,
  NoverisAuthProvider,
  NoverisCloudSaveService,
  NoverisDeviceService,
  NoverisProfileService,
  readNoverisSupabaseConfig,
  saveCloudSyncMetadata,
  useNoverisAuth,
  type ActiveSaveSource,
  type CloudSave,
  type CloudSyncMetadata
} from "@/lib/supabase";
import { classifySave, compareSaves, shouldShowConflict, useGameStartup } from "@/lib/startup";
import {
  AccountRoute,
  ForgotPasswordRoute,
  LoginRoute,
  NoverisLoadingScreen,
  ResetPasswordRoute,
  SaveConflictRoute,
  SignupRoute,
  WelcomeRoute
} from "@/routes/auth/noveris-auth-routes";

const ProductionRoute = lazy(() => import("@/routes/production-route"));
const ResearchRoute = lazy(() => import("@/routes/research-route"));
const ResourcesRoute = lazy(() => import("@/routes/resources-route"));
const CivilizationRoute = lazy(() => import("@/routes/civilization-route"));
const EarthRoute = lazy(() => import("@/routes/earth-route"));
const SolarSystemRoute = lazy(() => import("@/routes/solar-system-route"));
const DiscoveryRoute = lazy(() => import("@/routes/discovery-route"));
const ArtReviewRoute = lazy(() => import("@/routes/art-review-route"));
const ParityReviewRoute = lazy(() => import("@/routes/parity-review-route"));
const RuntimeDiagnostics = lazy(() => import("@/routes/runtime-diagnostics"));

type GenesisOutletContext = {
  data: GameRuntimeData;
  state: RuntimeContentState;
  playerRuntime: PlayerRuntimeState;
  playerRuntimeActions: PlayerRuntimeActions;
  cloudSync: CloudSyncMetadata;
  cloudSave: CloudSave | null;
  cloudError?: string;
  runtimeStatus: PlayerRuntimeStatus;
  refreshCanonicalRuntime: () => Promise<void>;
  clearCanonicalRuntimeCache: () => Promise<void>;
};

const developerToolsEnabled = import.meta.env.VITE_ENABLE_DEV_TOOLS === "true";

type PlayerRuntimeActions = {
  saveNow: () => void;
  resetSave: () => void;
  deleteLocalSave: () => void;
  saveToCloud: () => void;
  chooseCloudSave: () => void;
  chooseLocalSave: () => void;
  deleteCloudSave: () => void;
  exportSave: () => string;
  importSave: (serialized: string) => boolean;
  advanceSimulation: (seconds?: number) => void;
  grantTestResources: () => void;
  grantTestPrimaryEconomy: () => void;
  grantTestResearch: () => void;
  performManualLaborClick: () => void;
  toggleAutomation: () => void;
};

type PlayerRuntimeStatus = {
  runtimeId: string;
  hydrationComplete: boolean;
  gameplayReady: boolean;
  actionOwner: "player-runtime-provider";
  isSimulationRunning: boolean;
  activeSimulationRuntimeId?: string;
  simulationStartCount: number;
  tickCount: number;
  lastTickAt?: string;
  controlsEnabled: boolean;
  disabledReason?: string;
  lastClickAt?: string;
};

function getSupabaseProfileDisplayName(user: ReturnType<typeof useNoverisAuth>["state"]["user"]) {
  const metadata = user?.user_metadata as Record<string, unknown> | undefined;
  const value = metadata?.display_name ?? metadata?.displayName ?? metadata?.full_name ?? metadata?.name;
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function payloadFromState(state: RuntimeContentState): GameRuntimeData {
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

function initialState(): RuntimeContentState {
  return {
    configuredMode: "mock",
    activeSource: "mock",
    status: "loading",
    schemaVersion: mockRuntimeData.metadata.schemaVersion,
    contentVersion: mockRuntimeData.metadata.contentVersion,
    releaseName: mockRuntimeData.metadata.releaseName,
    checksum: mockRuntimeData.metadata.checksum,
    accessLevel: mockRuntimeData.metadata.accessLevel,
    validationStatus: mockRuntimeData.metadata.validationStatus,
    eras: mockRuntimeData.eras,
    resources: mockRuntimeData.resources,
    upgradeCategories: mockRuntimeData.upgradeCategories,
    upgrades: mockRuntimeData.upgrades,
    assets: mockRuntimeData.assets,
    balance: mockRuntimeData.balance,
    clientProfiles: mockRuntimeData.clientProfiles,
    economy: mockRuntimeData.economy,
    economyDefinitions: mockRuntimeData.economyDefinitions,
    validationErrors: [],
    validationWarnings: [],
    isUsingFallback: true,
    fallbackReason: "Runtime content is initializing.",
    studioEndpoint: "",
    cacheStatus: "unknown"
  };
}

function createViteRuntimeManager() {
  const config = createRuntimeContentConfig({
    configuredMode: normalizeRuntimeContentMode(import.meta.env.VITE_CONTENT_MODE ?? "live"),
    studioUrl: import.meta.env.VITE_GENESIS_STUDIO_URL,
    runtimePath: import.meta.env.VITE_GENESIS_RUNTIME_PATH,
    developerPanelEnabled: import.meta.env.VITE_ENABLE_DEV_TOOLS === "true"
  });

  return new CanonicalRuntimeContentManager(new BrowserRuntimeContentCache(), config);
}

function useRuntimeContent() {
  const manager = useMemo(() => createViteRuntimeManager(), []);
  const [state, setState] = useState<RuntimeContentState>(() => initialState());

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const startup = await manager.loadStartup();
      if (cancelled) return;
      setState(startup);

      if (manager.getConfig().configuredMode === "live") {
        const refreshed = await manager.refreshLiveContent(payloadFromState(startup), startup.activeSource);
        if (!cancelled) {
          setState(refreshed.state);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [manager]);

  async function refreshCanonicalRuntime() {
    setState((current) => ({ ...current, status: "refreshing" }));
    const refreshed = await manager.refreshLiveContent(payloadFromState(state), state.activeSource);
    setState(refreshed.state);
  }

  async function clearCanonicalRuntimeCache() {
    setState((current) => ({ ...current, status: "refreshing" }));
    const cleared = await manager.clearCache();
    setState(cleared);
  }

  return { state, refreshCanonicalRuntime, clearCanonicalRuntimeCache };
}

function stampRuntimeSource(state: PlayerRuntimeState, source: PlayerRuntimeState["runtimeLoadReport"]["loadedFrom"]): PlayerRuntimeState {
  const now = new Date().toISOString();
  return {
    ...state,
    runtimeLoadReport: {
      ...state.runtimeLoadReport,
      loadedFrom: source,
      loadedAt: now,
      contentVersion: state.contentVersion,
      currentSaveVersion: PLAYER_RUNTIME_SAVE_VERSION
    }
  };
}

function runtimeIdentity(state: PlayerRuntimeState, runtimeKey: string) {
  return `${runtimeKey}:${state.playerId}:${state.revision}:${state.updatedAt}`;
}

function usePlayerRuntime(data: GameRuntimeData, enabled: boolean, authState: ReturnType<typeof useNoverisAuth>["state"]) {
  const service = useMemo(() => new PlayerRuntimeLocalSaveService(data), [data]);
  const supabaseConfig = useMemo(() => readNoverisSupabaseConfig(), []);
  const supabaseClient = useMemo(() => getNoverisSupabaseClient(supabaseConfig), [supabaseConfig]);
  const cloudService = useMemo(() => new NoverisCloudSaveService(supabaseClient, data), [data, supabaseClient]);
  const profileService = useMemo(() => new NoverisProfileService(supabaseClient), [supabaseClient]);
  const deviceService = useMemo(() => new NoverisDeviceService(supabaseClient), [supabaseClient]);
  const runtimeKey = `${data.metadata.contentVersion}:${data.metadata.checksum}`;
  const [playerRuntime, setPlayerRuntime] = useState<PlayerRuntimeState>(() => createNewPlayerRuntimeState(data));
  const [loadedRuntimeKey, setLoadedRuntimeKey] = useState("");
  const [cloudSave, setCloudSave] = useState<CloudSave | null>(null);
  const [cloudError, setCloudError] = useState<string | undefined>();
  const [cloudSync, setCloudSync] = useState<CloudSyncMetadata>(() => loadCloudSyncMetadata());
  const [startupConflict, setStartupConflict] = useState(false);
  const [runtimeStatus, setRuntimeStatus] = useState<PlayerRuntimeStatus>({
    runtimeId: "unhydrated",
    hydrationComplete: false,
    gameplayReady: false,
    actionOwner: "player-runtime-provider",
    isSimulationRunning: false,
    simulationStartCount: 0,
    tickCount: 0,
    controlsEnabled: false,
    disabledReason: "runtime not hydrated"
  });
  const cloudSavingRef = useRef(false);
  const startupTokenRef = useRef("");
  const runtimeReady = loadedRuntimeKey === runtimeKey && runtimeStatus.hydrationComplete && !startupConflict;
  const displayPlayerRuntime = runtimeReady ? playerRuntime : createNewPlayerRuntimeState(data);

  const updateCloudSync = useCallback((patch: Partial<CloudSyncMetadata>) => {
    setCloudSync((current) => saveCloudSyncMetadata({ ...current, ...patch }));
  }, []);

  const syncCloudNow = useCallback(async (state: PlayerRuntimeState, reason = "manual") => {
    if (authState.status !== "authenticated" || !authState.user || cloudSavingRef.current) return;
    cloudSavingRef.current = true;
    updateCloudSync({ status: "Saving", dirty: true, lastCloudError: undefined });
    const deviceId = getOrCreateLocalDeviceId();
    const deviceName = getDefaultDeviceName();
    const expectedRevision = cloudSync.lastSyncedRevision ?? cloudSave?.revision ?? Math.max(1, state.revision - 1);
    const result = cloudSave
      ? await cloudService.updatePrimarySave(authState.user, state, expectedRevision, deviceId, deviceName)
      : await cloudService.createPrimarySave(authState.user, state, deviceId, deviceName);

    if (result.status === "saved") {
      setCloudSave(result.save);
      updateCloudSync({
        status: "Synced",
        dirty: false,
        pendingRetry: false,
        pendingRetryReason: undefined,
        lastCloudError: undefined,
        lastSuccessfulSyncAt: new Date().toISOString(),
        lastSyncedRevision: result.save.revision,
        cloudRevision: result.save.revision,
        deviceId,
        deviceName
      });
    } else if (result.status === "conflict") {
      setCloudError("Cloud save changed on another device.");
      setStartupConflict(true);
      updateCloudSync({ status: "Conflict", pendingRetry: false, lastCloudError: "Revision conflict", dirty: true });
    } else {
      cloudService.queueRetry(state, `${reason}: ${result.reason}`);
      setCloudError(result.reason);
      updateCloudSync({ status: result.status === "offline_queued" ? "Pending Sync" : "Error", pendingRetry: true, pendingRetryReason: result.reason, lastCloudError: result.reason, dirty: true });
    }
    cloudSavingRef.current = false;
  }, [authState, cloudSave, cloudService, cloudSync.lastSyncedRevision, updateCloudSync]);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function start() {
      const userId = authState.user?.id ?? authState.status;
      const startupToken = `${runtimeKey}:${userId}`;
      if (startupTokenRef.current === startupToken) return;
      startupTokenRef.current = startupToken;
      setLoadedRuntimeKey("");
      setStartupConflict(false);
      setCloudError(undefined);
      setRuntimeStatus((current) => ({
        ...current,
        runtimeId: "hydrating",
        hydrationComplete: false,
        gameplayReady: false,
        isSimulationRunning: false,
        activeSimulationRuntimeId: undefined,
        controlsEnabled: false,
        disabledReason: "startup resolving save"
      }));

      const localLoaded = service.loadOrCreate();
      let selected = localLoaded;
      let activeSaveSource: ActiveSaveSource = classifySave(localLoaded) === "canonical new game" ? "new_game" : "local";
      let loadedCloud: CloudSave | null = null;

      if (authState.status === "authenticated" && authState.user) {
        try {
          await profileService.ensureProfile(authState.user);
          const device = await deviceService.ensureDevice(authState.user, "0.0.0");
          loadedCloud = await cloudService.loadPrimarySave(authState.user);
          setCloudSave(loadedCloud);

          const comparison = compareSaves(localLoaded, loadedCloud);
          if (loadedCloud && shouldShowConflict(comparison)) {
            setPlayerRuntime(localLoaded);
            setStartupConflict(true);
            setRuntimeStatus((current) => ({
              ...current,
              hydrationComplete: false,
              gameplayReady: false,
              isSimulationRunning: false,
              activeSimulationRuntimeId: undefined,
              controlsEnabled: false,
              disabledReason: "save conflict requires resolution"
            }));
            updateCloudSync({
              activeSaveSource: "local",
              status: "Conflict",
              dirty: false,
              pendingRetry: false,
              deviceId: device?.device_id,
              deviceName: device?.device_name,
              cloudRevision: loadedCloud.revision,
              lastSyncedRevision: loadedCloud.revision
            });
            return;
          }

          if (loadedCloud && (comparison === "cloud descendant" || classifySave(localLoaded) === "canonical new game")) {
            selected = stampRuntimeSource(loadedCloud.playerState, "Cloud Save");
            activeSaveSource = "cloud";
          }
          if (!loadedCloud || comparison === "local descendant") {
            activeSaveSource = loadedCloud ? "local" : activeSaveSource;
          }
          updateCloudSync({
            activeSaveSource,
            status: loadedCloud ? "Synced" : "Pending Sync",
            dirty: !loadedCloud,
            pendingRetry: false,
            deviceId: device?.device_id,
            deviceName: device?.device_name,
            cloudRevision: loadedCloud?.revision,
            lastSyncedRevision: loadedCloud?.revision
          });
        } catch (error) {
          activeSaveSource = "offline_local";
          setCloudError(error instanceof Error ? error.message : "Cloud save unavailable.");
          updateCloudSync({ activeSaveSource, status: "Offline", dirty: false, pendingRetry: false, lastCloudError: "Cloud save unavailable." });
        }
      }

      if (cancelled) return;
      const advanced = advanceSimulation(data, selected);
      const saved = service.save(stampRuntimeSource(advanced, activeSaveSource === "cloud" ? "Cloud Save" : activeSaveSource === "offline_local" ? "Offline Local" : selected.runtimeLoadReport.loadedFrom), false);
      const nextRuntimeId = runtimeIdentity(saved, runtimeKey);
      setPlayerRuntime(saved);
      setLoadedRuntimeKey(runtimeKey);
      setRuntimeStatus((current) => ({
        ...current,
        runtimeId: nextRuntimeId,
        hydrationComplete: true,
        gameplayReady: true,
        controlsEnabled: true,
        disabledReason: undefined
      }));
      updateCloudSync({ activeSaveSource, offlineProgressionApplyCount: cloudSync.offlineProgressionApplyCount + 1 });

      if (authState.status === "authenticated" && authState.user && (!loadedCloud || activeSaveSource === "local")) {
        void syncCloudNow(saved, loadedCloud ? "local-newer-startup" : "first-cloud-save");
      }
    }

    void start();

    return () => {
      cancelled = true;
    };
  }, [authState, cloudService, cloudSync.offlineProgressionApplyCount, data, deviceService, enabled, profileService, runtimeKey, service, syncCloudNow, updateCloudSync]);

  useEffect(() => {
    if (!enabled || loadedRuntimeKey !== runtimeKey || startupConflict || !runtimeStatus.hydrationComplete) return;
    const activeSimulationRuntimeId = runtimeStatus.runtimeId;
    queueMicrotask(() => {
      setRuntimeStatus((current) => ({
        ...current,
        isSimulationRunning: true,
        activeSimulationRuntimeId,
        simulationStartCount: current.activeSimulationRuntimeId === activeSimulationRuntimeId && current.isSimulationRunning ? current.simulationStartCount : current.simulationStartCount + 1,
        controlsEnabled: true,
        disabledReason: undefined
      }));
    });

    const id = window.setInterval(() => {
      setPlayerRuntime((current) => advanceSimulation(data, current, { seconds: 1 }));
      setRuntimeStatus((current) => ({
        ...current,
        tickCount: current.tickCount + 1,
        lastTickAt: new Date().toISOString()
      }));
    }, 1000);

    return () => {
      window.clearInterval(id);
      setRuntimeStatus((current) => current.activeSimulationRuntimeId === activeSimulationRuntimeId ? { ...current, isSimulationRunning: false } : current);
    };
  }, [data, enabled, loadedRuntimeKey, runtimeKey, startupConflict, runtimeStatus.hydrationComplete, runtimeStatus.runtimeId]);

  useEffect(() => {
    if (!enabled || loadedRuntimeKey !== runtimeKey || startupConflict || !runtimeStatus.hydrationComplete) return;

    const autosaveSeconds = Math.max(5, data.balance.autosaveSeconds || 30);
    const id = window.setInterval(() => {
      setPlayerRuntime((current) => {
        const saved = service.autosave(current);
        updateCloudSync({ dirty: true });
        return saved;
      });
    }, autosaveSeconds * 1000);

    return () => window.clearInterval(id);
  }, [data.balance.autosaveSeconds, enabled, loadedRuntimeKey, runtimeKey, runtimeStatus.hydrationComplete, service, startupConflict, updateCloudSync]);

  useEffect(() => {
    if (!enabled || loadedRuntimeKey !== runtimeKey || startupConflict || authState.status !== "authenticated" || !runtimeStatus.hydrationComplete) return;
    const id = window.setInterval(() => {
      if (cloudSync.dirty) void syncCloudNow(playerRuntime, "cloud-autosave");
    }, 25_000);
    return () => window.clearInterval(id);
  }, [authState.status, cloudSync.dirty, enabled, loadedRuntimeKey, playerRuntime, runtimeKey, runtimeStatus.hydrationComplete, startupConflict, syncCloudNow]);

  useEffect(() => {
    function retryOnline() {
      void syncCloudNow(playerRuntime, "online-retry");
    }
    function flushOnHidden() {
      if (document.visibilityState === "hidden" && cloudSync.dirty) {
        void syncCloudNow(playerRuntime, "visibility-hidden");
      }
    }
    window.addEventListener("online", retryOnline);
    document.addEventListener("visibilitychange", flushOnHidden);
    return () => {
      window.removeEventListener("online", retryOnline);
      document.removeEventListener("visibilitychange", flushOnHidden);
    };
  }, [cloudSync.dirty, playerRuntime, syncCloudNow]);

  const actions = useMemo<PlayerRuntimeActions>(
    () => ({
      saveNow() {
        setPlayerRuntime((current) => {
          const saved = service.save(current);
          updateCloudSync({ dirty: true });
          void syncCloudNow(saved, "manual-save");
          return saved;
        });
      },
      resetSave() {
        const next = service.reset();
        const nextRuntimeId = runtimeIdentity(next, runtimeKey);
        setPlayerRuntime(next);
        setLoadedRuntimeKey(runtimeKey);
        setRuntimeStatus((current) => ({ ...current, runtimeId: nextRuntimeId, hydrationComplete: true, gameplayReady: true, controlsEnabled: true, disabledReason: undefined }));
        updateCloudSync({ activeSaveSource: "new_game", dirty: true, status: authState.status === "authenticated" ? "Pending Sync" : "Local Only" });
      },
      deleteLocalSave() {
        const next = service.deleteLocalSave();
        const nextRuntimeId = runtimeIdentity(next, runtimeKey);
        setPlayerRuntime(next);
        setLoadedRuntimeKey(runtimeKey);
        setRuntimeStatus((current) => ({ ...current, runtimeId: nextRuntimeId, hydrationComplete: true, gameplayReady: true, controlsEnabled: true, disabledReason: undefined }));
        updateCloudSync({ activeSaveSource: "new_game", dirty: true, status: authState.status === "authenticated" ? "Pending Sync" : "Local Only" });
      },
      saveToCloud() {
        void syncCloudNow(playerRuntime, "account-save-now");
      },
      deleteCloudSave() {
        if (authState.status !== "authenticated" || !authState.user) return;
        void cloudService.deleteCloudSave(authState.user).then((result) => {
          if (result.status === "saved") {
            setCloudSave(null);
            updateCloudSync({ status: "Local Only", cloudRevision: undefined, lastSyncedRevision: undefined, dirty: true, pendingRetry: false });
          } else {
            updateCloudSync({ status: "Error", lastCloudError: result.reason, pendingRetry: result.status === "offline_queued" });
          }
        });
      },
      chooseCloudSave() {
        if (!cloudSave) return;
        if (authState.status === "authenticated" && authState.user) {
          void cloudService.createBackup(authState.user, playerRuntime, "before_local_replacement_by_cloud", getOrCreateLocalDeviceId(), getDefaultDeviceName());
        }
        const selected = service.save(stampRuntimeSource(advanceSimulation(data, cloudSave.playerState), "Cloud Selected After Conflict"), false);
        const nextRuntimeId = runtimeIdentity(selected, runtimeKey);
        setPlayerRuntime(selected);
        setLoadedRuntimeKey(runtimeKey);
        setStartupConflict(false);
        setRuntimeStatus((current) => ({ ...current, runtimeId: nextRuntimeId, hydrationComplete: true, gameplayReady: true, controlsEnabled: true, disabledReason: undefined }));
        updateCloudSync({ activeSaveSource: "cloud_selected_after_conflict", status: "Synced", dirty: false, pendingRetry: false, lastSyncedRevision: cloudSave.revision, cloudRevision: cloudSave.revision, offlineProgressionApplyCount: cloudSync.offlineProgressionApplyCount + 1 });
      },
      chooseLocalSave() {
        if (authState.status === "authenticated" && authState.user && cloudSave) {
          void cloudService.createBackup(authState.user, cloudSave.playerState, "before_cloud_overwrite_by_local", getOrCreateLocalDeviceId(), getDefaultDeviceName());
        }
        const selected = service.save(stampRuntimeSource(advanceSimulation(data, playerRuntime), "Local Selected After Conflict"), false);
        const nextRuntimeId = runtimeIdentity(selected, runtimeKey);
        setPlayerRuntime(selected);
        setLoadedRuntimeKey(runtimeKey);
        setStartupConflict(false);
        setRuntimeStatus((current) => ({ ...current, runtimeId: nextRuntimeId, hydrationComplete: true, gameplayReady: true, controlsEnabled: true, disabledReason: undefined }));
        updateCloudSync({ activeSaveSource: "local_selected_after_conflict", status: "Pending Sync", dirty: true, pendingRetry: false, offlineProgressionApplyCount: cloudSync.offlineProgressionApplyCount + 1 });
        void syncCloudNow(selected, "conflict-use-local");
      },
      exportSave() {
        return service.exportSave(playerRuntime);
      },
      importSave(serialized: string) {
        const imported = service.importSave(serialized);
        if (imported.ok && imported.state) {
          const importedState = imported.state;
          setPlayerRuntime(importedState);
          setRuntimeStatus((current) => ({ ...current, runtimeId: runtimeIdentity(importedState, runtimeKey), hydrationComplete: true, gameplayReady: true, controlsEnabled: true, disabledReason: undefined }));
          updateCloudSync({ dirty: true });
          return true;
        }
        return false;
      },
      advanceSimulation(seconds = 60) {
        setPlayerRuntime((current) => {
          updateCloudSync({ dirty: true });
          return service.save(advanceSimulation(data, current, { seconds }));
        });
      },
      grantTestResources() {
        setPlayerRuntime((current) => {
          updateCloudSync({ dirty: true });
          return service.save(grantTestResources(data, current));
        });
      },
      grantTestPrimaryEconomy() {
        setPlayerRuntime((current) => {
          const primaryEconomyId = resolvePrimaryEconomyIdForCurrentEra(data, current.civilization.currentEraId);
          if (!primaryEconomyId) return current;
          updateCloudSync({ dirty: true });
          return service.save(grantTestEconomy(data, current, [primaryEconomyId]));
        });
      },
      grantTestResearch() {
        setPlayerRuntime((current) => {
          updateCloudSync({ dirty: true });
          return service.save(grantTestEconomy(data, current, [RESEARCH_ECONOMY_ID]));
        });
      },
      performManualLaborClick() {
        setRuntimeStatus((current) => ({ ...current, lastClickAt: new Date().toISOString() }));
        setPlayerRuntime((current) => {
          updateCloudSync({ dirty: true });
          return service.save(performManualLaborClick(data, current));
        });
      },
      toggleAutomation() {
        updateCloudSync({ dirty: true });
        setPlayerRuntime((current) => service.save({
          ...current,
          production: {
            ...current.production,
            automationEnabled: !current.production.automationEnabled
          }
        }));
      }
    }),
    [authState.status, authState.user, cloudSave, cloudService, cloudSync.offlineProgressionApplyCount, data, playerRuntime, runtimeKey, service, syncCloudNow, updateCloudSync]
  );

  return { playerRuntime: displayPlayerRuntime, actions, cloudSave, cloudError, cloudSync, startupConflict, runtimeStatus: { ...runtimeStatus, gameplayReady: runtimeReady, controlsEnabled: runtimeReady, disabledReason: runtimeReady ? undefined : runtimeStatus.disabledReason ?? "runtime not ready" } };
}

function RuntimeRouteShell() {
  const auth = useNoverisAuth();
  const { state, refreshCanonicalRuntime, clearCanonicalRuntimeCache } = useRuntimeContent();
  const data = useMemo(() => payloadFromState(state), [state]);
  const startupEnabled = auth.state.status === "guest" || auth.state.status === "authenticated" || auth.state.status === "error";
  const { playerRuntime, actions: playerRuntimeActions, cloudSave, cloudError, cloudSync, startupConflict, runtimeStatus } = usePlayerRuntime(data, state.status !== "loading" && startupEnabled, auth.state);
  const startup = useGameStartup({
    runtimeState: state,
    authState: auth.state,
    playerRuntime,
    cloudSave,
    cloudError,
    activeSaveSource: cloudSync.activeSaveSource,
    offlineProgressionApplyCount: cloudSync.offlineProgressionApplyCount
  });

  if (auth.state.status === "signed_out") {
    return <Navigate to="/welcome" replace />;
  }

  if (startupConflict) {
    return <SaveConflictRoute startup={startup} onUseCloud={playerRuntimeActions.chooseCloudSave} onUseLocal={playerRuntimeActions.chooseLocalSave} onRetry={playerRuntimeActions.saveNow} onSignOut={() => void auth.signOut()} />;
  }

  if (state.status === "loading" || auth.state.status === "initializing" || !startup.isReady || !runtimeStatus.gameplayReady) {
    return <NoverisLoadingScreen startup={startup} />;
  }

  return (
    <>
      <Outlet context={{ data, state, playerRuntime, playerRuntimeActions, cloudSync, cloudSave, cloudError, runtimeStatus, refreshCanonicalRuntime, clearCanonicalRuntimeCache } satisfies GenesisOutletContext} />
      {developerToolsEnabled ? (
        <Suspense fallback={null}>
          <RuntimeDiagnostics state={state} onRefresh={refreshCanonicalRuntime} onClearCache={clearCanonicalRuntimeCache} />
        </Suspense>
      ) : null}
    </>
  );
}

function useGenesisRouteContext() {
  return useOutletContext<GenesisOutletContext>();
}

function GenesisRouteFallback({ label }: { label: string }) {
  return (
    <StoryCanvas>
      <div className="flex min-h-screen items-center justify-center text-center">
        <div className="rounded-md border border-cyan-200/25 bg-black/35 px-5 py-4 text-cyan-50 shadow-[0_18px_56px_rgba(0,0,0,0.34)]">
          <div className="text-xs font-bold uppercase text-cyan-100/55">Project Genesis</div>
          <div className="mt-1 text-xl font-black text-white">Loading {label}</div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-md bg-cyan-950">
            <div className="h-full w-2/3 rounded-md bg-gradient-to-r from-cyan-300 via-teal-300 to-amber-300" />
          </div>
        </div>
      </div>
    </StoryCanvas>
  );
}

type LazyDataRouteProps = {
  data: GameRuntimeData;
  runtimeState: RuntimeContentState;
  playerState: DashboardPlayerState;
  playerRuntime: PlayerRuntimeState;
  playerRuntimeActions: PlayerRuntimeActions;
};

function LazyDataRoute({ component: Component, label }: { component: ComponentType<LazyDataRouteProps>; label: string }) {
  const { data, state, playerRuntime, playerRuntimeActions } = useGenesisRouteContext();
  const playerState = useMemo(() => playerRuntimeToDashboardPlayerState(data, playerRuntime), [data, playerRuntime]);

  return (
    <Suspense fallback={<GenesisRouteFallback label={label} />}>
      <Component data={data} runtimeState={state} playerState={playerState} playerRuntime={playerRuntime} playerRuntimeActions={playerRuntimeActions} />
    </Suspense>
  );
}

function DashboardRoute() {
  const { data, state, playerRuntime, playerRuntimeActions, cloudSync, cloudSave, cloudError, runtimeStatus } = useGenesisRouteContext();
  const auth = useNoverisAuth();
  const dashboardPlayerState = useMemo(() => playerRuntimeToDashboardPlayerState(data, playerRuntime), [data, playerRuntime]);
  return (
    <GameShell
      data={data}
      runtimeState={state}
      playerState={dashboardPlayerState}
      playerRuntime={playerRuntime}
      playerRuntimeActions={playerRuntimeActions}
      cloudSync={cloudSync}
      cloudSave={cloudSave}
      cloudError={cloudError}
      runtimeStatus={runtimeStatus}
      settingsAccount={{ status: auth.state.status, email: auth.state.email, displayName: getSupabaseProfileDisplayName(auth.state.user), supabaseStatus: auth.state.cloudAvailable ? "Available" : "Unavailable" }}
      activeScreen="dashboard"
      activeEraId={playerRuntime.civilization.currentEraId}
      activeCategoryId="workforce"
    />
  );
}

export default function App() {
  return (
    <NoverisAuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="welcome" element={<WelcomeRoute />} />
          <Route path="login" element={<LoginRoute />} />
          <Route path="signup" element={<SignupRoute />} />
          <Route path="forgot-password" element={<ForgotPasswordRoute />} />
          <Route path="reset-password" element={<ResetPasswordRoute />} />
          <Route path="save-conflict" element={<SaveConflictRoute />} />
          <Route path="account" element={<AccountRoute />} />
          <Route element={<RuntimeRouteShell />}>
            <Route index element={<DashboardRoute />} />
            <Route path="production" element={<LazyDataRoute component={ProductionRoute} label="Production" />} />
            <Route path="research" element={<LazyDataRoute component={ResearchRoute} label="Research" />} />
            <Route path="resources" element={<LazyDataRoute component={ResourcesRoute} label="Resources" />} />
            <Route path="civilization" element={<LazyDataRoute component={CivilizationRoute} label="Civilization" />} />
            <Route path="earth" element={<LazyDataRoute component={EarthRoute} label="Earth" />} />
            <Route path="solar-system" element={<LazyDataRoute component={SolarSystemRoute} label="Solar System" />} />
            <Route path="discovery" element={<LazyDataRoute component={DiscoveryRoute} label="Discovery" />} />
            <Route path="art-review" element={<LazyDataRoute component={ArtReviewRoute} label="Art Review" />} />
            <Route path="parity-review" element={<LazyDataRoute component={ParityReviewRoute} label="Parity Review" />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </NoverisAuthProvider>
  );
}
