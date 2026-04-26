export {}

const BASE = 'http://localhost:3000'
const JSON_HEADERS = { 'Content-Type': 'application/json', 'x-city-id': 'szczecin' }
const HEADERS = { 'x-city-id': 'szczecin' }
const TODAY = new Date().toISOString().split('T')[0]

async function req(label: string, expectedStatus: number, url: string, options?: RequestInit) {
  const res = await fetch(BASE + url, options)
  const body = res.status === 204 ? '(brak treści)' : await res.json()
  const ok = res.status === expectedStatus ? '✅' : '❌'
  console.log(`\n${ok} ${label} [${res.status}, oczekiwano: ${expectedStatus}]`)
  console.log(JSON.stringify(body, null, 2))
  return { res, body }
}

// Pobierz ID pojazdów ze seeda
const vehicles = await fetch(`${BASE}/api/vehicles`, { headers: HEADERS }).then(r => r.json()) as any[]
const spak1 = vehicles.find((v: any) => v.number === '1089') // SPAK SOLARIS
const spak2 = vehicles.find((v: any) => v.number === '1152') // SPAK SOLARIS
if (!spak1 || !spak2) throw new Error('Seed vehicles not found — uruchom npm run db:seed')

console.log(`\nUżywam pojazdów: ${spak1.number} (${spak1.id}) i ${spak2.number} (${spak2.id})`)
console.log(`Dzień roboczy: ${TODAY}`)

// Test 1 — aktywne brygady (na początku puste lub z poprzednich testów)
await req('Aktywne brygady', 200, '/api/assignments/active', { headers: HEADERS })

// Test 2 — zaloguj pojazd 1089 na brygadę 53/6
const { body: assignment1 } = await req('Login: pojazd 1089 → linia 53, brygada 6', 201, '/api/assignments', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ vehicleId: spak1.id, line: '53', brigade: '6', date: TODAY }),
})

// Test 3 — zaloguj pojazd 1152 na brygadę 75/2
const { body: assignment2 } = await req('Login: pojazd 1152 → linia 75, brygada 2', 201, '/api/assignments', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ vehicleId: spak2.id, line: '75', brigade: '2', date: TODAY }),
})

// Test 4 — aktywne brygady (powinny być 2)
await req('Aktywne brygady (powinny być ≥2)', 200, '/api/assignments/active', { headers: HEADERS })

// Test 5 — duplikat: pojazd 1089 próbuje zalogować się na drugą brygadę
await req('Błąd: pojazd 1089 już zalogowany', 409, '/api/assignments', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ vehicleId: spak1.id, line: '75', brigade: '1', date: TODAY }),
})

// Test 6 — duplikat: ktoś próbuje zalogować się na brygadę 53/6 która jest zajęta
await req('Błąd: brygada 53/6 już zajęta', 409, '/api/assignments', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ vehicleId: spak2.id, line: '53', brigade: '6', date: TODAY }),
})

// Test 7 — lista wszystkich brygad na dzisiaj
await req(`Brygady na dzień ${TODAY}`, 200, `/api/assignments?date=${TODAY}`, { headers: HEADERS })

// Test 8 — wyloguj pojazd 1089
const id1 = (assignment1 as any).id
await req('Logout: pojazd 1089 z brygady 53/6', 200, `/api/assignments/${id1}/logout`, {
  method: 'POST',
  headers: HEADERS,
})

// Test 9 — ponowny logout (błąd)
await req('Błąd: pojazd 1089 już wylogowany', 409, `/api/assignments/${id1}/logout`, {
  method: 'POST',
  headers: HEADERS,
})

// Test 10 — wyloguj pojazd 1152
const id2 = (assignment2 as any).id
await req('Logout: pojazd 1152 z brygady 75/2', 200, `/api/assignments/${id2}/logout`, {
  method: 'POST',
  headers: HEADERS,
})

// Test 11 — aktywne brygady (powinny być puste)
await req('Aktywne brygady po wylogowaniu (powinny być puste)', 200, '/api/assignments/active', { headers: HEADERS })
