import { renderToWorld, worldToRender, type WorldOrigin, type WorldPosition } from './world-origin'

/** Pedestrian positions and route waypoints have one explicit world/render boundary. */
export type PedestrianSpatialState = { position: WorldPosition; route: WorldPosition[] }

export function pedestrianStateToWorld(state: PedestrianSpatialState, origin: WorldOrigin): PedestrianSpatialState {
  return { position: renderToWorld(state.position, origin), route: state.route.map(point => renderToWorld(point, origin)) }
}

export function pedestrianStateToRender(state: PedestrianSpatialState, origin: WorldOrigin): PedestrianSpatialState {
  return { position: worldToRender(state.position, origin), route: state.route.map(point => worldToRender(point, origin)) }
}
