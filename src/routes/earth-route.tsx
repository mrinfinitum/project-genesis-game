import { GameShell } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData } from "@/lib/canonical-runtime";

export default function EarthRoute({ data }: { data: GameRuntimeData }) {
  return <GameShell data={data} activeScreen="earth" activeEraId="survival" activeCategoryId="industry" />;
}
