# Convex: production deployment and copying data from dev

This project uses a single Convex **project** with one **production** deployment and one **development** deployment per team member. Dev and prod are separate databases.

## 1. Deploy functions to production

From the repo root (with the Convex project linked):

```bash
npx convex deploy
```

Use your team’s workflow (e.g. CI on `main`). See [Deploying to production](https://docs.convex.dev/production/).

## 2. Point the app at the production deployment

In your hosting provider (e.g. Vercel), set environment variables to the **production** deployment URL from the [Convex dashboard](https://dashboard.convex.dev/), not a personal dev URL:

- `NEXT_PUBLIC_CONVEX_URL` — production deployment URL
- Any server-side Convex URL / deploy key your app uses must match prod as well

Redeploy the frontend after changing env vars.

## 3. Copy all data from a non-prod deployment into prod

Use a **backup ZIP** from the source deployment and the Convex CLI import. This preserves document `_id` values and references between tables (and file storage when included in the backup).

1. In the Convex dashboard, open the **source** deployment (e.g. your dev deployment).
2. Create and download a **backup** (ZIP). See [Backup and restore](https://docs.convex.dev/database/backup-restore).
3. Import into **production**:

   ```bash
   npx convex import --prod --replace path/to/backup.zip
   ```

   `--replace` replaces data in tables that appear in the ZIP. If production already has data you must keep, plan accordingly (e.g. empty prod first, or use a merge strategy — import does not merge rows by default).

4. Deploy the **same** schema and functions to prod **before** or as part of cutover so the restored data matches `schema.ts`.

**Notes**

- Data import is a [beta feature](https://docs.convex.dev/database/import-export/import); run `npx convex import --help` for current flags.
- If you use streaming export integrations, reset them after a full restore per Convex docs.
- Single-table imports (`npx convex import --table <name> file.jsonl`) are an alternative for partial copies.

## 4. Ongoing workflow

- Local / dev: `npx convex dev` (do not use `deploy` for day-to-day dev).
- Prod: `npx convex deploy` when releasing backend changes.

See also: [Data import](https://docs.convex.dev/database/import-export/import).
