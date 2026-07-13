import type { Meta, StoryObj } from "@storybook/react";
import type { ReactNode } from "react";
import { createDashboardArtMap } from "@/lib/canonical-runtime";
import { createDashboardModel, type DashboardPlayerState } from "@/lib/dashboard/dashboard-model";
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
      resourceId: "ECON-CIVILIZATION-ENERGY",
      label: "Civilization Energy",
      amount: 1250000000,
      perClickLabel: "Per Click"
    },
    automation: {
      label: "Auto Click",
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
      <div className="relative h-[927px] w-[140px] overflow-hidden bg-slate-950">
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

function BoostTrayStoryFrame({ children, compact = false }: { children: ReactNode; compact?: boolean }) {
  const scale = compact ? 0.52 : 0.72;
  return (
    <StoryCanvas>
      <div className="h-[720px] w-full overflow-auto bg-slate-950 p-4">
        <div
          className="relative overflow-hidden border border-cyan-200/20 bg-[#06111f]"
          style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "top left" }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(45,212,255,0.12),transparent_34rem),linear-gradient(145deg,#030713_0%,#071225_52%,#050816_100%)]" />
          <button className="absolute left-[866px] top-[1010px] h-[58px] w-[230px] rounded-md border border-cyan-100/30 bg-black/50 text-xl font-black uppercase text-white" type="button">
            Boosts <span className="text-cyan-100">0</span>
          </button>
          {children}
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
        resourceId: "ECON-CIVILIZATION-ENERGY",
        label: "Civilization Energy",
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
        resourceId: "ECON-CIVILIZATION-ENERGY",
        label: "Civilization Energy",
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

export const AutoClickDefaultOff: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel();
    return <AutoPanelStoryFrame><AutoClickPanel model={model} art={art} /></AutoPanelStoryFrame>;
  }
};

export const AutoClickActiveOn: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel({
      automation: {
        label: "Auto Click",
        amountPerSecond: 25600000,
        enabled: true
      }
    });
    return <AutoPanelStoryFrame><AutoClickPanel model={model} art={art} /></AutoPanelStoryFrame>;
  }
};

export const AutoClickHighProduction: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel({
      automation: {
        label: "Auto Click",
        amountPerSecond: 785000000000,
        enabled: true
      }
    });
    return <AutoPanelStoryFrame><AutoClickPanel model={model} art={art} /></AutoPanelStoryFrame>;
  }
};

export const AutoClickMissingArt: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel({
      automation: {
        label: "Auto Click",
        amountPerSecond: 25600000,
        enabled: true
      }
    });
    return <AutoPanelStoryFrame><AutoClickPanel model={model} art={panelMissingArt(art)} /></AutoPanelStoryFrame>;
  }
};

export const AutoClickMissingPlayerState: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel({ automation: undefined });
    return <AutoPanelStoryFrame><AutoClickPanel model={model} art={art} /></AutoPanelStoryFrame>;
  }
};

export const AutoClickReducedMotion: Story = {
  render: () => {
    const { model, art } = usePanelStoryModel({
      automation: {
        label: "Auto Click",
        amountPerSecond: 25600000,
        enabled: true
      }
    });
    return <AutoPanelStoryFrame reducedMotion><AutoClickPanel model={model} art={art} /></AutoPanelStoryFrame>;
  }
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

export const AutoButtonImageOn: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return <ActionButtonStoryFrame><BeveledActionButton art={art.dashboard_auto_button_on} label="AUTO: ON" tone="green" active className="absolute left-[9px] top-[7px] h-[55px] w-[312px]" /></ActionButtonStoryFrame>;
  }
};

export const AutoButtonImageOff: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return <ActionButtonStoryFrame><BeveledActionButton art={art.dashboard_auto_button_off} label="AUTO: OFF" tone="muted" className="absolute left-[9px] top-[7px] h-[55px] w-[312px]" /></ActionButtonStoryFrame>;
  }
};

export const AutoButtonImageHover: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return (
      <ActionButtonStoryFrame>
        <div className="brightness-110">
          <BeveledActionButton art={art.dashboard_auto_button_on} label="AUTO: ON" tone="green" active className="absolute left-[9px] top-[7px] h-[55px] w-[312px]" />
        </div>
      </ActionButtonStoryFrame>
    );
  }
};

export const AutoButtonImagePressed: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return <ActionButtonStoryFrame><BeveledActionButton art={art.dashboard_auto_button_on} label="AUTO: ON" tone="green" pressed className="absolute left-[9px] top-[7px] h-[55px] w-[312px]" /></ActionButtonStoryFrame>;
  }
};

export const AutoButtonImageDisabled: Story = {
  render: () => {
    const { art } = usePanelStoryModel();
    return <ActionButtonStoryFrame><BeveledActionButton art={art.dashboard_auto_button_off} label="AUTO: OFF" tone="muted" disabled className="absolute left-[9px] top-[7px] h-[55px] w-[312px]" /></ActionButtonStoryFrame>;
  }
};

export const ClickAndAutoStackedRobloxReference: Story = {
  render: () => {
    const { data, model, art } = usePanelStoryModel({
      automation: {
        label: "Auto Click",
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
  render: () => <BoostTrayStoryFrame>{null}</BoostTrayStoryFrame>
};

export const BoostsTrayOpenNoBoosts: Story = {
  render: () => (
    <BoostTrayStoryFrame>
      <BoostsTray open onClose={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayAvailableBoosts: Story = {
  render: () => (
    <BoostTrayStoryFrame>
      <BoostsTray open slots={boostFixtureSlots.filter((slot) => slot.state === "available")} onClose={() => undefined} onActivate={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayOneActiveBoost: Story = {
  render: () => (
    <BoostTrayStoryFrame>
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
    <BoostTrayStoryFrame>
      <BoostsTray open slots={boostFixtureSlots.filter((slot) => slot.state === "locked")} onClose={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayCooldown: Story = {
  render: () => (
    <BoostTrayStoryFrame>
      <BoostsTray open slots={boostFixtureSlots.filter((slot) => slot.state === "cooldown")} onClose={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayCompactViewport: Story = {
  render: () => (
    <BoostTrayStoryFrame compact>
      <BoostsTray open slots={boostFixtureSlots} onClose={() => undefined} onActivate={() => undefined} />
    </BoostTrayStoryFrame>
  )
};

export const BoostsTrayReducedMotion: Story = {
  render: () => (
    <BoostTrayStoryFrame>
      <BoostsTray open slots={boostFixtureSlots} onClose={() => undefined} reducedMotion />
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
