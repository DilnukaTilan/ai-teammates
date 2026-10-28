# AI Teammates

Next.js 16 with shadcn/ui and Clerk authentication.

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Create account** or
**Sign in** in the header. Clerk's profile menu provides account management and
sign-out controls.

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

- `/` is public.
- `/sign-in` and `/sign-up` host Clerk's prebuilt authentication forms, including
  their nested verification routes.
- `/dashboard` requires a session and redirects signed-out visitors to sign in.
- Sign-in and sign-up fall back to `/dashboard`; signing out returns to `/`.

`proxy.ts` makes the Clerk session available. Protect every new private page,
Route Handler, and Server Action with `await auth.protect()` before accessing
private data. Header visibility is only presentation. Keep request-dependent
auth UI inside `Suspense`; protected pages can use a sibling `loading.tsx`.

```bash
npm run typecheck
npm run lint
npm run build
```

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
