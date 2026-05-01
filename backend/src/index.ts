import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { authRoutes } from './modules/auth/auth.routes.js'
import { vehicleRoutes } from './modules/vehicles/vehicle.routes.js'
import { assignmentRoutes } from './modules/assignments/assignment.routes.js'
import { trackingRoutes } from './modules/tracking/tracking.routes.js'
import { dispatchRoutes } from './modules/dispatch/dispatch.routes.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: /^http:\/\/localhost:\d+$/ })
await app.register(websocket)
await app.register(jwt, { secret: process.env.JWT_SECRET! })

// Dekorator używany jako onRequest hook w chronionych routes
app.decorate('authenticate', async (req: any, reply: any) => {
  try {
    await req.jwtVerify()
  } catch {
    reply.status(401).send({ error: 'Brak autoryzacji' })
  }
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

app.get('/health', async () => ({ status: 'ok', service: 'fleetcore-backend' }))

await app.register(authRoutes,       { prefix: '/api/auth' })
await app.register(vehicleRoutes,    { prefix: '/api/vehicles' })
await app.register(assignmentRoutes, { prefix: '/api/assignments' })
await app.register(trackingRoutes,   { prefix: '/tracking' })
await app.register(dispatchRoutes,   { prefix: '/api/dispatch' })

try {
  await app.listen({ port: 3000, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
