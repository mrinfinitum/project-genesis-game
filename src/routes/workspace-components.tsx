import { useEffect, useMemo, useState } from "react";
import { BookOpen, FlaskConical, Lock, Network, Orbit, Rocket, ScanSearch, Sparkles, Wrench, type LucideIcon } from "lucide-react";
import type { GameRuntimeData, RuntimeContentState } from "@/lib/canonical-runtime";
import type { DashboardPlayerState } from "@/lib/dashboard/dashboard-model";
import { resolveWorkspaceLayout, TEMPORARY_STUDIO_SHELL_CONTRACT } from "@/lib/app-shell/studio-shell-contract";
import type { PlayerRuntimeState } from "@/lib/player-runtime";
import {
  auditDiscoveryRuntime,
  composeDiscoveryCatalogView,
  createDiscoveryDiagnostics,
  DEFAULT_DISCOVERY_ENVIRONMENT,
  generateDiscoveryPlacements,
  resolveDiscoveryCategories,
  resolveDiscoveryRarities,
  resolvePublishedDiscoveries
} from "@/lib/discovery";
import type { DiscoveryCatalogViewModel } from "@/lib/discovery";

const discoveryDevToolsEnabled = import.meta.env.VITE_ENABLE_DEV_TOOLS === "true";

export type WorkspaceRouteProps = {
  data: GameRuntimeData;
  runtimeState: RuntimeContentState;
  playerState: DashboardPlayerState;
  playerRuntime: PlayerRuntimeState;
};

function usePersistentWorkspaceState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = window.sessionStorage.getItem(key);
      return saved ? { ...initial, ...JSON.parse(saved) } as T : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Best-effort route-local state restoration.
    }
  }, [key, value]);

  return [value, setValue] as const;
}

function WorkspaceFrame({ screenId, title, eyebrow, icon: Icon, background = "radial-gradient(circle at 50% 10%, rgba(45,212,255,0.14), transparent 34rem), linear-gradient(145deg, rgba(4,12,26,0.96), rgba(2,8,18,0.96))", children }: { screenId: string; title: string; eyebrow: string; icon: LucideIcon; background?: string; children: React.ReactNode }) {
  const layout = resolveWorkspaceLayout({ shellProfile: TEMPORARY_STUDIO_SHELL_CONTRACT });
  return (
    <main
      className="relative h-full w-full overflow-hidden text-cyan-50"
      data-testid={`${screenId}-workspace`}
      data-workspace-screen-id={screenId}
      data-local-coordinate-origin={`${layout.origin.x},${layout.origin.y}`}
      style={{ background }}
      tabIndex={-1}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(45,212,255,0.055)_1px,transparent_1px),linear-gradient(rgba(45,212,255,0.045)_1px,transparent_1px)] bg-[size:64px_64px] opacity-45" />
      <section className="relative z-10 flex h-full flex-col p-6">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-cyan-200/16 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-sm border border-cyan-100/28 bg-cyan-300/10 shadow-[0_0_26px_rgba(45,212,255,0.16)]">
              <Icon className="h-8 w-8 text-cyan-100" />
            </div>
            <div>
              <div className="text-[0.72rem] font-black uppercase tracking-[0.32em] text-cyan-100/55">{eyebrow}</div>
              <h1 className="text-3xl font-black uppercase tracking-normal text-white">{title}</h1>
            </div>
          </div>
          <div className="rounded-sm border border-cyan-200/18 bg-black/35 px-3 py-2 text-[0.68rem] font-black uppercase text-cyan-100/62">
            Shell Workspace · {TEMPORARY_STUDIO_SHELL_CONTRACT.shellVersion}
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}

export function SimpleManagementWorkspace({ screenId, title, eyebrow, icon, description, metrics, playerRuntime }: { screenId: string; title: string; eyebrow: string; icon: LucideIcon; description: string; metrics: Array<{ label: string; value: string | number }>; playerRuntime: PlayerRuntimeState }) {
  return (
    <WorkspaceFrame screenId={screenId} title={title} eyebrow={eyebrow} icon={icon}>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_22rem] gap-5 pt-5">
        <section className="min-h-0 rounded-sm border border-cyan-200/14 bg-slate-950/58 p-5 shadow-[inset_0_0_32px_rgba(45,212,255,0.045)]">
          <p className="max-w-3xl text-base font-semibold leading-7 text-cyan-50/72">{description}</p>
          <div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-3">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-sm border border-cyan-200/12 bg-black/30 p-4">
                <div className="text-[0.64rem] font-black uppercase tracking-[0.18em] text-cyan-100/48">{metric.label}</div>
                <div className="mt-2 text-2xl font-black text-white">{metric.value}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 h-[46%] rounded-sm border border-cyan-200/10 bg-[radial-gradient(circle_at_50%_50%,rgba(45,212,255,0.12),transparent_18rem),rgba(0,0,0,0.24)]" />
        </section>
        <aside className="min-h-0 rounded-sm border border-cyan-200/14 bg-slate-950/62 p-4">
          <div className="text-[0.72rem] font-black uppercase tracking-[0.26em] text-cyan-100/54">Runtime</div>
          <div className="mt-4 space-y-3 text-sm font-semibold text-cyan-50/72">
            <div className="flex justify-between gap-4 border-b border-cyan-200/10 pb-2"><span>Era</span><span>{playerRuntime.civilization.currentEraId}</span></div>
            <div className="flex justify-between gap-4 border-b border-cyan-200/10 pb-2"><span>Revision</span><span>{playerRuntime.revision}</span></div>
            <div className="flex justify-between gap-4 border-b border-cyan-200/10 pb-2"><span>Automation</span><span>{playerRuntime.production.automationEnabled ? "Online" : "Offline"}</span></div>
          </div>
        </aside>
      </div>
    </WorkspaceFrame>
  );
}

const researchBranches = ["Agriculture", "Engineering", "Manufacturing", "Energy", "Commerce", "Transportation", "Computing", "Medicine", "Space", "Civilization"];
const researchNodes = ["Food Gathering", "Crop Cultivation", "Food Storage", "Irrigation", "Animal Domestication", "Selective Breeding", "Fertilization", "Advanced Farming", "Grain Processing", "Food Preservation", "Nutrition Science", "Hydroponics"];

export function ResearchWorkspace({ data, runtimeState, playerRuntime }: WorkspaceRouteProps) {
  const [local, setLocal] = usePersistentWorkspaceState("noveris.research.workspace", { branch: "Agriculture", node: "Food Storage", zoom: 1 });
  const selectedIndex = Math.max(0, researchNodes.indexOf(local.node));
  const completedCount = Math.min(selectedIndex, researchNodes.length);
  const totalResearch = data.upgrades.length;
  const researchBalance = playerRuntime.economy.balances["ECON-RESEARCH"] ?? 0;

  const branchRows = useMemo(() => researchBranches.map((branch, index) => ({
    branch,
    complete: Math.max(0, Math.min(6, completedCount - index)),
    total: 6
  })), [completedCount]);

  return (
    <WorkspaceFrame screenId="research" title="Research" eyebrow="Management Workspace" icon={FlaskConical} background="radial-gradient(circle at 48% 16%, rgba(67,56,202,0.24), transparent 30rem), radial-gradient(circle at 72% 54%, rgba(45,212,255,0.12), transparent 28rem), linear-gradient(145deg, rgba(3,9,23,0.98), rgba(7,16,36,0.98))">
      <div className="grid min-h-0 flex-1 grid-cols-[18rem_1fr_23rem] grid-rows-[1fr_5.5rem] gap-4 pt-5">
        <aside className="min-h-0 overflow-hidden rounded-sm border border-cyan-200/16 bg-slate-950/64 p-3">
          <div className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-cyan-100/54">Research Branches</div>
          <div className="mt-3 space-y-2 overflow-y-auto pr-1">
            {branchRows.map((row) => (
              <button
                key={row.branch}
                type="button"
                className={`flex w-full items-center justify-between gap-3 rounded-sm border px-3 py-2 text-left text-sm font-black uppercase transition ${local.branch === row.branch ? "border-cyan-100/42 bg-cyan-300/14 text-white" : "border-cyan-200/10 bg-black/24 text-cyan-50/72 hover:border-cyan-200/28"}`}
                onClick={() => setLocal((current) => ({ ...current, branch: row.branch }))}
              >
                <span>{row.branch}</span>
                <span className="text-xs text-cyan-100/58">{row.complete}/{row.total}</span>
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-sm border border-cyan-200/12 bg-black/28 p-3">
            <div className="text-[0.62rem] font-black uppercase text-cyan-100/46">Total Research</div>
            <div className="mt-1 text-xl font-black text-white">{completedCount}/{Math.max(1, Math.min(totalResearch, 556))}</div>
            <div className="mt-2 h-2 overflow-hidden rounded-sm bg-cyan-950">
              <div className="h-full rounded-sm bg-cyan-300" style={{ width: `${Math.min(100, (completedCount / researchNodes.length) * 100)}%` }} />
            </div>
          </div>
        </aside>

        <section className="relative min-h-0 overflow-hidden rounded-sm border border-cyan-200/16 bg-slate-950/54 p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-cyan-100/48">{local.branch}</div>
              <h2 className="text-2xl font-black uppercase text-white">Advance farming techniques and food production.</h2>
            </div>
            <div className="rounded-sm border border-cyan-200/16 bg-black/30 px-3 py-2 text-right">
              <div className="text-[0.62rem] font-black uppercase text-cyan-100/46">Branch Progress</div>
              <div className="text-xl font-black text-white">{Math.round((completedCount / researchNodes.length) * 100)}%</div>
            </div>
          </div>
          <div className="absolute inset-x-8 bottom-14 top-32">
            <div className="absolute left-0 right-0 top-1/2 h-px bg-cyan-200/18" />
            <div className="grid h-full grid-cols-4 grid-rows-3 gap-5">
              {researchNodes.map((node, index) => {
                const selected = node === local.node;
                const locked = index > selectedIndex + 2;
                return (
                  <button
                    key={node}
                    type="button"
                    className={`relative flex flex-col items-center justify-center rounded-sm border p-2 text-center transition ${selected ? "border-cyan-100/60 bg-cyan-300/18 shadow-[0_0_28px_rgba(45,212,255,0.22)]" : locked ? "border-cyan-200/10 bg-black/28 text-cyan-50/36" : "border-cyan-200/18 bg-black/32 text-cyan-50/72 hover:border-cyan-200/42"}`}
                    onClick={() => setLocal((current) => ({ ...current, node }))}
                  >
                    {locked ? <Lock className="mb-2 h-5 w-5" /> : <Network className="mb-2 h-5 w-5 text-cyan-100" />}
                    <span className="text-xs font-black uppercase">{node}</span>
                    <span className="mt-1 text-[0.62rem] font-bold text-cyan-100/52">Lv. {index <= selectedIndex ? 1 : 0}/1</span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="min-h-0 overflow-hidden rounded-sm border border-cyan-200/16 bg-slate-950/66 p-4">
          <div className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-cyan-100/48">Selected Research</div>
          <h2 className="mt-2 text-3xl font-black uppercase text-white">{local.node}</h2>
          <div className="mt-1 text-sm font-black uppercase text-cyan-100/58">Lv. {selectedIndex <= completedCount ? 0 : 1}/1</div>
          <p className="mt-5 text-sm font-semibold leading-6 text-cyan-50/70">Structured placeholder detail panel. Final research definitions, costs, benefits, unlocks, and duration come from canonical Studio data.</p>
          <div className="mt-5 space-y-3 text-sm">
            <DetailRow label="Benefits" value="Food Storage Capacity +15%" />
            <DetailRow label="Unlocks" value="Storage Hut" />
            <DetailRow label="Requirements" value="Crop Cultivation · Completed" />
            <DetailRow label="Cost" value={`${Math.max(0, 25 - researchBalance)} Research required`} />
            <DetailRow label="Duration" value="5m placeholder" />
          </div>
          <button type="button" className="mt-6 h-12 w-full rounded-sm border border-emerald-200/40 bg-emerald-400/18 text-sm font-black uppercase text-emerald-50 shadow-[0_0_24px_rgba(74,222,128,0.14)]">Start Research</button>
        </aside>

        <footer className="col-span-3 rounded-sm border border-cyan-200/14 bg-slate-950/58 px-4 py-3">
          <div className="flex h-full items-center justify-between gap-3">
            {data.eras.slice(0, 9).map((era, index) => (
              <div key={era.id} className="flex min-w-0 flex-1 items-center gap-2">
                <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-sm border text-sm font-black ${era.id === playerRuntime.civilization.currentEraId ? "border-emerald-200 bg-emerald-300/18 text-white" : "border-cyan-200/18 bg-black/25 text-cyan-50/58"}`}>{index + 1}</div>
                <div className="min-w-0 truncate text-xs font-black uppercase text-cyan-50/70">{era.displayName ?? era.name}</div>
              </div>
            ))}
          </div>
        </footer>
      </div>
      <div className="sr-only">Runtime source {runtimeState.activeSource}</div>
    </WorkspaceFrame>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-cyan-200/10 bg-black/24 px-3 py-2">
      <div className="text-[0.62rem] font-black uppercase text-cyan-100/44">{label}</div>
      <div className="mt-1 font-bold text-cyan-50/82">{value}</div>
    </div>
  );
}

export function BuildingsWorkspace(props: WorkspaceRouteProps) {
  return <SimpleManagementWorkspace screenId="buildings" title="Buildings" eyebrow="Production Workspace" icon={Orbit} description="Manage structures, production chains, and workforce assignments inside the shared civilization shell." metrics={[{ label: "Catalog Resources", value: props.data.resources.length }, { label: "Labor", value: Math.floor(props.playerRuntime.economy.balances["ECON-LABOR"] ?? 0) }, { label: "Era", value: props.playerRuntime.civilization.currentEraId }]} playerRuntime={props.playerRuntime} />;
}

export function UpgradesWorkspace(props: WorkspaceRouteProps) {
  return <SimpleManagementWorkspace screenId="upgrades" title="Upgrades" eyebrow="Upgrade Workspace" icon={Wrench} description="Browse upgrade chains without remounting the persistent top HUD, left navigation, runtime, or simulation." metrics={[{ label: "Categories", value: props.data.upgradeCategories.length }, { label: "Upgrades", value: props.data.upgrades.length }, { label: "Research", value: Math.floor(props.playerRuntime.economy.balances["ECON-RESEARCH"] ?? 0) }]} playerRuntime={props.playerRuntime} />;
}

export function CivilizationWorkspace(props: WorkspaceRouteProps) {
  return <SimpleManagementWorkspace screenId="civilization" title="Civilization" eyebrow="Civilization Workspace" icon={Sparkles} description="Review civilization identity, era progression, alignment, and mastery as route-local workspace content." metrics={[{ label: "Eras", value: props.data.eras.length }, { label: "Population", value: Math.floor(props.playerRuntime.economy.balances["ECON-POPULATION"] ?? 0) }, { label: "Civilization", value: props.playerRuntime.civilization.civilizationName }]} playerRuntime={props.playerRuntime} />;
}

export function EventsWorkspace(props: WorkspaceRouteProps) {
  return <SimpleManagementWorkspace screenId="events" title="Events" eyebrow="Event Workspace" icon={Orbit} description="Event and milestone content is hosted inside the workspace slot while global shell controls remain stable." metrics={[{ label: "Active Event", value: props.playerRuntime.events.activeEventId ?? "None" }, { label: "Revision", value: props.playerRuntime.revision }, { label: "Source", value: props.runtimeState.activeSource }]} playerRuntime={props.playerRuntime} />;
}

export function GalaxyWorkspace(props: WorkspaceRouteProps) {
  return <SimpleManagementWorkspace screenId="galaxy" title="Galaxy" eyebrow="Galaxy Workspace" icon={Orbit} description="Galaxy exploration can preserve selected object and camera state without duplicating global HUD elements." metrics={[{ label: "Eras", value: props.data.eras.length }, { label: "Discovery Points", value: props.playerRuntime.civilization.discoveryPoints }, { label: "Automation", value: props.playerRuntime.production.automationEnabled ? "Online" : "Offline" }]} playerRuntime={props.playerRuntime} />;
}

export function DiscoveryJournalWorkspace(props: WorkspaceRouteProps) {
  const audit = auditDiscoveryRuntime(props.data);
  const records = resolvePublishedDiscoveries(props.data);
  const categories = resolveDiscoveryCategories(props.data);
  const rarities = resolveDiscoveryRarities(props.data);
  const catalog = composeDiscoveryCatalogView(props.data, props.playerRuntime.discovery);
  const placements = generateDiscoveryPlacements(props.data, DEFAULT_DISCOVERY_ENVIRONMENT, { currentEraId: props.playerRuntime.civilization.currentEraId, completedResearchIds: props.playerRuntime.upgrades.unlockedIds, equipmentIds: [] });
  const diagnostics = createDiscoveryDiagnostics(props.data, props.playerRuntime.discovery);

  return (
    <WorkspaceFrame screenId="discovery" title="Discoveries" eyebrow="Universal Discovery Registry" icon={ScanSearch}>
      <div className="grid min-h-0 flex-1 grid-cols-[18rem_1fr_22rem] gap-4 pt-5">
        <aside className="min-h-0 overflow-hidden rounded-sm border border-cyan-200/14 bg-slate-950/62 p-4">
          <div className="text-[0.68rem] font-black uppercase tracking-[0.26em] text-cyan-100/54">Journal</div>
          {[
            ["My Discoveries", props.playerRuntime.discovery.discoveredObjectIds.length],
            ["First Discoveries", 0],
            ["Pending Verification", props.playerRuntime.discovery.pendingDiscoveryClaims.length],
            ["Collections", props.data.discoveryCollections?.length ?? 0],
            ["Discovery Chains", props.data.discoveryChains?.length ?? 0],
            ["Nearby Planet", placements.length],
            ["All Known Entries", records.length]
          ].map(([label, value]) => (
            <div key={label} className="mt-3 flex items-center justify-between border-b border-cyan-200/10 pb-2 text-sm font-black uppercase text-cyan-50/72">
              <span>{label}</span>
              <span className="text-cyan-100">{value}</span>
            </div>
          ))}
        </aside>

        <section className="min-h-0 overflow-hidden rounded-sm border border-cyan-200/14 bg-slate-950/56 p-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-[0.68rem] font-black uppercase tracking-[0.24em] text-cyan-100/48">Canonical Entries</div>
              <h2 className="text-2xl font-black uppercase text-white">{audit.ok ? "Known Discoveries" : "Discovery Contract Missing"}</h2>
            </div>
            <div className={`rounded-sm border px-3 py-2 text-xs font-black uppercase ${audit.ok ? "border-emerald-200/30 bg-emerald-400/12 text-emerald-100" : "border-amber-200/35 bg-amber-400/12 text-amber-100"}`}>
              v{audit.metadata.contentVersion} · {audit.counts.records} records
            </div>
          </div>

          {!audit.ok ? (
            <div className="mt-5 rounded-sm border border-amber-200/24 bg-amber-300/8 p-4 text-sm font-semibold leading-6 text-amber-50/82">
              Studio runtime v{audit.metadata.contentVersion} loaded, but the public snapshot does not include the required Universal Discovery Registry fields yet.
              <div className="mt-3 space-y-1 text-xs text-amber-100/76">
                {audit.failures.slice(0, 6).map((failure) => <div key={failure}>{failure}</div>)}
              </div>
            </div>
          ) : null}

          <div className="mt-5 grid max-h-[calc(100%-8rem)] grid-cols-2 gap-3 overflow-y-auto pr-1 xl:grid-cols-3">
            {(catalog.length ? catalog : records.map((discovery): DiscoveryCatalogViewModel => ({ discovery, displayName: discovery.displayName ?? discovery.name ?? discovery.id, personalState: "unknown", registryState: "unknown" }))).map((entry) => (
              <article key={entry.discovery.id} className="min-h-40 rounded-sm border border-cyan-200/14 bg-black/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-sm border border-cyan-100/20 bg-cyan-300/10">
                    <BookOpen className="h-6 w-6 text-cyan-100" />
                  </div>
                  <div className="text-right text-[0.62rem] font-black uppercase text-cyan-100/48">{entry.rarity?.displayName ?? entry.discovery.rarityId ?? entry.discovery.rarity ?? "Unknown"}</div>
                </div>
                <h3 className="mt-3 text-base font-black uppercase text-white">{entry.displayName}</h3>
                <div className="mt-1 text-xs font-bold uppercase text-cyan-100/52">{entry.category?.displayName ?? entry.discovery.categoryId ?? "Uncategorized"}</div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[0.64rem] font-black uppercase">
                  <span className="rounded-sm border border-cyan-200/10 bg-slate-950/70 px-2 py-1 text-cyan-50/62">{entry.personalState}</span>
                  <span className="rounded-sm border border-cyan-200/10 bg-slate-950/70 px-2 py-1 text-cyan-50/62">{entry.registryState}</span>
                </div>
              </article>
            ))}
            {!records.length ? (
              <div className="col-span-full rounded-sm border border-cyan-200/12 bg-black/28 p-6 text-center text-sm font-semibold text-cyan-50/62">
                No published Discovery records are available in the current Studio snapshot.
              </div>
            ) : null}
          </div>
        </section>

        <aside className="min-h-0 overflow-hidden rounded-sm border border-cyan-200/14 bg-slate-950/62 p-4">
          <div className="text-[0.68rem] font-black uppercase tracking-[0.26em] text-cyan-100/54">{discoveryDevToolsEnabled ? "Diagnostics" : "Registry Status"}</div>
          <div className="mt-4 space-y-3 text-sm font-semibold text-cyan-50/72">
            <DetailRow label="Categories" value={`${categories.length}`} />
            <DetailRow label="Rarities" value={`${rarities.length}`} />
            {discoveryDevToolsEnabled ? <DetailRow label="Eligible Pool" value={`${diagnostics.eligiblePool.length}`} /> : null}
            {discoveryDevToolsEnabled ? <DetailRow label="Placements" value={`${placements.length}`} /> : null}
            <DetailRow label="Registry Cache" value="Unavailable-safe" />
            {!discoveryDevToolsEnabled ? <DetailRow label="Verification" value={audit.ok ? "Ready" : "Waiting for Studio"} /> : null}
          </div>
        </aside>
      </div>
    </WorkspaceFrame>
  );
}

export function SpaceportWorkspace(props: WorkspaceRouteProps) {
  return <SimpleManagementWorkspace screenId="spaceport" title="Spaceport" eyebrow="Mission Workspace" icon={Rocket} description="Launch, mission, and travel surfaces live inside the main workspace slot unless Studio marks them as full-screen takeovers." metrics={[{ label: "Premium", value: Math.floor(props.playerRuntime.economy.balances["ECON-PREMIUM-CRYSTALS"] ?? 0) }, { label: "Content", value: props.data.metadata.contentVersion }, { label: "Save", value: props.playerRuntime.saveVersion }]} playerRuntime={props.playerRuntime} />;
}
