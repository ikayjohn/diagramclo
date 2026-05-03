# Diagramclo Handoff

This project is a Diagramclo storefront with a React/Vite frontend and an Express/Prisma/Postgres backend.

## Current State

- Git branch: `main`
- Working tree at handoff: clean
- Latest pushed commit: `99b3910 Make Paystack footer logo monochrome`
- Frontend build passed after the latest footer/payment-logo change.

## Stack

- Frontend: Vite, React, TypeScript, CSS in `frontend/src/styles.css`
- Backend: Express, TypeScript, Prisma, Postgres
- API URL expected by frontend: `VITE_API_URL=http://localhost:4000`
- Backend expects Postgres via `DATABASE_URL`

## Run Locally

Backend:

```bash
cd backend
npm install
npx prisma generate
npx prisma db push
npm run build
npm run dev
```

Frontend:

```bash
cd frontend
npm install
npm run build
npm run dev
```

Use `VITE_API_URL=http://localhost:4000` for the frontend.

## Major Features Already Built

- Homepage styled after the provided Denim Tears reference:
  - Transparent overlay header only on homepage
  - Local hero image: `frontend/src/assets/home-hero.png`
  - Logo wired from `frontend/src/assets/logo-transparent.png`
  - `DIAGRAMCLO™` hero wordmark
- Header navigation:
  - `New`
  - `Collections`
  - `Shop All`
  - `Limited`
  - `Custom`
  - Search currently links to shop
  - Account/Login route
  - Cart drawer
- Shared footer:
  - 4-column inspired layout
  - Customer Care links
  - Info links
  - Subscribe form UI
  - Social links:
    - Instagram: `https://www.instagram.com/diagramonlinee/`
    - Snapchat: `https://www.snapchat.com/@diagramclo`
  - Currency selector with down chevron
  - Payment icons from `frontend/src/assets/icons`
  - Footer credit: `Built & managed by Southcast Company.` linked to `mailto:southcastng@gmail.com`
- Shop page:
  - Product grid
  - Add-to-cart button on hover
  - Search
  - Category filter
  - Size filter
  - Color filter
  - Stock filter
  - Sort controls
  - Empty state
- Product detail modal
- Cart drawer with quantity controls and cleaned spacing
- Checkout page:
  - Creates backend orders
  - Logged-in customer address autofill
  - Saved address selection
- Customer account:
  - Signup
  - Login
  - Profile update
  - Order history
  - Saved addresses
- Order tracking page
- Admin dashboard:
  - Create products
  - Update product active state
  - Update variant stock/price/visibility
  - View recent orders
  - Update order status and payment status
- Static/customer-care pages:
  - Shipping & Delivery
  - Contact
  - Privacy Policy
  - Terms of Service
  - Care Guide
  - Size Guide
- Custom page:
  - Route: `#custom`
  - Replaced the earlier Editorial page.

## Recent Footer Decisions

- Payment logos are now actual SVG asset imports, not text badges.
- Current payment icon order:
  - Visa
  - Mastercard
  - Verve
  - Paystack
  - Stripe
  - PayPal
  - Bank transfer
- Paystack is intentionally smaller than the other icons and is forced monochrome in CSS:

```css
.payment-logo.paystack-logo {
  filter: brightness(0);
  height: 18px;
}
```

- Other payment icons are currently `38px` high.
- Payment icon grid is currently `repeat(4, auto)` and vertically centered.

## Important Files

- Main frontend app: `frontend/src/App.tsx`
- Main stylesheet: `frontend/src/styles.css`
- Logo: `frontend/src/assets/logo-transparent.png`
- Homepage hero: `frontend/src/assets/home-hero.png`
- Payment icons: `frontend/src/assets/icons/`
- Backend auth routes: `backend/src/routes/auth.ts`
- Backend product routes: `backend/src/routes/products.ts`
- Backend order routes: `backend/src/routes/orders.ts`
- Prisma schema: `backend/prisma/schema.prisma`

## Known Gaps / Recommended Next Work

1. Replace the subscribe form UI with real newsletter capture or remove the form action ambiguity.
2. Build a real search page or search overlay; the header `Search` link currently routes to `#shop`.
3. Improve admin product editing:
   - Add image upload support or image asset selection.
   - Add multi-variant creation.
   - Add category management.
4. Add payment integration later. User said Paystack will be added later, but Paystack branding is already in the footer.
5. Add stronger responsive QA for:
   - Footer at mobile/tablet widths
   - Shop filter row
   - Admin dashboard
6. Consider visual QA via screenshots before further footer changes, because several footer payment-icon tweaks were subjective.

## User Preferences Learned

- Wants the homepage close to the provided Denim Tears-style reference.
- Prefers minimalist black/white, dense fashion-commerce styling.
- Wants footer typography larger but not heavy.
- Wants payment methods visually clean, not padded text badges.
- Wants Paystack monochrome and smaller than other payment logos.
- Does not want Paystack payment integration yet.
- Current preferred font is Inter across the project.

## Verification Commands

Run these before handing work back:

```bash
cd frontend
npm run build
```

```bash
cd backend
npm run build
```

If changing Prisma schema:

```bash
cd backend
npx prisma validate
npx prisma generate
```

