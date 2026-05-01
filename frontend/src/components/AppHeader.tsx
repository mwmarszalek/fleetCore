import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/authStore'

export type Tab = 'map' | 'punctuality' | 'brigades'

type Props = {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onOpenLineControl: () => void
  onOpenVehicleLogin: () => void
  myLinesCount: number
  delayedCount: number
}

function Clock() {
  const [t, setT] = useState(new Date())
  useEffect(() => {
    const id = setInterval(() => setT(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span className="font-mono text-[13px] text-foreground">
      {pad(t.getHours())}:{pad(t.getMinutes())}:{pad(t.getSeconds())}
    </span>
  )
}

const TABS: [Tab, string][] = [
  ['map',         '🗺  Mapa'],
  ['punctuality', '📊 Punktualność'],
  ['brigades',    '🚌 Brygady'],
]

export function AppHeader({
  activeTab, onTabChange, onOpenLineControl, onOpenVehicleLogin,
  myLinesCount, delayedCount,
}: Props) {
  const user   = useAuthStore(s => s.user)
  const logout = useAuthStore(s => s.logout)
  const initials = user?.email.slice(0, 2).toUpperCase() ?? 'MM'

  return (
    <header className="col-span-full flex items-center gap-3 px-4 h-11 bg-card border-b border-border z-50">
      {/* Logo */}
      <div className="flex items-center gap-1.5 font-mono text-[15px] font-medium tracking-tight">
        <div className="w-2 h-2 rounded-full bg-spak shadow-[0_0_6px_var(--spak)] animate-pulse" />
        FleetCore
      </div>

      <Sep />
      <span className="text-xs text-text-dim font-medium">Centrala Ruchu ZDiTM</span>
      <Sep />

      {/* Tabs */}
      <div className="flex gap-0.5">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => onTabChange(key)}
            className={`px-3 py-1 rounded-[5px] text-xs font-medium transition-colors cursor-pointer ${
              activeTab === key
                ? 'bg-surf3 text-foreground'
                : 'text-text-dim hover:bg-surf2 hover:text-foreground'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        {/* Kontrola Linii */}
        <button
          onClick={onOpenLineControl}
          className="flex items-center gap-1.5 px-3 h-7 rounded-md border border-border2 bg-surf2 text-foreground text-[11px] cursor-pointer hover:bg-surf3"
        >
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
          </svg>
          Kontrola Linii
          {myLinesCount > 0 && (
            <span className="font-mono text-[10px] text-spak font-semibold">{myLinesCount}</span>
          )}
        </button>

        {/* Logowanie Pojazdów */}
        <button
          onClick={onOpenVehicleLogin}
          className="px-3 h-7 rounded-md border border-border2 bg-surf2 text-foreground text-[11px] cursor-pointer hover:bg-surf3"
        >
          Logowanie Pojazdów
        </button>

        {/* Notifications */}
        <button
          title={`${delayedCount} opóźnień`}
          className="relative w-7 h-7 rounded-md border border-border bg-surf2 flex items-center justify-center cursor-pointer text-text-dim hover:text-foreground"
        >
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          {delayedCount > 0 && (
            <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-delayed" />
          )}
        </button>

        <Clock />
        <Sep />

        {/* User + logout */}
        <div className="relative group">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-surf2 rounded-md border border-border cursor-pointer">
            <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-br from-spad to-spak flex items-center justify-center text-[10px] font-semibold text-white">
              {initials}
            </div>
            <span className="text-xs whitespace-nowrap">{user?.email.split('@')[0]}</span>
          </div>
          <div className="absolute right-0 top-full mt-1 w-44 bg-surf border border-border2 rounded-md shadow-lg p-1 hidden group-hover:block z-50">
            <div className="px-2.5 py-1.5 border-b border-border mb-1">
              <div className="text-xs text-foreground">{user?.email}</div>
              <div className="text-[10px] text-text-dim mt-0.5">
                {user?.role === 'CENTRAL_DISPATCHER' ? 'Dyspozytor Centralny'
                  : user?.role === 'DEPOT_DISPATCHER' ? `Dyspozytor ${user?.depotId}`
                  : 'Kierowca'}
              </div>
            </div>
            <button
              onClick={logout}
              className="w-full text-left px-2.5 py-1.5 text-xs rounded text-text-dim hover:bg-surf2 hover:text-delayed cursor-pointer"
            >
              Wyloguj
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

function Sep() {
  return <div className="w-px h-5 bg-border" />
}
