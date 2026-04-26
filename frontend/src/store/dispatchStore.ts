import { create } from 'zustand'

export type LineSession = {
  userId: string
  claimedAt: string
  expiresAt: string
  user: { email: string; role: string; depotId: string | null }
}

export type Line = {
  id: string
  number: string
  type: string
  subtype: string
  vehicleType: string
  depots: string[]
  session: LineSession | null
}

type DispatchStore = {
  lines: Line[]
  setLines: (lines: Line[]) => void
}

export const useDispatchStore = create<DispatchStore>((set) => ({
  lines: [],
  setLines: (lines) => set({ lines }),
}))
