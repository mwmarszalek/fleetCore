import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './assignment.service.js'

const loginSchema = z.object({
  vehicleId: z.string().uuid(),
  line: z.string().min(1).max(10),
  brigade: z.string().min(1).max(10),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format daty: YYYY-MM-DD'),
})

function cityId(req: { headers: Record<string, string | string[] | undefined> }) {
  return (req.headers['x-city-id'] as string) ?? 'szczecin'
}

export async function assignmentRoutes(app: FastifyInstance) {
  // Lista aktywnych brygad (aktualnie zalogowane pojazdy)
  app.get('/active', async (req) => {
    return service.getActiveAssignments(cityId(req))
  })

  // Lista brygad dla danego dnia (?date=2026-04-26)
  app.get('/', async (req, reply) => {
    const { date } = req.query as { date?: string }
    const parsedDate = date ? new Date(date) : new Date()
    if (isNaN(parsedDate.getTime())) {
      return reply.status(400).send({ error: 'Nieprawidłowy format daty. Użyj YYYY-MM-DD' })
    }
    return service.getAssignmentsByDate(cityId(req), parsedDate)
  })

  // Zaloguj pojazd na brygadę
  app.post('/', async (req, reply) => {
    const body = loginSchema.parse(req.body)
    try {
      const assignment = await service.loginVehicle({
        ...body,
        date: new Date(body.date),
        cityId: cityId(req),
      })
      return reply.status(201).send(assignment)
    } catch (err: any) {
      if (err.message === 'ALREADY_LOGGED_IN') {
        return reply.status(409).send({ error: 'Pojazd jest już zalogowany na brygadę w tym dniu' })
      }
      if (err.message === 'BRIGADE_TAKEN') {
        return reply.status(409).send({ error: 'Ta brygada ma już przypisany pojazd' })
      }
      throw err
    }
  })

  // Wyloguj pojazd z brygady
  app.post<{ Params: { id: string } }>('/:id/logout', async (req, reply) => {
    try {
      const assignment = await service.logoutVehicle(req.params.id, cityId(req))
      return reply.send(assignment)
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') {
        return reply.status(404).send({ error: 'Nie znaleziono przypisania' })
      }
      if (err.message === 'ALREADY_LOGGED_OUT') {
        return reply.status(409).send({ error: 'Pojazd jest już wylogowany' })
      }
      throw err
    }
  })
}
