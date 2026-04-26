import Fastify from 'fastify'
import cors from '@fastify/cors'

const app = Fastify({ logger: true })

await app.register(cors, {
  origin: 'http://localhost:5173',
})

app.get('/health', async () => {
  return { status: 'ok', service: 'fleetcore-backend' }
})

try {
  await app.listen({ port: 3000, host: '0.0.0.0' })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
