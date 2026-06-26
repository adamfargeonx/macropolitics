---
name: sync
description: Pull latest changes from GitHub into all local projects
command: true
---

# Sync Command

Pull remote changes into every project that has a GitHub remote.

## Implementation

```bash
for dir in ~/Claude/projects/*/; do
  name=$(basename "$dir")
  remote=$(git -C "$dir" remote get-url origin 2>/dev/null)
  if [ -n "$remote" ]; then
    echo "→ $name"
    git -C "$dir" pull --ff-only 2>&1 | tail -1
  fi
done
```

## Usage

```
/sync
```

Run this on your Mac after finishing a mobile cloud session to pull any committed changes back to your local projects.
