/**
 * City map center and bounds. Pan bounds allow scrolling further out; region bounds
 * define the "accounted" area (outside is blurred). Default/legacy: DAVIS_*.
 */

export const DAVIS_CENTER: [number, number] = [-121.7405, 38.5449]

/** Bounds used for maxBounds (pan limit) — wider so users can scroll past edge chargers. */
export const DAVIS_PAN_BOUNDS = {
  minLng: -121.82,
  maxLng: -121.68,
  minLat: 38.48,
  maxLat: 38.61,
} as const

/** Region we "account for"; map area outside this is blurred. */
export const DAVIS_REGION_BOUNDS = {
  minLng: -121.78,
  maxLng: -121.72,
  minLat: 38.53,
  maxLat: 38.56,
} as const

/** @deprecated Use DAVIS_PAN_BOUNDS for pan, DAVIS_REGION_BOUNDS for overlay. */
export const DAVIS_BOUNDS = DAVIS_REGION_BOUNDS

export const SACRAMENTO_CENTER: [number, number] = [-121.4944, 38.5816]

export const SACRAMENTO_PAN_BOUNDS = {
  minLng: -121.62,
  maxLng: -121.36,
  minLat: 38.46,
  maxLat: 38.70,
} as const

export const SACRAMENTO_REGION_BOUNDS = {
  minLng: -121.56,
  maxLng: -121.42,
  minLat: 38.52,
  maxLat: 38.64,
} as const

export const SACRAMENTO_BOUNDS = SACRAMENTO_REGION_BOUNDS

export const INITIAL_VIEW_STATE = {
  longitude: DAVIS_CENTER[0],
  latitude: DAVIS_CENTER[1],
  zoom: 14,
  pitch: 0,
  bearing: 0,
} as const

export const SACRAMENTO_VIEW_STATE = {
  longitude: SACRAMENTO_CENTER[0],
  latitude: SACRAMENTO_CENTER[1],
  zoom: 14,
  pitch: 0,
  bearing: 0,
} as const

export const FOLSOM_CENTER: [number, number] = [-121.1762, 38.678]

export const FOLSOM_PAN_BOUNDS = {
  minLng: -121.28,
  maxLng: -121.06,
  minLat: 38.58,
  maxLat: 38.78,
} as const

export const FOLSOM_REGION_BOUNDS = {
  minLng: -121.24,
  maxLng: -121.11,
  minLat: 38.62,
  maxLat: 38.73,
} as const

export const FOLSOM_BOUNDS = FOLSOM_REGION_BOUNDS

export const FOLSOM_VIEW_STATE = {
  longitude: FOLSOM_CENTER[0],
  latitude: FOLSOM_CENTER[1],
  zoom: 14,
  pitch: 0,
  bearing: 0,
} as const
