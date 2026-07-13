import { RobloxParityReview } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData, RuntimeContentState } from "@/lib/canonical-runtime";

export default function ParityReviewRoute({ data }: { data: GameRuntimeData; runtimeState: RuntimeContentState }) {
  return <RobloxParityReview data={data} />;
}
