import { ArtReviewGallery } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData, RuntimeContentState } from "@/lib/canonical-runtime";

export default function ArtReviewRoute({ data }: { data: GameRuntimeData; runtimeState: RuntimeContentState }) {
  return <ArtReviewGallery data={data} />;
}
