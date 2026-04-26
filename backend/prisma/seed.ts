import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const vehicles = [
  // SPAK — zajezdnia autobusowa
  { number: '1089', depot: 'SPAK', type: 'SOLARIS',  cityId: 'szczecin' },
  { number: '1152', depot: 'SPAK', type: 'SOLARIS',  cityId: 'szczecin' },
  { number: '1207', depot: 'SPAK', type: 'MERCEDES', cityId: 'szczecin' },
  { number: '1341', depot: 'SPAK', type: 'MAN',      cityId: 'szczecin' },

  // SPAD — zajezdnia autobusowa
  { number: '2103', depot: 'SPAD', type: 'SOLARIS',  cityId: 'szczecin' },
  { number: '2267', depot: 'SPAD', type: 'MERCEDES', cityId: 'szczecin' },
  { number: '2445', depot: 'SPAD', type: 'MAN',      cityId: 'szczecin' },

  // SPPK — zajezdnia autobusowa
  { number: '3087', depot: 'SPPK', type: 'SOLARIS',  cityId: 'szczecin' },
  { number: '3124', depot: 'SPPK', type: 'MAN',      cityId: 'szczecin' },
  { number: '3201', depot: 'SPPK', type: 'MERCEDES', cityId: 'szczecin' },

  // PKS — zajezdnia autobusowa
  { number: '10523', depot: 'PKS', type: 'SOLARIS',  cityId: 'szczecin' },
  { number: '10677', depot: 'PKS', type: 'MERCEDES', cityId: 'szczecin' },
  { number: '10841', depot: 'PKS', type: 'MAN',      cityId: 'szczecin' },

  // EZP — zajezdnia tramwajowa
  { number: '714',   depot: 'EZP', type: 'PESA',     cityId: 'szczecin' },
  { number: '733',   depot: 'EZP', type: 'MODERUS',  cityId: 'szczecin' },
  { number: '782',   depot: 'EZP', type: 'PESA',     cityId: 'szczecin' },
  { number: '795',   depot: 'EZP', type: 'MODERUS',  cityId: 'szczecin' },

  // EZG — zajezdnia tramwajowa
  { number: '112',   depot: 'EZG', type: 'KONSTAL',  cityId: 'szczecin' },
  { number: '123',   depot: 'EZG', type: 'PESA',     cityId: 'szczecin' },
  { number: '145',   depot: 'EZG', type: 'KONSTAL',  cityId: 'szczecin' },
  { number: '167',   depot: 'EZG', type: 'MODERUS',  cityId: 'szczecin' },
]

async function main() {
  console.log('Seeding vehicles...')
  await prisma.vehicle.deleteMany({ where: { cityId: 'szczecin' } })
  for (const v of vehicles) {
    await prisma.vehicle.create({ data: v })
  }
  console.log(`Created ${vehicles.length} vehicles.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
