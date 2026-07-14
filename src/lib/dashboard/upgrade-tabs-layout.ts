export type UpgradeTabLayoutKey = "workforce" | "industry" | "science" | "technology";

const ASSET = {
  path: "/roblox-assets/UI/folder-tabs-base-920.png",
  nativeWidth: 920,
  nativeHeight: 420,
  robloxAssetId: "rbxassetid://137465475952770"
} as const;

const PANEL = {
  x: 550,
  y: 650,
  width: 910,
  height: 420
} as const;

const TAB_HEIGHT = PANEL.height * 0.16;
const TAB_WIDTH = PANEL.width * 0.25;

export const UPGRADE_TAB_TYPOGRAPHY = {
  className: "text-[17px] font-black uppercase leading-none tracking-normal",
  fontSizePx: 17,
  fontWeight: 900,
  lineHeight: 1,
  letterSpacing: 0,
  textTransform: "uppercase"
} as const;

export const UPGRADE_TAB_ASSET = ASSET;

const measuredNativeLabelRects: Record<UpgradeTabLayoutKey, { x: number; y: number; width: number; height: number }> = {
  workforce: { x: 31, y: 14, width: 198, height: 28 },
  industry: { x: 285, y: 14, width: 190, height: 28 },
  science: { x: 526, y: 14, width: 158, height: 28 },
  technology: { x: 729, y: 14, width: 160, height: 28 }
};

const measuredNativeVisualTabRects: Record<UpgradeTabLayoutKey, { x: number; y: number; width: number; height: number }> = {
  workforce: { x: 0, y: 0, width: 260, height: 53 },
  industry: { x: 256, y: 0, width: 251, height: 53 },
  science: { x: 507, y: 0, width: 202, height: 53 },
  technology: { x: 706, y: 0, width: 214, height: 53 }
};

function hitAreaRect(index: number) {
  return {
    x: PANEL.x + TAB_WIDTH * index,
    y: PANEL.y,
    width: TAB_WIDTH,
    height: TAB_HEIGHT
  };
}

function fromNativeAssetRect(rect: { x: number; y: number; width: number; height: number }) {
  return {
    x: PANEL.x + (rect.x / ASSET.nativeWidth) * PANEL.width,
    y: PANEL.y + (rect.y / ASSET.nativeHeight) * PANEL.height,
    width: (rect.width / ASSET.nativeWidth) * PANEL.width,
    height: (rect.height / ASSET.nativeHeight) * PANEL.height
  };
}

function toPanelPercent(rect: { x: number; y: number; width: number; height: number }) {
  return {
    left: ((rect.x - PANEL.x) / PANEL.width) * 100,
    top: ((rect.y - PANEL.y) / PANEL.height) * 100,
    width: (rect.width / PANEL.width) * 100,
    height: (rect.height / PANEL.height) * 100
  };
}

export const UPGRADE_TAB_LAYOUT = {
  workforce: {
    tab: fromNativeAssetRect(measuredNativeVisualTabRects.workforce),
    label: fromNativeAssetRect(measuredNativeLabelRects.workforce),
    panel: {
      hitArea: toPanelPercent(hitAreaRect(0)),
      label: toPanelPercent(fromNativeAssetRect(measuredNativeLabelRects.workforce))
    }
  },
  industry: {
    tab: fromNativeAssetRect(measuredNativeVisualTabRects.industry),
    label: fromNativeAssetRect(measuredNativeLabelRects.industry),
    panel: {
      hitArea: toPanelPercent(hitAreaRect(1)),
      label: toPanelPercent(fromNativeAssetRect(measuredNativeLabelRects.industry))
    }
  },
  science: {
    tab: fromNativeAssetRect(measuredNativeVisualTabRects.science),
    label: fromNativeAssetRect(measuredNativeLabelRects.science),
    panel: {
      hitArea: toPanelPercent(hitAreaRect(2)),
      label: toPanelPercent(fromNativeAssetRect(measuredNativeLabelRects.science))
    }
  },
  technology: {
    tab: fromNativeAssetRect(measuredNativeVisualTabRects.technology),
    label: fromNativeAssetRect(measuredNativeLabelRects.technology),
    panel: {
      hitArea: toPanelPercent(hitAreaRect(3)),
      label: toPanelPercent(fromNativeAssetRect(measuredNativeLabelRects.technology))
    }
  }
} as const;

export const UPGRADE_TAB_PANEL_RECT = PANEL;
