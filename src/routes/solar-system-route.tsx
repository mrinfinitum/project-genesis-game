import { GalaxyWorkspace, type WorkspaceRouteProps } from "@/routes/workspace-components";

export default function SolarSystemRoute(props: WorkspaceRouteProps) {
  return <GalaxyWorkspace {...props} entry="solar-system" />;
}
