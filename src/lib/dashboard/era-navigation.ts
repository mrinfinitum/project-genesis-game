import type { EraDefinition } from "@/lib/canonical-runtime";

export type FocusedDashboardEra = {
  era: EraDefinition;
  sourceIndex: number;
  state: "completed" | "current" | "locked";
};

export function getFocusedDashboardEras(eras: EraDefinition[], activeEraId: string, visibleEraCount = 3): FocusedDashboardEra[] {
  if (!eras.length) return [];

  const activeIndex = Math.max(0, eras.findIndex((era) => era.id === activeEraId));
  const cappedVisibleCount = Number.isFinite(visibleEraCount) ? Math.max(1, Math.min(3, Math.floor(visibleEraCount))) : 3;
  const sourceIndexes =
    cappedVisibleCount === 1
      ? [activeIndex]
      : cappedVisibleCount === 2
        ? activeIndex < eras.length - 1
          ? [activeIndex, activeIndex + 1]
          : [Math.max(0, activeIndex - 1), activeIndex]
        : [activeIndex - 1, activeIndex, activeIndex + 1].filter((index) => index >= 0 && index < eras.length);

  return sourceIndexes.map((sourceIndex) => ({
    era: eras[sourceIndex],
    sourceIndex,
    state: sourceIndex < activeIndex ? "completed" : sourceIndex === activeIndex ? "current" : "locked"
  }));
}
