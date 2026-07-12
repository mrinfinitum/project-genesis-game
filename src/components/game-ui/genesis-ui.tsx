import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  ChevronRight,
  CircleHelp,
  Compass,
  Crown,
  FlaskConical,
  Gauge,
  Globe2,
  Hammer,
  Hexagon,
  ImageIcon,
  Lock,
  MousePointerClick,
  Orbit,
  Rocket,
  Settings,
  Shield,
  Sparkles,
  Star,
  Zap
} from "lucide-react";
import { heroCropSettings, resolveRuntimeAsset, type RuntimeAssetResolution } from "@/lib/canonical-runtime";
import type { AssetDefinition, EraDefinition, GameRuntimeData, ResourceDefinition, UpgradeCategory, UpgradeDefinition } from "@/lib/canonical-runtime";
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
  return (
    <Panel title="Automation" eyebrow="Local Simulation" action={<Bot className="h-5 w-5 text-emerald-200" />}>
      <div className="space-y-2">
        {["Gathering Drone", "Workshop Line", "Research Assistant"].map((name, index) => (
          <div key={name} className="rounded-md border border-white/10 bg-black/28 p-3 transition hover:border-cyan-200/28 hover:bg-cyan-300/8">
            <div className="flex items-center justify-between gap-3">
              <div className="font-semibold text-white">{name}</div>
              <StatusBadge label={index === 2 ? "Locked" : "Active"} tone={index === 2 ? "muted" : "success"} />
            </div>
            <ProgressMeter value={index === 2 ? 24 : 70 - index * 18} label={index === 2 ? "Unlock" : "Cycle"} />
          </div>
        ))}
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
        {["You", "Studio Ghost", "Weekly Baseline"].map((name, index) => (
          <div key={name} className="flex items-center justify-between rounded-md bg-black/25 px-3 py-2 text-sm">
            <span className="font-semibold text-white">{index + 1}. {name}</span>
            <span className="font-black text-amber-100">{compactNumber(12000 - index * 1840)}</span>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export function ActiveEventPanel() {
  return (
    <Panel title="Active Event" eyebrow="Weekly Challenge" action={<Sparkles className="h-5 w-5 text-fuchsia-200" />}>
      <div className="rounded-md border border-fuchsia-200/20 bg-fuchsia-400/10 p-3">
        <div className="font-black text-white">Mineral Surge</div>
        <p className="mt-1 text-sm text-cyan-50/68">Production goals use local simulation data for visual tuning.</p>
        <ProgressMeter value={48} label="Progress" />
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

export function GameShell({ data, activeScreen = "dashboard", activeEraId = "survival", activeCategoryId = "workforce" }: { data: GameRuntimeData; activeScreen?: string; activeEraId?: string; activeCategoryId?: string }) {
  const era = data.eras.find((item) => item.id === activeEraId) ?? data.eras[0];
  const category = data.upgradeCategories.find((item) => item.id === activeCategoryId) ?? data.upgradeCategories[0];
  const eraResources = data.resources.filter((resource) => resource.discoveredEraId === era.id || resource.usableEraId === era.id).slice(0, 8);
  const upgrades = data.upgrades.filter((upgrade) => upgrade.eraId === era.id && upgrade.categoryId === category.id).slice(0, 6);

  return (
    <main className="min-h-screen bg-[image:var(--genesis-app-gradient)] p-[14px] text-[var(--genesis-text)]" style={shellStyle}>
      <div className="mx-auto grid h-[calc(100vh-28px)] min-h-[792px] max-w-[1920px] grid-rows-[70px_1fr_56px] gap-3">
        <TopResourceHud resources={data.resources} assets={data.assets} />
        <div className="grid min-h-0 grid-cols-[104px_286px_1fr_322px] gap-3">
          <SidebarNavigation active={activeScreen} />
          <div className="min-w-0 space-y-3 overflow-auto">
            <ManualProductionPanel resourceName={eraResources[0]?.displayName ?? "Labor"} />
            <AutomationPanel />
            <CriticalStatsPanel />
          </div>
          <div className="min-w-0 space-y-3 overflow-auto">
            <HeroObjectivePanel era={era} resources={eraResources.length ? eraResources : data.resources} assets={data.assets} />
            <CurrentEraJourney eras={data.eras} activeEraId={era.id} />
            <Panel title={activeScreen === "research" ? "Research Upgrades" : "Upgrade Matrix"} eyebrow={category.displayName}>
              <UpgradeCategoryTabs categories={data.upgradeCategories} activeCategoryId={category.id} />
              <div className="mt-3 grid gap-2">
                {upgrades.length ? upgrades.map((upgrade, index) => <UpgradeCard key={upgrade.id} upgrade={upgrade} assets={data.assets} state={index === 0 ? "affordable" : index > 3 ? "locked" : "available"} level={index} />) : <UnknownUpgradeCard />}
              </div>
            </Panel>
          </div>
          <div className="min-w-0 space-y-3 overflow-auto">
            <LeaderboardPanel />
            <ActiveEventPanel />
            <AlignmentPanel />
          </div>
        </div>
        <BoostBar value={72} />
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
          Add <span className="font-bold text-amber-100">{reference.filename}</span> under <span className="font-bold text-amber-100">design-reference/roblox</span> and update the manifest status when the capture is ready.
        </p>
      </div>
    );
  }

  return <img src={src} alt={`${reference.screen} Roblox reference`} className={`h-full w-full rounded-md object-contain ${className}`} onError={() => setFailed(true)} />;
}

function AlignmentGuides() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute inset-y-0 left-[104px] w-px bg-fuchsia-300/50" />
      <div className="absolute inset-y-0 left-[402px] w-px bg-fuchsia-300/50" />
      <div className="absolute inset-x-0 top-[70px] h-px bg-fuchsia-300/50" />
      <div className="absolute inset-y-0 right-[322px] w-px bg-fuchsia-300/50" />
      <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(217,70,239,0.28)_1px,transparent_1px),linear-gradient(90deg,rgba(217,70,239,0.22)_1px,transparent_1px)] [background-size:80px_80px]" />
    </div>
  );
}

export function RobloxParityReview({
  data,
  status = "In Progress",
  opacity = 0.36,
  notes = "Main dashboard parity pass focuses on HUD spacing, left navigation, hero artwork, right-side panels, and neon contrast."
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
                {selectedReference ? <ReferenceCapture reference={selectedReference} className="min-h-[700px]" /> : null}
              </div>
              <div className="relative min-h-[760px] overflow-hidden rounded-md border border-cyan-200/20">
                <GameShell data={data} />
                {showGuides ? <AlignmentGuides /> : null}
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
