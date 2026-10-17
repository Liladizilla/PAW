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

The initial camera opens above a dense urban core with no visible ground-plane edge. The scene keeps a broad arterial grid and deterministic central lots. `src/world/streamed-city.ts` generates real Babylon roads, sidewalks and seeded building meshes in camera-targeted chunks beyond the central district, retains a 5×5 candidate ring and disposes chunks outside it. Chunk planning consumes world-space focus and each chunk is parented beneath an origin root, so render-space projection can move without changing deterministic chunk IDs. Pure layouts in `src/world/city-chunk-layout.ts` are tested for determinism and shared road-grid coordinates. This is an initial streaming implementation, now integrated with the live scene's shared world-origin root; a full LOD pipeline remains open. `src/world/world-origin.ts` defines tested world/render coordinate conversions and chunk-snapped origin selection. `src/world/world-origin-coordinator.ts` adds a synchronous prepare/commit/rollback contract so participating subsystems can stage an origin change and roll back on failure. `src/world/position-rebase-participant.ts` provides a tested adapter for ordinary mutable render-space positions, and `src/world/camera-target-rebase-participant.ts` stages the camera target as a separate owner; both support exact rollback. `src/world/chunk-focus.ts` formalizes the rule that chunk selection consumes authoritative world-space focus, not renderer-relative coordinates, with tests showing chunk IDs remain invariant across a rebase. The live streamer receives the current origin and is wired to the same world-root projection used by the scene. `src/world/thin-instance-rebase-participant.ts` stages Babylon-style 16-float matrix buffers and shifts only translation entries, preserving rotation and scale with exact rollback; a callback can notify Babylon to refresh the thin-instance buffers after commit or rollback. `src/world/traffic-rebase-participant.ts` stages each vehicle's scalar lane coordinate together with its body and cabin mesh positions. `src/world/pedestrian-coordinates.ts` defines world/render conversion for pedestrian positions and route waypoints. The ordinary-position, thin-instance and traffic-specific adapters remain useful for systems that do not share a parent root, but the live scene currently rebases visuals through the common world root instead. Pedestrian and traffic simulation state stays in world space, so it is not shifted on rebase. The root and camera target are registered with the live coordinator, and streamed chunks derive IDs from world-space focus while inheriting the root transform. Automated tests now cover repeated positive/negative multi-chunk travel, nonzero-origin snapshot serialization, imported-entity projection, pedestrian world/render conversions, and exact coordinator rollback after an injected commit failure. A desktop-driven save/reload round trip with the real asset catalog and imported files remains a release gate. Crowd rendering now starts at a hardware-aware population tier and adjusts the active thin-instance population against measured FPS; this is an adaptive population control, not a measured reference-machine performance guarantee.

## Asset import and scene restoration

GLTF/GLB files use the Babylon loader driver in `src/world/babylon-asset-loader.ts`. The renderer asks the narrow preload bridge to resolve a workspace-relative `assets/...` URI; the Electron main process validates it and serves files only from the app-owned `userData/paw/assets` directory through the privileged `paw-workspace://assets/` scheme. Remote URLs, traversal paths and oversized files are rejected. GLTF external buffers and textures are served through the same constrained scheme.

Scene snapshot persistence is isolated behind `src/world/scene-snapshot-store.ts`, which canonicalizes migrated snapshots and has restart/migration tests. Asset restoration uses a separately tested plan that distinguishes missing catalog references from app-owned agent IDs, then applies world-space transforms and visibility through one tested helper. These contracts reduce renderer-side duplication but do not replace an end-to-end Electron restart test. Asset availability checks now distinguish deleted files from unreadable files without aborting the full scan. The streaming stress test exercises 120 long-distance direction changes and asserts bounded chunk/mesh/material counts plus zero resources after disposal. `src/world/performance-budget.ts` defines an executable budget contract (30 FPS minimum, 33.4 ms p95 maximum, 2,500 meshes, 900 materials, 25 loaded chunks and 1,008 active pedestrians). These are initial engineering guardrails, not verified device-wide guarantees; reference integrated-graphics profiling remains outstanding.

The desktop scene toolbar can import a self-contained GLB through Electron's native file picker. Files are copied into the app-owned asset directory, registered through the validated local catalog key `paw.asset.catalog.v1`, loaded into the live scene and persisted in scene snapshot v3. Catalog updates are revisioned and reject remote/traversal paths. Scene snapshot v3 rehydrates asset-backed records on startup beneath the shared world root, preserving their authoritative world-space transforms during origin rebasing; missing assets are skipped with a warning rather than fabricating geometry. Snapshot v3 records an explicit `worldOrigin` and defines saved entity transforms as authoritative world-space coordinates; v1/v2 snapshots migrate with a zero origin. The native picker currently accepts GLB only; GLTF sidecar-folder import, asset-browser management, general-purpose editing, undo/redo, import progress/cancellation and full scene serialization remain open. Undo/redo, editable component authoring, import progress/cancellation and full scene serialization remain open.

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

## Implemented engine primitives

- `src/world/world-chunks.ts` defines deterministic chunk coordinates and a nearest-first camera streaming ring. `src/world/streamed-city.ts` consumes that plan to create and dispose real Babylon meshes for seeded outer-district roads, sidewalks and buildings.
- `src/world/spatial-index.ts` provides a reusable uniform-grid broadphase query for nearby entities and collision candidates.
- `src/world/asset-catalog.ts` validates versioned asset metadata, workspace-relative paths, import settings and optional bounds. `src/world/asset-importer.ts` adds a validated GLTF/GLB import boundary with an injected format driver and idempotent disposal; a concrete Babylon GLTF loader plugin and Electron workspace-URL resolver are still required for end-to-end imports.
- `src/world/simulation-clock.ts` provides bounded fixed-step timing and reports dropped time during stalls.

The engine host owns Babylon renderer/scene/camera lifecycle outside React's setup block. The crowd's local-neighbor broadphase uses the tested uniform-grid spatial index, and live crowd/traffic updates now advance through the shared bounded `FixedStepClock`. Scene snapshots use schema v3, preserve named marker transforms and migrate v1 camera-only plus v2 saves while retaining world-space entity transforms. The GLTF plugin and privileged workspace resolver are integrated, and asset-backed scene records rehydrate under the world root. Arbitrary entity editing, durable SQLite world storage and end-to-end desktop save/reload verification remain outstanding.

## Incremental implementation gates

1. Deterministic procedural city + route planner and tests.
2. World streaming/chunk lifecycle and spatial indexing.
3. Fixed-step simulation clock and navigation/collision tests.
4. Asset catalog/import pipeline and scene serialization.
5. Editor tools: select, transform, inspect, duplicate, undo/redo, save/load.
6. Runtime bridge that maps durable agent events to scene projections.
7. Device-tier profiling, adaptive quality, packaging and recovery tests.

A feature is not considered complete merely because it renders. It needs a data contract, failure behavior, tests, a resource budget and a user-visible inspection path.


## Renderer telemetry and performance evidence

The viewport now samples actual Babylon renderer frame deltas into a bounded 120-sample window and displays average FPS, p95 frame time, scene mesh/material counts, loaded streamed chunks, and the active crowd tier. These are live diagnostics, not a benchmark claim. The frame-time percentile is calculated from observed samples; it is not a GPU timestamp or a substitute for a repeatable profiling session.

The city streamer exposes resource counts for its currently loaded chunks and its tests assert that disposal returns the streamed scene to zero meshes and materials. Before release, collect repeatable measurements on supported reference hardware (including integrated graphics) and define acceptable cold-start, steady-state frame-time, memory, import, and long-session leak budgets.

Large-world origin rebasing is now wired into the live Babylon scene through a shared movable world root and a camera-target participant. Static geometry, crowd templates, traffic meshes, imported assets and streamed chunk roots inherit the root's render offset; simulation and entity data remain in world space. Scene snapshots store world-space camera/entity coordinates plus the origin metadata. Coordinator and root/camera tests pass in CI, but multi-boundary travel and save/reload round-trip tests are still required before calling the world effectively unbounded.
