export type RobloxRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const ROBLOX_DASHBOARD_REFERENCE = {
  width: 1920,
  height: 1080
} as const;

export const ROBLOX_DASHBOARD_LAYOUT = {
  topHud: { x: 0, y: 8, width: 1920, height: 104 },
  sidebar: { x: 12, y: 126, width: 160, height: 944 },
  leftColumn: { x: 184, y: 126, width: 350, height: 823 },
  hero: { x: 550, y: 126, width: 910, height: 517 },
  upgrades: { x: 550, y: 650, width: 910, height: 420 },
  rightColumn: { x: 1485, y: 126, width: 430, height: 939 },
  boostToggle: { x: 854, y: 1011, width: 230, height: 58 }
} as const satisfies Record<string, RobloxRect>;

