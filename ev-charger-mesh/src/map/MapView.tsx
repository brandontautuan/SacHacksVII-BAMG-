/**
 * Map container: MapLibre GL + Deck.gl overlay. Uses free OSM-compatible
 * vector tiles (Carto dark). View state is controlled for Davis bounds and
 * "reset view". Tooltip state comes from hovered object. No API keys.
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import Map, { type MapRef } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { buildScatterLayer, buildLineLayer } from './layers'
import { DAVIS_BOUNDS, INITIAL_VIEW_STATE } from './constants'
import type { ChargerNode, EdgeCoords } from '@/data/types'

/** Free OSM vector styles (no API key). Primary: Carto dark. Fallback: MapLibre demo. */
const MAP_STYLE_DARK =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const MAP_STYLE_FALLBACK = 'https://demotiles.maplibre.org/style.json'

export interface MapViewProps {
  chargers: ChargerNode[]
  edges: EdgeCoords[]
  meshVisible: boolean
  filterType: string | null
  /** When this value changes, the map flies to initial view (for Reset view button). */
  resetTrigger?: number
  onHover: (charger: ChargerNode | null, coords: { x: number; y: number }) => void
}

export function MapView({
  chargers,
  edges,
  meshVisible,
  filterType,
  resetTrigger = 0,
  onHover,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null)
  const mapInstanceRef = useRef<MapLibreMap | null>(null)
  const [overlay] = useState(() => new MapboxOverlay({ interleaved: true }))
  const [mapStyle, setMapStyle] = useState(MAP_STYLE_DARK)

  const layers = useMemo(() => {
    const scatter = buildScatterLayer(chargers, filterType)
    const line = buildLineLayer(edges, meshVisible)
    return [scatter, line].filter(Boolean)
  }, [chargers, edges, meshVisible, filterType])

  const handleHover = useCallback(
    (info: { object?: ChargerNode; x?: number; y?: number }) => {
      onHover(info.object ?? null, { x: info.x ?? 0, y: info.y ?? 0 })
    },
    [onHover]
  )

  useEffect(() => {
    overlay.setProps({ layers, onHover: handleHover })
  }, [overlay, layers, handleHover])

  useEffect(() => {
    if (resetTrigger <= 0) return
    const map = mapInstanceRef.current ?? mapRef.current?.getMap?.()
    if (!map) return
    map.flyTo({
      center: [INITIAL_VIEW_STATE.longitude, INITIAL_VIEW_STATE.latitude],
      zoom: INITIAL_VIEW_STATE.zoom,
      pitch: INITIAL_VIEW_STATE.pitch,
      bearing: INITIAL_VIEW_STATE.bearing,
    })
  }, [resetTrigger])

  const onLoad = useCallback(
    (ev: { target: MapLibreMap }) => {
      mapInstanceRef.current = ev.target
      try {
        ev.target.addControl(overlay)
      } catch (err) {
        console.error('Deck overlay failed to attach:', err)
      }
    },
    [overlay]
  )

  useEffect(() => {
    return () => {
      try {
        mapInstanceRef.current?.removeControl(overlay)
      } catch {
        // already removed
      }
    }
  }, [overlay])

  const onError = useCallback(() => {
    setMapStyle(MAP_STYLE_FALLBACK)
  }, [])

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        minHeight: '100vh',
      }}
    >
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        onLoad={onLoad}
        onError={onError}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%', minHeight: '100vh' }}
        maxBounds={[
          [DAVIS_BOUNDS.minLng, DAVIS_BOUNDS.minLat],
          [DAVIS_BOUNDS.maxLng, DAVIS_BOUNDS.maxLat],
        ]}
      />
    </div>
  )
}
