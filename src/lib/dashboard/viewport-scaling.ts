import { ROBLOX_DASHBOARD_REFERENCE } from "./dashboard-layout";
import { defaultStorageService, readStorageJson, writeStorageJson, type StorageService } from "@/platform/storage";

export type GameDisplayMode = "auto" | "fit" | "fill" | "actual";

export type GameDisplayPreferences = {
  displayMode: GameDisplayMode;
  minScale: number;
  maxScale: number;
  outerPadding: number;
  fullscreenPreferred: boolean;
};

export type GameViewportScaleInput = {
  viewportWidth: number;
  viewportHeight: number;
  displayMode?: GameDisplayMode;
  minScale?: number;
  maxScale?: number;
  outerPadding?: number;
};

export type GameViewportScaleResult = {
  viewportWidth: number;
  viewportHeight: number;
  availableWidth: number;
  availableHeight: number;
  scale: number;
  rawScale: number;
  renderedWidth: number;
  renderedHeight: number;
  displayMode: GameDisplayMode;
  minScale: number;
  maxScale: number;
  outerPadding: number;
};

export const GAME_DISPLAY_PREFERENCES_KEY = "project-genesis-display-preferences";

export const DEFAULT_GAME_DISPLAY_PREFERENCES: GameDisplayPreferences = {
  displayMode: "auto",
  minScale: 0.65,
  maxScale: 2,
  outerPadding: 16,
  fullscreenPreferred: false
};

function finitePositive(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function finiteNonNegative(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : fallback;
}

function resolveDisplayMode(value: unknown): GameDisplayMode {
  return value === "auto" || value === "fit" || value === "fill" || value === "actual" ? value : "auto";
}

export function normalizeGameDisplayPreferences(value: unknown): GameDisplayPreferences {
  if (!value || typeof value !== "object") return DEFAULT_GAME_DISPLAY_PREFERENCES;
  const record = value as Partial<GameDisplayPreferences>;
  const minScale = finitePositive(record.minScale, DEFAULT_GAME_DISPLAY_PREFERENCES.minScale);
  const maxScale = Math.max(minScale, finitePositive(record.maxScale, DEFAULT_GAME_DISPLAY_PREFERENCES.maxScale));

  return {
    displayMode: resolveDisplayMode(record.displayMode),
    minScale,
    maxScale,
    outerPadding: finiteNonNegative(record.outerPadding, DEFAULT_GAME_DISPLAY_PREFERENCES.outerPadding),
    fullscreenPreferred: record.fullscreenPreferred === true
  };
}

export function loadGameDisplayPreferences(storage: StorageService = defaultStorageService): GameDisplayPreferences {
  return normalizeGameDisplayPreferences(readStorageJson<unknown>(storage, GAME_DISPLAY_PREFERENCES_KEY, undefined));
}

export function saveGameDisplayPreferences(preferences: GameDisplayPreferences, storage: StorageService = defaultStorageService) {
  writeStorageJson(storage, GAME_DISPLAY_PREFERENCES_KEY, normalizeGameDisplayPreferences(preferences));
}

export function calculateGameViewportScale(input: GameViewportScaleInput): GameViewportScaleResult {
  const displayMode = input.displayMode ?? DEFAULT_GAME_DISPLAY_PREFERENCES.displayMode;
  const minScale = finitePositive(input.minScale, DEFAULT_GAME_DISPLAY_PREFERENCES.minScale);
  const maxScale = Math.max(minScale, finitePositive(input.maxScale, DEFAULT_GAME_DISPLAY_PREFERENCES.maxScale));
  const outerPadding = finiteNonNegative(input.outerPadding, DEFAULT_GAME_DISPLAY_PREFERENCES.outerPadding);
  const viewportWidth = Math.max(0, input.viewportWidth);
  const viewportHeight = Math.max(0, input.viewportHeight);
  const designWidth = ROBLOX_DASHBOARD_REFERENCE.width;
  const designHeight = ROBLOX_DASHBOARD_REFERENCE.height;
  const unpaddedFit = Math.min(viewportWidth / designWidth, viewportHeight / designHeight);
  const padding = unpaddedFit > 1 ? outerPadding : 0;
  const availableWidth = Math.max(0, viewportWidth - padding);
  const availableHeight = Math.max(0, viewportHeight - padding);
  const fitScale = Math.min(availableWidth / designWidth, availableHeight / designHeight);
  const fillScale = Math.max(availableWidth / designWidth, availableHeight / designHeight);
  const rawScale = displayMode === "actual" ? 1 : displayMode === "fill" ? fillScale : fitScale;
  const scale = displayMode === "actual" ? 1 : Math.max(minScale, Math.min(maxScale, rawScale));

  return {
    viewportWidth,
    viewportHeight,
    availableWidth,
    availableHeight,
    scale,
    rawScale,
    renderedWidth: designWidth * scale,
    renderedHeight: designHeight * scale,
    displayMode,
    minScale,
    maxScale,
    outerPadding
  };
}
