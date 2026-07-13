import { GameShell } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData, RuntimeContentState } from "@/lib/canonical-runtime";

export default function ResearchRoute({ data, runtimeState }: { data: GameRuntimeData; runtimeState: RuntimeContentState }) {
  return <GameShell data={data} runtimeState={runtimeState} activeScreen="research" activeEraId="space-age" activeCategoryId="science" />;
}
