import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bot,
  Building2,
  CalendarDays,
  Check,
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
  X,
  Zap
} from "lucide-react";
import { createDashboardArtMap, dashboardAssetFailureDiagnostic, getDashboardArtAudit, heroCropSettings, resolveRuntimeAsset, type DashboardArtKey, type DashboardArtResolution, type RuntimeAssetResolution } from "@/lib/canonical-runtime";
import type { AssetDefinition, EraDefinition, GameRuntimeData, ResourceDefinition, RuntimeContentState, UpgradeCategory, UpgradeDefinition } from "@/lib/canonical-runtime";
import { CANONICAL_ALIGNMENT_AXES, createDashboardModel, type DashboardModel, type DashboardPlayerState } from "@/lib/dashboard/dashboard-model";
import { getFocusedDashboardEras } from "@/lib/dashboard/era-navigation";
import { ROBLOX_DASHBOARD_LAYOUT, ROBLOX_DASHBOARD_REFERENCE } from "@/lib/dashboard/dashboard-layout";
import { calculateGameViewportScale, loadGameDisplayPreferences, saveGameDisplayPreferences, type GameDisplayMode, type GameDisplayPreferences, type GameViewportScaleResult } from "@/lib/dashboard/viewport-scaling";
import type { PlayerRuntimeState } from "@/lib/player-runtime";
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

type PlayerRuntimeDashboardActions = {
  saveNow: () => void;
  resetSave: () => void;
  exportSave: () => string;
  importSave: (serialized: string) => boolean;
  advanceSimulation: (seconds?: number) => void;
  grantTestResources: () => void;
  click: () => void;
  toggleAutomation: () => void;
  activateBoost?: (definitionId: string) => void;
};

export type BoostSlotState = "available" | "active" | "locked" | "unavailable" | "cooldown";

export type BoostTraySlot = {
  id: string;
  name: string;
  shortEffect: string;
  multiplier?: string;
  duration?: string;
  remainingTime?: string;
  cost?: string;
  targetSystem?: PlayerRuntimeState["boosts"]["active"][number]["targetSystem"];
  state: BoostSlotState;
  accent?: "cyan" | "purple" | "green" | "gold" | "rose";
};

type TopHudResource = {
  id: string;
  name: string;
  displayName: string;
  category: string;
  iconKey?: string;
  artKey?: string;
  color?: string;
};

const robloxReferences = robloxReferenceManifest as RobloxReference[];

const shellStyle = tokenStyle();
const dashboardDevToolsEnabled = import.meta.env.VITE_ENABLE_DEV_TOOLS === "true";
// Matches the Roblox BOOST_TRAY_Z_INDEX layer with one central dashboard overlay token.
const DASHBOARD_OVERLAY_Z_INDEX = 80;

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: Gauge },
  { id: "production", label: "Production", icon: Hammer },
  { id: "research", label: "Research", icon: FlaskConical },
  { id: "resources", label: "Resources", icon: Coins },
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

export function TopResourceHud({ resources, assets, highValues = false, gaining = false, compact = false }: { resources: TopHudResource[]; assets: AssetDefinition[]; highValues?: boolean; gaining?: boolean; compact?: boolean }) {
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
  const journey = getFocusedDashboardEras(eras, activeEraId, 3);
  const gridClass = journey.length === 2 ? "grid-cols-2" : "grid-cols-[1fr_1.2fr_1fr]";

  return (
    <Panel title="Current Journey" eyebrow={`${eras.length}-era progression`} action={<button className="h-8 rounded-md border border-cyan-200/30 bg-cyan-300/10 px-3 text-xs font-black uppercase text-cyan-100 transition hover:bg-cyan-300/18 active:translate-y-px">View Full Timeline</button>}>
      <div className={`grid ${gridClass} gap-2`}>
        {journey.map(({ era, state }) => {
          const color = genesisTokens.era[era.id as keyof typeof genesisTokens.era] ?? genesisTokens.color.cyan;
          const isCurrent = state === "current";
          const label = state === "completed" ? "Previous" : state === "current" ? "Current" : "Next";
          const tone = state === "completed" ? "muted" : state === "current" ? "cyan" : "gold";
          return (
            <div key={`${label}-${era.id}`} className={`relative min-h-20 rounded-md border bg-black/30 p-3 ${isCurrent ? "shadow-[0_0_24px_rgba(45,212,255,0.18)]" : ""}`} style={{ borderColor: isCurrent ? color : "rgba(255,255,255,0.12)" }}>
              <div className="mb-1 flex items-center justify-between gap-2">
                <StatusBadge label={label} tone={tone} />
                <span className="text-xs font-black text-cyan-100/45">#{era.index}</span>
              </div>
              <div className="truncate text-lg font-black text-white">{shortEraName(era)}</div>
              <p className="mt-1 line-clamp-2 text-xs leading-4 text-cyan-50/62">{era.description}</p>
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

const reportedDashboardAssetFailures = new Set<string>();

function useDashboardAssetDiagnostics(artAudit: DashboardArtResolution[]) {
  useEffect(() => {
    if (!dashboardDevToolsEnabled || typeof window === "undefined") return;

    const byUrl = new Map(artAudit.filter((item) => item.path).map((item) => [item.path as string, item]));
    const diagnostics = artAudit
      .filter((item) => item.path)
      .map(async (item) => {
        let httpStatus: number | "fetch-failed";
        let mimeType = "";

        try {
          const response = await fetch(item.path as string, { method: "HEAD", cache: "no-store" });
          httpStatus = response.status;
          mimeType = response.headers.get("content-type") ?? "";
        } catch {
          httpStatus = "fetch-failed";
        }

        return {
          key: item.key,
          canonicalWebUrl: item.platformWebPath ?? "",
          localFallbackUrl: item.localPath ?? "",
          resolvedUrl: item.path,
          httpStatus,
          mimeType,
          fallbackUsed: item.mappingStatus === "local-fallback"
        };
      });

    void Promise.all(diagnostics).then((rows) => {
      console.table(rows);
    });

    function reportImageError(event: Event) {
      const target = event.target;
      if (!(target instanceof HTMLImageElement)) return;

      const failedUrl = target.currentSrc || target.src;
      const path = failedUrl.startsWith(window.location.origin) ? failedUrl.slice(window.location.origin.length) : failedUrl;
      const art = byUrl.get(path);
      const key = `${art?.key ?? "unknown"}:${path}`;

      if (reportedDashboardAssetFailures.has(key)) return;
      reportedDashboardAssetFailures.add(key);
      console.error("Dashboard asset failed to load", dashboardAssetFailureDiagnostic(art, path));
    }

    window.addEventListener("error", reportImageError, true);
    return () => window.removeEventListener("error", reportImageError, true);
  }, [artAudit]);
}

function DashboardMissingArt({ art, className = "" }: { art: DashboardArtResolution; className?: string }) {
  return (
    <div className={`flex items-center justify-center border border-amber-200/35 bg-amber-950/70 text-[10px] font-black uppercase text-amber-100 ${className}`}>
      {art.warnings[0] ?? "Missing"}
    </div>
  );
}

function helpText(art: DashboardArtResolution) {
  return art.mappingStatus === "missing" ? "Help" : art.label;
}

export function HelpIconButton({ art, className = "" }: { art: DashboardArtResolution; className?: string }) {
  const path = dashboardImagePath(art);

  return (
    <button
      type="button"
      aria-label={helpText(art)}
      title={helpText(art)}
      className={`flex items-center justify-center text-cyan-100/70 transition hover:text-cyan-50 ${className}`}
    >
      {path ? <img src={path} alt="" className="h-full w-full object-contain" /> : <CircleHelp className="h-full w-full" />}
    </button>
  );
}

type BeveledActionButtonProps = {
  art: DashboardArtResolution;
  label: string;
  tone: "cyan" | "green" | "muted";
  disabled?: boolean;
  active?: boolean;
  pressed?: boolean;
  onClick?: () => void;
  className?: string;
  "data-testid"?: string;
  "data-rojo-rect"?: string;
};

export function BeveledActionButton({ art, label, tone, disabled = false, active = false, pressed = false, onClick, className = "", "data-testid": dataTestId, "data-rojo-rect": dataRojoRect }: BeveledActionButtonProps) {
  const path = dashboardImagePath(art);
  const positionClass = /\babsolute\b/.test(className) ? "" : "relative";
  const imageButtonClasses = path
    ? "bg-transparent text-transparent shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-cyan-100/42"
    : "";
  const toneClasses = {
    cyan: "border-cyan-200/40 bg-[linear-gradient(180deg,rgba(20,124,168,0.9),rgba(4,48,86,0.95))] text-white shadow-[0_0_24px_rgba(45,212,255,0.18)]",
    green: "border-emerald-200/45 bg-[linear-gradient(180deg,rgba(28,146,78,0.92),rgba(7,79,48,0.96))] text-white shadow-[0_0_26px_rgba(52,245,106,0.24)]",
    muted: "border-cyan-200/18 bg-[linear-gradient(180deg,rgba(22,56,74,0.62),rgba(5,22,35,0.86))] text-cyan-100/62 shadow-none"
  }[tone];

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`${positionClass} overflow-hidden ${path ? "" : `${bevel} border ${toneClasses}`} ${imageButtonClasses} text-[23px] font-black uppercase tracking-normal transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 ${active ? "brightness-105" : ""} ${pressed ? "scale-[0.98] brightness-110" : ""} ${className}`}
      data-testid={dataTestId}
      data-rojo-rect={dataRojoRect}
    >
      {path ? <img src={path} alt="" data-art-key={art.key} className="pointer-events-none absolute inset-0 h-full w-full object-contain" /> : <DashboardMissingArt art={art} className="absolute inset-0" />}
      {!path ? <span className="relative z-10 [text-shadow:0_2px_6px_rgba(0,0,0,0.72)]">{label}</span> : null}
      <span className="sr-only">{label}</span>
    </button>
  );
}

type RotatingControlRingProps = {
  outerArt: DashboardArtResolution;
  centerArt: DashboardArtResolution;
  middleArt?: DashboardArtResolution;
  innerArt?: DashboardArtResolution;
  variant: "click" | "auto";
  active?: boolean;
  disabled?: boolean;
  pulseKey?: number;
  onActivate?: () => void;
  className?: string;
  "data-testid"?: string;
  "data-rojo-rect"?: string;
};

function ringDurationStyle(seconds: number): CSSProperties {
  return { "--genesis-ring-duration": `${seconds}s` } as CSSProperties;
}

export function RotatingControlRing({ outerArt, centerArt, middleArt, innerArt, variant, active = true, disabled = false, pulseKey = 0, onActivate, className = "", "data-testid": dataTestId, "data-rojo-rect": dataRojoRect }: RotatingControlRingProps) {
  const outerPath = dashboardImagePath(outerArt);
  const middlePath = middleArt ? dashboardImagePath(middleArt) : undefined;
  const innerPath = innerArt ? dashboardImagePath(innerArt) : undefined;
  const centerPath = dashboardImagePath(centerArt);
  const glow = variant === "auto" ? "rgba(52,245,106,0.42)" : "rgba(45,212,255,0.48)";
  const FallbackIcon = variant === "auto" ? Bot : MousePointerClick;

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onActivate}
      className={`group absolute flex items-center justify-center rounded-full transition active:scale-[0.96] disabled:opacity-50 ${className}`}
      aria-label={variant === "auto" ? "Toggle auto click" : "Click power"}
      data-testid={dataTestId}
      data-rojo-rect={dataRojoRect}
    >
      <span key={pulseKey} className={`absolute inset-0 rounded-full ${pulseKey > 0 ? "genesis-control-pulse" : ""}`} style={{ boxShadow: `0 0 30px ${active ? glow : "rgba(125,249,255,0.12)"}` }} />
      {outerPath ? (
        <img
          src={outerPath}
          alt=""
          className={`genesis-control-ring absolute inset-0 h-full w-full object-contain ${active ? "opacity-75" : "opacity-36"} transition-opacity`}
          style={ringDurationStyle(variant === "auto" ? 12 : 11)}
        />
      ) : (
        <DashboardMissingArt art={outerArt} className="absolute inset-0 rounded-full" />
      )}
      {middlePath ? (
        <img
          src={middlePath}
          alt=""
          className={`genesis-control-ring-reverse absolute inset-0 h-full w-full object-contain ${active ? "opacity-62" : "opacity-28"} transition-opacity`}
          style={ringDurationStyle(13)}
        />
      ) : null}
      {innerPath ? (
        <img
          src={innerPath}
          alt=""
          className={`genesis-control-ring absolute inset-0 h-full w-full object-contain ${active ? "opacity-82" : "opacity-34"} transition-opacity`}
          style={ringDurationStyle(8)}
        />
      ) : null}
      {centerPath ? (
        <img
          src={centerPath}
          alt=""
          className="relative h-[31%] w-[31%] object-contain transition-transform group-active:scale-90"
        />
      ) : (
        <FallbackIcon className={`relative h-[31%] w-[31%] ${variant === "auto" ? "text-emerald-100" : "text-cyan-100"}`} />
      )}
    </button>
  );
}

function formattedClickLabel(label: string) {
  const normalized = label.trim().toUpperCase();
  if (normalized.length <= 14) return normalized;
  return normalized.replace(/\s+/, "\n");
}

export function ClickPowerPanel({
  data,
  model,
  art,
  showDevWarnings = false,
  onClick,
  pressed = false,
  pulseKey = 0
}: {
  data: GameRuntimeData;
  model: DashboardModel;
  art: DashboardArtMap;
  showDevWarnings?: boolean;
  onClick?: () => void;
  pressed?: boolean;
  pulseKey?: number;
}) {
  const clickResource = model.playerState.clickOutput?.resourceId ? data.resources.find((resource) => resource.id === model.playerState.clickOutput?.resourceId) : undefined;
  const clickResourceLabel = model.playerState.clickOutput?.label ?? clickResource?.displayName ?? "Civilization Energy";
  const hasClickState = Boolean(model.playerState.clickOutput);
  const lastClick = model.playerState.clickOutput?.amount ?? 0;

  return (
    <section className="absolute left-0 top-0 h-[344px] w-full">
      {showDevWarnings && art.dashboard_click_interface.mappingStatus === "missing" ? (
        <div className="absolute right-5 top-11 z-10 rounded-sm border border-amber-200/45 bg-amber-950/80 px-2 py-1 text-[10px] font-black uppercase text-amber-100">
          click_interface_circle source missing
        </div>
      ) : null}
      <h2 className="absolute left-[38px] top-[30px] h-[40px] w-[250px] text-[28px] font-black uppercase leading-[2rem] text-cyan-100/90">Click Power</h2>
      <HelpIconButton art={art.dashboard_help_icon} className="absolute right-[22px] top-[31px] h-[20px] w-[20px]" />
      <RotatingControlRing
        outerArt={art.dashboard_click_ring}
        middleArt={art.click_ring_middle}
        innerArt={art.click_ring_inner}
        centerArt={art.dashboard_click_hand}
        variant="click"
        disabled={!hasClickState}
        pulseKey={pulseKey}
        onActivate={hasClickState ? onClick : undefined}
        data-testid="click-power-ring"
        data-rojo-rect="25,82,174,174"
        className="left-[25px] top-[82px] h-[174px] w-[174px]"
      />
      <div data-testid="click-power-stat-block" data-rojo-rect="196,82,126,152" className="absolute left-[196px] top-[82px] h-[152px] w-[126px] text-center">
        <div className="whitespace-pre-line text-[18px] font-black uppercase leading-[1.04] text-cyan-100/68">{formattedClickLabel(clickResourceLabel)}</div>
        <div className="mt-[15px] text-[38px] font-black leading-none text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.68)]">{hasClickState ? compactNumber(model.playerState.clickOutput?.amount ?? 0) : "--"}</div>
        <div className="mt-[18px] text-[21px] font-black uppercase leading-none text-cyan-200">{model.playerState.clickOutput?.perClickLabel ?? "Per Click"}</div>
        <div className={`mt-[8px] text-[20px] font-black uppercase leading-none text-cyan-300 ${pressed ? "genesis-control-pulse" : ""}`}>+{hasClickState ? compactNumber(lastClick) : "0"} Last</div>
      </div>
      <BeveledActionButton
        art={art.dashboard_click_button}
        label="CLICK!"
        tone="cyan"
        disabled={!hasClickState}
        pressed={pressed}
        onClick={hasClickState ? onClick : undefined}
        data-testid="click-power-button"
        data-rojo-rect="39,267,272,55"
        className="absolute left-[39px] top-[267px] h-[55px] w-[272px]"
      />
    </section>
  );
}

export function AutoClickPanel({
  model,
  art,
  onToggle
}: {
  model: DashboardModel;
  art: DashboardArtMap;
  onToggle?: () => void;
}) {
  const hasAutomation = Boolean(model.playerState.automation);
  const autoEnabled = model.playerState.automation?.enabled === true;
  const autoArt = autoEnabled ? art.dashboard_auto_button_on : art.dashboard_auto_button_off;

  return (
    <section data-testid="auto-click-panel" className="absolute left-0 top-[344px] h-[270px] w-full" data-rojo-rect={`${LEFT_COLUMN_GEOMETRY.auto.x},${LEFT_COLUMN_GEOMETRY.auto.y},${LEFT_COLUMN_GEOMETRY.auto.width},${LEFT_COLUMN_GEOMETRY.auto.height}`}>
      <h2 className="absolute left-[38px] top-[31px] h-[40px] w-[250px] text-[28px] font-black uppercase leading-[2rem] text-cyan-100/90">Auto Click</h2>
      <HelpIconButton art={art.dashboard_help_icon} className="absolute right-[22px] top-[33px] h-[20px] w-[20px]" />
      <RotatingControlRing
        outerArt={art.dashboard_auto_ring}
        centerArt={art.dashboard_auto_robot}
        variant="auto"
        active={autoEnabled}
        disabled={!hasAutomation}
        onActivate={hasAutomation ? onToggle : undefined}
        data-testid="auto-click-ring"
        data-rojo-rect="35,76,150,150"
        className="left-[35px] top-[76px] h-[150px] w-[150px]"
      />
      <div data-testid="auto-click-stat-block" data-rojo-rect="198,70,122,128" className="absolute left-[198px] top-[70px] h-[128px] w-[122px] text-center">
        <div className="text-[16px] font-black uppercase leading-[1.04] text-cyan-100/68">Auto Click<br />Power</div>
        <div className="mt-[15px] text-[36px] font-black leading-none text-white [text-shadow:0_2px_6px_rgba(0,0,0,0.68)]">{hasAutomation ? compactNumber(model.playerState.automation?.amountPerSecond ?? 0) : "--"}</div>
        <div className="mt-[16px] text-[20px] font-black uppercase leading-none text-cyan-200">Per/S</div>
      </div>
      <BeveledActionButton
        art={autoArt}
        label={autoEnabled ? "AUTO: ON" : "AUTO: OFF"}
        tone={hasAutomation ? (autoEnabled ? "green" : "muted") : "muted"}
        active={autoEnabled}
        disabled={!hasAutomation}
        onClick={hasAutomation ? onToggle : undefined}
        data-testid="auto-click-button"
        data-rojo-rect="33,206,286,55"
        className="absolute left-[33px] top-[206px] h-[55px] w-[286px]"
      />
    </section>
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

const ROBLOX_NAV_GEOMETRY = {
  contentTop: 18,
  contentBottom: 918,
  paddingX: 8,
  itemWidth: 144,
  iconLeft: 35.5,
  iconWidth: 72,
  iconHeight: 62,
  iconLabelGap: 8,
  labelLeft: 0,
  labelWidth: 144,
  labelHeight: 28,
  separatorLeft: 27,
  separatorWidth: 106
} as const;

const ROBLOX_NAV_SLOT_HEIGHT = (ROBLOX_NAV_GEOMETRY.contentBottom - ROBLOX_NAV_GEOMETRY.contentTop) / robloxNavItems.length;
const ROBLOX_NAV_GROUP_TOP = (ROBLOX_NAV_SLOT_HEIGHT - ROBLOX_NAV_GEOMETRY.iconHeight - ROBLOX_NAV_GEOMETRY.iconLabelGap - ROBLOX_NAV_GEOMETRY.labelHeight) / 2;
const ROBLOX_NAV_BAKED_SEPARATOR_TOPS = [131.5, 262, 396, 528.5, 661, 795] as const;

function robloxNavItemTop(index: number) {
  return ROBLOX_NAV_GEOMETRY.contentTop + index * ROBLOX_NAV_SLOT_HEIGHT;
}

function robloxNavIconTop(index: number) {
  return robloxNavItemTop(index) + ROBLOX_NAV_GROUP_TOP;
}

function robloxNavLabelTop(index: number) {
  return robloxNavIconTop(index) + ROBLOX_NAV_GEOMETRY.iconHeight + ROBLOX_NAV_GEOMETRY.iconLabelGap;
}

function robloxNavSeparatorTop(index: number) {
  return ROBLOX_NAV_GEOMETRY.contentTop + (index + 1) * ROBLOX_NAV_SLOT_HEIGHT;
}

const LEFT_COLUMN_GEOMETRY = {
  click: { x: 0, y: 0, width: 350, height: 320 },
  auto: { x: 0, y: 344, width: 350, height: 270 },
  critical: { x: 0, y: 638, width: 350, height: 185 }
} as const;

function WrenchIcon({ className }: { className?: string }) {
  return <Settings className={className} />;
}

function shortEraName(era: EraDefinition) {
  const eraWithShortName = era as EraDefinition & { shortDisplayName?: string };
  if (eraWithShortName.shortDisplayName) return eraWithShortName.shortDisplayName;
  if (era.id === "space-age") return "Space";
  return era.displayName.replace(" Era", "");
}

function dashboardEraVisibleCount(data: GameRuntimeData) {
  const configuredCount = data.clientProfiles.default.eraNavigation?.visibleEraCount;
  if (typeof configuredCount !== "number" || !Number.isFinite(configuredCount)) return 3;
  return Math.max(1, Math.min(3, Math.floor(configuredCount)));
}

function hudIconForResource(resource: { category: string; label: string }) {
  const haystack = `${resource.category} ${resource.label}`.toLowerCase();
  if (haystack.includes("crystal")) return Gem;
  if (haystack.includes("organic") || haystack.includes("wood")) return Leaf;
  if (haystack.includes("liquid") || haystack.includes("water")) return Globe2;
  if (haystack.includes("metal") || haystack.includes("mineral")) return Coins;
  return Hexagon;
}

function RobloxTopHud({ model, art, showDevWarnings = false }: { model: DashboardModel; art: DashboardArtMap; showDevWarnings?: boolean }) {
  const resourceSlots = [
    { x: 515, w: 230, iconX: 27, valueX: 94, textW: 132 },
    { x: 755, w: 230, iconX: 21, valueX: 88, textW: 132 },
    { x: 995, w: 230, iconX: -8, valueX: 58, textW: 132 },
    { x: 1215, w: 230, iconX: -8, valueX: 58, textW: 132 },
    { x: 1445, w: 185, iconX: -8, valueX: 58, textW: 107 }
  ];
  const hudResources = model.hudResources.slice(0, resourceSlots.length);
  const civilizationTitle = model.playerState.civilizationName ?? "Planet Prime";

  return (
    <header className="relative h-full w-full">
      {dashboardImagePath(art.dashboard_top_hud) ? <img src={dashboardImagePath(art.dashboard_top_hud)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.dashboard_top_hud} className="absolute inset-0" />}

      <div className="absolute left-[23px] top-[15px] flex h-[58px] items-center gap-2">
        {[Hexagon, Gauge, CircleHelp].map((Icon, index) => (
          <button key={index} className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-black/48 text-cyan-100/82">
            <Icon className="h-[22px] w-[22px]" />
          </button>
        ))}
      </div>

      <div className="absolute top-0 flex min-w-0 items-center gap-3 px-3" style={{ left: `${(190 / 1920) * 100}%`, width: `${(355 / 1920) * 100}%`, height: "100%" }}>
        <div className="min-w-0">
          <div className="truncate text-[1.9rem] font-black uppercase leading-none text-white [text-shadow:0_0_16px_rgba(45,212,255,0.18)]">{civilizationTitle}</div>
          <div className="mt-2 truncate text-[1.35rem] font-medium leading-none text-cyan-50/82">Era 1 - {shortEraName(model.currentEra)}</div>
        </div>
      </div>

      {showDevWarnings && model.economyWarnings.length ? (
        <div className="absolute left-[515px] top-[28px] max-w-[690px] truncate rounded-sm border border-amber-200/45 bg-amber-950/88 px-3 py-2 text-[0.65rem] font-black uppercase text-amber-100">
          {model.economyWarnings[0]}
        </div>
      ) : null}

      {hudResources.map((resource, index) => {
        const slot = resourceSlots[index];
          const Icon = hudIconForResource(resource);
          const iconArt = art[hudIconKeys[index]];
          return (
          <div key={resource.resourceId} className="absolute top-0 h-full min-w-0" style={{ left: `${(slot.x / 1920) * 100}%`, width: `${(slot.w / 1920) * 100}%` }}>
            {iconArt && dashboardImagePath(iconArt) ? (
              <img src={dashboardImagePath(iconArt)} alt="" className="absolute h-[58px] w-[58px] object-contain" style={{ left: slot.iconX, top: 23 }} />
            ) : (
              <div className="absolute flex h-[58px] w-[58px] items-center justify-center rounded-full border border-white/15 bg-white/[0.07] text-cyan-100" style={{ left: slot.iconX, top: 23 }}>
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

export function RobloxNavigation({ active, art }: { active: string; art: DashboardArtMap }) {
  const activeMap: Record<string, string> = {
    dashboard: "dashboard",
    production: "production",
    research: "research",
    resources: "resources",
    civilization: "civilization",
    earth: "production",
    solar: "galaxy",
    journal: "spaceport"
  };
  const current = activeMap[active] ?? active;

  return (
    <nav className="relative h-full w-full overflow-hidden" data-testid="roblox-integrated-nav-hud" data-dom-model="single-hud-image-with-absolute-overlays">
      {dashboardImagePath(art.dashboard_nav_background) ? (
        <img
          src={dashboardImagePath(art.dashboard_nav_background)}
          alt=""
          data-testid="roblox-sidebar-background"
          data-art-key="dashboard_nav_background"
          data-local-path={art.dashboard_nav_background.path}
          data-native-size="160x790"
          data-rendered-size={`${ROBLOX_DASHBOARD_LAYOUT.sidebar.width}x${ROBLOX_DASHBOARD_LAYOUT.sidebar.height}`}
          data-background-size="100% 100%"
          data-background-position="0 0"
          data-repeat="no-repeat"
          className="pointer-events-none absolute inset-0 z-0 h-full w-full object-fill"
        />
      ) : <DashboardMissingArt art={art.dashboard_nav_background} className="absolute inset-0" />}
      {ROBLOX_NAV_BAKED_SEPARATOR_TOPS.map((top, index) => (
        <span
          key={`baked-separator-mask-${index}`}
          data-testid={`roblox-nav-baked-separator-mask-${index}`}
          aria-hidden="true"
          className="pointer-events-none absolute z-[5] block h-[8px] bg-[linear-gradient(90deg,transparent,rgba(1,12,22,0.9)_12%,rgba(1,13,24,0.96)_50%,rgba(1,12,22,0.9)_88%,transparent)]"
          style={{
            left: 24,
            top: top - 4,
            width: 112
          }}
        />
      ))}
      {robloxNavItems.slice(0, -1).map((item, index) => (
        <span
          key={`separator-${item.id}`}
          data-testid={`roblox-nav-separator-${index}`}
          aria-hidden="true"
          className="pointer-events-none absolute z-10 block h-[1px] bg-[linear-gradient(90deg,transparent,rgba(78,168,218,0.28)_8%,rgba(112,204,255,0.66)_50%,rgba(78,168,218,0.28)_92%,transparent)] shadow-[0_0_7px_rgba(66,180,255,0.28)]"
          style={{
            left: ROBLOX_NAV_GEOMETRY.separatorLeft,
            top: robloxNavSeparatorTop(index),
            width: ROBLOX_NAV_GEOMETRY.separatorWidth
          }}
        />
      ))}
      {robloxNavItems.map((item, index) => {
        const Icon = item.icon;
        const isActive = item.id === current;
        const iconArt = art[menuIconKeys[index]];
        const itemTop = robloxNavItemTop(index);
        const iconStyle = {
          left: ROBLOX_NAV_GEOMETRY.paddingX + ROBLOX_NAV_GEOMETRY.iconLeft,
          top: robloxNavIconTop(index),
          width: ROBLOX_NAV_GEOMETRY.iconWidth,
          height: ROBLOX_NAV_GEOMETRY.iconHeight,
          opacity: 1,
          filter: "none"
        };
        const labelStyle = {
          left: ROBLOX_NAV_GEOMETRY.paddingX + ROBLOX_NAV_GEOMETRY.labelLeft,
          top: robloxNavLabelTop(index),
          width: ROBLOX_NAV_GEOMETRY.labelWidth,
          height: ROBLOX_NAV_GEOMETRY.labelHeight,
          opacity: 1
        };
        return (
          <Fragment key={item.id}>
            {iconArt && dashboardImagePath(iconArt) ? (
              <img
                src={dashboardImagePath(iconArt)}
                alt=""
                data-art-key={iconArt.key}
                data-testid={`roblox-nav-icon-${item.id}`}
                data-z-layer="icon-above-background"
                className="pointer-events-none absolute z-20 object-contain"
                style={iconStyle}
              />
            ) : (
              <Icon
                data-testid={`roblox-nav-icon-${item.id}`}
                data-z-layer="icon-above-background"
                className={`pointer-events-none absolute z-20 ${isActive ? "text-cyan-100" : "text-white/72"}`}
                style={iconStyle}
              />
            )}
            <span data-testid={`roblox-nav-label-${item.id}`} className="pointer-events-none absolute z-20 px-1 text-center text-[15px] font-black uppercase leading-tight text-blue-50 [text-shadow:0_1px_2px_rgba(0,0,0,0.66)]" style={labelStyle}>{item.label}</span>
            <button
              type="button"
              aria-label={item.label}
              data-testid={`roblox-nav-item-${item.id}`}
              data-active={isActive}
              data-rojo-size="1,0,0.11,0"
              className="absolute z-30 border-0 bg-transparent p-0 text-transparent outline-none transition hover:bg-cyan-100/5 focus-visible:outline focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-cyan-100/55"
              style={{
                left: ROBLOX_NAV_GEOMETRY.paddingX,
                top: itemTop,
                width: ROBLOX_NAV_GEOMETRY.itemWidth,
                height: ROBLOX_NAV_SLOT_HEIGHT
              }}
            />
          </Fragment>
        );
      })}
    </nav>
  );
}

function RobloxLeftColumn({
  data,
  model,
  art,
  showDevWarnings,
  playerRuntimeActions
}: {
  data: GameRuntimeData;
  model: DashboardModel;
  art: DashboardArtMap;
  showDevWarnings: boolean;
  playerRuntimeActions?: PlayerRuntimeDashboardActions;
}) {
  const [clickPulseKey, setClickPulseKey] = useState(0);
  const [clickPressed, setClickPressed] = useState(false);
  const critical = model.playerState.criticalStats;
  const hasClickState = Boolean(model.playerState.clickOutput);
  const hasAutomation = Boolean(model.playerState.automation);

  function handleClickPower() {
    if (!hasClickState) return;
    playerRuntimeActions?.click();
    setClickPulseKey((current) => current + 1);
    setClickPressed(true);
    window.setTimeout(() => setClickPressed(false), 140);
  }

  function handleAutoToggle() {
    if (!hasAutomation) return;
    playerRuntimeActions?.toggleAutomation();
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      {dashboardImagePath(art.dashboard_click_panel_background) ? (
        <img
          src={dashboardImagePath(art.dashboard_click_panel_background)}
          alt=""
          data-testid="roblox-left-column-background"
          data-art-key="dashboard_click_panel_background"
          data-local-path={art.dashboard_click_panel_background.path}
          data-native-size="350x780"
          data-rendered-size={`${ROBLOX_DASHBOARD_LAYOUT.leftColumn.width}x${ROBLOX_DASHBOARD_LAYOUT.leftColumn.height}`}
          data-background-size="100% 100%"
          data-background-position="0 0"
          data-repeat="no-repeat"
          className="pointer-events-none absolute inset-0 h-full w-full object-fill"
        />
      ) : <DashboardMissingArt art={art.dashboard_click_panel_background} className="absolute inset-0" />}
      <ClickPowerPanel data={data} model={model} art={art} showDevWarnings={showDevWarnings} onClick={handleClickPower} pressed={clickPressed} pulseKey={clickPulseKey} />
      <AutoClickPanel model={model} art={art} onToggle={handleAutoToggle} />

      <section data-testid="critical-stats-panel" className="absolute left-0 top-[638px] h-[185px] w-full" data-rojo-rect={`${LEFT_COLUMN_GEOMETRY.critical.x},${LEFT_COLUMN_GEOMETRY.critical.y},${LEFT_COLUMN_GEOMETRY.critical.width},${LEFT_COLUMN_GEOMETRY.critical.height}`}>
        {dashboardImagePath(art.critical_star_icon) ? <img src={dashboardImagePath(art.critical_star_icon)} alt="" data-testid="critical-star-icon" data-rojo-rect="42,30,104,104" className="absolute left-[42px] top-[30px] h-[104px] w-[104px] object-contain" /> : <Star data-testid="critical-star-icon" data-rojo-rect="42,30,104,104" className="absolute left-[42px] top-[30px] h-[104px] w-[104px] text-amber-100" />}
        <div className="absolute left-[80px] top-[140px] w-[29px] text-center text-[17px] font-black leading-none text-cyan-700/75">-</div>
        <div data-testid="critical-stats-block" data-rojo-rect="158,38,168,132" className="absolute left-[158px] top-[38px] w-[168px]">
          <div className="text-[17px] font-black uppercase leading-none text-cyan-100/60">Critical Chance</div>
          <div className="mt-[11px] text-[32px] font-black leading-none text-white">{critical ? `${critical.chancePercent}%` : "--"}</div>
          <div className="mt-[28px] text-[17px] font-black uppercase leading-none text-cyan-100/60">Critical Multiplier</div>
          <div className="mt-[11px] text-[32px] font-black leading-none text-white">{critical ? `x${critical.multiplier}` : "--"}</div>
        </div>
      </section>
    </div>
  );
}

function restoreBoostLauncherFocus(triggerRef?: RefObject<HTMLButtonElement | null>) {
  window.requestAnimationFrame(() => triggerRef?.current?.focus());
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

function eraProgressPercent(model: DashboardModel) {
  const objective = model.playerState.objective;
  if (typeof objective?.discoveryPercent === "number") return Math.max(0, Math.min(100, objective.discoveryPercent));
  if (typeof objective?.progressCurrent === "number" && typeof objective?.progressTarget === "number" && objective.progressTarget > 0) {
    return Math.max(0, Math.min(100, (objective.progressCurrent / objective.progressTarget) * 100));
  }
  return 0;
}

function eraTrackProgress(eras: EraDefinition[], activeEraId: string, progressPercent: number) {
  if (eras.length <= 1) return 100;
  const activeIndex = Math.max(0, eras.findIndex((era) => era.id === activeEraId));
  if (activeIndex >= eras.length - 1) return 100;
  return Math.max(0, Math.min(100, ((activeIndex + progressPercent / 100) / (eras.length - 1)) * 100));
}

function EraProgressionNode({
  era,
  assets,
  art,
  state,
  size,
  progressPercent = 0,
  onClick,
  onMouseEnter,
  onMouseLeave,
  className = "",
  testId,
  layoutRect,
  style
}: {
  era: EraDefinition;
  assets: AssetDefinition[];
  art: DashboardArtMap;
  state: "completed" | "current" | "locked" | "preview";
  size: "large" | "medium" | "small";
  progressPercent?: number;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  className?: string;
  testId?: string;
  layoutRect?: string;
  style?: CSSProperties;
}) {
  void assets;
  const hexPath = dashboardImagePath(art.era_progression_hex);
  const dimensions = size === "large" ? "h-[64px] w-[64px]" : size === "medium" ? "h-[50px] w-[50px]" : "h-[14px] w-[14px]";
  const current = state === "current";
  const preview = state === "preview";
  const locked = state === "locked";
  const completed = state === "completed";
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const progressOffset = circumference - (Math.max(0, Math.min(100, progressPercent)) / 100) * circumference;

  return (
    <button
      type="button"
      data-testid={testId}
      data-layout-rect={layoutRect}
      data-era-state={state}
      className={`group absolute flex items-center justify-center rounded-full transition duration-300 hover:brightness-125 active:scale-95 ${dimensions} ${className}`}
      style={style}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      aria-label={`${current ? "Current" : completed ? "Completed" : locked ? "Locked" : "Preview"} era ${era.displayName}`}
    >
      {current ? (
        <svg className="absolute inset-[-7px] h-[78px] w-[78px] -rotate-90 overflow-visible" viewBox="0 0 78 78" aria-hidden="true" data-testid="era-node-progress-ring">
          <circle cx="39" cy="39" r={radius} fill="none" stroke="rgba(125,249,255,0.2)" strokeWidth="4" />
          <circle cx="39" cy="39" r={radius} fill="none" stroke="rgba(52,245,106,0.95)" strokeWidth="4" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={progressOffset} className="transition-[stroke-dashoffset] duration-500 ease-out drop-shadow-[0_0_10px_rgba(52,245,106,0.9)]" />
        </svg>
      ) : null}
      {hexPath ? (
        <img
          src={hexPath}
          alt=""
          className={`absolute inset-0 h-full w-full object-contain transition duration-300 ${
            current
              ? "genesis-era-current-card brightness-150 hue-rotate-[55deg] drop-shadow-[0_0_22px_rgba(52,245,106,0.5)]"
              : preview
                ? "brightness-125 hue-rotate-[35deg] drop-shadow-[0_0_16px_rgba(45,212,255,0.28)]"
              : locked
                ? "opacity-38 saturate-50"
                : "opacity-78 hue-rotate-[35deg]"
          }`}
        />
      ) : (
        <Hexagon className={`absolute inset-0 h-full w-full ${current ? "text-emerald-200" : locked ? "text-cyan-100/38" : "text-emerald-100/78"}`} />
      )}
      <span className={`relative font-black text-white [text-shadow:0_2px_7px_rgba(0,0,0,0.88)] ${size === "large" ? "text-[1.65rem]" : size === "medium" ? "text-[1.22rem]" : "text-[0.48rem]"}`}>{era.index}</span>
      {completed && size !== "small" ? <Check className="absolute bottom-[8px] right-[8px] h-4 w-4 rounded-full bg-emerald-300 p-0.5 text-slate-950" /> : null}
      {locked && size !== "small" ? <Lock data-testid={`era-lock-inside-${era.id}`} className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-950/76 p-0.5 text-cyan-100/72" /> : null}
    </button>
  );
}

function eraUnlockSummary(era: EraDefinition, orderedEras: EraDefinition[], index: number) {
  if (era.unlockRequirements?.start || index === 0) return "Starting era";
  if (era.unlockRequirements?.previousEraId) {
    const previousEra = orderedEras.find((candidate) => candidate.id === era.unlockRequirements?.previousEraId);
    return `Complete ${previousEra ? shortEraName(previousEra) : era.unlockRequirements.previousEraId}`;
  }
  if (era.unlockRequirements?.eraId) {
    const requiredEra = orderedEras.find((candidate) => candidate.id === era.unlockRequirements?.eraId);
    return `Requires ${requiredEra ? shortEraName(requiredEra) : era.unlockRequirements.eraId}`;
  }
  return `Complete ${shortEraName(orderedEras[Math.max(0, index - 1)] ?? era)}`;
}

export function CivilizationEraCarousel({
  eras,
  activeEraId,
  assets,
  art,
  visibleEraCount,
  progressPercent,
  fullTimelineEnabled = true,
  initialPreviewEraId,
  reducedMotion = false
}: {
  eras: EraDefinition[];
  activeEraId: string;
  assets: AssetDefinition[];
  art: DashboardArtMap;
  visibleEraCount: number;
  progressPercent: number;
  fullTimelineEnabled?: boolean;
  initialPreviewEraId?: string;
  reducedMotion?: boolean;
}) {
  void visibleEraCount;
  void fullTimelineEnabled;
  void initialPreviewEraId;
  const orderedEras = [...eras].sort((a, b) => a.index - b.index);
  const [hoverEraId, setHoverEraId] = useState<string | undefined>(undefined);
  const activeIndex = Math.max(0, orderedEras.findIndex((era) => era.id === activeEraId));
  const trackProgress = eraTrackProgress(orderedEras, activeEraId, progressPercent);
  const railLeft = 52;
  const railRight = 808;
  const railTop = 47;
  const labelTop = 86;
  const railWidth = railRight - railLeft;
  const hoveredEra = orderedEras.find((era) => era.id === hoverEraId);
  const hoveredIndex = hoveredEra ? orderedEras.findIndex((era) => era.id === hoveredEra.id) : -1;

  function nodeCenter(index: number) {
    return orderedEras.length <= 1 ? (railLeft + railRight) / 2 : railLeft + (railWidth * index) / (orderedEras.length - 1);
  }

  function panelLeft(index: number, width: number) {
    return Math.max(8, Math.min(860 - width - 8, nodeCenter(index) - width / 2));
  }

  function nodeState(index: number): "completed" | "current" | "locked" | "preview" {
    if (index === activeIndex) return "current";
    if (index < activeIndex) return "completed";
    return "locked";
  }

  return (
    <div
      className={`absolute h-[102px] w-[860px] overflow-visible ${reducedMotion ? "genesis-motion-disabled" : ""}`}
      style={{ left: 25, top: 405 }}
      aria-label="Civilization era progression"
      data-testid="dashboard-era-rail"
      data-era-count={orderedEras.length}
    >
      <div className="absolute inset-x-[-10px] bottom-[-2px] h-[104px] bg-[linear-gradient(180deg,transparent,rgba(3,7,19,0.24)_28%,rgba(3,7,19,0.78))]" />
      <div className="pointer-events-none absolute inset-x-0 top-[14px] h-[58px] bg-[radial-gradient(circle_at_50%_50%,rgba(52,245,106,0.1),transparent_15rem)]" />

      <div data-testid="era-rail-connector" className="absolute h-[3px] overflow-hidden rounded-full bg-cyan-100/14 shadow-[0_0_10px_rgba(45,212,255,0.14)]" style={{ left: railLeft, top: railTop, width: railWidth }}>
        <div data-testid="era-rail-connector-completed" className="relative h-full rounded-full bg-[linear-gradient(90deg,rgba(52,245,106,0.95),rgba(125,249,255,0.78))] shadow-[0_0_16px_rgba(52,245,106,0.42)] transition-[width] duration-500 ease-out" style={{ width: `${trackProgress}%` }}>
          <div data-testid="era-rail-connector-sweep" className="genesis-era-sweep absolute inset-y-[-3px] left-0 w-16 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.74),transparent)]" />
        </div>
      </div>

      {orderedEras.map((era, index) => {
        const state = nodeState(index);
        const current = state === "current";
        const completed = state === "completed";
        const size = current ? 64 : 50;
        const left = nodeCenter(index) - size / 2;
        const top = current ? 15 : 22;
        return (
          <Fragment key={era.id}>
            <EraProgressionNode
              era={era}
              state={state}
              size={current ? "large" : "medium"}
              assets={assets}
              art={art}
              progressPercent={current ? progressPercent : 0}
              className={current ? "" : completed ? "" : "opacity-62"}
              style={{ left, top }}
              layoutRect={`${left},${top},${size},${size}`}
              testId={`era-rail-node-${era.id}`}
              onMouseEnter={() => setHoverEraId(era.id)}
              onMouseLeave={() => setHoverEraId(undefined)}
            />
            <div className={`pointer-events-none absolute w-[92px] -translate-x-1/2 truncate text-center text-[9px] font-black uppercase leading-none ${current ? "text-emerald-100" : completed ? "text-cyan-50/70" : "text-cyan-50/40"}`} style={{ left: nodeCenter(index), top: labelTop }} data-testid={`era-rail-label-${era.id}`}>
              {shortEraName(era)}
            </div>
          </Fragment>
        );
      })}

      {hoveredEra ? (
        <div data-testid="era-hover-tooltip" className="era-hover-hud pointer-events-none absolute z-40 w-[248px] overflow-hidden rounded-sm border border-cyan-100/34 bg-[linear-gradient(135deg,rgba(2,12,24,0.96),rgba(4,30,44,0.9)_58%,rgba(4,12,24,0.98))] px-4 py-3 text-left shadow-[0_0_28px_rgba(45,212,255,0.26),inset_0_0_24px_rgba(125,249,255,0.08)] backdrop-blur-md before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(125,249,255,0.9),transparent)] after:absolute after:inset-0 after:bg-[repeating-linear-gradient(180deg,rgba(125,249,255,0.07)_0,rgba(125,249,255,0.07)_1px,transparent_1px,transparent_8px)] after:opacity-25" style={{ left: panelLeft(hoveredIndex, 248), top: -88 }}>
          <div className="relative z-10 flex items-center justify-between gap-3">
            <div>
              <div className="text-[9px] font-black uppercase leading-none tracking-[0.18em] text-cyan-200/72">Era {hoveredEra.index}</div>
              <div className="mt-1 truncate text-[18px] font-black uppercase leading-none text-white [text-shadow:0_0_14px_rgba(125,249,255,0.34)]">{shortEraName(hoveredEra)}</div>
            </div>
            <div className="flex h-9 w-9 items-center justify-center border border-emerald-200/36 bg-emerald-300/12 text-[16px] font-black text-emerald-100 shadow-[0_0_16px_rgba(52,245,106,0.22)]">{hoveredEra.index}</div>
          </div>
          <div className="relative z-10 mt-3 grid grid-cols-[1fr_auto] items-center gap-2 border-y border-cyan-100/12 py-2">
            <span className="text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/54">Unlock Requirements</span>
            <span className="max-w-[124px] truncate text-right text-[10px] font-black uppercase text-cyan-50/82">{eraUnlockSummary(hoveredEra, orderedEras, hoveredIndex)}</span>
          </div>
          <div className="relative z-10 mt-2">
            <div className="flex items-center justify-between text-[8px] font-black uppercase tracking-[0.16em] text-cyan-100/50">
              <span>Progress Channel</span>
              <span>{hoveredIndex < activeIndex ? "Complete" : hoveredIndex === activeIndex ? `${Math.round(progressPercent)}%` : "Locked"}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-cyan-950/80">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,rgba(52,245,106,0.95),rgba(125,249,255,0.86))] shadow-[0_0_12px_rgba(52,245,106,0.52)]" style={{ width: `${hoveredIndex < activeIndex ? 100 : hoveredIndex === activeIndex ? Math.max(8, Math.min(100, progressPercent)) : 8}%` }} />
            </div>
          </div>
        </div>
      ) : null}
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
      {dashboardDevToolsEnabled ? (
        <div className="absolute right-5 top-5 rounded-sm border border-cyan-200/20 bg-black/40 px-3 py-2 text-[0.68rem] font-black uppercase text-cyan-50/76 backdrop-blur-sm">
          {shortEraName(era)} Era · {focusResource?.displayName ?? "Missing Focus"} · {typeof objective?.discoveryPercent === "number" ? `${objective.discoveryPercent}%` : "No Discovery"}
        </div>
      ) : null}
      <CivilizationEraCarousel
        eras={data.eras}
        activeEraId={era.id}
        assets={data.assets}
        art={dashboardArt}
        visibleEraCount={dashboardEraVisibleCount(data)}
        progressPercent={eraProgressPercent(model)}
        fullTimelineEnabled={data.clientProfiles.default.eraNavigation?.fullTimelineEnabled ?? true}
      />
    </section>
  );
}

function RobloxUpgradePanel({ categories, activeCategoryId, model, assets, art }: { categories: UpgradeCategory[]; activeCategoryId: string; model: DashboardModel; assets: AssetDefinition[]; art: DashboardArtMap }) {
  const tabLabelXOffsets = [0.045, 0.07, 0.045, 0.018];

  return (
    <section className="relative h-full w-full overflow-hidden">
      {dashboardImagePath(art.dashboard_upgrade_background) ? <img src={dashboardImagePath(art.dashboard_upgrade_background)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.dashboard_upgrade_background} className="absolute inset-0" />}
      {categories.slice(0, 4).map((category, index) => {
          const active = category.id === activeCategoryId;
          return (
          <button
            key={category.id}
            className={`absolute top-0 h-[16%] text-center text-[17px] font-black uppercase transition hover:brightness-125 ${active ? "text-white" : "text-cyan-100/72"}`}
            style={{ left: `${index * 25}%`, width: "25%" }}
          >
            <span className="absolute h-[9%] w-[20.5%] whitespace-nowrap" style={{ left: `${tabLabelXOffsets[index] * 400}%`, top: "10%" }}>
              {category.displayName}
            </span>
          </button>
          );
      })}
      <div className="absolute left-[3.4%] top-[16.8%] h-[5%] w-[33%] text-[13px] font-black uppercase text-cyan-200/86">{shortEraName(model.currentEra)} Age</div>
      <div className="absolute left-[33%] right-[7%] top-[19.1%] h-px bg-cyan-100/26" />
      <div className="absolute left-0 top-[21.5%] h-[75%] w-full overflow-hidden">
        {model.upgradeRows.length ? model.upgradeRows.slice(0, 4).map((row, index) => {
          const { upgrade } = row;
          const rowArt = resolveRuntimeAsset(upgrade, findAsset(assets, upgrade.iconKey));
          const state: UpgradeState = row.unlocked ? (row.affordable ? "affordable" : "available") : "locked";
          return (
            <div key={upgrade.id} className="absolute left-0 h-[78px] w-full" style={{ top: index * 78 }}>
              {rowArt.path ? <ArtworkFrame art={rowArt} className="absolute left-[3.7%] top-[8%] h-[82%] min-h-0 w-[8.2%] rounded-sm border-0" /> : <div className="absolute left-[3.7%] top-[8%] flex h-[82%] w-[8.2%] items-center justify-center text-[26px] font-black text-cyan-100/70">?</div>}
              <div className="absolute left-[14%] top-[6%] h-[27%] w-[40%] truncate text-[18px] font-bold leading-none text-white">{upgrade.displayName}</div>
              <div className="absolute left-[14%] top-[34%] h-[24%] w-[45%] truncate text-[15px] font-medium leading-none text-cyan-50/72">{upgrade.description}</div>
              <div className="absolute left-[14%] top-[61%] h-[23%] w-[18%] text-[16px] font-medium leading-none text-cyan-100/82">Lv. {row.level}/{upgrade.maxLevel}</div>
              <div className="absolute left-[33%] top-[71%] h-[7%] w-[24%] overflow-hidden rounded-full bg-cyan-950/80">
                <div className={`h-full rounded-full ${state === "locked" ? "bg-cyan-700/50" : "bg-emerald-300"}`} style={{ width: `${Math.min(100, (row.level / Math.max(1, upgrade.maxLevel)) * 100)}%` }} />
              </div>
              <div className="absolute left-[61%] top-[26%] h-[38%] w-[13%] truncate text-center text-[20px] font-medium leading-none text-cyan-50">{state === "locked" ? "--" : `+${compactNumber(row.effect)}`}</div>
              <button disabled={state === "locked" || !row.affordable} className="absolute left-[74.5%] top-[16%] h-[68%] w-[22.5%] transition hover:brightness-125 active:scale-[0.99] disabled:opacity-45">
                {dashboardImagePath(art.upgrade_button) ? <img src={dashboardImagePath(art.upgrade_button)} alt="" className="h-full w-full object-contain" /> : <DashboardMissingArt art={art.upgrade_button} className="h-full w-full" />}
                <span className="absolute left-[34%] top-[24%] h-[52%] w-[42%] truncate text-left text-[17px] font-bold leading-[1.55rem] text-white">{state === "locked" ? "LOCKED" : row.affordable ? compactNumber(row.cost) : compactNumber(row.cost)}</span>
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
  const placeholderLeaderboardRows = Array.from({ length: 5 }, (_, index) => ({ name: index === 4 ? "You" : "Pending", score: 0 }));
  const visibleLeaderboardRows = leaderboardRows.length ? leaderboardRows : placeholderLeaderboardRows;
  const alignmentIconMap: Record<AlignmentName, DashboardArtResolution> = {
    Industry: art.hud_credits_icon,
    Technology: art.hud_population_icon,
    Cyber: art.hud_civilization_points_icon,
    Nature: art.hud_civilization_energy_icon,
    Corporate: art.hud_research_icon
  };

  return (
    <div className="relative h-full w-full">
      <section className="absolute left-0 top-0 h-[300px] w-full overflow-hidden">
        {dashboardImagePath(art.dashboard_leaderboard_background) ? <img src={dashboardImagePath(art.dashboard_leaderboard_background)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.dashboard_leaderboard_background} className="absolute inset-0" />}
        <h2 className="absolute left-[9.5%] top-[3.5%] h-[15%] w-[76%] text-[24px] font-black uppercase text-cyan-100/90">Top Civilizations</h2>
        {visibleLeaderboardRows.map((entry, index) => {
          const y = 0.29 + index * 0.132;
          const local = index === visibleLeaderboardRows.length - 1;
          return (
            <div key={`${entry.name}-${index}`} className={`absolute h-[10%] text-[19px] leading-none ${local ? "font-black text-amber-100" : "font-medium text-white"} ${leaderboardRows.length ? "" : "opacity-55"}`} style={{ top: `${y * 100}%`, left: 0, width: "100%" }}>
              <span className="absolute left-[8.5%] w-[11%] text-center">{index + 1}</span>
              <span className="absolute left-[23%] w-[43%] truncate">{entry.name}</span>
              <span className="absolute left-[69%] w-[22%] truncate text-right">{leaderboardRows.length ? compactNumber(entry.score) : "--"}</span>
            </div>
          );
        })}
      </section>

      <section className="absolute left-0 top-[324px] h-[220px] w-full overflow-hidden">
        {dashboardImagePath(art.dashboard_event_background) ? <img src={dashboardImagePath(art.dashboard_event_background)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.dashboard_event_background} className="absolute inset-0" />}
        {dashboardImagePath(art.active_event_sub_layer) ? <img src={dashboardImagePath(art.active_event_sub_layer)} alt="" className="absolute left-[22px] top-[52px] h-[156px] w-[388px] object-fill" /> : null}
        <h2 className="absolute left-[7.5%] top-[7.5%] h-[14%] w-[70%] text-[24px] font-bold uppercase text-cyan-100/90">Active Event</h2>
        <Sparkles className="absolute left-[10%] top-[35.5%] h-[13%] w-[13%] text-fuchsia-100" />
        <div className="absolute left-[25.5%] top-[36%] h-[11%] w-[48%] truncate text-[18px] font-bold uppercase text-white">{model.playerState.activeEvent?.title ?? "No Active Event"}</div>
        <div className="absolute left-[25.5%] top-[49%] h-[10%] w-[50%] truncate text-[15px] font-medium text-white">{model.playerState.activeEvent?.description ?? "Awaiting event"}</div>
        <div className="absolute left-[68%] top-[43.5%] h-[18%] w-[20%] text-right text-[26px] font-medium leading-none text-white">{model.playerState.activeEvent?.timerLabel ?? "--"}</div>
        <button disabled={!model.playerState.activeEvent} className="absolute left-[10%] top-[65.5%] h-[24%] w-[80%] transition hover:brightness-125 disabled:opacity-45">
          {dashboardImagePath(art.event_activate_button) ? <img src={dashboardImagePath(art.event_activate_button)} alt="" className="absolute inset-0 h-full w-full object-contain" /> : <DashboardMissingArt art={art.event_activate_button} className="absolute inset-0" />}
          <span className="relative text-[22px] font-bold uppercase text-white">{model.playerState.activeEvent ? "Activate" : "Unavailable"}</span>
        </button>
      </section>

      <section className="absolute left-0 top-[574px] h-[365px] w-full overflow-hidden">
        {dashboardImagePath(art.dashboard_alignment_background) ? <img src={dashboardImagePath(art.dashboard_alignment_background)} alt="" className="absolute inset-0 h-full w-full object-fill" /> : <DashboardMissingArt art={art.dashboard_alignment_background} className="absolute inset-0" />}
        <h2 className="absolute left-[8%] top-[5.5%] h-[8%] w-[70%] text-[22px] font-black uppercase text-cyan-100/90">Alignment</h2>
        {alignmentRows.map((alignment, index) => {
            const value = model.alignment[alignment];
            const y = 0.19 + index * 0.155;
            return (
            <div key={alignment} className="absolute left-0 h-[12%] w-full" style={{ top: `${y * 100}%` }}>
              {dashboardImagePath(alignmentIconMap[alignment as AlignmentName]) ? (
                <img src={dashboardImagePath(alignmentIconMap[alignment as AlignmentName])} alt="" className="absolute left-[4%] top-[-9%] h-[100%] w-[12%] object-contain" />
              ) : (
                <Shield className="absolute left-[3.5%] top-[-18%] h-[120%] w-[13%]" style={{ color: genesisTokens.alignment[alignment as AlignmentName] }} />
              )}
              <span className="absolute left-[17%] top-0 h-[75%] w-[22%] truncate text-[18px] font-medium uppercase leading-none text-white">{alignment}</span>
              <div className="absolute left-[40.5%] top-[25%] h-[30%] w-[38%] rounded-full border border-cyan-100/20 bg-cyan-950/80">
                <div className="h-full rounded-full" style={{ width: `${Math.min(96, value)}%`, backgroundColor: genesisTokens.alignment[alignment as AlignmentName], color: genesisTokens.alignment[alignment as AlignmentName] }} />
              </div>
              <span className="absolute left-[81%] top-[-2%] h-[85%] w-[11%] text-right text-[20px] font-black leading-none text-white">{value}%</span>
            </div>
            );
        })}
        <div className="absolute bottom-4 left-[8%] right-[8%] truncate text-[0.68rem] font-black uppercase text-cyan-100/50">{model.alignmentLabel} · {model.civilizationPrediction}</div>
      </section>
    </div>
  );
}

function usePrefersReducedMotion(explicit?: boolean) {
  const [mediaReducedMotion, setMediaReducedMotion] = useState(() => {
    if (typeof explicit === "boolean") return explicit;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof explicit === "boolean") return;
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setMediaReducedMotion(query.matches);
    query.addEventListener?.("change", update);
    return () => query.removeEventListener?.("change", update);
  }, [explicit]);

  return explicit ?? mediaReducedMotion;
}

function formatBoostRemaining(endsAt: string, now: number) {
  const remainingSeconds = Math.max(0, Math.ceil((Date.parse(endsAt) - now) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function runtimeBoostsToSlots(activeBoosts: PlayerRuntimeState["boosts"]["active"], now: number): BoostTraySlot[] {
  return activeBoosts
    .filter((boost) => Date.parse(boost.endsAt) > now)
    .map((boost) => ({
      id: boost.id,
      name: boost.definitionId ?? boost.id,
      shortEffect: `${boost.targetSystem.toUpperCase()} system boost`,
      multiplier: `${boost.multiplier}x`,
      remainingTime: formatBoostRemaining(boost.endsAt, now),
      targetSystem: boost.targetSystem,
      state: "active",
      accent: boost.targetSystem === "colony" ? "green" : boost.targetSystem === "research" ? "purple" : boost.targetSystem === "auto" ? "cyan" : "gold"
    }));
}

function RobloxBoostBar({
  model,
  open = false,
  count,
  controlsId,
  triggerRef,
  onToggle
}: {
  model: DashboardModel;
  open?: boolean;
  count?: number;
  controlsId?: string;
  triggerRef?: RefObject<HTMLButtonElement | null>;
  onToggle?: () => void;
}) {
  const primaryBoost = model.playerState.boosts?.[0];
  const boostValue = count ?? model.playerState.boosts?.length ?? 0;
  return (
    <button
      ref={triggerRef}
      type="button"
      aria-label={`Toggle boosts tray, ${boostValue} boosts available`}
      aria-hidden={open}
      aria-expanded={open}
      aria-controls={controlsId}
      data-testid="boosts-launcher"
      tabIndex={open ? -1 : 0}
      onClick={onToggle}
      className={`${gamePanelFrame} ${bevel} flex h-full w-full items-center justify-center gap-2 bg-[linear-gradient(180deg,rgba(24,6,12,0.78),rgba(3,8,18,0.88))] px-3 transition duration-[220ms] ease-out hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/50 active:translate-y-px ${open ? "pointer-events-none opacity-0" : primaryBoost || boostValue > 0 ? "" : "opacity-90"}`}
    >
      <Zap className={`h-6 w-6 shrink-0 ${primaryBoost ? "text-cyan-100" : "text-cyan-100/45"}`} />
      <div className="min-w-0 truncate text-center">
        <span className="text-[1.35rem] font-black uppercase leading-none text-white [text-shadow:0_0_18px_rgba(45,212,255,0.5)]">Boosts</span>
        {typeof primaryBoost?.remainingSeconds === "number" ? <div className="text-[0.55rem] font-black uppercase text-cyan-100/55">{primaryBoost.remainingSeconds}s</div> : null}
      </div>
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-cyan-100/32 bg-black/35 text-[1.25rem] font-black text-white">{boostValue}</div>
    </button>
  );
}

const boostAccentClasses: Record<NonNullable<BoostTraySlot["accent"]>, string> = {
  cyan: "border-cyan-200/28 bg-cyan-300/10 text-cyan-100",
  purple: "border-fuchsia-200/28 bg-fuchsia-300/10 text-fuchsia-100",
  green: "border-emerald-200/28 bg-emerald-300/10 text-emerald-100",
  gold: "border-amber-200/30 bg-amber-300/10 text-amber-100",
  rose: "border-rose-200/30 bg-rose-300/10 text-rose-100"
};

function BoostSlotCard({ slot, onActivate }: { slot: BoostTraySlot; onActivate?: (definitionId: string) => void }) {
  const accent = slot.accent ?? "cyan";
  const disabled = slot.state !== "available" || !onActivate;
  const actionLabel = slot.state === "active" ? "Active" : slot.state === "locked" ? "Locked" : slot.state === "cooldown" ? "Cooling" : slot.state === "unavailable" ? "Unavailable" : "Activate";

  return (
    <article className={`relative flex h-full min-w-[13.5rem] flex-col overflow-hidden rounded-md border bg-[linear-gradient(180deg,rgba(7,18,36,0.94),rgba(2,8,18,0.96))] p-2.5 shadow-[inset_0_0_18px_rgba(45,212,255,0.045)] ${boostAccentClasses[accent]} ${slot.state === "locked" || slot.state === "unavailable" ? "opacity-58" : ""}`}>
      <div className="flex min-h-0 items-start gap-2.5">
        <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-md border bg-black/35 text-xs font-black uppercase ${boostAccentClasses[accent]}`}>
          {slot.multiplier ?? slot.targetSystem?.slice(0, 2).toUpperCase() ?? "BX"}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-[0.72rem] font-black uppercase leading-tight text-white">{slot.name}</h3>
          <p className="mt-0.5 line-clamp-2 text-[0.58rem] font-bold uppercase leading-snug text-cyan-50/62">{slot.shortEffect}</p>
        </div>
      </div>
      <div className="mt-auto grid grid-cols-[1fr_auto] items-end gap-2">
        <div className="min-w-0 space-y-0.5 text-[0.56rem] font-black uppercase text-cyan-100/54">
          <div className="truncate">{slot.remainingTime ? `Remaining ${slot.remainingTime}` : slot.duration ? `Duration ${slot.duration}` : "Duration pending"}</div>
          <div className="truncate">{slot.cost ? `Cost ${slot.cost}` : slot.state === "active" ? "Runtime active" : "Cost pending"}</div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onActivate?.(slot.id)}
          className="h-7 rounded-sm border border-cyan-100/24 bg-cyan-300/10 px-2.5 text-[0.58rem] font-black uppercase text-cyan-50 transition hover:bg-cyan-300/16 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-cyan-100/42"
        >
          {actionLabel}
        </button>
      </div>
    </article>
  );
}

export function BoostsTray({
  open,
  slots = [],
  activeBoosts = [],
  triggerRef,
  portalRoot,
  onClose,
  onActivate,
  reducedMotion
}: {
  open: boolean;
  slots?: BoostTraySlot[];
  activeBoosts?: PlayerRuntimeState["boosts"]["active"];
  triggerRef?: RefObject<HTMLButtonElement | null>;
  portalRoot?: HTMLElement | null;
  onClose: () => void;
  onActivate?: (definitionId: string) => void;
  reducedMotion?: boolean;
}) {
  const trayRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion(reducedMotion);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!open) return;
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());
  }, [open]);

  useEffect(() => {
    if (!open || activeBoosts.length === 0) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeBoosts.length, open]);

  useEffect(() => {
    if (!open) return;
    function closeAndRestore() {
      onClose();
      window.requestAnimationFrame(() => triggerRef?.current?.focus());
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeAndRestore();
      }
    }
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node | null;
      if (!target) return;
      if (trayRef.current?.contains(target) || triggerRef?.current?.contains(target)) return;
      closeAndRestore();
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [onClose, open, triggerRef]);

  const runtimeSlots = runtimeBoostsToSlots(activeBoosts, now);
  const visibleSlots = slots.length ? slots : runtimeSlots;
  const activeCount = visibleSlots.filter((slot) => slot.state === "active").length;
  const availableCount = visibleSlots.filter((slot) => slot.state === "available").length;
  function closeAndRestore() {
    onClose();
    restoreBoostLauncherFocus(triggerRef);
  }
  const trayStyle: CSSProperties = {
    left: 12,
    right: 12,
    bottom: 8,
    height: 170,
    transform: open ? "translateY(0)" : "translateY(calc(100% + 24px))",
    opacity: open ? 1 : 0,
    transition: prefersReducedMotion ? "none" : "transform 220ms cubic-bezier(.25,.46,.45,.94), opacity 220ms cubic-bezier(.25,.46,.45,.94)"
  };
  const tray = (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" data-dashboard-overlay="boosts" data-testid="boosts-overlay-layer" style={{ zIndex: DASHBOARD_OVERLAY_Z_INDEX }}>
      <div
        aria-hidden="true"
        data-testid="boosts-overlay-backdrop"
        className={`absolute inset-0 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        onPointerDown={(event) => {
          if (event.target === event.currentTarget) closeAndRestore();
        }}
      />
      <section
        id="dashboard-boosts-tray"
        ref={trayRef}
        role="dialog"
        aria-modal="false"
        aria-hidden={!open}
        aria-labelledby="dashboard-boosts-tray-title"
        data-testid="boosts-tray"
        data-state={open ? "open" : "closed"}
        data-open-position="left:12,right:12,bottom:8"
        data-closed-position="translateY(calc(100% + 24px))"
        data-bottom-offset="8"
        data-transition={prefersReducedMotion ? "none" : "transform-opacity"}
        className={`absolute overflow-hidden rounded-md border border-cyan-100/30 bg-[linear-gradient(180deg,rgba(9,22,45,0.96),rgba(3,8,18,0.98))] p-3 text-cyan-50 shadow-[0_-18px_48px_rgba(0,0,0,0.34),0_0_26px_rgba(45,212,255,0.12),inset_0_0_24px_rgba(45,212,255,0.055)] ${open ? "pointer-events-auto" : "pointer-events-none"}`}
        style={trayStyle}
      >
        <div className="flex h-full min-h-0 flex-col gap-2">
          <header className="flex h-9 shrink-0 items-center justify-between border-b border-cyan-100/14 px-1 pb-2">
            <div className="flex min-w-0 items-baseline gap-3">
              <h2 id="dashboard-boosts-tray-title" className="text-[1.22rem] font-black uppercase leading-none tracking-normal text-white [text-shadow:0_0_14px_rgba(45,212,255,0.34)]">Boosts</h2>
              <div className="text-[0.68rem] font-black uppercase text-cyan-100/58">{availableCount} available · {activeCount} active</div>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeAndRestore}
              className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-cyan-100/24 bg-cyan-300/10 text-cyan-50 transition hover:bg-cyan-300/18 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100/50"
              aria-label="Close boosts tray"
            >
              <X className="h-4 w-4" />
            </button>
          </header>
          {visibleSlots.length ? (
            <div className="grid min-h-0 min-w-0 flex-1 grid-flow-col auto-cols-[minmax(13.5rem,1fr)] gap-3 overflow-x-auto overflow-y-hidden pr-1" data-testid="boosts-slot-list">
              {visibleSlots.map((slot) => <BoostSlotCard key={slot.id} slot={slot} onActivate={onActivate} />)}
            </div>
          ) : (
            <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center px-5 text-center" data-testid="boosts-empty-state">
              <div>
                <div className="text-[1.05rem] font-black uppercase leading-none text-white">No boosts available</div>
                <p className="mt-2 max-w-[24rem] text-[0.78rem] font-bold text-cyan-100/62">Boosts will appear here when published.</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );

  return portalRoot ? createPortal(tray, portalRoot) : tray;
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
    { label: "HUD definitions", source: "clientProfiles.default.primaryHudResources", value: `${model.hudResources.length} economy resources` },
    { label: "economy warnings", source: model.economyWarnings.length ? "canonical runtime validation" : "canonical runtime", value: model.economyWarnings.length ? model.economyWarnings.join("; ") : "none" },
    { label: "economy amounts/rates", source: model.hudResources.length ? model.playerState.source : "missing source/default zero", value: model.hudResources.length ? model.playerState.sourceLabel : "default zero" },
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

const dashboardScaleAssetAudit = [
  { key: "dashboard_background", label: "HUD background", designWidth: 1920, designHeight: 1080, nativeWidth: 1920, nativeHeight: 1080 },
  { key: "dashboard_city_hero", label: "Hero artwork", designWidth: ROBLOX_DASHBOARD_LAYOUT.hero.width, designHeight: ROBLOX_DASHBOARD_LAYOUT.hero.height, nativeWidth: 910, nativeHeight: 517 },
  { key: "sidebar_frame", label: "Sidebar frame", designWidth: ROBLOX_DASHBOARD_LAYOUT.sidebar.width, designHeight: ROBLOX_DASHBOARD_LAYOUT.sidebar.height, nativeWidth: 160, nativeHeight: 790 },
  { key: "dashboard_top_hud", label: "Top HUD", designWidth: 1920, designHeight: 108, nativeWidth: 1920, nativeHeight: 104 },
  { key: "clicker_hud_background", label: "Clicker panel", designWidth: 350, designHeight: 823, nativeWidth: 350, nativeHeight: 780 },
  { key: "dashboard_click_button", label: "Click button", designWidth: 312, designHeight: 66, nativeWidth: 329, nativeHeight: 81 },
  { key: "dashboard_auto_button_on", label: "Auto button on", designWidth: 312, designHeight: 55, nativeWidth: 329, nativeHeight: 62 },
  { key: "upgrade_panel_structure", label: "Upgrade panel", designWidth: ROBLOX_DASHBOARD_LAYOUT.upgrades.width, designHeight: ROBLOX_DASHBOARD_LAYOUT.upgrades.height, nativeWidth: 920, nativeHeight: 420 },
  { key: "leaderboard_panel", label: "Leaderboard panel", designWidth: 425, designHeight: 422, nativeWidth: 852, nativeHeight: 606 },
  { key: "active_event_panel", label: "Event panel", designWidth: 425, designHeight: 201, nativeWidth: 1005, nativeHeight: 510 },
  { key: "alignment_panel", label: "Alignment panel", designWidth: 425, designHeight: 365, nativeWidth: 1000, nativeHeight: 929 }
] as const;

function getDashboardScaleAssetWarnings(targetScale = 2) {
  return dashboardScaleAssetAudit
    .map((asset) => {
      const requiredWidth = Math.ceil(asset.designWidth * targetScale);
      const requiredHeight = Math.ceil(asset.designHeight * targetScale);
      const widthRatio = asset.nativeWidth / requiredWidth;
      const heightRatio = asset.nativeHeight / requiredHeight;
      const ratio = Math.min(widthRatio, heightRatio);
      return { ...asset, requiredWidth, requiredHeight, ratio };
    })
    .filter((asset) => asset.ratio < 0.98);
}

function useGameDisplayPreferences() {
  const [preferences, setPreferences] = useState(loadGameDisplayPreferences);

  useEffect(() => {
    saveGameDisplayPreferences(preferences);
  }, [preferences]);

  return [preferences, setPreferences] as const;
}

function useViewportScale(
  viewportRef: RefObject<HTMLDivElement | null>,
  preferences: GameDisplayPreferences,
  explicitScale?: number
) {
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>(() => ({
    width: ROBLOX_DASHBOARD_REFERENCE.width,
    height: ROBLOX_DASHBOARD_REFERENCE.height
  }));

  useEffect(() => {
    if (explicitScale !== undefined) return;
    const node = viewportRef.current;
    if (!node) return;
    let frame = 0;
    const update = (width: number, height: number) => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setViewportSize((current) => {
          if (Math.abs(current.width - width) < 1 && Math.abs(current.height - height) < 1) return current;
          return { width, height };
        });
      });
    };
    const measure = () => update(node.clientWidth || window.innerWidth, node.clientHeight || window.innerHeight);

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        const rect = entries[0]?.contentRect;
        if (rect) update(rect.width, rect.height);
      });
      observer.observe(node);
      measure();
      return () => {
        window.cancelAnimationFrame(frame);
        observer.disconnect();
      };
    }

    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
    };
  }, [explicitScale, viewportRef]);

  if (explicitScale !== undefined) {
    const renderedWidth = ROBLOX_DASHBOARD_REFERENCE.width * explicitScale;
    const renderedHeight = ROBLOX_DASHBOARD_REFERENCE.height * explicitScale;
    return {
      viewportWidth: renderedWidth,
      viewportHeight: renderedHeight,
      availableWidth: renderedWidth,
      availableHeight: renderedHeight,
      scale: explicitScale,
      rawScale: explicitScale,
      renderedWidth,
      renderedHeight,
      displayMode: "actual" as GameDisplayMode,
      minScale: preferences.minScale,
      maxScale: preferences.maxScale,
      outerPadding: preferences.outerPadding
    } satisfies GameViewportScaleResult;
  }

  return calculateGameViewportScale({
    viewportWidth: viewportSize.width,
    viewportHeight: viewportSize.height,
    displayMode: preferences.displayMode,
    minScale: preferences.minScale,
    maxScale: preferences.maxScale,
    outerPadding: preferences.outerPadding
  });
}

function GameViewportDiagnostics({
  scale,
  preferences,
  onPreferencesChange,
  onFullscreenToggle,
  fullscreenActive,
  assetWarnings
}: {
  scale: GameViewportScaleResult;
  preferences: GameDisplayPreferences;
  onPreferencesChange: (preferences: GameDisplayPreferences) => void;
  onFullscreenToggle: () => void;
  fullscreenActive: boolean;
  assetWarnings: ReturnType<typeof getDashboardScaleAssetWarnings>;
}) {
  return (
    <aside className="absolute left-4 top-4 z-[95] max-w-[24rem] rounded-md border border-cyan-200/25 bg-slate-950/92 p-3 text-[0.64rem] font-black uppercase text-cyan-50 shadow-[0_18px_48px_rgba(0,0,0,0.42)]">
      <div className="text-xs text-cyan-100">Display Scale</div>
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-cyan-100/64">
        <span>Viewport</span><span className="text-right text-white">{Math.round(scale.viewportWidth)} x {Math.round(scale.viewportHeight)}</span>
        <span>Available</span><span className="text-right text-white">{Math.round(scale.availableWidth)} x {Math.round(scale.availableHeight)}</span>
        <span>Scale</span><span className="text-right text-white">{scale.scale.toFixed(3)}</span>
        <span>Rendered</span><span className="text-right text-white">{Math.round(scale.renderedWidth)} x {Math.round(scale.renderedHeight)}</span>
        <span>DPR</span><span className="text-right text-white">{typeof window === "undefined" ? "1" : window.devicePixelRatio.toFixed(2)}</span>
        <span>Mode</span><span className="text-right text-white">{preferences.displayMode}</span>
        <span>Max</span><span className="text-right text-white">{preferences.maxScale.toFixed(2)}</span>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1">
        {(["auto", "fit", "fill", "actual"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onPreferencesChange({ ...preferences, displayMode: mode })}
            className={`rounded-sm border px-2 py-1 ${preferences.displayMode === mode ? "border-cyan-100/50 bg-cyan-300/18 text-white" : "border-cyan-100/18 bg-black/30 text-cyan-100/64"}`}
          >
            {mode}
          </button>
        ))}
      </div>
      <button type="button" onClick={onFullscreenToggle} className="mt-2 w-full rounded-sm border border-cyan-100/24 bg-cyan-300/10 px-2 py-1 text-cyan-50">
        {fullscreenActive ? "Exit Fullscreen" : "Fullscreen"}
      </button>
      {assetWarnings.length ? (
        <div className="mt-3 border-t border-cyan-100/12 pt-2 text-cyan-100/58">
          <div className="text-cyan-100">2x asset warnings</div>
          <div className="mt-1 max-h-20 overflow-auto">
            {assetWarnings.slice(0, 5).map((asset) => (
              <div key={asset.key} className="truncate">{asset.label}: {asset.nativeWidth}x{asset.nativeHeight} / needs {asset.requiredWidth}x{asset.requiredHeight}</div>
            ))}
          </div>
        </div>
      ) : null}
    </aside>
  );
}

function GameViewportScaler({
  children,
  explicitScale,
  embedded = false,
  assetWarnings = []
}: {
  children: ReactNode;
  explicitScale?: number;
  embedded?: boolean;
  assetWarnings?: ReturnType<typeof getDashboardScaleAssetWarnings>;
}) {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [preferences, setPreferences] = useGameDisplayPreferences();
  const [fullscreenActive, setFullscreenActive] = useState(false);
  const scale = useViewportScale(viewportRef, preferences, explicitScale);

  useEffect(() => {
    if (embedded || typeof document === "undefined") return;
    const update = () => setFullscreenActive(document.fullscreenElement === viewportRef.current);
    document.addEventListener("fullscreenchange", update);
    return () => document.removeEventListener("fullscreenchange", update);
  }, [embedded]);

  async function toggleFullscreen() {
    const node = viewportRef.current;
    if (!node || typeof document === "undefined") return;
    if (document.fullscreenElement) {
      await document.exitFullscreen?.();
      setPreferences({ ...preferences, fullscreenPreferred: false });
      return;
    }
    await node.requestFullscreen?.();
    setPreferences({ ...preferences, fullscreenPreferred: true });
  }

  return (
    <div
      ref={viewportRef}
      className={`${embedded ? "" : "h-[100dvh] w-[100dvw]"} relative flex items-center justify-center overflow-hidden`}
      data-game-viewport
      data-display-mode={preferences.displayMode}
      data-game-scale={scale.scale.toFixed(4)}
      style={{
        ["--game-scale" as string]: scale.scale,
        ...(embedded ? { width: scale.renderedWidth, height: scale.renderedHeight } : undefined)
      }}
    >
      <div
        className="relative shrink-0 overflow-hidden"
        data-game-stage-shell
        style={{
          width: scale.renderedWidth,
          height: scale.renderedHeight
        }}
      >
        <div
          className="relative overflow-hidden border border-cyan-200/30 bg-[#06111f] shadow-[0_0_70px_rgba(45,212,255,0.16),inset_0_0_60px_rgba(0,0,0,0.54)]"
          data-game-stage
          style={{
            width: ROBLOX_DASHBOARD_REFERENCE.width,
            height: ROBLOX_DASHBOARD_REFERENCE.height,
            transform: "scale(var(--game-scale))",
            transformOrigin: "top left"
          }}
        >
          {children}
        </div>
      </div>
      {dashboardDevToolsEnabled && !embedded ? (
        <GameViewportDiagnostics
          scale={scale}
          preferences={preferences}
          onPreferencesChange={setPreferences}
          onFullscreenToggle={() => void toggleFullscreen()}
          fullscreenActive={fullscreenActive}
          assetWarnings={assetWarnings}
        />
      ) : null}
    </div>
  );
}

function DashboardDataArtInspector({
  model,
  artAudit,
  playerRuntime,
  playerRuntimeActions
}: {
  model: DashboardModel;
  artAudit: DashboardArtResolution[];
  playerRuntime?: PlayerRuntimeState;
  playerRuntimeActions?: PlayerRuntimeDashboardActions;
}) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const missing = artAudit.filter((item) => item.mappingStatus === "missing" || item.warnings.length);
  const demoValues = model.mode === "demo" ? dashboardDataAudit(model).filter((item) => item.source === "demo-fixture") : [];

  function exportSave() {
    if (!playerRuntimeActions) return;
    const blob = new Blob([playerRuntimeActions.exportSave()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "project-genesis-player-runtime-save.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function importSave(file?: File) {
    if (!file || !playerRuntimeActions) return;
    playerRuntimeActions.importSave(await file.text());
  }

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
      {playerRuntime ? (
        <div className="mt-3 rounded-sm border border-cyan-200/18 bg-black/25 p-2">
          <div className="font-black uppercase text-cyan-100/75">Player Runtime</div>
          <div className="mt-1 grid grid-cols-2 gap-1">
            <div>save v{playerRuntime.saveVersion}</div>
            <div>rev {playerRuntime.revision}</div>
            <div>era {playerRuntime.civilization.currentEraId}</div>
            <div>content v{playerRuntime.contentVersion}</div>
            <div className="col-span-2 truncate">last save {playerRuntime.updatedAt}</div>
            <div className="col-span-2 truncate">last sim {playerRuntime.lastSimulationAt}</div>
            <div className="col-span-2 truncate">objective {playerRuntime.objectives.activeObjectiveId ?? "none"}</div>
            <div className="col-span-2 truncate">event {playerRuntime.events.activeEventId ?? "none"}</div>
            <div>boosts {playerRuntime.boosts.active.length}</div>
            <div>unresolved {Object.keys(playerRuntime.unresolved.resources).length + Object.keys(playerRuntime.unresolved.upgradeLevels).length}</div>
          </div>
          {playerRuntimeActions ? (
            <div className="mt-2 grid grid-cols-3 gap-1">
              <button className="rounded-sm border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 font-black uppercase" onClick={playerRuntimeActions.saveNow}>Save Now</button>
              <button className="rounded-sm border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 font-black uppercase" onClick={() => playerRuntimeActions.advanceSimulation(60)}>Advance</button>
              <button className="rounded-sm border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 font-black uppercase" onClick={playerRuntimeActions.grantTestResources}>Grant</button>
              <button className="rounded-sm border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 font-black uppercase" onClick={playerRuntimeActions.click}>Click</button>
              <button className="rounded-sm border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 font-black uppercase" onClick={exportSave}>Export</button>
              <button className="rounded-sm border border-cyan-200/25 bg-cyan-300/10 px-2 py-1 font-black uppercase" onClick={() => importInputRef.current?.click()}>Import</button>
              <button className="col-span-3 rounded-sm border border-rose-200/30 bg-rose-300/10 px-2 py-1 font-black uppercase text-rose-100" onClick={playerRuntimeActions.resetSave}>Reset Save</button>
              <input ref={importInputRef} className="hidden" type="file" accept="application/json" onChange={(event) => void importSave(event.currentTarget.files?.[0])} />
            </div>
          ) : null}
        </div>
      ) : null}
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
  playerRuntime,
  playerRuntimeActions,
  activeScreen = "dashboard",
  activeEraId = "survival",
  activeCategoryId = "workforce",
  frameScale,
  embedded = false
}: {
  data: GameRuntimeData;
  runtimeState?: RuntimeContentState;
  playerState?: DashboardPlayerState;
  playerRuntime?: PlayerRuntimeState;
  playerRuntimeActions?: PlayerRuntimeDashboardActions;
  activeScreen?: string;
  activeEraId?: string;
  activeCategoryId?: string;
  frameScale?: number;
  embedded?: boolean;
}) {
  const category = data.upgradeCategories.find((item) => item.id === activeCategoryId) ?? data.upgradeCategories[0];
  const model = useMemo(() => createDashboardModel(data, { runtimeState, playerState, activeEraId, activeCategoryId: category.id }), [activeEraId, category.id, data, playerState, runtimeState]);
  const dashboardArt = useMemo(() => createDashboardArtMap(data.assets), [data.assets]);
  const artAudit = useMemo(() => getDashboardArtAudit(data.assets), [data.assets]);
  const scaleAssetWarnings = useMemo(() => getDashboardScaleAssetWarnings(2), []);
  const [boostsTrayOpen, setBoostsTrayOpen] = useState(false);
  const boostTriggerRef = useRef<HTMLButtonElement | null>(null);
  const [boostOverlayRoot, setBoostOverlayRoot] = useState<HTMLDivElement | null>(null);
  const activeRuntimeBoosts = playerRuntime?.boosts.active ?? [];
  const boostCount = model.playerState.boosts?.length ?? 0;
  useDashboardAssetDiagnostics(artAudit);
  const embeddedScale = frameScale ?? 1;

  return (
    <main
      className={`${embedded ? "" : "h-[100dvh] w-[100dvw]"} overflow-hidden bg-[radial-gradient(circle_at_50%_12%,rgba(45,212,255,0.14),transparent_34rem),linear-gradient(145deg,#030713_0%,#071225_52%,#050816_100%)] text-[var(--genesis-text)]`}
      style={{
        ...shellStyle,
        ...(embedded
          ? {
              width: ROBLOX_DASHBOARD_REFERENCE.width * embeddedScale,
              height: ROBLOX_DASHBOARD_REFERENCE.height * embeddedScale
            }
          : undefined)
      }}
    >
      <GameViewportScaler explicitScale={frameScale} embedded={embedded} assetWarnings={scaleAssetWarnings}>
          {dashboardImagePath(dashboardArt.dashboard_background) ? <img src={dashboardImagePath(dashboardArt.dashboard_background)} alt="" className="absolute inset-0 h-full w-full object-fill opacity-95" /> : <DashboardMissingArt art={dashboardArt.dashboard_background} className="absolute inset-0" />}
          <div style={robloxLayoutRect(ROBLOX_DASHBOARD_LAYOUT.topHud)}>
            <RobloxTopHud model={model} art={dashboardArt} showDevWarnings={dashboardDevToolsEnabled} />
          </div>
          {dashboardDevToolsEnabled ? <RuntimeSourceBadge model={model} /> : null}
          <div style={robloxLayoutRect(ROBLOX_DASHBOARD_LAYOUT.sidebar)}>
            <RobloxNavigation active={activeScreen} art={dashboardArt} />
          </div>
          <div style={robloxLayoutRect(ROBLOX_DASHBOARD_LAYOUT.leftColumn)}>
            <RobloxLeftColumn data={data} model={model} art={dashboardArt} showDevWarnings={dashboardDevToolsEnabled} playerRuntimeActions={playerRuntimeActions} />
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
            <RobloxBoostBar
              model={model}
              open={boostsTrayOpen}
              count={boostCount}
              controlsId="dashboard-boosts-tray"
              triggerRef={boostTriggerRef}
              onToggle={() => setBoostsTrayOpen((open) => !open)}
            />
          </div>
          <div
            id="game-overlay-root"
            ref={setBoostOverlayRoot}
            data-testid="game-overlay-root"
            className="pointer-events-none absolute left-0 top-0 overflow-hidden"
            style={{
              zIndex: DASHBOARD_OVERLAY_Z_INDEX,
              width: ROBLOX_DASHBOARD_REFERENCE.width,
              height: ROBLOX_DASHBOARD_REFERENCE.height
            }}
          />
          <BoostsTray
            open={boostsTrayOpen}
            activeBoosts={activeRuntimeBoosts}
            triggerRef={boostTriggerRef}
            portalRoot={boostOverlayRoot}
            onClose={() => setBoostsTrayOpen(false)}
            onActivate={playerRuntimeActions?.activateBoost}
          />
          {dashboardDevToolsEnabled ? <DashboardDataArtInspector model={model} artAudit={artAudit} playerRuntime={playerRuntime} playerRuntimeActions={playerRuntimeActions} /> : null}
      </GameViewportScaler>
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
          <GameShell data={data} frameScale={1} embedded />
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
    ["Hero era artwork", data.eras[0]?.artKey ?? "era-survival", "Needs Work"],
    ["HUD economy icons", data.clientProfiles.default.primaryHudResources?.map((resource) => typeof resource === "string" ? resource : resource.iconKey ?? resource.id).join(", ") ?? "missing", "Close"],
    ["Upgrade row icons", data.upgrades.slice(0, 4).map((upgrade) => upgrade.iconKey ?? "missing").join(", "), "Needs Work"],
    ["Panel backgrounds", "Roblox dashboard asset registry", "Close"]
  ];
  const backgroundAudit = [
    ["Navigation", "dashboard_nav_background", "Roblox background image"],
    ["Click Power", "dashboard_click_panel_background", "Roblox integrated clicker HUD"],
    ["Auto Click", "dashboard_auto_panel_background", "Roblox integrated clicker HUD"],
    ["Critical Chance", "dashboard_critical_panel_background", "Roblox integrated clicker HUD"],
    ["Hero Frame", "dashboard_city_hero", "Roblox background image"],
    ["Top HUD", "dashboard_top_hud", "Roblox background image"],
    ["Upgrade Panel", "dashboard_upgrade_background", "Roblox background image"],
    ["Leaderboard", "dashboard_leaderboard_background", "Roblox background image"],
    ["Active Event", "dashboard_event_background", "Roblox background image"],
    ["Alignment", "dashboard_alignment_background", "Roblox background image"],
    ["Boosts Tray", "none exported", "CSS framework until Studio art exists"]
  ];
  const parityChecklist = [
    ["Navigation", "Close"],
    ["Buttons", "Close"],
    ["Typography", "Close"],
    ["Backgrounds", "Close"],
    ["Icons", "Close"],
    ["Glow", "Close"],
    ["Spacing", "Close"],
    ["Panel padding", "Close"],
    ["Hero art", "Needs Work"],
    ["Upgrade icons", "Needs Work"]
  ];

  return (
    <main className="min-h-screen bg-[image:var(--genesis-app-gradient)] p-4" style={shellStyle}>
      <div className="mx-auto grid max-w-[1920px] grid-cols-[1fr_24rem] gap-3">
        <div className={mode === "side-by-side" ? "grid min-h-[760px] grid-cols-2 gap-3" : "relative min-h-[760px] overflow-hidden rounded-md border border-cyan-200/20"}>
          {mode === "reference" ? (
            <div className={panelClasses("min-h-[760px] overflow-hidden p-3")}>
              <div className="mb-2 flex items-center justify-between">
                <StatusBadge label="Roblox Reference" tone={selectedReference?.status === "missing" ? "gold" : "cyan"} />
                <span className="text-xs font-bold text-cyan-100/60">{referenceViewport}</span>
              </div>
              <div className="aspect-video w-full overflow-hidden rounded-md border border-cyan-200/20 bg-slate-950">
                {selectedReference ? <ReferenceCapture reference={selectedReference} /> : null}
              </div>
              {showGuides ? <AlignmentGuides /> : null}
            </div>
          ) : mode === "implementation" ? (
            <>
              <ScaledDashboardPreview data={data} showGuides={showGuides} />
            </>
          ) : mode === "side-by-side" ? (
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
              <button className={`h-9 rounded-md border text-sm font-bold transition active:translate-y-px ${mode === "reference" ? "border-cyan-200/55 bg-cyan-300/16 text-white" : "border-white/10 bg-black/25 text-cyan-100/70"}`} onClick={() => setMode("reference")}>
                Reference
              </button>
              <button className={`h-9 rounded-md border text-sm font-bold transition active:translate-y-px ${mode === "implementation" ? "border-cyan-200/55 bg-cyan-300/16 text-white" : "border-white/10 bg-black/25 text-cyan-100/70"}`} onClick={() => setMode("implementation")}>
                Implementation
              </button>
              <button className={`h-9 rounded-md border text-sm font-bold transition active:translate-y-px ${mode === "side-by-side" ? "border-cyan-200/55 bg-cyan-300/16 text-white" : "border-white/10 bg-black/25 text-cyan-100/70"}`} onClick={() => setMode("side-by-side")}>
                Side by Side
              </button>
              <button className={`h-9 rounded-md border text-sm font-bold transition active:translate-y-px ${mode === "overlay" ? "border-cyan-200/55 bg-cyan-300/16 text-white" : "border-white/10 bg-black/25 text-cyan-100/70"}`} onClick={() => setMode("overlay")}>
                50% Overlay
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
              <div className="text-xs uppercase text-cyan-100/55">Panel Background Audit</div>
              <div className="mt-2 space-y-1 text-xs">
                {backgroundAudit.map(([panel, key, state]) => (
                  <div key={panel} className="grid grid-cols-[6.5rem_1fr] gap-2 rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1">
                    <span className="font-bold text-white">{panel}</span>
                    <span className="truncate text-cyan-100/62">{key} · {state}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-md bg-black/25 p-3">
              <div className="text-xs uppercase text-cyan-100/55">Mismatch Checklist</div>
              <div className="mt-2 grid grid-cols-1 gap-1 text-xs text-cyan-50/64">
                {parityChecklist.map(([item, itemStatus]) => (
                  <div key={item} className="grid grid-cols-[1fr_5.5rem] rounded-sm border border-white/10 bg-white/[0.03] px-2 py-1">
                    <span>{item}</span>
                    <span className={itemStatus === "Perfect" ? "text-emerald-100" : itemStatus === "Close" ? "text-cyan-100" : "text-amber-100"}>{itemStatus}</span>
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
