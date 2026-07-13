import { lazy, Suspense, useEffect, useMemo, useState, type ComponentType } from "react";
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

const ProductionRoute = lazy(() => import("@/routes/production-route"));
const ResearchRoute = lazy(() => import("@/routes/research-route"));
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
  refreshCanonicalRuntime: () => Promise<void>;
};

const developerToolsEnabled = import.meta.env.VITE_ENABLE_DEV_TOOLS === "true";

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
    clientProfiles: state.clientProfiles
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

  return { state, refreshCanonicalRuntime };
}

function RuntimeRouteShell() {
  const { state, refreshCanonicalRuntime } = useRuntimeContent();
  const data = useMemo(() => payloadFromState(state), [state]);

  if (state.status === "loading") {
    return (
      <StoryCanvas>
        <div className="flex min-h-screen items-center justify-center text-center">
          <div className="rounded-md border border-cyan-200/25 bg-black/30 px-5 py-4 text-cyan-50">
            <div className="text-xs font-bold uppercase text-cyan-100/60">Project Genesis</div>
            <div className="mt-1 text-xl font-black text-white">Loading runtime content</div>
          </div>
        </div>
      </StoryCanvas>
    );
  }

  return (
    <>
      <Outlet context={{ data, state, refreshCanonicalRuntime } satisfies GenesisOutletContext} />
      {developerToolsEnabled ? (
        <Suspense fallback={null}>
          <RuntimeDiagnostics state={state} onRefresh={refreshCanonicalRuntime} />
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

function LazyDataRoute({ component: Component, label }: { component: ComponentType<{ data: GameRuntimeData; runtimeState: RuntimeContentState }>; label: string }) {
  const { data, state } = useGenesisRouteContext();
  return (
    <Suspense fallback={<GenesisRouteFallback label={label} />}>
      <Component data={data} runtimeState={state} />
    </Suspense>
  );
}

function DashboardRoute() {
  const { data, state } = useGenesisRouteContext();
  return <GameShell data={data} runtimeState={state} activeScreen="dashboard" activeEraId="survival" activeCategoryId="workforce" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RuntimeRouteShell />}>
          <Route index element={<DashboardRoute />} />
          <Route path="production" element={<LazyDataRoute component={ProductionRoute} label="Production" />} />
          <Route path="research" element={<LazyDataRoute component={ResearchRoute} label="Research" />} />
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
  );
}
