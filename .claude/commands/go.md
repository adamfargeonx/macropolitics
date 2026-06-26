---
name: go
description: Universal session launcher — detects Mac vs cloud and routes to the right workflow
command: true
---

# Go Command

Single entry point for every session. Detects whether running on Mac or in a cloud sandbox and routes accordingly.

## Detection

Run this shell check first:

```bash
[ -d "$HOME/Claude/projects" ] && echo "MAC" || echo "CLOUD"
```

---

## If MAC (online)

Mac is on. Remote Control can be active. Work directly on local projects.

1. List projects with last commit date:
```bash
for dir in ~/Claude/projects/*/; do
  name=$(basename "$dir")
  remote=$(git -C "$dir" remote get-url origin 2>/dev/null)
  last=$(git -C "$dir" log -1 --format="%cr" 2>/dev/null || echo "no commits")
  dirty=$(git -C "$dir" status --short 2>/dev/null | wc -l | tr -d ' ')
  [ -n "$remote" ] && echo "  $name — $last${dirty:+ ($dirty uncommitted)}"
done
```

2. Ask: "Which project? I'll open it and keep your Mac awake for mobile."

3. Once chosen:
   - `cd ~/Claude/projects/<name>`
   - Run `caffeinate -d &` to keep Mac awake for Remote Control
   - Check for uncommitted changes and surface them
   - Ask what to work on

---

## If CLOUD (offline)

Mac is off. Running in cloud sandbox. Work via GitHub clone.

1. Show project list:
```
1. macropolitics   — Hebrew geopolitical data-viz (React + Vite + Canvas)
2. state-of-mind   — Particle brain interactive (React + Vite + r3f)
3. kiro            — Cyberpunk food-delivery brand site (React + Vite + Three.js)
4. parallax        — Hebrew geopolitical publication (Astro 4)
5. mouth-off       — Hot sauce brand site (React + Vite)
6. meshek-43       — Hebrew RTL Next.js brand site
7. maris           — Scroll-driven deep-sea editorial site
8. the-dateline    — Weekly history newsletter (Node + Vercel)
9. fashion-newsletter — Style & Table weekly (Node + nodemailer)
```

2. Check if a project is already cloned in the current directory:
```bash
[ -f "package.json" ] && echo "ALREADY_CLONED" || echo "NEEDS_CLONE"
```
   - If already cloned: resume work, skip to step 4
   - If not: ask which number

3. Clone and install:
```bash
git clone https://github.com/adamfargeonx/<project-name>
cd <project-name>
npm install
```

4. Confirm ready. Ask what to work on.

5. **End-of-session reminder:** Before the user leaves, remind them:
   > "Remember to `git push` so your Mac can sync with `/sync` when it's back online."

---

## Session end (both modes)

When the user signals they're done (says "done", "that's it", "bye", "finished", "wrap up"):
- **Mac mode:** Ask if they want to commit + push before closing
- **Cloud mode:** Remind to `git push` if there are uncommitted changes
