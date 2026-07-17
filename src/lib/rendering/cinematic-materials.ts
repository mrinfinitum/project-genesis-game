export type CinematicRenderingLayerId = "skybox" | "world" | "atmosphere" | "navigation" | "hud";

export type CinematicHudSurface = "glass" | "projection" | "compact" | "metric" | "control" | "warning" | "danger" | "selection";

export type CinematicQualityLevel = "low" | "medium" | "high";

export type CinematicMaterialSpec = {
  id: string;
  cssClass: string;
  opacity: number;
  borderOpacity: number;
  glow: string;
  color: string;
  role: "glass" | "hologram" | "projection" | "warning" | "selection" | "highlight" | "energy";
};

export const CINEMATIC_RENDERING_VERSION = "cinematic-rendering-v1";

export const CINEMATIC_RENDERING_LAYERS: Array<{ id: CinematicRenderingLayerId; order: number; label: string }> = [
  { id: "skybox", order: 0, label: "Skybox, stars, nebula, galaxy" },
  { id: "world", order: 1, label: "Planets, moons, stations, ships" },
  { id: "atmosphere", order: 2, label: "Bloom, haze, fog, particles, light shafts" },
  { id: "navigation", order: 3, label: "Orbit paths, routes, signals, scan pulses" },
  { id: "hud", order: 4, label: "Glass, projection, minimal typography" }
];

export const cinematicPalette = {
  deepSpace: "#061426",
  void: "#020712",
  cyan: "#67e8f9",
  cyanSoft: "#a5f3fc",
  gold: "#f8c76f",
  amber: "#fbbf24",
  red: "#fb7185",
  green: "#7ddfbc",
  muted: "#94a3b8"
} as const;

export const cinematicLighting = {
  background: "#061426",
  fog: {
    color: "#0a1f35",
    near: 72,
    far: 860
  },
  ambientIntensity: 0.42,
  hemisphere: {
    skyColor: "#8ddcf4",
    groundColor: "#020712",
    intensity: 0.68
  },
  keyLight: {
    color: "#f8c76f",
    intensity: 1.55,
    position: [44, 96, 138] as const
  },
  rimLight: {
    color: "#67e8f9",
    intensity: 1.15,
    position: [-70, 42, -116] as const
  }
} as const;

export const cinematicMaterialSpecs: Record<CinematicHudSurface, CinematicMaterialSpec> = {
  glass: {
    id: "hud-glass",
    cssClass: "cinematic-hud-surface",
    opacity: 0.14,
    borderOpacity: 0.18,
    glow: "rgba(103,232,249,0.18)",
    color: cinematicPalette.cyan,
    role: "glass"
  },
  projection: {
    id: "hud-projection",
    cssClass: "cinematic-hud-projection",
    opacity: 0.1,
    borderOpacity: 0.16,
    glow: "rgba(248,199,111,0.16)",
    color: cinematicPalette.gold,
    role: "projection"
  },
  compact: {
    id: "hud-compact",
    cssClass: "cinematic-hud-compact",
    opacity: 0.12,
    borderOpacity: 0.16,
    glow: "rgba(103,232,249,0.12)",
    color: cinematicPalette.cyanSoft,
    role: "glass"
  },
  metric: {
    id: "hud-metric",
    cssClass: "cinematic-hud-metric",
    opacity: 0.11,
    borderOpacity: 0.12,
    glow: "rgba(103,232,249,0.1)",
    color: cinematicPalette.cyanSoft,
    role: "hologram"
  },
  control: {
    id: "hud-control",
    cssClass: "cinematic-hud-control",
    opacity: 0.1,
    borderOpacity: 0.2,
    glow: "rgba(103,232,249,0.14)",
    color: cinematicPalette.cyan,
    role: "selection"
  },
  warning: {
    id: "hud-warning",
    cssClass: "cinematic-hud-warning",
    opacity: 0.12,
    borderOpacity: 0.22,
    glow: "rgba(251,191,36,0.16)",
    color: cinematicPalette.amber,
    role: "warning"
  },
  danger: {
    id: "hud-danger",
    cssClass: "cinematic-hud-danger",
    opacity: 0.12,
    borderOpacity: 0.22,
    glow: "rgba(251,113,133,0.16)",
    color: cinematicPalette.red,
    role: "warning"
  },
  selection: {
    id: "hud-selection",
    cssClass: "cinematic-hud-selection",
    opacity: 0.16,
    borderOpacity: 0.28,
    glow: "rgba(125,223,188,0.2)",
    color: cinematicPalette.green,
    role: "highlight"
  }
};

export const cinematicHudClasses = {
  worldRoot: "cinematic-world-root",
  vectorGrid: "cinematic-vector-grid",
  atmosphere: "cinematic-atmosphere-layer",
  glass: cinematicMaterialSpecs.glass.cssClass,
  projection: cinematicMaterialSpecs.projection.cssClass,
  compact: cinematicMaterialSpecs.compact.cssClass,
  metric: cinematicMaterialSpecs.metric.cssClass,
  control: cinematicMaterialSpecs.control.cssClass,
  warning: cinematicMaterialSpecs.warning.cssClass,
  danger: cinematicMaterialSpecs.danger.cssClass,
  selection: cinematicMaterialSpecs.selection.cssClass,
  button: "cinematic-hud-button",
  buttonPrimary: "cinematic-hud-button cinematic-hud-button--primary",
  buttonGold: "cinematic-hud-button cinematic-hud-button--gold",
  buttonDanger: "cinematic-hud-button cinematic-hud-button--danger",
  label: "cinematic-hud-label",
  title: "cinematic-hud-title"
} as const;

export const cinematicPostProcessingProfiles: Record<CinematicQualityLevel, {
  bloom: boolean;
  bloomStrength: number;
  vignette: number;
  filmGrain: number;
  chromaticAberration: number;
  depthHaze: boolean;
  particleLod: number;
}> = {
  low: {
    bloom: true,
    bloomStrength: 0.18,
    vignette: 0.12,
    filmGrain: 0,
    chromaticAberration: 0,
    depthHaze: true,
    particleLod: 0.35
  },
  medium: {
    bloom: true,
    bloomStrength: 0.3,
    vignette: 0.18,
    filmGrain: 0.025,
    chromaticAberration: 0,
    depthHaze: true,
    particleLod: 0.65
  },
  high: {
    bloom: true,
    bloomStrength: 0.42,
    vignette: 0.22,
    filmGrain: 0.035,
    chromaticAberration: 0.008,
    depthHaze: true,
    particleLod: 1
  }
};

export function resolveCinematicHudClass(surface: CinematicHudSurface, extra = "") {
  return `${cinematicMaterialSpecs[surface].cssClass}${extra ? ` ${extra}` : ""}`;
}

export function resolveCinematicQualityProfile(input: { mobile?: boolean; reducedMotion?: boolean; devicePixelRatio?: number }) {
  if (input.mobile || input.reducedMotion || (input.devicePixelRatio ?? 1) > 2.5) return cinematicPostProcessingProfiles.low;
  if ((input.devicePixelRatio ?? 1) > 1.5) return cinematicPostProcessingProfiles.medium;
  return cinematicPostProcessingProfiles.high;
}
