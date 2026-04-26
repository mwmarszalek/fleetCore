import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { vehicleRoutes } from './modules/vehicles/vehicle.routes.js'
import { assignmentRoutes } from './modules/assignments/assignment.routes.js'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: 'http://localhost:5173',
})

app.setErrorHandler((error, _req, reply) => {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: 'Validation error',
      details: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
    })
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    return reply.status(409).send({ error: 'Vehicle with this number already exists' })
  }
  app.log.error(error)
  return reply.status(500).send({ error: 'Internal server error' })
})

app.get('/health', async () => {
  return { status: 'ok', service: 'fleetcore-backend' }
})

await app.register(vehicleRoutes, { prefix: '/api/vehicles' })
await app.register(assignmentRoutes, { prefix: '/api/assignments' })

try {
  await app.listen({ port: 3000, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
