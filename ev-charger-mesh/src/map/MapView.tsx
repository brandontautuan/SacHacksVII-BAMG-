/**
 * Map container: MapLibre GL + Deck.gl overlay. Uses free OSM-compatible
 * vector tiles (Carto dark). Pan bounds allow scrolling further; optional
 * region bounds define the "accounted" area — outside is blurred. No API keys.
 */

import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import Map, { type MapRef } from 'react-map-gl/maplibre'
import { MapboxOverlay } from '@deck.gl/mapbox'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { buildScatterLayer, buildLineLayer } from './layers'
import { DAVIS_PAN_BOUNDS, INITIAL_VIEW_STATE } from './constants'
import type { Station, EdgeCoords } from '@/data/types'

export type MapViewState = {
  longitude: number
  latitude: number
  zoom: number
  pitch: number
  bearing: number
}

export type MapBounds = [[number, number], [number, number]]

export type RegionBounds = {
  minLng: number
  maxLng: number
  minLat: number
  maxLat: number
}

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
  /** Override initial view and bounds (e.g. for Sacramento). Defaults to Davis. */
  viewState?: MapViewState
  maxBounds?: MapBounds
  /** Bounds of the "accounted" region; area outside is blurred. Omit for no blur. */
  regionBounds?: RegionBounds
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
  viewState = INITIAL_VIEW_STATE,
  maxBounds = [
    [DAVIS_PAN_BOUNDS.minLng, DAVIS_PAN_BOUNDS.minLat],
    [DAVIS_PAN_BOUNDS.maxLng, DAVIS_PAN_BOUNDS.maxLat],
  ],
  regionBounds,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null)
  const mapInstanceRef = useRef<MapLibreMap | null>(null)
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick
  const mapClickHandlerRef = useRef<(() => void) | null>(null)
  const [overlay] = useState(() => new MapboxOverlay({ interleaved: true }))
  const [mapStyle, setMapStyle] = useState(MAP_STYLE_DARK)
  const [regionPx, setRegionPx] = useState<{ left: number; top: number; width: number; height: number } | null>(null)
  const regionBoundsRef = useRef(regionBounds)
  regionBoundsRef.current = regionBounds

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

  const updateRegionPx = useCallback(() => {
    const map = mapInstanceRef.current
    const rb = regionBoundsRef.current
    if (!map || !rb) {
      setRegionPx(null)
      return
    }
    try {
      const sw = map.project([rb.minLng, rb.minLat])
      const ne = map.project([rb.maxLng, rb.maxLat])
      const left = Math.min(sw.x, ne.x)
      const top = Math.min(sw.y, ne.y)
      const width = Math.abs(ne.x - sw.x)
      const height = Math.abs(ne.y - sw.y)
      setRegionPx({ left, top, width, height })
    } catch {
      setRegionPx(null)
    }
  }, [])

  useEffect(() => {
    if (resetTrigger <= 0) return
    const map = mapInstanceRef.current ?? mapRef.current?.getMap?.()
    if (!map) return
    map.flyTo({
      center: [viewState.longitude, viewState.latitude],
      zoom: viewState.zoom,
      pitch: viewState.pitch,
      bearing: viewState.bearing,
    })
  }, [resetTrigger, viewState])

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
      if (regionBoundsRef.current) {
        updateRegionPx()
        ev.target.on('move', updateRegionPx)
        ev.target.on('zoom', updateRegionPx)
      }
    },
    [overlay, updateRegionPx]
  )

  useEffect(() => {
    return () => {
      const map = mapInstanceRef.current
      const handler = mapClickHandlerRef.current
      if (map && handler) {
        try {
          map.off('click', handler)
          map.off('move', updateRegionPx)
          map.off('zoom', updateRegionPx)
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
  }, [overlay, updateRegionPx])

  const onError = useCallback(() => {
    setMapStyle(MAP_STYLE_FALLBACK)
  }, [])

  const blurStyle = {
    position: 'absolute' as const,
    pointerEvents: 'none' as const,
    backdropFilter: 'blur(8px)',
    WebkitBackdropFilter: 'blur(8px)',
    background: 'rgba(10, 10, 12, 0.4)',
  }

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
        initialViewState={viewState}
        onLoad={onLoad}
        onError={onError}
        mapStyle={mapStyle}
        style={{ width: '100%', height: '100%' }}
        maxBounds={maxBounds}
        dragPan={true}
        dragRotate={false}
        scrollZoom={true}
        cursor="default"
      />
      {regionBounds && regionPx && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        >
          {/* Top */}
          <div
            style={{
              ...blurStyle,
              left: 0,
              top: 0,
              right: 0,
              height: Math.max(0, regionPx.top),
            }}
          />
          {/* Bottom */}
          <div
            style={{
              ...blurStyle,
              left: 0,
              top: regionPx.top + regionPx.height,
              right: 0,
              bottom: 0,
            }}
          />
          {/* Left */}
          <div
            style={{
              ...blurStyle,
              left: 0,
              top: regionPx.top,
              width: Math.max(0, regionPx.left),
              height: regionPx.height,
            }}
          />
          {/* Right */}
          <div
            style={{
              ...blurStyle,
              left: regionPx.left + regionPx.width,
              top: regionPx.top,
              right: 0,
              height: regionPx.height,
            }}
          />
        </div>
      )}
    </div>
  )
}
