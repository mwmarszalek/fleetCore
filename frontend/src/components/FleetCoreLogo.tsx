type Props = {
  size?: number
  color?: 'gradient' | 'white' | string
  className?: string
}

export function FleetCoreLogo({ size = 40, color = 'gradient', className = '' }: Props) {
  const isGradient = color === 'gradient'
  const fill = isGradient ? 'url(#logo-grad)' : color

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {isGradient && (
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#e9d5ff" />
          </linearGradient>
        </defs>
      )}
      <path d="M60 160 C 60 100, 100 80, 150 70 L 150 40 C 90 50, 40 80, 40 160 Z" fill={fill} />
      <path d="M40 160 Q 40 40, 140 40 L 140 60 Q 60 60, 60 160 Z" fill={fill} />
      <path d="M75 120 L 85 115" stroke="white" strokeWidth="3" strokeDasharray="5 5" />
      <path d="M100 95 L 115 90" stroke="white" strokeWidth="3" strokeDasharray="5 5" />
    </svg>
  )
}
