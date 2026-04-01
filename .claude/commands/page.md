---
name: page
emoji: 📄
description: Scaffolds a new page or route with layout, metadata, and loading states. Use when creating a new page in the application.
---

# Page

Generate page with proper structure.

## Contents

- [Ask Page Details First](#ask-page-details-first)
- [Create Page Component](#create-page-component)
- [Add Metadata for SEO](#add-metadata-for-seo)
- [Implement Loading State](#implement-loading-state)
- [Add Error Boundary](#add-error-boundary)

---

## Ask Page Details First

Gather requirements:

```
Page route: [e.g., /dashboard, /users/[id]]
Page title: [for SEO]
Auth required: [yes/no]
Data fetching: [SSR, SSG, client-side]
Layout: [which layout to use]
```

Why: Requirements determine page structure.

---

## Create Page Component

Generate page:

```typescript
// src/app/dashboard/page.tsx (Next.js App Router)
import { Suspense } from 'react';
import { DashboardContent } from './components/DashboardContent';
import { DashboardSkeleton } from './components/DashboardSkeleton';

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardContent />
      </Suspense>
    </div>
  );
}
```

Why: Page component defines route content.

---

## Add Metadata for SEO

Configure metadata:

```typescript
// src/app/dashboard/page.tsx
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard | App Name',
  description: 'View your dashboard with analytics and insights.',
  openGraph: {
    title: 'Dashboard',
    description: 'View your dashboard with analytics and insights.',
  },
};
```

Or dynamic metadata:

```typescript
// src/app/users/[id]/page.tsx
import type { Metadata } from 'next';

interface Props {
  params: { id: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getUser(params.id);

  return {
    title: `${user.name} | Users`,
    description: `Profile page for ${user.name}`,
  };
}
```

Why: Metadata improves SEO and social sharing.

---

## Implement Loading State

Add loading UI:

```typescript
// src/app/dashboard/loading.tsx
export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-6" />

      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-200 animate-pulse rounded" />
        ))}
      </div>
    </div>
  );
}
```

Why: Loading state provides feedback during data fetch.

---

## Add Error Boundary

Handle errors:

```typescript
// src/app/dashboard/error.tsx
'use client';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  return (
    <div className="container mx-auto px-4 py-8 text-center">
      <h2 className="text-xl font-bold text-red-600 mb-4">
        Something went wrong
      </h2>
      <p className="text-gray-600 mb-4">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Try again
      </button>
    </div>
  );
}
```

Why: Error boundaries prevent full page crashes.
