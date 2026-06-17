#!/bin/sh
# Self-sustaining LOCAL data refresh for macropolitics — runs every 2 months via launchd
# (com.macropolitics.refresh). Pulls fresh World Bank figures, gates them, commits locally.
#
# FAIL-SAFE: any gate failure reverts the generated file, so a bad cycle changes NOTHING.
# AUTO-HANDOFF: if this repo ever gains an `origin` remote (i.e. you pushed it to GitHub), this
#   local job stands down and the cloud workflow (.github/workflows/refresh-data.yml) owns the
#   refresh instead — machine-independent, no double-runs. Nothing to remember to switch off.
#
# Log: .refresh.log in the repo root. Run on demand: launchctl start com.macropolitics.refresh
set -u
export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:${PATH:-}"
REPO="/Users/adamfargeon/Claude/projects/macropolitics"
LOG="$REPO/.refresh.log"
cd "$REPO" || exit 1

{
  echo "=== $(date -u +%Y-%m-%dT%H:%M:%SZ) refresh start ==="

  # Auto-handoff: once the project is on GitHub, the cloud Action owns this. Stand down.
  if git remote get-url origin >/dev/null 2>&1; then
    echo "origin remote present -> GitHub Actions owns the refresh; local job deferring. Done."
    echo "=== done (deferred) ==="
    exit 0
  fi

  # 1) fetch + validate (the script is itself fail-safe: aborts non-zero, writes nothing, on trouble)
  if ! node scripts/refresh-data.mjs; then
    echo "refresh aborted by its own fail-safe -> no changes this cycle."
    echo "=== done (no change) ==="
    exit 0
  fi

  # 2) hard gate: calibration invariants
  if ! node --experimental-strip-types scripts/check-model.ts >/dev/null 2>&1; then
    echo "GATE FAILED (check-model) -> reverting figures, no commit."
    git checkout -- src/data/figures.generated.ts
    echo "=== done (gate fail, reverted) ==="
    exit 1
  fi

  # 3) hard gate: typecheck + production build
  if ! npm run build >/dev/null 2>&1; then
    echo "GATE FAILED (build) -> reverting figures, no commit."
    git checkout -- src/data/figures.generated.ts
    echo "=== done (gate fail, reverted) ==="
    exit 1
  fi

  # 4) commit locally only if the data actually changed
  if git diff --quiet -- src/data/figures.generated.ts; then
    echo "no data change this cycle."
  else
    git add src/data/figures.generated.ts
    git commit -q -m "chore(data): scheduled World Bank refresh"
    echo "committed refreshed data."
  fi
  echo "=== done OK ==="
} >> "$LOG" 2>&1
