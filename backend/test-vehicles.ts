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

// Test 1 — lista wszystkich pojazdów
await req('Lista wszystkich pojazdów', 200, '/api/vehicles', { headers: HEADERS })

// Test 2 — dodaj nowy pojazd
const { body: created } = await req('Dodaj nowy pojazd 9999', 201, '/api/vehicles', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ number: '9999', depot: 'SPAK', type: 'SOLARIS' }),
})

// Test 3 — walidacja: pusty number i brak type → 400
await req('Walidacja — brak type, pusty number', 400, '/api/vehicles', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ number: '', depot: 'SPAK' }),
})

// Test 4 — duplikat numeru → 409
await req('Duplikat numeru 1089', 409, '/api/vehicles', {
  method: 'POST',
  headers: JSON_HEADERS,
  body: JSON.stringify({ number: '1089', depot: 'SPAD', type: 'MAN' }),
})

// Test 5 — pobierz pojazd po ID
const id = (created as any).id
await req('Pobierz pojazd 9999 po ID', 200, `/api/vehicles/${id}`, { headers: HEADERS })

// Test 6 — edytuj pojazd
await req('Edytuj pojazd 9999 — zmień zajezdnię na SPAD', 200, `/api/vehicles/${id}`, {
  method: 'PUT',
  headers: JSON_HEADERS,
  body: JSON.stringify({ depot: 'SPAD', type: 'MAN' }),
})

// Test 7 — usuń pojazd → 204
await req('Usuń pojazd 9999', 204, `/api/vehicles/${id}`, {
  method: 'DELETE',
  headers: HEADERS,
})

// Test 8 — nieistniejący pojazd → 404
await req('Nieistniejący pojazd', 404, '/api/vehicles/nie-istnieje', { headers: HEADERS })
