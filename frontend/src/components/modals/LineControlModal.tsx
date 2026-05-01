import { useCallback, useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useDispatchStore, type Line } from '../../store/dispatchStore'
import { apiClient } from '../../api/client'
import { LineBadge } from '../LineBadge'
import { DEPOT_ORDER, DEPOT_COLORS, DEPOT_LABELS, lineDepotKey, type DepotKey } from '@/lib/depotColors'
import { Button } from '@/components/ui/button'

type Props = { onClose: () => void }

function groupByDepot(lines: Line[]) {
  const groups: Record<DepotKey, Line[]> = { SPAK: [], SPAD: [], SPPK: [], PKS: [], TRAM: [] }
  for (const line of lines) groups[lineDepotKey(line.depots)].push(line)
  return DEPOT_ORDER.filter(d => groups[d].length > 0).map(d => ({ depot: d, lines: groups[d] }))
}

export function LineControlModal({ onClose }: Props) {
  const token = useAuthStore(s => s.token)
  const user  = useAuthStore(s => s.user)
  const { lines, setLines } = useDispatchStore()
  const [filter, setFilter]           = useState('')
  const [depotFilter, setDepotFilter] = useState<'ALL' | DepotKey>('ALL')

  const api = apiClient(token!)

  const loadLines = useCallback(async () => {
    const res = await api.get('/api/dispatch/lines')
    if (res.ok) setLines(await res.json())
  }, [token])
  useEffect(() => { loadLines() }, [loadLines])

  const visible = user?.role === 'DEPOT_DISPATCHER' && user?.depotId
    ? lines.filter(l => l.depots.includes(user.depotId!))
    : lines

  const filtered = visible
    .filter(l => !filter || l.number.toLowerCase().includes(filter.toLowerCase()))
    .filter(l => depotFilter === 'ALL' || lineDepotKey(l.depots) === depotFilter)

  const myUserId = user?.userId
  const myCount = lines.filter(l => l.session?.userId === myUserId).length

  async function takeLine(id: string) {
    await api.post('/api/dispatch/sessions/claim', { lineIds: [id] })
    loadLines()
  }
  async function releaseLine(id: string) {
    await api.delete('/api/dispatch/sessions/release', { lineIds: [id] })
    loadLines()
  }
  async function takeDepotLines(depot: DepotKey) {
    const ids = filtered
      .filter(l => lineDepotKey(l.depots) === depot && !l.session)
      .map(l => l.id)
    if (ids.length) {
      await api.post('/api/dispatch/sessions/claim', { lineIds: ids })
      loadLines()
    }
  }
  async function releaseDepotLines(depot: DepotKey) {
    const ids = lines
      .filter(l => lineDepotKey(l.depots) === depot && l.session?.userId === myUserId)
      .map(l => l.id)
    if (ids.length) {
      await api.delete('/api/dispatch/sessions/release', { lineIds: ids })
      loadLines()
    }
  }
  async function releaseAll() {
    await api.delete('/api/dispatch/sessions/release-all')
    loadLines()
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surf border border-border2 rounded-[10px] shadow-2xl flex flex-col overflow-hidden"
        style={{ minWidth: 560, maxWidth: 660, maxHeight: '82vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-[18px] pt-3.5 pb-2.5 border-b border-border">
          <div className="flex items-center gap-2.5 mb-2">
            <span className="text-sm font-semibold">Kontrola linii</span>
            <div className="ml-auto flex items-center gap-2">
              <span className="font-mono text-xs text-text-dim">
                Kontrolujesz: <strong className="text-spak">{myCount}</strong> linii
              </span>
              {myCount > 0 && (
                <button
                  onClick={releaseAll}
                  className="px-2.5 py-0.5 rounded text-[10px] cursor-pointer border border-border2 bg-transparent text-text-dim hover:border-delayed hover:text-delayed"
                >
                  Zdaj wszystkie
                </button>
              )}
            </div>
          </div>
          <div className="flex gap-1 flex-wrap">
            <input
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Szukaj linii…"
              className="bg-surf2 border border-border rounded-md px-2.5 py-1 text-xs text-foreground outline-none focus:border-spak"
              style={{ width: 160 }}
            />
            {(['ALL', ...DEPOT_ORDER] as const).map(k => {
              const active = depotFilter === k
              const c = k === 'ALL' ? '#60a5fa' : DEPOT_COLORS[k]
              const label = k === 'ALL' ? 'Wszystkie' : k === 'TRAM' ? 'Tram' : k
              return (
                <button
                  key={k}
                  onClick={() => setDepotFilter(k)}
                  className="px-2.5 py-1 rounded font-mono text-[10px] cursor-pointer transition-colors"
                  style={{
                    border: `1px solid ${active ? c : 'var(--border2)'}`,
                    background: active ? `${c}1f` : 'transparent',
                    color: active ? c : 'var(--text-dim)',
                  }}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto">
          {groupByDepot(filtered).map(({ depot, lines }) => {
            const col = DEPOT_COLORS[depot]
            const avail = lines.filter(l => !l.session).length
            const myInDepot = lines.filter(l => l.session?.userId === myUserId).length
            return (
              <div key={depot}>
                <div className="px-3.5 py-1.5 bg-surf2 border-y border-border flex items-center gap-2 sticky top-0 z-10">
                  <div className="w-[3px] h-3.5 rounded-sm flex-shrink-0" style={{ background: col }} />
                  <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: col }}>
                    {DEPOT_LABELS[depot]}
                  </span>
                  <span className="font-mono text-[9px] text-text-dim">{myInDepot}/{lines.length}</span>
                  <div className="ml-auto flex gap-1">
                    {avail > 0 && (
                      <button
                        onClick={() => takeDepotLines(depot)}
                        className="px-2.5 py-0.5 rounded text-[10px] cursor-pointer transition-colors"
                        style={{ border: `1px solid ${col}55`, background: `${col}0d`, color: col }}
                      >
                        Przejmij dostępne ({avail})
                      </button>
                    )}
                    {myInDepot > 0 && (
                      <button
                        onClick={() => releaseDepotLines(depot)}
                        className="px-2.5 py-0.5 rounded text-[10px] cursor-pointer border border-border2 bg-transparent text-text-dim hover:border-delayed hover:text-delayed"
                      >
                        Zdaj zajezdnię
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 px-3.5 py-2">
                  {lines.map(line => {
                    const isMine = line.session?.userId === myUserId
                    const taken  = !!line.session && !isMine
                    const lcol   = DEPOT_COLORS[lineDepotKey(line.depots)]
                    return (
                      <div
                        key={line.id}
                        className="flex items-center gap-1 px-1.5 py-1 rounded-md transition-opacity"
                        style={{
                          background: isMine ? `${lcol}1f` : 'var(--surf2)',
                          border: `1.5px solid ${isMine ? lcol : 'var(--border)'}`,
                          opacity: taken ? 0.45 : 1,
                        }}
                      >
                        <LineBadge number={line.number} depots={line.depots} size="sm" />
                        {isMine ? (
                          <button
                            onClick={() => releaseLine(line.id)}
                            className="px-1.5 py-px rounded-sm border border-border2 bg-transparent text-text-dim text-[9px] cursor-pointer font-mono hover:border-delayed hover:text-delayed"
                          >
                            zdaj
                          </button>
                        ) : taken ? (
                          <span className="text-[8px] text-text-off font-mono">zajęta</span>
                        ) : (
                          <button
                            onClick={() => takeLine(line.id)}
                            className="px-1.5 py-px rounded-sm bg-transparent text-[9px] cursor-pointer font-mono"
                            style={{ border: `1px solid ${lcol}55`, color: lcol }}
                          >
                            przejmij
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        <div className="px-4 py-2.5 border-t border-border flex justify-end">
          <Button onClick={onClose}>Zamknij</Button>
        </div>
      </div>
    </div>
  )
}
