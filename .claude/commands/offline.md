---
name: offline
description: Mac is offline — clone a GitHub project and set up the environment for a cloud session
command: true
---

# Offline Command

The user's Mac is offline. They want to work on a project via GitHub in this cloud session.

## What to do

1. Show this numbered list of their projects and ask which one to open:

```
1. macropolitics   — Hebrew geopolitical data-viz (React + Vite + Canvas)
2. state-of-mind   — Particle brain interactive (React + Vite + r3f)
3. kiro            — Cyberpunk food-delivery brand site (React + Vite + Three.js)
4. parallax        — Hebrew geopolitical publication (Astro 4)
5. mouth-off       — Hot sauce brand site (React + Vite)
6. meshek-43       — Hebrew RTL Next.js brand site
7. maris           — Scroll-driven deep-sea editorial site
8. the-dateline    — Weekly history newsletter (Node + Vercel)
```

2. Once the user picks a number, clone the repo:
   `git clone https://github.com/adamfargeonx/<project-name>`

3. `cd` into the project and run the appropriate install command:
   - React/Vite/Next.js projects: `npm install`
   - Astro projects: `npm install`
   - Node scripts: `npm install`

4. Confirm the environment is ready and ask what they'd like to work on.

## Important reminders

- At the end of the session, remind the user to `git push` so changes sync to GitHub
- When Mac is back online, they can run `/sync` to pull changes locally
