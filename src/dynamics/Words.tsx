import { useMemo } from 'react'

// Universal body-text entrance: splits a string into word spans, each rising from
// below with an incremental delay (a staggered, per-word reveal). RTL-safe — words
// stay in document order and the parent's `dir` handles direction.
export function Words({
  text,
  className,
  delay = 0,
  step = 0.04,
}: {
  text: string
  className?: string
  delay?: number
  step?: number
}) {
  const parts = useMemo(() => text.split(/(\s+)/), [text])
  let wi = 0
  return (
    <span className={`words${className ? ` ${className}` : ''}`} aria-label={text}>
      {parts.map((part, i) => {
        if (/^\s+$/.test(part) || part === '') return <span key={i}> </span>
        const d = delay + wi * step
        wi += 1
        return (
          <span key={i} className="words__w" aria-hidden style={{ animationDelay: `${d}s` }}>
            {part}
          </span>
        )
      })}
    </span>
  )
}
