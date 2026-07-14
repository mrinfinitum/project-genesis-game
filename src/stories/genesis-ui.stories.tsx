import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { createDashboardArtMap } from "@/lib/canonical-runtime";
import { createDashboardModel, type DashboardPlayerState } from "@/lib/dashboard/dashboard-model";
import { calculateGameViewportScale } from "@/lib/dashboard/viewport-scaling";
import { createNewPlayerRuntimeState } from "@/lib/player-runtime";
import { getPrimaryHudResources } from "@/lib/player-runtime/economy";
import {
  AlignmentPanel,
  ArtReviewGallery,
  AutoClickPanel,
  BeveledActionButton,
  BoostBar,
  BoostsTray,
  ClickPowerPanel,
  CivilizationEraCarousel,
  CriticalStatsPanel,
  EraCard,
  EraProgressRail,
  GameModal,
  GameShell,
  GameToast,
  HeroObjectivePanel,
  LeaderboardPanel,
  ManualProductionPanel,
  ResourceCard,
  ResourceDetail,
  RobloxNavigation,
  RobloxParityReview,
  SidebarNavigation,
  StoryCanvas,
  TopResourceHud,
  UnknownUpgradeCard,
  UpgradeCard,
  UpgradeCategoryTabs,
  type BoostTraySlot
} from "../components/game-ui/genesis-ui";
import { missingArtResource, resourceByCategory, resourceByClass, upgradeFixture, useGenesisStoryContent } from "./storybook-content-provider";

const meta = {
  title: "Project Genesis/Game UI",
  parameters: {
    layout: "fullscreen"
  }
} satisfies Meta;

export default meta;
type Story = StoryObj;

function selectedResource(category: string, fallbackIndex = 0) {
  const { data } = useGenesisStoryContent();
  return resourceByCategory(data, category, fallbackIndex);
}

function economyHudResources(data: ReturnType<typeof useGenesisStoryContent>["data"]) {
  return getPrimaryHudResources(data).map((resource) => ({
    id: resource.id,
    name: resource.label ?? resource.displayName ?? resource.name ?? resource.id,
    displayName: resource.label ?? resource.displayName ?? resource.name ?? resource.id,
    category: "Economy",
    iconKey: resource.iconKey,
    artKey: resource.artKey,
    color: resource.color
  }));
}

function usePanelStoryModel(overrides: Partial<DashboardPlayerState> = {}) {
  const { data } = useGenesisStoryContent();
  const currentEraId = data.eras[0]?.id ?? "survival";
  const playerState: DashboardPlayerState = {
    source: "demo-fixture",
    sourceLabel: "Story Fixture",
    civilizationName: "Genesis",
    currentEraId,
    economyBalances: {},
    economyRates: {},
    resourceInventory: {},
    resourceRates: {},
    upgradeLevels: {},
    clickOutput: {
      resourceId: "ECON-LABOR",
      label: "Labor",
      amount: 1250000000,
      perClickLabel: "Per Click"
    },
    automation: {
      label: "AI Agent",
      amountPerSecond: 25600000,
      enabled: false
    },
    criticalStats: {
      chancePercent: 12.5,
      multiplier: 2.5
    },
    alignment: {
      Industry: 45,
      Technology: 61,
      Cyber: 22,
      Nature: 35,
      Corporate: 18
    },
    ...overrides
  };

  return {
    data,
    art: createDashboardArtMap(data.assets),
    model: createDashboardModel(data, {
      playerState,
      activeEraId: currentEraId,
      activeCategoryId: data.upgradeCategories[0]?.id ?? "workforce"
    })
  };
}

function panelMissingArt(art: ReturnType<typeof createDashboardArtMap>) {
  const warning = ["Story missing art"];

  return {
    ...art,
    dashboard_click_ring: { ...art.dashboard_click_ring, path: undefined, mappingStatus: "missing" as const, warnings: warning },
    dashboard_click_hand: { ...art.dashboard_click_hand, path: undefined, mappingStatus: "missing" as const, warnings: warning },
    dashboard_auto_ring: { ...art.dashboard_auto_ring, path: undefined, mappingStatus: "missing" as const, warnings: warning },
    dashboard_auto_robot: { ...art.dashboard_auto_robot, path: undefined, mappingStatus: "missing" as const, warnings: warning },
    dashboard_click_button: { ...art.dashboard_click_button, path: undefined, mappingStatus: "missing" as const, warnings: warning },
    dashboard_auto_button: { ...art.dashboard_auto_button, path: undefined, mappingStatus: "missing" as const, warnings: warning },
    dashboard_auto_button_on: { ...art.dashboard_auto_button_on, path: undefined, mappingStatus: "missing" as const, warnings: warning },
    dashboard_auto_button_off: { ...art.dashboard_auto_button_off, path: undefined, mappingStatus: "missing" as const, warnings: warning },
    auto_button_off: { ...art.auto_button_off, path: undefined, mappingStatus: "missing" as const, warnings: warning }
  };
}

function ClickPanelStoryFrame({ children }: { children: ReactNode }) {
  return (
    <StoryCanvas>
      <div className="relative h-[320px] w-[350px] overflow-hidden bg-slate-950/80">
        {children}
      </div>
    </StoryCanvas>
  );
}

function AutoPanelStoryFrame({ children, reducedMotion = false }: { children: ReactNode; reducedMotion?: boolean }) {
  return (
    <StoryCanvas>
      {reducedMotion ? <style>{".genesis-control-ring,.genesis-control-ring-reverse{animation:none!important}"}</style> : null}
      <div className="relative h-[270px] w-[350px] overflow-hidden bg-slate-950/80">
        <div className="relative h-[614px] w-[350px] -translate-y-[344px]">
          {children}
        </div>
      </div>
    </StoryCanvas>
  );
}

type FocusedParityRect = {
  label: string;
  rect: { x: number; y: number; width: number; height: number };
};

const focusedParityRects = {
  fullDashboard: { label: "Full Dashboard", rect: { x: 0, y: 0, width: 1920, height: 1080 } },
  topHud: { label: "Top HUD", rect: { x: 0, y: 0, width: 1920, height: 116 } },
  nav: { label: "Left Navigation", rect: { x: 12, y: 126, width: 160, height: 944 } },
  click: { label: "Click Power", rect: { x: 184, y: 126, width: 350, height: 320 } },
  auto: { label: "AI Agent", rect: { x: 184, y: 470, width: 350, height: 270 } },
  critical: { label: "Critical Stats", rect: { x: 184, y: 764, width: 350, height: 185 } },
  leftColumn: { label: "Complete Left Column", rect: { x: 12, y: 126, width: 522, height: 944 } },
  heroObjective: { label: "Hero + Objective", rect: { x: 572, y: 139, width: 910, height: 510 } },
  upgrades: { label: "Upgrades", rect: { x: 572, y: 658, width: 910, height: 407 } },
  rightColumn: { label: "Right Column", rect: { x: 1514, y: 139, width: 425, height: 927 } },
  boosts: { label: "Boosts Drawer", rect: { x: 0, y: 850, width: 1920, height: 230 } }
} satisfies Record<string, FocusedParityRect>;

function FocusedParityCrop({
  data,
  focus,
  mode,
  opacity = 0.5
}: {
  data: ReturnType<typeof useGenesisStoryContent>["data"];
  focus: FocusedParityRect;
  mode: "reference" | "implementation" | "overlay" | "guides";
  opacity?: number;
}) {
  const scale = focus.rect.width > 500 ? 0.56 : 0.72;
  const cropStyle = { width: focus.rect.width * scale, height: focus.rect.height * scale };
  const stageStyle = { width: 1920 * scale, height: 1080 * scale, left: -focus.rect.x * scale, top: -focus.rect.y * scale };
  const reference = <img src="/design-reference/roblox/dashboard/dashboard-main-1920.png" alt="" className="absolute left-0 top-0 object-fill" style={{ width: 1920 * scale, height: 1080 * scale }} />;
  const implementation = (
    <div className="absolute left-0 top-0" style={{ width: 1920 * scale, height: 1080 * scale }}>
      <GameShell data={data} activeScreen="dashboard" activeEraId="survival" activeCategoryId="workforce" embedded frameScale={scale} />
    </div>
  );

  return (
    <div>
      <div className="mb-2 text-[11px] font-black uppercase text-cyan-100/65">{focus.label} · {mode}</div>
      <div className="relative overflow-hidden border border-cyan-200/18 bg-slate-950" style={cropStyle}>
        <div className="absolute" style={stageStyle}>
          {mode === "reference" ? reference : null}
          {mode === "implementation" ? implementation : null}
          {mode === "overlay" ? (
            <>
              {reference}
              <div className="absolute left-0 top-0" style={{ opacity }}>{implementation}</div>
            </>
          ) : null}
          {mode === "guides" ? (
            <>
              {reference}
              <div className="absolute left-0 top-0" style={{ opacity }}>{implementation}</div>
            </>
          ) : null}
        </div>
        {mode === "guides" ? (
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute inset-0 border border-emerald-300/70" />
            <div className="absolute left-1/2 top-0 h-full w-px bg-cyan-200/45" />
            <div className="absolute left-0 top-1/2 h-px w-full bg-cyan-200/45" />
          </div>
        ) : null}
      </div>
    </div>
  );
}

function FocusedParityReview({ focus }: { focus: FocusedParityRect }) {
  const { data } = useGenesisStoryContent();
  return (
    <StoryCanvas>
      <div className="grid gap-4 bg-slate-950 p-4 text-white xl:grid-cols-4">
        {(["reference", "implementation", "overlay", "guides"] as const).map((mode) => (
          <FocusedParityCrop key={mode} data={data} focus={focus} mode={mode} />
        ))}
      </div>
    </StoryCanvas>
  );
}

function ActionButtonStoryFrame({ children }: { children: ReactNode }) {
  return (
    <StoryCanvas>
      <div className="flex h-[150px] w-[420px] items-center justify-center rounded-md border border-cyan-200/12 bg-slate-950/86 p-8">
        <div className="relative h-[70px] w-[330px]">
          {children}
        </div>
      </div>
    </StoryCanvas>
  );
}

function RobloxNavStoryFrame({ children }: { children: ReactNode }) {
  return (
    <StoryCanvas>
      <div className="relative h-[944px] w-[160px] overflow-hidden bg-slate-950">
        {children}
      </div>
    </StoryCanvas>
  );
}

const boostFixtureSlots: BoostTraySlot[] = [
  {
    id: "story-manual-boost",
    name: "Manual Boost",
    shortEffect: "2x clicks for 30s",
    multiplier: "x2",
    duration: "00:30",
    cost: "25 Energy",
    state: "available",
    accent: "gold",
    targetSystem: "click"
  },
  {
    id: "story-work-frenzy",
    name: "Work Frenzy",
    shortEffect: "2x production loop",
    multiplier: "WK",
    duration: "00:30",
    cost: "Studio pending",
    state: "available",
    accent: "cyan",
    targetSystem: "auto"
  },
  {
    id: "story-innovation",
    name: "Innovation Surge",
    shortEffect: "10x research output",
    multiplier: "IN",
    duration: "01:00",
    cost: "Locked",
    state: "locked",
    accent: "purple",
    targetSystem: "research"
  },
  {
    id: "story-colony",
    name: "Colony Countdown",
    shortEffect: "50x colonization progress",
    multiplier: "CS",
    remainingTime: "00:18",
    cost: "Cooldown",
    state: "cooldown",
    accent: "green",
    targetSystem: "colony"
  }
];

function BoostTrayStoryFrame({
  children,
  compact = false,
  launcherHidden = false,
  scaleOverride
}: {
  children: ReactNode;
  compact?: boolean;
  launcherHidden?: boolean;
  scaleOverride?: number;
}) {
  const scale = scaleOverride ?? (compact ? 0.52 : 0.72);
  return (
    <StoryCanvas>
      <div className="w-full overflow-hidden bg-slate-950 p-4">
        <div className="relative overflow-hidden" style={{ width: 1920 * scale, height: 1080 * scale }}>
          <div
            className="relative overflow-hidden border border-cyan-200/20 bg-[#06111f]"
            style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(45,212,255,0.12),transparent_34rem),linear-gradient(145deg,#030713_0%,#071225_52%,#050816_100%)]" />
            <button className={`absolute left-[866px] top-[1010px] h-[58px] w-[230px] rounded-md border border-cyan-100/30 bg-black/50 text-xl font-black uppercase text-white transition duration-[220ms] ${launcherHidden ? "pointer-events-none opacity-0" : ""}`} type="button" aria-hidden={launcherHidden}>
              Boosts <span className="text-cyan-100">0</span>
            </button>
            {children}
          </div>
        </div>
      </div>
    </StoryCanvas>
  );
}

function CarouselStoryFrame({ children, reducedMotion = false }: { children: ReactNode; reducedMotion?: boolean }) {
  return (
    <StoryCanvas>
      {reducedMotion ? <style>{".genesis-era-current-card,.genesis-era-sweep{animation:none!important;transition:none!important}"}</style> : null}
      <div className="relative h-[190px] w-[910px] overflow-hidden rounded-md border border-cyan-200/20 bg-[linear-gradient(180deg,#10223b,#030713)]">
        <div className="relative h-[510px] w-[910px] -translate-y-[320px]">
          {children}
        </div>
      </div>
    </StoryCanvas>
  );
}

function carouselArt(data: ReturnType<typeof useGenesisStoryContent>["data"], missingArtwork = false) {
  const art = createDashboardArtMap(data.assets);
  if (!missingArtwork) return art;
  return {
    ...art,
    era_progression_hex: { ...art.era_progression_hex, path: undefined, mappingStatus: "missing" as const, warnings: ["Story missing art"] }
  };
}

export const TopResourceHudStartingState: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <TopResourceHud resources={economyHudResources(data)} assets={data.assets} />
      </StoryCanvas>
    );
  }
};

export const TopResourceHudHighValues: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <TopResourceHud resources={economyHudResources(data)} assets={data.assets} highValues />
      </StoryCanvas>
    );
  }
};

export const TopResourceHudGainingResources: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <TopResourceHud resources={economyHudResources(data)} assets={data.assets} gaining />
      </StoryCanvas>
    );
  }
};

export const TopResourceHudMissingIcon: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    const resources = economyHudResources(data).map((resource, index) => index === 0 ? { ...resource, iconKey: "missing-icon-key" } : resource);
    return (
      <StoryCanvas>
        <TopResourceHud resources={resources} assets={[]} />
      </StoryCanvas>
    );
  }
};

export const TopResourceHudCompactViewport: Story = {
  parameters: {
    viewport: { defaultViewport: "tablet768" }
  },
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <TopResourceHud resources={economyHudResources(data)} assets={data.assets} compact />
      </StoryCanvas>
    );
  }
};

export const UpgradeCardAvailable: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <UpgradeCard upgrade={upgradeFixture(data, 0)} assets={data.assets} state="available" level={1} />
      </StoryCanvas>
    );
  }
};

export const UpgradeCardAffordable: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <UpgradeCard upgrade={upgradeFixture(data, 1)} assets={data.assets} state="affordable" level={2} />
      </StoryCanvas>
    );
  }
};

export const UpgradeCardUnaffordable: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <UpgradeCard upgrade={upgradeFixture(data, 2)} assets={data.assets} state="unaffordable" />
      </StoryCanvas>
    );
  }
};

export const UpgradeCardLockedDiscovered: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <UpgradeCard upgrade={upgradeFixture(data, 3)} assets={data.assets} state="locked" />
      </StoryCanvas>
    );
  }
};

export const UpgradeCardUnknown: Story = {
  render: () => (
    <StoryCanvas>
      <UnknownUpgradeCard />
    </StoryCanvas>
  )
};

export const UpgradeCardMaxLevel: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    const upgrade = upgradeFixture(data, 4);
    return (
      <StoryCanvas>
        <UpgradeCard upgrade={upgrade} assets={data.assets} state="max" level={upgrade.maxLevel} />
      </StoryCanvas>
    );
  }
};

export const UpgradeCardMissingArtwork: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    const upgrade = { ...upgradeFixture(data, 5), iconKey: "missing-upgrade-art" };
    return (
      <StoryCanvas>
        <UpgradeCard upgrade={upgrade} assets={[]} state="available" />
      </StoryCanvas>
    );
  }
};

export const UpgradeCardLongName: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <UpgradeCard upgrade={upgradeFixture(data, 6)} assets={data.assets} state="available" longName />
      </StoryCanvas>
    );
  }
};

export const UpgradeCardHighLevelValues: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <UpgradeCard upgrade={{ ...upgradeFixture(data, 7), baseCost: 982500000 }} assets={data.assets} state="affordable" level={98} />
      </StoryCanvas>
    );
  }
};

export const EraProgressRailSurvivalActive: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <EraProgressRail eras={data.eras} activeEraId="survival" lockedFromIndex={6} />
      </StoryCanvas>
    );
  }
};

export const EraProgressRailIndustrialActive: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <EraProgressRail eras={data.eras} activeEraId="industrial" lockedFromIndex={6} />
      </StoryCanvas>
    );
  }
};

export const EraProgressRailSpaceAgeActive: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <EraProgressRail eras={data.eras} activeEraId="space-age" lockedFromIndex={6} />
      </StoryCanvas>
    );
  }
};

export const EraProgressRailInterstellarLocked: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <EraProgressRail eras={data.eras} activeEraId="space-age" lockedFromIndex={6} />
      </StoryCanvas>
    );
  }
};

export const EraProgressRailGalacticLocked: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <EraProgressRail eras={data.eras} activeEraId="interstellar" lockedFromIndex={7} />
      </StoryCanvas>
    );
  }
};

export const EraCarouselSurvival: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <CarouselStoryFrame>
        <CivilizationEraCarousel eras={data.eras} activeEraId="survival" assets={data.assets} art={carouselArt(data)} visibleEraCount={data.clientProfiles.default.eraNavigation?.visibleEraCount ?? 3} progressPercent={14} />
      </CarouselStoryFrame>
    );
  }
};

export const EraPreviewSurvivalDefault: Story = {
  render: EraCarouselSurvival.render
};

export const EraCarouselMiddleEra: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <CarouselStoryFrame>
        <CivilizationEraCarousel eras={data.eras} activeEraId="industrial" assets={data.assets} art={carouselArt(data)} visibleEraCount={data.clientProfiles.default.eraNavigation?.visibleEraCount ?? 3} progressPercent={42} />
      </CarouselStoryFrame>
    );
  }
};

export const EraPreviewMiddleEraDefault: Story = {
  render: EraCarouselMiddleEra.render
};

export const EraCarouselRenaissance: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <CarouselStoryFrame>
        <CivilizationEraCarousel eras={data.eras} activeEraId="renaissance" assets={data.assets} art={carouselArt(data)} visibleEraCount={data.clientProfiles.default.eraNavigation?.visibleEraCount ?? 3} progressPercent={67} />
      </CarouselStoryFrame>
    );
  }
};

export const EraCarouselGalactic: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <CarouselStoryFrame>
        <CivilizationEraCarousel eras={data.eras} activeEraId="galactic" assets={data.assets} art={carouselArt(data)} visibleEraCount={data.clientProfiles.default.eraNavigation?.visibleEraCount ?? 3} progressPercent={100} />
      </CarouselStoryFrame>
    );
  }
};

export const EraPreviewGalacticDefault: Story = {
  render: EraCarouselGalactic.render
};

export const EraCarouselPreviewPrevious: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <CarouselStoryFrame>
        <CivilizationEraCarousel eras={data.eras} activeEraId="renaissance" assets={data.assets} art={carouselArt(data)} visibleEraCount={data.clientProfiles.default.eraNavigation?.visibleEraCount ?? 3} progressPercent={52} initialPreviewEraId="medieval" />
      </CarouselStoryFrame>
    );
  }
};

export const EraPreviewPrevious: Story = {
  render: EraCarouselPreviewPrevious.render
};

export const EraCarouselPreviewNext: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <CarouselStoryFrame>
        <CivilizationEraCarousel eras={data.eras} activeEraId="renaissance" assets={data.assets} art={carouselArt(data)} visibleEraCount={data.clientProfiles.default.eraNavigation?.visibleEraCount ?? 3} progressPercent={52} initialPreviewEraId="industrial" />
      </CarouselStoryFrame>
    );
  }
};

export const EraPreviewNext: Story = {
  render: EraCarouselPreviewNext.render
};

export const EraPreviewLockedNextEra: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <CarouselStoryFrame>
        <CivilizationEraCarousel eras={data.eras} activeEraId="modern" assets={data.assets} art={carouselArt(data)} visibleEraCount={data.clientProfiles.default.eraNavigation?.visibleEraCount ?? 3} progressPercent={33} />
      </CarouselStoryFrame>
    );
  }
};

export const EraCarouselReducedMotion: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <CarouselStoryFrame reducedMotion>
        <CivilizationEraCarousel eras={data.eras} activeEraId="modern" assets={data.assets} art={carouselArt(data)} visibleEraCount={data.clientProfiles.default.eraNavigation?.visibleEraCount ?? 3} progressPercent={33} reducedMotion />
      </CarouselStoryFrame>
    );
  }
};

export const EraPreviewReducedMotion: Story = {
  render: EraCarouselReducedMotion.render
};

export const EraPreviewCompactViewport: Story = {
  parameters: {
    viewport: { defaultViewport: "tablet768" }
  },
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <CarouselStoryFrame>
        <CivilizationEraCarousel eras={data.eras} activeEraId="renaissance" assets={data.assets} art={carouselArt(data)} visibleEraCount={2} progressPercent={48} />
      </CarouselStoryFrame>
    );
  }
};

export const EraCarouselMissingArtworkFallback: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <CarouselStoryFrame>
        <CivilizationEraCarousel eras={data.eras} activeEraId="space-age" assets={[]} art={carouselArt(data, true)} visibleEraCount={data.clientProfiles.default.eraNavigation?.visibleEraCount ?? 3} progressPercent={21} />
      </CarouselStoryFrame>
    );
  }
};

export const AlignmentPanelBalanced: Story = {
  render: () => (
    <StoryCanvas>
      <AlignmentPanel dominant="Balanced" />
    </StoryCanvas>
  )
};

export const AlignmentPanelIndustryDominant: Story = {
  render: () => (
    <StoryCanvas>
      <AlignmentPanel dominant="Industry" />
    </StoryCanvas>
  )
};

export const AlignmentPanelTechnologyDominant: Story = {
  render: () => (
    <StoryCanvas>
      <AlignmentPanel dominant="Technology" />
    </StoryCanvas>
  )
};

export const AlignmentPanelCyberDominant: Story = {
  render: () => (
    <StoryCanvas>
      <AlignmentPanel dominant="Cyber" />
    </StoryCanvas>
  )
};

export const AlignmentPanelNatureDominant: Story = {
  render: () => (
    <StoryCanvas>
      <AlignmentPanel dominant="Nature" />
    </StoryCanvas>
  )
};

export const AlignmentPanelCorporateDominant: Story = {
  render: () => (
    <StoryCanvas>
      <AlignmentPanel dominant="Corporate" />
    </StoryCanvas>
  )
};

export const ResourceCardElement: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <ResourceCard resource={selectedResource("Element", 20)} assets={data.assets} />
      </StoryCanvas>
    );
  }
};

export const ResourceCardCompound: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <ResourceCard resource={resourceByClass(data, "Compound", 1)} assets={data.assets} />
      </StoryCanvas>
    );
  }
};

export const ResourceCardMineral: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <ResourceCard resource={selectedResource("Mineral", 0)} assets={data.assets} />
      </StoryCanvas>
    );
  }
};

export const ResourceCardAlloy: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <ResourceCard resource={selectedResource("Synthetic Metal", 80)} assets={data.assets} />
      </StoryCanvas>
    );
  }
};

export const ResourceCardBiological: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <ResourceCard resource={selectedResource("Biological", 60)} assets={data.assets} />
      </StoryCanvas>
    );
  }
};

export const ResourceCardManufactured: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <ResourceCard resource={selectedResource("Synthetic", 90)} assets={data.assets} />
      </StoryCanvas>
    );
  }
};

export const ResourceCardSpeculative: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <ResourceCard resource={selectedResource("Cosmic", 120)} assets={data.assets} />
      </StoryCanvas>
    );
  }
};

export const ResourceCardMissingArt: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <ResourceCard resource={missingArtResource(data)} assets={data.assets} missingArt />
      </StoryCanvas>
    );
  }
};

export const ResourceDetailView: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <ResourceDetail resource={data.resources[0]} assets={data.assets} />
      </StoryCanvas>
    );
  }
};

export const ClickPowerDefault: Story = {
  render: () => {
    const { data, model, art } = usePanelStoryModel();
    return <ClickPanelStoryFrame><ClickPowerPanel data={data} model={model} art={art} /></ClickPanelStoryFrame>;
  }
};

export const ClickPowerHighValue: Story = {
  render: () => {
    const { data, model, art } = usePanelStoryModel({
      clickOutput: {
        resourceId: "ECON-LABOR",
        label: "Labor",
        amount: 987500000000,
        perClickLabel: "Per Click"
      }
    });
    return <ClickPanelStoryFrame><ClickPowerPanel data={data} model={model} art={art} /></ClickPanelStoryFrame>;
  }
};

export const ClickPowerClickedPressed: Story = {
  render: () => {
    const { data, model, art } = usePanelStoryModel();
    return <ClickPanelStoryFrame><ClickPowerPanel data={data} model={model} art={art} pressed pulseKey={1} /></ClickPanelStoryFrame>;
  }
};

export const ClickPowerCriticalPulse: Story = {
  render: () => {
    const { data, model, art } = usePanelStoryModel({
      clickOutput: {
        resourceId: "ECON-LABOR",
        label: "Labor",
        amount: 2500000000,
        perClickLabel: "Critical Click"
      }
    });
    return <ClickPanelStoryFrame><ClickPowerPanel data={data} model={model} art={art} pressed pulseKey={2} /></ClickPanelStoryFrame>;
  }
};

export const ClickPowerMissingArt: Story = {
  render: () => {
    const { data, model, art } = usePanelStoryModel();
    return <ClickPanelStoryFrame><ClickPowerPanel data={data} model={model} art={panelMissingArt(art)} /></ClickPanelStoryFrame>;
  }
};

export const ClickPowerMissingPlayerState: Story = {
  render: () => {
    const { data, model, art } = usePanelStoryModel({ clickOutput: undefined });
    return <ClickPanelStoryFrame><ClickPowerPanel data={data} model={model} art={art} /></ClickPanelStoryFrame>;
  }
};

export const AiAgentPanelOffline: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel();
    return <AutoPanelStoryFrame><AutoClickPanel model={model} art={art} /></AutoPanelStoryFrame>;
  }
};

export const AiAgentPanelOnline: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel({
      automation: {
        label: "AI Agent",
        amountPerSecond: 25600000,
        enabled: true
      }
    });
    return <AutoPanelStoryFrame><AutoClickPanel model={model} art={art} /></AutoPanelStoryFrame>;
  }
};

export const AiAgentPanelHighAssistance: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel({
      automation: {
        label: "AI Agent",
        amountPerSecond: 785000000000,
        enabled: true
      }
    });
    return <AutoPanelStoryFrame><AutoClickPanel model={model} art={art} /></AutoPanelStoryFrame>;
  }
};

export const AiAgentPanelMissingArt: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel({
      automation: {
        label: "AI Agent",
        amountPerSecond: 25600000,
        enabled: true
      }
    });
    return <AutoPanelStoryFrame><AutoClickPanel model={model} art={panelMissingArt(art)} /></AutoPanelStoryFrame>;
  }
};

export const AiAgentPanelMissingPlayerState: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel({ automation: undefined });
    return <AutoPanelStoryFrame><AutoClickPanel model={model} art={art} /></AutoPanelStoryFrame>;
  }
};

export const AiAgentPanelReducedMotion: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel({
      automation: {
        label: "AI Agent",
        amountPerSecond: 25600000,
        enabled: true
      }
    });
    return <AutoPanelStoryFrame reducedMotion><AutoClickPanel model={model} art={art} /></AutoPanelStoryFrame>;
  }
};

export const FocusedParityLeftNavigation: Story = {
  render: () => <FocusedParityReview focus={focusedParityRects.nav} />
};

export const FocusedParityClickPowerPanel: Story = {
  render: () => <FocusedParityReview focus={focusedParityRects.click} />
};

export const FocusedParityAiAgentPanel: Story = {
  render: () => <FocusedParityReview focus={focusedParityRects.auto} />
};

export const FocusedParityCriticalStatsPanel: Story = {
  render: () => <FocusedParityReview focus={focusedParityRects.critical} />
};

export const FocusedParityCompleteLeftColumn: Story = {
  render: () => <FocusedParityReview focus={focusedParityRects.leftColumn} />
};

export const FocusedParityFullDashboard: Story = {
  render: () => <FocusedParityReview focus={focusedParityRects.fullDashboard} />
};

export const FocusedParityTopHud: Story = {
  render: () => <FocusedParityReview focus={focusedParityRects.topHud} />
};

export const FocusedParityHeroObjective: Story = {
  render: () => <FocusedParityReview focus={focusedParityRects.heroObjective} />
};

export const FocusedParityUpgrades: Story = {
  render: () => <FocusedParityReview focus={focusedParityRects.upgrades} />
};

export const FocusedParityRightColumn: Story = {
  render: () => <FocusedParityReview focus={focusedParityRects.rightColumn} />
};

export const FocusedParityBoosts: Story = {
  render: () => <FocusedParityReview focus={focusedParityRects.boosts} />
};

export const RobloxNavigationOverviewActiveNoGlow: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return <RobloxNavStoryFrame><RobloxNavigation active="dashboard" art={createDashboardArtMap(data.assets)} /></RobloxNavStoryFrame>;
  }
};

export const RobloxNavigationResearchActive: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return <RobloxNavStoryFrame><RobloxNavigation active="research" art={createDashboardArtMap(data.assets)} /></RobloxNavStoryFrame>;
  }
};

export const RobloxNavigationKeyboardFocus: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <RobloxNavStoryFrame>
        <style>{".storybook-nav-focus button:first-of-type{outline:1px solid rgba(207,250,254,.48);outline-offset:-3px}"}</style>
        <div className="storybook-nav-focus">
          <RobloxNavigation active="dashboard" art={createDashboardArtMap(data.assets)} />
        </div>
      </RobloxNavStoryFrame>
    );
  }
};

export const ClickButtonImageDefault: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return <ActionButtonStoryFrame><BeveledActionButton art={art.dashboard_click_button} label="CLICK!" tone="cyan" className="absolute left-[9px] top-[2px] h-[66px] w-[312px]" /></ActionButtonStoryFrame>;
  }
};

export const ClickButtonImageHover: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return (
      <ActionButtonStoryFrame>
        <div className="brightness-110">
          <BeveledActionButton art={art.dashboard_click_button} label="CLICK!" tone="cyan" className="absolute left-[9px] top-[2px] h-[66px] w-[312px]" />
        </div>
      </ActionButtonStoryFrame>
    );
  }
};

export const ClickButtonImagePressed: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return <ActionButtonStoryFrame><BeveledActionButton art={art.dashboard_click_button} label="CLICK!" tone="cyan" pressed className="absolute left-[9px] top-[2px] h-[66px] w-[312px]" /></ActionButtonStoryFrame>;
  }
};

export const ClickButtonImageDisabled: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return <ActionButtonStoryFrame><BeveledActionButton art={art.dashboard_click_button} label="CLICK!" tone="cyan" disabled className="absolute left-[9px] top-[2px] h-[66px] w-[312px]" /></ActionButtonStoryFrame>;
  }
};

export const AgentButtonImageOnline: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return <ActionButtonStoryFrame><BeveledActionButton art={art.dashboard_auto_button_on} label="AGENT: ONLINE" tone="green" active className="absolute left-[9px] top-[7px] h-[55px] w-[312px]" /></ActionButtonStoryFrame>;
  }
};

export const AgentButtonImageOffline: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return <ActionButtonStoryFrame><BeveledActionButton art={art.dashboard_auto_button_off} label="AGENT: OFFLINE" tone="muted" className="absolute left-[9px] top-[7px] h-[55px] w-[312px]" /></ActionButtonStoryFrame>;
  }
};

export const AgentButtonImageHover: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return (
      <ActionButtonStoryFrame>
        <div className="brightness-110">
          <BeveledActionButton art={art.dashboard_auto_button_on} label="AGENT: ONLINE" tone="green" active className="absolute left-[9px] top-[7px] h-[55px] w-[312px]" />
        </div>
      </ActionButtonStoryFrame>
    );
  }
};

export const AgentButtonImagePressed: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return <ActionButtonStoryFrame><BeveledActionButton art={art.dashboard_auto_button_on} label="AGENT: ONLINE" tone="green" pressed className="absolute left-[9px] top-[7px] h-[55px] w-[312px]" /></ActionButtonStoryFrame>;
  }
};

export const AgentButtonImageDisabled: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return <ActionButtonStoryFrame><BeveledActionButton art={art.dashboard_auto_button_off} label="AGENT: OFFLINE" tone="muted" disabled className="absolute left-[9px] top-[7px] h-[55px] w-[312px]" /></ActionButtonStoryFrame>;
  }
};

export const ClickAndAiAgentStackedRobloxReference: Story = {
  render: () => {
    const { data, model, art } = usePanelStoryModel({
      automation: {
        label: "AI Agent",
        amountPerSecond: 25600000,
        enabled: true
      }
    });
    return (
      <StoryCanvas>
        <div className="relative h-[614px] w-[350px] overflow-hidden bg-slate-950/80">
          <ClickPowerPanel data={data} model={model} art={art} />
          <AutoClickPanel model={model} art={art} />
        </div>
      </StoryCanvas>
    );
  }
};

export const MainDashboard: Story = {
  render: () => {
    const { data, selectedEra, selectedCategory } = useGenesisStoryContent();
    return <GameShell data={data} activeScreen="dashboard" activeEraId={selectedEra.id} activeCategoryId={selectedCategory.id} />;
  }
};

function topHudStoryPlayerState(overrides: Partial<DashboardPlayerState> = {}): DashboardPlayerState {
  return {
    source: "player-runtime",
    sourceLabel: "Top HUD Story",
    currentEraId: "survival",
    civilizationName: "Genesis",
    economyBalances: {
      "ECON-LABOR": 0,
      "ECON-CREDITS": 0,
      "ECON-POPULATION": 5,
      "ECON-RESEARCH": 0,
      "ECON-PREMIUM-CRYSTALS": 0
    },
    economyRates: {
      "ECON-LABOR": 1,
      "ECON-CREDITS": 0,
      "ECON-POPULATION": 0,
      "ECON-RESEARCH": 0,
      "ECON-PREMIUM-CRYSTALS": 0
    },
    resourceInventory: {},
    resourceRates: {},
    upgradeLevels: {},
    ...overrides
  };
}

function DashboardViewportStory({ width, height, playerState, missingIcon = false, calibration = false, referenceOverlay = false }: { width: number; height: number; playerState?: DashboardPlayerState; missingIcon?: boolean; calibration?: boolean; referenceOverlay?: boolean }) {
  const { data } = useGenesisStoryContent();
  const storyData = missingIcon
    ? {
        ...data,
        assets: data.assets.filter((asset) => !["credits_icon", "population_icon", "research_icon", "civilization_points_icon"].includes(asset.artKey))
      }
    : data;
  const scale = calculateGameViewportScale({ viewportWidth: width, viewportHeight: height }).scale;
  return (
    <StoryCanvas>
      <div className="h-[calc(100dvh-2rem)] w-full overflow-auto bg-slate-950 p-4">
        <div className="mb-3 inline-flex rounded-sm border border-cyan-200/20 bg-black/35 px-3 py-2 text-xs font-black uppercase text-cyan-50">
          {width} x {height} · scale {scale.toFixed(3)}
        </div>
        <div className="relative" style={{ width: 1920 * scale, height: 1080 * scale }}>
          <GameShell data={storyData} playerState={playerState} activeScreen="dashboard" activeEraId="survival" activeCategoryId="workforce" frameScale={scale} embedded initialTopHudCalibrationOpen={calibration} />
          {referenceOverlay ? <img src="/design-reference/roblox/dashboard/dashboard-main-1920.png" alt="" className="pointer-events-none absolute inset-0 opacity-50 mix-blend-screen" style={{ width: 1920 * scale, height: 1080 * scale }} /> : null}
        </div>
      </div>
    </StoryCanvas>
  );
}

function MobilePlatformStory({
  width,
  height,
  platform = "ios",
  portrait = false
}: {
  width: number;
  height: number;
  platform?: "ios" | "android";
  portrait?: boolean;
}) {
  const { data } = useGenesisStoryContent();
  const scale = calculateGameViewportScale({ viewportWidth: width, viewportHeight: height, minScale: 0.28 }).scale;
  const playerRuntime = createNewPlayerRuntimeState(data);
  return (
    <StoryCanvas>
      <div className="min-h-screen w-full overflow-auto bg-slate-950 p-4 text-cyan-50">
        <div className="mb-3 flex flex-wrap gap-2 text-xs font-black uppercase">
          <span className="rounded-sm border border-cyan-200/20 bg-black/35 px-3 py-2">{platform}</span>
          <span className="rounded-sm border border-cyan-200/20 bg-black/35 px-3 py-2">{width} x {height}</span>
          <span className="rounded-sm border border-cyan-200/20 bg-black/35 px-3 py-2">scale {scale.toFixed(3)}</span>
        </div>
        <div className="relative overflow-hidden rounded-sm border border-cyan-200/20" style={{ width, height }}>
          <GameShell
            data={data}
            playerRuntime={playerRuntime}
            playerState={topHudStoryPlayerState()}
            activeScreen="dashboard"
            activeEraId="survival"
            activeCategoryId="workforce"
            frameScale={portrait ? undefined : scale}
            embedded={!portrait}
            platform={platform}
            profileViewport={{ width, height }}
          />
        </div>
      </div>
    </StoryCanvas>
  );
}

export const DashboardViewport1366x768: Story = {
  render: () => <DashboardViewportStory width={1366} height={768} />
};

export const DashboardViewport1440x900: Story = {
  render: () => <DashboardViewportStory width={1440} height={900} />
};

export const DashboardViewport1920x1080: Story = {
  render: () => <DashboardViewportStory width={1920} height={1080} />
};

export const DashboardViewport2560x1440: Story = {
  render: () => <DashboardViewportStory width={2560} height={1440} />
};

export const DashboardViewport3440x1440: Story = {
  render: () => <DashboardViewportStory width={3440} height={1440} />
};

export const DashboardViewport3840x2160: Story = {
  render: () => <DashboardViewportStory width={3840} height={2160} />
};

export const DashboardTopHudCanonicalNewGame1920: Story = {
  render: () => <DashboardViewportStory width={1920} height={1080} playerState={topHudStoryPlayerState()} />
};

export const DashboardTopHudLargeValues1920: Story = {
  render: () => (
    <DashboardViewportStory
      width={1920}
      height={1080}
      playerState={topHudStoryPlayerState({
        economyBalances: {
          "ECON-LABOR": 5392.3,
          "ECON-CREDITS": 13110,
          "ECON-POPULATION": 125,
          "ECON-RESEARCH": 1840000,
          "ECON-PREMIUM-CRYSTALS": 42
        }
      })}
    />
  )
};

export const DashboardTopHudMaximumCompactValues1920: Story = {
  render: () => (
    <DashboardViewportStory
      width={1920}
      height={1080}
      playerState={topHudStoryPlayerState({
        economyBalances: {
          "ECON-LABOR": 999_999_999,
          "ECON-CREDITS": 999_999_999,
          "ECON-POPULATION": 999_999,
          "ECON-RESEARCH": 999_999_999,
          "ECON-PREMIUM-CRYSTALS": 999_999
        },
        economyRates: {
          "ECON-LABOR": 999_999,
          "ECON-CREDITS": 999_999,
          "ECON-POPULATION": 999_999,
          "ECON-RESEARCH": 999_999,
          "ECON-PREMIUM-CRYSTALS": 999_999
        }
      })}
    />
  )
};

export const DashboardTopHudLongCivilizationName1920: Story = {
  render: () => <DashboardViewportStory width={1920} height={1080} playerState={topHudStoryPlayerState({ civilizationName: "The Really Long Civilization Name" })} />
};

export const DashboardTopHudCalibrationGuides1920: Story = {
  render: () => <DashboardViewportStory width={1920} height={1080} playerState={topHudStoryPlayerState()} calibration />
};

export const DashboardTopHudRobloxReferenceOverlay1920: Story = {
  render: () => <DashboardViewportStory width={1920} height={1080} playerState={topHudStoryPlayerState()} calibration referenceOverlay />
};

export const DashboardTopHudMissingIconFallback1920: Story = {
  render: () => <DashboardViewportStory width={1920} height={1080} playerState={topHudStoryPlayerState()} missingIcon />
};

export const DashboardTopHudCanonical2560: Story = {
  render: () => <DashboardViewportStory width={2560} height={1440} playerState={topHudStoryPlayerState()} />
};

export const DashboardTopHudCanonical3840: Story = {
  render: () => <DashboardViewportStory width={3840} height={2160} playerState={topHudStoryPlayerState()} />
};

export const MobilePhoneLandscape: Story = {
  render: () => <MobilePlatformStory width={852} height={393} platform="ios" />
};

export const MobileTabletLandscape: Story = {
  render: () => <MobilePlatformStory width={1180} height={820} platform="android" />
};

export const MobileSafeAreas: Story = {
  render: () => <MobilePlatformStory width={932} height={430} platform="ios" />
};

export const MobileLandscapeGameplay: Story = {
  render: () => <MobilePlatformStory width={812} height={375} platform="ios" />
};

export const MobilePortraitWarning: Story = {
  render: () => <MobilePlatformStory width={393} height={852} platform="ios" portrait />
};

export const MobileTouchTargets: Story = {
  render: () => <MobilePlatformStory width={736} height={360} platform="android" />
};

function SettingsStory({ variant }: { variant: "guest" | "authenticated" | "pending" | "offline" | "conflict" }) {
  const { data } = useGenesisStoryContent();
  const runtime = createNewPlayerRuntimeState(data);
  const playerRuntime = {
    ...runtime,
    revision: variant === "guest" ? 1 : 8,
    economy: {
      ...runtime.economy,
      balances: {
        ...runtime.economy.balances,
        "ECON-LABOR": variant === "guest" ? 0 : 220,
        "ECON-CREDITS": variant === "guest" ? 0 : 45
      }
    }
  };
  const cloudSync = {
    activeSaveSource: variant === "guest" ? "new_game" as const : variant === "conflict" ? "local_selected_after_conflict" as const : "cloud" as const,
    status: variant === "offline" ? "Offline" as const : variant === "conflict" ? "Conflict" as const : variant === "pending" ? "Pending Sync" as const : variant === "guest" ? "Local Only" as const : "Synced" as const,
    dirty: variant === "pending" || variant === "conflict",
    pendingRetry: variant === "pending",
    offlineProgressionApplyCount: 1,
    cloudRevision: variant === "guest" ? undefined : 8,
    lastSyncedRevision: variant === "guest" ? undefined : 8,
    lastSuccessfulSyncAt: variant === "guest" ? undefined : "2026-07-14T12:00:00.000Z",
    deviceName: "Story Browser",
    lastCloudError: variant === "offline" ? "Cloud service unavailable." : variant === "conflict" ? "Revision conflict" : undefined
  };
  return (
    <GameShell
      data={data}
      playerState={topHudStoryPlayerState({ economyBalances: playerRuntime.economy.balances })}
      playerRuntime={playerRuntime}
      cloudSync={cloudSync}
      cloudSave={variant === "guest" ? null : { id: "story-cloud", userId: "story-user", slotId: "primary", saveVersion: playerRuntime.saveVersion, contentVersion: playerRuntime.contentVersion, playerState: playerRuntime, unresolvedState: playerRuntime.unresolved, revision: 8, deviceName: "Story Browser", createdAt: playerRuntime.createdAt, updatedAt: playerRuntime.updatedAt }}
      cloudError={cloudSync.lastCloudError}
      settingsAccount={variant === "guest" ? { status: "guest", supabaseStatus: "Available" } : { status: "authenticated", email: "player@noveris.life", supabaseStatus: "Available" }}
      activeScreen="dashboard"
      activeEraId="survival"
      activeCategoryId="workforce"
      frameScale={0.72}
      embedded
      initialSettingsOpen
    />
  );
}

export const SettingsGuest: Story = {
  render: () => <StoryCanvas><SettingsStory variant="guest" /></StoryCanvas>
};

export const SettingsAuthenticated: Story = {
  render: () => <StoryCanvas><SettingsStory variant="authenticated" /></StoryCanvas>
};

export const SettingsCloudPending: Story = {
  render: () => <StoryCanvas><SettingsStory variant="pending" /></StoryCanvas>
};

export const SettingsOffline: Story = {
  render: () => <StoryCanvas><SettingsStory variant="offline" /></StoryCanvas>
};

export const SettingsConflict: Story = {
  render: () => <StoryCanvas><SettingsStory variant="conflict" /></StoryCanvas>
};

export const Production: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return <GameShell data={data} activeScreen="production" activeEraId="industrial" activeCategoryId="industry" />;
  }
};

export const Research: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return <GameShell data={data} activeScreen="research" activeEraId="space-age" activeCategoryId="science" />;
  }
};

export const Civilization: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return <GameShell data={data} activeScreen="civilization" activeEraId="modern" activeCategoryId="workforce" />;
  }
};

export const Earth: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return <GameShell data={data} activeScreen="earth" activeEraId="survival" activeCategoryId="industry" />;
  }
};

export const SolarSystem: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return <GameShell data={data} activeScreen="solar" activeEraId="space-age" activeCategoryId="technology" />;
  }
};

export const DiscoveryJournal: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return <GameShell data={data} activeScreen="journal" activeEraId="interstellar" activeCategoryId="science" />;
  }
};

export const ArtReviewAll41Assets: Story = {
  render: () => {
    const { data, globals } = useGenesisStoryContent();
    return <ArtReviewGallery data={data} filter={globals.artStatus ?? "all"} />;
  }
};

export const RobloxParityMainDashboard: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return <RobloxParityReview data={data} status="In Progress" opacity={0.5} />;
  }
};

export const BoostsTrayClosed: Story = {
  render: () => (
    <BoostTrayStoryFrame>
      <BoostsTray open={false} onClose={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayOpeningTransition: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden>
      <BoostsTray open slots={boostFixtureSlots.slice(0, 3)} onClose={() => undefined} onActivate={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayOpenNoBoosts: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden>
      <BoostsTray open onClose={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayAvailableBoosts: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden>
      <BoostsTray open slots={boostFixtureSlots.filter((slot) => slot.state === "available")} onClose={() => undefined} onActivate={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayOneActiveBoost: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden>
      <BoostsTray
        open
        activeBoosts={[{
          id: "runtime-click-surge",
          definitionId: "Manual Boost",
          targetSystem: "click",
          startedAt: new Date(Date.now() - 12_000).toISOString(),
          endsAt: new Date(Date.now() + 52_000).toISOString(),
          multiplier: 2
        }]}
        onClose={() => undefined}
      />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayLockedBoosts: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden>
      <BoostsTray open slots={boostFixtureSlots.filter((slot) => slot.state === "locked")} onClose={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayCooldown: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden>
      <BoostsTray open slots={boostFixtureSlots.filter((slot) => slot.state === "cooldown")} onClose={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayCompactViewport: Story = {
  render: () => (
    <BoostTrayStoryFrame compact launcherHidden>
      <BoostsTray open slots={boostFixtureSlots} onClose={() => undefined} onActivate={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayClosingTransition: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden>
      <BoostsTray open={false} slots={boostFixtureSlots} onClose={() => undefined} onActivate={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayReducedMotion: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden>
      <BoostsTray open slots={boostFixtureSlots} onClose={() => undefined} reducedMotion />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayScaled4KViewport: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden scaleOverride={0.42}>
      <BoostsTray open slots={boostFixtureSlots} onClose={() => undefined} onActivate={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayViewport1920x1080: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden scaleOverride={0.58}>
      <BoostsTray open slots={boostFixtureSlots} onClose={() => undefined} onActivate={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayViewport2560x1440: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden scaleOverride={0.48}>
      <BoostsTray open slots={boostFixtureSlots} onClose={() => undefined} onActivate={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayViewport3840x2160: Story = {
  render: () => (
    <BoostTrayStoryFrame launcherHidden scaleOverride={0.36}>
      <BoostsTray open slots={boostFixtureSlots} onClose={() => undefined} onActivate={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const ComponentSampler: Story = {
  render: () => {
    const { data, selectedEra, selectedCategory } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <div className="grid grid-cols-3 gap-3">
          <SidebarNavigation active="dashboard" />
          <div className="space-y-3">
            <HeroObjectivePanel era={selectedEra} resources={data.resources} assets={data.assets} />
            <UpgradeCategoryTabs categories={data.upgradeCategories} activeCategoryId={selectedCategory.id} />
            <EraCard era={selectedEra} active />
          </div>
          <div className="space-y-3">
            <ManualProductionPanel />
            <CriticalStatsPanel />
            <LeaderboardPanel />
            <BoostBar value={88} />
          </div>
        </div>
      </StoryCanvas>
    );
  }
};

export const ModalAndToast: Story = {
  render: () => (
    <StoryCanvas>
      <div className="grid grid-cols-2 gap-3">
        <GameModal />
        <GameToast />
      </div>
    </StoryCanvas>
  )
};
