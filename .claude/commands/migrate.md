---
name: migrate
emoji: 🗃️
description: Creates and runs database migrations. Use when modifying database schema or managing migration state.
---

# Migrate

Manage database schema migrations.

## Contents

- [Check Current Migration Status](#check-current-migration-status)
- [Create New Migration](#create-new-migration)
- [Run Pending Migrations](#run-pending-migrations)
- [Rollback Migration If Needed](#rollback-migration-if-needed)
- [Verify Migration Success](#verify-migration-success)

---

## Check Current Migration Status

View migration state:

```bash
# Check pending migrations
pnpm db:migrate:status

# Or with Prisma
npx prisma migrate status

# Or with Drizzle
pnpm drizzle-kit status
```

Why: Status check prevents duplicate migrations.

---

## Create New Migration

Generate migration file:

```bash
# Prisma
npx prisma migrate dev --name add_user_role

# Drizzle
pnpm drizzle-kit generate:pg --name add_user_role

# Raw SQL approach
touch migrations/$(date +%Y%m%d%H%M%S)_add_user_role.sql
```

Migration file structure:

```sql
-- migrations/20240115120000_add_user_role.sql

-- Up
ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user';
CREATE INDEX idx_users_role ON users(role);

-- Down
DROP INDEX idx_users_role;
ALTER TABLE users DROP COLUMN role;
```

Why: Named migrations document schema changes.

---

## Run Pending Migrations

Apply migrations:

```bash
# Development
pnpm db:migrate:dev

# Production (with caution)
pnpm db:migrate:deploy

# Prisma
npx prisma migrate deploy

# Drizzle
pnpm drizzle-kit push:pg
```

Why: Migrations update database schema.

---

## Rollback Migration If Needed

Revert last migration:

```bash
# Prisma (manual - create reverse migration)
npx prisma migrate dev --name revert_add_user_role

# Custom rollback script
pnpm db:migrate:rollback

# Raw SQL
psql $DATABASE_URL -f migrations/20240115120000_add_user_role_down.sql
```

Why: Rollback recovers from failed migrations.

---

## Verify Migration Success

Confirm migration applied:

```bash
# Check migration status
pnpm db:migrate:status

# Verify schema
npx prisma db pull --print  # Prisma
pnpm drizzle-kit introspect:pg  # Drizzle

# Test affected queries
pnpm test --grep "user role"
```

Report:

```markdown
## Migration Complete

- Migration: `add_user_role`
- Tables affected: `users`
- Status: ✅ Applied
- Rollback available: Yes
```

Why: Verification catches migration issues.
