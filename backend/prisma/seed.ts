import 'dotenv/config'
import { PrismaClient, VehicleCategory, UserRole } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ── Linie per zajezdnia ──────────────────────────────────────────────────────
const DEPOT_LINES: Record<string, string[]> = {
  SPAK: ['51','53','57','60','63','68','69','70','74','75','78','80','86','87','89','90','92','99'],
  SPAD: ['54','56','61','62','64','65','66','67','72','73','77','79','84','91','93','94','96','97','533','534','A','B','C'],
  SPPK: ['101','102','103','106','107','524','526'],
  PKS:  ['52','58','59','76','85','88','95','98','221','223','224','225','226','227','241','242','243','244','811',
         '521','522','523','525','527','528','529'],
  EZP:  ['1','2','3','4','5','6'],
  EZG:  ['7','8','9','10','11'],
}

// Linie z dużą liczbą brygad (główne arterie)
const BUSY_LINES: Record<string, number> = {
  '53': 13, '60': 11, '75': 15, '107': 9,
  '51': 10, '64': 8,  '1':  10, '3': 9, '5': 8,
}

// ── Typy pojazdów per zajezdnia ──────────────────────────────────────────────
const BUS_TYPES  = ['SOLARIS','MERCEDES','MAN','VOLVO','SOLARIS','MAN']
const TRAM_TYPES = ['PESA','MODERUS','KONSTAL','PESA','MODERUS']

function busType(i: number)  { return BUS_TYPES[i % BUS_TYPES.length] }
function tramType(i: number) { return TRAM_TYPES[i % TRAM_TYPES.length] }

// ── Generuj pojazdy dla zajezdni ─────────────────────────────────────────────
function buildVehicles() {
  const vehicles: { number: string; depot: string; type: string; category: VehicleCategory; cityId: string }[] = []
  let i = 0

  // SPAK: suma brygad dla swoich linii + zapas
  const spakTotal = DEPOT_LINES.SPAK.reduce((s, l) => s + (BUSY_LINES[l] ?? 2), 0) + 10
  for (let n = 0; n < spakTotal; n++) {
    vehicles.push({ number: String(1001 + n), depot: 'SPAK', type: busType(n), category: VehicleCategory.BUS, cityId: 'szczecin' })
  }
  // SPAD
  const spadTotal = DEPOT_LINES.SPAD.reduce((s, l) => s + (BUSY_LINES[l] ?? 2), 0) + 10
  for (let n = 0; n < spadTotal; n++) {
    vehicles.push({ number: String(2001 + n), depot: 'SPAD', type: busType(n), category: VehicleCategory.BUS, cityId: 'szczecin' })
  }
  // SPPK
  const sppkTotal = DEPOT_LINES.SPPK.reduce((s, l) => s + (BUSY_LINES[l] ?? 2), 0) + 5
  for (let n = 0; n < sppkTotal; n++) {
    vehicles.push({ number: String(3001 + n), depot: 'SPPK', type: busType(n), category: VehicleCategory.BUS, cityId: 'szczecin' })
  }
  // PKS
  const pksTotal = DEPOT_LINES.PKS.reduce((s, l) => s + (BUSY_LINES[l] ?? 2), 0) + 10
  for (let n = 0; n < pksTotal; n++) {
    vehicles.push({ number: String(10001 + n), depot: 'PKS', type: busType(n), category: VehicleCategory.BUS, cityId: 'szczecin' })
  }
  // EZP — tramwaje
  const ezpTotal = DEPOT_LINES.EZP.reduce((s, l) => s + (BUSY_LINES[l] ?? 2), 0) + 5
  for (let n = 0; n < ezpTotal; n++) {
    vehicles.push({ number: String(700 + n), depot: 'EZP', type: tramType(n), category: VehicleCategory.TRAM, cityId: 'szczecin' })
  }
  // EZG — tramwaje
  const ezgTotal = DEPOT_LINES.EZG.reduce((s, l) => s + (BUSY_LINES[l] ?? 2), 0) + 5
  for (let n = 0; n < ezgTotal; n++) {
    vehicles.push({ number: String(100 + n), depot: 'EZG', type: tramType(n), category: VehicleCategory.TRAM, cityId: 'szczecin' })
  }

  void i
  return vehicles
}

function brigadesForLine(line: string): number {
  return BUSY_LINES[line] ?? 2
}

// ── Zbuduj przypisania na dziś ────────────────────────────────────────────────
function buildAssignments(
  vehiclesByDepot: Record<string, { id: string; number: string }[]>
) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const assignments: {
    vehicleId: string
    line: string
    brigade: string
    date: Date
    loggedInAt: Date
    cityId: string
  }[] = []

  const depotEntries = [
    { depot: 'SPAK', lines: DEPOT_LINES.SPAK },
    { depot: 'SPAD', lines: DEPOT_LINES.SPAD },
    { depot: 'SPPK', lines: DEPOT_LINES.SPPK },
    { depot: 'PKS',  lines: DEPOT_LINES.PKS  },
    { depot: 'EZP',  lines: DEPOT_LINES.EZP  },
    { depot: 'EZG',  lines: DEPOT_LINES.EZG  },
  ]

  let globalIdx = 0

  for (const { depot, lines } of depotEntries) {
    const vehicles = vehiclesByDepot[depot] ?? []
    let vehicleIdx = 0

    for (const line of lines) {
      const count = brigadesForLine(line)
      for (let brigade = 1; brigade <= count; brigade++) {
        if (vehicleIdx >= vehicles.length) break
        const v = vehicles[vehicleIdx++]
        const loggedInAt = new Date(today)
        loggedInAt.setHours(4 + (globalIdx % 8), (globalIdx * 7) % 60, 0, 0)
        globalIdx++
        assignments.push({
          vehicleId: v.id,
          line,
          brigade: String(brigade),
          date: today,
          loggedInAt,
          cityId: 'szczecin',
        })
      }
    }
  }

  return assignments
}

async function main() {
  // ── Pojazdy ────────────────────────────────────────────────────────────────
  console.log('Seeding vehicles...')
  await prisma.vehicleAssignment.deleteMany({ where: { cityId: 'szczecin' } })
  await prisma.vehicle.deleteMany({ where: { cityId: 'szczecin' } })

  const vehicleDefs = buildVehicles()
  for (const v of vehicleDefs) {
    await prisma.vehicle.create({ data: v })
  }
  console.log(`✅ Created ${vehicleDefs.length} vehicles.`)

  // ── Pobierz ID pojazdów po zajezdniach ────────────────────────────────────
  const allVehicles = await prisma.vehicle.findMany({ where: { cityId: 'szczecin' } })
  const vehiclesByDepot: Record<string, { id: string; number: string }[]> = {}
  for (const v of allVehicles) {
    if (!vehiclesByDepot[v.depot]) vehiclesByDepot[v.depot] = []
    vehiclesByDepot[v.depot].push({ id: v.id, number: v.number })
  }

  // ── Przypisania na dziś ────────────────────────────────────────────────────
  console.log('Seeding vehicle assignments...')
  const assignments = buildAssignments(vehiclesByDepot)
  for (const a of assignments) {
    await prisma.vehicleAssignment.create({ data: a })
  }
  console.log(`✅ Created ${assignments.length} assignments.`)

  // ── Użytkownicy ────────────────────────────────────────────────────────────
  console.log('Seeding users...')
  await prisma.user.deleteMany({ where: { cityId: 'szczecin' } })

  // Kierowca → pierwszy pojazd SPAK
  const vehicle1 = vehiclesByDepot['SPAK']?.[0]

  const users = [
    { email: 'central@fleetcore.app',       password: 'admin123',    role: UserRole.CENTRAL_DISPATCHER, cityId: 'szczecin', depotId: null,   vehicleId: null },
    { email: 'spak@fleetcore.app',           password: 'spak123',     role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'SPAK', vehicleId: null },
    { email: 'spad@fleetcore.app',           password: 'spad123',     role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'SPAD', vehicleId: null },
    { email: 'sppk@fleetcore.app',           password: 'sppk123',     role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'SPPK', vehicleId: null },
    { email: 'pks@fleetcore.app',            password: 'pks123',      role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'PKS',  vehicleId: null },
    { email: 'ezp@fleetcore.app',            password: 'ezp123',      role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'EZP',  vehicleId: null },
    { email: 'ezg@fleetcore.app',            password: 'ezg123',      role: UserRole.DEPOT_DISPATCHER,   cityId: 'szczecin', depotId: 'EZG',  vehicleId: null },
    { email: 'kierowca1001@fleetcore.app',   password: 'kierowca123', role: UserRole.DRIVER,             cityId: 'szczecin', depotId: 'SPAK', vehicleId: vehicle1?.id ?? null },
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
