import { useState, useEffect, useCallback } from 'react'
import { useAuthStore } from '../store/authStore'
import { useDispatchStore, type Line } from '../store/dispatchStore'
import { useTrackingStore } from '../store/trackingStore'
import { apiClient } from '../api/client'
import { LineBadge } from './LineBadge'
import { DEPOT_ORDER, DEPOT_COLORS, DEPOT_LABELS, lineDepotKey, type DepotKey } from '@/lib/depotColors'

type Props = {
  watchedLines: Set<string>
  onToggleWatch: (lineNumber: string) => void
  onSelectLine: (lineNumber: string) => void
  selectedLine: string | null
}

function delayChipColor(delay: number) {
  if (delay < -8)  return { bg:'rgba(248,81,73,0.22)',  border:'rgba(248,81,73,0.6)',  text:'#f85149' }
  if (delay < -3)  return { bg:'rgba(248,81,73,0.12)',  border:'rgba(248,81,73,0.35)', text:'#f87171' }
  if (delay <= 0)  return { bg:'rgba(125,133,144,0.12)', border:'rgba(125,133,144,0.3)', text:'#8b949e' }
  if (delay <= 2)  return { bg:'rgba(88,166,255,0.10)', border:'rgba(88,166,255,0.3)', text:'#79b8ff' }
  return               { bg:'rgba(88,166,255,0.20)',  border:'rgba(88,166,255,0.55)', text:'#58a6ff' }
}

function delayLabel(d: number): string {
  if (d === 0) return '0'
  if (d < 0) return `${d}`
  return `+${d}`
}

function groupByDepot(lines: Line[]) {
  const groups: Record<DepotKey, Line[]> = { SPAK: [], SPAD: [], SPPK: [], PKS: [], TRAM: [] }
  for (const line of lines) {
    groups[lineDepotKey(line.depots)].push(line)
  }
  return DEPOT_ORDER.filter(d => groups[d].length > 0).map(d => ({ depot: d, lines: groups[d] }))
}

export function FleetSidebar({ watchedLines, onToggleWatch, onSelectLine, selectedLine }: Props) {
  const token       = useAuthStore(s => s.token)
  const user        = useAuthStore(s => s.user)
  const { lines, setLines } = useDispatchStore()
  const { positions } = useTrackingStore()
  const [filter, setFilter] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const api = apiClient(token!)

  const loadLines = useCallback(async () => {
    const res = await api.get('/api/dispatch/lines')
    if (res.ok) setLines(await res.json())
  }, [token])

  useEffect(() => {
    loadLines()
    const hb   = setInterval(() => api.post('/api/dispatch/sessions/heartbeat'), 60_000)
    const poll = setInterval(loadLines, 15_000)
    return () => { clearInterval(hb); clearInterval(poll) }
  }, [loadLines])

  const myUserId = user?.userId
  const myLines = lines
    .filter(l => l.session?.userId === myUserId)
    .filter(l => !filter || l.number.toLowerCase().includes(filter.toLowerCase()))

  const grouped = groupByDepot(myLines)
  const vehiclesArr = Array.from(positions.values())

  return (
    <aside className="border-r border-border bg-card flex flex-col overflow-hidden">
      {/* Search */}
      <div className="p-2.5 border-b border-border">
        <input
          value={filter}
          onChange={e => setFilter(e.target.value)}
          placeholder="Szukaj linii…"
          className="w-full bg-surf2 border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground outline-none focus:border-spak placeholder:text-text-off"
        />
      </div>

      {/* Section header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-text-dim">
          Moje linie
        </span>
        <span className="font-mono text-[10px] text-text-dim bg-surf2 rounded-full px-1.5 py-px">
          {myLines.length}
        </span>
      </div>

      {/* Empty state */}
      {myLines.length === 0 && (
        <div className="px-4 py-6 text-[11px] text-text-dim text-center leading-relaxed">
          Brak kontrolowanych linii.<br/>
          <span className="text-spak">Użyj przycisku „Kontrola Linii"</span><br/>
          aby przejąć linie.
        </div>
      )}

      {/* Lines list */}
      <div className="flex-1 overflow-y-auto">
        {grouped.map(({ depot, lines }) => {
          const col = DEPOT_COLORS[depot]
          const isOpen = collapsed[depot] !== true

          return (
            <div key={depot}>
              {/* Depot header */}
              <div
                onClick={() => setCollapsed(c => ({ ...c, [depot]: isOpen }))}
                className="flex items-center gap-1.5 px-3 pt-1.5 pb-1 cursor-pointer select-none"
              >
                <div className="w-[3px] h-3 rounded-sm flex-shrink-0" style={{ background: col }} />
                <span className="text-[10px] font-semibold tracking-wider uppercase" style={{ color: col }}>
                  {DEPOT_LABELS[depot]}
                </span>
                <span className="font-mono text-[9px] text-text-dim">{lines.length}</span>
                <span className={`text-[8px] text-text-dim ml-auto transition-transform ${isOpen ? '' : '-rotate-90'}`}>
                  ▼
                </span>
              </div>

              {isOpen && lines.map(line => {
                const lineVehicles = vehiclesArr
                  .filter(v => v.line === line.number)
                  .map(v => ({ ...v, mockDelay: mockDelayFromId(v.vehicleId) })) // mock losowy
                  .sort((a, b) => a.mockDelay - b.mockDelay)

                const isWatched = watchedLines.has(line.number)
                const isSelected = selectedLine === line.number

                return (
                  <div
                    key={line.id}
                    onClick={() => onSelectLine(line.number)}
                    className={`flex flex-col items-start gap-1 px-3 pb-1.5 pt-1 cursor-pointer transition-colors ${
                      isSelected ? 'bg-surf3' : 'hover:bg-surf2'
                    }`}
                    style={{ borderLeft: `2px solid ${isWatched ? col : 'transparent'}` }}
                  >
                    {/* Line header */}
                    <div className="flex items-center w-full gap-1.5">
                      <LineBadge number={line.number} depots={line.depots} size="sm" />
                      <span className="text-xs font-medium text-foreground flex-1">{line.number}</span>
                      <span className="font-mono text-[10px] text-text-dim">{lineVehicles.length}×</span>
                      <button
                        title={isWatched ? 'Usuń z diagramu' : 'Dodaj do diagramu (max 3)'}
                        onClick={e => { e.stopPropagation(); onToggleWatch(line.number) }}
                        className="w-[18px] h-[18px] rounded-[3px] flex items-center justify-center text-[9px] cursor-pointer transition-colors"
                        style={{
                          border: `1px solid ${isWatched ? col : 'var(--border2)'}`,
                          background: isWatched ? `${col}22` : 'transparent',
                          color: isWatched ? col : 'var(--text-off)',
                        }}
                      >
                        {isWatched ? '◉' : '◎'}
                      </button>
                    </div>

                    {/* Vehicle delay chips */}
                    {lineVehicles.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 w-full">
                        {lineVehicles.map(v => {
                          const c = delayChipColor(v.mockDelay)
                          return (
                            <div
                              key={v.vehicleId}
                              title={`${v.brigade ?? '—'} · ${v.number}`}
                              className="flex items-center gap-1 px-1.5 py-px rounded-sm font-mono text-[10px]"
                              style={{ background: c.bg, border: `1px solid ${c.border}` }}
                            >
                              <span className="text-text-dim">{v.number}</span>
                              <span style={{ color: c.text, fontWeight: 600 }}>{delayLabel(v.mockDelay)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })}
      </div>
    </aside>
  )
}

// Mock losowy delay z ID pojazdu (deterministyczny) — do czasu prawdziwych rozkładów
function mockDelayFromId(id: string): number {
  let h = 0
  for (const c of id) h = (h << 5) - h + c.charCodeAt(0)
  const v = (h % 31) - 15  // -15..+15
  return v
}
