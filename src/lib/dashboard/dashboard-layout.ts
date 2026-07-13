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
  topHud: { x: 0, y: 12, width: 1920, height: 108 },
  sidebar: { x: 12, y: 126, width: 160, height: 944 },
  leftColumn: { x: 184, y: 126, width: 350, height: 823 },
  hero: { x: 572, y: 139, width: 910, height: 510 },
  upgrades: { x: 572, y: 658, width: 910, height: 407 },
  rightColumn: { x: 1514, y: 139, width: 425, height: 927 },
  boostToggle: { x: 866, y: 1010, width: 230, height: 58 }
} as const satisfies Record<string, RobloxRect>;
