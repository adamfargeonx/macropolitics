import { useMemo } from 'react'

// Splits a string into per-CHARACTER spans, each carrying its index as `--ci` (a CSS custom
// property) so a caller can stagger a per-letter animation via `transition-delay: calc(var(--ci) * Ns)`.
// RTL-safe the same way `Words` is: characters stay in document order, the ancestor's `dir`
// handles visual direction. Used for the home wordmark's per-letter exit (see views.css
// `.home--leaving`) — the entrance keeps a single shared delay (no `--ci` variance) so it still
// reads as one "explode-blast," only the exit fans out letter by letter.
export function Letters({ text, className }: { text: string; className?: string }) {
  const chars = useMemo(() => Array.from(text), [text])
  return (
    <span className={`letters${className ? ` ${className}` : ''}`} aria-label={text}>
      {chars.map((ch, i) => (
        <span key={i} className="letters__ch" aria-hidden style={{ '--ci': i } as React.CSSProperties}>
          {ch}
        </span>
      ))}
    </span>
  )
}

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
