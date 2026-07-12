import { GameShell } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData } from "@/lib/canonical-runtime";

export default function CivilizationRoute({ data }: { data: GameRuntimeData }) {
  return <GameShell data={data} activeScreen="civilization" activeEraId="modern" activeCategoryId="workforce" />;
}
