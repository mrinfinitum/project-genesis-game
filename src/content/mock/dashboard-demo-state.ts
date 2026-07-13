import type { DashboardPlayerState } from "@/lib/dashboard/dashboard-model";

export const dashboardDemoAutomationNames = ["Gathering Drone", "Workshop Line", "Research Assistant"];

export const dashboardDemoPlayerState: DashboardPlayerState = {
  source: "demo-fixture",
  sourceLabel: "Storybook Demo Fixture",
  civilizationName: "Planet Prime",
  currentEraId: "survival",
  resourceInventory: {
    "RES-0001": 12840,
    "RES-0005": 13110,
    "RES-0006": 125,
    "RES-0016": 0,
    "RES-0077": 42
  },
  resourceRates: {
    "RES-0001": 1,
    "RES-0005": 1,
    "RES-0006": 512,
    "RES-0016": 0,
    "RES-0077": 0
  },
  clickOutput: {
    resourceId: "RES-0001",
    amount: 128,
    perClickLabel: "per click"
  },
  automation: {
    label: "Auto Click",
    amountPerSecond: 42,
    enabled: true
  },
  criticalStats: {
    chancePercent: 0,
    multiplier: 0
  },
  objective: {
    title: "Unlock Research Lab",
    description: "Prototype objective used only in explicit demo mode.",
    progressCurrent: 1,
    progressTarget: 1,
    focusResourceId: "RES-0001",
    discoveryPercent: 32,
    automationTier: "I"
  },
  upgradeLevels: {
    U0002: 1,
    U0001: 2
  },
  leaderboard: [
    { name: "StarBuild3r", score: 8450000000000000 },
    { name: "GalacticTycoon", score: 6220000000000000 },
    { name: "NovaEmpire", score: 5110000000000000 },
    { name: "ClickMasterX", score: 4920000000000000 },
    { name: "You", score: 52820000000000000 }
  ],
  activeEvent: {
    title: "Innovation Boom",
    description: "10x Innovation for 60s!",
    timerLabel: "00:45"
  },
  alignment: {
    Industry: 22,
    Technology: 28,
    Cyber: 12,
    Nature: 6,
    Corporate: 32
  },
  boosts: [
    { name: "Boosts", value: "6" }
  ],
  colonyProgressLabel: "41%"
};
