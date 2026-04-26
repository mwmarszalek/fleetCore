import { create } from 'zustand'

export type VehiclePosition = {
  vehicleId: string
  number: string
  depot: string
  type: string
  line: string | null
  brigade: string | null
  lat: number
  lng: number
  speed: number
  heading: number
}

type TrackingStore = {
  positions: Map<string, VehiclePosition>
  connected: boolean
  setPositions: (positions: VehiclePosition[]) => void
  setConnected: (connected: boolean) => void
}

export const useTrackingStore = create<TrackingStore>((set) => ({
  positions: new Map(),
  connected: false,
  setPositions: (positions) =>
    set({ positions: new Map(positions.map(p => [p.vehicleId, p])) }),
  setConnected: (connected) => set({ connected }),
}))
