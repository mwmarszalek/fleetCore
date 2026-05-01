import { create } from 'zustand'

export type DirectionInfo = {
  geometry: { type: string; coordinates: [number, number][] }
  from: string
  to: string
}

export type LineTrajectory = {
  directionA: DirectionInfo | null
  directionB: DirectionInfo | null
}

type Store = {
  trajectories: Map<string, LineTrajectory>
  setTrajectory: (lineNumber: string, data: LineTrajectory) => void
}

export const useTrajectoryStore = create<Store>((set) => ({
  trajectories: new Map(),
  setTrajectory: (lineNumber, data) =>
    set(s => {
      const m = new Map(s.trajectories)
      m.set(lineNumber, data)
      return { trajectories: m }
    }),
}))
