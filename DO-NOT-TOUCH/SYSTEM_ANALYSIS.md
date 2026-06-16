# System Analysis — Unsent

---

## 1. System Overview

- **What the system is:** "Unsent" — a journaling / anonymous-sharing web application built with Next.js (App Router) and TypeScript.
- **Main purpose:** Let users write letters they never sent, analyze emotional content using an LLM, organize letters into personal "garden" seeds, surface personal patterns (the “garden”), and connect users with others who have similar emotional signals for anonymous conversations.
- **Problems it solves:** Low-friction private journaling, automated emotional analysis and categorization, lightweight matchmaking by emotional similarity, and anonymous public sharing with lightweight reactions.

---

## 2. Project Structure Analysis

Top-level assets:

- `package.json` — scripts and dependencies (Next.js, React, Prisma, NextAuth, Anthropic SDK). See [package.json](package.json).
- `tsconfig.json`, `next.config.ts` — TypeScript & Next configuration. See [tsconfig.json](tsconfig.json) and [next.config.ts](next.config.ts).
- `prisma/` — Prisma schema and migrations. See [prisma/schema.prisma](prisma/schema.prisma).

Key source folders/files under `src/`:

- `src/lib/`
   - `prisma.ts` — creates and reuses the Prisma client using the `PrismaNeon` adapter. (DB access centralization) See [src/lib/prisma.ts](src/lib/prisma.ts).
   - `auth.ts` — NextAuth configuration (Google provider) exposing `handlers`, `signIn`, `signOut`, and `auth()` helper used by server components. It now includes an `events.createUser` handler and a `generateAnonymousName()` helper which assigns a readable `anonymousName` to newly created users. See [src/lib/auth.ts](src/lib/auth.ts).
   - `queue.ts` — DB-backed analysis job queue and worker helpers (`enqueueAnalysis`, `processNextJob`, `processPendingJobs`). See [src/lib/queue.ts](src/lib/queue.ts).

- `src/services/` — domain services
   - `emotion.service.ts` — LLM integration (Anthropic), strict system prompt expecting JSON output, validation/coercion of results. See [src/services/emotion.service.ts](src/services/emotion.service.ts).
   - `garden.service.ts` — groups letters into `Seed`, merges tags, computes stage thresholds and progress, updates seed metadata. `stageProgress` is exported and consumed by the client UI to ensure identical progress calculations between server and client. See [src/services/garden.service.ts](src/services/garden.service.ts).
   - `match.service.ts` — builds emotion vectors from letters (recency-weighted), normalizes, computes cosine similarity and returns match suggestions. See [src/services/match.service.ts](src/services/match.service.ts).

- `src/generated/prisma/` — generated Prisma client used by `src/lib/prisma.ts`.

- `src/app/` — Next.js App Router pages and API routes
   - Pages/UI: landing, `write`, `river` (public feed), `garden` (personal seeds), `matches` (suggestions) and match threads. Examples: [src/app/page.tsx](src/app/page.tsx), [src/app/write/page.tsx](src/app/write/page.tsx), [src/app/garden/GardenClient.tsx](src/app/garden/GardenClient.tsx), [src/app/matches/page.tsx](src/app/matches/page.tsx).
   - API routes (App Router server handlers): authentication (`/api/auth`), letters (`/api/letters`), reactions, jobs (`/api/jobs/process`, `/api/jobs/cron`), matches and messaging. Examples:
      - Letters: [src/app/api/letters/route.ts](src/app/api/letters/route.ts) and [src/app/api/letters/[letterId]/route.ts](src/app/api/letters/[letterId]/route.ts) and reactions [src/app/api/letters/[letterId]/reactions/route.ts](src/app/api/letters/[letterId]/reactions/route.ts).
      - Jobs: `[GET] /api/jobs/process` ([src/app/api/jobs/process/route.ts](src/app/api/jobs/process/route.ts)) and a cron-safe endpoint with advisory lock ([src/app/api/jobs/cron/route.ts](src/app/api/jobs/cron/route.ts)).
      - Matches & messaging: [src/app/api/matches/route.ts](src/app/api/matches/route.ts) and [src/app/api/matches/[matchId]/messages/route.ts](src/app/api/matches/[matchId]/messages/route.ts).

- `src/types/` — custom types like `next-auth.d.ts` to extend session typings.

Database (Prisma schema) highlights (unchanged): `User`, `Letter`, `Seed`, `AnalysisJob`, `Match`, `Message`, `Reaction`. See [prisma/schema.prisma](prisma/schema.prisma).

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
    - The garden page is a server-rendered page (`src/app/garden/page.tsx`) that fetches seeds and letter counts for the authenticated user and renders `GardenClient` (client component) to display stages/progress. `GardenClient` consumes `stageProgress` from `src/services/garden.service.ts` so both server and client use the same logic.

5. **Matching & Messaging**
    - `findMatches` builds normalized emotion vectors per user using recent analyzed letters, normalizes, computes cosine similarity, filters/returns top suggestions.
    - Creating a match (POST `/api/matches`) creates/returns a `Match` and is currently auto-accepted; messages are exchanged via the messages API. The message UI uses optimistic updates and periodic polling every 5s.

---

## 4. Feature Analysis

- **Write & Release Letters:**
   - **Files:** [src/app/write/page.tsx](src/app/write/page.tsx), [src/app/api/letters/route.ts](src/app/api/letters/route.ts).
   - **How it works:** Client POSTs letter content and `recipientType`. The server persists the letter quickly and queues an analysis job to avoid blocking the user. Note: the API fallback mapping now matches the `recipientType` values used by the client (e.g., `someone_loved`, `past_self`).

- **LLM Emotion Analysis:**
   - **Files:** [src/services/emotion.service.ts](src/services/emotion.service.ts).
   - **How it works:** `analyzeLetter` calls Anthropic (Claude) with a controlled system prompt that requires JSON-only output. The service truncates long letters (1200 chars) to reduce tokens, parses model output, and validates/coerces fields.

- **Garden / Seeds:**
   - **Files:** [src/services/garden.service.ts](src/services/garden.service.ts), [src/app/garden/GardenClient.tsx](src/app/garden/GardenClient.tsx).
   - **How it works:** `updateGardenForLetter` tries an exact theme match, then category/tag overlap to find existing seeds, merges tags, increments `letterCount`, computes `stage` based on thresholds, and sets `bloomedAt` when appropriate. The `stageProgress` helper is exported from `garden.service.ts` and consumed by `GardenClient` for consistent UI progress bars.

- **Matchmaking (emotion-based):**
   - **Files:** [src/services/match.service.ts](src/services/match.service.ts), [src/app/matches/page.tsx](src/app/matches/page.tsx).
   - **How it works:** Builds weighted emotion vectors from recent letters (recency decay), normalizes, computes cosine similarity, filters/returns top suggestions; `getOrCreateMatch` saves matches.

- **Messaging & Polling:**
   - **Files:** [src/app/matches/[matchId]/MessageThread.tsx](src/app/matches/[matchId]/MessageThread.tsx), [src/app/api/matches/[matchId]/messages/route.ts](src/app/api/matches/[matchId]/messages/route.ts).
   - **How it works:** Client uses optimistic UI for sending, polls `/messages` for new messages, server enforces that participant must be part of the match.

- **Reactions (anonymous):**
   - **Files:** [src/app/river/ReactionButtons.tsx](src/app/river/ReactionButtons.tsx), [src/app/api/letters/[letterId]/reactions/route.ts](src/app/api/letters/[letterId]/reactions/route.ts).
   - **How it works:** Anonymous users can fetch counts and submit restricted reaction types; creation is an anonymous `Reaction` DB record.

- **Anonymous Name Generation:**
   - **Files:** [src/lib/auth.ts](src/lib/auth.ts).
   - **How it works:** On first sign-up NextAuth fires `events.createUser` and the code calls `generateAnonymousName()` to update the `User.anonymousName`. This provides readable stable anonymous handles (e.g., `quiet-forest-42`) for use in match listings or anywhere an anonymous label is useful.

- **Background Job Processing:**
   - **Files:** [src/lib/queue.ts](src/lib/queue.ts), [src/app/api/jobs/process/route.ts](src/app/api/jobs/process/route.ts), [src/app/api/jobs/cron/route.ts](src/app/api/jobs/cron/route.ts).
   - **How it works:** Jobs are DB rows `AnalysisJob`. `processNextJob` marks `PROCESSING`, calls LLM, updates `Letter`, updates `Seed`, and marks job `COMPLETED` or `FAILED`. Retries use exponential backoff; cron route attempts a Postgres advisory lock to prevent concurrent workers.

---

## 5. Technical Overview

- **Frontend:** Next.js (App Router) + React 19 + TypeScript.
- **Auth:** NextAuth (Google provider) + Prisma adapter; `events.createUser` now assigns `anonymousName`.
- **Data layer:** PostgreSQL (Neon recommended) via Prisma 7.x. Prisma client generated to `src/generated/prisma`.
- **LLM:** Anthropic SDK (`@anthropic-ai/sdk`), model invoked from `src/services/emotion.service.ts`.
- **Queueing:** Simple DB-backed queue with `AnalysisJob` rows and server endpoint to process jobs (`src/lib/queue.ts`).
- **Realtime:** currently implemented with HTTP polling for messages (5s). `pusher` and `ws` are present in `package.json` but the message flow currently uses polling.
- **Job orchestration:** DB-backed queue with cron endpoint and advisory lock for Postgres.

---

## 6. Current System Behavior (runtime)

- Development: run `npm run dev` to start the Next dev server.
- Authentication: users sign in with Google. On first sign-up the backend assigns `anonymousName`.
- Letter processing: after saving a `Letter`, the system enqueues analysis. A worker endpoint `/api/jobs/process` or scheduled `/api/jobs/cron` invokes `processPendingJobs` which runs the LLM analysis, updates the letter, and updates the user's garden via `updateGardenForLetter`.
- The write page's `recipientType` values now align with the letters API fallback logic, so fallback theme derivation behaves as expected.

---

## 7. Observations & Areas to Review (no code changes made by me)

- **Recipient mapping:** Fixed — the `fallbackEmotion` in [src/app/api/letters/route.ts](src/app/api/letters/route.ts) now uses keys such as `someone_loved`, `someone_lost`, `past_self`, etc., which match the client `recipientType` values from [src/app/write/page.tsx](src/app/write/page.tsx).

- **Anonymous name generation — uniqueness risk:** `anonymousName` is assigned in `events.createUser` using a random adjective+noun+number generator. The schema enforces `anonymousName` as `@unique`. The current implementation does not retry on collision — if a generated name collides with an existing `anonymousName` the Prisma update could fail. Consider adding a short retry loop or uniqueness check to guarantee assignment.

- **Garden stage logic consistency:** `stageProgress` is exported from `garden.service.ts` and consumed by `GardenClient`, ensuring server and client show identical progress math.

- **Secrets & access control:** `/api/jobs/process` checks `JOB_SECRET` only in production; `/api/jobs/cron` enforces `JOB_SECRET` when set. Ensure deployment cron uses the correct header and secret.

- **Queue durability & scaling:** The DB-backed queue is simple and suitable for light workloads. For higher throughput or stronger delivery guarantees consider a durable queue (Redis/managed worker).

- **LLM parsing fragility:** `analyzeLetter` still expects precise JSON from the model; validation and coercion reduce risk but consider additional safety or structured-output techniques if the model response variability becomes an issue.

- **Unused realtime deps:** `pusher`, `pusher-js`, and `ws` are included in `package.json` but are not actively used by the code paths examined; keep or remove as desired.

---

If you want, I can append a mermaid sequence diagram (write → enqueue → analyze → garden) or a short deployment checklist (env vars, cron setup, DB settings). Which would you like added?
