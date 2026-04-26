import { useState } from 'react'
import { useAuthStore } from '../store/authStore'
import { loginRequest } from '../api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const TEST_ACCOUNTS = [
  { email: 'central@fleetcore.app',      password: 'admin123',    role: 'Dyspozytor Centralny' },
  { email: 'spak@fleetcore.app',         password: 'spak123',     role: 'Dyspozytor SPAK' },
  { email: 'spad@fleetcore.app',         password: 'spad123',     role: 'Dyspozytor SPAD' },
  { email: 'sppk@fleetcore.app',         password: 'sppk123',     role: 'Dyspozytor SPPK' },
  { email: 'pks@fleetcore.app',          password: 'pks123',      role: 'Dyspozytor PKS' },
  { email: 'ezp@fleetcore.app',          password: 'ezp123',      role: 'Dyspozytor EZP (tram)' },
  { email: 'ezg@fleetcore.app',          password: 'ezg123',      role: 'Dyspozytor EZG (tram)' },
  { email: 'kierowca1089@fleetcore.app', password: 'kierowca123', role: 'Kierowca 1089' },
]

export function LoginPage() {
  const login = useAuthStore(s => s.login)
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { ok, data } = await loginRequest(email, password, 'szczecin')
    setLoading(false)
    if (!ok) return setError(data.error ?? 'Błąd logowania')
    login(data.token, data.user)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-[380px] bg-card rounded-xl p-10 shadow-2xl border border-border">

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">FleetCore</h1>
          <p className="text-muted-foreground text-sm mt-1">System zarządzania transportem</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email" type="email" required
              placeholder="email@fleetcore.app"
              value={email} onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Hasło</Label>
            <Input
              id="password" type="password" required
              placeholder="••••••••"
              value={password} onChange={e => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-3">
            Konta testowe
          </p>
          <div className="space-y-1.5">
            {TEST_ACCOUNTS.map(a => (
              <button
                key={a.email}
                type="button"
                onClick={() => { setEmail(a.email); setPassword(a.password) }}
                className="w-full flex justify-between items-center px-3 py-2 rounded-md bg-secondary hover:bg-secondary/80 transition-colors cursor-pointer text-left"
              >
                <span className="text-xs text-foreground/70">{a.email}</span>
                <span className="text-xs text-muted-foreground">{a.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
