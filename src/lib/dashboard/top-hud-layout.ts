import type { RobloxRect } from "./dashboard-layout";

export type TopHudTextRect = RobloxRect & {
  fontSize: number;
  lineHeight: number;
  align: "left" | "right" | "center";
};

export type TopHudEconomyRect = {
  slot: RobloxRect;
  dividerReferenceX: number;
  contentStartX: number;
  icon: RobloxRect;
  iconCanvas: { width: number; height: number };
  iconVisibleBounds: RobloxRect;
  dividerToIconVisualGap: number;
  iconToValueGap: number;
  valueColumn: RobloxRect;
  value: TopHudTextRect;
  rate: TopHudTextRect;
  textAlignment: "left" | "right" | "center";
  verticalAlignment: "top" | "center" | "bottom";
};

export const TOP_HUD_SPACING = {
  dividerToIconVisualGap: 24,
  iconToValueGap: 22,
  valueToRateVerticalGap: 4,
  premiumValueToAddButtonGap: 10,
  iconVisualSize: 50,
  iconCanvasSize: 50,
  valueLineHeight: 34,
  rateLineHeight: 22,
  valueFontSize: 31,
  rateFontSize: 17,
  tolerancePx: 2
} as const;

const ICON_CANVAS = { width: 96, height: 96 } as const;

const FULL_ICON_VISIBLE_BOUNDS = {
  x: 0,
  y: 0,
  width: 96,
  height: 96
} as const;

function economyLayout({
  slot,
  dividerReferenceX,
  iconX,
  valueX,
  valueWidth
}: {
  slot: RobloxRect;
  dividerReferenceX: number;
  iconX: number;
  valueX: number;
  valueWidth: number;
}): TopHudEconomyRect {
  const icon = { x: iconX, y: 41, width: TOP_HUD_SPACING.iconCanvasSize, height: TOP_HUD_SPACING.iconCanvasSize };
  const valueColumn = {
    x: valueX,
    y: 33,
    width: valueWidth,
    height: TOP_HUD_SPACING.valueLineHeight + TOP_HUD_SPACING.valueToRateVerticalGap + TOP_HUD_SPACING.rateLineHeight
  };
  return {
    slot,
    dividerReferenceX,
    contentStartX: dividerReferenceX + TOP_HUD_SPACING.dividerToIconVisualGap,
    icon,
    iconCanvas: ICON_CANVAS,
    iconVisibleBounds: FULL_ICON_VISIBLE_BOUNDS,
    dividerToIconVisualGap: icon.x - dividerReferenceX,
    iconToValueGap: valueColumn.x - (icon.x + icon.width),
    valueColumn,
    value: { x: valueColumn.x, y: valueColumn.y, width: valueColumn.width, height: TOP_HUD_SPACING.valueLineHeight, fontSize: TOP_HUD_SPACING.valueFontSize, lineHeight: TOP_HUD_SPACING.valueLineHeight, align: "left" },
    rate: { x: valueColumn.x, y: valueColumn.y + TOP_HUD_SPACING.valueLineHeight + TOP_HUD_SPACING.valueToRateVerticalGap, width: valueColumn.width, height: TOP_HUD_SPACING.rateLineHeight, fontSize: TOP_HUD_SPACING.rateFontSize, lineHeight: TOP_HUD_SPACING.rateLineHeight, align: "left" },
    textAlignment: "left",
    verticalAlignment: "center"
  };
}

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
    "ECON-LABOR": economyLayout({ slot: { x: 500, y: 12, width: 260, height: 108 }, dividerReferenceX: 510, iconX: 534, valueX: 606, valueWidth: 144 }),
    "ECON-CREDITS": economyLayout({ slot: { x: 745, y: 12, width: 270, height: 108 }, dividerReferenceX: 758, iconX: 782, valueX: 854, valueWidth: 146 }),
    "ECON-POPULATION": economyLayout({ slot: { x: 990, y: 12, width: 250, height: 108 }, dividerReferenceX: 992, iconX: 1016, valueX: 1088, valueWidth: 132 }),
    "ECON-RESEARCH": economyLayout({ slot: { x: 1215, y: 12, width: 240, height: 108 }, dividerReferenceX: 1213, iconX: 1237, valueX: 1309, valueWidth: 124 }),
    "ECON-PREMIUM-CRYSTALS": economyLayout({ slot: { x: 1445, y: 12, width: 236, height: 108 }, dividerReferenceX: 1443, iconX: 1467, valueX: 1539, valueWidth: 74 })
  },
  premiumActions: {
    addCrystals: {
      visible: { x: 1623, y: 43, width: 44, height: 44 },
      hitArea: { x: 1615, y: 35, width: 60, height: 60 }
    }
  },
  utilities: {
    add: { x: 1615, y: 35, width: 60, height: 60 },
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
  premiumActions: Record<string, { visible: RobloxRect; hitArea: RobloxRect }>;
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
