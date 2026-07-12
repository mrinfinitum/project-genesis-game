import type { AssetDefinition, ResourceDefinition, UpgradeDefinition } from "./types";

export interface RuntimeAssetResolution {
  kind: "web-path" | "local-registry" | "placeholder";
  path?: string;
  className: string;
  label: string;
  artworkNeeded: boolean;
  objectPosition?: string;
}

export const heroCropSettings: Record<string, { objectPosition: string; overlayOpacity: number; focalPoint: string }> = {
  "era-survival": { objectPosition: "50% 42%", overlayOpacity: 0.42, focalPoint: "center upper-mid" },
  "era-ancient": { objectPosition: "50% 46%", overlayOpacity: 0.42, focalPoint: "center" },
  "era-medieval": { objectPosition: "50% 44%", overlayOpacity: 0.42, focalPoint: "center upper-mid" },
  "era-renaissance": { objectPosition: "50% 44%", overlayOpacity: 0.42, focalPoint: "center upper-mid" },
  "era-industrial": { objectPosition: "52% 45%", overlayOpacity: 0.44, focalPoint: "right-center" },
  "era-modern": { objectPosition: "50% 45%", overlayOpacity: 0.42, focalPoint: "center" },
  "era-space-age": { objectPosition: "50% 40%", overlayOpacity: 0.4, focalPoint: "upper-center" },
  "era-interstellar": { objectPosition: "50% 42%", overlayOpacity: 0.42, focalPoint: "upper-center" },
  "era-galactic": { objectPosition: "50% 42%", overlayOpacity: 0.42, focalPoint: "upper-center" }
};

export const localArtRegistry: Record<string, Omit<RuntimeAssetResolution, "artworkNeeded">> = {
  "resource-iron": {
    kind: "local-registry",
    className: "from-zinc-300 via-slate-500 to-zinc-800",
    label: "Fe"
  },
  "resource-fresh-water": {
    kind: "local-registry",
    className: "from-cyan-100 via-sky-300 to-blue-700",
    label: "H2O"
  },
  "resource-stone": {
    kind: "local-registry",
    className: "from-stone-200 via-stone-500 to-stone-900",
    label: "STO"
  },
  "era-survival": {
    kind: "local-registry",
    className: "from-emerald-200 via-lime-500 to-stone-900",
    label: "S",
    objectPosition: heroCropSettings["era-survival"].objectPosition
  },
  "upgrade-category-workforce": {
    kind: "local-registry",
    className: "from-amber-200 via-orange-500 to-red-950",
    label: "WRK"
  },
  "upgrade-category-industry": {
    kind: "local-registry",
    className: "from-zinc-200 via-slate-500 to-cyan-950",
    label: "IND"
  },
  "upgrade-category-science": {
    kind: "local-registry",
    className: "from-cyan-100 via-sky-400 to-indigo-950",
    label: "SCI"
  },
  "upgrade-category-technology": {
    kind: "local-registry",
    className: "from-fuchsia-200 via-violet-500 to-slate-950",
    label: "TEC"
  }
};

function initials(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  return words.length > 1 ? words.slice(0, 3).map((word) => word[0]?.toUpperCase()).join("") : value.slice(0, 3).toUpperCase();
}

export function resolveRuntimeAsset(
  item: ResourceDefinition | UpgradeDefinition | { artKey?: string; iconKey?: string; name: string; displayName?: string },
  asset?: AssetDefinition
): RuntimeAssetResolution {
  const webPath = asset?.platformMappings?.web?.path;

  if (webPath) {
    return {
      kind: "web-path",
      path: webPath,
      className: "from-slate-700 via-slate-800 to-black",
      label: item.displayName ? initials(item.displayName) : initials(item.name),
      artworkNeeded: false
    };
  }

  const key = ("artKey" in item ? item.artKey : undefined) || item.iconKey || asset?.artKey;
  const local = key ? localArtRegistry[key] : undefined;

  if (local) {
    return {
      ...local,
      artworkNeeded: false
    };
  }

  return {
    kind: "placeholder",
    className: "from-slate-500 via-teal-700 to-amber-600",
    label: item.displayName ? initials(item.displayName) : initials(item.name),
    artworkNeeded: true
  };
}
