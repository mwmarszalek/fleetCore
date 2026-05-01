export function mockDelay(vehicleId: string): number {
  let h = 0
  for (const c of vehicleId) h = (h << 5) - h + c.charCodeAt(0)
  return (h % 31) - 15
}

// Independent hash seed so progress ≠ delay for the same vehicle
export function mockProgress(vehicleId: string): number {
  let h = 5381
  for (const c of vehicleId) h = ((h * 33) ^ c.charCodeAt(0)) >>> 0
  return (h % 1000) / 1000
}

export function delayLabelShort(d: number): string {
  if (d === 0) return '0'
  return d < 0 ? `${d}` : `+${d}`
}
