import { GameShell } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData } from "@/lib/canonical-runtime";

export default function ResearchRoute({ data }: { data: GameRuntimeData }) {
  return <GameShell data={data} activeScreen="research" activeEraId="space-age" activeCategoryId="science" />;
}
