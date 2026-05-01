export type DepotKey = 'SPAK' | 'SPAD' | 'SPPK' | 'PKS' | 'TRAM'

export const DEPOT_COLORS: Record<DepotKey, string> = {
  SPAK: '#60a5fa',
  SPAD: '#a78bfa',
  SPPK: '#34d399',
  PKS:  '#fbbf24',
  TRAM: '#f87171',
}

export const DEPOT_LABELS: Record<DepotKey, string> = {
  SPAK: 'SPAK — Klonowica',
  SPAD: 'SPAD — Dąbie',
  SPPK: 'SPPK — Pogodno',
  PKS:  'PKS Szczecin',
  TRAM: 'Tramwaje (EZP/EZG)',
}

export const DEPOT_ORDER: DepotKey[] = ['SPAK', 'SPAD', 'SPPK', 'PKS', 'TRAM']

// Mapuje depot ze schematu (z uwzględnieniem EZP/EZG → TRAM) na klucz designu
export function depotKey(depot: string): DepotKey {
  if (depot === 'EZP' || depot === 'EZG') return 'TRAM'
  if (depot === 'SPAK' || depot === 'SPAD' || depot === 'SPPK' || depot === 'PKS') return depot
  return 'SPAK'
}

// Zwraca klucz zajezdni dla linii (linie tramwajowe → TRAM)
export function lineDepotKey(depots: string[]): DepotKey {
  if (depots.includes('EZP') || depots.includes('EZG')) return 'TRAM'
  return depotKey(depots[0] ?? 'SPAK')
}

export function depotColor(depot: string): string {
  return DEPOT_COLORS[depotKey(depot)]
}

// Status delay → kolor
export function delayColor(d: number): string {
  if (d < -2) return '#f85149' // delayed
  if (d > 1)  return '#58a6ff' // early
  return '#3fb950'             // on-time
}

export function delayLabel(d: number): string {
  if (d === 0) return 'o czasie'
  if (d < 0) return `${d} min`
  return `+${d} min`
}
