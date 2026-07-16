import type { GameRuntimeData } from "@/lib/canonical-runtime";
import type { ExplorationDiscoveryState, ExplorationTarget } from "./types";

export type PlanetEvaluationScoreKey =
  | "colonization"
  | "mining"
  | "harvesting"
  | "research"
  | "trade"
  | "tourism"
  | "terraforming"
  | "orbitalInfrastructure"
  | "danger";

export type PlanetEvaluationScores = Record<PlanetEvaluationScoreKey, number>;

export type PlanetEvaluationActionId =
  | "colonize"
  | "mining_outpost"
  | "research_outpost"
  | "gas_harvest_platform"
  | "orbital_refinery"
  | "observation_post"
  | "archaeological_camp"
  | "deep_probe"
  | "catalog"
  | "bookmark"
  | "ignore"
  | "preserve";

export type PlanetEvaluationAction = {
  id: PlanetEvaluationActionId;
  label: string;
  reason: string;
  recommended?: boolean;
};

export type PlanetEvaluationView = {
  targetId: string;
  planetName: string;
  planetClass: string;
  discoveryState: ExplorationDiscoveryState | string;
  registryState: "Visible" | "Hidden";
  opportunityProfile: {
    id: string;
    displayName: string;
    source: "studio" | "derived-fallback";
    missingStudioOpportunityProfiles: boolean;
    supportsColonization: boolean;
    tags: string[];
  };
  scores: PlanetEvaluationScores;
  dangerLabel: "Low" | "Medium" | "High" | "Critical";
  recommendedActions: PlanetEvaluationAction[];
  validActions: PlanetEvaluationAction[];
};

type StudioOpportunityProfile = {
  id: string;
  displayName: string;
  classHints: string[];
  tags: string[];
  supportsColonization?: boolean;
  scores: Partial<PlanetEvaluationScores>;
};

const OPPORTUNITY_PROFILE_KEYS = [
  "planetOpportunityProfiles",
  "opportunityProfiles",
  "planetEvaluationProfiles",
  "celestialOpportunityProfiles"
];

const SCORE_KEYS: PlanetEvaluationScoreKey[] = [
  "colonization",
  "mining",
  "harvesting",
  "research",
  "trade",
  "tourism",
  "terraforming",
  "orbitalInfrastructure",
  "danger"
];

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function titleCase(value: string) {
  return value
    .replaceAll(/[_-]+/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
    .replaceAll(/\b\w/g, (character) => character.toUpperCase());
}

function runtimeRecord(content: GameRuntimeData) {
  return content as GameRuntimeData & Record<string, unknown>;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  if (typeof value === "string" && value.length > 0) return [value];
  return [];
}

function numberScore(raw: Record<string, unknown>, key: PlanetEvaluationScoreKey) {
  const direct = raw[key];
  if (typeof direct === "number" && Number.isFinite(direct)) return clampPercent(direct);
  const percent = raw[`${key}Percent`];
  if (typeof percent === "number" && Number.isFinite(percent)) return clampPercent(percent);
  const score = raw[`${key}Score`];
  if (typeof score === "number" && Number.isFinite(score)) return clampPercent(score);
  return undefined;
}

function normalizeStudioProfile(raw: unknown): StudioOpportunityProfile | undefined {
  const source = record(raw);
  const id = typeof source.id === "string" ? source.id : typeof source.profileId === "string" ? source.profileId : "";
  if (!id) return undefined;
  const opportunity = record(source.opportunityProfile ?? source.opportunities ?? source.scores);
  const classHints = [
    ...stringArray(source.planetClass),
    ...stringArray(source.planetClassId),
    ...stringArray(source.classification),
    ...stringArray(source.appliesTo),
    ...stringArray(source.targetClass),
    ...stringArray(source.classHints)
  ].map((value) => value.toLowerCase());
  const tags = [
    ...stringArray(source.tags),
    ...stringArray(source.worldTags),
    ...stringArray(source.archetype)
  ].map((value) => value.toLowerCase());
  const scores = SCORE_KEYS.reduce<Partial<PlanetEvaluationScores>>((accumulator, key) => {
    const value = numberScore(source, key) ?? numberScore(opportunity, key);
    if (value !== undefined) accumulator[key] = value;
    return accumulator;
  }, {});
  const supportsColonization = typeof source.supportsColonization === "boolean"
    ? source.supportsColonization
    : typeof source.canColonize === "boolean"
      ? source.canColonize
      : typeof record(source.colonization).supported === "boolean"
        ? record(source.colonization).supported as boolean
        : undefined;
  return {
    id,
    displayName: typeof source.displayName === "string" ? source.displayName : titleCase(id),
    classHints,
    tags,
    supportsColonization,
    scores
  };
}

export function readStudioOpportunityProfiles(content: GameRuntimeData): StudioOpportunityProfile[] {
  const data = runtimeRecord(content);
  return OPPORTUNITY_PROFILE_KEYS.flatMap((key) => {
    const value = data[key];
    return Array.isArray(value) ? value.map(normalizeStudioProfile).filter((profile): profile is StudioOpportunityProfile => Boolean(profile)) : [];
  });
}

function hash(input: string) {
  let state = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    state ^= input.charCodeAt(index);
    state = Math.imul(state, 0x01000193);
  }
  return state >>> 0;
}

function scoreFor(target: ExplorationTarget, key: PlanetEvaluationScoreKey, min: number, max: number) {
  const unit = (hash(`${target.id}:${key}`) % 10_000) / 10_000;
  return clampPercent(min + unit * (max - min));
}

function targetWords(target: ExplorationTarget) {
  return `${target.label} ${target.classification ?? ""} ${target.id}`.toLowerCase();
}

function derivedTags(target: ExplorationTarget) {
  const words = targetWords(target);
  return {
    gas: /\bgas\b|jovian|giant/.test(words),
    dead: /dead|barren|airless|tomb|ruin|waste/.test(words),
    unique: /unique|living|artifact|ancient|relic|exotic|preserve|sanctuary/.test(words),
    oceanic: /ocean|water|marine/.test(words),
    ice: /\bice\b|frozen|glacial/.test(words)
  };
}

function derivedScores(target: ExplorationTarget): PlanetEvaluationScores {
  const tags = derivedTags(target);
  if (tags.gas) {
    return {
      colonization: 0,
      mining: scoreFor(target, "mining", 38, 62),
      harvesting: scoreFor(target, "harvesting", 82, 96),
      research: scoreFor(target, "research", 58, 78),
      trade: scoreFor(target, "trade", 28, 54),
      tourism: scoreFor(target, "tourism", 8, 32),
      terraforming: 0,
      orbitalInfrastructure: scoreFor(target, "orbitalInfrastructure", 74, 92),
      danger: scoreFor(target, "danger", 36, 62)
    };
  }
  if (tags.dead) {
    return {
      colonization: scoreFor(target, "colonization", 0, 18),
      mining: scoreFor(target, "mining", 72, 92),
      harvesting: scoreFor(target, "harvesting", 12, 36),
      research: scoreFor(target, "research", 66, 88),
      trade: scoreFor(target, "trade", 6, 28),
      tourism: scoreFor(target, "tourism", 8, 26),
      terraforming: scoreFor(target, "terraforming", 42, 72),
      orbitalInfrastructure: scoreFor(target, "orbitalInfrastructure", 45, 74),
      danger: scoreFor(target, "danger", 38, 70)
    };
  }
  if (tags.unique) {
    return {
      colonization: 0,
      mining: scoreFor(target, "mining", 12, 42),
      harvesting: scoreFor(target, "harvesting", 6, 28),
      research: scoreFor(target, "research", 86, 98),
      trade: scoreFor(target, "trade", 18, 46),
      tourism: scoreFor(target, "tourism", 66, 92),
      terraforming: 0,
      orbitalInfrastructure: scoreFor(target, "orbitalInfrastructure", 38, 64),
      danger: scoreFor(target, "danger", 22, 56)
    };
  }
  return {
    colonization: scoreFor(target, "colonization", tags.oceanic ? 78 : tags.ice ? 48 : 58, tags.oceanic ? 96 : tags.ice ? 74 : 92),
    mining: scoreFor(target, "mining", 26, 84),
    harvesting: scoreFor(target, "harvesting", 24, 72),
    research: scoreFor(target, "research", 34, 86),
    trade: scoreFor(target, "trade", 28, 78),
    tourism: scoreFor(target, "tourism", 22, 82),
    terraforming: scoreFor(target, "terraforming", 18, 76),
    orbitalInfrastructure: scoreFor(target, "orbitalInfrastructure", 34, 82),
    danger: scoreFor(target, "danger", 4, 48)
  };
}

function mergeScores(base: PlanetEvaluationScores, profile?: StudioOpportunityProfile): PlanetEvaluationScores {
  return SCORE_KEYS.reduce<PlanetEvaluationScores>((accumulator, key) => {
    accumulator[key] = profile?.scores[key] ?? base[key];
    return accumulator;
  }, { ...base });
}

function findStudioProfile(content: GameRuntimeData, target: ExplorationTarget) {
  const profiles = readStudioOpportunityProfiles(content);
  if (!profiles.length) return undefined;
  const words = targetWords(target);
  return profiles.find((profile) => profile.classHints.some((hint) => hint && words.includes(hint)))
    ?? profiles.find((profile) => profile.tags.some((tag) => tag && words.includes(tag)))
    ?? profiles[0];
}

function dangerLabel(score: number): PlanetEvaluationView["dangerLabel"] {
  if (score >= 80) return "Critical";
  if (score >= 56) return "High";
  if (score >= 32) return "Medium";
  return "Low";
}

function action(id: PlanetEvaluationActionId, label: string, reason: string, recommended = false): PlanetEvaluationAction {
  return { id, label, reason, recommended };
}

function validActions(target: ExplorationTarget, scores: PlanetEvaluationScores, supportsColonization: boolean) {
  const tags = derivedTags(target);
  const actions: PlanetEvaluationAction[] = [];
  if (supportsColonization) actions.push(action("colonize", "Colonize", `${scores.colonization}% colonization opportunity`, scores.colonization >= Math.max(scores.mining, scores.research, 60)));
  if (scores.mining >= 40) actions.push(action("mining_outpost", "Build Mining Outpost", `${scores.mining}% mining opportunity`, !supportsColonization && scores.mining >= scores.research && scores.mining >= 55));
  if (scores.research >= 45) actions.push(action("research_outpost", "Build Research Outpost", `${scores.research}% research opportunity`, !supportsColonization && scores.research > scores.mining && scores.research >= 60));
  if (tags.gas || scores.harvesting >= 70) actions.push(action("gas_harvest_platform", "Gas Harvest Platform", `${scores.harvesting}% harvesting opportunity`, tags.gas && scores.harvesting >= 70));
  if (tags.gas || scores.orbitalInfrastructure >= 55) actions.push(action("orbital_refinery", "Orbital Refinery", `${scores.orbitalInfrastructure}% orbital infrastructure opportunity`));
  if (scores.research >= 50 || scores.tourism >= 45) actions.push(action("observation_post", "Observation Post", "Monitor discoveries without disturbing the world"));
  if (tags.dead || tags.unique || scores.research >= 78) actions.push(action("archaeological_camp", "Archaeological Camp", "Investigate ruins, artifacts, or deep history"));
  if (tags.unique) actions.push(action("preserve", "Preservation", "Protect a unique world instead of colonizing it", true));
  actions.push(action("deep_probe", "Deep Probe", "Launch deeper instrumentation"));
  actions.push(action("catalog", "Catalog", "Add current findings to the registry"));
  actions.push(action("bookmark", "Bookmark", "Track this world for later"));
  actions.push(action("ignore", "Ignore", "Leave this world unclaimed"));
  return actions;
}

function recommendations(actions: PlanetEvaluationAction[], scores: PlanetEvaluationScores) {
  const preferred = actions.filter((candidate) => candidate.recommended);
  if (preferred.length) return preferred.slice(0, 3);
  return [
    actions.find((candidate) => candidate.id === "colonize" && scores.colonization >= 60),
    actions.find((candidate) => candidate.id === "mining_outpost" && scores.mining >= 55),
    actions.find((candidate) => candidate.id === "research_outpost" && scores.research >= 60)
  ].filter((candidate): candidate is PlanetEvaluationAction => Boolean(candidate)).slice(0, 3);
}

export function resolvePlanetEvaluation(content: GameRuntimeData, target: ExplorationTarget, options: { discoveryState?: ExplorationDiscoveryState | string; canShowRegistry?: boolean } = {}): PlanetEvaluationView | undefined {
  if (target.type !== "planet" && target.type !== "moon") return undefined;
  const studioProfile = findStudioProfile(content, target);
  const scores = mergeScores(derivedScores(target), studioProfile);
  const tags = derivedTags(target);
  const supportsColonization = studioProfile?.supportsColonization ?? (!tags.gas && !tags.dead && !tags.unique && scores.colonization >= 50);
  const actions = validActions(target, scores, supportsColonization);
  const missingStudioOpportunityProfiles = readStudioOpportunityProfiles(content).length === 0;
  const planetClass = target.classification ?? (tags.gas ? "Gas Giant" : tags.dead ? "Dead World" : tags.unique ? "Unique World" : "Unknown Class");
  return {
    targetId: target.id,
    planetName: target.label,
    planetClass,
    discoveryState: options.discoveryState ?? "unknown",
    registryState: options.canShowRegistry ? "Visible" : "Hidden",
    opportunityProfile: {
      id: studioProfile?.id ?? `derived:${planetClass.toLowerCase().replaceAll(/\s+/g, "-")}`,
      displayName: studioProfile?.displayName ?? `${titleCase(planetClass)} Opportunity`,
      source: studioProfile ? "studio" : "derived-fallback",
      missingStudioOpportunityProfiles,
      supportsColonization,
      tags: [
        ...(tags.gas ? ["gas-giant"] : []),
        ...(tags.dead ? ["dead-world"] : []),
        ...(tags.unique ? ["unique-world"] : []),
        ...(tags.oceanic ? ["oceanic"] : []),
        ...(tags.ice ? ["ice"] : []),
        ...(studioProfile?.tags ?? [])
      ]
    },
    scores,
    dangerLabel: dangerLabel(scores.danger),
    recommendedActions: recommendations(actions, scores),
    validActions: actions
  };
}
