# Category Management — Design Spec
_Date: 2026-05-03_

## Overview

Add full category management to the Diagramclo admin dashboard: create, edit, delete, and reorder categories. Categories become required for all new products. Existing products with a null `categoryId` are not affected. The Collections page and shop filter already consume category data from products; this feature adds the admin surface to manage that data directly.

---

## Data Model

**Change to `backend/prisma/schema.prisma`:**

Add `sortOrder` to the `Category` model:

```prisma
model Category {
  id          String    @id @default(cuid())
  name        String
  slug        String    @unique
  description String?
  sortOrder   Int       @default(0)
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  products    Product[]
}
```

`Product.categoryId` stays nullable in the DB (so existing products are not broken). New products are required to supply a `categoryId` at the API layer.

`sortOrder` is **not** unique-constrained at the DB level. Ties are tolerated — the sort is stable enough for cosmetic ordering. No DB migration is needed for uniqueness.

**Migration:**

```bash
cd backend
npx prisma migrate dev --name add-category-sort-order
npx prisma generate
```

For production: `npx prisma migrate deploy`.

Adding `sortOrder Int @default(0)` is non-destructive — all existing rows get `sortOrder = 0`.

---

## Backend API

New file: `backend/src/routes/categories.ts`.

**Register in `backend/src/index.ts`** — insert before the existing 404 catch-all handler (same placement as products):

```ts
import { categoriesRouter } from "./routes/categories.js";
app.use("/categories", categoriesRouter);
```

**All three mutating endpoints (POST, PATCH, DELETE) use `requireAdmin` middleware explicitly.**

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/categories` | Public | List all categories sorted by `sortOrder` asc, with product count |
| POST | `/categories` | `requireAdmin` | Create a category |
| PATCH | `/categories/:id` | `requireAdmin` | Update name, slug, description, or sortOrder |
| DELETE | `/categories/:id` | `requireAdmin` | Delete; requires `moveTo` query param if category has products |

### GET /categories response shape

```ts
{
  categories: Array<{
    id: string
    name: string
    slug: string
    description: string | null
    sortOrder: number
    _count: { products: number }
  }>
}
```

Returning `_count.products` on the public endpoint is intentional — the storefront Collections page needs product counts per category.

Implementation:

```ts
prisma.category.findMany({
  include: { _count: { select: { products: true } } },
  orderBy: { sortOrder: 'asc' },
})
```

### Validation schemas (Zod)

```ts
const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

createCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(slugRegex),
  description: z.string().optional(),
})

updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(slugRegex).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
})
```

### sortOrder auto-assign on create

```ts
const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
const sortOrder = (max._max.sortOrder ?? -1) + 1;
```

This is not atomic — two concurrent creates may receive the same sortOrder. This is intentional and acceptable since sortOrder is cosmetic and ties are tolerated (no DB uniqueness constraint).

### Slug uniqueness (create and update)

Wrap both the `prisma.category.create` and `prisma.category.update` calls in a try/catch. Catch Prisma error code `P2002` (unique constraint violation) and return `400 { error: "Slug already in use." }`.

### Description coercion

Both create and update: coerce `description: ""` to `undefined` before passing to Prisma, so the DB stores `null` rather than an empty string — consistent with the `description String?` nullable schema.

```ts
description: input.description || undefined
```

### DELETE logic

1. `findUnique({ where: { id } })` — return 404 if not found.
2. Count products: `prisma.product.count({ where: { categoryId: id } })`.
3. If count > 0 and no `moveTo` param → 400: `{ error: "Category has products. Provide moveTo query param." }`
4. If count > 0 and `moveTo` provided:
   - If `moveTo === id` → 400: `{ error: "moveTo must be a different category." }`
   - `findUnique({ where: { id: moveTo } })` — if not found → 400: `{ error: "moveTo category not found." }`
   - `prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: moveTo } })`
5. `prisma.category.delete({ where: { id } })`

> Note: The existing Prisma schema has `onDelete: SetNull` on `Product.category`. This means if `delete` is called directly without the `updateMany` step, products would have their `categoryId` set to null — which is why the `updateMany` in step 4 must run before the delete, not after.

### Product create enforcement

In `POST /products`, the existing `createProductSchema` has `categoryId: z.string().optional()`. Change it to `z.string().min(1)` (required). Additionally, after schema validation, verify the category exists:

```ts
const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
if (!category) {
  res.status(400).json({ error: "Category not found." });
  return;
}
```

The Prisma schema `categoryId String?` remains nullable for legacy data. Only the application layer enforces it for new creates.

### Legacy products

Products with `categoryId: null` are not modified. The admin catalog renders them with "—" in the category column. No enforcement is applied on existing records.

The storefront already handles null category gracefully — the product detail modal uses `product.category?.name ?? "Product"` and the shop filter uses optional chaining throughout. No storefront changes required.

---

## Frontend

All changes are in `frontend/src/App.tsx` and `frontend/src/styles.css`.

### New type

```ts
type AdminCategory = {
  id: string
  name: string
  slug: string
  description: string | null
  sortOrder: number
  _count: { products: number }
}
```

(`createdAt` and `updatedAt` are intentionally excluded — not needed in the UI.)

### New state

```ts
adminCategories: AdminCategory[]   // default: []
loadingCategories: boolean         // default: true (until fetch completes)
adminCategoryForm: { name: string; slug: string; description: string }  // default: all ""
editingCategoryId: string | null   // default: null
editCategoryForm: { name: string; slug: string; description: string }   // default: all ""
deletingCategoryId: string | null  // default: null
moveToCategory: string             // default: ""  ("" = not selected)
```

### Trigger for category fetch

Inside the existing `useEffect` that fires when `authUser?.role === "ADMIN"`, add a parallel request:

```ts
request<{ categories: AdminCategory[] }>("/categories", {
  headers: { Authorization: `Bearer ${authToken}` },
})
  .then(({ categories }) => {
    setAdminCategories(categories);
    setLoadingCategories(false);
  })
  .catch(() => {
    setAdminCategories([]);
    setLoadingCategories(false);
    setNotice("Could not load categories.");
  });
```

### Admin page — Categories section

New `<section className="admin-categories">` rendered when `authUser.role === "ADMIN"`, placed between the product create form and the orders section.

---

**Add category form:**

- Name input (required)
- Slug input — auto-generated from name using:
  ```ts
  name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  ```
  Editable after auto-generation. If the auto-generated slug is empty or fewer than 2 characters, disable the submit button and show an inline hint: "Slug too short — edit it manually."
- Description input (optional)
- Submit button — disabled while submitting

On submit: call `POST /categories`, append result to `adminCategories`, reset `adminCategoryForm` to all `""`.

---

**Category list:**

While `loadingCategories === true`: show `"Loading categories."`
When `adminCategories.length === 0` (and not loading): show `"No categories yet. Add one above."`

One `.admin-category-row` per category:
- Name, slug, product count (`_count.products products`)
- **Up button** — disabled when it is the first item; clicking swaps this category's sortOrder with the previous one
- **Down button** — disabled when it is the last item; clicking swaps this category's sortOrder with the next one
- **Edit button** — sets `editingCategoryId = category.id`, sets `editCategoryForm = { name: category.name, slug: category.slug, description: category.description ?? "" }`
- **Delete button** — sets `deletingCategoryId = category.id`, resets `moveToCategory = ""`

**Reorder (Up/Down) implementation:**

```ts
const swapSortOrder = async (a: AdminCategory, b: AdminCategory) => {
  // Optimistic update
  setAdminCategories(current =>
    current.map(cat =>
      cat.id === a.id ? { ...cat, sortOrder: b.sortOrder }
      : cat.id === b.id ? { ...cat, sortOrder: a.sortOrder }
      : cat
    ).sort((x, y) => x.sortOrder - y.sortOrder)
  );
  try {
    await Promise.all([
      request(`/categories/${a.id}`, { method: "PATCH", ..., body: JSON.stringify({ sortOrder: b.sortOrder }) }),
      request(`/categories/${b.id}`, { method: "PATCH", ..., body: JSON.stringify({ sortOrder: a.sortOrder }) }),
    ]);
  } catch {
    // Revert: re-fetch the authoritative list
    const { categories } = await request<{ categories: AdminCategory[] }>("/categories");
    setAdminCategories(categories);
    setNotice("Reorder failed. Order restored.");
  }
};
```

Both PATCHes are sent in parallel. If either fails, the optimistic update is reverted by re-fetching. The two-call approach may produce a brief window of duplicate sortOrders — this is acceptable since sortOrder has no uniqueness constraint.

---

**Inline edit (`.admin-category-edit`):**

Rendered in place of the read view when `editingCategoryId === category.id`.
Fields: Name, Slug, Description. (`description` pre-fills from `category.description ?? ""` to avoid uncontrolled input warnings.)
`sortOrder` is NOT included in the edit form — only modified via Up/Down buttons.
PATCH body omits `sortOrder` entirely.

Save: call `PATCH /categories/:id` with `{ name, slug, description: description || undefined }`. On success, update `adminCategories`, clear `editingCategoryId`.
Cancel: clear `editingCategoryId`.

---

**Delete flow:**

Rendered inline in the category row when `deletingCategoryId === category.id`.

- If `_count.products === 0`:
  - Show: "Delete [name]?" + "Confirm" button + "Cancel" button
  - Confirm: `DELETE /categories/:id` (no `moveTo`)

- If `_count.products > 0`:
  - Show: "[N] products will be moved to:" + dropdown + "Confirm" button (disabled until `moveToCategory !== ""`) + "Cancel"
  - Dropdown: `<option value="">— select a category —</option>` followed by all categories **excluding** the one being deleted
  - Confirm: `DELETE /categories/:id?moveTo=<moveToCategory>`

On success: filter `deletingCategoryId` out of `adminCategories`, reset `deletingCategoryId = null` and `moveToCategory = ""`.
Cancel: reset `deletingCategoryId = null` and `moveToCategory = ""`.

---

### Product create form — Category field

Add between Description and Image URL:

```tsx
<label>
  Category
  <select
    required
    value={adminProduct.categoryId}
    onChange={(e) => setAdminProduct({ ...adminProduct, categoryId: e.target.value })}
  >
    <option value="">Select category</option>
    {adminCategories.map((cat) => (
      <option value={cat.id} key={cat.id}>{cat.name}</option>
    ))}
  </select>
</label>
```

`adminProduct` state gains `categoryId: string` (default `""`). The submit button is disabled if `categoryId === ""` (rely on the existing `disabled` guard) and the backend will also return 400 as a safety net.

`adminProduct` passes `categoryId` to the `POST /products` body.

---

## CSS

Two new classes only — all other styles reuse existing admin patterns:

```css
.admin-category-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--border);
}

.admin-category-edit {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem 0;
}
```

---

## Error Handling

| Scenario | Backend | Frontend |
|----------|---------|----------|
| Duplicate slug on create | 400 "Slug already in use." | Show in notice |
| Duplicate slug on update | 400 "Slug already in use." | Show in notice |
| Delete with products, no moveTo | 400 | Prompt user to select target |
| moveTo === deletingCategoryId | Prevented by dropdown filtering | — |
| moveTo not found | 400 "moveTo category not found." | Show in notice |
| Category not found on delete | 404 | Show in notice |
| GET /categories fails on load | — | Set notice, show empty list |
| Auto-slug too short | — | Disable submit, show inline hint |
| categoryId empty on product create | 400 | Prevented by disabled submit + backend 400 |

---

## Out of Scope

- Category images or hero art
- Category visibility toggle
- Drag-and-drop reordering
