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
