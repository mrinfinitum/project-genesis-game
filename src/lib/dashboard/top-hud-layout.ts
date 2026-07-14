import type { RobloxRect } from "./dashboard-layout";

export type TopHudTextRect = RobloxRect & {
  fontSize: number;
  lineHeight: number;
  align: "left" | "right" | "center";
};

export type TopHudEconomyRect = {
  slot: RobloxRect;
  icon: RobloxRect;
  value: TopHudTextRect;
  rate: TopHudTextRect;
  textAlignment: "left" | "right" | "center";
  verticalAlignment: "top" | "center" | "bottom";
};

export const TOP_HUD_BACKGROUND_ASSET = {
  semanticArtKey: "dashboard_top_hud",
  artKey: "top_bar_resource_panel_strip",
  robloxAssetId: "81516206378414",
  publicUrl: "/roblox-assets/topbar/topbar_resource_panel_1920x104a.png",
  sourceFilename: "topbar_resource_panel_1920x104a.png",
  nativeWidth: 1920,
  nativeHeight: 104,
  designBounds: { x: 0, y: 12, width: 1920, height: 108 },
  renderMode: "object-fill",
  cropMode: "none",
  stretch: "vertical 104px source to 108px design bounds"
} as const;

export const TOP_HUD_LAYOUT = {
  coordinateSpace: { width: 1920, height: 1080 },
  background: TOP_HUD_BACKGROUND_ASSET,
  identity: {
    x: 160,
    y: 12,
    width: 360,
    height: 108,
    title: { x: 250, y: 31, width: 245, height: 34, fontSize: 28, lineHeight: 34, align: "left" },
    subtitle: { x: 250, y: 74, width: 245, height: 28, fontSize: 21, lineHeight: 28, align: "left" },
    textAlignment: "left",
    verticalAlignment: "center"
  },
  economies: {
    "ECON-LABOR": {
      slot: { x: 500, y: 12, width: 260, height: 108 },
      icon: { x: 534, y: 44, width: 48, height: 48 },
      value: { x: 610, y: 36, width: 150, height: 36, fontSize: 31, lineHeight: 36, align: "left" },
      rate: { x: 610, y: 76, width: 150, height: 22, fontSize: 17, lineHeight: 22, align: "left" },
      textAlignment: "left",
      verticalAlignment: "center"
    },
    "ECON-CREDITS": {
      slot: { x: 745, y: 12, width: 270, height: 108 },
      icon: { x: 785, y: 44, width: 48, height: 48 },
      value: { x: 865, y: 36, width: 146, height: 36, fontSize: 31, lineHeight: 36, align: "left" },
      rate: { x: 865, y: 76, width: 146, height: 22, fontSize: 17, lineHeight: 22, align: "left" },
      textAlignment: "left",
      verticalAlignment: "center"
    },
    "ECON-POPULATION": {
      slot: { x: 990, y: 12, width: 250, height: 108 },
      icon: { x: 1008, y: 44, width: 48, height: 48 },
      value: { x: 1076, y: 36, width: 150, height: 36, fontSize: 31, lineHeight: 36, align: "left" },
      rate: { x: 1076, y: 76, width: 150, height: 22, fontSize: 17, lineHeight: 22, align: "left" },
      textAlignment: "left",
      verticalAlignment: "center"
    },
    "ECON-RESEARCH": {
      slot: { x: 1215, y: 12, width: 240, height: 108 },
      icon: { x: 1235, y: 44, width: 48, height: 48 },
      value: { x: 1302, y: 36, width: 132, height: 36, fontSize: 31, lineHeight: 36, align: "left" },
      rate: { x: 1302, y: 76, width: 132, height: 22, fontSize: 17, lineHeight: 22, align: "left" },
      textAlignment: "left",
      verticalAlignment: "center"
    },
    "ECON-PREMIUM-CRYSTALS": {
      slot: { x: 1445, y: 12, width: 185, height: 108 },
      icon: { x: 1465, y: 44, width: 48, height: 48 },
      value: { x: 1530, y: 36, width: 90, height: 36, fontSize: 31, lineHeight: 36, align: "left" },
      rate: { x: 1530, y: 76, width: 90, height: 22, fontSize: 17, lineHeight: 22, align: "left" },
      textAlignment: "left",
      verticalAlignment: "center"
    }
  },
  utilities: {
    add: { x: 1640, y: 42, width: 46, height: 46 },
    calendar: { x: 1700, y: 24, width: 80, height: 80 },
    trophy: { x: 1770, y: 24, width: 80, height: 80 },
    settings: { x: 1840, y: 24, width: 80, height: 80 }
  }
} as const satisfies {
  coordinateSpace: { width: 1920; height: 1080 };
  background: typeof TOP_HUD_BACKGROUND_ASSET;
  identity: RobloxRect & {
    title: TopHudTextRect;
    subtitle: TopHudTextRect;
    textAlignment: "left" | "right" | "center";
    verticalAlignment: "top" | "center" | "bottom";
  };
  economies: Record<string, TopHudEconomyRect>;
  utilities: Record<string, RobloxRect>;
};

export type TopHudEconomyId = keyof typeof TOP_HUD_LAYOUT.economies;

export function topHudRectStyle(rect: RobloxRect) {
  return {
    left: `${rect.x}px`,
    top: `${rect.y - TOP_HUD_BACKGROUND_ASSET.designBounds.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  };
}

export function topHudTextStyle(rect: TopHudTextRect) {
  return {
    ...topHudRectStyle(rect),
    fontSize: `${rect.fontSize}px`,
    lineHeight: `${rect.lineHeight}px`,
    textAlign: rect.align
  };
}

export function topHudLocalRectStyle(rect: RobloxRect, origin: RobloxRect) {
  return {
    left: `${rect.x - origin.x}px`,
    top: `${rect.y - origin.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`
  };
}

export function topHudLocalTextStyle(rect: TopHudTextRect, origin: RobloxRect) {
  return {
    ...topHudLocalRectStyle(rect, origin),
    fontSize: `${rect.fontSize}px`,
    lineHeight: `${rect.lineHeight}px`,
    textAlign: rect.align
  };
}

export function topHudRectInsideSlot(rect: RobloxRect, slot: RobloxRect) {
  return rect.x >= slot.x
    && rect.y >= slot.y
    && rect.x + rect.width <= slot.x + slot.width
    && rect.y + rect.height <= slot.y + slot.height;
}
