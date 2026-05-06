import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { createRateLimiter } from "./middleware/rate-limit.js";
import { authRouter } from "./routes/auth.js";
import { adminRouter } from "./routes/admin.js";
import { cartRouter } from "./routes/cart.js";
import { healthRouter } from "./routes/health.js";
import { ordersRouter } from "./routes/orders.js";
import { categoriesRouter } from "./routes/categories.js";
import { newsletterRouter } from "./routes/newsletter.js";
import { productsRouter } from "./routes/products.js";

const app = express();
const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../uploads");

app.use(helmet());
app.set("trust proxy", 1);
app.use(cors({ origin: env.CORS_ORIGIN || true }));
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));
app.use("/uploads", express.static(uploadsRoot));

const generalLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 300,
});
const sensitiveLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 30,
});

app.use(generalLimiter);
app.use(["/auth", "/orders", "/newsletter"], sensitiveLimiter);

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/cart", cartRouter);
app.use("/health", healthRouter);
app.use("/orders", ordersRouter);
app.use("/categories", categoriesRouter);
app.use("/newsletter", newsletterRouter);
app.use("/products", productsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

if (!process.env.VERCEL) {
  app.listen(env.PORT, () => {
    console.log(`Diagramclo backend listening on port ${env.PORT}`);
  });
}

export default app;
