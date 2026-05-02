import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";

export const productsRouter = Router();

const createProductSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  variants: z.array(
    z.object({
      sku: z.string().min(2),
      size: z.string().min(1),
      color: z.string().min(1),
      priceCents: z.number().int().positive(),
      compareAtCents: z.number().int().positive().optional(),
      stockQuantity: z.number().int().min(0).default(0),
    }),
  ).min(1),
});

productsRouter.get("/", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { isActive: true }, orderBy: [{ color: "asc" }, { size: "asc" }] },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ products });
  } catch (error) {
    next(error);
  }
});

productsRouter.get("/:slug", async (req, res, next) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { where: { isActive: true }, orderBy: [{ color: "asc" }, { size: "asc" }] },
      },
    });

    if (!product || !product.isActive) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/", requireAdmin, async (req, res, next) => {
  try {
    const input = createProductSchema.parse(req.body);

    const product = await prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        categoryId: input.categoryId,
        variants: {
          create: input.variants,
        },
      },
      include: {
        variants: true,
      },
    });

    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
});
