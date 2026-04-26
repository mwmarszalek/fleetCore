import { prisma } from '../../db.js'

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
