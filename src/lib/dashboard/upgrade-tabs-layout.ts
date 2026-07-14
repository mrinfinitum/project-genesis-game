export type UpgradeTabLayoutKey = "workforce" | "industry" | "science" | "technology";

const PANEL = {
  x: 550,
  y: 650,
  width: 910,
  height: 420
} as const;

const TAB_HEIGHT = PANEL.height * 0.16;
const TAB_WIDTH = PANEL.width * 0.25;
const LABEL_WIDTH = TAB_WIDTH * 0.86;
const LABEL_HEIGHT = TAB_HEIGHT * 0.36;
const LABEL_TOP = TAB_HEIGHT * 0.11;

const labelXOffsets: Record<UpgradeTabLayoutKey, number> = {
  workforce: 0.07,
  industry: 0.17,
  science: 0.07,
  technology: -0.04
};

function tabRect(index: number) {
  return {
    x: PANEL.x + TAB_WIDTH * index,
    y: PANEL.y,
    width: TAB_WIDTH,
    height: TAB_HEIGHT
  };
}

function labelRect(index: number, key: UpgradeTabLayoutKey) {
  const tab = tabRect(index);

  return {
    x: tab.x + TAB_WIDTH * labelXOffsets[key],
    y: tab.y + LABEL_TOP,
    width: LABEL_WIDTH,
    height: LABEL_HEIGHT
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
    tab: tabRect(0),
    label: labelRect(0, "workforce"),
    panel: {
      hitArea: toPanelPercent(tabRect(0)),
      label: toPanelPercent(labelRect(0, "workforce"))
    }
  },
  industry: {
    tab: tabRect(1),
    label: labelRect(1, "industry"),
    panel: {
      hitArea: toPanelPercent(tabRect(1)),
      label: toPanelPercent(labelRect(1, "industry"))
    }
  },
  science: {
    tab: tabRect(2),
    label: labelRect(2, "science"),
    panel: {
      hitArea: toPanelPercent(tabRect(2)),
      label: toPanelPercent(labelRect(2, "science"))
    }
  },
  technology: {
    tab: tabRect(3),
    label: labelRect(3, "technology"),
    panel: {
      hitArea: toPanelPercent(tabRect(3)),
      label: toPanelPercent(labelRect(3, "technology"))
    }
  }
} as const;

export const UPGRADE_TAB_PANEL_RECT = PANEL;
