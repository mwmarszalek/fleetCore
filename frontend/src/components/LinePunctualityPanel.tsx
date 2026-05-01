import React, { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { useDispatchStore } from '../store/dispatchStore'
import { useTrackingStore } from '../store/trackingStore'
import { useTrajectoryStore, type DirectionInfo } from '../store/trajectoryStore'
import { apiClient } from '../api/client'
import { DEPOT_COLORS, lineDepotKey } from '@/lib/depotColors'
import { mockDelay, mockProgress, delayLabelShort } from '@/lib/mock'

type Props = {
  lineNumber: string
  onClose: () => void
}

type Mode = 'wide' | 'sbs'

function chipStyle(delay: number) {
  if (delay < -2) return { bg: 'rgba(248,81,73,0.18)',  border: 'rgba(248,81,73,0.55)',  text: '#f85149' }
  if (delay > 1)  return { bg: 'rgba(88,166,255,0.18)', border: 'rgba(88,166,255,0.55)', text: '#58a6ff' }
  return              { bg: 'rgba(63,185,80,0.15)',  border: 'rgba(63,185,80,0.45)',  text: '#3fb950' }
}

type Vehicle = { vehicleId: string; number: string; type: string; brigade: string | null }

// Compute progress once, sort, then assign rows — threshold 9% prevents chip overlap
function assignRows(vehicles: Vehicle[], progressFn: (id: string) => number) {
  const withProgress = vehicles.map(v => ({ ...v, progress: progressFn(v.vehicleId) }))
  withProgress.sort((a, b) => a.progress - b.progress)
  const lastPerRow: number[] = []
  return withProgress.map(v => {
    let row = 0
    while (lastPerRow[row] !== undefined && v.progress - lastPerRow[row] < 0.09) row++
    lastPerRow[row] = v.progress
    return { ...v, row }
  })
}

function IconWide() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1.5 6h9"/>
      <path d="M4 4L1.5 6 4 8"/>
      <path d="M8 4l2.5 2L8 8"/>
    </svg>
  )
}
function IconSbs() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="0.75" y="1" width="10.5" height="10" rx="0.8"/>
      <line x1="6" y1="1" x2="6" y2="11"/>
    </svg>
  )
}

const MODE_ICONS: Record<Mode, () => React.ReactElement> = {
  wide: IconWide,
  sbs:  IconSbs,
}
const MODE_TITLES: Record<Mode, string> = {
  wide: 'Jeden pod drugim',
  sbs:  'Obok siebie',
}

function DirectionBar({
  dir, vehicles, depotColor, label, progressFn, sbs,
}: {
  dir: DirectionInfo
  vehicles: Vehicle[]
  depotColor: string
  label: string
  progressFn: (id: string) => number
  sbs: boolean
}) {
  const withRows = assignRows(vehicles, progressFn)
  const maxRow   = withRows.reduce((m, v) => Math.max(m, v.row), 0)
  const barH     = 12 + (maxRow + 1) * 24 + 8

  return (
    <div className={`${sbs ? 'flex-1 min-w-0' : ''} px-4 pt-2 pb-3`}>
      <div className="text-[11px] text-text-dim mb-2 font-medium">{label}</div>

      <div className="relative" style={{ height: Math.max(barH, 48) }}>
        <div
          className="absolute bottom-0 left-0 right-0 rounded-full"
          style={{ height: 8, background: depotColor, opacity: 0.6 }}
        />
        <div className="absolute bottom-0 w-3 h-3 rounded-full border-2"
          style={{ left: -2, background: depotColor, borderColor: '#161b22' }} />
        <div className="absolute bottom-0 w-3 h-3 rounded-full border-2"
          style={{ right: -2, background: depotColor, borderColor: '#161b22' }} />

        {withRows.map(v => {
          const delay = mockDelay(v.vehicleId)
          const cs    = chipStyle(delay)
          return (
            <div
              key={v.vehicleId}
              title={`${v.number} · ${v.type}`}
              className="absolute flex items-center gap-0.5 px-1.5 rounded text-[10px] font-mono font-medium border cursor-default select-none whitespace-nowrap"
              style={{
                bottom: 12 + v.row * 24,
                left: `${v.progress * 100}%`,
                transform: 'translateX(-50%)',
                background: cs.bg,
                borderColor: cs.border,
                color: cs.text,
              }}
            >
              {v.brigade ? `B${v.brigade}` : '?'} {delayLabelShort(delay)}
            </div>
          )
        })}
      </div>

      <div className="flex justify-between mt-1">
        <span className="text-[10px] text-text-dim truncate max-w-[45%]">{dir.from}</span>
        <span className="text-[10px] text-text-dim truncate max-w-[45%] text-right">{dir.to}</span>
      </div>
    </div>
  )
}

export function LinePunctualityPanel({ lineNumber, onClose }: Props) {
  const token      = useAuthStore(s => s.token)
  const { lines }  = useDispatchStore()
  const { positions } = useTrackingStore()
  const { trajectories, setTrajectory } = useTrajectoryStore()

  const [visible, setVisible] = useState(false)
  const [mode,    setMode]    = useState<Mode>('wide')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    if (trajectories.has(lineNumber)) return
    setLoading(true)
    setError(null)
    apiClient(token!).get(`/api/dispatch/trajectories/${lineNumber}`)
      .then(res => res.ok ? res.json() : Promise.reject(res.status))
      .then(data => setTrajectory(lineNumber, data))
      .catch(() => setError('Nie udało się pobrać trasy'))
      .finally(() => setLoading(false))
  }, [lineNumber, token])

  function handleClose() {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const traj     = trajectories.get(lineNumber)
  const line     = lines.find(l => l.number === lineNumber)
  const color    = line ? DEPOT_COLORS[lineDepotKey(line.depots)] : DEPOT_COLORS.SPAK
  const vehicles = Array.from(positions.values()).filter(v => v.line === lineNumber)

  // mockProgress < 0.5 → direction A,  >= 0.5 → direction B
  // Progress is re-mapped to 0–1 within each direction
  const vehiclesA = vehicles.filter(v => mockProgress(v.vehicleId) < 0.5)
  const vehiclesB = vehicles.filter(v => mockProgress(v.vehicleId) >= 0.5)
  const progressA = (id: string) => mockProgress(id) * 2
  const progressB = (id: string) => (mockProgress(id) - 0.5) * 2

  const terminus = traj?.directionA
    ? `${traj.directionA.from} ↔ ${traj.directionA.to}`
    : null

  const isSbs = mode === 'sbs'

  return (
    <div
      className="absolute top-1/2 left-1/2 z-40 rounded-xl border border-border flex flex-col shadow-2xl"
      style={{
        width: 'calc(100% - 2rem)',
        maxWidth: 'calc(100% - 2rem)',
        background: 'rgba(22,27,34,0.80)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        transform: `translate(-50%, -50%) scale(${visible ? 1 : 0.95})`,
        opacity: visible ? 1 : 0,
        transition: 'transform 200ms ease-out, opacity 200ms ease-out',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-4 h-10 border-b border-border shrink-0">
        <span className="font-mono text-sm font-semibold shrink-0" style={{ color }}>
          {lineNumber}
        </span>
        {terminus && (
          <span className="text-[11px] text-text-dim truncate">{terminus}</span>
        )}

        <span className="ml-auto text-[11px] text-text-dim shrink-0 pl-4">
          {vehicles.length} {vehicles.length === 1 ? 'pojazd' : vehicles.length < 5 ? 'pojazdy' : 'pojazdów'}
        </span>

        {/* Mode switcher */}
        <div className="flex items-center rounded border border-border overflow-hidden shrink-0">
          {(['wide', 'sbs'] as const).map(m => {
            const Icon = MODE_ICONS[m]
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                title={MODE_TITLES[m]}
                className={`w-6 h-6 flex items-center justify-center cursor-pointer transition-colors ${
                  mode === m
                    ? 'bg-surf3 text-foreground'
                    : 'text-text-dim hover:bg-surf2 hover:text-foreground'
                }`}
              >
                <Icon />
              </button>
            )
          })}
        </div>

        <button
          onClick={handleClose}
          className="w-6 h-6 flex items-center justify-center rounded text-text-dim hover:text-foreground hover:bg-surf2 cursor-pointer shrink-0"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 1 L9 9 M9 1 L1 9" />
          </svg>
        </button>
      </div>

      {/* Body */}
      {loading && (
        <div className="flex items-center justify-center h-20 text-text-dim text-xs">
          Ładowanie trasy…
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center h-20 text-xs" style={{ color: '#f85149' }}>
          {error}
        </div>
      )}
      {!loading && !error && traj && (
        <div className={isSbs ? 'flex divide-x divide-border' : 'flex flex-col divide-y divide-border'}>
          {traj.directionA && (
            <DirectionBar
              dir={traj.directionA}
              vehicles={vehiclesA}
              depotColor={color}
              label={`→ ${traj.directionA.to}`}
              progressFn={progressA}
              sbs={isSbs}
            />
          )}
          {traj.directionB && (
            <DirectionBar
              dir={traj.directionB}
              vehicles={vehiclesB}
              depotColor={color}
              label={`→ ${traj.directionB.to}`}
              progressFn={progressB}
              sbs={isSbs}
            />
          )}
        </div>
      )}
    </div>
  )
}
