import type { GameRuntimeData, UpgradeCategory, UpgradeDefinition } from "@/lib/canonical-runtime";

const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  WORKFORCE: "workforce",
  INDUSTRY: "industry",
  SCIENCE: "science",
  TECHNOLOGY: "technology",
  Workforce: "workforce",
  Industry: "industry",
  Science: "science",
  Technology: "technology"
};

function normalizeCategoryId(categoryId?: string) {
  if (!categoryId) return undefined;
  const trimmed = categoryId.trim();
  return LEGACY_CATEGORY_ALIASES[trimmed] ?? trimmed.toLowerCase();
}

function categoryStatus(category: UpgradeCategory) {
  return (category as UpgradeCategory & { status?: string }).status;
}

export function resolveUpgradeCategories(runtime: GameRuntimeData): UpgradeCategory[] {
  return [...runtime.upgradeCategories]
    .filter((category) => {
      const status = categoryStatus(category);
      return status !== "hidden" && status !== "disabled" && status !== "retired";
    })
    .sort((a, b) => a.order - b.order || a.displayName.localeCompare(b.displayName));
}

export function resolveDefaultUpgradeCategory(runtime: GameRuntimeData): UpgradeCategory | undefined {
  const categories = resolveUpgradeCategories(runtime);
  return categories.find((category) => category.unlockedAtGameStart || category.unlockRequirements?.start) ?? categories[0];
}

export function resolveSelectedUpgradeCategory(runtime: GameRuntimeData, selectedCategoryId?: string): UpgradeCategory | undefined {
  const categories = resolveUpgradeCategories(runtime);
  const normalizedId = normalizeCategoryId(selectedCategoryId);
  return categories.find((category) => category.id === normalizedId) ?? resolveDefaultUpgradeCategory(runtime);
}

export function resolveUpgradesForCategory(runtime: GameRuntimeData, selectedCategoryId?: string): UpgradeDefinition[] {
  const category = resolveSelectedUpgradeCategory(runtime, selectedCategoryId);
  if (!category) return [];

  return runtime.upgrades.filter((upgrade) => normalizeCategoryId(upgrade.categoryId) === category.id);
}

export function isKnownUpgradeCategoryId(runtime: GameRuntimeData, categoryId?: string) {
  const normalizedId = normalizeCategoryId(categoryId);
  return Boolean(normalizedId && resolveUpgradeCategories(runtime).some((category) => category.id === normalizedId));
}
