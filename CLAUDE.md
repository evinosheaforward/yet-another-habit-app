# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack habit tracking app organized as an npm workspaces monorepo: a React Native/Expo mobile frontend, an Express.js backend API, and a shared TypeScript types library.

## Monorepo Structure

- `applications/mobile/` — React Native/Expo app (Expo Router file-based routing, NativeWind/TailwindCSS styling)
- `applications/backend/` — Express.js API (Knex.js for DB, SQLite dev / MySQL prod)
- `libraries/shared-types/` — Shared TypeScript types (Activity, ActivityPeriod)
- `.maestro/` — Maestro E2E test flows

## Common Commands

### Root-level (run from repo root)

| Command | What it does |
|---|---|
| `npm run dev` | Start backend + mobile concurrently |
| `npm run mobile` | Start mobile Expo dev server only |
| `npm run backend` | Start backend dev server only |
| `npm run start:auth` | Start Firebase Auth emulator |
| `npm run test` | Run mobile Jest tests |
| `npm run lint:fix` | Fix lint across all workspaces |
| `npm run build` | Lint + build all workspaces |

### Mobile (`npm --workspace applications/mobile run <script>`)

| Command | What it does |
|---|---|
| `test` | Run Jest tests |
| `test:watch` | Run Jest tests in watch mode |
| `dev` | Start Expo dev server |
| `android` / `ios` / `web` | Platform-specific dev builds |
| `build` | TypeScript type-check (`tsc --noEmit`) |

Run a single test file: `npx --workspace applications/mobile jest <path-or-pattern>`

### Backend (`npm --workspace applications/backend run <script>`)

| Command | What it does |
|---|---|
| `dev` | Start with hot-reload (tsx watch) |
| `migrate` | Run Knex migrations |
| `migrate:make` | Create new migration |
| `migrate:rollback` | Rollback last migration |
| `db:reset` | Delete SQLite file and re-migrate |
| `build` | Compile TypeScript to `dist/` |

## Architecture

### Authentication Flow

Firebase handles auth end-to-end. The mobile app authenticates users via Firebase SDK, obtains an ID token, and sends it as a Bearer token on API requests. The backend verifies tokens using Firebase Admin SDK middleware (`src/auth/requireAuth.ts`). Both frontend and backend support Firebase emulator mode via environment variables.

### Mobile App Routing

Uses Expo Router (file-based). `app/_layout.tsx` is the root layout. `app/(tabs)/` contains the tab navigator with screens like `index.tsx` (dashboard) and `activities.tsx`. Auth screens (`login.tsx`, `signup.tsx`) live at the app root level.

### Mobile API Layer

`api/activities.ts` provides `getActivities()` and `createActivity()` with a 1-minute client-side cache. Base URL is platform-aware: Android emulator uses `10.0.2.2` to reach the host machine, iOS/web use `127.0.0.1`. Backend runs on port 3001.

### Database

Knex.js manages the schema. SQLite for local dev (stored in `data/dev.sqlite3`), MySQL2 for production. Config in `knexfile.ts`. Migrations live in `migrations/`.

### Shared Types

`libraries/shared-types/` exports `Activity`, `ActivityPeriod` enum, and type guard utilities. Both mobile and backend import from this package.

## Code Style

- Prettier: single quotes, semicolons, 100 char print width (`.prettierrc`)
- ESLint: flat config (ESLint 9+), extends `@eslint/js` + `typescript-eslint` + `eslint-config-prettier`
- TypeScript strict mode in all packages

## Testing

- **Unit tests**: Jest + React Testing Library. Test files in `__tests__/` directories. Comprehensive native module mocks in `jest-setup.ts` (reanimated, nativewind, expo-haptics, expo-router, Firebase).
- **E2E tests**: Maestro flows in `.maestro/` (login, signup, activities). Run with `maestro test .maestro/`.
