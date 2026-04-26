import 'dotenv/config'
import { PrismaClient, VehicleCategory, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const vehicles = [
  // SPAK — zajezdnia autobusowa
  { number: '1089', depot: 'SPAK', type: 'SOLARIS',  category: VehicleCategory.BUS,  cityId: 'szczecin' },
  { number: '1152', depot: 'SPAK', type: 'SOLARIS',  category: VehicleCategory.BUS,  cityId: 'szczecin' },
  { number: '1207', depot: 'SPAK', type: 'MERCEDES', category: VehicleCategory.BUS,  cityId: 'szczecin' },
  { number: '1341', depot: 'SPAK', type: 'MAN',      category: VehicleCategory.BUS,  cityId: 'szczecin' },
  // SPAD — zajezdnia autobusowa
  { number: '2103', depot: 'SPAD', type: 'SOLARIS',  category: VehicleCategory.BUS,  cityId: 'szczecin' },
  { number: '2267', depot: 'SPAD', type: 'MERCEDES', category: VehicleCategory.BUS,  cityId: 'szczecin' },
  { number: '2445', depot: 'SPAD', type: 'MAN',      category: VehicleCategory.BUS,  cityId: 'szczecin' },
  // SPPK — zajezdnia autobusowa
  { number: '3087', depot: 'SPPK', type: 'SOLARIS',  category: VehicleCategory.BUS,  cityId: 'szczecin' },
  { number: '3124', depot: 'SPPK', type: 'MAN',      category: VehicleCategory.BUS,  cityId: 'szczecin' },
  { number: '3201', depot: 'SPPK', type: 'MERCEDES', category: VehicleCategory.BUS,  cityId: 'szczecin' },
  // PKS — zajezdnia autobusowa
  { number: '10523', depot: 'PKS', type: 'SOLARIS',  category: VehicleCategory.BUS,  cityId: 'szczecin' },
  { number: '10677', depot: 'PKS', type: 'MERCEDES', category: VehicleCategory.BUS,  cityId: 'szczecin' },
  { number: '10841', depot: 'PKS', type: 'MAN',      category: VehicleCategory.BUS,  cityId: 'szczecin' },
  // EZP — zajezdnia tramwajowa
  { number: '714',  depot: 'EZP', type: 'PESA',    category: VehicleCategory.TRAM, cityId: 'szczecin' },
  { number: '733',  depot: 'EZP', type: 'MODERUS', category: VehicleCategory.TRAM, cityId: 'szczecin' },
  { number: '782',  depot: 'EZP', type: 'PESA',    category: VehicleCategory.TRAM, cityId: 'szczecin' },
  { number: '795',  depot: 'EZP', type: 'MODERUS', category: VehicleCategory.TRAM, cityId: 'szczecin' },
  // EZG — zajezdnia tramwajowa
  { number: '112',  depot: 'EZG', type: 'KONSTAL', category: VehicleCategory.TRAM, cityId: 'szczecin' },
  { number: '123',  depot: 'EZG', type: 'PESA',    category: VehicleCategory.TRAM, cityId: 'szczecin' },
  { number: '145',  depot: 'EZG', type: 'KONSTAL', category: VehicleCategory.TRAM, cityId: 'szczecin' },
  { number: '167',  depot: 'EZG', type: 'MODERUS', category: VehicleCategory.TRAM, cityId: 'szczecin' },
]

async function main() {
  console.log('Seeding vehicles...')
  await prisma.vehicleAssignment.deleteMany({ where: { cityId: 'szczecin' } })
  await prisma.vehicle.deleteMany({ where: { cityId: 'szczecin' } })
  for (const v of vehicles) {
    await prisma.vehicle.create({ data: v })
  }
  console.log(`✅ Created ${vehicles.length} vehicles.`)

  // Pobierz ID pojazdu dla kierowcy
  const vehicle1089 = await prisma.vehicle.findFirst({ where: { number: '1089', cityId: 'szczecin' } })

  console.log('Seeding users...')
  await prisma.user.deleteMany({ where: { cityId: 'szczecin' } })

  const users = [
    // Dyspozytor Centralny
    { email: 'central@fleetcore.app',  password: 'admin123',    role: UserRole.CENTRAL_DISPATCHER, cityId: 'szczecin', depotId: null,   vehicleId: null },

    // Dyspozytorzy Zajezdni — autobusowe
    { email: 'spak@fleetcore.app',     password: 'spak123',     role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'SPAK', vehicleId: null },
    { email: 'spad@fleetcore.app',     password: 'spad123',     role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'SPAD', vehicleId: null },
    { email: 'sppk@fleetcore.app',     password: 'sppk123',     role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'SPPK', vehicleId: null },
    { email: 'pks@fleetcore.app',      password: 'pks123',      role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'PKS',  vehicleId: null },

    // Dyspozytorzy Zajezdni — tramwajowe (obie widzą wszystkie linie tram)
    { email: 'ezp@fleetcore.app',      password: 'ezp123',      role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'EZP',  vehicleId: null },
    { email: 'ezg@fleetcore.app',      password: 'ezg123',      role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'EZG',  vehicleId: null },

    // Kierowca
    { email: 'kierowca1089@fleetcore.app', password: 'kierowca123', role: UserRole.DRIVER, cityId: 'szczecin', depotId: 'SPAK', vehicleId: vehicle1089?.id ?? null },
  ]

  for (const { password, ...data } of users) {
    await prisma.user.create({
      data: { ...data, passwordHash: await bcrypt.hash(password, 10) },
    })
  }
  console.log(`✅ Created ${users.length} users.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
