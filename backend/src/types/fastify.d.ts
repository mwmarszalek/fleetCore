import '@fastify/jwt'
import { FastifyRequest, FastifyReply } from 'fastify'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: {
      userId: string
      email: string
      role: 'CENTRAL_DISPATCHER' | 'DEPOT_DISPATCHER' | 'DRIVER'
      cityId: string
      depotId: string | null
      vehicleId: string | null
    }
    user: {
      userId: string
      email: string
      role: 'CENTRAL_DISPATCHER' | 'DEPOT_DISPATCHER' | 'DRIVER'
      cityId: string
      depotId: string | null
      vehicleId: string | null
    }
  }
}

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(req: FastifyRequest, reply: FastifyReply): Promise<void>
  }
}
