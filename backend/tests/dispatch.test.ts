export {}

const BASE = 'http://localhost:3000'
const JSON = { 'Content-Type': 'application/json' }

async function login(email: string, password: string) {
  const res = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST', headers: JSON,
    body: globalThis.JSON.stringify({ email, password, cityId: 'szczecin' }),
  })
  const data = await res.json() as any
  return data.token as string
}

async function req(label: string, expectedStatus: number, url: string, options?: RequestInit) {
  const res = await fetch(BASE + url, options)
  const body = await res.json()
  const ok = res.status === expectedStatus ? '✅' : '❌'
  console.log(`\n${ok} ${label} [${res.status}, oczekiwano: ${expectedStatus}]`)
  if (res.status !== expectedStatus || process.env.VERBOSE) {
    console.log(globalThis.JSON.stringify(body, null, 2))
  }
  return { res, body }
}

// Logowanie
const centralToken = await login('central@fleetcore.app', 'admin123')
const depotToken   = await login('spak@fleetcore.app', 'spak123')
const driverToken  = await login('kierowca1089@fleetcore.app', 'kierowca123')

const auth = (token: string) => ({ Authorization: `Bearer ${token}` })

// Pobierz ID linii z bazy
const linesRes = await fetch(`${BASE}/api/dispatch/lines`, { headers: auth(centralToken) })
const allLines = await linesRes.json() as any[]
const line53 = allLines.find((l: any) => l.number === '53')
const line54 = allLines.find((l: any) => l.number === '54') // SPAD — nie SPAK
const line1  = allLines.find((l: any) => l.number === '1')

console.log(`\nLinie: ${allLines.length} total | linia 53: ${line53?.id?.slice(0,8)}... | linia 54: ${line54?.id?.slice(0,8)}...`)

// Test 1 — lista linii (dostępna bez sekcji session)
await req('Lista linii — wszystkie dostępne', 200, '/api/dispatch/lines', { headers: auth(centralToken) })

// Test 2 — dyspozytor centralny przejmuje linię 53
await req('Central: przejmij linię 53', 200, '/api/dispatch/sessions/claim', {
  method: 'POST', headers: { ...JSON, ...auth(centralToken) },
  body: globalThis.JSON.stringify({ lineIds: [line53.id] }),
})

// Test 3 — linia 53 jest teraz zajęta
const { body: lines2 } = await req('Linia 53 jest teraz przejęta', 200, '/api/dispatch/lines', { headers: auth(depotToken) })
const l53status = (lines2 as any[]).find((l: any) => l.number === '53')
const isClaimed = l53status?.session !== null
console.log(`   → linia 53 przejęta: ${isClaimed ? '✅' : '❌'} (session: ${globalThis.JSON.stringify(l53status?.session?.user?.email)})`)

// Test 4 — dyspozytor SPAK nie może przejąć linii 54 (należy do SPAD)
await req('SPAK dispatcher: błąd przy linii 54 (SPAD)', 403, '/api/dispatch/sessions/claim', {
  method: 'POST', headers: { ...JSON, ...auth(depotToken) },
  body: globalThis.JSON.stringify({ lineIds: [line54.id] }),
})

// Test 5 — dyspozytor SPAK może przejąć linię 53 (SPAK) — ale jest zajęta przez central
await req('SPAK dispatcher: błąd — linia 53 zajęta przez central', 409, '/api/dispatch/sessions/claim', {
  method: 'POST', headers: { ...JSON, ...auth(depotToken) },
  body: globalThis.JSON.stringify({ lineIds: [line53.id] }),
})

// Test 6 — kierowca nie może przejmować linii
await req('Driver: brak uprawnień do przejmowania', 403, '/api/dispatch/sessions/claim', {
  method: 'POST', headers: { ...JSON, ...auth(driverToken) },
  body: globalThis.JSON.stringify({ lineIds: [line1.id] }),
})

// Test 7 — przejmij wszystkie linie zajezdni SPAK jednym kliknięciem
await req('Central: przejmij wszystkie linie SPAK', 200, '/api/dispatch/sessions/claim-depot', {
  method: 'POST', headers: { ...JSON, ...auth(centralToken) },
  body: globalThis.JSON.stringify({ depotId: 'SPAK' }),
})

// Test 8 — heartbeat odnawia sesję
await req('Heartbeat — odnów sesję', 200, '/api/dispatch/sessions/heartbeat', {
  method: 'POST', headers: auth(centralToken),
})

// Test 9 — zwolnij linię 53
await req('Central: zwolnij linię 53', 200, '/api/dispatch/sessions/release', {
  method: 'DELETE', headers: { ...JSON, ...auth(centralToken) },
  body: globalThis.JSON.stringify({ lineIds: [line53.id] }),
})

// Test 10 — zwolnij wszystkie sesje
await req('Central: zwolnij wszystkie linie', 200, '/api/dispatch/sessions/release-all', {
  method: 'DELETE', headers: auth(centralToken),
})

// Test 11 — brak tokena
await req('Błąd: brak autoryzacji', 401, '/api/dispatch/lines')
