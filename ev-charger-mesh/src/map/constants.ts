/**
 * City map center and bounds for clamping. Bounds are loose to allow viewing the full charger mesh.
 */

export const DAVIS_CENTER: [number, number] = [-121.7405, 38.5449]

export const DAVIS_BOUNDS = {
  minLng: -121.78,
  maxLng: -121.72,
  minLat: 38.53,
  maxLat: 38.56,
} as const

export const SACRAMENTO_CENTER: [number, number] = [-121.4944, 38.5816]

export const SACRAMENTO_BOUNDS = {
  minLng: -121.56,
  maxLng: -121.42,
  minLat: 38.52,
  maxLat: 38.64,
} as const

export const INITIAL_VIEW_STATE = {
  longitude: DAVIS_CENTER[0],
  latitude: DAVIS_CENTER[1],
  zoom: 12.5,
  pitch: 0,
  bearing: 0,
} as const

export const SACRAMENTO_VIEW_STATE = {
  longitude: SACRAMENTO_CENTER[0],
  latitude: SACRAMENTO_CENTER[1],
  zoom: 12.5,
  pitch: 0,
  bearing: 0,
} as const

export const FOLSOM_CENTER: [number, number] = [-121.1762, 38.678]

export const FOLSOM_BOUNDS = {
  minLng: -121.24,
  maxLng: -121.11,
  minLat: 38.62,
  maxLat: 38.73,
} as const

export const FOLSOM_VIEW_STATE = {
  longitude: FOLSOM_CENTER[0],
  latitude: FOLSOM_CENTER[1],
  zoom: 12.5,
  pitch: 0,
  bearing: 0,
} as const
