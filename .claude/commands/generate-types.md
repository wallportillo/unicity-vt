---
name: generate-types
emoji: 🔄
description: Generates TypeScript types from database schema, API specs, or other sources. Use when syncing types with external definitions.
---

# Generate Types

Generate TypeScript types from source of truth.

## Contents

- [Identify Type Source](#identify-type-source)
- [Generate Types from Database Schema](#generate-types-from-database-schema)
- [Generate Types from API Spec](#generate-types-from-api-spec)
- [Generate Types from GraphQL Schema](#generate-types-from-graphql-schema)
- [Verify Generated Types](#verify-generated-types)

---

## Identify Type Source

Determine source of truth:

| Source | Tool | Output |
|--------|------|--------|
| Database | Prisma, Drizzle, Kysely | DB types |
| OpenAPI | openapi-typescript | API types |
| GraphQL | graphql-codegen | Query types |
| JSON Schema | json-schema-to-typescript | Object types |

Why: Source determines generation approach.

---

## Generate Types from Database Schema

From database:

```bash
# Prisma - generates client with types
npx prisma generate

# Drizzle - schema is the types
# Types defined in schema.ts

# Kysely - introspect database
npx kysely-codegen --out-file src/types/db.d.ts
```

Example output:

```typescript
// Generated from Prisma
export type User = {
  id: string;
  email: string;
  name: string | null;
  role: 'ADMIN' | 'USER';
  createdAt: Date;
};
```

Why: Database types ensure query type safety.

---

## Generate Types from API Spec

From OpenAPI:

```bash
# Install
pnpm add -D openapi-typescript

# Generate
npx openapi-typescript ./openapi.yaml -o src/types/api.d.ts
```

Example output:

```typescript
// Generated from OpenAPI
export interface paths {
  '/users': {
    get: operations['getUsers'];
    post: operations['createUser'];
  };
}

export interface components {
  schemas: {
    User: {
      id: string;
      email: string;
      name: string;
    };
  };
}
```

Why: API types ensure client/server alignment.

---

## Generate Types from GraphQL Schema

From GraphQL:

```bash
# Install
pnpm add -D @graphql-codegen/cli @graphql-codegen/typescript

# Generate
npx graphql-codegen
```

Config (`codegen.yml`):

```yaml
generates:
  src/types/graphql.ts:
    schema: './schema.graphql'
    plugins:
      - typescript
      - typescript-operations
    documents: 'src/**/*.graphql'
```

Why: GraphQL types ensure query correctness.

---

## Verify Generated Types

Confirm types work:

```bash
# Type check
pnpm type-check

# Build to verify
pnpm build

# Check for any type
grep -r ": any" src/types/
```

Report:

```markdown
## Types Generated

- Source: Database schema
- Output: `src/types/db.d.ts`
- Types: 15 interfaces
- Type check: ✅ Pass
```

Why: Verification catches generation issues.
