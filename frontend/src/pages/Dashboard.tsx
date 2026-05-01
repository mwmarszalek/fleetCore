import { useState } from 'react'
import { FleetSidebar } from '../components/FleetSidebar'
import { FleetMap } from '../components/FleetMap'
import { AppHeader, type Tab } from '../components/AppHeader'
import { LineControlModal } from '../components/modals/LineControlModal'
import { VehicleLoginModal } from '../components/modals/VehicleLoginModal'
import { useAuthStore } from '../store/authStore'
import { useDispatchStore } from '../store/dispatchStore'
import { useTrackingStore } from '../store/trackingStore'

export function Dashboard() {
  const user = useAuthStore(s => s.user)
  const { lines } = useDispatchStore()
  const { positions } = useTrackingStore()

  const [activeTab, setActiveTab]           = useState<Tab>('map')
  const [showLineControl, setShowLineControl] = useState(false)
  const [showVehicleLogin, setShowVehicleLogin] = useState(false)
  const [watchedLines, setWatchedLines]     = useState<Set<string>>(new Set())
  const [selectedLine, setSelectedLine]     = useState<string | null>(null)

  const myLines = lines.filter(l => l.session?.userId === user?.userId)
  const myLineNumbers = new Set(myLines.map(l => l.number))
  const myVehicles = Array.from(positions.values()).filter(v => v.line && myLineNumbers.has(v.line))
  // Mock delayed count
  const delayedCount = myVehicles.filter(v => mockDelay(v.vehicleId) < -2).length

  function toggleWatch(lineNumber: string) {
    setWatchedLines(s => {
      const n = new Set(s)
      if (n.has(lineNumber)) { n.delete(lineNumber); return n }
      if (n.size >= 3) return s
      n.add(lineNumber)
      return n
    })
  }

  return (
    <div
      className="grid h-screen overflow-hidden"
      style={{ gridTemplateRows: '44px 1fr', gridTemplateColumns: '280px 1fr' }}
    >
      <AppHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenLineControl={() => setShowLineControl(true)}
        onOpenVehicleLogin={() => setShowVehicleLogin(true)}
        myLinesCount={myLines.length}
        delayedCount={delayedCount}
      />

      <FleetSidebar
        watchedLines={watchedLines}
        onToggleWatch={toggleWatch}
        onSelectLine={(n) => setSelectedLine(s => s === n ? null : n)}
        selectedLine={selectedLine}
      />

      <main className="flex flex-col overflow-hidden">
        {activeTab === 'map' && <FleetMap />}
        {activeTab === 'punctuality' && (
          <div className="p-6 text-text-dim">Widok punktualności — Etap 2</div>
        )}
        {activeTab === 'brigades' && (
          <div className="p-6 text-text-dim">Widok brygad — Etap 2</div>
        )}
      </main>

      {showLineControl && <LineControlModal onClose={() => setShowLineControl(false)} />}
      {showVehicleLogin && <VehicleLoginModal onClose={() => setShowVehicleLogin(false)} />}
    </div>
  )
}

function mockDelay(id: string): number {
  let h = 0
  for (const c of id) h = (h << 5) - h + c.charCodeAt(0)
  return (h % 31) - 15
}
