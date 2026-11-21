---
name: frontend-engineering
description: >
  Build and modify production-grade web frontends using React 19, Next.js 15 App Router,
  TypeScript strict mode, and Tailwind CSS. Covers server components vs client components,
  data fetching with TanStack Query, state management with Zustand, forms with React Hook Form
  and Zod validation, accessibility (WCAG 2.2 AA), Core Web Vitals performance optimization,
  SEO metadata, i18n, error boundaries, responsive layouts, code splitting, image and font
  optimization, bundle analysis, SSR, CSR, streaming, server actions, and routing.
  Triggers on: React, Next.js, Next.js App Router, Vue-to-React migration, UI components,
  frontend components, forms, form validation, website is slow, Lighthouse score, responsive
  layout, Tailwind CSS, SSR, CSR, ISR, hydration error, frontend bugs, dashboard, data table,
  pagination, signup form, login form, accessibility, WCAG, ARIA, keyboard navigation,
  Core Web Vitals, LCP, CLS, INP, code splitting, lazy loading, bundle size, SEO, metadata,
  OpenGraph, sitemap, i18n, internationalization, error boundary, Zustand, TanStack Query,
  React Query, React Hook Form, Zod schema, TypeScript frontend, web app, SPA, MPA,
  server components, client components, streaming SSR, server actions, revalidation, caching.
license: MIT
allowed-tools:
  - read_file
  - write_file
  - edit_file
  - run_command
  - search_web
compatibility:
  os:
    - windows
    - macos
    - linux
---

# Frontend Engineering Skill

Build, debug, and optimize production-grade web frontends with React 19, Next.js 15 App Router, TypeScript, and Tailwind CSS.

## Decision Flow

```
User request arrives
├─ New project from scratch?
│  └─ Use scaffold script → see "Scaffolding a New Project"
├─ Existing project modification?
│  └─ Read project structure first → identify framework version, router type, state approach
├─ Performance issue ("slow", "Lighthouse", "LCP")?
│  └─ references/performance-playbook.md
├─ Accessibility issue ("a11y", "WCAG", "screen reader", "keyboard")?
│  └─ references/accessibility-checklist.md
├─ Bug (hydration, re-render, stale data)?
│  └─ references/common-bugs.md
├─ State / data-fetching question?
│  └─ references/state-and-data.md
├─ Routing / layouts / server vs client components?
│  └─ references/nextjs-app-router.md
└─ Project organization?
   └─ references/project-structure.md
```

## Core Principles

1. **Server-first rendering.** Default to React Server Components. Add `"use client"` only when the component needs browser APIs, event handlers, or React hooks that require client state (useState, useEffect, useReducer).
2. **Type safety everywhere.** Enable TypeScript strict mode. Define explicit return types for exported functions. Use Zod schemas as the single source of truth for validation, then infer TS types with `z.infer<typeof schema>`.
3. **Progressive enhancement.** Forms should work without JS. Use `<form action={serverAction}>` where possible. Layer client-side validation on top.
4. **Accessible by default.** Use semantic HTML first. Add ARIA attributes only when no native element conveys the semantics. Test keyboard navigation for every interactive element.
5. **Performance budget.** Target LCP < 2.5s, CLS < 0.1, INP < 200ms. Lazy-load below-fold content. Use `next/image` and `next/font`.

## Scaffolding a New Project

Run the scaffold script to create an opinionated Next.js 15 starter:

```bash
bash scripts/scaffold_next_app.sh my-app
```

This creates a project with:
- Next.js 15 App Router + React 19 + TypeScript strict
- Tailwind CSS 4 configured
- ESLint + Prettier with the preset from `assets/`
- Folder structure per `references/project-structure.md`
- Error boundary and not-found pages pre-wired

## Component Authoring

### Server Component (default)

```tsx
// app/products/page.tsx — no "use client" needed
import { db } from "@/lib/db";
import { ProductCard } from "@/components/product-card";

export default async function ProductsPage() {
  const products = await db.product.findMany({ take: 20 });

  return (
    <main className="grid grid-cols-1 gap-6 p-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </main>
  );
}
```

### Client Component (interactive)

```tsx
"use client";

import { useState, useCallback } from "react";
import { type Product } from "@/types/product";

interface ProductFilterProps {
  categories: string[];
  onFilter: (category: string) => void;
}

export function ProductFilter({ categories, onFilter }: ProductFilterProps) {
  const [active, setActive] = useState<string>("all");

  const handleClick = useCallback(
    (cat: string) => {
      setActive(cat);
      onFilter(cat);
    },
    [onFilter],
  );

  return (
    <div role="group" aria-label="Filter by category" className="flex gap-2">
      {categories.map((cat) => (
        <button
          key={cat}
          onClick={() => handleClick(cat)}
          aria-pressed={active === cat}
          className={`rounded-full px-4 py-2 text-sm font-medium transition
            ${active === cat ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
        >
          {cat}
        </button>
      ))}
    </div>
  );
}
```

### Composition Pattern (Server + Client)

```tsx
// app/products/page.tsx — Server Component orchestrates
import { db } from "@/lib/db";
import { ProductFilter } from "@/components/product-filter";
import { ProductList } from "@/components/product-list";

export default async function ProductsPage() {
  const categories = await db.category.findMany();
  const products = await db.product.findMany({ take: 50 });

  return (
    <main className="p-6">
      <h1 className="mb-6 text-2xl font-bold">Products</h1>
      {/* Client component receives serializable props from server */}
      <ProductFilter categories={categories.map((c) => c.name)} />
      <ProductList initialProducts={products} />
    </main>
  );
}
```

## Forms with Validation

Use React Hook Form + Zod for client-side, server actions + Zod for server-side:

```tsx
// lib/schemas/signup.ts
import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Must contain an uppercase letter")
    .regex(/[0-9]/, "Must contain a number"),
});

export type SignupInput = z.infer<typeof signupSchema>;
```

```tsx
// app/signup/actions.ts
"use server";

import { signupSchema } from "@/lib/schemas/signup";

export async function signupAction(_prev: unknown, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const result = signupSchema.safeParse(raw);

  if (!result.success) {
    return { errors: result.error.flatten().fieldErrors };
  }

  // persist user...
  return { success: true };
}
```

See `references/state-and-data.md` for TanStack Query integration and `references/accessibility-checklist.md` for form a11y patterns.

## Data Fetching Patterns

| Pattern | When to Use | Implementation |
|---------|-------------|----------------|
| Server Component `async/await` | Static or per-request data | `fetch()` in RSC with `cache: "force-cache"` or `revalidate` |
| Server Action | Mutations, form submissions | `"use server"` function + `revalidatePath` / `revalidateTag` |
| TanStack Query | Client-side polling, optimistic updates, infinite scroll | `useQuery` / `useMutation` in `"use client"` components |
| Route Handler | External API proxy, webhooks | `app/api/*/route.ts` |

## Performance Checklist (Quick)

1. Use `next/image` with explicit `width`/`height` or `fill` + `sizes` for all images.
2. Use `next/font` to self-host fonts — eliminates render-blocking requests.
3. Add `loading="lazy"` to below-fold images (next/image does this by default).
4. Use `React.lazy()` + `Suspense` or `next/dynamic` for heavy client components.
5. Set `experimental.optimizePackageImports` in `next.config.ts` for barrel-file libraries.
6. Run `bash scripts/bundle_report.sh` to identify large modules.
7. Run `node scripts/a11y_check.js <url>` to catch accessibility regressions.

Deep dive → `references/performance-playbook.md`

## Error Handling

```tsx
// app/error.tsx — catches errors in the nearest layout segment
"use client";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-center gap-4 p-8">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="text-gray-600">{error.message}</p>
      <button
        onClick={reset}
        className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
      >
        Try again
      </button>
    </div>
  );
}
```

Place `error.tsx` at each route segment that needs independent error isolation. Place `global-error.tsx` at the app root to catch root layout errors.

## SEO & Metadata

```tsx
// app/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  metadataBase: new URL("https://example.com"),
  title: { default: "My App", template: "%s | My App" },
  description: "Production app built with Next.js",
  openGraph: { type: "website", locale: "en_US" },
  robots: { index: true, follow: true },
};
```

Use `generateMetadata()` for dynamic pages. Add `sitemap.ts` and `robots.ts` in `app/` for crawlers.

## Responsive Layout with Tailwind

Follow mobile-first. Use Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`). Avoid arbitrary breakpoints.

```tsx
<div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
  {items.map((item) => (
    <Card key={item.id} {...item} />
  ))}
</div>
```

## Reference Index

| Topic | File |
|-------|------|
| Next.js App Router deep dive | `references/nextjs-app-router.md` |
| State management & data fetching | `references/state-and-data.md` |
| Accessibility checklist | `references/accessibility-checklist.md` |
| Performance playbook | `references/performance-playbook.md` |
| Project structure conventions | `references/project-structure.md` |
| Common bugs & fixes | `references/common-bugs.md` |

## Asset Index

| Asset | Purpose |
|-------|---------|
| `assets/component.tsx` | Component starter template |
| `assets/page.tsx` | Next.js page template |
| `assets/use-debounce.ts` | Custom hook template (debounce) |
| `assets/eslintrc.json` | ESLint config preset |
| `assets/tsconfig.json` | TypeScript strict config |
