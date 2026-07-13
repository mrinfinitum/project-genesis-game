import { GameShell } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData, RuntimeContentState } from "@/lib/canonical-runtime";

export default function DiscoveryRoute({ data, runtimeState }: { data: GameRuntimeData; runtimeState: RuntimeContentState }) {
  return <GameShell data={data} runtimeState={runtimeState} activeScreen="journal" activeEraId="interstellar" activeCategoryId="science" />;
}
