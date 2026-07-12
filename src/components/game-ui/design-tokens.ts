import type { CSSProperties } from "react";

export const genesisTokens = {
  color: {
    background: "#030713",
    backgroundSoft: "#071123",
    panel: "rgba(7, 16, 34, 0.9)",
    panelBright: "rgba(15, 35, 66, 0.86)",
    panelLine: "rgba(119, 231, 255, 0.24)",
    text: "#ecfeff",
    muted: "rgba(207, 250, 254, 0.68)",
    cyan: "#2dd4ff",
    teal: "#2dd4bf",
    gold: "#fbbf24",
    magenta: "#d946ef",
    danger: "#fb7185",
    success: "#34d399",
    locked: "rgba(148, 163, 184, 0.42)"
  },
  gradient: {
    app: "radial-gradient(circle at 47% 16%, rgba(45, 212, 255, 0.24), transparent 25rem), radial-gradient(circle at 83% 22%, rgba(217, 70, 239, 0.16), transparent 23rem), radial-gradient(circle at 17% 78%, rgba(251, 191, 36, 0.1), transparent 22rem), linear-gradient(145deg, #030713 0%, #071225 52%, #120819 100%)",
    hero: "radial-gradient(circle at 52% 38%, rgba(45, 212, 255, 0.36), transparent 15rem), radial-gradient(circle at 72% 54%, rgba(251, 191, 36, 0.16), transparent 13rem), linear-gradient(155deg, rgba(11, 27, 54, 0.96), rgba(4, 9, 20, 0.96))",
    panel: "linear-gradient(180deg, rgba(20, 48, 86, 0.82), rgba(5, 12, 25, 0.94))",
    hazard: "linear-gradient(135deg, rgba(251, 191, 36, 0.18), rgba(251, 113, 133, 0.12))"
  },
  radius: {
    panel: "8px",
    control: "6px",
    tile: "8px"
  },
  shadow: {
    neon: "0 0 28px rgba(45, 212, 255, 0.28)",
    panel: "0 16px 52px rgba(0, 0, 0, 0.42)"
  },
  spacing: {
    shell: "14px",
    panel: "10px",
    hudHeight: "70px",
    sidebarWidth: "236px",
    contentGap: "12px",
    progressHeight: "8px",
    iconSize: "34px"
  },
  timing: {
    fast: "140ms",
    normal: "220ms"
  },
  rarity: {
    Common: "#94a3b8",
    Uncommon: "#34d399",
    Rare: "#38bdf8",
    Epic: "#c084fc",
    Legendary: "#f59e0b",
    Mythic: "#fb7185"
  },
  alignment: {
    Industry: "#f59e0b",
    Technology: "#38bdf8",
    Cyber: "#d946ef",
    Nature: "#34d399",
    Corporate: "#f43f5e"
  },
  era: {
    survival: "#65a30d",
    ancient: "#f59e0b",
    medieval: "#a78bfa",
    renaissance: "#fb7185",
    industrial: "#f97316",
    modern: "#22c55e",
    "space-age": "#38bdf8",
    interstellar: "#818cf8",
    galactic: "#e879f9"
  }
} as const;

export type AlignmentName = keyof typeof genesisTokens.alignment;
export type RarityName = keyof typeof genesisTokens.rarity;

export function tokenStyle() {
  return {
    "--genesis-background": genesisTokens.color.background,
    "--genesis-panel": genesisTokens.color.panel,
    "--genesis-panel-bright": genesisTokens.color.panelBright,
    "--genesis-panel-line": genesisTokens.color.panelLine,
    "--genesis-text": genesisTokens.color.text,
    "--genesis-muted": genesisTokens.color.muted,
    "--genesis-cyan": genesisTokens.color.cyan,
    "--genesis-teal": genesisTokens.color.teal,
    "--genesis-gold": genesisTokens.color.gold,
    "--genesis-magenta": genesisTokens.color.magenta,
    "--genesis-danger": genesisTokens.color.danger,
    "--genesis-success": genesisTokens.color.success,
    "--genesis-app-gradient": genesisTokens.gradient.app,
    "--genesis-panel-gradient": genesisTokens.gradient.panel,
    "--genesis-hero-gradient": genesisTokens.gradient.hero,
    "--genesis-radius-panel": genesisTokens.radius.panel,
    "--genesis-shadow-neon": genesisTokens.shadow.neon,
    "--genesis-shadow-panel": genesisTokens.shadow.panel
  } as CSSProperties;
}
