# AI Teammates

Next.js 16 with shadcn/ui and Clerk authentication.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Signed-out visitors are
redirected to sign in, where they can also create an account. Clerk's profile
menu provides account management and sign-out controls.

Clerk is configured against the `ai-teammates-dev` application. Development keys
are stored in the ignored `.env.local` file. On another machine, authenticate to
Clerk, link this application, and pull its development keys:

```bash
npx -y clerk@latest auth login
npx -y clerk@latest link --app app_3LKz0UfvbjVgcEHEbTERwS9nggn
npx -y clerk@latest env pull
npx -y clerk@latest doctor
```

Never commit `.env.local` or expose `CLERK_SECRET_KEY` to client code. Configure a
production instance and deployment keys with Clerk before deploying.

## Authentication

- `/` requires a session and redirects signed-out visitors to sign in.
- `/sign-in` and `/sign-up` host Clerk's prebuilt authentication forms, including
  their nested verification routes.
- Sign-in and sign-up fall back to `/`; signing out also returns to `/`.

`proxy.ts` makes the Clerk session available. Protect every new private page,
Route Handler, and Server Action with `await auth.protect()` before accessing
private data. Header visibility is only presentation. Keep request-dependent
auth UI inside `Suspense`; protected pages can use a sibling `loading.tsx`.

## Billing

Clerk user Billing is enabled on `ai-teammates-dev`. The public Pro plan
(`pro`) costs $20 USD per month on Clerk’s development payment gateway.
Clerk assigns its Free plan by default. Pro is required to use bots and their
sandboxes. Upgrade toasts link to `/pricing`, where Clerk handles checkout.

For another Clerk instance, enable user Billing and create a public recurring
user plan with the slug `pro`. Production checkout requires a Stripe account
connected in Clerk. Set `CLERK_SECRET_KEY` in the matching Trigger.dev
environment as well as in Next.js so the chat worker can check the subscription
before each turn.

The sidebar account menu opens **Usage**. The Pro allowance per Clerk billing
period is $5 of metered GPT-5.6 Luna requests, 60 hours of booked Daytona
time, and 10 sandbox provisioning attempts. There are no overage charges.
AI usage includes cached input, output, and reasoning tokens. The ledger
reserves a worst-case charge before each provider call and settles against
reported usage. A call without usage telemetry retains its reservation.

Daytona sessions run for up to 10 minutes and book 12 minutes of allowance
to cover lifecycle overhead. The app uses the `daytona-small` container
snapshot and normally stops and archives the filesystem at the end of a
session. A Daytona TTL can delete the sandbox and its files if the cleanup
worker is unavailable. Run the Trigger.dev worker with the same development
database and deploy it alongside the app so both cleanup tasks are available.

```bash
npm run typecheck
npm run lint
npm run build
```

## Database

Drizzle ORM connects to Neon using its HTTP driver. The server-only client is
exported as `db` from `@/lib/db`; table definitions belong in `lib/db/schema.ts`.
The `todos` table stores a title, completion status, creation/update timestamps,
and the owning Clerk user ID. Titles must contain non-whitespace text. Drizzle
automatically updates `updatedAt` when it updates a task; raw SQL updates must set
`updated_at` explicitly.

The existing ignored `.env.local` contains both connection strings. On another
machine, supply these values from the same Neon branch:

```dotenv
# Pooled connection for application queries (hostname contains -pooler).
DATABASE_URL="postgresql://USER:PASSWORD@ENDPOINT-pooler.REGION.aws.neon.tech/DATABASE?sslmode=require"
# Direct connection for Drizzle Kit schema pushes (hostname has no -pooler).
DATABASE_URL_UNPOOLED="postgresql://USER:PASSWORD@ENDPOINT.REGION.aws.neon.tech/DATABASE?sslmode=require"
```

Drizzle Kit loads `.env*` files with Next.js's `@next/env`, including `.env.local`.
Use environment variables for the target branch when running against another
environment. Keep both URLs private and configure them on the deployment host.

After adding or changing table definitions:

```bash
npm run db:push    # Apply the schema directly to the configured database.
npm run db:studio  # Browse the database locally.
```

Keep `lib/db/schema.ts` as the schema source of truth. Apply schema changes with
database pushes only; do not generate or run migrations or keep migration files,
snapshots, or journals. Review Drizzle Kit's proposed changes before applying them.

Query from a Server Component, Route Handler, or Server Action:

```ts
import { auth } from "@clerk/nextjs/server"
import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { todos } from "@/lib/db/schema"

const { userId } = await auth.protect()
const tasks = await db.select().from(todos).where(eq(todos.userId, userId))
```

For private application tables, also scope each query to the authenticated user's
ID or authorized organization. The HTTP driver supports individual queries and
batched transactions; use a different driver if you need interactive transactions.
See the [Neon Drizzle guide](https://neon.com/docs/guides/drizzle) and
[Drizzle Neon documentation](https://orm.drizzle.team/docs/get-started/neon-new).

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button"
```
