# Diagramclo

Self-hosted clothing commerce foundation.

## Stack

- Backend API: Node.js, Express, TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Deployment: Docker Compose

## Local Setup

Copy the environment template:

```bash
cp .env.example .env
```

Install backend dependencies:

```bash
cd backend
npm install
```

Generate Prisma client:

```bash
npm run prisma:generate
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Apply the database schema:

```bash
cd backend
npm run prisma:push
```

Seed an admin user and sample products:

```bash
npm run prisma:seed
```

The seed script creates `admin@diagramclo.com` with password `ChangeMe123!` for local development. Override these with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.

Start the backend in development:

```bash
npm run dev
```

Health check:

```bash
curl http://localhost:4000/health
```

## API Surface

- `POST /auth/register` - create a customer account and return a JWT.
- `POST /auth/login` - authenticate and return a JWT.
- `GET /auth/me` - return the authenticated user for a `Bearer` token.
- `GET /products` - list active products with images and variants.
- `GET /products/:slug` - fetch one active product by slug.
- `POST /products` - create a product with variants; requires an admin `Bearer` token.
- `POST /cart` - create a guest cart.
- `GET /cart/:cartId` - fetch a cart with items.
- `POST /cart/:cartId/items` - add a variant to a cart.
- `PATCH /cart/:cartId/items/:itemId` - update item quantity; use `0` to remove.
- `DELETE /cart/:cartId/items/:itemId` - remove an item.
- `POST /orders` - checkout a cart, create an order, and decrement stock.
- `GET /orders/:orderId?email=customer@example.com` - fetch an order.
