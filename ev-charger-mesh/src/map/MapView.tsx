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
import type { Station, EdgeCoords } from '@/data/types'

/** Free OSM vector styles (no API key). Primary: Carto dark. Fallback: MapLibre demo. */
const MAP_STYLE_DARK =
  'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'
const MAP_STYLE_FALLBACK = 'https://demotiles.maplibre.org/style.json'

export interface MapViewProps {
  stations: Station[]
  edges: EdgeCoords[]
  meshVisible: boolean
  filterType: string | null
  resetTrigger?: number
  /** When set, only this station is shown on the map; all others hidden. */
  selectedStationId?: string | null
  onHover: (station: Station | null, coords: { x: number; y: number }) => void
  /** Called when the user clicks on the map (e.g. to close a pop-out). */
  onMapClick?: () => void
}

export function MapView({
  stations,
  edges,
  meshVisible,
  filterType,
  resetTrigger = 0,
  selectedStationId = null,
  onHover,
  onMapClick,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null)
  const mapInstanceRef = useRef<MapLibreMap | null>(null)
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const mapClickHandlerRef = useRef<(() => void) | null>(null)
  const [overlay] = useState(() => new MapboxOverlay({ interleaved: true }))
  const [mapStyle, setMapStyle] = useState(MAP_STYLE_DARK)

  const layers = useMemo(() => {
    const scatter = buildScatterLayer(stations, filterType, selectedStationId)
    const line = buildLineLayer(edges, meshVisible)
    return [scatter, line].filter(Boolean)
  }, [stations, edges, meshVisible, filterType, selectedStationId])

  const handleHover = useCallback(
    (info: { object?: Station; x?: number; y?: number }) => {
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
      const handleMapClick = () => onMapClickRef.current?.()
      mapClickHandlerRef.current = handleMapClick
      ev.target.on('click', handleMapClick)
    },
    [overlay]
  )

  useEffect(() => {
    return () => {
      const map = mapInstanceRef.current
      const handler = mapClickHandlerRef.current
      if (map && handler) {
        try {
          map.off('click', handler)
        } catch {
          // ignore
        }
      }
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
      className="map-view-no-grab"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    >
      <Map
        ref={mapRef}
        initialViewState={INITIAL_VIEW_STATE}
        onLoad={onLoad}
        onError={onError}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        maxBounds={[
          [DAVIS_BOUNDS.minLng, DAVIS_BOUNDS.minLat],
          [DAVIS_BOUNDS.maxLng, DAVIS_BOUNDS.maxLat],
        ]}
        dragPan={false}
        dragRotate={false}
        scrollZoom={true}
        cursor="default"
      />
    </div>
  )
}
