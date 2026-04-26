import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const CITY_ID = 'szczecin'
const ZDITM = 'https://www.zditm.szczecin.pl/api/v1'
const UA = 'FleetCore/1.0 (fleet management system)'

// Przypisanie linii do zajezdni (dane od operatora)
const DEPOT_LINES: Record<string, string[]> = {
  SPAK: ['51','53','57','60','63','68','69','70','74','75','78','80','82','86','87','89','90','92','99'],
  SPAD: ['54','56','61','62','64','65','66','67','72','73','77','79','84','91','93','94','96','97','533','534','A','B','C'],
  SPPK: ['63','101','102','103','106','107','524','526'],
  PKS:  ['52','58','59','63','76','85','88','95','98','221','222','223','224','225','226','227','241','242','243','244','811','521','522','523','525','527','528','529','530','531','532','535','536','904','908'],
  // 109 — linia już nie kursuje, brak zajezdni
  EZP:  ['1','2','3','4','5','6','7','8','9','10','11'],
  EZG:  ['1','2','3','4','5','6','7','8','9','10','11'],
}

function getDepots(lineNumber: string): string[] {
  return Object.entries(DEPOT_LINES)
    .filter(([, lines]) => lines.includes(lineNumber))
    .map(([depot]) => depot)
}

async function importLines() {
  console.log('Pobieranie linii z ZDiTM...')
  const res = await fetch(`${ZDITM}/lines`, { headers: { 'User-Agent': UA } })
  const json = await res.json() as { data: any[] }

  await prisma.line.deleteMany({ where: { cityId: CITY_ID } })

  let count = 0
  for (const l of json.data) {
    await prisma.line.create({
      data: {
        zditmId:     l.id,
        number:      l.number,
        type:        l.type,
        subtype:     l.subtype,
        vehicleType: l.vehicle_type,
        onDemand:    l.on_demand,
        highlighted: l.highlighted,
        sortOrder:   l.sort_order,
        depots:      getDepots(l.number),
        cityId:      CITY_ID,
      },
    })
    count++
  }
  console.log(`✅ Zaimportowano ${count} linii`)
}

async function importStops() {
  console.log('Pobieranie przystanków z ZDiTM...')
  const res = await fetch(`${ZDITM}/stops`, { headers: { 'User-Agent': UA } })
  const json = await res.json() as any[]

  // API zwraca tablicę bezpośrednio lub obiekt z data
  const stops = Array.isArray(json) ? json : (json as any).data

  await prisma.stop.deleteMany({ where: { cityId: CITY_ID } })

  let count = 0
  for (const s of stops) {
    await prisma.stop.create({
      data: {
        zditmId:            s.id,
        number:             s.number,
        name:               s.name,
        lat:                s.latitude,
        lng:                s.longitude,
        requestStop:        s.request_stop,
        parkAndRide:        s.park_and_ride,
        technical:          s.technical,
        railwayStationName: s.railway_station_name ?? null,
        cityId:             CITY_ID,
      },
    })
    count++
  }
  console.log(`✅ Zaimportowano ${count} przystanków`)
}

async function main() {
  await importLines()
  await importStops()
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
