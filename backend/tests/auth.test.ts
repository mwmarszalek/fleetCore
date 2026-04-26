export {}

const BASE = 'http://localhost:3000'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function req(label: string, expectedStatus: number, url: string, options?: RequestInit) {
  const res = await fetch(BASE + url, options)
  const body = await res.json()
  const ok = res.status === expectedStatus ? '✅' : '❌'
  console.log(`\n${ok} ${label} [${res.status}, oczekiwano: ${expectedStatus}]`)
  console.log(JSON.stringify(body, null, 2))
  return { res, body }
}

// Test 1 — login dyspozytor centralny
const { body: central } = await req('Login: dyspozytor centralny', 200, '/api/auth/login', {
  method: 'POST', headers: JSON_HEADERS,
  body: JSON.stringify({ email: 'central@fleetcore.app', password: 'admin123', cityId: 'szczecin' }),
})
const centralToken = (central as any).token

// Test 2 — login dyspozytor zajezdni SPAK
const { body: depot } = await req('Login: dyspozytor SPAK', 200, '/api/auth/login', {
  method: 'POST', headers: JSON_HEADERS,
  body: JSON.stringify({ email: 'spak@fleetcore.app', password: 'spak123', cityId: 'szczecin' }),
})
const depotToken = (depot as any).token

// Test 3 — login kierowca
const { body: driver } = await req('Login: kierowca 1089', 200, '/api/auth/login', {
  method: 'POST', headers: JSON_HEADERS,
  body: JSON.stringify({ email: 'kierowca1089@fleetcore.app', password: 'kierowca123', cityId: 'szczecin' }),
})
const driverToken = (driver as any).token

// Test 4 — złe hasło
await req('Błąd: złe hasło', 401, '/api/auth/login', {
  method: 'POST', headers: JSON_HEADERS,
  body: JSON.stringify({ email: 'central@fleetcore.app', password: 'wrong', cityId: 'szczecin' }),
})

// Test 5 — nieistniejący user
await req('Błąd: nieistniejący user', 401, '/api/auth/login', {
  method: 'POST', headers: JSON_HEADERS,
  body: JSON.stringify({ email: 'nobody@fleetcore.app', password: 'test', cityId: 'szczecin' }),
})

// Test 6 — /me z tokenem centralnym
await req('GET /me — dyspozytor centralny', 200, '/api/auth/me', {
  headers: { Authorization: `Bearer ${centralToken}` },
})

// Test 7 — /me z tokenem zajezdni (sprawdź depotId)
await req('GET /me — dyspozytor SPAK (depotId = SPAK)', 200, '/api/auth/me', {
  headers: { Authorization: `Bearer ${depotToken}` },
})

// Test 8 — /me z tokenem kierowcy (sprawdź vehicleId)
await req('GET /me — kierowca (vehicleId present)', 200, '/api/auth/me', {
  headers: { Authorization: `Bearer ${driverToken}` },
})

// Test 9 — /me bez tokena
await req('Błąd: /me bez tokena', 401, '/api/auth/me')

// Test 10 — /me z nieprawidłowym tokenem
await req('Błąd: /me z fałszywym tokenem', 401, '/api/auth/me', {
  headers: { Authorization: 'Bearer fake.token.here' },
})
