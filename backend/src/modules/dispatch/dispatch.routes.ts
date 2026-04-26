import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './dispatch.service.js'

const lineIdsSchema = z.object({ lineIds: z.array(z.string().uuid()).min(1) })
const depotSchema   = z.object({ depotId: z.string().min(1) })

function handleError(err: unknown, reply: any) {
  const msg = err instanceof Error ? err.message : ''
  if (msg === 'FORBIDDEN')
    return reply.status(403).send({ error: 'Brak uprawnień do tej operacji' })
  if (msg === 'LINE_NOT_FOUND')
    return reply.status(404).send({ error: 'Nie znaleziono linii' })
  if (msg.startsWith('DEPOT_UNAUTHORIZED:'))
    return reply.status(403).send({ error: `Linie nie należą do twojej zajezdni: ${msg.split(':')[1]}` })
  if (msg.startsWith('ALREADY_CLAIMED:'))
    return reply.status(409).send({ error: `Linie już przejęte przez innego dyspozytora: ${msg.split(':')[1]}` })
  throw err
}

export async function dispatchRoutes(app: FastifyInstance) {
  const auth = { onRequest: [app.authenticate] }

  // Lista wszystkich linii ze statusem przejęcia
  app.get('/lines', auth, async (req) => {
    return service.getLines(req.user.cityId)
  })

  // Przejmij wskazane linie
  app.post('/sessions/claim', auth, async (req, reply) => {
    const { lineIds } = lineIdsSchema.parse(req.body)
    const { userId, cityId, role, depotId } = req.user
    try {
      await service.claimLines(userId, lineIds, cityId, role, depotId)
      return { claimed: lineIds.length }
    } catch (err) { return handleError(err, reply) }
  })

  // Przejmij wszystkie linie zajezdni jednym kliknięciem
  app.post('/sessions/claim-depot', auth, async (req, reply) => {
    const { depotId } = depotSchema.parse(req.body)
    const { userId, cityId, role, depotId: userDepotId } = req.user
    try {
      const count = await service.claimDepot(userId, depotId, cityId, role, userDepotId)
      return { claimed: count }
    } catch (err) { return handleError(err, reply) }
  })

  // Zwolnij wskazane linie
  app.delete('/sessions/release', auth, async (req) => {
    const { lineIds } = lineIdsSchema.parse(req.body)
    await service.releaseLines(req.user.userId, lineIds, req.user.cityId)
    return { released: lineIds.length }
  })

  // Zwolnij wszystkie swoje linie
  app.delete('/sessions/release-all', auth, async (req) => {
    const count = await service.releaseAll(req.user.userId, req.user.cityId)
    return { released: count }
  })

  // Heartbeat — odnów sesję o kolejne 2 minuty
  app.post('/sessions/heartbeat', auth, async (req) => {
    const count = await service.heartbeat(req.user.userId, req.user.cityId)
    return { renewed: count, expiresIn: '2 minutes' }
  })
}
