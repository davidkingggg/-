<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Personal Workship Agent Rules

These rules are mandatory for any agent working in this repository. The project has already had production incidents caused by manual deployment and SQLite path drift, so follow the process exactly.

## Read First

Before changing code, read the relevant project docs:

- `docs/DEPLOYMENT.md` for deployment, server layout, database path, rollback, and validation.
- `docs/CODING_RULES.md` for project coding conventions.
- `docs/DATA_MODEL.md` before touching Prisma models, migrations, imports, exports, or table semantics.
- `docs/TEST_PLAN.md` before finishing a feature or fix.

For Next.js behavior, consult `node_modules/next/dist/docs/` first. Do not assume older Next.js conventions.

## Production Deployment Rules

- The only approved production deployment entrypoint is `scripts/deploy-systemd.sh`.
- Do not deploy by manually copying single files, editing files on the server, replacing `.next` artifacts by hand, or running ad hoc `scp` patches.
- Keep the current production stack: SQLite + systemd + nginx + standalone Node. Do not switch to Docker or PostgreSQL unless the user explicitly approves a migration plan.
- If the server does not have passwordless sudo, pass `SUDO_PASSWORD` as a temporary local environment variable. Never write server passwords into tracked files.
- After deployment, verify at minimum:
  - `/login`
  - `/api/auth/init`
  - `/quote-compare`
  - `/purchase-board`
  - `/quotes`
  - `/health`
  - `/api/auth/me` returns 401 when unauthenticated
  - `/api/data-health` returns 401 when unauthenticated
  - one `_next/static` asset returns 200
  - `personal-workship.service`, `nginx.service`, and `mimo-license.service` are active

## Database Rules

- Production database has exactly one real location:

```text
/home/ubuntu/personal-workship-data/dev.db
```

- These runtime paths must be symlinks to the persistent database:

```text
/home/ubuntu/personal-workship/prisma/dev.db
/home/ubuntu/personal-workship/.next/standalone/prisma/dev.db
```

- Never commit, upload, or package local SQLite files. Deployment packages must exclude `prisma/dev.db`, `prisma/dev.db-*`, and local `.env` files.
- `DATABASE_URL` is the single source of truth. Do not infer the active database from `schema.prisma`.
- Before restore operations, create a snapshot. After restore, verify database readability, core table counts, and at least one active admin account.
- If user reports "refresh loses data" or "new users disappeared", first suspect wrong database path or an empty standalone SQLite file.

## Code Change Rules

- Keep changes scoped. Do not refactor unrelated modules while fixing an incident.
- Do not revert user changes or unrelated dirty files.
- Use existing project patterns, Prisma helpers, API conventions, and Chinese UI copy.
- Dangerous APIs must explicitly check permissions, especially backup, restore, user management, system settings, archive deletion, and bulk operations.
- Do not allow removing, disabling, or downgrading the last administrator.
- Prefer logical archive fields over physical deletion unless the project already has a guarded exception.
- For frontend work, preserve the existing app-like interface. Do not add landing pages or decorative redesigns for operational screens.

## Verification Rules

Before handing off, run the smallest relevant verification set. For deployment/data-path work, run all of these:

```bash
npm test
npx tsc --noEmit
npm run build
git diff --check
```

For UI changes, also verify the affected page in a browser and check that text, columns, dialogs, and responsive layouts do not overlap.

For production deployment work, verify on the server that both database symlinks resolve to `/home/ubuntu/personal-workship-data/dev.db` and that the database file is non-empty.

## Git Rules

- Stage only files related to the current task.
- Leave unrelated modified or untracked files alone.
- Use clear commits. For deployment/data stability work, prefer messages like `fix: harden systemd deployment data path`.
- If a review finds a bug in the just-made commit, fix it and amend before handing off unless the user asks for separate commits.

## Security Notes

- The historical server password has appeared in chat. Recommend rotating it and moving to SSH key login.
- Do not add secrets to the repository, docs, logs, screenshots, or comments.
- HTTP cookies may remain non-secure until HTTPS is configured. Once HTTPS is available, enable secure cookies through the existing environment controls.
