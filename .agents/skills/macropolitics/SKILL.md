```markdown
# macropolitics Development Patterns

> Auto-generated skill from repository analysis

## Overview
This skill teaches you the core development conventions and patterns used in the `macropolitics` TypeScript codebase, which is built on the Vite framework. You'll learn how to structure files, write and organize code, follow commit conventions, and understand the project's testing approach. This guide is ideal for onboarding new contributors or maintaining consistency across the project.

## Coding Conventions

### File Naming
- Use **camelCase** for file names.
  - Example: `userProfile.ts`, `dataFetcher.ts`

### Import Style
- Use **relative imports** for referencing modules within the project.
  - Example:
    ```typescript
    import { fetchData } from './dataFetcher';
    ```

### Export Style
- Both **named** and **default exports** are used.
  - Named export example:
    ```typescript
    export function getUserData() { ... }
    ```
  - Default export example:
    ```typescript
    export default App;
    ```

### Commit Messages
- Follow **Conventional Commits** with prefixes:
  - `feat`: for new features
  - `chore`: for maintenance and non-feature changes
- Keep commit messages concise (average ~50 characters).
  - Example:
    ```
    feat: add user authentication flow
    chore: update dependencies
    ```

## Workflows

### Creating a New Feature
**Trigger:** When adding a new user-facing capability  
**Command:** `/new-feature`

1. Create a new TypeScript file using camelCase.
2. Implement the feature using relative imports as needed.
3. Export your functionality (named or default as appropriate).
4. Write a corresponding test file: `featureName.test.ts`.
5. Commit your changes using the `feat` prefix:
    ```
    feat: add [short description of feature]
    ```

### Maintenance or Dependency Updates
**Trigger:** When performing non-feature updates (e.g., refactoring, updating dependencies)  
**Command:** `/chore-update`

1. Make the necessary changes.
2. Ensure all tests still pass.
3. Commit your changes using the `chore` prefix:
    ```
    chore: [short description of maintenance]
    ```

## Testing Patterns

- Test files follow the pattern: `*.test.*` (e.g., `userProfile.test.ts`)
- The specific testing framework is not specified; follow the established test file naming convention.
- Place test files alongside the code they test or in a dedicated test directory, as per project structure.

**Example test file:**
```typescript
// userProfile.test.ts
import { getUserProfile } from './userProfile';

describe('getUserProfile', () => {
  it('should return user data', () => {
    // test implementation
  });
});
```

## Commands
| Command         | Purpose                                      |
|-----------------|----------------------------------------------|
| /new-feature    | Start a new feature implementation           |
| /chore-update   | Perform maintenance or dependency updates    |
```
