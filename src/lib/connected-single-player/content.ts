import { CONTENT_VERSION, type CanonicalContentManifest } from "./types";

export const canonicalContent: CanonicalContentManifest = {
  contentVersion: CONTENT_VERSION,
  eras: ["Dawnflight", "Orbital", "Interstellar", "Continuum"],
  researchIds: ["stellar-cartography", "biosphere-cultivation", "orbital-industry", "jump-lattice"],
  planetArchetypes: ["temperate", "oceanic", "desert", "ice", "volcanic", "anomaly"],
  weeklyChallengeIds: ["frontier-surge", "cartographer-week", "colony-chain"]
};
