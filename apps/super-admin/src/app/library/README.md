# Library module (super-admin)

This folder contains a lightweight library management system scaffold for the Super Admin app.

Implemented now:

- Persistent JSON store: `apps/super-admin/database/library-data.json`
- Store helper: `src/lib/library-store.ts`
- APIs:
  - `GET /api/library/metrics` — returns dashboard metrics
  - `GET/POST /api/library/categories` — list and create categories
  - `PUT/DELETE /api/library/categories/[id]` — update/delete category
  - `GET/POST /api/library/books` — list and create books (creates copies when `total_copies` provided)
  - `PUT/DELETE /api/library/books/[id]` — update/delete books
  - `GET/POST /api/library/members` and `/api/library/members/[id]` — members CRUD
  - `POST /api/library/circulation/issue` — issue a copy to a member
  - `POST /api/library/circulation/return` — return an issued copy

Pages added:
- `src/app/library/page.tsx` — Dashboard (wired to metrics API)
- Masters, Catalog, Members, Circulation, Fines, Acquisition, Digital, Inventory, Reports, Settings pages (stubs)
- `Masters -> Categories` and `Catalog -> Books` have basic CRUD UI

Next recommended steps to reach full functionality:

1. Replace JSON store with a proper database schema and migrations (Postgres via `src/lib/db.ts`).
2. Implement full CRUD UIs for Authors, Publishers, Vendors, Locations, Copies.
3. Implement circulation features: renewals, reservations, lost/damaged handling.
4. Fine engine: fine rules, calculation, payment (integrate with receipts/payment API).
5. Acquisition workflow: requests, POs, receiving goods.
6. Digital library: upload/manage e-books and secure access.
7. Barcode printing and scanning support (generate printable barcodes for copies).
8. Add RBAC/permissions for librarian roles.

If you'd like, I can now:
- wire the store to Postgres and create migrations, or
- implement renewals and fine calculation logic, or
- implement barcode printing and scanning UI.
