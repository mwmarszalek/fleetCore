import { lineDepotKey, DEPOT_COLORS, depotColor } from '@/lib/depotColors'

type Props = {
  number: string
  depots?: string[]
  depot?: string
  size?: 'sm' | 'md'
}

export function LineBadge({ number, depots, depot, size = 'md' }: Props) {
  const color = depots
    ? DEPOT_COLORS[lineDepotKey(depots)]
    : depot
      ? depotColor(depot)
      : '#60a5fa'

  const dim = size === 'sm'
    ? 'h-[17px] min-w-[28px] text-[10px]'
    : 'h-[22px] min-w-[36px] text-[11px]'

  return (
    <div
      className={`${dim} px-1.5 inline-flex items-center justify-center rounded font-mono font-medium`}
      style={{
        background: `${color}1f`,
        color,
        border: `1px solid ${color}44`,
      }}
    >
      {number}
    </div>
  )
}
