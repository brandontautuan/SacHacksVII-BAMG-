/**
 * Davis, CA map center and approximate city-limit bounds for clamping.
 * Bounds are loose to allow viewing the full charger mesh.
 */

export const DAVIS_CENTER: [number, number] = [-121.7405, 38.5449]

export const DAVIS_BOUNDS = {
  minLng: -121.78,
  maxLng: -121.72,
  minLat: 38.53,
  maxLat: 38.56,
} as const

export const INITIAL_VIEW_STATE = {
  longitude: DAVIS_CENTER[0],
  latitude: DAVIS_CENTER[1],
  zoom: 12.5,
  pitch: 45,
  bearing: 0,
} as const
