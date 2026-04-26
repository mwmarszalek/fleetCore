import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './vehicle.service.js'

const createSchema = z.object({
  number: z.string().min(1).max(20),
  depot: z.string().min(1).max(50),
  type: z.string().min(1).max(50),
})

const updateSchema = createSchema.partial()

function cityId(req: { headers: Record<string, string | string[] | undefined> }): string {
  return (req.headers['x-city-id'] as string) ?? 'warsaw'
}

export async function vehicleRoutes(app: FastifyInstance) {
  app.get('/', async (req) => {
    return service.getVehicles(cityId(req))
  })

  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const vehicle = await service.getVehicle(req.params.id, cityId(req))
    if (!vehicle) return reply.status(404).send({ error: 'Vehicle not found' })
    return vehicle
  })

  app.post('/', async (req, reply) => {
    const body = createSchema.parse(req.body)
    const vehicle = await service.createVehicle({ ...body, cityId: cityId(req) })
    return reply.status(201).send(vehicle)
  })

  app.put<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const existing = await service.getVehicle(req.params.id, cityId(req))
    if (!existing) return reply.status(404).send({ error: 'Vehicle not found' })
    const body = updateSchema.parse(req.body)
    return service.updateVehicle(req.params.id, cityId(req), body)
  })

  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const existing = await service.getVehicle(req.params.id, cityId(req))
    if (!existing) return reply.status(404).send({ error: 'Vehicle not found' })
    await service.deleteVehicle(req.params.id, cityId(req))
    return reply.status(204).send()
  })
}
