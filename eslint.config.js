import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // '.claude/**' matters as much as 'dist': agent worktrees under .claude/worktrees/ carry their
  // own tsconfig.json, and typescript-eslint resolves its project root against the FILESYSTEM, not
  // git — so a gitignored worktree still made the root ambiguous and every file failed to parse.
  // `npm run lint` reported 108 errors and linted nothing at all from 17 Aug until this was fixed.
  globalIgnores(['dist', '.claude/**']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      // Pin the root explicitly so a stray tsconfig anywhere under the project can never make it
      // ambiguous again — the ignore above is the cure, this is the belt.
      parserOptions: { tsconfigRootDir: import.meta.dirname },
    },
  },
])
