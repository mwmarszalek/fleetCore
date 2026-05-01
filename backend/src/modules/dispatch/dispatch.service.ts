import { prisma } from '../../db.js'
import { redis } from '../../redis.js'

const ZDITM = 'https://www.zditm.szczecin.pl/api/v1'
const TTL   = 24 * 60 * 60

async function cached<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const hit = await redis.get(key)
  if (hit) return JSON.parse(hit) as T
  const data = await fetcher()
  await redis.setex(key, TTL, JSON.stringify(data))
  return data
}

type ZditmLine = { id: number; number: string }
type ZditmStop = { name: string; latitude: number; longitude: number }
type Feature   = {
  properties: { route_variant_number: number; route_variant_type: string }
  geometry:   { type: string; coordinates: [number, number][] }
}

function zditmLines() {
  return cached<ZditmLine[]>('zditm:lines', async () => {
    const res = await fetch(`${ZDITM}/lines`)
    const { data } = await res.json() as { data: ZditmLine[] }
    return data
  })
}

function zditmStops() {
  return cached<ZditmStop[]>('zditm:stops', async () => {
    const res = await fetch(`${ZDITM}/stops`)
    const { data } = await res.json() as { data: ZditmStop[] }
    return data
  })
}

function zditmTrajectory(id: number) {
  return cached<{ features: Feature[] }>(`zditm:traj:${id}`, async () => {
    const res  = await fetch(`${ZDITM}/trajectories/${id}`)
    const json = await res.json() as { data?: { features: Feature[] } } & { features?: Feature[] }
    return (json.data ?? json) as { features: Feature[] }
  })
}

function nearestStop(stops: ZditmStop[], lon: number, lat: number): string {
  let best = stops[0], bestD = Infinity
  for (const s of stops) {
    const d = (s.latitude - lat) ** 2 + (s.longitude - lon) ** 2
    if (d < bestD) { bestD = d; best = s }
  }
  return best.name
}

function dirInfo(variant: Feature, stops: ZditmStop[]) {
  const coords = variant.geometry.coordinates
  const [fromLon, fromLat] = coords[0]
  const [toLon, toLat]     = coords[coords.length - 1]
  return {
    geometry: variant.geometry,
    from: nearestStop(stops, fromLon, fromLat),
    to:   nearestStop(stops, toLon,   toLat),
  }
}

export async function getTrajectory(lineNumber: string) {
  const [lines, stops] = await Promise.all([zditmLines(), zditmStops()])

  const zditmLine = lines.find(l => l.number === lineNumber)
  if (!zditmLine) throw new Error('LINE_NOT_FOUND')

  const fc       = await zditmTrajectory(zditmLine.id)
  const defaults = fc.features.filter(f => f.properties.route_variant_type === 'default')

  const varA = defaults
    .filter(f => f.properties.route_variant_number % 2 === 1)
    .sort((a, b) => a.properties.route_variant_number - b.properties.route_variant_number)[0]

  const varB = defaults
    .filter(f => f.properties.route_variant_number % 2 === 0)
    .sort((a, b) => a.properties.route_variant_number - b.properties.route_variant_number)[0]

  return {
    directionA: varA ? dirInfo(varA, stops) : null,
    directionB: varB ? dirInfo(varB, stops) : null,
  }
}

const SESSION_TTL_MS = 2 * 60 * 1000 // 2 minuty

function expiresAt() {
  return new Date(Date.now() + SESSION_TTL_MS)
}

async function cleanExpired(cityId: string) {
  await prisma.dispatchSession.deleteMany({
    where: { cityId, expiresAt: { lt: new Date() } },
  })
}

export async function getLines(cityId: string) {
  await cleanExpired(cityId)
  return prisma.line.findMany({
    where: { cityId },
    include: {
      session: {
        include: { user: { select: { email: true, role: true, depotId: true } } },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })
}

export async function claimLines(
  userId: string,
  lineIds: string[],
  cityId: string,
  role: string,
  depotId: string | null,
) {
  await cleanExpired(cityId)

  if (role === 'DRIVER') throw new Error('FORBIDDEN')

  const lines = await prisma.line.findMany({ where: { id: { in: lineIds }, cityId } })

  if (lines.length !== lineIds.length) throw new Error('LINE_NOT_FOUND')

  // DEPOT_DISPATCHER może przejąć tylko linie swojej zajezdni
  if (role === 'DEPOT_DISPATCHER') {
    const unauthorized = lines.filter(l => !l.depots.includes(depotId!))
    if (unauthorized.length > 0) {
      throw new Error(`DEPOT_UNAUTHORIZED:${unauthorized.map(l => l.number).join(',')}`)
    }
  }

  // Sprawdź czy któraś linia nie jest już zajęta przez kogoś innego
  const taken = await prisma.dispatchSession.findMany({
    where: { lineId: { in: lineIds }, userId: { not: userId } },
    include: { user: { select: { email: true } }, line: { select: { number: true } } },
  })
  if (taken.length > 0) {
    throw new Error(`ALREADY_CLAIMED:${taken.map(t => `${t.line.number}(${t.user.email})`).join(',')}`)
  }

  // Upsert sesji dla każdej linii
  await prisma.$transaction(
    lineIds.map(lineId =>
      prisma.dispatchSession.upsert({
        where: { lineId },
        create: { userId, lineId, cityId, expiresAt: expiresAt() },
        update: { userId, expiresAt: expiresAt() },
      })
    )
  )
}

export async function claimDepot(
  userId: string,
  depotId: string,
  cityId: string,
  role: string,
  userDepotId: string | null,
) {
  if (role === 'DRIVER') throw new Error('FORBIDDEN')
  if (role === 'DEPOT_DISPATCHER' && userDepotId !== depotId) throw new Error('FORBIDDEN')

  const lines = await prisma.line.findMany({
    where: { cityId, depots: { has: depotId } },
  })

  if (lines.length === 0) throw new Error('LINE_NOT_FOUND')

  await claimLines(userId, lines.map(l => l.id), cityId, role, userDepotId)
  return lines.length
}

export async function releaseLines(userId: string, lineIds: string[], cityId: string) {
  await prisma.dispatchSession.deleteMany({
    where: { lineId: { in: lineIds }, userId, cityId },
  })
}

export async function releaseAll(userId: string, cityId: string) {
  const { count } = await prisma.dispatchSession.deleteMany({
    where: { userId, cityId },
  })
  return count
}

export async function heartbeat(userId: string, cityId: string) {
  const { count } = await prisma.dispatchSession.updateMany({
    where: { userId, cityId },
    data: { expiresAt: expiresAt() },
  })
  return count
}
