import type { Meta, StoryObj } from "@storybook/react";
import {
  AlignmentPanel,
  ArtReviewGallery,
  BoostBar,
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
  RobloxParityReview,
  SidebarNavigation,
  StoryCanvas,
  TopResourceHud,
  UnknownUpgradeCard,
  UpgradeCard,
  UpgradeCategoryTabs
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

export const TopResourceHudStartingState: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <TopResourceHud resources={data.resources.slice(0, 7)} assets={data.assets} />
      </StoryCanvas>
    );
  }
};

export const TopResourceHudHighValues: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <TopResourceHud resources={data.resources.slice(0, 7)} assets={data.assets} highValues />
      </StoryCanvas>
    );
  }
};

export const TopResourceHudGainingResources: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    return (
      <StoryCanvas>
        <TopResourceHud resources={data.resources.slice(0, 7)} assets={data.assets} gaining />
      </StoryCanvas>
    );
  }
};

export const TopResourceHudMissingIcon: Story = {
  render: () => {
    const { data } = useGenesisStoryContent();
    const resources = [{ ...data.resources[0], iconKey: "missing-icon-key" }, ...data.resources.slice(1, 7)];
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
        <TopResourceHud resources={data.resources.slice(0, 4)} assets={data.assets} compact />
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
    return <RobloxParityReview data={data} status="In Progress" opacity={0.34} />;
  }
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
