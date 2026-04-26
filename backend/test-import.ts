export {}

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

function ok(label: string, pass: boolean, detail = '') {
  console.log(`${pass ? '✅' : '❌'} ${label}${detail ? ` — ${detail}` : ''}`)
}

// ── LINIE ────────────────────────────────────────────────────────────────────

const lines = await prisma.line.findMany({ where: { cityId: 'szczecin' } })

ok('Linie: zaimportowano > 0', lines.length > 0, `${lines.length} linii`)
ok('Linie: liczba ≥ 80',      lines.length >= 80, `${lines.length}`)

// Typy pojazdów
const trams   = lines.filter(l => l.vehicleType === 'tram')
const buses   = lines.filter(l => l.vehicleType === 'bus')
const night   = lines.filter(l => l.type === 'night')
const express = lines.filter(l => l.subtype === 'semi-fast' || l.subtype === 'fast')
ok('Linie: są tramwaje',        trams.length > 0,   `${trams.length} tramwajowych`)
ok('Linie: są autobusy',        buses.length > 0,   `${buses.length} autobusowych`)
ok('Linie: są nocne',           night.length > 0,   `${night.length} nocnych`)

// Konkretne linie
const line53 = lines.find(l => l.number === '53')
ok('Linia 53 istnieje',         !!line53)
ok('Linia 53 → SPAK',           line53?.depots.includes('SPAK') ?? false, `depots: ${line53?.depots}`)
ok('Linia 53 to autobus dzienny', line53?.vehicleType === 'bus' && line53?.type === 'day')

const line1 = lines.find(l => l.number === '1')
ok('Linia 1 istnieje',          !!line1)
ok('Linia 1 to tramwaj',        line1?.vehicleType === 'tram')
ok('Linia 1 → EZP + EZG',       (line1?.depots.includes('EZP') && line1?.depots.includes('EZG')) ?? false, `depots: ${line1?.depots}`)

const line63 = lines.find(l => l.number === '63')
ok('Linia 63 istnieje',         !!line63)
ok('Linia 63 → 3 zajezdnie (SPAK+SPPK+PKS)',
  ['SPAK','SPPK','PKS'].every(d => line63?.depots.includes(d)) ?? false,
  `depots: ${line63?.depots}`)

const lineA = lines.find(l => l.number === 'A')
ok('Linia A istnieje',          !!lineA)
ok('Linia A → SPAD',            lineA?.depots.includes('SPAD') ?? false)

const line533 = lines.find(l => l.number === '533')
ok('Linia 533 (nocna) istnieje', !!line533)
ok('Linia 533 to nocna',         line533?.type === 'night')

// Linie bez zajezdni (ostrzeżenie)
const noDepot = lines.filter(l => l.depots.length === 0)
if (noDepot.length > 0) {
  console.log(`⚠️  ${noDepot.length} linii bez przypisanej zajezdni: ${noDepot.map(l => l.number).join(', ')}`)
} else {
  ok('Każda linia ma ≥1 zajezdnię', true)
}

// ── PRZYSTANKI ───────────────────────────────────────────────────────────────
console.log('')

const stops = await prisma.stop.findMany({ where: { cityId: 'szczecin' } })

ok('Przystanki: zaimportowano > 0',   stops.length > 0,    `${stops.length} przystanków`)
ok('Przystanki: liczba ≥ 1000',       stops.length >= 1000)

// Współrzędne w okolicach Szczecina (53.3–53.6 N, 14.3–14.8 E)
const inSzczecin = stops.filter(s =>
  s.lat >= 53.2 && s.lat <= 53.65 &&
  s.lng >= 14.3 && s.lng <= 14.9
)
ok('Przystanki: współrzędne w regionie Szczecina', inSzczecin.length === stops.length,
  `${inSzczecin.length}/${stops.length} w zasięgu`)

// Znane przystanki
const turzyn = stops.find(s => s.name === 'Turzyn Dworzec')
ok('Przystanek "Turzyn Dworzec" istnieje', !!turzyn, turzyn ? `nr ${turzyn.number}` : '')

const pAndR = stops.filter(s => s.parkAndRide)
ok('Są przystanki P&R', pAndR.length > 0, `${pAndR.length} przystanków P&R`)

const onDemand = stops.filter(s => s.requestStop)
ok('Są przystanki na żądanie', onDemand.length > 0, `${onDemand.length} na żądanie`)

await prisma.$disconnect()
