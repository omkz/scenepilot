# ScenePilot

ScenePilot is a Next.js workspace for planning serialized short dramas with consistent story assets and continuity. Project records are stored in PostgreSQL through Drizzle ORM.

## Local setup

PostgreSQL 16 and pnpm are required.

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

Open [http://localhost:3000/projects](http://localhost:3000/projects).

The default Docker database URL is:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scenepilot
```

## Commands

- `pnpm dev` — run the development server.
- `pnpm lint` — run ESLint.
- `pnpm build` — create a production build.
- `pnpm db:generate` — generate SQL migrations from `lib/db/schema.ts`.
- `pnpm db:migrate` — apply pending migrations.
- `pnpm db:studio` — open Drizzle Studio.

Database access is server-only. Project mutations use Server Actions and validation from Zod; story assets and episode data remain mocked for the current milestone.
