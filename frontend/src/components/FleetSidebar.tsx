import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useDispatchStore, type Line } from '../store/dispatchStore'
import { useTrackingStore } from '../store/trackingStore'
import { apiClient } from '../api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'

const TODAY = new Date().toISOString().split('T')[0]

const DEPOT_ORDER = ['SPAK', 'SPAD', 'SPPK', 'PKS', 'EZP/EZG']

const DEPOT_LABELS: Record<string, string> = {
  SPAK:    'Klonowica (bus)',
  SPAD:    'Dąbie (bus)',
  SPPK:    'Pogodno (bus)',
  PKS:     'PKS Szczecin (bus)',
  'EZP/EZG': 'Tramwaje — Pogodno + Golęcin',
}

function groupByDepot(lines: Line[]) {
  const groups: Record<string, Line[]> = {}
  for (const line of lines) {
    // Linie tramwajowe obsługiwane przez oba depoty → jedna wspólna sekcja
    const isTramShared = line.depots.includes('EZP') && line.depots.includes('EZG')
    const key = isTramShared ? 'EZP/EZG' : (line.depots[0] ?? 'INNE')
    if (!groups[key]) groups[key] = []
    groups[key].push(line)
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
  const { token, user, logout }               = useAuthStore()
  const { lines, setLines }                   = useDispatchStore()
  const { positions }                         = useTrackingStore()
  const [tab, setTab]                         = useState<Tab>('available')
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [vehicleForm, setVehicleForm]         = useState({ vehicleId: '', line: '', brigade: '', date: TODAY })
  const [vehicles, setVehicles]               = useState<any[]>([])
  const [msg, setMsg]                         = useState<{ type: 'ok' | 'err', text: string } | null>(null)

  const api = apiClient(token!)

  const loadLines = useCallback(async () => {
    const res = await api.get('/api/dispatch/lines')
    if (res.ok) setLines(await res.json())
  }, [token])

  useEffect(() => {
    loadLines()
    api.get('/api/vehicles').then(r => r.json()).then(setVehicles)
    const hb   = setInterval(() => api.post('/api/dispatch/sessions/heartbeat'), 60_000)
    const poll = setInterval(loadLines, 15_000)
    return () => { clearInterval(hb); clearInterval(poll) }
  }, [loadLines])

  function showMsg(type: 'ok' | 'err', text: string) {
    setMsg({ type, text })
    setTimeout(() => setMsg(null), 3000)
  }

  async function claimLine(lineId: string) {
    const res = await api.post('/api/dispatch/sessions/claim', { lineIds: [lineId] })
    const data = await res.json()
    res.ok ? showMsg('ok', 'Linia przejęta') : showMsg('err', data.error)
    loadLines()
  }

  async function releaseLine(lineId: string) {
    await api.delete('/api/dispatch/sessions/release', { lineIds: [lineId] })
    loadLines()
  }

  async function claimDepot(depotId: string) {
    // EZP/EZG to wspólna sekcja — używamy depotu usera lub 'EZP' jako klucza
    const effectiveDepot = depotId === 'EZP/EZG'
      ? (user?.depotId ?? 'EZP')
      : depotId
    const res = await api.post('/api/dispatch/sessions/claim-depot', { depotId: effectiveDepot })
    const data = await res.json()
    res.ok ? showMsg('ok', `Przejęto ${data.claimed} linii zajezdni ${depotId}`) : showMsg('err', data.error)
    loadLines()
  }

  async function releaseDepot(depot: string, depotLines: Line[]) {
    const ids = depotLines.filter(l => l.session?.userId === myUserId).map(l => l.id)
    await api.delete('/api/dispatch/sessions/release', { lineIds: ids })
    showMsg('ok', `Zwolniono linie zajezdni ${depot}`)
    loadLines()
  }

  async function handleVehicleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const res = await api.post('/api/assignments', vehicleForm)
    const data = await res.json()
    if (res.ok) {
      showMsg('ok', `Pojazd zalogowany na ${vehicleForm.line}/${vehicleForm.brigade}`)
      setShowVehicleForm(false)
      setVehicleForm({ vehicleId: '', line: '', brigade: '', date: TODAY })
    } else {
      showMsg('err', data.error)
    }
  }

  const myUserId = user?.userId

  // DEPOT_DISPATCHER widzi tylko linie swojej zajezdni
  const visibleLines = user?.role === 'DEPOT_DISPATCHER' && user?.depotId
    ? lines.filter(l => l.depots.includes(user.depotId!))
    : lines

  const myLines   = visibleLines.filter(l => l.session?.userId === myUserId)
  const available = visibleLines.filter(l => !l.session)
  const displayed = tab === 'mine' ? myLines : tab === 'available' ? available : visibleLines
  const activeVehicles = Array.from(positions.values()).filter(p => p.line)

  return (
    <div className="w-75 min-w-75 h-screen bg-card border-r border-border flex flex-col text-sm overflow-hidden">

      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex justify-between items-start">
          <div>
            <div className="text-base font-bold text-foreground">FleetCore</div>
            <div className="text-xs text-primary mt-0.5">{ROLE_LABELS[user?.role ?? '']}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{user?.email}</div>
            {user?.depotId && (
              <div className="text-xs text-muted-foreground">Zajezdnia: {user.depotId}</div>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="text-xs h-7">
            Wyloguj
          </Button>
        </div>
      </div>

      {/* Komunikat */}
      {msg && (
        <div className={`mx-3 mt-2 px-3 py-2 rounded-md text-xs ${
          msg.type === 'ok'
            ? 'bg-green-950 text-green-300 border border-green-800'
            : 'bg-red-950 text-red-300 border border-red-800'
        }`}>
          {msg.type === 'ok' ? '✓' : '✗'} {msg.text}
        </div>
      )}

      {user?.role !== 'DRIVER' && (
        <>
          {/* Taby */}
          <div className="flex gap-1 px-3 pt-3">
            {([
              ['mine',      `Moje (${myLines.length})`],
              ['available', `Wolne (${available.length})`],
              ['all',       `Wszystkie (${lines.length})`],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`flex-1 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer border-0 ${
                  tab === key
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Lista linii */}
          <div className="flex-1 overflow-y-auto px-3 py-2">
            {displayed.length === 0 && (
              <p className="text-xs text-muted-foreground py-2">Brak linii</p>
            )}
            {(() => {
              const groups = groupByDepot(displayed)
              const depots = [
                ...DEPOT_ORDER.filter(d => groups[d]),
                ...Object.keys(groups).filter(d => !DEPOT_ORDER.includes(d)),
              ]
              return depots.map(depot => {
                const depotLines  = groups[depot]
                const iOwnSome    = depotLines.some(l => l.session?.userId === myUserId)
                return (
                  <div key={depot} className="mb-2">
                    {/* Nagłówek zajezdni */}
                    <div className="flex justify-between items-center px-2.5 py-2 mt-1 bg-secondary rounded-lg border-l-[3px] border-muted-foreground">
                      <div>
                        <div className="text-sm font-bold text-foreground">{depot}</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">
                          {DEPOT_LABELS[depot] ?? depot} · {depotLines.length} linii
                        </div>
                      </div>
                      {iOwnSome ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => releaseDepot(depot, depotLines)}
                          className="text-[10px] h-6 px-2 border-red-800 text-red-400 bg-red-950 hover:bg-red-900 hover:text-red-300"
                        >
                          Zdaj kontrolę
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => claimDepot(depot)}
                          className="text-[10px] h-6 px-2"
                        >
                          Przejmij wszystkie
                        </Button>
                      )}
                    </div>

                    {/* Linie */}
                    {depotLines.map(line => {
                      const isMine  = !!line.session && line.session.userId === myUserId
                      const isTaken = !!line.session && !isMine
                      return (
                        <div
                          key={line.id}
                          className={`flex justify-between items-center px-2.5 py-1.5 rounded-md mb-0.5 border-l-[3px] ${
                            isMine  ? 'bg-blue-950/50 border-primary' :
                            isTaken ? 'bg-secondary border-muted' :
                                      'bg-secondary border-green-600'
                          }`}
                        >
                          <div>
                            <span className={`font-semibold text-sm ${isTaken ? 'text-muted-foreground' : 'text-foreground'}`}>
                              {line.vehicleType === 'tram' ? '🔴' : '🔵'} {line.number}
                            </span>
                            {(line.type === 'night' || line.subtype === 'semi-fast' || line.subtype === 'fast') && (
                              <Badge variant="secondary" className="ml-1.5 text-[9px] px-1 py-0 h-4">
                                {line.type === 'night' ? 'NOC' : 'POSP'}
                              </Badge>
                            )}
                            {isTaken && (
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {line.session!.user.email}
                              </div>
                            )}
                          </div>
                          {isMine && (
                            <Button variant="outline" size="sm" onClick={() => releaseLine(line.id)}
                              className="text-[10px] h-5 px-2">
                              Zwolnij
                            </Button>
                          )}
                          {!line.session && (
                            <Button size="sm" onClick={() => claimLine(line.id)}
                              className="text-[10px] h-5 px-2 bg-green-800 hover:bg-green-700 text-green-100">
                              Przejmij
                            </Button>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })
            })()}
          </div>
        </>
      )}

      {/* Aktywne pojazdy */}
      {activeVehicles.length > 0 && (
        <div className="border-t border-border px-3 py-2">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-1.5">
            Na trasie ({activeVehicles.length})
          </p>
          {activeVehicles.map(p => (
            <div key={p.vehicleId} className="flex justify-between py-1 border-b border-border/50 last:border-0">
              <span className="text-foreground/70 text-xs">{p.number}</span>
              <span className="text-muted-foreground text-xs">{p.line}/{p.brigade}</span>
            </div>
          ))}
        </div>
      )}

      <Separator />

      {/* Formularz logowania pojazdu */}
      <div className="p-3">
        {!showVehicleForm ? (
          <Button className="w-full" onClick={() => setShowVehicleForm(true)}>
            + Zaloguj pojazd na brygadę
          </Button>
        ) : (
          <form onSubmit={handleVehicleLogin} className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground">Logowanie na brygadę</p>
            <select
              required value={vehicleForm.vehicleId}
              onChange={e => setVehicleForm(f => ({ ...f, vehicleId: e.target.value }))}
              className="w-full h-8 rounded-md border border-input bg-secondary text-foreground text-xs px-2 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value=''>Wybierz pojazd...</option>
              {vehicles.map((v: any) => (
                <option key={v.id} value={v.id}>{v.number} — {v.depot}</option>
              ))}
            </select>
            <div className="flex gap-1.5">
              <Input required placeholder="Linia" value={vehicleForm.line}
                onChange={e => setVehicleForm(f => ({ ...f, line: e.target.value }))}
                className="text-xs h-8" />
              <Input required placeholder="Brygada" value={vehicleForm.brigade}
                onChange={e => setVehicleForm(f => ({ ...f, brigade: e.target.value }))}
                className="text-xs h-8" />
            </div>
            <Input type="date" required value={vehicleForm.date}
              onChange={e => setVehicleForm(f => ({ ...f, date: e.target.value }))}
              className="text-xs h-8" />
            <div className="flex gap-1.5">
              <Button type="submit" className="flex-1 text-xs h-8">Zaloguj</Button>
              <Button type="button" variant="outline" onClick={() => setShowVehicleForm(false)}
                className="text-xs h-8">Anuluj</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
