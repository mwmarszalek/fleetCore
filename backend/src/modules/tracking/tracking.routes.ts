import type { FastifyInstance } from 'fastify'
import { initSimulator, tickSimulator } from './simulator.js'

export async function trackingRoutes(app: FastifyInstance) {
  await initSimulator()

  app.get('/ws', { websocket: true }, (socket) => {
    const cityId = 'szczecin'

    const send = async () => {
      if (socket.readyState !== 1) return
      const positions = await tickSimulator(cityId)
      socket.send(JSON.stringify({ type: 'positions', data: positions }))
    }

    send()
    const interval = setInterval(send, 2000)
    socket.on('close', () => clearInterval(interval))
  })
}
