# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development commands

- Use Node.js `25.0.0` (`.nvmrc`, `package.json`). The README still mentions older Node versions in places; prefer the checked-in toolchain files.
- Install dependencies: `npm install`
- Initialize local env from `.env.example`; local development usually needs `AUTH_TOKEN`, `PROXY_TOKEN`, and a strong `ACCOUNT_CREDENTIAL_SECRET`.
- Run database migrations: `npm run db:migrate`
- Start backend + web dev servers: `npm run dev`
  - Fastify server runs on `PORT` (default `4000`)
  - Vite dev server runs on `5173` and proxies `/api`, `/monitor-proxy`, and `/v1` to the backend
- Start desktop development: `npm run dev:desktop`
- Build all targets: `npm run build`
- Build individual targets:
  - `npm run build:web`
  - `npm run build:server`
  - `npm run build:desktop`
- Start built server: `npm start`
- Start built desktop app: `npm run start:desktop`
- Typecheck all targets: `npm run typecheck`
- Run all tests: `npm test`
- Run tests in watch mode: `npm run test:watch`
- Run a single test file: `npm test -- src/server/db/schemaContract.test.ts`
- Run a single test name: `npm test -- src/server/db/schemaContract.test.ts -t "test name"`
- Schema/database focused commands:
  - `npm run schema:generate`
  - `npm run schema:contract`
  - `npm run test:schema:unit`
  - `npm run test:schema:parity`
  - `npm run test:schema:upgrade`
  - `npm run test:schema:runtime`
  - `npm run smoke:db`
- Docs site:
  - `npm run docs:dev`
  - `npm run docs:build`
- Repository drift / architecture guardrail: `npm run repo:drift-check`

## Big-picture architecture

Metapi is a meta-aggregation gateway: it manages many upstream AI relay sites/accounts in one admin UI and exposes a unified downstream proxy surface under `/v1/*`.

### Runtime structure

- `src/server/index.ts` is the main backend entrypoint.
  - Boots the runtime database
  - Hydrates runtime settings from the DB
  - Registers authenticated admin routes under `/api/*`
  - Registers proxy routes under `/v1/*`
  - Serves the built SPA from `dist/web` in production
  - Starts background schedulers/services (check-in, route refresh, probes, OAuth callback servers, update polling, backup sync, usage aggregation)
- `src/web/main.tsx`, `src/web/App.tsx`, and `src/web/api.ts` are the browser admin app.
  - React + BrowserRouter SPA
  - Lazy-loaded operations pages (sites, accounts, routes, logs, settings, OAuth, monitors, etc.)
  - `src/web/api.ts` is the authenticated fetch/SSE wrapper for the admin UI
- `src/desktop/main.ts` is an Electron wrapper around the same product.
  - In desktop mode it can spawn the bundled backend (`dist/server/index.js`) as a managed child process or connect to an external backend
  - Desktop-specific runtime helpers live in `src/desktop/runtime.ts`

### Proxy architecture

- `src/server/routes/proxy/**` are thin protocol-facing adapters. They mount auth and endpoint surfaces such as chat, responses, messages, models, files, images, videos, and Gemini.
- `src/server/proxy-core/**` owns proxy execution flow. `proxy-core/conductor/DefaultProxyConductor.ts` handles retry, auth refresh, failover, and attempt accounting.
- `src/server/services/tokenRouter.ts` is the core routing engine.
  - Selects channels from `token_routes` and `route_channels`
  - Combines cost, balance, runtime health, cooldowns, OAuth route units, and routing strategy (`weighted` vs `stable_first`)
- `src/server/transformers/**` contains protocol conversion logic between downstream and upstream APIs. Keep these modules protocol-pure.

### Persistence and schema flow

- `src/server/db/schema.ts` is the canonical data model.
  - Core entities include sites, accounts, account tokens, model availability, token routes, route channels, proxy logs, downstream API keys, and OAuth route units
- `src/server/db/index.ts` abstracts the runtime DB dialect (`sqlite`, `mysql`, `postgres`) and contains compatibility/bootstrap helpers.
- `src/server/runtimeDatabaseBootstrap.ts` shows the split bootstrap model:
  - SQLite uses checked-in migrations
  - MySQL/Postgres bootstrap from generated schema artifacts
- Drizzle config in `drizzle.config.ts` targets the SQLite schema/migration source of truth; checked-in migration files live under `drizzle/`.

### Route and model lifecycle

- Model discovery populates availability tables, then `src/server/services/routeRefreshWorkflow.ts` rebuilds route candidates from current model coverage.
- Routing decisions are persisted in DB tables rather than being purely in-memory, so UI flows and proxy flows share the same route state.
- Settings changes can trigger runtime side effects such as scheduler reloads, route rebuilds, or database migration/connection switches; see `src/server/routes/api/settings.ts`.

## Repository-specific rules

These rules come from the checked-in engineering guidance in `AGENTS.md` and are important when editing architecture-heavy areas.

- Keep `src/server/routes/**` thin. Route files register endpoints and request context, but should not own protocol conversion, retry policy, stream lifecycle, billing, or persistence.
- If logic is shared across route files, it does not belong under `src/server/routes/proxy/`; move it into a neutral service or proxy-core module.
- Keep `src/server/transformers/**` free of Fastify, route modules, token router code, and other runtime-specific dependencies.
- Platform behavior should come from explicit capability modeling rather than scattered `if platform === ...` checks.
- Schema changes require synchronized updates to:
  - `src/server/db/schema.ts`
  - checked-in SQLite migrations in `drizzle/`
  - generated schema artifacts / contracts
- Do not hand-write new MySQL/Postgres schema patches in feature code; follow the schema-generation flow.
- Pages under `src/web/pages/**` are orchestration surfaces, not shared utility libraries. Do not import one top-level page into another.
- Reuse existing mobile primitives before inventing new ones: `ResponsiveFilterPanel`, `ResponsiveBatchActionBar`, `MobileCard`, `useIsMobile`, and `mobileLayout.ts`.
- Run `npm run repo:drift-check` before finishing changes that touch shared architecture boundaries.
- Keep local planning files under `docs/plans/`; they are intentionally gitignored and are not published docs.

## Docs-specific notes

- The public docs entrypoint is the VitePress site in `docs/`, not a README-style index page.
- `docs/README.md` is a maintainer-facing compatibility page for the `/README` route; the public landing page is the docs homepage.
- When changing docs information architecture, also update `docs/.vitepress/config.ts` navigation/sidebar and run `npm run docs:build`.
