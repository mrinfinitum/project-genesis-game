import { GameShell } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData } from "@/lib/canonical-runtime";

export default function ProductionRoute({ data }: { data: GameRuntimeData }) {
  return <GameShell data={data} activeScreen="production" activeEraId="industrial" activeCategoryId="industry" />;
}
