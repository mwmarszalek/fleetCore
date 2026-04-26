import { FleetSidebar } from '../components/FleetSidebar'
import { FleetMap } from '../components/FleetMap'

export function Dashboard() {
  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <FleetSidebar />
      <div style={{ flex: 1 }}>
        <FleetMap />
      </div>
    </div>
  )
}
