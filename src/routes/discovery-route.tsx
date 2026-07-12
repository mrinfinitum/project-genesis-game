import { GameShell } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData } from "@/lib/canonical-runtime";

export default function DiscoveryRoute({ data }: { data: GameRuntimeData }) {
  return <GameShell data={data} activeScreen="journal" activeEraId="interstellar" activeCategoryId="science" />;
}
