import { useEffect, useRef, useState } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useTrackingStore } from '../store/trackingStore'

const SZCZECIN_CENTER: [number, number] = [14.5528, 53.4285]

export function FleetMap() {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const { setPositions, setConnected, positions, connected } = useTrackingStore()

  // Init mapy
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
          },
        },
        layers: [{ id: 'osm-layer', type: 'raster', source: 'osm' }],
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
      },
      center: SZCZECIN_CENTER,
      zoom: 12,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      map.addSource('vehicles', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'vehicles-circle',
        type: 'circle',
        source: 'vehicles',
        paint: {
          'circle-radius': 9,
          'circle-color': [
            'case',
            ['==', ['get', 'isTram'], true], '#e84444',
            '#1a6ef5',
          ],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      })

      map.addLayer({
        id: 'vehicles-label',
        type: 'symbol',
        source: 'vehicles',
        layout: {
          'text-field': ['get', 'label'],
          'text-size': 10,
          'text-offset': [0, 1.8],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#111',
          'text-halo-color': '#fff',
          'text-halo-width': 1.5,
        },
      })

      map.on('click', 'vehicles-circle', (e) => {
        const props = e.features?.[0]?.properties
        if (!props) return
        const coords = (e.features![0].geometry as any).coordinates as [number, number]
        new maplibregl.Popup()
          .setLngLat(coords)
          .setHTML(`
            <strong>Pojazd ${props.number}</strong><br/>
            ${props.isTram ? '🔴 Tramwaj' : '🔵 Autobus'} · ${props.type}<br/>
            Zajezdnia: ${props.depot}<br/>
            ${props.line ? `Linia: <strong>${props.line}</strong> · Brygada: <strong>${props.brigade}</strong><br/>` : 'Brak przypisania<br/>'}
            Prędkość: ${props.speed} km/h
          `)
          .addTo(map)
      })

      map.on('mouseenter', 'vehicles-circle', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'vehicles-circle', () => {
        map.getCanvas().style.cursor = ''
      })

      setMapLoaded(true)
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      setMapLoaded(false)
    }
  }, [])

  // Aktualizuj pozycje pojazdów — tylko gdy mapa jest gotowa
  useEffect(() => {
    if (!mapLoaded || !mapRef.current) return
    const source = mapRef.current.getSource('vehicles') as maplibregl.GeoJSONSource
    if (!source) return

    const features: GeoJSON.Feature[] = Array.from(positions.values()).map(p => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
      properties: {
        vehicleId: p.vehicleId,
        number: p.number,
        depot: p.depot,
        type: p.type,
        line: p.line,
        brigade: p.brigade,
        speed: p.speed,
        isTram: p.category === 'TRAM',
        label: p.line ? `${p.number}\n${p.line}` : p.number,
      },
    }))

    source.setData({ type: 'FeatureCollection', features })
  }, [positions, mapLoaded])

  // WebSocket
  useEffect(() => {
    let ws: WebSocket
    let reconnectTimer: ReturnType<typeof setTimeout>

    function connect() {
      ws = new WebSocket('ws://localhost:3000/tracking/ws')
      wsRef.current = ws

      ws.onopen = () => setConnected(true)
      ws.onclose = () => {
        setConnected(false)
        reconnectTimer = setTimeout(connect, 3000)
      }
      ws.onerror = () => ws.close()
      ws.onmessage = (e) => {
        const msg = JSON.parse(e.data)
        if (msg.type === 'positions') setPositions(msg.data)
      }
    }

    connect()
    return () => {
      clearTimeout(reconnectTimer)
      ws?.close()
    }
  }, [setPositions, setConnected])

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />
      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2 shadow text-xs flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
        <span className="text-gray-700">
          {connected ? `${positions.size} pojazdów online` : 'Łączenie...'}
        </span>
      </div>
    </div>
  )
}
