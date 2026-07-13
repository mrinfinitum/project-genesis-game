import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Coins,
  Compass,
  Crown,
  FlaskConical,
  Gem,
  Gauge,
  Globe2,
  Hammer,
  Hexagon,
  ImageIcon,
  Leaf,
  Lock,
  MousePointerClick,
  Orbit,
  Rocket,
  Settings,
  Shield,
  Sparkles,
  Star,
  Trophy,
  Zap
} from "lucide-react";
import { createDashboardArtMap, getDashboardArtAudit, heroCropSettings, resolveRuntimeAsset, type DashboardArtKey, type DashboardArtResolution, type RuntimeAssetResolution } from "@/lib/canonical-runtime";
import type { AssetDefinition, EraDefinition, GameRuntimeData, ResourceDefinition, RuntimeContentState, UpgradeCategory, UpgradeDefinition } from "@/lib/canonical-runtime";
import { CANONICAL_ALIGNMENT_AXES, createDashboardModel, type DashboardModel, type DashboardPlayerState } from "@/lib/dashboard/dashboard-model";
import { ROBLOX_DASHBOARD_LAYOUT, ROBLOX_DASHBOARD_REFERENCE } from "@/lib/dashboard/dashboard-layout";
import { genesisTokens, tokenStyle, type AlignmentName } from "./design-tokens";
import robloxReferenceManifest from "../../design-reference/roblox/reference-manifest.json";

type PanelProps = {
  title?: string;
  eyebrow?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export type UpgradeState = "available" | "affordable" | "unaffordable" | "locked" | "unknown" | "max";
export type ParityStatus = "Not Started" | "In Progress" | "Close" | "Approved";
export type ParityMode = "reference" | "implementation" | "side-by-side" | "overlay";

type RobloxReference = {
  id: string;
  screen: string;
  filename: string;
  viewportWidth: number;
  viewportHeight: number;
  notes: string;
  status: string;
};

const robloxReferences = robloxReferenceManifest as RobloxReference[];

const shellStyle = tokenStyle();
const dashboardDevToolsEnabled = import.meta.env.VITE_ENABLE_DEV_TOOLS === "true";

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "production", label: "Production", icon: Hammer },
  { id: "research", label: "Research", icon: FlaskConical },
  { id: "civilization", label: "Civilization", icon: Crown },
  { id: "earth", label: "Earth", icon: Globe2 },
  { id: "solar", label: "Solar", icon: Orbit },
  { id: "journal", label: "Journal", icon: Compass }
];

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: value > 9999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function findAsset(assets: AssetDefinition[], key?: string) {
  if (!key) return undefined;
  return assets.find((asset) => asset.artKey === key || asset.id === key || asset.name === key);
}

function panelClasses(extra = "") {
  return `rounded-[var(--genesis-radius-panel)] border border-[var(--genesis-panel-line)] bg-[image:var(--genesis-panel-gradient)] shadow-[var(--genesis-shadow-panel)] ring-1 ring-white/[0.03] ${extra}`;
}

export function StatusBadge({ label, tone = "cyan" }: { label: string; tone?: "cyan" | "gold" | "danger" | "success" | "muted" }) {
  const tones = {
    cyan: "border-cyan-300/35 bg-cyan-400/10 text-cyan-100",
    gold: "border-amber-300/40 bg-amber-400/12 text-amber-100",
    danger: "border-rose-300/45 bg-rose-400/12 text-rose-100",
    success: "border-emerald-300/40 bg-emerald-400/12 text-emerald-100",
    muted: "border-slate-300/20 bg-slate-400/10 text-slate-200"
  };

  return <span className={`inline-flex h-7 items-center rounded-md border px-2 text-xs font-semibold uppercase ${tones[tone]}`}>{label}</span>;
}

export function ProgressMeter({ value, max = 100, label }: { value: number; max?: number; label?: string }) {
  const percent = Math.max(0, Math.min(100, (value / Math.max(1, max)) * 100));

  return (
    <div className="space-y-1">
      {label ? (
        <div className="flex items-center justify-between text-xs uppercase text-cyan-100/70">
          <span>{label}</span>
          <span>{Math.round(percent)}%</span>
        </div>
      ) : null}
      <div className="h-2 overflow-hidden rounded-md border border-cyan-200/15 bg-black/30">
        <div className="h-full rounded-md bg-gradient-to-r from-cyan-300 via-teal-300 to-amber-300" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function Panel({ title, eyebrow, action, children, className = "" }: PanelProps) {
  return (
    <section className={panelClasses(`p-3 ${className}`)}>
      {(title || eyebrow || action) && (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            {eyebrow ? <div className="text-[11px] font-semibold uppercase text-cyan-100/55">{eyebrow}</div> : null}
            {title ? <h2 className="text-base font-semibold text-white">{title}</h2> : null}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function ArtworkFallback({ label, artworkNeeded = true, className = "" }: { label: string; artworkNeeded?: boolean; className?: string }) {
  return (
    <div className={`relative flex h-full min-h-28 items-center justify-center overflow-hidden rounded-md border border-cyan-200/20 bg-gradient-to-br from-slate-700 via-cyan-950 to-fuchsia-950 ${className}`}>
      <div className="absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(125,249,255,0.09)_1px,transparent_1px),linear-gradient(90deg,rgba(125,249,255,0.08)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div className="relative flex h-16 w-16 items-center justify-center rounded-md border border-cyan-100/35 bg-black/35 text-lg font-black text-cyan-50 shadow-[0_0_26px_rgba(45,212,255,0.22)]">
        {label}
      </div>
      {artworkNeeded ? (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-md border border-amber-200/35 bg-amber-950/75 px-2 py-1 text-[10px] font-bold uppercase text-amber-100">
          <ImageIcon className="h-3 w-3" />
          Artwork Needed
        </div>
      ) : null}
    </div>
  );
}

function ArtworkFrame({ art, className = "" }: { art: RuntimeAssetResolution; className?: string }) {
  const [failed, setFailed] = useState(false);

  if (art.path && !failed) {
    return (
      <div className={`relative overflow-hidden rounded-md border border-cyan-200/20 bg-gradient-to-br ${art.className} ${className}`}>
        <img src={art.path} alt="" className="h-full w-full object-cover" style={{ objectPosition: art.objectPosition ?? "50% 50%" }} onError={() => setFailed(true)} />
      </div>
    );
  }

  return <ArtworkFallback label={art.label} artworkNeeded={art.artworkNeeded || failed} className={`bg-gradient-to-br ${art.className} ${className}`} />;
}

export function TopResourceHud({ resources, assets, highValues = false, gaining = false, compact = false }: { resources: ResourceDefinition[]; assets: AssetDefinition[]; highValues?: boolean; gaining?: boolean; compact?: boolean }) {
  const visible = resources.slice(0, compact ? 4 : 7);

  return (
    <header className={panelClasses("flex h-[70px] items-center gap-3 px-4 py-2")}>
      <div className="flex h-11 w-11 items-center justify-center rounded-md border border-cyan-200/35 bg-cyan-300/14 text-cyan-100 shadow-[0_0_22px_rgba(45,212,255,0.24)]">
        <Rocket className="h-5 w-5" />
      </div>
      <div className="min-w-40">
        <div className="text-xs uppercase text-cyan-100/55">Project Genesis</div>
        <div className="text-xl font-black leading-none text-white">Civilization Core</div>
      </div>
      <div className="grid flex-1 grid-cols-4 gap-2 xl:grid-cols-7">
        {visible.map((resource, index) => {
          const art = resolveRuntimeAsset(resource, findAsset(assets, resource.iconKey) ?? findAsset(assets, resource.artKey));
          return (
            <div key={resource.id} className="group flex h-11 min-w-0 items-center gap-2 rounded-md border border-cyan-200/12 bg-black/30 px-2 transition hover:border-cyan-200/35 hover:bg-cyan-300/10">
              <ArtworkFrame art={art} className="h-8 w-8 shrink-0" />
              <div className="min-w-0">
                <div className="truncate text-[11px] font-semibold text-cyan-100/65">{resource.displayName}</div>
                <div className="text-sm font-black text-white">{compactNumber(highValues ? (index + 1) * 1294000 : (index + 2) * 18)}</div>
              </div>
              {gaining ? <span className="ml-auto rounded-sm bg-emerald-300/15 px-1.5 py-0.5 text-xs font-black text-emerald-100">+{index + 1}</span> : null}
            </div>
          );
        })}
      </div>
      <StatusBadge label="Local Save" tone="success" />
      <div className="flex items-center gap-2 border-l border-cyan-200/18 pl-3">
        {[Settings, CircleHelp].map((Icon, index) => (
          <button key={index} className="flex h-9 w-9 items-center justify-center rounded-md border border-cyan-200/18 bg-black/25 text-cyan-100/75 transition hover:border-cyan-200/38 hover:text-white active:translate-y-px">
            <Icon className="h-4 w-4" />
          </button>
        ))}
      </div>
    </header>
  );
}

export function SidebarNavigation({ active = "dashboard" }: { active?: string }) {
  return (
    <nav className={panelClasses("flex h-full w-[104px] flex-col gap-2 p-2")}>
      <div className="mb-1 flex flex-col items-center gap-1 px-1 text-[10px] font-semibold uppercase text-cyan-100/55">
        <Hexagon className="h-4 w-4" />
        Nav
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = item.id === active;
        return (
          <button
            key={item.id}
            className={`flex h-[72px] flex-col items-center justify-center gap-1 rounded-md border px-1 text-center text-[11px] font-black uppercase leading-tight transition active:translate-y-px ${
              isActive ? "border-cyan-200/60 bg-cyan-300/16 text-white shadow-[0_0_22px_rgba(45,212,255,0.24)]" : "border-white/8 bg-white/[0.03] text-cyan-100/68 hover:border-cyan-200/35 hover:bg-cyan-300/8 hover:text-white"
            }`}
          >
            <Icon className="h-5 w-5" />
            {item.label}
          </button>
        );
      })}
      <div className="mt-auto rounded-md border border-fuchsia-200/24 bg-fuchsia-400/12 p-2 text-center shadow-[0_0_24px_rgba(217,70,239,0.14)]">
        <div className="text-[10px] uppercase text-fuchsia-100/60">Boost</div>
        <div className="mt-1 text-base font-black text-white">02:14</div>
        <ProgressMeter value={67} />
      </div>
    </nav>
  );
}

export function HeroObjectivePanel({ era, resources, assets }: { era: EraDefinition; resources: ResourceDefinition[]; assets: AssetDefinition[] }) {
  const focusResource = resources[0];
  const art = resolveRuntimeAsset(era, findAsset(assets, era.artKey));
  const crop = era.artKey ? heroCropSettings[era.artKey] : undefined;

  return (
    <Panel className="min-h-[324px] overflow-hidden p-0">
      <div className="relative min-h-[324px] overflow-hidden bg-[image:var(--genesis-hero-gradient)] p-4">
        <div className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_center,rgba(125,249,255,0.18)_1px,transparent_1px)] [background-size:30px_30px]" />
        <div className="absolute inset-y-4 right-4 w-[48%]">
          <ArtworkFrame art={{ ...art, objectPosition: art.objectPosition ?? crop?.objectPosition }} className="h-full min-h-[292px] w-full shadow-[0_0_34px_rgba(45,212,255,0.22)]" />
          <div className="absolute inset-0 rounded-md bg-black" style={{ opacity: crop?.overlayOpacity ?? 0.42 }} />
        </div>
        <div className="relative flex min-h-[292px] max-w-[62%] flex-col justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <StatusBadge label={`${era.displayName} Era`} tone="cyan" />
              <StatusBadge label="Main Objective" tone="gold" />
            </div>
            <h1 className="max-w-3xl text-[2.55rem] font-black leading-[1.02] text-white [text-shadow:0_0_18px_rgba(45,212,255,0.22)]">Stabilize the first civilization loop</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50/76">{era.description}</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md border border-cyan-200/24 bg-black/34 p-3">
              <div className="text-xs uppercase text-cyan-100/55">Focus</div>
              <div className="mt-1 text-lg font-black text-white">{focusResource?.displayName ?? "Resource"}</div>
            </div>
            <div className="rounded-md border border-cyan-200/24 bg-black/34 p-3">
              <div className="text-xs uppercase text-cyan-100/55">Discovery</div>
              <div className="mt-1 text-lg font-black text-white">32%</div>
            </div>
            <div className="rounded-md border border-cyan-200/24 bg-black/34 p-3">
              <div className="text-xs uppercase text-cyan-100/55">Automation</div>
              <div className="mt-1 text-lg font-black text-white">Tier 1</div>
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function ManualProductionPanel({ clickPower = 5, resourceName = "Labor" }: { clickPower?: number; resourceName?: string }) {
  return (
    <Panel title="Manual Production" eyebrow="Click Loop" action={<MousePointerClick className="h-5 w-5 text-cyan-200" />}>
      <button className="relative flex h-28 w-full items-center justify-center overflow-hidden rounded-md border border-cyan-200/45 bg-cyan-300/14 text-2xl font-black text-white shadow-[0_0_30px_rgba(45,212,255,0.22)] transition hover:bg-cyan-300/20 active:translate-y-px active:scale-[0.99]">
        <span className="absolute inset-0 opacity-45 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.2),transparent_42%)]" />
        <span className="relative">+{clickPower} {resourceName}</span>
      </button>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-md bg-black/25 p-2 text-cyan-100/70">Combo x1.4</div>
        <div className="rounded-md bg-black/25 p-2 text-cyan-100/70">Crit 8%</div>
      </div>
    </Panel>
  );
}

export function AutomationPanel() {
  const automationNames: string[] = [];

  return (
    <Panel title="Automation" eyebrow="Local Simulation" action={<Bot className="h-5 w-5 text-emerald-200" />}>
      <div className="space-y-2">
        {automationNames.length ? automationNames.map((name, index) => (
          <div key={name} className="rounded-md border border-white/10 bg-black/28 p-3 transition hover:border-cyan-200/28 hover:bg-cyan-300/8">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-white">{name}</div>
              <StatusBadge label={index === 2 ? "Locked" : "Active"} tone={index === 2 ? "muted" : "success"} />
            </div>
            <ProgressMeter value={index === 2 ? 24 : 70 - index * 18} label={index === 2 ? "Unlock" : "Cycle"} />
          </div>
        )) : <div className="rounded-md border border-cyan-200/16 bg-black/24 p-3 text-sm font-bold text-cyan-50/70">Prototype State</div>}
      </div>
    </Panel>
  );
}

export function CriticalStatsPanel() {
  return (
    <Panel title="Critical Stats" eyebrow="Civilization">
      <div className="grid grid-cols-2 gap-2">
        {[
          ["Power", "1.8K"],
          ["Population", "426"],
          ["Research", "91"],
          ["Stability", "84%"]
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-white/10 bg-black/25 p-3">
            <div className="text-xs uppercase text-cyan-100/55">{label}</div>
            <div className="mt-1 text-xl font-black text-white">{value}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function EraProgressRail({ eras, activeEraId, lockedFromIndex }: { eras: EraDefinition[]; activeEraId: string; lockedFromIndex?: number }) {
  return (
    <Panel title="Era Progression" eyebrow="Timeline">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {eras.map((era, index) => {
          const active = era.id === activeEraId;
          const locked = typeof lockedFromIndex === "number" && index >= lockedFromIndex;
          const eraColor = genesisTokens.era[era.id as keyof typeof genesisTokens.era] ?? genesisTokens.color.cyan;
          return (
            <div key={era.id} className="flex min-w-[8.75rem] items-center gap-2">
              <div
                className={`flex h-[3.35rem] flex-1 flex-col justify-center rounded-md border px-3 transition ${active ? "bg-cyan-300/16 text-white shadow-[0_0_18px_rgba(45,212,255,0.16)]" : locked ? "bg-slate-500/8 text-slate-300/55" : "bg-black/28 text-cyan-100/75 hover:border-cyan-200/25"}`}
                style={{ borderColor: active ? eraColor : "rgba(255,255,255,0.12)", boxShadow: active ? `0 0 18px ${eraColor}35` : undefined }}
              >
                <div className="text-xs font-bold uppercase">{locked ? "Locked" : active ? "Active" : "Open"}</div>
                <div className="truncate text-sm font-black">{era.displayName}</div>
              </div>
              {index < eras.length - 1 ? <ChevronRight className="h-4 w-4 shrink-0 text-cyan-100/35" /> : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function CurrentEraJourney({ eras, activeEraId }: { eras: EraDefinition[]; activeEraId: string }) {
  const activeIndex = Math.max(0, eras.findIndex((era) => era.id === activeEraId));
  const previous = eras[Math.max(0, activeIndex - 1)];
  const current = eras[activeIndex] ?? eras[0];
  const next = eras[Math.min(eras.length - 1, activeIndex + 1)];
  const journey = [
    { label: "Previous", era: previous, tone: "muted" as const },
    { label: "Current", era: current, tone: "cyan" as const },
    { label: "Next", era: next, tone: "gold" as const }
  ];

  return (
    <Panel title="Current Journey" eyebrow={`${eras.length}-era progression`} action={<button className="h-8 rounded-md border border-cyan-200/30 bg-cyan-300/10 px-3 text-xs font-black uppercase text-cyan-100 transition hover:bg-cyan-300/18 active:translate-y-px">View Full Timeline</button>}>
      <div className="grid grid-cols-[1fr_1.2fr_1fr] gap-2">
        {journey.map(({ label, era, tone }) => {
          const color = genesisTokens.era[era?.id as keyof typeof genesisTokens.era] ?? genesisTokens.color.cyan;
          const isCurrent = label === "Current";
          return (
            <div key={`${label}-${era?.id}`} className={`relative min-h-20 rounded-md border bg-black/30 p-3 ${isCurrent ? "shadow-[0_0_24px_rgba(45,212,255,0.18)]" : ""}`} style={{ borderColor: isCurrent ? color : "rgba(255,255,255,0.12)" }}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <StatusBadge label={label} tone={tone} />
                <span className="text-xs font-black text-cyan-100/45">#{era?.index ?? "-"}</span>
              </div>
              <div className="truncate text-lg font-black text-white">{era?.displayName ?? "Unknown"}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-cyan-50/62">{era?.description ?? "Awaiting canonical era data."}</p>
              {isCurrent ? <div className="absolute inset-x-3 bottom-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" /> : null}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function UpgradeCategoryTabs({ categories, activeCategoryId }: { categories: UpgradeCategory[]; activeCategoryId: string }) {
  return (
    <div className="grid grid-cols-4 gap-2">
      {categories.map((category) => {
        const active = category.id === activeCategoryId;
        return (
          <button key={category.id} className={`h-11 rounded-md border px-3 text-sm font-bold transition active:translate-y-px ${active ? "border-cyan-200/60 bg-cyan-300/16 text-white shadow-[0_0_18px_rgba(45,212,255,0.18)]" : "border-white/10 bg-white/[0.04] text-cyan-100/68 hover:border-cyan-200/35 hover:bg-cyan-300/8"}`}>
            {category.displayName}
          </button>
        );
      })}
    </div>
  );
}

export function LockedOverlay({ label = "Locked" }: { label?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/68 backdrop-blur-[1px]">
      <div className="flex items-center gap-2 rounded-md border border-slate-200/20 bg-slate-950/80 px-3 py-2 text-sm font-bold text-slate-100">
        <Lock className="h-4 w-4" />
        {label}
      </div>
    </div>
  );
}

export function UnknownUpgradeCard() {
  return (
    <article className={panelClasses("relative min-h-28 p-3")}>
      <div className="flex items-center gap-3">
        <ArtworkFallback label="?" className="h-16 min-h-16 w-16" />
        <div>
          <div className="text-sm font-black text-white">Unknown Upgrade</div>
          <div className="mt-1 text-xs text-cyan-100/60">Advance eras to reveal this technology.</div>
        </div>
      </div>
    </article>
  );
}

export function UpgradeCard({ upgrade, assets, state = "available", level = 0, longName = false }: { upgrade: UpgradeDefinition; assets: AssetDefinition[]; state?: UpgradeState; level?: number; longName?: boolean }) {
  if (state === "unknown") return <UnknownUpgradeCard />;
  const art = resolveRuntimeAsset(upgrade, findAsset(assets, upgrade.iconKey));
  const locked = state === "locked";
  const maxed = state === "max" || level >= upgrade.maxLevel;
  const costTone = state === "unaffordable" ? "text-rose-200" : "text-amber-100";

  return (
    <article className={panelClasses(`relative grid min-h-[6.85rem] grid-cols-[4.5rem_1fr_auto] gap-3 p-3 transition hover:border-cyan-200/35 hover:bg-cyan-300/8 ${state === "affordable" ? "border-emerald-200/40 shadow-[0_0_26px_rgba(52,211,153,0.2)]" : ""}`)}>
      <ArtworkFrame art={art} className="h-[4.5rem] min-h-[4.5rem] w-[4.5rem]" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-black text-white">{longName ? `${upgrade.displayName} With Extended Experimental Civilization Scaling` : upgrade.displayName}</h3>
          {maxed ? <StatusBadge label="Max" tone="success" /> : null}
        </div>
        <p className="mt-1 max-h-10 overflow-hidden text-sm leading-5 text-cyan-50/68">{upgrade.description}</p>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-cyan-300/10 px-2 py-1 text-cyan-100">{upgrade.effectType}</span>
          <span className={costTone}>{compactNumber(upgrade.baseCost)} cost</span>
          <span className="text-cyan-100/55">Level {Math.min(level, upgrade.maxLevel)} / {upgrade.maxLevel}</span>
        </div>
      </div>
      <button disabled={locked || maxed || state === "unaffordable"} className="h-10 self-center rounded-md border border-cyan-200/38 bg-cyan-300/14 px-3 text-sm font-black text-white transition hover:bg-cyan-300/22 active:translate-y-px disabled:border-slate-300/15 disabled:bg-slate-500/10 disabled:text-slate-300/40">
        {maxed ? "Done" : state === "unaffordable" ? "Need" : "Buy"}
      </button>
      {locked ? <LockedOverlay label="Discovered, Locked" /> : null}
    </article>
  );
}

export function LeaderboardPanel() {
  return (
    <Panel title="Leaderboard" eyebrow="Prototype Reference" action={<BarChart3 className="h-5 w-5 text-amber-200" />}>
      <div className="space-y-2">
        <div className="rounded-md border border-cyan-200/16 bg-black/24 p-3 text-sm font-bold text-cyan-50/70">Leaderboard hidden until a canonical leaderboard service is available.</div>
      </div>
    </Panel>
  );
}

export function ActiveEventPanel() {
  return (
    <Panel title="Active Event" eyebrow="Weekly Challenge" action={<Sparkles className="h-5 w-5 text-fuchsia-200" />}>
      <div className="rounded-md border border-fuchsia-200/20 bg-fuchsia-400/10 p-3">
        <div className="font-black text-white">No Active Event</div>
        <p className="mt-1 text-sm text-cyan-50/68">Prototype State</p>
      </div>
    </Panel>
  );
}

export function AlignmentPanel({ dominant = "Technology" }: { dominant?: AlignmentName | "Balanced" }) {
  const alignments = Object.keys(genesisTokens.alignment) as AlignmentName[];

  return (
    <Panel title="Alignment" eyebrow={dominant === "Balanced" ? "Balanced" : `${dominant} Dominant`} action={<Shield className="h-5 w-5 text-cyan-200" />}>
      <div className="space-y-2">
        {alignments.map((alignment, index) => {
          const value = dominant === "Balanced" ? 52 - Math.abs(index - 2) * 6 : alignment === dominant ? 86 : 34 + index * 5;
          return (
            <div key={alignment}>
              <div className="flex justify-between text-xs font-semibold text-cyan-100/70">
                <span>{alignment}</span>
                <span>{value}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-md bg-black/35">
                <div className="h-full rounded-md" style={{ width: `${value}%`, backgroundColor: genesisTokens.alignment[alignment] }} />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function BoostBar({ value = 64 }: { value?: number }) {
  return (
    <div className={panelClasses("grid h-14 grid-cols-[1.2fr_1fr_1fr] items-center gap-3 px-3")}>
      <div className="flex items-center gap-3">
      <Zap className="h-5 w-5 text-amber-200" />
        <div className="min-w-28 text-sm font-black text-white">Manual Boost</div>
        <div className="flex-1">
        <ProgressMeter value={value} />
        </div>
        <div className="text-sm font-black text-amber-100">{value}%</div>
      </div>
      <div className="rounded-md border border-fuchsia-200/20 bg-fuchsia-300/10 px-3 py-2 text-sm font-bold text-white">Temp Boost: Research Surge</div>
      <div className="rounded-md border border-emerald-200/20 bg-emerald-300/10 px-3 py-2 text-sm font-bold text-white">Colony Ship: 41%</div>
    </div>
  );
}

export function ResourceCard({ resource, assets, missingArt = false }: { resource: ResourceDefinition; assets: AssetDefinition[]; missingArt?: boolean }) {
  const art = resolveRuntimeAsset(missingArt ? { ...resource, artKey: "missing-art-key", iconKey: "missing-icon-key" } : resource, missingArt ? undefined : findAsset(assets, resource.artKey));

  return (
    <article className={panelClasses("overflow-hidden")}>
      <ArtworkFrame art={art} className="h-32 w-full" />
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-black text-white">{resource.displayName}</h3>
            <div className="text-xs uppercase text-cyan-100/55">{resource.resourceClass}</div>
          </div>
          <StatusBadge label={resource.rarity} tone="muted" />
        </div>
        <p className="mt-2 h-16 overflow-hidden text-sm leading-5 text-cyan-50/68">{resource.description}</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-cyan-100/70">
          <span>{resource.category}</span>
          <span>{resource.discoveredEraId}</span>
          <span>{resource.usableEraId}</span>
        </div>
      </div>
    </article>
  );
}

export function ResourceDetail({ resource, assets }: { resource: ResourceDefinition; assets: AssetDefinition[] }) {
  return (
    <Panel title={resource.displayName} eyebrow="Resource Detail">
      <div className="grid grid-cols-[14rem_1fr] gap-4">
        <ResourceCard resource={resource} assets={assets} />
        <div className="space-y-3 text-sm text-cyan-50/72">
          <p>{resource.description}</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              ["Class", resource.resourceClass],
              ["Category", resource.category],
              ["Rarity", resource.rarity],
              ["Tradable", resource.tradable ? "Yes" : "No"],
              ["Discovered", resource.discoveredEraId],
              ["Usable", resource.usableEraId]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-white/10 bg-black/25 p-2">
                <div className="text-xs uppercase text-cyan-100/55">{label}</div>
                <div className="font-bold text-white">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Panel>
  );
}

export function EraCard({ era, active = false, locked = false }: { era: EraDefinition; active?: boolean; locked?: boolean }) {
  return (
    <article className={panelClasses("relative p-3")}>
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border border-cyan-200/20 bg-cyan-300/10">
          <Star className="h-5 w-5 text-cyan-100" />
        </div>
        <div>
          <h3 className="font-black text-white">{era.displayName}</h3>
          <div className="text-xs uppercase text-cyan-100/55">{active ? "Active" : locked ? "Locked" : "Open"}</div>
        </div>
      </div>
      <p className="mt-3 h-16 overflow-hidden text-sm leading-5 text-cyan-50/68">{era.description}</p>
      {locked ? <LockedOverlay /> : null}
    </article>
  );
}

export function GameModal({ title = "Confirm Action", children }: { title?: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-80 items-center justify-center bg-black/55 p-6">
      <div className={panelClasses("w-full max-w-md p-4")}>
        <h2 className="text-xl font-black text-white">{title}</h2>
        <div className="mt-3 text-sm text-cyan-50/70">{children ?? "Modal surface for parity review and game flows."}</div>
        <div className="mt-4 flex justify-end gap-2">
          <button className="rounded-md border border-white/10 px-3 py-2 text-sm font-bold text-cyan-100">Cancel</button>
          <button className="rounded-md border border-cyan-200/35 bg-cyan-300/14 px-3 py-2 text-sm font-bold text-white">Confirm</button>
        </div>
      </div>
    </div>
  );
}

export function GameToast({ tone = "success", message = "Local save synced." }: { tone?: "success" | "danger" | "gold"; message?: string }) {
  return (
    <div className="flex min-h-32 items-end justify-end p-4">
      <div className={panelClasses("flex items-center gap-3 px-3 py-2")}>
        {tone === "danger" ? <AlertTriangle className="h-5 w-5 text-rose-200" /> : <Activity className="h-5 w-5 text-emerald-200" />}
        <span className="text-sm font-bold text-white">{message}</span>
      </div>
    </div>
  );
}

const gamePanelFrame = "relative overflow-hidden border border-cyan-200/22 bg-[linear-gradient(180deg,rgba(13,37,70,0.92),rgba(4,12,27,0.96))] shadow-[0_16px_42px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.06)]";
const bevel = "[clip-path:polygon(10px_0,100%_0,100%_calc(100%-10px),calc(100%-10px)_100%,0_100%,0_10px)]";
type DashboardArtMap = Record<DashboardArtKey, DashboardArtResolution>;

const topbarIconKeys: DashboardArtKey[] = ["topbar_calendar_icon", "topbar_trophy_icon", "topbar_settings_icon"];
const hudIconKeys: DashboardArtKey[] = ["hud_credits_icon", "hud_population_icon", "hud_civilization_energy_icon", "hud_research_icon", "hud_civilization_points_icon"];
const menuIconKeys: DashboardArtKey[] = [
  "navigation_overview_icon",
  "navigation_buildings_icon",
  "navigation_research_icon",
  "navigation_upgrades_icon",
  "navigation_civilization_icon",
  "navigation_events_icon",
  "navigation_galaxy_icon",
  "navigation_spaceport_icon"
];

function dashboardImagePath(art: DashboardArtResolution) {
  return art.path;
}

function DashboardMissingArt({ art, className = "" }: { art: DashboardArtResolution; className?: string }) {
  return (
    <div className={`flex items-center justify-center border border-amber-200/35 bg-amber-950/70 text-[10px] font-black uppercase text-amber-100 ${className}`}>
      {art.warnings[0] ?? "Missing"}
    </div>
  );
}

function robloxRect(x: number, y: number, width: number, height: number): CSSProperties {
  return {
    position: "absolute",
    left: `${(x / ROBLOX_DASHBOARD_REFERENCE.width) * 100}%`,
    top: `${(y / ROBLOX_DASHBOARD_REFERENCE.height) * 100}%`,
    width: `${(width / ROBLOX_DASHBOARD_REFERENCE.width) * 100}%`,
    height: `${(height / ROBLOX_DASHBOARD_REFERENCE.height) * 100}%`
  };
}

function robloxLayoutRect(rect: { x: number; y: number; width: number; height: number }) {
  return robloxRect(rect.x, rect.y, rect.width, rect.height);
}

const robloxNavItems = [
  { id: "dashboard", label: "Overview", icon: Gauge, iconSize: 54, offsetY: 14 },
  { id: "production", label: "Buildings", icon: Building2, iconSize: 64, offsetY: 0 },
  { id: "research", label: "Research", icon: FlaskConical, iconSize: 62, offsetY: 0 },
  { id: "upgrades", label: "Upgrades", icon: WrenchIcon, iconSize: 64, offsetY: -5 },
  { id: "civilization", label: "Civilization", icon: Crown, iconSize: 60, offsetY: -5 },
  { id: "events", label: "Events", icon: CalendarDays, iconSize: 62, offsetY: -5 },
  { id: "galaxy", label: "Galaxy", icon: Globe2, iconSize: 68, offsetY: -8 },
  { id: "spaceport", label: "Spaceport", icon: Rocket, iconSize: 66, offsetY: -14 }
];

function WrenchIcon({ className }: { className?: string }) {
  return <Settings className={className} />;
}

function shortEraName(era: EraDefinition) {
  if (era.id === "space-age") return "Space";
  return era.displayName.replace(" Era", "");
}

function hudIconForResource(resource: { category: string; label: string }) {
  const haystack = `${resource.category} ${resource.label}`.toLowerCase();
  if (haystack.includes("crystal")) return Gem;
  if (haystack.includes("organic") || haystack.includes("wood")) return Leaf;
  if (haystack.includes("liquid") || haystack.includes("water")) return Globe2;
  if (haystack.includes("metal") || haystack.includes("mineral")) return Coins;
  return Hexagon;
}

function RobloxTopHud({ model, art }: { model: DashboardModel; art: DashboardArtMap }) {
  const resourceSlots = [
    { x: 515, w: 230, iconX: 27, valueX: 94, textW: 132 },
    { x: 755, w: 230, iconX: 21, valueX: 88, textW: 132 },
    { x: 995, w: 230, iconX: -8, valueX: 58, textW: 132 },
    { x: 1215, w: 230, iconX: -8, valueX: 58, textW: 132 },
    { x: 1445, w: 185, iconX: -8, valueX: 58, textW: 107 }
  ];
  const hudResources = model.hudResources.slice(0, resourceSlots.length);

  return (
    <header className="relative h-full w-full">
      {dashboardImagePath(art.dashboard_top_hud) ? <img src={dashboardImagePath(art.dashboard_top_hud)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.dashboard_top_hud} className="absolute inset-0" />}

      <div className="absolute top-0 flex min-w-0 items-center gap-3.5 px-4" style={{ left: `${(160 / 1920) * 100}%`, width: `${(360 / 1920) * 100}%`, height: "100%" }}>
        <div className="relative flex h-[4.35rem] w-[4.35rem] shrink-0 items-center justify-center border border-cyan-200/40 bg-cyan-300/14 text-cyan-100 shadow-[0_0_30px_rgba(45,212,255,0.28)] [clip-path:polygon(14px_0,100%_0,100%_calc(100%-14px),calc(100%-14px)_100%,0_100%,0_14px)]">
          {dashboardImagePath(art.civilization_crest) ? <img src={dashboardImagePath(art.civilization_crest)} alt="" className="h-10 w-10 object-contain opacity-85" /> : <Hexagon className="h-9 w-9" />}
          <span className="absolute text-[0.58rem] font-black text-white">PG</span>
        </div>
        <div className="min-w-0">
          <div className="text-[0.66rem] font-black uppercase tracking-[0.18em] text-cyan-100/50">Project Genesis</div>
          <div className="truncate text-[1.55rem] font-black leading-none text-white">{model.playerState.civilizationName ?? "No Civilization Profile"}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="inline-flex rounded-sm border border-amber-200/30 bg-amber-300/10 px-2 py-0.5 text-[0.68rem] font-black uppercase text-amber-100">{shortEraName(model.currentEra)} Era</span>
            {model.missingSystems.civilizationName ? <span className="inline-flex rounded-sm border border-rose-200/30 bg-rose-300/10 px-2 py-0.5 text-[0.58rem] font-black uppercase text-rose-100">Missing Player Data</span> : null}
          </div>
        </div>
      </div>

      {hudResources.map((resource, index) => {
        const slot = resourceSlots[index];
          const Icon = hudIconForResource(resource);
          const iconArt = art[hudIconKeys[index]];
          return (
          <div key={resource.resourceId} className="absolute top-0 h-full min-w-0" style={{ left: `${(slot.x / 1920) * 100}%`, width: `${(slot.w / 1920) * 100}%` }}>
            {iconArt && dashboardImagePath(iconArt) ? (
              <img src={dashboardImagePath(iconArt)} alt="" className="absolute h-[58px] w-[58px] object-contain" style={{ left: slot.iconX, top: 23 }} />
            ) : (
              <div className="absolute flex h-[58px] w-[58px] items-center justify-center rounded-full border border-white/15 bg-white/[0.07] text-cyan-100 shadow-[0_0_20px_rgba(45,212,255,0.16)]" style={{ left: slot.iconX, top: 23 }}>
                <Icon className="h-[1.45rem] w-[1.45rem]" />
              </div>
            )}
            <div className="absolute truncate text-[2.1rem] font-semibold leading-none text-white [text-shadow:0_0_18px_rgba(45,212,255,0.25)]" style={{ left: slot.valueX, top: 17, width: slot.textW }}>{compactNumber(resource.amount)}</div>
            <div className="absolute truncate text-[1.08rem] font-bold leading-none text-emerald-200" style={{ left: slot.valueX, top: 58, width: slot.textW }}>{typeof resource.rate === "number" ? `${resource.rate >= 0 ? "+" : ""}${compactNumber(resource.rate)}/s` : resource.label}</div>
          </div>
          );
      })}

      <button title="Add resources" className="absolute flex items-center justify-center" style={{ left: 1578, top: 26, width: 56, height: 56 }}>
        {dashboardImagePath(art.topbar_plus_button) ? <img src={dashboardImagePath(art.topbar_plus_button)} alt="" className="h-full w-full object-contain" /> : <DashboardMissingArt art={art.topbar_plus_button} className="h-full w-full" />}
      </button>

      <div className="absolute flex items-center gap-4" style={{ left: 1715, top: 12, height: 80 }}>
        {[
          { label: "Calendar", icon: CalendarDays, value: "" },
          { label: "Trophies", icon: Trophy, value: "" },
          { label: "Settings", icon: Settings, value: "" }
        ].map(({ label, icon: Icon, value }, index) => (
          <button key={label} title={label} className="relative flex h-20 w-20 items-center justify-center text-cyan-100 transition hover:brightness-125">
            {dashboardImagePath(art.topbar_hex_button) ? <img src={dashboardImagePath(art.topbar_hex_button)} alt="" className="absolute inset-0 h-full w-full object-contain" /> : null}
            {dashboardImagePath(art[topbarIconKeys[index]]) ? <img src={dashboardImagePath(art[topbarIconKeys[index]])} alt="" className="relative h-14 w-14 object-contain" /> : <Icon className="relative h-6 w-6" />}
            {value ? <span className="text-xs font-black text-white">{value}</span> : null}
          </button>
        ))}
      </div>
    </header>
  );
}

function RobloxNavigation({ active, art }: { active: string; art: DashboardArtMap }) {
  const activeMap: Record<string, string> = {
    dashboard: "dashboard",
    production: "production",
    research: "research",
    civilization: "civilization",
    earth: "production",
    solar: "galaxy",
    journal: "spaceport"
  };
  const current = activeMap[active] ?? active;
  const activeIndex = Math.max(0, robloxNavItems.findIndex((item) => item.id === current));

  return (
    <nav className="relative h-full w-full overflow-hidden">
      {dashboardImagePath(art.sidebar_frame) ? <img src={dashboardImagePath(art.sidebar_frame)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.sidebar_frame} className="absolute inset-0" />}
      <div className="pointer-events-none absolute inset-x-[10px] h-[120px] rounded-[10px] border-2 border-cyan-200/80 bg-cyan-400/18 shadow-[0_0_22px_rgba(45,212,255,0.35),inset_0_0_22px_rgba(45,212,255,0.1)]" style={{ top: `${(activeIndex * 118 - 2) / 944 * 100}%` }} />
      {robloxNavItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = item.id === current;
        const iconArt = art[menuIconKeys[index]];
        const slotHeight = 100 / robloxNavItems.length;
        return (
          <button
            key={item.id}
            className={`absolute left-0 flex w-full flex-col items-center text-center font-black uppercase leading-tight transition hover:brightness-125 ${isActive ? "text-white" : "text-blue-50/82"}`}
            style={{ top: `${index * slotHeight}%`, height: `${slotHeight}%` }}
          >
            <span className="absolute left-[18px] right-[18px] top-[-2px] h-[6px] bg-cyan-100/10 shadow-[0_0_12px_rgba(45,212,255,0.18)]" />
            {iconArt && dashboardImagePath(iconArt) ? (
              <img src={dashboardImagePath(iconArt)} alt="" className="mt-[14px] object-contain drop-shadow-[0_0_13px_rgba(125,249,255,0.28)]" style={{ width: item.iconSize, height: item.iconSize, transform: `translateY(${item.offsetY}px)`, opacity: isActive ? 1 : 0.72 }} />
            ) : (
              <Icon className="mt-[14px] text-cyan-100" style={{ width: item.iconSize, height: item.iconSize, transform: `translateY(${item.offsetY}px)` }} />
            )}
            <span className="mt-[-2px] w-full px-1 text-[15px] [text-shadow:0_1px_4px_rgba(0,0,0,0.75)]" style={{ transform: `translateY(${item.offsetY}px)` }}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

function RobloxLeftColumn({ data, model, art, showDevWarnings }: { data: GameRuntimeData; model: DashboardModel; art: DashboardArtMap; showDevWarnings: boolean }) {
  const clickResource = model.playerState.clickOutput?.resourceId ? data.resources.find((resource) => resource.id === model.playerState.clickOutput?.resourceId) : undefined;
  const hasClickState = Boolean(model.playerState.clickOutput);
  const hasAutomation = Boolean(model.playerState.automation);
  const critical = model.playerState.criticalStats;

  return (
    <div className="relative h-full w-full overflow-hidden">
      {dashboardImagePath(art.clicker_hud_background) ? <img src={dashboardImagePath(art.clicker_hud_background)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.clicker_hud_background} className="absolute inset-0" />}
      <section className="absolute left-0 top-0 h-[320px] w-full p-7">
        {showDevWarnings && art.dashboard_click_interface.mappingStatus === "missing" ? (
          <div className="absolute right-5 top-11 z-10 rounded-sm border border-amber-200/45 bg-amber-950/80 px-2 py-1 text-[10px] font-black uppercase text-amber-100">
            click_interface_circle source missing
          </div>
        ) : null}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-[1.1rem] font-black uppercase text-cyan-100/90">Click Power</h2>
          </div>
          <CircleHelp className="h-5 w-5 text-cyan-100/55" />
        </div>
        <div className="absolute left-[74px] top-[128px] h-[50px] w-[55px]">
          {dashboardImagePath(art.click_ring_outer) ? <img src={dashboardImagePath(art.click_ring_outer)} alt="" className="absolute inset-[-31px] h-[112px] w-[112px] animate-spin object-contain opacity-45 [animation-duration:11s]" /> : null}
          {dashboardImagePath(art.click_ring_middle) ? <img src={dashboardImagePath(art.click_ring_middle)} alt="" className="absolute inset-[-22px] h-[94px] w-[94px] animate-spin object-contain opacity-55 [animation-direction:reverse] [animation-duration:9s]" /> : null}
          {dashboardImagePath(art.click_ring_inner) ? <img src={dashboardImagePath(art.click_ring_inner)} alt="" className="absolute inset-[-13px] h-[76px] w-[76px] animate-spin object-contain opacity-75 [animation-duration:7s]" /> : null}
          {dashboardImagePath(art.click_hand_icon) ? <img src={dashboardImagePath(art.click_hand_icon)} alt="" className="relative h-full w-full object-contain drop-shadow-[0_0_14px_rgba(125,249,255,0.5)]" /> : <MousePointerClick className="relative h-full w-full text-cyan-100" />}
        </div>
        <div className="absolute left-[193px] top-[76px] w-[126px] text-center">
          <div className="text-[0.78rem] font-black uppercase leading-tight text-cyan-100/58">{clickResource?.displayName ?? "Civilization"}<br />Energy</div>
          <div className="mt-2 text-[1.75rem] font-black leading-none text-white">{hasClickState ? compactNumber(model.playerState.clickOutput?.amount ?? 0) : "Missing"}</div>
          <div className="mt-2 text-[0.72rem] font-black uppercase text-cyan-100/80">Per Click</div>
        </div>
        <button disabled={!hasClickState} className="absolute bottom-[10px] left-[19px] h-[66px] w-[312px] transition hover:brightness-125 active:scale-[0.99] disabled:opacity-50">
          {dashboardImagePath(art.click_button) ? <img src={dashboardImagePath(art.click_button)} alt="" className="h-full w-full object-contain" /> : <DashboardMissingArt art={art.click_button} className="h-full w-full" />}
          <span className="sr-only">{hasClickState ? "Click" : "No Player State"}</span>
        </button>
      </section>

      <section className="absolute left-0 top-[344px] h-[270px] w-full p-7">
        <div className="flex items-start justify-between">
          <h2 className="text-[1.1rem] font-black uppercase text-cyan-100/90">Auto Click</h2>
          <CircleHelp className="h-5 w-5 text-cyan-100/55" />
        </div>
        <div className="absolute left-[72px] top-[84px] h-[88px] w-[88px]">
          {dashboardImagePath(art.auto_robot_circle) ? <img src={dashboardImagePath(art.auto_robot_circle)} alt="" className={`absolute inset-0 h-full w-full object-contain opacity-70 ${model.playerState.automation?.enabled ? "animate-spin [animation-duration:8s]" : ""}`} /> : null}
          {dashboardImagePath(art.auto_robot_icon) ? <img src={dashboardImagePath(art.auto_robot_icon)} alt="" className="absolute inset-[18px] h-[52px] w-[52px] object-contain drop-shadow-[0_0_12px_rgba(52,245,106,0.4)]" /> : <Bot className="absolute inset-[18px] h-[52px] w-[52px] text-emerald-100" />}
        </div>
        <div className="absolute left-[196px] top-[62px] w-[120px] text-center">
          <div className="text-[0.72rem] font-black uppercase leading-tight text-cyan-100/58">Auto Click<br />Power</div>
          <div className="mt-2 text-[1.75rem] font-black leading-none text-white">{hasAutomation ? compactNumber(model.playerState.automation?.amountPerSecond ?? 0) : "Missing"}</div>
          <div className="mt-2 text-[0.72rem] font-black uppercase text-cyan-100/80">Per/S</div>
        </div>
        <button disabled={!hasAutomation} className="absolute bottom-[9px] left-[19px] h-[55px] w-[312px] transition hover:brightness-125 active:scale-[0.99] disabled:opacity-50">
          {dashboardImagePath(model.playerState.automation?.enabled ? art.auto_button_on : art.auto_button_off) ? <img src={dashboardImagePath(model.playerState.automation?.enabled ? art.auto_button_on : art.auto_button_off)} alt="" className="h-full w-full object-contain" /> : <DashboardMissingArt art={model.playerState.automation?.enabled ? art.auto_button_on : art.auto_button_off} className="h-full w-full" />}
          <span className="sr-only">{hasAutomation ? (model.playerState.automation?.enabled ? "Auto On" : "Auto Off") : "No Automation State"}</span>
        </button>
      </section>

      <section className="absolute left-0 top-[638px] h-[185px] w-full">
        {dashboardImagePath(art.critical_star_icon) ? <img src={dashboardImagePath(art.critical_star_icon)} alt="" className="absolute left-[28px] top-[13px] h-[89px] w-[112px] object-contain drop-shadow-[0_0_18px_rgba(255,216,77,0.28)]" /> : <Star className="absolute left-[28px] top-[13px] h-[89px] w-[112px] text-amber-100" />}
        <div className="absolute left-[147px] top-[17px]">
          <div className="text-[0.75rem] font-black uppercase text-cyan-100/55">Critical Chance</div>
          <div className="mt-1 text-[1.55rem] font-black leading-none text-white">{critical ? `${critical.chancePercent}%` : "Missing"}</div>
          <div className="mt-4 text-[0.75rem] font-black uppercase text-cyan-100/55">Critical Multiplier</div>
          <div className="mt-1 text-[1.55rem] font-black leading-none text-white">{critical ? `x${critical.multiplier}` : "Missing"}</div>
        </div>
      </section>
    </div>
  );
}

function HeroCityScene({ art, fallbackArt }: { art: RuntimeAssetResolution; fallbackArt: DashboardArtResolution }) {
  if (dashboardImagePath(fallbackArt)) {
    return <img src={dashboardImagePath(fallbackArt)} alt="" className="absolute inset-0 h-full w-full object-fill" />;
  }

  if (art.path && !art.artworkNeeded) {
    return <ArtworkFrame art={art} className="absolute inset-0 h-full w-full rounded-none border-0" />;
  }

  return (
    <div className={`absolute inset-0 overflow-hidden bg-gradient-to-br ${art.className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_58%_26%,rgba(125,249,255,0.34),transparent_20rem),linear-gradient(180deg,rgba(3,7,19,0.08),rgba(3,7,19,0.72))]" />
      <div className="absolute inset-x-0 bottom-0 h-[58%] bg-[linear-gradient(180deg,transparent,rgba(3,7,19,0.34)_22%,rgba(3,7,19,0.9))]" />
      <div className="absolute bottom-16 left-[12%] h-36 w-24 bg-cyan-950/80 shadow-[0_0_44px_rgba(45,212,255,0.18)] [clip-path:polygon(18%_0,82%_0,100%_100%,0_100%)]" />
      <div className="absolute bottom-14 left-[25%] h-52 w-32 bg-slate-900/90 [clip-path:polygon(10%_0,90%_0,100%_100%,0_100%)]" />
      <div className="absolute bottom-12 left-[41%] h-64 w-40 bg-cyan-950/90 shadow-[0_0_60px_rgba(45,212,255,0.18)] [clip-path:polygon(16%_0,84%_0,100%_100%,0_100%)]" />
      <div className="absolute bottom-14 right-[20%] h-44 w-36 bg-indigo-950/86 [clip-path:polygon(8%_0,92%_0,100%_100%,0_100%)]" />
      <div className="absolute bottom-12 right-[8%] h-32 w-28 bg-slate-950/88 [clip-path:polygon(14%_0,86%_0,100%_100%,0_100%)]" />
      <div className="absolute bottom-0 left-0 right-0 h-20 bg-[linear-gradient(90deg,rgba(45,212,255,0.16),rgba(251,191,36,0.14),rgba(217,70,239,0.16))]" />
      <div className="absolute right-3 top-3 rounded-sm border border-amber-200/35 bg-amber-950/80 px-2 py-1 text-[0.62rem] font-black uppercase text-amber-100">
        Replacement Art Needed
      </div>
    </div>
  );
}

function RobloxEraRail({ eras, activeEraId, art }: { eras: EraDefinition[]; activeEraId: string; art: DashboardArtMap }) {
  return (
    <div className="absolute h-[85px] w-[860px]" style={{ left: 25, top: 394 }}>
      <div className="absolute left-[68px] right-[68px] top-[33px] h-[4px] bg-cyan-100/22 shadow-[0_0_16px_rgba(45,212,255,0.18)]" />
      {eras.map((era, index) => {
        const active = era.id === activeEraId;
        const denominator = Math.max(eras.length - 1, 1);
        const x = 0.08 + (index / denominator) * 0.84;
        return (
          <div key={era.id} className="absolute top-0 h-full w-[96px]" style={{ left: `calc(${x * 100}% - 48px)` }}>
            <div className="absolute left-[13px] top-[6px] h-[66px] w-[70px]">
              {dashboardImagePath(art.era_progression_hex) ? (
                <img src={dashboardImagePath(art.era_progression_hex)} alt="" className={`h-full w-full object-contain drop-shadow-[0_0_15px_rgba(45,212,255,0.24)] ${active ? "opacity-100 brightness-125" : "opacity-70"}`} />
              ) : (
                <Hexagon className={`h-full w-full drop-shadow-[0_0_15px_rgba(45,212,255,0.24)] ${active ? "text-emerald-200 opacity-100 brightness-125" : "text-cyan-100 opacity-70"}`} />
              )}
              <span className="absolute inset-0 flex items-center justify-center text-[1.55rem] font-black text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.8)]">{index + 1}</span>
            </div>
            <span className={`absolute left-0 top-[72px] block w-full truncate text-center text-[13px] font-black uppercase leading-none [text-shadow:0_1px_4px_rgba(0,0,0,0.8)] ${active ? "text-emerald-200" : "text-white/86"}`}>{shortEraName(era)}</span>
          </div>
        );
      })}
    </div>
  );
}

function RobloxHero({ data, model, art: dashboardArt }: { data: GameRuntimeData; model: DashboardModel; art: DashboardArtMap }) {
  const era = model.currentEra;
  const objective = model.playerState.objective;
  const focusResource = objective?.focusResourceId ? data.resources.find((resource) => resource.id === objective.focusResourceId) : undefined;
  const progressCurrent = objective?.progressCurrent;
  const progressTarget = objective?.progressTarget;
  const hasProgress = typeof progressCurrent === "number" && typeof progressTarget === "number" && progressTarget > 0;
  const heroArt = resolveRuntimeAsset(era, findAsset(data.assets, era.artKey));
  const crop = era.artKey ? heroCropSettings[era.artKey] : undefined;

  return (
    <section className="relative h-full w-full overflow-hidden">
      <HeroCityScene art={{ ...heroArt, objectPosition: heroArt.objectPosition ?? crop?.objectPosition }} fallbackArt={dashboardArt.dashboard_city_hero} />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(3,7,19,0.04),rgba(3,7,19,0.42))]" />
      <div className="absolute h-[105px] w-[351px]" style={{ left: 40, top: 20 }}>
        {dashboardImagePath(dashboardArt.objective_panel) ? <img src={dashboardImagePath(dashboardArt.objective_panel)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={dashboardArt.objective_panel} className="absolute inset-0" />}
        <div className="absolute left-[10%] top-[16%] h-[20%] w-[78%] text-[11px] font-black uppercase text-cyan-100/82">Current Objective</div>
        <h1 className="absolute left-[10%] top-[37%] h-[28%] w-[78%] truncate text-[20px] font-black leading-none text-white [text-shadow:0_0_20px_rgba(45,212,255,0.22)]">{objective?.title ?? "Objective System Missing"}</h1>
        <div className="absolute left-[10%] top-[72%] h-[10%] w-[78%] overflow-hidden rounded-sm bg-cyan-900/75">
          <div className="h-full bg-cyan-300 shadow-[0_0_18px_rgba(45,212,255,0.45)]" style={{ width: hasProgress ? `${Math.min(100, (progressCurrent / progressTarget) * 100)}%` : "0%" }} />
        </div>
        <p className="absolute left-[42%] top-[61%] h-[22%] w-[16%] text-center text-[17px] font-black leading-none text-white">{hasProgress ? `${progressCurrent}/${progressTarget}` : "--"}</p>
      </div>
      <div className="absolute right-5 top-5 rounded-sm border border-cyan-200/20 bg-black/40 px-3 py-2 text-[0.68rem] font-black uppercase text-cyan-50/76 backdrop-blur-sm">
        {shortEraName(era)} Era · {focusResource?.displayName ?? "Missing Focus"} · {typeof objective?.discoveryPercent === "number" ? `${objective.discoveryPercent}%` : "No Discovery"}
      </div>
      <RobloxEraRail eras={data.eras} activeEraId={era.id} art={dashboardArt} />
    </section>
  );
}

function RobloxUpgradePanel({ categories, activeCategoryId, model, assets, art }: { categories: UpgradeCategory[]; activeCategoryId: string; model: DashboardModel; assets: AssetDefinition[]; art: DashboardArtMap }) {
  const tabLabelXOffsets = [0.045, 0.07, 0.045, 0.018];

  return (
    <section className="relative h-full w-full overflow-hidden">
      {dashboardImagePath(art.upgrade_panel_structure) ? <img src={dashboardImagePath(art.upgrade_panel_structure)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.upgrade_panel_structure} className="absolute inset-0" />}
      {categories.slice(0, 4).map((category, index) => {
          const active = category.id === activeCategoryId;
          return (
          <button
            key={category.id}
            className={`absolute top-0 h-[16%] text-center text-[19px] font-black uppercase transition hover:brightness-125 ${active ? "text-white" : "text-cyan-100/72"}`}
            style={{ left: `${index * 25}%`, width: "25%" }}
          >
            <span className="absolute h-[9%] w-[20.5%] whitespace-nowrap" style={{ left: `${tabLabelXOffsets[index] * 400}%`, top: "10%" }}>
              {category.displayName}
            </span>
          </button>
          );
      })}
      <div className="absolute left-0 top-[14.5%] h-[82%] w-full overflow-hidden">
        {model.upgradeRows.length ? model.upgradeRows.slice(0, 4).map((row, index) => {
          const { upgrade } = row;
          const rowArt = resolveRuntimeAsset(upgrade, findAsset(assets, upgrade.iconKey));
          const state: UpgradeState = row.unlocked ? (row.affordable ? "affordable" : "available") : "locked";
          return (
            <div key={upgrade.id} className="absolute left-0 h-[86px] w-full" style={{ top: index * 86 }}>
              {rowArt.path ? <ArtworkFrame art={rowArt} className="absolute left-[3.7%] top-[8%] h-[84%] min-h-0 w-[8.8%] rounded-sm border-0" /> : <div className="absolute left-[3.7%] top-[8%] flex h-[84%] w-[8.8%] items-center justify-center text-[28px] font-black text-cyan-100/70">?</div>}
              <div className="absolute left-[14%] top-[6%] h-[27%] w-[40%] truncate text-[22px] font-bold leading-none text-white">{upgrade.displayName}</div>
              <div className="absolute left-[14%] top-[34%] h-[24%] w-[45%] truncate text-[18px] font-medium leading-none text-cyan-50/72">{upgrade.description}</div>
              <div className="absolute left-[14%] top-[60%] h-[23%] w-[18%] text-[20px] font-medium leading-none text-cyan-100/82">Lv. {row.level}/{upgrade.maxLevel}</div>
              <div className="absolute left-[33%] top-[71%] h-[7%] w-[24%] overflow-hidden rounded-full bg-cyan-950/80">
                <div className={`h-full rounded-full ${state === "locked" ? "bg-cyan-700/50" : "bg-emerald-300"}`} style={{ width: `${Math.min(100, (row.level / Math.max(1, upgrade.maxLevel)) * 100)}%` }} />
              </div>
              <div className="absolute left-[61%] top-[26%] h-[38%] w-[13%] truncate text-center text-[24px] font-medium leading-none text-cyan-50">{state === "locked" ? "--" : `+${compactNumber(row.effect)}`}</div>
              <button disabled={state === "locked" || !row.affordable} className="absolute left-[74.5%] top-[16%] h-[68%] w-[22.5%] transition hover:brightness-125 active:scale-[0.99] disabled:opacity-45">
                {dashboardImagePath(art.upgrade_button) ? <img src={dashboardImagePath(art.upgrade_button)} alt="" className="h-full w-full object-contain" /> : <DashboardMissingArt art={art.upgrade_button} className="h-full w-full" />}
                <span className="absolute left-[34%] top-[24%] h-[52%] w-[42%] truncate text-left text-[21px] font-bold leading-[2rem] text-white">{state === "locked" ? "LOCKED" : row.affordable ? compactNumber(row.cost) : compactNumber(row.cost)}</span>
              </button>
              {state === "locked" ? (
                <div className="pointer-events-none absolute inset-0 bg-slate-950/18">
                  <Lock className="absolute right-[2.8%] top-[34%] h-5 w-5 text-slate-200/42" />
                </div>
              ) : null}
              <div className="absolute bottom-0 left-[3%] right-[3%] h-px bg-cyan-100/10" />
              </div>
          );
        }) : null}
        {!model.upgradeRows.length ? <UnknownUpgradeCard /> : null}
      </div>
    </section>
  );
}

function RobloxRightColumn({ model, art }: { model: DashboardModel; art: DashboardArtMap }) {
  const leaderboardRows = model.playerState.leaderboard?.length ? model.playerState.leaderboard.slice(0, 5) : [];
  const alignmentRows = CANONICAL_ALIGNMENT_AXES.slice(0, 5);

  return (
    <div className="relative h-full w-full">
      <section className="absolute left-0 top-0 h-[300px] w-full overflow-hidden">
        {dashboardImagePath(art.leaderboard_panel) ? <img src={dashboardImagePath(art.leaderboard_panel)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.leaderboard_panel} className="absolute inset-0" />}
        <h2 className="absolute left-[9.5%] top-[3.5%] h-[15%] w-[76%] text-[28px] font-black uppercase text-cyan-100/90">Top Civilizations</h2>
        {leaderboardRows.length ? leaderboardRows.map((entry, index) => {
          const y = 0.29 + index * 0.132;
          const local = index === leaderboardRows.length - 1;
          return (
            <div key={entry.name} className={`absolute h-[10%] text-[24px] leading-none ${local ? "font-black text-amber-100" : "font-medium text-white"}`} style={{ top: `${y * 100}%`, left: 0, width: "100%" }}>
              <span className="absolute left-[8.5%] w-[11%] text-center">{index + 1}</span>
              <span className="absolute left-[23%] w-[43%] truncate">{entry.name}</span>
              <span className="absolute left-[69%] w-[22%] truncate text-right">{compactNumber(entry.score)}</span>
            </div>
          );
        }) : (
          <div className="absolute left-[9%] top-[31%] w-[82%] text-sm font-bold text-cyan-50/70">Leaderboard hidden until a canonical leaderboard service is available.</div>
        )}
      </section>

      <section className="absolute left-0 top-[324px] h-[220px] w-full overflow-hidden">
        {dashboardImagePath(art.active_event_panel) ? <img src={dashboardImagePath(art.active_event_panel)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.active_event_panel} className="absolute inset-0" />}
        {dashboardImagePath(art.active_event_sub_layer) ? <img src={dashboardImagePath(art.active_event_sub_layer)} alt="" className="absolute left-[22px] top-[52px] h-[156px] w-[388px] object-fill" /> : null}
        <h2 className="absolute left-[7.5%] top-[7.5%] h-[14%] w-[70%] text-[27px] font-bold uppercase text-cyan-100/90">Active Event</h2>
        <Sparkles className="absolute left-[10%] top-[35.5%] h-[13%] w-[13%] text-fuchsia-100 drop-shadow-[0_0_14px_rgba(217,70,239,0.5)]" />
        <div className="absolute left-[25.5%] top-[36%] h-[11%] w-[48%] truncate text-[20px] font-bold uppercase text-white">{model.playerState.activeEvent?.title ?? "No Active Event"}</div>
        <div className="absolute left-[25.5%] top-[49%] h-[10%] w-[50%] truncate text-[18px] font-medium text-white">{model.playerState.activeEvent?.description ?? "No canonical event export."}</div>
        <div className="absolute left-[68%] top-[43.5%] h-[18%] w-[20%] text-right text-[34px] font-medium leading-none text-white">{model.playerState.activeEvent?.timerLabel ?? "--"}</div>
        <button disabled={!model.playerState.activeEvent} className="absolute left-[10%] top-[65.5%] h-[24%] w-[80%] transition hover:brightness-125 disabled:opacity-45">
          {dashboardImagePath(art.event_activate_button) ? <img src={dashboardImagePath(art.event_activate_button)} alt="" className="absolute inset-0 h-full w-full object-contain" /> : <DashboardMissingArt art={art.event_activate_button} className="absolute inset-0" />}
          <span className="relative text-[25px] font-bold uppercase text-white">{model.playerState.activeEvent ? "Activate" : "Unavailable"}</span>
        </button>
      </section>

      <section className="absolute left-0 top-[574px] h-[365px] w-full overflow-hidden">
        {dashboardImagePath(art.alignment_panel) ? <img src={dashboardImagePath(art.alignment_panel)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.alignment_panel} className="absolute inset-0" />}
        <h2 className="absolute left-[8%] top-[5.5%] h-[8%] w-[70%] text-[24px] font-black uppercase text-cyan-100/90">Alignment</h2>
        {alignmentRows.map((alignment, index) => {
            const value = model.alignment[alignment];
            const y = 0.19 + index * 0.155;
            return (
            <div key={alignment} className="absolute left-0 h-[12%] w-full" style={{ top: `${y * 100}%` }}>
              <Shield className="absolute left-[3.5%] top-[-18%] h-[120%] w-[13%]" style={{ color: genesisTokens.alignment[alignment as AlignmentName] }} />
              <span className="absolute left-[16%] top-0 h-[75%] w-[22%] truncate text-[24px] font-medium uppercase leading-none text-white">{alignment}</span>
              <div className="absolute left-[40.5%] top-[25%] h-[30%] w-[38%] rounded-full border border-cyan-100/20 bg-cyan-950/80">
                <div className="h-full rounded-full shadow-[0_0_12px_current]" style={{ width: `${Math.min(96, value)}%`, backgroundColor: genesisTokens.alignment[alignment as AlignmentName], color: genesisTokens.alignment[alignment as AlignmentName] }} />
              </div>
              <span className="absolute left-[81%] top-[-2%] h-[85%] w-[11%] text-right text-[24px] font-black leading-none text-white">{value}%</span>
            </div>
            );
        })}
        <div className="absolute bottom-4 left-[8%] right-[8%] truncate text-[0.68rem] font-black uppercase text-cyan-100/50">{model.alignmentLabel} · {model.civilizationPrediction}</div>
      </section>
    </div>
  );
}

function RobloxBoostBar({ model }: { model: DashboardModel }) {
  const primaryBoost = model.playerState.boosts?.[0];
  return (
    <footer className={`${gamePanelFrame} ${bevel} flex h-full w-full items-center justify-center gap-2 bg-[linear-gradient(180deg,rgba(24,6,12,0.78),rgba(3,8,18,0.88))] px-3`}>
      <Zap className="h-6 w-6 shrink-0 text-cyan-100" />
      <div className="min-w-0 truncate text-center">
        <span className="text-[1rem] font-black uppercase leading-none text-white [text-shadow:0_0_18px_rgba(45,212,255,0.5)]">{primaryBoost?.name ?? "Boosts"}</span>
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-100/32 bg-black/35 text-[1.1rem] font-black text-cyan-100">{primaryBoost?.value ?? "6"}</div>
    </footer>
  );
}

function RuntimeSourceBadge({ model }: { model: DashboardModel }) {
  if (!model.runtimeState) return null;
  if (model.runtimeState.configuredMode !== "live" && !model.runtimeState.isUsingFallback) return null;

  return (
    <div className="absolute right-4 top-[6.55rem] z-30 rounded-sm border border-cyan-200/24 bg-slate-950/90 px-3 py-2 text-[0.62rem] font-black uppercase text-cyan-50 shadow-[0_14px_34px_rgba(0,0,0,0.35)]">
      <div>{model.runtimeState.configuredMode} / {model.runtimeState.activeSource}</div>
      <div className="mt-1 text-cyan-100/58">schema {model.runtimeState.schemaVersion} | content v{model.runtimeState.contentVersion}</div>
      <div className="mt-1 max-w-[18rem] truncate text-cyan-100/48">{model.runtimeState.checksum}</div>
      <div className="mt-1 text-cyan-100/58">cache {model.runtimeState.cacheStatus} | {model.runtimeState.status}</div>
    </div>
  );
}

function dashboardDataAudit(model: DashboardModel) {
  return [
    { label: "civilization name", source: model.playerState.civilizationName ? model.playerState.source : "missing source", value: model.playerState.civilizationName ?? "missing" },
    { label: "current era", source: "canonical Studio definition", value: model.currentEra.displayName },
    { label: "HUD definitions", source: "canonical Studio definitions", value: `${model.hudResources.length} resources` },
    { label: "resource amounts/rates", source: model.missingSystems.playerResources ? "missing source/default zero" : model.playerState.source, value: model.missingSystems.playerResources ? "default zero" : model.playerState.sourceLabel },
    { label: "click power", source: model.playerState.clickOutput ? model.playerState.source : "missing source", value: model.playerState.clickOutput ? compactNumber(model.playerState.clickOutput.amount) : "missing" },
    { label: "auto-click power", source: model.playerState.automation ? model.playerState.source : "missing source", value: model.playerState.automation ? compactNumber(model.playerState.automation.amountPerSecond) : "missing" },
    { label: "critical stats", source: model.playerState.criticalStats ? model.playerState.source : "missing source", value: model.playerState.criticalStats ? `${model.playerState.criticalStats.chancePercent}% / x${model.playerState.criticalStats.multiplier}` : "missing" },
    { label: "objective", source: model.playerState.objective ? model.playerState.source : "missing source", value: model.playerState.objective?.title ?? "missing" },
    { label: "era journey", source: "canonical Studio definitions", value: model.journey.current.displayName },
    { label: "upgrade definitions", source: "canonical Studio definitions + player runtime levels", value: `${model.upgradeRows.length} rows` },
    { label: "leaderboard", source: model.playerState.leaderboard?.length ? model.playerState.source : "missing source", value: model.playerState.leaderboard?.length ? `${model.playerState.leaderboard.length} rows` : "hidden" },
    { label: "event", source: model.playerState.activeEvent ? model.playerState.source : "missing source", value: model.playerState.activeEvent?.title ?? "No Active Event" },
    { label: "alignment", source: model.playerState.alignment ? model.playerState.source : "default player state", value: model.alignmentLabel },
    { label: "boosts", source: model.playerState.boosts?.length ? model.playerState.source : "missing source", value: model.playerState.boosts?.length ? `${model.playerState.boosts.length} boosts` : "none" },
    { label: "colony progress", source: model.playerState.colonyProgressLabel ? model.playerState.source : "missing source", value: model.playerState.colonyProgressLabel ?? "missing" }
  ];
}

function DashboardDataArtInspector({ model, artAudit }: { model: DashboardModel; artAudit: DashboardArtResolution[] }) {
  const missing = artAudit.filter((item) => item.mappingStatus === "missing" || item.warnings.length);
  const demoValues = model.mode === "demo" ? dashboardDataAudit(model).filter((item) => item.source === "demo-fixture") : [];

  return (
    <aside className="absolute bottom-3 right-3 z-40 max-h-[46rem] w-[28rem] overflow-auto rounded-md border border-cyan-200/25 bg-slate-950/94 p-3 text-[0.68rem] text-cyan-50 shadow-[0_18px_48px_rgba(0,0,0,0.42)]">
      <div className="text-xs font-black uppercase text-cyan-100">Dashboard Data & Art</div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-sm bg-white/[0.04] p-2">
          <div className="uppercase text-cyan-100/52">Runtime</div>
          <div className="font-black">{model.dataSourceLabel}</div>
        </div>
        <div className="rounded-sm bg-white/[0.04] p-2">
          <div className="uppercase text-cyan-100/52">Content</div>
          <div className="font-black">v{model.runtimeState?.contentVersion ?? "storybook"}</div>
        </div>
        <div className="rounded-sm bg-white/[0.04] p-2">
          <div className="uppercase text-cyan-100/52">Player State</div>
          <div className="font-black">{model.playerState.sourceLabel}</div>
        </div>
        <div className="rounded-sm bg-white/[0.04] p-2">
          <div className="uppercase text-cyan-100/52">Demo Values</div>
          <div className="font-black">{demoValues.length}</div>
        </div>
      </div>
      <div className="mt-3">
        <div className="font-black uppercase text-cyan-100/75">Missing / Fallback Art</div>
        <div className="mt-1 space-y-1">
          {missing.map((item) => (
            <div key={item.key} className="rounded-sm border border-white/10 bg-black/25 p-1.5">
              <div className="font-black">{item.key} · {item.mappingStatus}</div>
              <div className="truncate text-cyan-100/58">{item.path ?? "no path"} {item.warnings.join(", ")}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3">
        <div className="font-black uppercase text-cyan-100/75">Visible Data</div>
        <div className="mt-1 grid grid-cols-1 gap-1">
          {dashboardDataAudit(model).map((item) => (
            <div key={item.label} className="grid grid-cols-[7rem_1fr] gap-2 rounded-sm bg-white/[0.03] px-2 py-1">
              <span className="uppercase text-cyan-100/45">{item.label}</span>
              <span className="truncate">{item.source}: {item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export function GameShell({
  data,
  runtimeState,
  playerState,
  activeScreen = "dashboard",
  activeEraId = "survival",
  activeCategoryId = "workforce"
}: {
  data: GameRuntimeData;
  runtimeState?: RuntimeContentState;
  playerState?: DashboardPlayerState;
  activeScreen?: string;
  activeEraId?: string;
  activeCategoryId?: string;
}) {
  const category = data.upgradeCategories.find((item) => item.id === activeCategoryId) ?? data.upgradeCategories[0];
  const model = useMemo(() => createDashboardModel(data, { runtimeState, playerState, activeEraId, activeCategoryId: category.id }), [activeEraId, category.id, data, playerState, runtimeState]);
  const dashboardArt = useMemo(() => createDashboardArtMap(data.assets), [data.assets]);
  const artAudit = useMemo(() => getDashboardArtAudit(data.assets), [data.assets]);

  return (
    <main className="flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_50%_12%,rgba(45,212,255,0.14),transparent_34rem),linear-gradient(145deg,#030713_0%,#071225_52%,#050816_100%)] text-[var(--genesis-text)]" style={shellStyle}>
      <div
        className="relative aspect-video overflow-hidden border border-cyan-200/30 bg-[#06111f] shadow-[0_0_70px_rgba(45,212,255,0.16),inset_0_0_60px_rgba(0,0,0,0.54)]"
        style={{ width: "min(100vw, 1920px, calc(100vh * 16 / 9))" }}
      >
        {dashboardImagePath(dashboardArt.dashboard_background) ? <img src={dashboardImagePath(dashboardArt.dashboard_background)} alt="" className="absolute inset-0 h-full w-full object-fill opacity-95" /> : <DashboardMissingArt art={dashboardArt.dashboard_background} className="absolute inset-0" />}
        <div style={robloxLayoutRect(ROBLOX_DASHBOARD_LAYOUT.topHud)}>
          <RobloxTopHud model={model} art={dashboardArt} />
        </div>
        <RuntimeSourceBadge model={model} />
        <div style={robloxLayoutRect(ROBLOX_DASHBOARD_LAYOUT.sidebar)}>
          <RobloxNavigation active={activeScreen} art={dashboardArt} />
        </div>
        <div style={robloxLayoutRect(ROBLOX_DASHBOARD_LAYOUT.leftColumn)}>
          <RobloxLeftColumn data={data} model={model} art={dashboardArt} showDevWarnings={dashboardDevToolsEnabled} />
        </div>
        <div style={robloxLayoutRect(ROBLOX_DASHBOARD_LAYOUT.hero)}>
          <RobloxHero data={data} model={model} art={dashboardArt} />
        </div>
        <div style={robloxLayoutRect(ROBLOX_DASHBOARD_LAYOUT.upgrades)}>
          <RobloxUpgradePanel categories={data.upgradeCategories} activeCategoryId={category.id} model={model} assets={data.assets} art={dashboardArt} />
        </div>
        <div style={robloxLayoutRect(ROBLOX_DASHBOARD_LAYOUT.rightColumn)}>
          <RobloxRightColumn model={model} art={dashboardArt} />
        </div>
        <div className="z-20" style={robloxLayoutRect(ROBLOX_DASHBOARD_LAYOUT.boostToggle)}>
          <RobloxBoostBar model={model} />
        </div>
        {dashboardDevToolsEnabled ? <DashboardDataArtInspector model={model} artAudit={artAudit} /> : null}
      </div>
    </main>
  );
}

export function ArtReviewGallery({ data, filter = "all" }: { data: GameRuntimeData; filter?: "all" | "final" | "draft" | "placeholder" | "missing" }) {
  const records = useMemo(() => {
    return data.assets.filter((asset) => {
      const status = (asset.status ?? "").toLowerCase();
      const hasWeb = Boolean(asset.platformMappings?.web?.path);
      if (filter === "missing") return !hasWeb;
      if (filter === "final") return status.includes("final") || status.includes("uploaded") || status.includes("generated");
      if (filter === "draft") return status.includes("draft") || status.includes("source");
      if (filter === "placeholder") return status.includes("placeholder");
      return true;
    });
  }, [data.assets, filter]);

  return (
    <main className="min-h-screen bg-[image:var(--genesis-app-gradient)] p-4" style={shellStyle}>
      <div className="mx-auto max-w-[1600px]">
        <Panel title="Art Review Gallery" eyebrow={`${records.length} of ${data.assets.length} canonical assets`}>
          <div className="mb-3 flex flex-wrap gap-2">
            {["all", "final", "draft", "placeholder", "missing"].map((status) => (
              <StatusBadge key={status} label={status} tone={status === filter ? "cyan" : "muted"} />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {records.map((asset) => {
              const linkedResources = data.resources.filter((resource) => resource.artKey === asset.artKey || resource.iconKey === asset.artKey);
              const linkedUpgrades = data.upgrades.filter((upgrade) => upgrade.iconKey === asset.artKey);
              const art = resolveRuntimeAsset({ name: asset.name, artKey: asset.artKey, iconKey: asset.artKey }, asset);
              return (
                <article key={asset.id} className={panelClasses("overflow-hidden")}>
                  <ArtworkFrame art={art} className="h-36 w-full" />
                  <div className="space-y-2 p-3 text-xs text-cyan-50/70">
                    <div className="text-sm font-black text-white">{asset.name}</div>
                    <div>ID: {asset.id}</div>
                    <div>artKey: {asset.artKey}</div>
                    <div>category: {asset.category}</div>
                    <div>status: {asset.status ?? "Missing"}</div>
                    <div className="break-all">web: {asset.platformMappings?.web?.path ?? "missing mapping"}</div>
                    <div>linked: {linkedResources.length} resources, {linkedUpgrades.length} upgrades</div>
                  </div>
                </article>
              );
            })}
          </div>
        </Panel>
      </div>
    </main>
  );
}

function ReferenceCapture({ reference, className = "" }: { reference: RobloxReference; className?: string }) {
  const [failed, setFailed] = useState(reference.status === "missing");
  const src = `/design-reference/roblox/${reference.filename}`;

  if (failed) {
    return (
      <div className={`flex min-h-[420px] flex-col items-center justify-center rounded-md border border-dashed border-amber-200/30 bg-black/35 p-6 text-center ${className}`}>
        <ImageIcon className="h-10 w-10 text-amber-100/72" />
        <div className="mt-3 text-lg font-black text-white">Reference Missing</div>
        <p className="mt-2 max-w-md text-sm leading-6 text-cyan-50/65">
          Add <span className="font-bold text-amber-100">{reference.filename}</span> under <span className="font-bold text-amber-100">public/design-reference/roblox</span> and update the manifest status when the capture is ready.
        </p>
      </div>
    );
  }

  return <img src={src} alt={`${reference.screen} Roblox reference`} className={`h-full w-full rounded-md object-contain ${className}`} onError={() => setFailed(true)} />;
}

function AlignmentGuides() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-y-0 left-[148px] w-px bg-fuchsia-300/50" />
      <div className="absolute inset-y-0 left-[508px] w-px bg-fuchsia-300/50" />
      <div className="absolute inset-y-0 left-[1452px] w-px bg-fuchsia-300/50" />
      <div className="absolute inset-x-0 top-[119px] h-px bg-fuchsia-300/50" />
      <div className="absolute inset-y-0 right-[436px] w-px bg-fuchsia-300/50" />
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(217,70,239,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(217,70,239,0.22)_1px,transparent_1px)] [background-size:80px_80px]" />
    </div>
  );
}

function ScaledDashboardPreview({ data, showGuides }: { data: GameRuntimeData; showGuides: boolean }) {
  return (
    <div className="flex min-h-[700px] items-start justify-center overflow-hidden p-3">
      <div className="h-[410px] w-[730px] overflow-hidden rounded-md border border-cyan-200/20 bg-slate-950">
        <div className="relative h-[1080px] w-[1920px] origin-top-left scale-[0.38]">
          <GameShell data={data} />
          {showGuides ? <AlignmentGuides /> : null}
        </div>
      </div>
    </div>
  );
}

export function RobloxParityReview({
  data,
  status = "In Progress",
  opacity = 0.5,
  notes = "Dashboard-main-1920 reference loaded from the Vite public path. v2.1 pass is tuned against the real Roblox capture; parity remains In Progress until extracted Roblox artwork and icon assets replace the remaining local approximations."
}: {
  data: GameRuntimeData;
  status?: ParityStatus;
  opacity?: number;
  notes?: string;
}) {
  const dashboardReferences = robloxReferences.filter((reference) => reference.screen === "dashboard");
  const [selectedReferenceId, setSelectedReferenceId] = useState(dashboardReferences[0]?.id ?? "");
  const [mode, setMode] = useState<ParityMode>("side-by-side");
  const [overlayOpacity, setOverlayOpacity] = useState(opacity);
  const [reviewStatus, setReviewStatus] = useState<ParityStatus>(status);
  const [reviewNotes, setReviewNotes] = useState(notes);
  const [showGuides, setShowGuides] = useState(true);
  const [viewport, setViewport] = useState("1920x1080");
  const selectedReference = dashboardReferences.find((reference) => reference.id === selectedReferenceId) ?? dashboardReferences[0];
  const referenceViewport = selectedReference ? `${selectedReference.viewportWidth}x${selectedReference.viewportHeight}` : viewport;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem("genesis-dashboard-parity-review");
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<{
        selectedReferenceId: string;
        mode: ParityMode;
        overlayOpacity: number;
        reviewStatus: ParityStatus;
        reviewNotes: string;
        showGuides: boolean;
        viewport: string;
      }>;
      if (parsed.selectedReferenceId) setSelectedReferenceId(parsed.selectedReferenceId);
      if (parsed.mode) setMode(parsed.mode);
      if (typeof parsed.overlayOpacity === "number") setOverlayOpacity(parsed.overlayOpacity);
      if (parsed.reviewStatus) setReviewStatus(parsed.reviewStatus);
      if (parsed.reviewNotes) setReviewNotes(parsed.reviewNotes);
      if (typeof parsed.showGuides === "boolean") setShowGuides(parsed.showGuides);
      if (parsed.viewport) setViewport(parsed.viewport);
    } catch {
      window.localStorage.removeItem("genesis-dashboard-parity-review");
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "genesis-dashboard-parity-review",
      JSON.stringify({ selectedReferenceId, mode, overlayOpacity, reviewStatus, reviewNotes, showGuides, viewport })
    );
  }, [selectedReferenceId, mode, overlayOpacity, reviewStatus, reviewNotes, showGuides, viewport]);

  const artMappings = [
    ["Hero era artwork", data.eras[0]?.artKey ?? "era-survival", "placeholder"],
    ["HUD resource icons", data.resources.slice(0, 7).map((resource) => resource.iconKey).join(", "), "mixed"],
    ["Upgrade row icons", data.upgrades.slice(0, 4).map((upgrade) => upgrade.iconKey ?? "missing").join(", "), "placeholder"],
    ["Panel/event accents", "local UI tokens", "draft"]
  ];

  return (
    <main className="min-h-screen bg-[image:var(--genesis-app-gradient)] p-4" style={shellStyle}>
      <div className="mx-auto grid max-w-[1920px] grid-cols-[1fr_24rem] gap-3">
        <div className={mode === "side-by-side" ? "grid min-h-[760px] grid-cols-2 gap-3" : "relative min-h-[760px] overflow-hidden rounded-md border border-cyan-200/20"}>
          {mode === "side-by-side" ? (
            <>
              <div className={panelClasses("min-h-[760px] overflow-hidden p-3")}>
                <div className="mb-2 flex items-center justify-between">
                  <StatusBadge label="Roblox Reference" tone={selectedReference?.status === "missing" ? "gold" : "cyan"} />
                  <span className="text-xs font-bold text-cyan-100/60">{referenceViewport}</span>
                </div>
                <div className="flex min-h-[700px] items-start">
                  <div className="aspect-video w-full overflow-hidden rounded-md border border-cyan-200/20 bg-slate-950">
                    {selectedReference ? <ReferenceCapture reference={selectedReference} /> : null}
                  </div>
                </div>
              </div>
              <div className="relative min-h-[760px] overflow-hidden rounded-md border border-cyan-200/20">
                <ScaledDashboardPreview data={data} showGuides={showGuides} />
              </div>
            </>
          ) : (
            <>
              <GameShell data={data} />
              {selectedReference ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black" style={{ opacity: overlayOpacity }}>
                  <ReferenceCapture reference={selectedReference} className="h-full max-h-full" />
                </div>
              ) : null}
              {showGuides ? <AlignmentGuides /> : null}
            </>
          )}
        </div>
        <Panel title="Roblox Parity" eyebrow="Main Dashboard" action={<StatusBadge label={reviewStatus} tone={reviewStatus === "Approved" ? "success" : reviewStatus === "Close" ? "gold" : "cyan"} />}>
          <div className="space-y-3 text-sm text-cyan-50/72">
            <label className="block">
              <span className="text-xs font-bold uppercase text-cyan-100/55">Screenshot</span>
              <select className="mt-1 h-10 w-full rounded-md border border-cyan-200/24 bg-slate-950 px-2 text-sm font-bold text-white" value={selectedReferenceId} onChange={(event) => setSelectedReferenceId(event.target.value)}>
                {dashboardReferences.map((reference) => (
                  <option key={reference.id} value={reference.id}>
                    {reference.id} ({reference.status})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button className={`h-9 rounded-md border text-sm font-bold transition active:translate-y-px ${mode === "side-by-side" ? "border-cyan-200/55 bg-cyan-300/16 text-white" : "border-white/10 bg-black/25 text-cyan-100/70"}`} onClick={() => setMode("side-by-side")}>
                Side by Side
              </button>
              <button className={`h-9 rounded-md border text-sm font-bold transition active:translate-y-px ${mode === "overlay" ? "border-cyan-200/55 bg-cyan-300/16 text-white" : "border-white/10 bg-black/25 text-cyan-100/70"}`} onClick={() => setMode("overlay")}>
                Overlay
              </button>
            </div>
            <label className="block">
              <span className="text-xs font-bold uppercase text-cyan-100/55">Overlay Opacity: {Math.round(overlayOpacity * 100)}%</span>
              <input className="mt-2 w-full accent-cyan-300" type="range" min="0" max="100" value={Math.round(overlayOpacity * 100)} onChange={(event) => setOverlayOpacity(Number(event.target.value) / 100)} />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-xs font-bold uppercase text-cyan-100/55">Viewport</span>
                <select className="mt-1 h-10 w-full rounded-md border border-cyan-200/24 bg-slate-950 px-2 text-sm font-bold text-white" value={viewport} onChange={(event) => setViewport(event.target.value)}>
                  <option value="1920x1080">1920 x 1080</option>
                  <option value="1440x900">1440 x 900</option>
                  <option value="1024x768">1024 x 768</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-bold uppercase text-cyan-100/55">Status</span>
                <select className="mt-1 h-10 w-full rounded-md border border-cyan-200/24 bg-slate-950 px-2 text-sm font-bold text-white" value={reviewStatus} onChange={(event) => setReviewStatus(event.target.value as ParityStatus)}>
                  <option>Not Started</option>
                  <option>In Progress</option>
                  <option>Close</option>
                  <option>Approved</option>
                </select>
              </label>
            </div>
            <label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/25 p-2 text-sm font-bold text-white">
              <input type="checkbox" checked={showGuides} onChange={(event) => setShowGuides(event.target.checked)} className="accent-cyan-300" />
              Alignment guides
            </label>
            <label className="block">
              <span className="text-xs font-bold uppercase text-cyan-100/55">Mismatch Notes</span>
              <textarea className="mt-1 min-h-28 w-full resize-y rounded-md border border-cyan-200/24 bg-slate-950 p-2 text-sm leading-5 text-cyan-50" value={reviewNotes} onChange={(event) => setReviewNotes(event.target.value)} />
            </label>
            <div className="rounded-md bg-black/25 p-3">
              <div className="text-xs uppercase text-cyan-100/55">Reference Notes</div>
              <p className="mt-1">{selectedReference?.notes ?? "No reference selected."}</p>
            </div>
            <div className="rounded-md bg-black/25 p-3">
              <div className="text-xs uppercase text-cyan-100/55">Art Mappings</div>
              <div className="mt-2 space-y-2">
                {artMappings.map(([label, key, state]) => (
                  <div key={label} className="rounded-md border border-white/10 bg-white/[0.03] p-2">
                    <div className="font-bold text-white">{label}</div>
                    <div className="mt-1 break-all text-xs text-cyan-100/60">{key}</div>
                    <div className="mt-1 text-xs uppercase text-amber-100/75">{state}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-black/25 p-3">
              <div className="text-xs uppercase text-cyan-100/55">Mismatch Checklist</div>
              <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-cyan-50/64">
                {["Outer frame", "HUD", "Sidebar", "Left panels", "Hero crop", "Upgrade panel", "Right column", "Boost bar"].map((item) => (
                  <div key={item} className="rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1">{item}</div>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </main>
  );
}

export function StoryCanvas({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="min-h-screen bg-[image:var(--genesis-app-gradient)] p-4 text-[var(--genesis-text)]" style={{ ...shellStyle, ...style }}>
      {children}
    </div>
  );
}
