# System Analysis — Unsent

Generated: 2026-06-15

---

## 1. System Overview

- **What the system is**: "Unsent" — a journaling / anonymous-sharing web application built with Next.js (App Router) and TypeScript.
- **Main purpose**: Let users write letters they never sent, analyze emotional content using an LLM, organize letters into personal "garden" seeds, surface emotional patterns, and match/connect people with similar emotional signals for anonymous conversations.
- **Problems it solves**: Low-friction private journaling, automated emotional analysis and categorization, lightweight matchmaking by emotional similarity, and anonymous public sharing with simple reaction affordances.

---

## 2. Project Structure Analysis

Top-level assets:

- `package.json` — scripts and dependencies (Next.js, React, Prisma, NextAuth, Anthropic SDK). See [package.json](package.json).
- `tsconfig.json`, `next.config.ts` — TypeScript & Next configuration. See [tsconfig.json](tsconfig.json) and [next.config.ts](next.config.ts).
- `prisma/` — Prisma schema and migrations. See [prisma/schema.prisma](prisma/schema.prisma).

Key source folders/files under `src/`:

- `src/lib/`
  - `prisma.ts` — creates and reuses the Prisma client using the `PrismaNeon` adapter. (DB access centralization) See [src/lib/prisma.ts](src/lib/prisma.ts).
  - `auth.ts` — NextAuth configuration (Google provider) exposing `handlers`, `signIn`, `signOut`, and `auth()` helper used by server components. See [src/lib/auth.ts](src/lib/auth.ts).
  - `queue.ts` — DB-backed analysis job queue and worker helpers (`enqueueAnalysis`, `processNextJob`, `processPendingJobs`). See [src/lib/queue.ts](src/lib/queue.ts).

- `src/services/` — domain services
  - `emotion.service.ts` — LLM integration (Anthropic), strict system prompt expecting JSON output, validation/coercion of results. See [src/services/emotion.service.ts](src/services/emotion.service.ts).
  - `garden.service.ts` — groups letters into `Seed`, merges tags, computes stage thresholds and progress, updates seed metadata. See [src/services/garden.service.ts](src/services/garden.service.ts).
  - `match.service.ts` — builds emotion vectors from letters (recency-weighted), normalizes, computes cosine similarity and returns match suggestions. See [src/services/match.service.ts](src/services/match.service.ts).

- `src/generated/prisma/` — generated Prisma client used by `src/lib/prisma.ts`.

- `src/app/` — Next.js App Router pages and API routes
  - Pages/UI: landing, `write`, `river` (public feed), `garden` (personal seeds), `matches` (suggestions) and match threads. Examples: [src/app/page.tsx](src/app/page.tsx), [src/app/write/page.tsx](src/app/write/page.tsx), [src/app/garden/GardenClient.tsx](src/app/garden/GardenClient.tsx), [src/app/matches/page.tsx](src/app/matches/page.tsx).
  - API routes (App Router server handlers): authentication (`/api/auth`), letters (`/api/letters`), reactions, jobs (`/api/jobs/process`, `/api/jobs/cron`), matches and messaging. Examples: [src/app/api/letters/route.ts](src/app/api/letters/route.ts), [src/app/api/jobs/process/route.ts](src/app/api/jobs/process/route.ts), [src/app/api/matches/[matchId]/messages/route.ts](src/app/api/matches/[matchId]/messages/route.ts).

Database (Prisma schema) highlights:

- `User` — core user model (includes `anonymousName`, `letters`, `seeds`, `sentMatches`, `receivedMatches`, `accounts`, `sessions`).
- `Letter` — content, recipientType, emotion/intensity/category, status (PENDING/ANALYZED/FAILED), optional `seedId`.
- `Seed` — thematic grouping for letters per user (`theme`, `category`, `tags`, `stage`, `letterCount`, `lastActivity`, `bloomedAt`).
- `AnalysisJob` — job queue rows (`letterId`, status, attempts, scheduledAt, timestamps) used by the DB-backed queue.
- `Match`, `Message`, `Reaction` — support matching + anonymous messaging and reactions.

See full schema: [prisma/schema.prisma](prisma/schema.prisma).

---

## 3. System Workflow

1. **Authoring**
   - User composes a letter in the `write` UI (`/write`) and submits via POST `/api/letters`.
   - Server persists a `Letter` with `status = PENDING` and immediately creates an `AnalysisJob` via `enqueueAnalysis` (non-blocking for the user).

2. **Analysis (background)**
   - A worker or scheduled cron calls `/api/jobs/process` (or `/api/jobs/cron` from a scheduler).
   - `processPendingJobs` picks PENDING `AnalysisJob` rows, marks them `PROCESSING` and calls `analyzeLetter` in `emotion.service.ts`.
   - `analyzeLetter` calls Anthropic (Claude) with a strict JSON-only system prompt; the response is parsed and validated.
   - On success: Letter is updated with `emotion`, `intensity`, `category`, `status = ANALYZED`, and `updateGardenForLetter` is executed to merge/create a `Seed`.
   - On failure: job is retried with exponential backoff up to `MAX_ATTEMPTS`, then marked `FAILED` (letter status set to `FAILED`).

3. **Public River & Reactions**
   - `river` page (`/river`) lists `isPublic` letters and shows emotion badges and reaction buttons.
   - Reactions are anonymous writes to `Reaction` rows via `/api/letters/[id]/reactions`.

4. **Garden**
   - Personal `garden` page fetches a user's `Seed` records and letter counts and displays stages/progress client-side.

5. **Matching & Messaging**
   - `findMatches` builds emotion vectors per user from their recent analyzed letters (weighted by recency), normalizes, computes cosine similarity against candidate users, and returns top suggestions.
   - Creating a match (POST `/api/matches`) creates/returns a `Match` and is currently auto-accepted; messaging happens via `/api/matches/[matchId]/messages` (polling + optimistic UI on the client).

---

## 4. Feature Analysis

- **Write & Release Letters**: immediate persistence; client polls `/api/letters/[id]` to monitor `status` and redirects to `river` on `ANALYZED`.
- **LLM Emotion Analysis**: uses Anthropic SDK; model `claude-sonnet-4-6` is requested in `emotion.service.ts`. The service enforces a JSON schema, truncates long input, and validates/coerces fields.
- **Garden / Seeds**: theme-based grouping per-user; matches by exact theme or best tag overlap; stage thresholds determine visual progression (SEED → STRONG).
- **Matchmaking**: emotion vectors built from letters, recency-weighted, normalized; cosine similarity used to find similar users.
- **Messaging**: optimistic client-side sends with server confirmation and 5s polling to receive messages; server enforces participant verification and match acceptance.
- **Reactions**: anonymous reaction types restricted to a small allowlist (`understand`, `felt`, `hope`).
- **Background jobs**: DB-backed job queue with retries and exponential backoff; cron endpoint tries to use Postgres advisory locks to avoid concurrent workers.

---

## 5. Technical Overview

- **Frontend**: Next.js (App Router) + React 19 + TypeScript. Server Components fetch data and Client Components handle interactions/animations.
- **Auth**: NextAuth (Google provider) + Prisma adapter. Server components call `auth()` to access session info.
- **Data layer**: PostgreSQL (Neon recommended) via Prisma 7.x. Prisma client generated to `src/generated/prisma`.
- **LLM**: Anthropic SDK (`@anthropic-ai/sdk`), model invoked from `src/services/emotion.service.ts`.
- **Queueing**: Simple DB-backed queue with `AnalysisJob` rows and server endpoint to process jobs (`src/lib/queue.ts`).
- **Realtime**: currently implemented with HTTP polling for messages (5s). `pusher` and `ws` are present in `package.json` but not actively used in the reviewed code.
- **Styling/tooling**: Tailwind PostCSS plugin configured; ESLint present.

---

## 6. Current System Behavior (runtime)

- Development typically started with `npm run dev` which runs the Next dev server (see `package.json`).
- Authenticated users sign in via Google (NextAuth); server components use `auth()` to guard pages (e.g., `garden`, `matches`).
- Letter processing is asynchronous: after saving a `Letter`, the system enqueues analysis and the user is redirected to a queued state while the background job runs.
- Jobs are processed by calling `/api/jobs/process` (manual/dev) or `/api/jobs/cron` (scheduled). The cron variant attempts an advisory lock when running on Postgres.
- Matching and garden updates depend on completed analyses: until letters are analyzed they don't contribute to vectors or seed counts.

---

## 7. Observations & Areas to Review (no changes made)

- **`recipientType` mismatch**: client `write` uses values like `someone_loved` / `past_self` while `letters` API fallback mapping expects phrases like `someone i loved` (with spaces). This mismatch will often cause the API fallback to default instead of returning a more specific fallback. Files: [src/app/write/page.tsx](src/app/write/page.tsx) and [src/app/api/letters/route.ts](src/app/api/letters/route.ts).

- **Security: job endpoint protection**: `/api/jobs/process` only checks `JOB_SECRET` when `NODE_ENV === 'production'`; `/api/jobs/cron` enforces the header when `JOB_SECRET` is set. Confirm scheduler configuration and secrets in deployment.

- **Queue durability**: DB-backed queues are acceptable at small scale but may need a durable queue (Redis/managed) for higher throughput or complex retry semantics.

- **LLM response fragility**: `analyzeLetter` expects strict JSON and strips fences, but model-format drift or unexpected tokens could cause parse errors. The code uses validation/coercion defaults to guard against malformed responses.

- **Unused deps**: `pusher`, `pusher-js`, and `ws` exist in `package.json` but the app currently uses polling for messages. These may be leftover or planned features.

- **Anonymity handling**: `User.anonymousName` exists in the schema, but there's no visible logic here for generating or exposing stable anonymous identities; review how/when `anonymousName` is assigned.

- **Rate limiting / abuse controls**: public reaction endpoints accept anonymous writes; consider rate limiting to mitigate spam.

---

## 8. Quick pointers

- Entry points to inspect quickly: [src/app/write/page.tsx](src/app/write/page.tsx), [src/app/api/letters/route.ts](src/app/api/letters/route.ts), [src/services/emotion.service.ts](src/services/emotion.service.ts), [src/lib/queue.ts](src/lib/queue.ts), [prisma/schema.prisma](prisma/schema.prisma).

---

If you want improvements or diagrams (sequence or architecture), tell me which format — I can add a mermaid diagram or a short deployment checklist next.
