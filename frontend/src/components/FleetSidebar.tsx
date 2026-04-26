import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useDispatchStore, type Line } from '../store/dispatchStore'
import { useTrackingStore } from '../store/trackingStore'
import { apiClient } from '../api/client'

const TODAY = new Date().toISOString().split('T')[0]

const DEPOT_ORDER = ['SPAK', 'SPAD', 'SPPK', 'PKS', 'EZP', 'EZG']

const DEPOT_LABELS: Record<string, string> = {
  SPAK: 'SPAK — Klonowica (bus)',
  SPAD: 'SPAD — Dąbie (bus)',
  SPPK: 'SPPK — Pogodno (bus)',
  PKS:  'PKS Szczecin (bus)',
  EZP:  'EZP — Pogodno (tram)',
  EZG:  'EZG — Golęcin (tram)',
}

function groupByDepot(lines: Line[]) {
  const groups: Record<string, Line[]> = {}
  for (const line of lines) {
    const depot = line.depots[0] ?? 'INNE'
    if (!groups[depot]) groups[depot] = []
    groups[depot].push(line)
  }
  return groups
}

const ROLE_LABELS: Record<string, string> = {
  CENTRAL_DISPATCHER: 'Dyspozytor Centralny',
  DEPOT_DISPATCHER:   'Dyspozytor Zajezdni',
  DRIVER:             'Kierowca',
}

type Tab = 'mine' | 'available' | 'all'

export function FleetSidebar() {
  const { token, user, logout }         = useAuthStore()
  const { lines, setLines }             = useDispatchStore()
  const { positions }                   = useTrackingStore()
  const [tab, setTab]                   = useState<Tab>('available')
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [vehicleForm, setVehicleForm]   = useState({ vehicleId: '', line: '', brigade: '', date: TODAY })
  const [vehicles, setVehicles]         = useState<any[]>([])
  const [msg, setMsg]                   = useState<{ type: 'ok' | 'err', text: string } | null>(null)

  const api = apiClient(token!)

  const loadLines = useCallback(async () => {
    const res = await api.get('/api/dispatch/lines')
    if (res.ok) setLines(await res.json())
  }, [token])

  useEffect(() => {
    loadLines()
    api.get('/api/vehicles').then(r => r.json()).then(setVehicles)
    // Heartbeat co 60s
    const hb = setInterval(() => api.post('/api/dispatch/sessions/heartbeat'), 60_000)
    // Odświeżaj linie co 15s
    const poll = setInterval(loadLines, 15_000)
    return () => { clearInterval(hb); clearInterval(poll) }
  }, [loadLines])

  async function claimLine(lineId: string) {
    const res = await api.post('/api/dispatch/sessions/claim', { lineIds: [lineId] })
    const data = await res.json()
    if (res.ok) { setMsg({ type: 'ok', text: 'Linia przejęta' }); loadLines() }
    else setMsg({ type: 'err', text: data.error })
    setTimeout(() => setMsg(null), 3000)
  }

  async function releaseLine(lineId: string) {
    await api.delete('/api/dispatch/sessions/release', { lineIds: [lineId] })
    loadLines()
  }

  async function claimDepot(depotId: string) {
    const res = await api.post('/api/dispatch/sessions/claim-depot', { depotId })
    const data = await res.json()
    if (res.ok) { setMsg({ type: 'ok', text: `Przejęto ${data.claimed} linii zajezdni ${depotId}` }); loadLines() }
    else setMsg({ type: 'err', text: data.error })
    setTimeout(() => setMsg(null), 3000)
  }

  async function handleVehicleLogin(e: React.FormEvent) {
    e.preventDefault()
    const res = await api.post('/api/assignments', vehicleForm)
    const data = await res.json()
    if (res.ok) {
      setMsg({ type: 'ok', text: `Pojazd zalogowany na ${vehicleForm.line}/${vehicleForm.brigade}` })
      setShowVehicleForm(false)
      setVehicleForm({ vehicleId: '', line: '', brigade: '', date: TODAY })
    } else {
      setMsg({ type: 'err', text: data.error })
    }
    setTimeout(() => setMsg(null), 4000)
  }

  const myUserId = user?.userId
  const myLines   = lines.filter(l => l.session?.userId === myUserId)
  const available = lines.filter(l => !l.session)

  const displayedLines: Line[] = tab === 'mine' ? myLines : tab === 'available' ? available : lines

  const isDriver = user?.role === 'DRIVER'

  return (
    <div style={{
      width: 300, minWidth: 300, height: '100vh',
      background: '#1a1f2e', color: '#e2e8f0',
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, sans-serif', fontSize: 13,
      overflowY: 'auto',
    }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #2d3748' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>FleetCore</div>
            <div style={{ fontSize: 11, color: '#63b3ed', marginTop: 2 }}>
              {ROLE_LABELS[user?.role ?? '']}
            </div>
            <div style={{ fontSize: 11, color: '#4a5568', marginTop: 1 }}>{user?.email}</div>
            {user?.depotId && (
              <div style={{ fontSize: 11, color: '#718096', marginTop: 1 }}>Zajezdnia: {user.depotId}</div>
            )}
          </div>
          <button onClick={logout} style={{
            background: 'transparent', border: '1px solid #4a5568',
            color: '#718096', padding: '4px 10px', borderRadius: 6,
            cursor: 'pointer', fontSize: 11,
          }}>
            Wyloguj
          </button>
        </div>
      </div>

      {/* Komunikat */}
      {msg && (
        <div style={{
          margin: '10px 12px 0', padding: '8px 12px', borderRadius: 6, fontSize: 12,
          background: msg.type === 'ok' ? '#1c4532' : '#742a2a',
          color: msg.type === 'ok' ? '#9ae6b4' : '#feb2b2',
        }}>
          {msg.type === 'ok' ? '✓' : '✗'} {msg.text}
        </div>
      )}

      {!isDriver && (
        <>
          {/* Taby */}
          <div style={{ display: 'flex', gap: 4, padding: '10px 12px 0' }}>
            {([['mine', `Moje (${myLines.length})`], ['available', `Wolne (${available.length})`], ['all', `Wszystkie (${lines.length})`]] as const).map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{
                flex: 1, padding: '5px 4px', borderRadius: 5, border: 'none', cursor: 'pointer',
                fontSize: 11, fontWeight: 600,
                background: tab === key ? '#3182ce' : '#252d3d',
                color: tab === key ? '#fff' : '#718096',
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* Lista linii pogrupowana po zajezdni */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
            {displayedLines.length === 0 && (
              <div style={{ color: '#4a5568', fontSize: 12, padding: '8px 0' }}>Brak linii</div>
            )}
            {(() => {
              const groups = groupByDepot(displayedLines)
              const depots = [...DEPOT_ORDER.filter(d => groups[d]), ...Object.keys(groups).filter(d => !DEPOT_ORDER.includes(d))]
              return depots.map(depot => (
                <div key={depot}>
                  {/* Nagłówek zajezdni */}
                  <div style={{
                    padding: '10px 10px 8px',
                    marginBottom: 4, marginTop: 6,
                    background: '#252d3d',
                    borderRadius: 8,
                    borderLeft: '3px solid #4a5568',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#e2e8f0' }}>
                        {depot}
                      </div>
                      <div style={{ fontSize: 10, color: '#718096', marginTop: 1 }}>
                        {DEPOT_LABELS[depot] ?? depot} · {groups[depot].length} linii
                      </div>
                    </div>
                    {(() => {
                      const depotLines = groups[depot]
                      const iOwnSome = depotLines.some(l => l.session?.userId === myUserId)
                      return iOwnSome ? (
                        <button
                          onClick={async () => {
                            const ids = depotLines.filter(l => l.session?.userId === myUserId).map(l => l.id)
                            await api.delete('/api/dispatch/sessions/release', { lineIds: ids })
                            setMsg({ type: 'ok', text: `Zwolniono linie zajezdni ${depot}` })
                            setTimeout(() => setMsg(null), 3000)
                            loadLines()
                          }}
                          style={{
                            background: '#2d1515', border: '1px solid #742a2a',
                            color: '#fc8181', padding: '4px 10px', borderRadius: 5,
                            cursor: 'pointer', fontSize: 10, fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Zdaj kontrolę
                        </button>
                      ) : (
                        <button
                          onClick={() => claimDepot(depot)}
                          style={{
                            background: '#2b4c8c', border: 'none',
                            color: '#90cdf4', padding: '4px 10px', borderRadius: 5,
                            cursor: 'pointer', fontSize: 10, fontWeight: 600,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          Przejmij wszystkie
                        </button>
                      )
                    })()}
                  </div>

                  {groups[depot].map(line => {
                    const isMine  = !!line.session && line.session.userId === myUserId
                    const isTaken = !!line.session && !isMine
                    return (
                      <div key={line.id} style={{
                        padding: '6px 9px', borderRadius: 6, marginBottom: 3,
                        background: isMine ? '#1a365d' : '#252d3d',
                        borderLeft: `3px solid ${isMine ? '#63b3ed' : isTaken ? '#4a5568' : '#48bb78'}`,
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <span style={{ fontWeight: 600, color: isTaken ? '#718096' : '#fff', fontSize: 13 }}>
                            {line.vehicleType === 'tram' ? '🔴' : '🔵'} {line.number}
                          </span>
                          <span style={{ color: '#4a5568', fontSize: 10, marginLeft: 5 }}>
                            {line.type === 'night' ? 'NOC' : line.subtype === 'semi-fast' || line.subtype === 'fast' ? 'POSP' : ''}
                          </span>
                          {isTaken && (
                            <div style={{ fontSize: 10, color: '#4a5568', marginTop: 1 }}>
                              {line.session!.user.email}
                            </div>
                          )}
                        </div>
                        {isMine && (
                          <button onClick={() => releaseLine(line.id)} style={{
                            background: 'transparent', border: '1px solid #4a5568',
                            color: '#718096', padding: '2px 8px', borderRadius: 4,
                            cursor: 'pointer', fontSize: 10,
                          }}>Zwolnij</button>
                        )}
                        {!line.session && (
                          <button onClick={() => claimLine(line.id)} style={{
                            background: '#276749', border: 'none',
                            color: '#9ae6b4', padding: '2px 8px', borderRadius: 4,
                            cursor: 'pointer', fontSize: 10,
                          }}>Przejmij</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))
            })()}
          </div>
        </>
      )}

      {/* Aktywne pojazdy */}
      {positions.size > 0 && (
        <div style={{ padding: '10px 12px', borderTop: '1px solid #2d3748' }}>
          <div style={{ fontSize: 11, color: '#718096', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
            Na trasie ({Array.from(positions.values()).filter(p => p.line).length})
          </div>
          {Array.from(positions.values()).filter(p => p.line).map(p => (
            <div key={p.vehicleId} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '4px 0', borderBottom: '1px solid #2d3748',
            }}>
              <span style={{ color: '#a0aec0' }}>{p.number}</span>
              <span style={{ color: '#718096', fontSize: 11 }}>{p.line}/{p.brigade}</span>
            </div>
          ))}
        </div>
      )}

      {/* Formularz logowania pojazdu */}
      <div style={{ padding: 12, borderTop: '1px solid #2d3748' }}>
        {!showVehicleForm ? (
          <button onClick={() => setShowVehicleForm(true)} style={{
            width: '100%', padding: '8px 0', borderRadius: 6, border: 'none',
            background: '#3182ce', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 13,
          }}>
            + Zaloguj pojazd na brygadę
          </button>
        ) : (
          <form onSubmit={handleVehicleLogin}>
            <div style={{ fontSize: 11, color: '#a0aec0', marginBottom: 8, fontWeight: 600 }}>Logowanie na brygadę</div>
            <select required value={vehicleForm.vehicleId}
              onChange={e => setVehicleForm(f => ({ ...f, vehicleId: e.target.value }))}
              style={inputStyle}>
              <option value=''>Wybierz pojazd...</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>{v.number} — {v.depot}</option>
              ))}
            </select>
            <div style={{ display: 'flex', gap: 6 }}>
              <input required placeholder='Linia' value={vehicleForm.line}
                onChange={e => setVehicleForm(f => ({ ...f, line: e.target.value }))}
                style={{ ...inputStyle, flex: 1 }} />
              <input required placeholder='Brygada' value={vehicleForm.brigade}
                onChange={e => setVehicleForm(f => ({ ...f, brigade: e.target.value }))}
                style={{ ...inputStyle, flex: 1 }} />
            </div>
            <input type='date' required value={vehicleForm.date}
              onChange={e => setVehicleForm(f => ({ ...f, date: e.target.value }))}
              style={inputStyle} />
            <div style={{ display: 'flex', gap: 6 }}>
              <button type='submit' style={{
                flex: 1, padding: '7px 0', borderRadius: 6, border: 'none',
                background: '#3182ce', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: 12,
              }}>Zaloguj</button>
              <button type='button' onClick={() => setShowVehicleForm(false)} style={{
                padding: '7px 10px', borderRadius: 6, border: '1px solid #4a5568',
                background: 'transparent', color: '#718096', cursor: 'pointer', fontSize: 12,
              }}>Anuluj</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 9px', borderRadius: 6, marginBottom: 8,
  border: '1px solid #4a5568', background: '#2d3748',
  color: '#e2e8f0', fontSize: 13, boxSizing: 'border-box',
}
