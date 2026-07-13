import { Coins, Factory, FlaskConical, Gauge, MapPinned, PackageOpen, RotateCw, Warehouse } from "lucide-react";
import type { ReactNode } from "react";
import { StoryCanvas } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData, ResourceDefinition, RuntimeContentState, UpgradeDefinition } from "@/lib/canonical-runtime";
import type { DashboardPlayerState } from "@/lib/dashboard/dashboard-model";
import { getInventoryResources, getPrimaryHudResourceIds } from "@/lib/player-runtime";

type RouteProps = {
  data: GameRuntimeData;
  runtimeState: RuntimeContentState;
  playerState: DashboardPlayerState;
};

function compactNumber(value: number) {
  return new Intl.NumberFormat("en", { notation: Math.abs(value) > 9999 ? "compact" : "standard", maximumFractionDigits: 1 }).format(value);
}

function resourcePlanetAvailability(resource: ResourceDefinition) {
  const tags = resource.tags ?? [];
  const likelyPlanetTags = tags.filter((tag) => ["Earth", "Terrestrial", "Desert", "Ocean", "Dead", "Lava", "Ice", "Void", "Living", "Bio", "Ancient", "Energy", "Gas Giant", "Crystal", "Toxic", "Artificial", "Primordial", "Cosmic"].includes(tag));
  return likelyPlanetTags.length ? likelyPlanetTags.join(", ") : "Awaiting planet availability export";
}

function upgradeNames(upgrades: UpgradeDefinition[]) {
  if (!upgrades.length) return "None in current upgrade export";
  return upgrades.slice(0, 3).map((upgrade) => upgrade.displayName).join(", ");
}

export default function ResourcesRoute({ data, runtimeState, playerState }: RouteProps) {
  const hudIds = new Set(getPrimaryHudResourceIds(data));
  const inventoryResources = getInventoryResources(data);

  return (
    <StoryCanvas>
      <main className="min-h-screen bg-[radial-gradient(circle_at_50%_12%,rgba(45,212,255,0.14),transparent_34rem),linear-gradient(145deg,#030713_0%,#071225_52%,#050816_100%)] px-5 py-5 text-cyan-50">
        <section className="mx-auto max-w-[1760px]">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-cyan-200/16 pb-4">
            <div>
              <div className="text-xs font-black uppercase text-cyan-100/55">Inventory Catalog</div>
              <h1 className="mt-1 text-3xl font-black text-white">Resources</h1>
            </div>
            <div className="rounded-md border border-cyan-200/18 bg-black/28 px-3 py-2 text-xs font-black uppercase text-cyan-100/70">
              {inventoryResources.length} inventory resources · {hudIds.size} HUD economy values · {runtimeState.activeSource}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {inventoryResources.map((resource) => {
              const amount = playerState.resourceInventory[resource.id] ?? 0;
              const rate = playerState.resourceRates[resource.id] ?? 0;
              const storage = playerState.resourceStorageLimits?.[resource.id] ?? Number.MAX_SAFE_INTEGER;
              const consumedBy = data.upgrades.filter((upgrade) => upgrade.costResourceId === resource.id);
              const researchLinks = data.upgrades.filter((upgrade) => upgrade.costResourceId === resource.id || upgrade.description.toLowerCase().includes(resource.name.toLowerCase()) || upgrade.effectType.toLowerCase().includes("research"));
              const usage = consumedBy.length ? `Upgrade cost input for ${consumedBy.length} canonical upgrades` : resource.tradable ? "Tradable inventory material" : "Cataloged inventory material";

              return (
                <article key={resource.id} className="min-h-[25rem] rounded-md border border-cyan-200/18 bg-slate-950/72 p-3 shadow-[0_18px_48px_rgba(0,0,0,0.34)]">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="truncate text-lg font-black text-white">{resource.displayName}</h2>
                      <div className="mt-1 text-[0.68rem] font-black uppercase text-cyan-100/50">{resource.id} · {resource.resourceClass} · {resource.rarity}</div>
                    </div>
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-cyan-200/20 bg-cyan-300/10 text-cyan-100">
                      <PackageOpen className="h-5 w-5" />
                    </div>
                  </div>

                  <p className="mt-3 h-[3.75rem] overflow-hidden text-sm leading-5 text-cyan-50/70">{resource.description}</p>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Metric icon={<Coins className="h-4 w-4" />} label="Inventory" value={compactNumber(amount)} />
                    <Metric icon={<Gauge className="h-4 w-4" />} label="Production" value={`${rate >= 0 ? "+" : ""}${compactNumber(rate)}/s`} />
                    <Metric icon={<Warehouse className="h-4 w-4" />} label="Storage" value={storage === Number.MAX_SAFE_INTEGER ? "Unbounded" : compactNumber(storage)} />
                    <Metric icon={<RotateCw className="h-4 w-4" />} label="Consumption" value={`${consumedBy.length} upgrades`} />
                  </div>

                  <div className="mt-3 space-y-2 text-xs leading-5 text-cyan-50/72">
                    <InfoLine label="Usage" value={usage} />
                    <InfoLine label="Sources" value={(resource.tags ?? []).slice(0, 5).join(", ") || "Canonical resource catalog"} />
                    <InfoLine label="Buildings" value="Awaiting canonical building export" icon={<Factory className="h-3.5 w-3.5" />} />
                    <InfoLine label="Research" value={upgradeNames(researchLinks)} icon={<FlaskConical className="h-3.5 w-3.5" />} />
                    <InfoLine label="Planet Availability" value={resourcePlanetAvailability(resource)} icon={<MapPinned className="h-3.5 w-3.5" />} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>
    </StoryCanvas>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-md border border-cyan-200/12 bg-black/28 p-2">
      <div className="flex items-center gap-1.5 text-[0.62rem] font-black uppercase text-cyan-100/52">
        {icon}
        {label}
      </div>
      <div className="mt-1 truncate text-base font-black text-white">{value}</div>
    </div>
  );
}

function InfoLine({ label, value, icon }: { label: string; value: string; icon?: ReactNode }) {
  return (
    <div className="rounded-sm border border-white/8 bg-white/[0.03] px-2 py-1">
      <div className="flex items-center gap-1 text-[0.6rem] font-black uppercase text-cyan-100/45">
        {icon}
        {label}
      </div>
      <div className="truncate font-semibold text-cyan-50/80">{value}</div>
    </div>
  );
}
