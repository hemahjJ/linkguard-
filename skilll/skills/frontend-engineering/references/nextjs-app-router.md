# Next.js App Router Deep Dive

## Server Components vs Client Components

### Mental Model

React Server Components (RSC) run **only on the server**. They can directly access databases, file systems, and secrets. Their code never ships to the browser bundle.

Client Components run on **both server (for initial HTML) and client (for hydration + interactivity)**. Mark them with `"use client"` at the top of the file.

### Decision Rule

```
Does this component need:
  - useState, useReducer, useContext?
  - useEffect, useLayoutEffect?
  - Browser-only APIs (window, document, localStorage)?
  - Event handlers (onClick, onChange, onSubmit)?
  - Custom hooks that use any of the above?

YES → "use client"
NO  → Keep as Server Component (default)
```

### Serialization Boundary

Props passed from a Server Component to a Client Component must be serializable (JSON-compatible). You cannot pass functions, classes, Dates (use ISO strings), or JSX as props across this boundary — except `children`, which React handles specially.

```tsx
// ✅ Correct: pass serializable data + children
<ClientTabs labels={["Tab 1", "Tab 2"]}>
  <ServerContent />  {/* children is fine */}
</ClientTabs>

// ❌ Wrong: passing a function from server to client
<ClientButton onClick={serverFn} />
```

### Composition Pattern

Place `"use client"` as deep as possible. Wrap only the interactive leaf in a client boundary:

```
layout.tsx (server)
  └── page.tsx (server)
        ├── <StaticHeader />       (server)
        ├── <InteractiveFilter />  (client — "use client")
        └── <DataTable data={…} /> (server)
```

## Routing

### File-System Routes

| File | Purpose |
|------|---------|
| `page.tsx` | Renders UI for the route segment |
| `layout.tsx` | Shared UI wrapper (persists across navigations) |
| `loading.tsx` | Instant loading UI (wraps page in Suspense) |
| `error.tsx` | Error boundary for the segment |
| `not-found.tsx` | 404 UI for `notFound()` calls |
| `route.ts` | API route handler (GET, POST, etc.) |
| `template.tsx` | Like layout but re-mounts on navigation |

### Dynamic Routes

```
app/
  products/
    [id]/
      page.tsx          → /products/123
    [...slug]/
      page.tsx          → /products/a/b/c
    [[...slug]]/
      page.tsx          → /products OR /products/a/b
```

Generate static params for dynamic routes:

```tsx
export async function generateStaticParams() {
  const products = await db.product.findMany({ select: { id: true } });
  return products.map((p) => ({ id: String(p.id) }));
}
```

### Route Groups

Use `(groupName)` folders to organize routes without affecting the URL:

```
app/
  (marketing)/
    layout.tsx          → Marketing-specific layout
    page.tsx            → /
    about/page.tsx      → /about
  (dashboard)/
    layout.tsx          → Dashboard layout with sidebar
    dashboard/page.tsx  → /dashboard
```

### Parallel Routes

Use `@slotName` folders for rendering multiple pages in the same layout simultaneously:

```
app/
  layout.tsx           → receives { children, analytics, team } as props
  @analytics/
    page.tsx
  @team/
    page.tsx
  page.tsx
```

### Intercepting Routes

Use `(.)`, `(..)`, `(...)` conventions to intercept a route and show it in a modal while keeping the URL:

```
app/
  feed/
    page.tsx
    (.)photo/[id]/     → intercepts /feed/photo/123 at same level
      page.tsx         → shows in modal
  photo/[id]/
    page.tsx           → full page (direct navigation)
```

## Data Fetching

### In Server Components

```tsx
// Automatic deduplication — same fetch in multiple components runs once
async function getProduct(id: string) {
  const res = await fetch(`https://api.example.com/products/${id}`, {
    next: { revalidate: 3600 }, // ISR: revalidate every hour
  });
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json() as Promise<Product>;
}
```

### Caching Strategies

| Option | Behavior |
|--------|----------|
| `cache: "force-cache"` (default) | Cache indefinitely until revalidated |
| `cache: "no-store"` | Always fetch fresh (opt out of cache) |
| `next: { revalidate: N }` | ISR — serve stale, revalidate after N seconds |
| `next: { tags: ["products"] }` | Tag-based revalidation with `revalidateTag()` |

### Streaming with Suspense

Wrap slow data fetches in Suspense to stream HTML progressively:

```tsx
import { Suspense } from "react";
import { ProductReviews } from "./product-reviews";
import { ReviewsSkeleton } from "./reviews-skeleton";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id); // fast — renders immediately

  return (
    <main>
      <h1>{product.name}</h1>
      <p>{product.description}</p>
      <Suspense fallback={<ReviewsSkeleton />}>
        <ProductReviews productId={id} />  {/* slow — streamed later */}
      </Suspense>
    </main>
  );
}
```

## Server Actions

Server Actions are async functions that run on the server, callable from client or server components.

### Defining Actions

```tsx
// app/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

const schema = z.object({
  title: z.string().min(1),
  content: z.string().min(10),
});

export async function createPost(_prev: unknown, formData: FormData) {
  const parsed = schema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  await db.post.create({ data: parsed.data });
  revalidatePath("/posts");
  redirect("/posts");
}
```

### Using with useActionState (React 19)

```tsx
"use client";

import { useActionState } from "react";
import { createPost } from "@/app/actions";

export function PostForm() {
  const [state, formAction, isPending] = useActionState(createPost, null);

  return (
    <form action={formAction}>
      <input name="title" aria-describedby="title-error" />
      {state?.errors?.title && (
        <p id="title-error" role="alert" className="text-red-600 text-sm">
          {state.errors.title[0]}
        </p>
      )}
      <textarea name="content" aria-describedby="content-error" />
      {state?.errors?.content && (
        <p id="content-error" role="alert" className="text-red-600 text-sm">
          {state.errors.content[0]}
        </p>
      )}
      <button type="submit" disabled={isPending}>
        {isPending ? "Creating..." : "Create Post"}
      </button>
    </form>
  );
}
```

## Middleware

Place `middleware.ts` at the project root (next to `app/`). Runs before every matched request.

```tsx
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const locale = request.cookies.get("locale")?.value ?? "en";
  const response = NextResponse.next();
  response.headers.set("x-locale", locale);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## Metadata API

### Static Metadata

```tsx
export const metadata: Metadata = {
  title: "Products",
  description: "Browse our product catalog",
};
```

### Dynamic Metadata

```tsx
export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const product = await getProduct(id);
  return {
    title: product.name,
    description: product.summary,
    openGraph: {
      images: [{ url: product.imageUrl, width: 1200, height: 630 }],
    },
  };
}
```
