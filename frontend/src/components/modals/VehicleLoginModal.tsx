import { useEffect, useState } from 'react'
import { useAuthStore } from '../../store/authStore'
import { useDispatchStore } from '../../store/dispatchStore'
import { apiClient } from '../../api/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const TODAY = new Date().toISOString().split('T')[0]

type Props = { onClose: () => void }

export function VehicleLoginModal({ onClose }: Props) {
  const token = useAuthStore(s => s.token)
  const { lines } = useDispatchStore()
  const [vehicles, setVehicles] = useState<any[]>([])
  const [form, setForm] = useState({ vehicleId: '', line: '', brigade: '', date: TODAY })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const api = apiClient(token!)

  useEffect(() => {
    api.get('/api/vehicles').then(r => r.json()).then(setVehicles)
  }, [])

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const res = await api.post('/api/assignments', form)
    const data = await res.json()
    setSubmitting(false)
    if (!res.ok) return setError(data.error)
    setDone(true)
    setTimeout(onClose, 1600)
  }

  const allLines = lines.map(l => l.number).sort()

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-surf border border-border2 rounded-[10px] shadow-2xl p-5"
        style={{ minWidth: 380, maxWidth: 460 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="text-[15px] font-semibold mb-1">Logowanie pojazdu na brygadę</div>
        <div className="text-xs text-text-dim mb-4">Przypisz pojazd do linii i numeru brygady</div>

        {done ? (
          <div className="text-center py-6 text-on-time">
            <div className="text-[32px] mb-2">✓</div>
            <div className="text-sm font-semibold">Pojazd zalogowany</div>
            <div className="text-xs text-text-dim mt-1">Brygada {form.line}/{form.brigade}</div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Pojazd</Label>
              <select
                required value={form.vehicleId}
                onChange={e => setForm(f => ({ ...f, vehicleId: e.target.value }))}
                className="w-full bg-surf2 border border-border2 rounded-md px-2.5 py-2 font-mono text-[13px] text-foreground outline-none focus:border-spak"
              >
                <option value="">Wybierz pojazd…</option>
                {vehicles.map((v: any) => (
                  <option key={v.id} value={v.id}>{v.number} — {v.depot}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1.5">
                <Label>Linia</Label>
                <select
                  required value={form.line}
                  onChange={e => setForm(f => ({ ...f, line: e.target.value }))}
                  className="w-full bg-surf2 border border-border2 rounded-md px-2.5 py-2 font-mono text-[13px] text-foreground outline-none focus:border-spak"
                >
                  <option value="">—</option>
                  {allLines.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Numer brygady</Label>
                <Input
                  required value={form.brigade}
                  onChange={e => setForm(f => ({ ...f, brigade: e.target.value }))}
                  placeholder="np. 5"
                  className="font-mono"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Dzień roboczy</Label>
              <Input
                type="date" required value={form.date}
                onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                className="font-mono"
              />
            </div>

            {error && (
              <div className="px-3 py-2 rounded text-xs bg-red-950 text-red-300 border border-red-800">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <Button type="button" variant="outline" onClick={onClose}>Anuluj</Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Logowanie…' : 'Zaloguj pojazd'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
