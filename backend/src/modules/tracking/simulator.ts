import { prisma } from '../../db.js'

export type VehiclePosition = {
  vehicleId: string
  number: string
  depot: string
  type: string
  category: 'BUS' | 'TRAM'
  line: string | null
  brigade: string | null
  lat: number
  lng: number
  speed: number
  heading: number
}

// Trasy po Szczecinie — punkty orientacyjne
const ROUTES = [
  [
    [53.4340, 14.5498], // Brama Portowa
    [53.4375, 14.5530], // pl. Żołnierza
    [53.4430, 14.5560], // Jagiellońska
    [53.4490, 14.5590], // Krzekowo
    [53.4540, 14.5610], // Osiedle Słoneczne
  ],
  [
    [53.4285, 14.5230], // Pomorzany
    [53.4295, 14.5360], // Niebuszewo
    [53.4310, 14.5480], // al. Wyzwolenia
    [53.4340, 14.5498], // Brama Portowa
    [53.4360, 14.5650], // Łasztownia
  ],
  [
    [53.4180, 14.5420], // Gumieńce
    [53.4230, 14.5460], // Basen Górniczy
    [53.4285, 14.5528], // Centrum
    [53.4340, 14.5498], // Brama Portowa
    [53.4390, 14.5420], // Gocław
  ],
  [
    [53.4500, 14.5100], // Golęcino
    [53.4450, 14.5250], // Stare Miasto
    [53.4400, 14.5380], // Turzyn
    [53.4340, 14.5498], // Centrum
    [53.4280, 14.5600], // Śródmieście
  ],
  [
    [53.4600, 14.5400], // Szczecin Północ
    [53.4520, 14.5430], // Drzetowo
    [53.4440, 14.5460], // pl. Rodła
    [53.4360, 14.5490], // al. Bohaterów
    [53.4285, 14.5528], // Centrum
  ],
]

type SimVehicle = {
  vehicleId: string
  number: string
  depot: string
  type: string
  category: 'BUS' | 'TRAM'
  routeIndex: number
  waypointIndex: number
  progress: number   // 0..1 między waypointami
  direction: 1 | -1 // poruszanie się do przodu lub tyłu
  speed: number      // km/h
}

const state = new Map<string, SimVehicle>()

export async function initSimulator() {
  const vehicles = await prisma.vehicle.findMany({ where: { cityId: 'szczecin' } })

  vehicles.forEach((v, i) => {
    state.set(v.id, {
      vehicleId: v.id,
      number: v.number,
      depot: v.depot,
      type: v.type,
      category: v.category as 'BUS' | 'TRAM',
      routeIndex: i % ROUTES.length,
      waypointIndex: Math.floor(Math.random() * ROUTES[i % ROUTES.length].length),
      progress: Math.random(),
      direction: Math.random() > 0.5 ? 1 : -1,
      speed: 25 + Math.random() * 30,
    })
  })
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function calcHeading(fromLat: number, fromLng: number, toLat: number, toLng: number) {
  const dLng = toLng - fromLng
  const dLat = toLat - fromLat
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI)
  return (angle + 360) % 360
}

export async function tickSimulator(cityId: string): Promise<VehiclePosition[]> {
  const activeAssignments = await prisma.vehicleAssignment.findMany({
    where: { cityId, loggedOutAt: null },
    select: { vehicleId: true, line: true, brigade: true },
  })
  const assignmentMap = new Map(activeAssignments.map(a => [a.vehicleId, a]))

  const positions: VehiclePosition[] = []

  for (const [, sim] of state) {
    const route = ROUTES[sim.routeIndex]
    const stepPerTick = (sim.speed / 3600) / 111 * 2 // 2s interval, degrees

    sim.progress += stepPerTick * sim.direction * (1 / distanceBetween(
      route[sim.waypointIndex],
      route[(sim.waypointIndex + 1 + route.length) % route.length]
    ))

    if (sim.progress >= 1) {
      sim.progress = 0
      sim.waypointIndex = (sim.waypointIndex + 1) % route.length
      if (sim.waypointIndex === 0) sim.direction = sim.direction === 1 ? -1 : 1
    }
    if (sim.progress < 0) {
      sim.progress = 1
      sim.waypointIndex = (sim.waypointIndex - 1 + route.length) % route.length
    }

    const from = route[sim.waypointIndex]
    const toIdx = (sim.waypointIndex + 1) % route.length
    const to = route[toIdx]

    const lat = lerp(from[0], to[0], Math.max(0, Math.min(1, sim.progress)))
    const lng = lerp(from[1], to[1], Math.max(0, Math.min(1, sim.progress)))
    const heading = sim.direction === 1
      ? calcHeading(from[0], from[1], to[0], to[1])
      : calcHeading(to[0], to[1], from[0], from[1])

    const assignment = assignmentMap.get(sim.vehicleId)

    positions.push({
      vehicleId: sim.vehicleId,
      number: sim.number,
      depot: sim.depot,
      type: sim.type,
      category: sim.category,
      line: assignment?.line ?? null,
      brigade: assignment?.brigade ?? null,
      lat,
      lng,
      speed: Math.round(sim.speed),
      heading,
    })
  }

  return positions
}

function distanceBetween(a: number[], b: number[]) {
  const dlat = b[0] - a[0]
  const dlng = b[1] - a[1]
  return Math.sqrt(dlat * dlat + dlng * dlng) || 0.0001
}
