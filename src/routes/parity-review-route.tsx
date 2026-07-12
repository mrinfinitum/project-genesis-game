import { RobloxParityReview } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData } from "@/lib/canonical-runtime";

export default function ParityReviewRoute({ data }: { data: GameRuntimeData }) {
  return <RobloxParityReview data={data} />;
}
