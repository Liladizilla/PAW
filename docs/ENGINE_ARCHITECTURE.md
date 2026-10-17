# Engine Architecture Blueprint

P.A.W. is an application built on Babylon.js today, with an engine-style world/runtime architecture as the long-term target. It is **not** a replacement for Blender, Unreal Engine, or a general-purpose game engine yet. This blueprint borrows proven architectural boundaries rather than copying their implementation or claiming parity.

## Patterns studied

- **Blender:** treat scene data as managed, addressable data-blocks with explicit ownership and stable references. Editing tools and UI operate on shared data rather than each keeping unrelated copies. See the [Blender Python API overview](https://docs.blender.org/api/5.1/info_overview.html) and [data-block quickstart](https://docs.blender.org/api/main/info_quickstart.html).
- **Unreal Engine:** separate world objects from components, controllers from physical pawns, persistent application/session services from per-world state, and rendering from gameplay systems. See [Gameplay Framework](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-framework-in-unreal-engine) and [Gameplay Systems](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-systems-in-unreal-engine).
- **Babylon.js:** use thin instances for high-count repeated geometry and profile their trade-offs instead of allocating a scene object for every repeated prop. See [Babylon.js instances](https://doc.babylonjs.com/features/featuresDeepDive/mesh/copies/instances).

## Required engine layers

| Layer | Owns | Must not own |
|---|---|---|
| App shell | windows, workspace navigation, user preferences | world simulation truth |
| Engine host | lifecycle, frame loop, scene loading/unloading, device capability profile | agent execution |
| World model | stable entity IDs, transforms, component data, asset references | UI selection state |
| World streaming | district manifests, spatial chunks, visibility, LOD and disposal | durable workflow state |
| Simulation | fixed-step clock, traffic, crowd, navigation, collision queries | provider credentials or workflow authority |
| Renderer | Babylon scene projection, materials, batching, camera and picking | durable runtime state |
| Agent runtime | runs, graph scheduling, tools, permissions, approvals, provider adapters | scene object transforms |
| Persistence | versioned schemas, SQLite metadata/event journal, filesystem artifacts | rendering lifecycle |
| Extension boundary | validated APIs, capabilities, resource limits and audit events | implicit access to process/filesystem/network |

## Non-negotiable contracts

1. **Runtime is authoritative.** The 3D scene projects durable runtime snapshots/events. Animation cannot manufacture an agent run or report success.
2. **Simulation is isolated.** Ambient citizens may follow a deterministic city schedule; named AI agents move only when actual runtime events assign them a destination/state.
3. **Navigation owns destinations.** Pedestrians receive explicit waypoint paths to public destinations or transit exits. If a route is blocked, they stop/replan or report no path; they never keep walking into a wall.
4. **Fixed-step simulation.** Simulation uses a bounded fixed timestep with accumulated elapsed time. Rendering may vary in frame rate without changing traffic/path decisions.
5. **Data-driven world.** Districts, roads, lots, buildings, stations and destination nodes are generated from versioned manifests and deterministic seeds.
6. **Spatial scale.** The ground plane and road grid extend beyond the initial view. Roads continue in a deterministic grid beyond the visible camera. World chunks are streamed by camera region; the horizon must not reveal the edge of a finite demo tile.
7. **Resource budgets.** Mesh counts, active agents, physics frequency, shadows and LOD are bounded by a device capability profile.
8. **Failure containment.** Rendering/physics failure must not corrupt workflow execution, approvals or persistence.

## World and entity model

The first contract implementation lives in `src/world/world-model.ts`: schema-versioned entities/components, snapshot validation, stable entity IDs, a monotonically sequenced in-memory scene event stream and snapshot isolation. Its event stream is intentionally **not** the durable agent-runtime journal; persistence/migrations and renderer subscription are separate follow-up work.

- **World:** owns a scene identity, origin, chunk index and systems registry.
- **Entity:** stable ID and a bag of typed components.
- **Components:** transform, renderable, collider, navigation agent, destination, traffic participant, runtime-agent binding and metadata.
- **District manifest:** seed, grid spacing, bounds, lot rules, road profiles, landmark definitions and streaming policy.
- **Navigation graph:** sidewalk nodes, crosswalk edges, entrance/destination nodes and accessibility constraints.
- **Spatial index:** indexes static obstacles and dynamic neighbors for bounded collision queries.
- **Asset catalog:** stable logical IDs mapped to local asset paths and import metadata.
- **World event:** versioned scene-domain event, separate from the durable agent-runtime event journal.

## Large-world strategy

The initial camera should open above a dense urban core with no visible ground-plane edge. Roads continue in a deterministic grid beyond the visible camera. The first implementation uses a large ground extent and deterministic procedural lots. The next streaming stage must divide the world into spatial chunks (for example 128 m cells), generate nearby chunks, retain a small prefetch ring, and dispose far chunks. Coordinates should eventually use a world-origin/sector model so camera-relative precision is maintained at large distances.

## Movement and collision

Civilian movement is a simulation concern, not a rendering side effect. Routes are waypoint lists from walkable sidewalk/crosswalk nodes to named destinations. Static building footprints are obstacles; moving pedestrians use local neighbor avoidance. Cars use lane segments, following distance, stop lines and signal reservations. The first navigation utility uses bounded grid A* against building footprints and has unit tests for obstacle avoidance and unreachable endpoints. It is not yet a production navmesh or rigid-body physics system.

## Runtime and backend infrastructure

- Keep the current Electron main-process boundary and narrow typed preload bridge.
- Move toward a dedicated local runtime process with versioned request/event contracts so renderer restarts do not interrupt execution.
- SQLite becomes authoritative for workspace, graph, run, approval, tool, provider metadata and event indexes; artifacts stay in a workspace-owned filesystem store.
- Use append-only, correlated events and snapshots for recovery. A renderer may rebuild its view from snapshots/events without controlling the source of truth.
- Provider keys stay in OS-backed secure storage and never enter scene data, renderer logs or serialized world manifests.
- Tool/plugin execution remains behind capability manifests, policy checks, approval gates, timeouts, resource limits and audit records.
- Remote workers, if added, use authenticated scoped APIs and never share the local SQLite file directly.

## Incremental implementation gates

1. Deterministic procedural city + route planner and tests.
2. World streaming/chunk lifecycle and spatial indexing.
3. Fixed-step simulation clock and navigation/collision tests.
4. Asset catalog/import pipeline and scene serialization.
5. Editor tools: select, transform, inspect, duplicate, undo/redo, save/load.
6. Runtime bridge that maps durable agent events to scene projections.
7. Device-tier profiling, adaptive quality, packaging and recovery tests.

A feature is not considered complete merely because it renders. It needs a data contract, failure behavior, tests, a resource budget and a user-visible inspection path.
