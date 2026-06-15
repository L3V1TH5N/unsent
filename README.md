This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

---

## Unsent — Project-specific setup

Environment variables required (example):

- `DATABASE_URL` — PostgreSQL connection (Neon recommended)
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth for NextAuth
- `ANALYTIC_API_KEY` / `ANALYTIC_*` — (optional) third-party keys
- `ANALYSIS_API_KEY` — Anthropic or LLM API key used by the emotion analyzer
- `JOB_SECRET` — secret token to protect the `/api/jobs/process` endpoint in production

Local setup steps:

```bash
# install deps
npm install

# create migration files for schema changes (create-only, safe without DB)
npx prisma migrate dev --create-only --name add_analysis_jobs

# generate Prisma client
npx prisma generate

# start dev server
npm run dev
```

Processing analysis jobs:

- Dev: trigger jobs manually (calls `processPendingJobs`) with:

```bash
# call the dev endpoint (no secret required in development)
curl http://localhost:3000/api/jobs/process
```

- Production: schedule a protected call to `/api/jobs/process` from a cron
	(Vercel Cron Jobs or external scheduler) and include header `x-job-secret: <JOB_SECRET>`.

Notes:

- The application enqueues analysis work when a letter is created; a background
	worker or scheduled function should call `/api/jobs/process` to perform
	costly LLM analysis and garden updates.
- For production reliability, use a durable queue (Upstash/Redis) or a managed
	worker to run jobs with retries and monitoring.

