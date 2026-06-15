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
  // Precompute each part's word-index (whitespace parts get -1) so render stays pure —
  // no counter mutated mid-map (which Strict Mode's double-render would corrupt).
  const parts = useMemo(() => {
    let wi = 0
    return text.split(/(\s+)/).map((part) => {
      const isSpace = /^\s+$/.test(part) || part === ''
      return { part, wordIndex: isSpace ? -1 : wi++ }
    })
  }, [text])
  return (
    <span className={`words${className ? ` ${className}` : ''}`} aria-label={text}>
      {parts.map(({ part, wordIndex }, i) =>
        wordIndex < 0 ? (
          <span key={i}> </span>
        ) : (
          <span key={i} className="words__w" aria-hidden style={{ animationDelay: `${delay + wordIndex * step}s` }}>
            {part}
          </span>
        ),
      )}
    </span>
  )
}
