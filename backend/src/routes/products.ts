import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";

export const productsRouter = Router();

const createProductSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().optional(),
  categoryId: z.string().min(1),
  images: z.array(
    z.object({
      url: z.string().url(),
      altText: z.string().optional(),
    }),
  ).optional(),
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

const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

const updateVariantSchema = z.object({
  priceCents: z.number().int().positive().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

productsRouter.get("/admin/all", requireAdmin, async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({ products });
  } catch (error) {
    next(error);
  }
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

    const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
    if (!category) {
      res.status(400).json({ error: "Category not found." });
      return;
    }

    const product = await prisma.product.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        categoryId: input.categoryId,
        images: input.images?.length
          ? {
              create: input.images.map((image, index) => ({
                url: image.url,
                altText: image.altText,
                sortOrder: index,
              })),
            }
          : undefined,
        variants: {
          create: input.variants,
        },
      },
      include: {
        images: true,
        variants: true,
      },
    });

    res.status(201).json({ product });
  } catch (error) {
    next(error);
  }
});

productsRouter.patch("/variants/:variantId", requireAdmin, async (req, res, next) => {
  try {
    const variantId = req.params.variantId;
    if (typeof variantId !== "string") {
      res.status(400).json({ error: "Invalid variant ID" });
      return;
    }

    const input = updateVariantSchema.parse(req.body);
    const variant = await prisma.productVariant.update({
      where: { id: variantId },
      data: input,
    });

    res.json({ variant });
  } catch (error) {
    next(error);
  }
});

productsRouter.patch("/:productId", requireAdmin, async (req, res, next) => {
  try {
    const productId = req.params.productId;
    if (typeof productId !== "string") {
      res.status(400).json({ error: "Invalid product ID" });
      return;
    }

    const input = updateProductSchema.parse(req.body);
    const product = await prisma.product.update({
      where: { id: productId },
      data: input,
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
      },
    });

    res.json({ product });
  } catch (error) {
    next(error);
  }
});
