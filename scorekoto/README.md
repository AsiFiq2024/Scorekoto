This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

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

## Email verification and account recovery

Signup and account recovery use email OTP codes delivered through Resend. Add these server-only values to `.env.local` and to the production environment:

```bash
RESEND_API_KEY=re_your_api_key
AUTH_EMAIL_FROM=ScoreKoto <account@your-verified-domain.example>
OTP_SECRET=replace-with-a-long-random-secret
```

The sender address must use a domain verified in Resend. `OTP_SECRET` is used only to hash verification codes and recovery tokens; if omitted, the server falls back to `JWT_SECRET`. Never expose these values with a `NEXT_PUBLIC_` prefix.

The application creates the OTP table automatically when the auth API first runs. The equivalent manual migration is available at `database/auth_otp_setup.sql`.

## Match detail data

Match events, commentary, statistics, and lineups are cached from API-Football. Run the coverage audit without changing data:

```bash
npm run audit:match-details
```

Preview the resumable backfill (also read-only):

```bash
npm run backfill:match-details -- --single --max-requests=90
```

After the API quota resets, add `--apply` to fetch and persist the next batch. The configured free plan only supports one fixture ID per request; paid plans can omit `--single` to use batches of up to 20 IDs. Re-running the command skips fixtures already checked after full time and continues with the remainder. Fixtures denied by the current plan are recorded and skipped; after upgrading, add `--retry-unsupported` once to retry them.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
