---
name: api
emoji: 🔌
description: Scaffolds a new API endpoint with types, validation, and tests. Use when creating a new backend route or endpoint.
---

# API

Generate API endpoint with proper structure.

## Contents

- [Ask Endpoint Details First](#ask-endpoint-details-first)
- [Define Request and Response Types](#define-request-and-response-types)
- [Create Validation Schema](#create-validation-schema)
- [Implement Route Handler](#implement-route-handler)
- [Add Integration Tests](#add-integration-tests)

---

## Ask Endpoint Details First

Gather requirements:

```
Endpoint path: [e.g., /api/users, /api/orders/:id]
HTTP method: [GET, POST, PUT, PATCH, DELETE]
Auth required: [yes/no]
Request body: [describe fields]
Response: [describe shape]
```

Why: Requirements determine endpoint structure.

---

## Define Request and Response Types

Create typed contracts:

```typescript
// src/types/api/users.ts
export interface CreateUserRequest {
  email: string;
  name: string;
  role: 'admin' | 'user';
}

export interface CreateUserResponse {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}

export interface UserErrorResponse {
  error: string;
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'UNAUTHORIZED';
  details?: Record<string, string>;
}
```

Why: Typed contracts ensure frontend/backend alignment.

---

## Create Validation Schema

Add Zod validation:

```typescript
// src/api/users/schemas.ts
import { z } from 'zod';

export const createUserSchema = z.object({
  email: z.string().email('Invalid email format'),
  name: z.string().min(1, 'Name is required').max(100),
  role: z.enum(['admin', 'user']),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
```

Why: Validation protects against malformed requests.

---

## Implement Route Handler

Create endpoint:

```typescript
// src/api/users/route.ts (Next.js App Router)
import { NextRequest, NextResponse } from 'next/server';
import { createUserSchema } from './schemas';
import { createUser } from '@/services/users';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request
    const result = createUserSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: result.error.flatten() },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser(result.data);

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Failed to create user:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

Why: Handler validates input and returns typed responses.

---

## Add Integration Tests

Test endpoint:

```typescript
// src/api/users/route.test.ts
import { POST } from './route';
import { NextRequest } from 'next/server';

describe('POST /api/users', () => {
  it('creates user with valid data', async () => {
    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.email).toBe('test@example.com');
  });

  it('returns 400 for invalid email', async () => {
    const request = new NextRequest('http://localhost/api/users', {
      method: 'POST',
      body: JSON.stringify({
        email: 'invalid',
        name: 'Test',
        role: 'user',
      }),
    });

    const response = await POST(request);

    expect(response.status).toBe(400);
  });
});
```

Why: Tests verify endpoint behavior.
