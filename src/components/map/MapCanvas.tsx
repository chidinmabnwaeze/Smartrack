import type { Feature, LineString } from 'geojson'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useEffect, useRef, useState } from 'react'
import type { Position } from '../../types'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const ROUTE_COLOR = '#3b20d8'

export interface MapCanvasProps {
  origin: Position
  destination: Position
  /** The planned route. */
  route?: Position[]
  /** Where the rider has actually driven. */
  path?: Position[]
  /** The rider's current position. */
  position?: Position
  offRoute?: boolean
  /** Width in px covered by an overlay on the left, kept clear when framing the route. */
  leftInset?: number
  className?: string
}

const line = (coordinates: Position[]): Feature<LineString> => ({
  type: 'Feature',
  properties: {},
  geometry: { type: 'LineString', coordinates },
})

function vehicleElement() {
  const element = document.createElement('div')
  element.className = 'flex items-center gap-2'
  element.innerHTML =
    '<span data-dot class="block size-5 rounded-full border-[3px] border-white shadow-md"></span>' +
    '<span data-label class="rounded-full bg-white px-2.5 py-1 text-sm font-semibold text-danger shadow-md">Off route</span>'
  return element
}

function originElement() {
  const element = document.createElement('div')
  element.className = 'size-3.5 rounded-full border-[3px] border-navy bg-white shadow'
  return element
}

/** Live Mapbox map: planned route, driven path, pickup, destination and the rider. */
export default function MapCanvas({
  origin,
  destination,
  route,
  path,
  position,
  offRoute = false,
  leftInset = 0,
  className = '',
}: MapCanvasProps) {
  const container = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const vehicleRef = useRef<mapboxgl.Marker | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: container.current!,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: origin,
      zoom: 11,
    })
    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'bottom-right')
    map.on('load', () => {
      map.addSource('route', { type: 'geojson', data: line([]) })
      map.addSource('path', { type: 'geojson', data: line([]) })
      const round = { 'line-cap': 'round', 'line-join': 'round' } as const
      map.addLayer({
        id: 'route',
        type: 'line',
        source: 'route',
        layout: round,
        paint: { 'line-color': ROUTE_COLOR, 'line-width': 6, 'line-opacity': 0.35 },
      })
      map.addLayer({
        id: 'path',
        type: 'line',
        source: 'path',
        layout: round,
        paint: { 'line-color': ROUTE_COLOR, 'line-width': 6 },
      })
      setReady(true)
    })
    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      vehicleRef.current = null
      setReady(false)
    }
    // The map is created once; later prop changes are applied by the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fits the pickup, destination, planned route and (optionally) the rider into view
  function frame(map: mapboxgl.Map, withRider: boolean) {
    const bounds = new mapboxgl.LngLatBounds(origin, origin).extend(destination)
    route?.forEach((point) => bounds.extend(point))
    if (withRider && position) bounds.extend(position)
    // The full-screen map leaves room for the floating alert and the side panel;
    // the small embedded maps only need a little breathing space
    const edge = leftInset ? 60 : 32
    map.fitBounds(bounds, {
      padding: { top: leftInset ? 150 : edge, bottom: edge, right: edge, left: edge + leftInset },
      maxZoom: 15,
      duration: withRider ? 600 : 0,
    })
  }

  const originKey = origin.join()
  const destinationKey = destination.join()

  // Pickup and destination pins, and the framing of the whole route
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    const markers = [
      new mapboxgl.Marker({ element: originElement() }).setLngLat(origin).addTo(map),
      new mapboxgl.Marker({ color: '#ff3700' }).setLngLat(destination).addTo(map),
    ]
    frame(map, false)
    return () => markers.forEach((marker) => marker.remove())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, originKey, destinationKey, route, leftInset])

  useEffect(() => {
    const source = ready ? mapRef.current?.getSource<mapboxgl.GeoJSONSource>('route') : undefined
    source?.setData(line(route ?? []))
  }, [ready, route])

  useEffect(() => {
    const source = ready ? mapRef.current?.getSource<mapboxgl.GeoJSONSource>('path') : undefined
    source?.setData(line(path ?? []))
  }, [ready, path])

  const positionKey = position?.join()

  // The rider's marker moves in place rather than being re-created on every ping
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    if (!position) {
      vehicleRef.current?.remove()
      vehicleRef.current = null
      return
    }
    if (!vehicleRef.current) {
      vehicleRef.current = new mapboxgl.Marker({ element: vehicleElement(), anchor: 'left', offset: [-10, 0] })
        .setLngLat(position)
        .addTo(map)
    }
    const marker = vehicleRef.current.setLngLat(position)
    const element = marker.getElement()
    element.querySelector('[data-dot]')!.classList.toggle('bg-danger', offRoute)
    element.querySelector('[data-dot]')!.classList.toggle('bg-navy', !offRoute)
    element.querySelector('[data-label]')!.classList.toggle('hidden', !offRoute)

    // A rider who wanders out of view (or behind the left panel) is brought back in
    const { x, y } = map.project(position)
    const { clientWidth, clientHeight } = map.getContainer()
    const margin = 40
    const hidden =
      x < leftInset + margin || x > clientWidth - margin || y < margin || y > clientHeight - margin
    if (hidden) frame(map, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, positionKey, offRoute])

  // mapbox-gl.css sets its own position on the map element, so layout classes go on a wrapper
  return (
    <div className={className} role="img" aria-label="Delivery route map">
      <div ref={container} className="size-full" />
    </div>
  )
}
