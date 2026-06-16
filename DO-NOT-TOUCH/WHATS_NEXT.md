# Unsent — Completion Roadmap

---

## Current Status

| Area | Status |
|---|---|
| Auth (Google + NextAuth) | ✅ Done |
| Anonymous name generation (with collision fix) | ✅ Done |
| Letter write page | ✅ Done |
| Async LLM emotion analysis + job queue | ✅ Done |
| Garden / Seeds logic + UI | ✅ Done |
| Public river feed | ✅ Done |
| Reactions (all 4 types) | ✅ Done |
| Emotion-based matchmaking service | ✅ Done |
| Match messaging (polling) | ✅ Done |
| Background job cron endpoint | ✅ Done |
| DB schema + migrations | ✅ Done |
| NextAuth type declarations | ✅ Done |
| SessionProvider in layout | ✅ Done |
| suppressHydrationWarning on html tag | ✅ Done |

---

## Remaining Work

### 1. Profile Page — Missing entirely
**File to create:** `src/app/profile/page.tsx`
**API to create:** `src/app/api/profile/route.ts`

The spec calls for an anonymous profile showing growth stats:
- Seeds planted
- Growing journeys (seeds not yet bloomed)
- Healed memories (bloomed/strong seeds)
- Letters written
- Main emotion(s)

This page also needs a nav link added to the garden and river pages.

---

### 2. Matches Page — Unseen, needs review
**File:** `src/app/matches/page.tsx`

Haven't seen the actual source yet. Needs to be verified against spec:
- Shows users with emotionally similar letters
- Displays similarity % and shared emotions
- Uses anonymous names (not real names)
- "Find someone who understands your experience" framing — not dating language
- Links to message thread on connect

---

### 3. Message Thread — Unseen, needs review
**File:** `src/app/matches/[matchId]/MessageThread.tsx`

Haven't seen the actual source. Needs to confirm:
- Optimistic UI on send
- 5s polling for new messages
- Anonymous name display (not real name or email)
- Both participants confirmed before showing messages

---

### 4. Navigation — Incomplete across pages
No shared nav component exists. Each page rolls its own. This causes drift.

**Recommended:** Create `src/components/Nav.tsx` — a single shared nav used by river, garden, matches, write, and profile pages. Avoids repeating the same nav block in every file.

Fields to show based on auth state:
- Unauthenticated: logo + "read letters" only
- Authenticated: logo + river + write + garden + matches + profile

---

### 5. API Route — Reactions missing `thanks` type
**File:** `src/app/api/letters/[letterId]/reactions/route.ts`

When the 4th reaction `"Thank you for sharing"` was added to `ReactionButtons.tsx`, the API route's allowed-type validation needs to also accept `thanks` as a valid type. If it has a hardcoded allowlist (`understand | felt | hope`), POSTing `thanks` will be rejected silently.

**Action:** Open the route file and add `thanks` to the accepted types and the counts aggregation.

---

### 6. Letter Detail Route — May be incomplete
**File:** `src/app/api/letters/[letterId]/route.ts`

The write page polls this endpoint every 2s after submission to check `letter.status` (QUEUED → ANALYZED → redirect to river). Needs to confirm:
- Returns `{ letter: { id, status } }` shape
- Accessible without auth (or with the letter owner's session)
- Handles `FAILED` status gracefully

---

### 7. Job Secret in Development
**File:** `src/app/api/jobs/process/route.ts`

Currently auth is skipped in development. Low risk locally but worth a note — before deploying to Vercel, confirm `JOB_SECRET` is set in environment variables and the Vercel cron config in `vercel.json` sends the correct `Authorization` header.

---

### 8. Vercel Cron Configuration — Needs verification
**File:** `vercel.json`

The cron job needs to be configured to hit `/api/jobs/cron` on a schedule (e.g. every minute or every 5 minutes) so analysis jobs don't sit pending indefinitely. Verify this is set up correctly before going live.

Example `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/jobs/cron",
      "schedule": "* * * * *"
    }
  ]
}
```

---

### 9. Empty States — Polish pass
Confirm all pages handle zero-data gracefully:
- `/river` with no public letters ✅ (empty state exists)
- `/garden` with no seeds ✅ (empty state exists)
- `/matches` with no matches found — **unconfirmed**
- `/matches/[matchId]` with no messages — **unconfirmed**
- `/profile` — new page, needs empty state

---

### 10. Error Boundaries — Not present
No `error.tsx` files exist in the app directory. If a server component throws (DB down, Prisma error), Next.js will show a raw error page in production.

**Recommended:** Add at minimum:
- `src/app/error.tsx` — global fallback
- `src/app/garden/error.tsx` — garden-specific (most DB-heavy page)

---

## Priority Order

```
1. Reactions API — add `thanks` type            [15 min, high impact]
2. Letter detail route — verify polling shape    [15 min, blocks write flow]
3. Profile page + API                            [1–2 hrs, missing feature]
4. Shared Nav component                          [30 min, code quality]
5. Matches + MessageThread review                [share files for review]
6. Vercel cron + job secret verification         [before deploy]
7. Error boundaries                              [before deploy]
8. Empty states polish pass                      [before deploy]
```

---

## Files Still Unseen

These exist in the filetree but haven't been shared yet. Review recommended before deploying:

- `src/app/matches/page.tsx`
- `src/app/matches/[matchId]/page.tsx`
- `src/app/matches/[matchId]/MessageThread.tsx`
- `src/app/api/letters/[letterId]/route.ts`
- `src/app/api/letters/[letterId]/reactions/route.ts`
- `src/app/api/matches/route.ts`
- `src/app/api/matches/[matchId]/messages/route.ts`
- `src/app/api/jobs/process/route.ts`
- `src/app/api/jobs/cron/route.ts`
- `src/lib/queue.ts`
- `src/services/emotion.service.ts`
- `src/services/garden.service.ts`
- `src/services/match.service.ts`
- `prisma/schema.prisma`
- `vercel.json`
