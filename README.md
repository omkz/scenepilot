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
- `pnpm test` — run focused Vitest business-logic tests.
- `pnpm build` — create a production build.
- `pnpm db:generate` — generate SQL migrations from `lib/db/schema.ts`.
- `pnpm db:migrate` — apply pending migrations.
- `pnpm db:studio` — open Drizzle Studio.

Database access is server-only. Project, asset, episode, scene, and storyboard mutations use Server Actions with Zod validation and project-scoped query modules.

## AI episode outlines

AI calls run only from server-side task services. Qwen is the first provider adapter, while provider and model selection remain backend controlled:

```env
AI_DEFAULT_PROVIDER=qwen
AI_DEFAULT_MODEL=qwen-plus
QWEN_API_KEY=
QWEN_BASE_URL=
```

Set `QWEN_BASE_URL` to the OpenAI-compatible endpoint supplied for your Qwen account. Do not expose these variables through `NEXT_PUBLIC_*`.

Approve reusable Story Studio characters and locations before generating an episode outline. Generated outlines are stored as previews and never modify an episode until a user explicitly selects **Apply to Episode**. Applying an outline updates the title, summary, outline, and cliffhanger only; scripts and scenes remain unchanged.

The Episode Scenes tab can turn an applied outline into an editable AI scene-plan preview. Preview edits are validated and stored in the generation record. Scenes and character assignments are created only after an explicit append or replace confirmation; replace mode soft-archives existing scenes and both modes run in a single database transaction.
