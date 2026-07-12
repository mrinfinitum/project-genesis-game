import { GameShell } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData } from "@/lib/canonical-runtime";

export default function SolarSystemRoute({ data }: { data: GameRuntimeData }) {
  return <GameShell data={data} activeScreen="solar" activeEraId="space-age" activeCategoryId="technology" />;
}
