import { FleetSidebar } from '../components/FleetSidebar'
import { FleetMap } from '../components/FleetMap'

export function Dashboard() {
  return (
    <div className="flex w-screen h-screen overflow-hidden">
      <FleetSidebar />
      <div className="flex-1">
        <FleetMap />
      </div>
    </div>
  )
}
