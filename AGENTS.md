# Repository Guidelines

## Project Structure & Module Organization

ScenePilot is a Next.js App Router application. Route entry points and global styles live in `app/`; `app/page.tsx` currently coordinates the single-page workspace. Reusable components are grouped by purpose: `components/pages/` contains feature views, `components/layout/` contains the application shell, and `components/ui/` contains shared UI primitives. Put reusable helpers and typed mock data in `lib/`. Static files, when needed, belong in `public/`.

Use the `@/` alias for repository-root imports, for example `@/components/ui/button`. Keep feature-specific state close to its page component and promote code to `lib/` or `components/ui/` only when it is genuinely shared.

## Build, Test, and Development Commands

Use pnpm; `pnpm-lock.yaml` is the authoritative lockfile.

- `pnpm install` — install dependencies.
- `pnpm dev` — start the local Next.js development server.
- `pnpm lint` — run ESLint across the repository.
- `pnpm build` — create a production build and catch Next.js/type errors.
- `pnpm start` — serve the completed production build.

Before submitting changes, run `pnpm lint` and `pnpm build`.

## Coding Style & Naming Conventions

Write TypeScript/TSX with strict typing. Follow the existing style: two-space indentation, single quotes, no semicolons, and trailing commas in multiline constructs. Name React components and exported types in PascalCase, functions and variables in camelCase, and files in kebab-case (`project-sidebar.tsx`). Prefix custom hooks with `use`. Prefer small functional components, explicit prop interfaces, and Tailwind utility classes. Use the `cn` helper from `lib/utils.ts` for conditional class composition.

## Testing Guidelines

No automated test runner or coverage threshold is configured yet. Treat linting and a successful production build as the minimum validation. Manually exercise affected navigation, responsive layouts, panels, and interactive states in `pnpm dev`. If adding a test framework, place tests beside their subjects as `*.test.ts` or `*.test.tsx`, and add the corresponding command to `package.json`.

## Commit & Pull Request Guidelines

Recent history favors short, imperative Conventional Commit subjects such as `feat: update global color scheme`. Use prefixes like `feat:`, `fix:`, `refactor:`, or `docs:` and keep each commit focused.

Pull requests should explain the user-visible change, list validation performed, and link relevant issues. Include before/after screenshots or a short recording for visual changes, and call out new dependencies, configuration changes, or known follow-up work.
