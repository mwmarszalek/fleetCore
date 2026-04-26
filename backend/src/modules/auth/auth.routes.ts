import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as service from './auth.service.js'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  cityId: z.string().min(1),
})

export async function authRoutes(app: FastifyInstance) {
  app.post('/login', async (req, reply) => {
    const { email, password, cityId } = loginSchema.parse(req.body)

    const user = await service.findUserByEmail(email, cityId)
    if (!user) return reply.status(401).send({ error: 'Nieprawidłowy email lub hasło' })

    const valid = await service.verifyPassword(password, user.passwordHash)
    if (!valid) return reply.status(401).send({ error: 'Nieprawidłowy email lub hasło' })

    const token = app.jwt.sign({
      userId:    user.id,
      email:     user.email,
      role:      user.role,
      cityId:    user.cityId,
      depotId:   user.depotId,
      vehicleId: user.vehicleId,
    })

    return { token, user: { userId: user.id, email: user.email, role: user.role, cityId: user.cityId, depotId: user.depotId } }
  })

  app.get('/me', { onRequest: [app.authenticate] }, async (req) => {
    return req.user
  })
}
