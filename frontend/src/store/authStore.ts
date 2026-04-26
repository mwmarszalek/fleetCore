import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type AuthUser = {
  userId: string
  email: string
  role: 'CENTRAL_DISPATCHER' | 'DEPOT_DISPATCHER' | 'DRIVER'
  cityId: string
  depotId: string | null
  vehicleId: string | null
}

type AuthStore = {
  token: string | null
  user: AuthUser | null
  login: (token: string, user: AuthUser) => void
  logout: () => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'fleetcore-auth' }
  )
)
