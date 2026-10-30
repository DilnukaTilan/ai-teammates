<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Database schema changes

Use `npm run db:push` (`drizzle-kit push`) for all database schema changes.
Do not generate or run migrations, add migration scripts, or create migration
artifacts such as SQL migration files, snapshots, or journals.

This is a development project. Backward compatibility is not required, and
existing data is considered disposable. Prefer allowing data loss: do not
backfill, migrate, or preserve existing rows, and do not spend effort maintaining
old data. With every schema change, start with a clean slate.

## Forms and server actions

- Use the Shadcn skill for form UI, the Clerk skill for authenticated actions,
  and the Neon skill for database writes. Read the relevant installed Next.js
  guides before implementing forms or Server Actions.
- Use `react-hook-form` with `zod` and `@hookform/resolvers/zod`. Compose forms
  with the existing Shadcn `FieldGroup`, `Field`, `FieldLabel`, and `FieldError`
  components. Use `Controller` for controlled inputs and `useWatch` for values
  that drive other UI.
- Generate database insert validation from the Drizzle table with
  `createInsertSchema` from `drizzle-zod`. Keep shared validation next to the
  table in `lib/db/schema.ts`, and derive form schemas with an explicit `.pick()`
  of editable fields. Infer types from Zod instead of duplicating field shapes.
- Share the form schema between the client and server. Trim text, reject blank
  required values, and set sensible length limits. Use callback refinements
  such as `instructions: (schema) => schema.trim().max(10000)` to preserve
  Drizzle's nullable and optional behavior; supplying a replacement Zod schema
  overrides that behavior. Keep form defaults compatible with the schema and
  normalize optional blank text consistently before inserting.
- Put mutations in `actions/<resource>.ts` with `"use server"`. Authenticate
  inside every action with Clerk's server utilities, such as
  `await auth.protect()`, and derive `userId` from that result. Validate input
  again on the server; client validation and TypeScript types are insufficient.
- Accept only editable fields from the client. Set ownership on the server and
  leave IDs, timestamps, and other system fields to server or database defaults.
  Import the database client only in server code and reuse the existing Neon
  connection. Adding validation alone does not require a database schema push.
- Return structured success, field errors, and safe failure messages. Map server
  field errors back to the form, show an accessible form-level error for other
  failures, and preserve entered values on failure. Keep database error details
  on the server. Revalidate affected paths after a successful write.
- Use visible labels linked to unique control IDs, `data-invalid` on `Field`,
  `aria-invalid` on controls, and `aria-describedby` for error messages. Give
  non-submit buttons `type="button"`. Disable submission and conflicting controls
  while saving and show a pending indicator. Close the dialog after a successful
  submission, allow cancellation when idle, and reset when starting a new form
  session.
- Reuse `components/ui/dialog.tsx` for modal forms, including its title,
  description, and footer. This project uses Base UI: compose triggers and close
  controls with `render`, not Radix's `asChild`. Use `ToggleGroup` for preset
  choices; presets should populate editable form values. Match supplied designs
  using existing components and semantic theme tokens, and keep dialogs usable
  on small screens with a bounded height and scrolling.
- Verify types, lint, formatting, and the production build. Check schema and
  action boundaries, including unauthenticated requests, invalid input, forged
  ownership/system fields, optional values, and database failures. Inspect the
  form in the browser for layout, presets, validation, and dismissal. Distinguish
  mocked action checks from a verified live database insertion when reporting.

## DiceBear

Use DiceBear 10. Documentation: https://www.dicebear.com/llms.txt

There are seven native cores with identical output, not one library with
wrappers. Use the one matching this project's language. Do not reach for the
JavaScript core when the project is written in something else:

    JavaScript  @dicebear/core + @dicebear/styles
    PHP         dicebear/core + dicebear/styles
    Python      dicebear-core + dicebear-styles
    Rust        dicebear-core + dicebear-styles
    Go          github.com/dicebear/dicebear-go/v10 + github.com/dicebear/styles/v10
    Dart        dicebear_core + dicebear_styles
    C#          DiceBear.Core + DiceBear.Styles

Every style page carries a loading snippet for all seven, for example
https://www.dicebear.com/styles/lorelei/index.md

HTTP API: https://api.dicebear.com/10.x/<style>/svg?seed=<seed> The seed is a
query parameter, not a path segment. Options are query parameters too; array
values are separated by commas.

Options named after a component end in Variant: eyesVariant, not eyes. This
holds in all seven cores and in the HTTP API. Look up the options of a style at
https://api.dicebear.com/10.x/<style>/options.json

Write these forms, not the ones on the left. The left column is pre-10 and the
API does not reject it, so an outdated call runs and silently does the wrong
thing:

    avatars.dicebear.com/api/<style>/<seed>.svg  ->  api.dicebear.com/10.x/<style>/svg?seed=<seed>
    api.dicebear.com/9.x/<style>/svg             ->  api.dicebear.com/10.x/<style>/svg
    npm install @dicebear/collection             ->  npm install @dicebear/styles
    npm install @dicebear/lorelei                ->  npm install @dicebear/styles
    createAvatar(lorelei, { seed })              ->  new Avatar(new Style(definition), { seed })
    { eyes: ['variant01'] }                      ->  { eyesVariant: ['variant01'] }
    ?radius=50                                   ->  ?borderRadius=50

Only JavaScript and the HTTP API have a pre-10 form. The other six cores were
released in 2026 and never had one, so any older-looking PHP, Python, Rust, Go,
Dart or C# API attributed to DiceBear is invented rather than outdated.
