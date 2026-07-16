import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { ChevronLeft, Crosshair, Radar, Route, ScanSearch, Telescope } from "lucide-react";
import type { GameRuntimeData } from "@/lib/canonical-runtime";
import type { PlayerRuntimeState } from "@/lib/player-runtime";
import {
  composeVisibleNodes,
  createPersistentUniverseModel,
  createKnownSearchIndex,
  createRoutePreview,
  createStreamingSnapshot,
  resolveSemanticZoomLevel,
  resolveStarSystemPresentation,
  resolveTechnologyVisibility,
  type SemanticTransitionState,
  type SemanticZoomLevel,
  type TechnologyVisibility,
  type UniverseMapModel,
  type VisibleMapNode
} from "@/lib/galaxy-map";

type GalaxySemanticMapProps = {
  data: GameRuntimeData;
  playerRuntime: PlayerRuntimeState;
  entry?: "galaxy" | "solar-system";
};

type PersistentMapState = {
  level: SemanticZoomLevel;
  sectorId: string;
  systemId: string;
  selectedId?: string;
  focusedId?: string;
  probedIds: string[];
  cameraDistance: number;
  transitionState: SemanticTransitionState;
};

const storageKey = "noveris.galaxy.semantic-map.v3";

function canUseWebGL() {
  if (typeof document === "undefined") return false;
  if (typeof navigator !== "undefined" && navigator.userAgent.toLowerCase().includes("jsdom")) return false;
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function initialLevel(entry: GalaxySemanticMapProps["entry"], visibility: TechnologyVisibility): SemanticZoomLevel {
  if (entry === "solar-system") return "system";
  return visibility.canAccessGalaxy ? "galaxy" : visibility.canAccessSector ? "sector" : "system";
}

function usePersistentGalaxyState(model: UniverseMapModel, visibility: TechnologyVisibility, entry: GalaxySemanticMapProps["entry"]) {
  const fallback: PersistentMapState = {
    level: initialLevel(entry, visibility),
    sectorId: model.currentSectorId,
    systemId: model.currentSystemId,
    probedIds: [],
    cameraDistance: entry === "solar-system" ? 68 : 420,
    transitionState: "stable"
  };
  const [state, setState] = useState<PersistentMapState>(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      return saved ? { ...fallback, ...JSON.parse(saved) } : fallback;
    } catch {
      return fallback;
    }
  });

  const resolvedState = useMemo(() => {
    const resolution = resolveSemanticZoomLevel({
      requestedLevel: state.level,
      cameraDistance: state.cameraDistance,
      transitionState: state.transitionState,
      technologyVisibility: visibility,
      loadedContext: { sectorId: state.sectorId, systemId: state.systemId }
    });
    if (resolution.level !== state.level || resolution.blocked) {
      return { ...state, level: resolution.level, transitionState: "stable" };
    }
    return state;
  }, [state, visibility]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(resolvedState));
    } catch {
      // Camera and focus persistence should never block map rendering.
    }
  }, [resolvedState]);

  return [resolvedState, setState] as const;
}

function distanceClass(rangeState: VisibleMapNode["rangeState"]) {
  if (rangeState === "travel_reachable") return "text-emerald-100";
  if (rangeState === "probe_reachable") return "text-cyan-100";
  if (rangeState === "blocked_by_technology") return "text-amber-100";
  return "text-cyan-100/54";
}

function CameraRig({ level, focusTarget }: { level: SemanticZoomLevel; focusTarget?: VisibleMapNode["coordinates"] }) {
  const target = new THREE.Vector3(0, 0, 0);
  const focus = useMemo(() => new THREE.Vector3(), []);
  useFrame(({ camera, clock }) => {
    if (focusTarget) {
      focus.set(focusTarget[0], focusTarget[1], focusTarget[2]);
    } else {
      focus.set(0, 0, 0);
    }
    const drift = Math.sin(clock.elapsedTime * 0.11) * 10;
    const lift = Math.cos(clock.elapsedTime * 0.08) * 5;
    const desired = level === "universe"
      ? new THREE.Vector3(drift, 360 + lift, 920)
      : level === "galaxy"
        ? new THREE.Vector3(focus.x * 0.24 + drift, 190 + focus.y * 0.06 + lift, 520 + focus.z * 0.08)
        : level === "sector"
          ? new THREE.Vector3(focus.x * 0.32 + drift * 0.28, 82 + focus.y * 0.18 + lift * 0.3, 154 + focus.z * 0.16)
          : new THREE.Vector3(focus.x * 0.18 + drift * 0.12, 44 + focus.y * 0.12 + lift * 0.18, 98 + focus.z * 0.12);
    camera.position.lerp(desired, 0.04);
    target.lerp(focus, 0.08);
    camera.lookAt(target);
  });
  return null;
}

function PersistentGalaxyBackdrop({ level }: { level: SemanticZoomLevel }) {
  const coreRef = useRef<THREE.Group>(null);
  const dustRef = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);
  const dust = useMemo(() => Array.from({ length: 360 }, (_, index) => {
    const random = Math.sin(index * 78.233) * 43758.5453;
    const fraction = random - Math.floor(random);
    const angle = index * 2.399963;
    const arm = Math.sin(index * 0.09) * 46;
    const radius = 64 + (index % 89) * 5.6 + arm;
    return {
      position: [Math.cos(angle) * radius, ((index % 29) - 14) * 3.5, Math.sin(angle) * radius] as const,
      size: 2.2 + fraction * 5.5,
      tone: index % 7 === 0 ? "#22d3ee" : index % 5 === 0 ? "#a78bfa" : "#e0f2fe"
    };
  }), []);

  useEffect(() => {
    const mesh = dustRef.current;
    if (!mesh) return;
    dust.forEach((particle, index) => {
      position.set(particle.position[0], particle.position[1], particle.position[2]);
      scale.setScalar(particle.size);
      matrix.compose(position, new THREE.Quaternion(), scale);
      mesh.setMatrixAt(index, matrix);
      color.set(particle.tone);
      mesh.setColorAt(index, color);
    });
    mesh.count = dust.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [color, dust, matrix, position, scale]);

  useFrame(({ clock }) => {
    if (coreRef.current) coreRef.current.rotation.y = clock.elapsedTime * 0.018;
    if (dustRef.current) {
      const depth = level === "system" ? 0.44 : level === "sector" ? 0.62 : 0.82;
      const material = dustRef.current.material;
      if (!Array.isArray(material)) material.opacity = depth;
      dustRef.current.rotation.y = clock.elapsedTime * 0.006;
    }
  });

  return (
    <group ref={coreRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -18, 0]}>
        <torusGeometry args={[112, 9, 18, 160]} />
        <meshBasicMaterial color="#38bdf8" transparent opacity={0.055} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0.25, 0]} position={[0, -20, 0]}>
        <torusGeometry args={[184, 16, 18, 180]} />
        <meshBasicMaterial color="#818cf8" transparent opacity={0.035} />
      </mesh>
      <mesh position={[0, -22, 0]}>
        <sphereGeometry args={[38, 32, 32]} />
        <meshBasicMaterial color="#67e8f9" transparent opacity={0.08} />
      </mesh>
      <instancedMesh ref={dustRef} args={[undefined, undefined, dust.length]}>
        <sphereGeometry args={[1, 8, 8]} />
        <meshBasicMaterial vertexColors transparent opacity={0.7} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}

function InstancedNodeField({ nodes, onSelect, onEnter, onHover }: { nodes: VisibleMapNode[]; onSelect: (node: VisibleMapNode) => void; onEnter: (node: VisibleMapNode) => void; onHover: (node?: VisibleMapNode) => void }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const color = useMemo(() => new THREE.Color(), []);
  const matrix = useMemo(() => new THREE.Matrix4(), []);
  const position = useMemo(() => new THREE.Vector3(), []);
  const scale = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    nodes.forEach((node, index) => {
      const size = node.type === "sector" ? Math.max(8, node.radius * 0.45) : Math.max(2.4, node.radius);
      position.set(node.coordinates[0], node.coordinates[1], node.coordinates[2]);
      scale.setScalar(size);
      matrix.compose(position, new THREE.Quaternion(), scale);
      mesh.setMatrixAt(index, matrix);
      color.set(node.knowledgeState === "charted" ? "#7dd3fc" : node.canTravel ? "#5eead4" : node.canProbe ? "#38bdf8" : "#64748b");
      mesh.setColorAt(index, color);
    });
    mesh.count = nodes.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [color, matrix, nodes, position, scale]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = Math.sin(clock.elapsedTime * 0.2) * 0.018;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, Math.max(1, nodes.length)]}
      onClick={(event) => {
        event.stopPropagation();
        const node = typeof event.instanceId === "number" ? nodes[event.instanceId] : undefined;
        if (node) onSelect(node);
      }}
      onDoubleClick={(event) => {
        event.stopPropagation();
        const node = typeof event.instanceId === "number" ? nodes[event.instanceId] : undefined;
        if (node) onEnter(node);
      }}
      onPointerMove={(event) => {
        event.stopPropagation();
        const node = typeof event.instanceId === "number" ? nodes[event.instanceId] : undefined;
        onHover(node);
      }}
      onPointerOut={() => onHover(undefined)}
    >
      <sphereGeometry args={[1, 18, 18]} />
      <meshStandardMaterial vertexColors emissive="#22d3ee" emissiveIntensity={0.62} roughness={0.38} metalness={0.18} transparent opacity={0.88} />
    </instancedMesh>
  );
}

function CurrentLocationBeacon({ level }: { level: SemanticZoomLevel }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = 1 + Math.sin(clock.elapsedTime * 3.2) * 0.12;
    ref.current.scale.setScalar(pulse);
  });
  if (level === "system") {
    return (
      <mesh ref={ref} position={[0, 13, 0]}>
        <octahedronGeometry args={[2.2, 0]} />
        <meshStandardMaterial color="#34d399" emissive="#34d399" emissiveIntensity={1.6} />
      </mesh>
    );
  }
  return (
    <mesh ref={ref} position={[0, 0, 0]}>
      <torusGeometry args={[12, 0.55, 10, 48]} />
      <meshBasicMaterial color="#34d399" transparent opacity={0.76} />
    </mesh>
  );
}

function SelectionHalo({ node }: { node?: VisibleMapNode }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    ref.current.rotation.z = clock.elapsedTime * 0.75;
    ref.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4.2) * 0.055);
  });
  if (!node) return null;
  return (
    <mesh ref={ref} position={[node.coordinates[0], node.coordinates[1], node.coordinates[2]]}>
      <torusGeometry args={[Math.max(5, node.radius * 1.35), 0.16, 10, 72]} />
      <meshBasicMaterial color="#67e8f9" transparent opacity={0.78} blending={THREE.AdditiveBlending} />
    </mesh>
  );
}

function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.035, 8, 128]} />
      <meshBasicMaterial color="#67e8f9" transparent opacity={0.18} />
    </mesh>
  );
}

function SystemScene({ model, systemId, visibility, probedIds, onSelect, onHover }: { model: UniverseMapModel; systemId: string; visibility: TechnologyVisibility; probedIds: string[]; onSelect: (node: VisibleMapNode) => void; onHover: (node?: VisibleMapNode) => void }) {
  const presentation = useMemo(() => resolveStarSystemPresentation(model, systemId, visibility, probedIds), [model, systemId, visibility, probedIds]);
  const groupRef = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (groupRef.current) groupRef.current.rotation.y = clock.elapsedTime * 0.025;
  });
  return (
    <group ref={groupRef}>
      {presentation.beltRanges.map((belt) => <OrbitRing key={belt.id} radius={(belt.innerRadius + belt.outerRadius) / 2} />)}
      {presentation.stars.map((star) => (
        <mesh key={star.id} position={[0, 0, 0]} onPointerOver={() => onHover(star)} onPointerOut={() => onHover(undefined)} onClick={(event) => { event.stopPropagation(); onSelect(star); }}>
          <sphereGeometry args={[8.5, 48, 48]} />
          <meshStandardMaterial color="#fef3c7" emissive="#fbbf24" emissiveIntensity={1.6} />
          <pointLight intensity={2.4} distance={220} color="#fde68a" />
        </mesh>
      ))}
      {presentation.stars.map((star) => (
        <mesh key={`${star.id}-corona`} position={[0, 0, 0]}>
          <sphereGeometry args={[14, 36, 36]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ))}
      {presentation.bodies.map((body) => {
        const x = Math.cos(body.orbitalAngle) * body.orbitalRadius;
        const z = Math.sin(body.orbitalAngle) * body.orbitalRadius;
        const y = Math.sin(body.inclination) * 6;
        const color = body.knowledgeState === "charted" ? (body.type === "moon" ? "#cbd5e1" : "#60a5fa") : "#1e293b";
        return (
          <group key={body.id}>
            <OrbitRing radius={body.orbitalRadius} />
            <mesh position={[x, y, z]} onPointerOver={() => onHover(body)} onPointerOut={() => onHover(undefined)} onClick={(event) => { event.stopPropagation(); onSelect(body); }}>
              <sphereGeometry args={[body.renderScale, 32, 32]} />
              <meshStandardMaterial color={color} emissive={body.canProbe ? "#0891b2" : "#0f172a"} emissiveIntensity={body.canProbe ? 0.55 : 0.18} roughness={0.5} metalness={0.08} />
            </mesh>
            <mesh position={[x, y, z]}>
              <sphereGeometry args={[body.renderScale * 1.18, 32, 32]} />
              <meshBasicMaterial color={body.knowledgeState === "charted" ? "#7dd3fc" : "#64748b"} transparent opacity={body.knowledgeState === "charted" ? 0.11 : 0.045} blending={THREE.AdditiveBlending} depthWrite={false} />
            </mesh>
          </group>
        );
      })}
    </group>
  );
}

function UniverseScene({ model, level, nodes, systemId, visibility, focusedNode, selectedNode, probedIds, onSelect, onEnter, onHover }: { model: UniverseMapModel; level: SemanticZoomLevel; nodes: VisibleMapNode[]; systemId: string; visibility: TechnologyVisibility; focusedNode?: VisibleMapNode; selectedNode?: VisibleMapNode; probedIds: string[]; onSelect: (node: VisibleMapNode) => void; onEnter: (node: VisibleMapNode) => void; onHover: (node?: VisibleMapNode) => void }) {
  const starField = useMemo(() => Array.from({ length: 160 }, (_, index) => {
    const angle = index * 2.399963;
    const radius = 280 + (index % 31) * 9;
    return [Math.cos(angle) * radius, ((index % 23) - 11) * 14, Math.sin(angle) * radius] as const;
  }), []);
  return (
    <>
      <color attach="background" args={["#071629"]} />
      <fog attach="fog" args={["#0b1d35", 95, 820]} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#93c5fd", "#020617", 0.55]} />
      <pointLight position={[20, 80, 120]} intensity={1.35} color="#67e8f9" />
      <CameraRig level={level} focusTarget={focusedNode?.coordinates} />
      <PersistentGalaxyBackdrop level={level} />
      <CurrentLocationBeacon level={level} />
      <SelectionHalo node={selectedNode} />
      {starField.map((position, index) => (
        <mesh key={index} position={position}>
          <sphereGeometry args={[0.75 + (index % 3) * 0.25, 8, 8]} />
          <meshBasicMaterial color={index % 5 === 0 ? "#67e8f9" : "#e0f2fe"} transparent opacity={0.5} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
      {level === "system" ? (
        <SystemScene model={model} systemId={systemId} visibility={visibility} probedIds={probedIds} onSelect={onSelect} onHover={onHover} />
      ) : (
        <InstancedNodeField nodes={nodes} onSelect={onSelect} onEnter={onEnter} onHover={onHover} />
      )}
    </>
  );
}

function FallbackMap({ nodes, selectedId, onSelect, onEnter, onHover }: { nodes: VisibleMapNode[]; selectedId?: string; onSelect: (node: VisibleMapNode) => void; onEnter: (node: VisibleMapNode) => void; onHover: (node?: VisibleMapNode) => void }) {
  return (
    <div className="grid h-full content-center gap-3 overflow-auto p-6" data-testid="galaxy-map-fallback">
      {nodes.map((node) => (
        <button
          key={node.id}
          type="button"
          className={`flex items-center justify-between rounded-sm border px-4 py-3 text-left transition ${selectedId === node.id ? "border-cyan-100 bg-cyan-300/16" : "border-cyan-200/18 bg-black/34 hover:border-cyan-100/40"}`}
          onClick={() => onSelect(node)}
          onDoubleClick={() => onEnter(node)}
          onMouseEnter={() => onHover(node)}
          onMouseLeave={() => onHover(undefined)}
          onFocus={() => onHover(node)}
          onBlur={() => onHover(undefined)}
        >
          <span>
            <span className="block text-sm font-black uppercase text-white">{node.label}</span>
            <span className={`mt-1 block text-[0.68rem] font-black uppercase ${distanceClass(node.rangeState)}`}>{node.rangeState.replaceAll("_", " ")}</span>
          </span>
          <span className="text-xs font-black uppercase text-cyan-100/54">{node.type}</span>
        </button>
      ))}
    </div>
  );
}

export function GalaxySemanticMap({ data, playerRuntime, entry = "galaxy" }: GalaxySemanticMapProps) {
  const model = useMemo(() => createPersistentUniverseModel(data), [data]);
  const visibility = useMemo(() => resolveTechnologyVisibility(data, playerRuntime), [data, playerRuntime]);
  const [state, setState] = usePersistentGalaxyState(model, visibility, entry);
  const [hoveredId, setHoveredId] = useState<string | undefined>();
  const [webgl] = useState(() => canUseWebGL());
  const nodes = useMemo(() => composeVisibleNodes(model, state.level, { sectorId: state.sectorId, systemId: state.systemId, visibility, probedIds: state.probedIds }), [model, state.level, state.sectorId, state.systemId, state.probedIds, visibility]);
  const streaming = useMemo(() => createStreamingSnapshot(model, state.level, { sectorId: state.sectorId, systemId: state.systemId, visibility, probedIds: state.probedIds }), [model, state.level, state.sectorId, state.systemId, state.probedIds, visibility]);
  const knownSearchIndex = useMemo(() => createKnownSearchIndex(nodes), [nodes]);
  const selected = nodes.find((node) => node.id === state.selectedId) ?? nodes[0];
  const focusedNode = nodes.find((node) => node.id === state.focusedId);
  const hoveredNode = nodes.find((node) => node.id === hoveredId);
  const currentNode = nodes.find((node) => node.id === model.currentSystemId) ?? nodes[0];
  const routePreview = selected && currentNode ? createRoutePreview(currentNode, selected) : undefined;
  const currentSector = model.sectors.find((sector) => sector.id === state.sectorId);
  const currentSystem = (model.systemsBySectorId[state.sectorId] ?? []).find((system) => system.id === state.systemId);
  const selectedLabel = selected?.label ?? "No object selected";
  const sectorLabel = currentSector && (currentSector.id === model.currentSectorId || state.probedIds.includes(currentSector.id)) ? currentSector.displayName : "???";
  const systemLabel = currentSystem && (currentSystem.id === model.currentSystemId || state.probedIds.includes(currentSystem.id)) ? currentSystem.displayName : "Local System";
  const transitionLabel = state.transitionState === "stable" ? "Ready" : "Preloading destination";

  function selectNode(node: VisibleMapNode) {
    setState((current) => ({ ...current, selectedId: node.id }));
  }

  function hoverNode(node?: VisibleMapNode) {
    setHoveredId(node?.id);
  }

  function focusSelected() {
    if (!selected) return;
    setState((current) => ({ ...current, focusedId: selected.id, selectedId: selected.id }));
  }

  function probeSelected() {
    if (!selected?.canProbe) return;
    setState((current) => current.probedIds.includes(selected.id)
      ? current
      : { ...current, selectedId: selected.id, focusedId: selected.id, probedIds: [...current.probedIds, selected.id] });
  }

  function travelSelected() {
    if (!selected || !routePreview?.travelAllowed) return;
    enterNode(selected);
  }

  function enterNode(node: VisibleMapNode) {
    if (node.type === "sector") {
      if (!visibility.canAccessSector) {
        setState((current) => ({ ...current, selectedId: node.id }));
        return;
      }
      const firstSystem = model.systemsBySectorId[node.id]?.[0]?.id ?? model.currentSystemId;
      setState((current) => ({ ...current, level: "sector", sectorId: node.id, systemId: firstSystem, selectedId: firstSystem, transitionState: "galaxy_to_sector", cameraDistance: 150 }));
      window.setTimeout(() => setState((current) => ({ ...current, transitionState: "stable" })), 240);
    }
    if (node.type === "system") {
      if (!visibility.canAccessSystem) return;
      setState((current) => ({ ...current, level: "system", systemId: node.id, selectedId: node.id, transitionState: "sector_to_system", cameraDistance: 72 }));
      window.setTimeout(() => setState((current) => ({ ...current, transitionState: "stable" })), 240);
    }
  }

  function backOneLevel() {
    setState((current) => {
      if (current.level === "system") return { ...current, level: "sector", selectedId: current.sectorId, transitionState: "system_to_sector", cameraDistance: 150 };
      if (current.level === "sector" && visibility.canAccessGalaxy) return { ...current, level: "galaxy", selectedId: current.sectorId, transitionState: "sector_to_galaxy", cameraDistance: 420 };
      return current;
    });
    window.setTimeout(() => setState((current) => ({ ...current, transitionState: "stable" })), 240);
  }

  function focusCurrentLocation() {
    setState((current) => ({ ...current, level: visibility.canAccessSector ? "sector" : "system", sectorId: model.currentSectorId, systemId: model.currentSystemId, selectedId: model.currentSystemId, transitionState: "stable" }));
  }

  return (
    <section
      className="relative h-full w-full overflow-hidden bg-[#071629] text-cyan-50"
      data-testid="galaxy-semantic-map"
      data-semantic-level={state.level}
      data-max-semantic-level={visibility.maxLevel}
      data-transition-state={state.transitionState}
      data-selected-object-id={state.selectedId ?? ""}
      data-focused-object-id={state.focusedId ?? ""}
      data-hovered-object-id={hoveredId ?? ""}
      data-technology-gate={visibility.gateId}
      data-preloaded-context={`${state.sectorId}:${state.systemId}`}
      data-loaded-chunks={streaming.loadedChunks.length}
      data-gpu-instances={streaming.gpuInstances}
      data-virtual-sectors={model.virtualCounts.sectors}
      data-virtual-systems={model.virtualCounts.systems}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(20,184,166,0.18),transparent_32rem),radial-gradient(circle_at_72%_18%,rgba(59,130,246,0.16),transparent_26rem)]" />
      <div className="absolute inset-0">
        {webgl ? (
          <Canvas camera={{ position: [0, 160, 460], fov: 55, near: 0.1, far: 2200 }} gl={{ preserveDrawingBuffer: true }} data-testid="galaxy-map-canvas">
            <UniverseScene model={model} level={state.level} nodes={nodes} systemId={state.systemId} visibility={visibility} focusedNode={focusedNode} selectedNode={selected} probedIds={state.probedIds} onSelect={selectNode} onEnter={enterNode} onHover={hoverNode} />
          </Canvas>
        ) : (
          <FallbackMap nodes={nodes} selectedId={state.selectedId} onSelect={selectNode} onEnter={enterNode} onHover={hoverNode} />
        )}
      </div>

      <header className="pointer-events-none absolute left-5 right-5 top-5 z-10 flex items-start justify-between gap-4">
        <div className="pointer-events-auto max-w-[36rem] rounded-sm border border-cyan-100/24 bg-slate-950/72 px-4 py-3 shadow-[0_0_32px_rgba(8,145,178,0.18)] backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.18em] text-cyan-100/62" data-testid="galaxy-map-breadcrumb">
            <button type="button" className="hover:text-white" onClick={() => visibility.canAccessGalaxy && setState((current) => ({ ...current, level: "galaxy" }))}>Milky Way</button>
            <span>/</span>
            <button type="button" className="hover:text-white" onClick={() => setState((current) => ({ ...current, level: visibility.canAccessSector ? "sector" : "system" }))}>{sectorLabel}</button>
            <span>/</span>
            <span>{systemLabel}</span>
          </div>
          <h1 className="mt-2 text-3xl font-black uppercase tracking-normal text-white">Semantic Galaxy Map</h1>
          <div className="mt-2 text-sm font-semibold text-cyan-50/70">{visibility.reason}</div>
        </div>
        <div className="pointer-events-auto flex gap-2">
          <button type="button" className="grid h-11 w-11 place-items-center rounded-sm border border-cyan-100/28 bg-slate-950/72 text-cyan-100 hover:border-white hover:text-white" aria-label="Back one level" onClick={backOneLevel}>
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button type="button" className="grid h-11 w-11 place-items-center rounded-sm border border-cyan-100/28 bg-slate-950/72 text-cyan-100 hover:border-white hover:text-white" aria-label="Focus current location" onClick={focusCurrentLocation}>
            <Crosshair className="h-5 w-5" />
          </button>
        </div>
      </header>

      <aside className="absolute bottom-5 left-5 z-10 w-[23rem] max-w-[calc(100%-2.5rem)] rounded-sm border border-cyan-100/24 bg-slate-950/76 p-4 shadow-[0_0_34px_rgba(8,145,178,0.18)] backdrop-blur-md" data-testid="galaxy-map-detail-panel">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-cyan-100/55">{state.level} level</div>
            <h2 className="mt-1 text-2xl font-black uppercase text-white">{selectedLabel}</h2>
          </div>
          <Radar className="h-7 w-7 text-cyan-100/70" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs font-black uppercase">
          <div className="rounded-sm border border-cyan-200/12 bg-black/32 px-3 py-2">
            <div className="text-cyan-100/48">Knowledge</div>
            <div className="mt-1 text-white">{selected?.knowledgeState ?? "unknown"}</div>
          </div>
          <div className="rounded-sm border border-cyan-200/12 bg-black/32 px-3 py-2">
            <div className="text-cyan-100/48">Range</div>
            <div className={`mt-1 ${selected ? distanceClass(selected.rangeState) : "text-cyan-100/54"}`}>{selected?.rangeState.replaceAll("_", " ") ?? "unknown"}</div>
          </div>
          <div className="rounded-sm border border-cyan-200/12 bg-black/32 px-3 py-2">
            <div className="text-cyan-100/48">Classification</div>
            <div className="mt-1 text-white">{selected?.classification ?? "Hidden"}</div>
          </div>
          <div className="rounded-sm border border-cyan-200/12 bg-black/32 px-3 py-2">
            <div className="text-cyan-100/48">Children</div>
            <div className="mt-1 text-white">{selected?.bodyCount ?? "Hidden"}</div>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button type="button" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-sm border border-cyan-100/26 bg-cyan-300/10 text-xs font-black uppercase text-cyan-50 disabled:opacity-45" onClick={focusSelected} disabled={!selected}>
            <Crosshair className="h-4 w-4" /> Focus
          </button>
          <button type="button" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-sm border border-cyan-100/26 bg-cyan-300/10 text-xs font-black uppercase text-cyan-50 disabled:opacity-45" onClick={probeSelected} disabled={!selected?.canProbe}>
            <ScanSearch className="h-4 w-4" /> Probe
          </button>
          <button type="button" className="flex h-10 flex-1 items-center justify-center gap-2 rounded-sm border border-emerald-100/26 bg-emerald-300/10 text-xs font-black uppercase text-emerald-50 disabled:opacity-45" disabled={!routePreview?.travelAllowed} onClick={travelSelected}>
            <Route className="h-4 w-4" /> Travel
          </button>
        </div>
        <div className="mt-4 rounded-sm border border-cyan-200/12 bg-black/28 px-3 py-2 text-[0.66rem] font-black uppercase text-cyan-50/68">
          <div className="flex justify-between gap-3"><span>Route Preview</span><span>{routePreview ? `${Math.round(routePreview.distance)}u` : "--"}</span></div>
          <div className="mt-1 flex justify-between gap-3"><span>Stops / Fuel</span><span>{routePreview ? `${routePreview.stops} / ${routePreview.fuel}` : "--"}</span></div>
          <div className="mt-1 flex justify-between gap-3"><span>Status</span><span className={routePreview?.travelAllowed ? "text-emerald-100" : "text-amber-100"}>{routePreview?.requiresProbeFirst ? "Probe First" : routePreview?.travelAllowed ? "Travel Ready" : "Plot Only"}</span></div>
        </div>
      </aside>

      {hoveredNode ? (
        <aside className="absolute left-1/2 top-24 z-10 w-[18rem] -translate-x-1/2 rounded-sm border border-cyan-100/30 bg-slate-950/82 px-4 py-3 text-xs font-black uppercase text-cyan-50/72 shadow-[0_0_34px_rgba(34,211,238,0.18)] backdrop-blur-md" data-testid="galaxy-map-hover-panel">
          <div className="text-[0.64rem] tracking-[0.2em] text-cyan-100/52">Hover Target</div>
          <div className="mt-1 text-lg text-white">{hoveredNode.label}</div>
          <div className="mt-2 flex justify-between gap-3"><span>{hoveredNode.type}</span><span>{hoveredNode.knowledgeState}</span></div>
          <div className="mt-1 text-cyan-100/58">{hoveredNode.canShowRegistry ? hoveredNode.classification ?? "Registry Open" : "Registry Hidden"}</div>
        </aside>
      ) : null}

      <aside className="absolute bottom-5 right-5 z-10 w-[20rem] rounded-sm border border-cyan-100/18 bg-slate-950/70 p-4 text-xs font-black uppercase text-cyan-50/74 backdrop-blur-md" data-testid="galaxy-map-dev-hud">
        <div className="flex items-center gap-2 text-cyan-100">
          <Telescope className="h-4 w-4" />
          Galaxy Engine
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex justify-between gap-3"><span>Chunks</span><span className="text-white">{streaming.loadedChunks.length}</span></div>
          <div className="flex justify-between gap-3"><span>LOD</span><span className="text-white">{streaming.lod}</span></div>
          <div className="flex justify-between gap-3"><span>Visible Sectors</span><span className="text-white">{streaming.visibleSectors}</span></div>
          <div className="flex justify-between gap-3"><span>Visible Systems</span><span className="text-white">{streaming.visibleSystems}</span></div>
          <div className="flex justify-between gap-3"><span>GPU Instances</span><span className="text-white">{streaming.gpuInstances}</span></div>
          <div className="flex justify-between gap-3"><span>Searchable</span><span className="text-white">{knownSearchIndex.length}</span></div>
          <div className="flex justify-between gap-3"><span>Virtual Scale</span><span className="text-white">{Math.round(streaming.virtualSystems / 1000)}K systems</span></div>
          <div className="flex justify-between gap-3"><span>Transition</span><span className="text-white">{transitionLabel}</span></div>
          <div className="flex justify-between gap-3"><span>Missing Contracts</span><span className="text-amber-100">{model.audit.missingStudioContracts.length}</span></div>
        </div>
      </aside>
    </section>
  );
}

export default GalaxySemanticMap;
