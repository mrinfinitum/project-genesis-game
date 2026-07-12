import { useEffect, useMemo, useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes, useOutletContext } from "react-router-dom";
import {
  ArtReviewGallery,
  GameShell,
  RobloxParityReview,
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

type GenesisOutletContext = {
  data: GameRuntimeData;
  state: RuntimeContentState;
};

const routeScreens: Record<string, { activeScreen: string; activeEraId?: string; activeCategoryId?: string }> = {
  "/": { activeScreen: "dashboard", activeEraId: "survival", activeCategoryId: "workforce" },
  "/production": { activeScreen: "production", activeEraId: "industrial", activeCategoryId: "industry" },
  "/research": { activeScreen: "research", activeEraId: "space-age", activeCategoryId: "science" },
  "/civilization": { activeScreen: "civilization", activeEraId: "modern", activeCategoryId: "workforce" },
  "/earth": { activeScreen: "earth", activeEraId: "survival", activeCategoryId: "industry" },
  "/solar-system": { activeScreen: "solar", activeEraId: "space-age", activeCategoryId: "technology" },
  "/discovery": { activeScreen: "journal", activeEraId: "interstellar", activeCategoryId: "science" }
};

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

  return state;
}

function RuntimeRouteShell() {
  const state = useRuntimeContent();
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

  return <Outlet context={{ data, state } satisfies GenesisOutletContext} />;
}

function useGenesisRouteContext() {
  return useOutletContext<GenesisOutletContext>();
}

function GameRoute({ pathKey }: { pathKey: keyof typeof routeScreens }) {
  const { data } = useGenesisRouteContext();
  const route = routeScreens[pathKey];
  return <GameShell data={data} {...route} />;
}

function ArtReviewRoute() {
  const { data } = useGenesisRouteContext();
  return <ArtReviewGallery data={data} />;
}

function ParityReviewRoute() {
  const { data } = useGenesisRouteContext();
  return <RobloxParityReview data={data} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RuntimeRouteShell />}>
          <Route index element={<GameRoute pathKey="/" />} />
          <Route path="production" element={<GameRoute pathKey="/production" />} />
          <Route path="research" element={<GameRoute pathKey="/research" />} />
          <Route path="civilization" element={<GameRoute pathKey="/civilization" />} />
          <Route path="earth" element={<GameRoute pathKey="/earth" />} />
          <Route path="solar-system" element={<GameRoute pathKey="/solar-system" />} />
          <Route path="discovery" element={<GameRoute pathKey="/discovery" />} />
          <Route path="art-review" element={<ArtReviewRoute />} />
          <Route path="parity-review" element={<ParityReviewRoute />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
