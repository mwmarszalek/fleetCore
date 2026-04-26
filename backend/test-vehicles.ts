export {}

const BASE = 'http://localhost:3000'
const JSON_HEADERS = { 'Content-Type': 'application/json', 'x-city-id': 'szczecin' }
const HEADERS = { 'x-city-id': 'szczecin' }

async function req(label: string, expectedStatus: number, url: string, options?: RequestInit) {
  const res = await fetch(BASE + url, options)
  const body = res.status === 204 ? '(brak treści)' : await res.json()
  const ok = res.status === expectedStatus ? '✅' : '❌'
  console.log(`\n${ok} ${label} [${res.status}, oczekiwano: ${expectedStatus}]`)
  console.log(JSON.stringify(body, null, 2))
  return { res, body }
}

// Cleanup — usuń pojazd testowy 9999 jeśli istnieje z poprzedniego testu
const existing = await fetch(`${BASE}/api/vehicles`, { headers: HEADERS }).then(r => r.json()) as any[]
const leftover = existing.find((v: any) => v.number === '9999')
if (leftover) {
  await fetch(`${BASE}/api/vehicles/${leftover.id}`, { method: 'DELETE', headers: HEADERS })
  console.log('🧹 Cleanup: usunięto pojazd 9999 z poprzedniego testu\n')
}

// Test 1 — lista pojazdów zawiera pole category
const { body: list } = await req('Lista pojazdów — pole category obecne', 200, '/api/vehicles', { headers: HEADERS })
const hasCategory = (list as any[]).every((v: any) => v.category === 'BUS' || v.category === 'TRAM')
console.log(hasCategory ? '✅ Wszystkie pojazdy mają pole category' : '❌ Brak pola category')

// Test 2 — dodaj autobus
const { body: bus } = await req('Dodaj autobus 9999 (BUS)', 201, '/api/vehicles', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ number: '9999', depot: 'SPAK', type: 'SOLARIS', category: 'BUS' }),
})

// Test 3 — dodaj tramwaj
const { body: tram } = await req('Dodaj tramwaj 8888 (TRAM)', 201, '/api/vehicles', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ number: '8888', depot: 'EZP', type: 'PESA', category: 'TRAM' }),
})

// Test 4 — brak category → 400
await req('Walidacja — brak category', 400, '/api/vehicles', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ number: '7777', depot: 'SPAK', type: 'SOLARIS' }),
})

// Test 5 — nieprawidłowa category → 400
await req('Walidacja — zła category (CAR)', 400, '/api/vehicles', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ number: '7777', depot: 'SPAK', type: 'SOLARIS', category: 'CAR' }),
})

// Test 6 — duplikat numeru → 409
await req('Duplikat numeru 1089', 409, '/api/vehicles', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ number: '1089', depot: 'SPAD', type: 'MAN', category: 'BUS' }),
})

// Test 7 — pobierz pojazd po ID i sprawdź category
const busId = (bus as any).id
await req('Pobierz autobus 9999 — category = BUS', 200, `/api/vehicles/${busId}`, { headers: HEADERS })

// Test 8 — zmień category z BUS na TRAM
await req('Edytuj 9999 — zmień category na TRAM', 200, `/api/vehicles/${busId}`, {
  method: 'PUT',
  headers: JSON_HEADERS,
  body: JSON.stringify({ category: 'TRAM' }),
})

// Test 9 — usuń autobus
await req('Usuń pojazd 9999', 204, `/api/vehicles/${busId}`, {
  method: 'DELETE',
  headers: HEADERS,
})

// Test 10 — usuń tramwaj
const tramId = (tram as any).id
await req('Usuń pojazd 8888', 204, `/api/vehicles/${tramId}`, {
  method: 'DELETE',
  headers: HEADERS,
})

// Test 11 — nieistniejący pojazd → 404
await req('Nieistniejący pojazd', 404, '/api/vehicles/nie-istnieje', { headers: HEADERS })
