import { GameShell } from "@/components/game-ui/genesis-ui";
import type { GameRuntimeData, RuntimeContentState } from "@/lib/canonical-runtime";
import type { ComponentProps } from "react";

type RouteProps = { data: GameRuntimeData; runtimeState: RuntimeContentState } & Pick<ComponentProps<typeof GameShell>, "playerState" | "playerRuntime" | "playerRuntimeActions">;

export default function ProductionRoute({ data, runtimeState, playerState, playerRuntime, playerRuntimeActions }: RouteProps) {
  return <GameShell data={data} runtimeState={runtimeState} playerState={playerState} playerRuntime={playerRuntime} playerRuntimeActions={playerRuntimeActions} activeScreen="production" activeEraId={playerRuntime?.civilization.currentEraId ?? "industrial"} activeCategoryId="industry" />;
}
