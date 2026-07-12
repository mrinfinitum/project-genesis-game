import { ArtReviewGallery } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData } from "@/lib/canonical-runtime";

export default function ArtReviewRoute({ data }: { data: GameRuntimeData }) {
  return <ArtReviewGallery data={data} />;
}
