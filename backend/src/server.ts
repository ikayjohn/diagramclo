import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.js";
import { cartRouter } from "./routes/cart.js";
import { healthRouter } from "./routes/health.js";
import { ordersRouter } from "./routes/orders.js";
import { categoriesRouter } from "./routes/categories.js";
import { productsRouter } from "./routes/products.js";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

app.use("/auth", authRouter);
app.use("/cart", cartRouter);
app.use("/health", healthRouter);
app.use("/orders", ordersRouter);
app.use("/categories", categoriesRouter);
app.use("/products", productsRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

app.listen(env.PORT, () => {
  console.log(`Diagramclo backend listening on port ${env.PORT}`);
});
