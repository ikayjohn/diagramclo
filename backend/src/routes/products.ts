import { Router } from "express";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";

export const productsRouter = Router();

const uploadRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../uploads/products");
fs.mkdirSync(uploadRoot, { recursive: true });

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadRoot),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed."));
      return;
    }
    cb(null, true);
  },
});

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
  categoryId: z.string().min(1).optional(),
});

const updateVariantSchema = z.object({
  priceCents: z.number().int().positive().optional(),
  stockQuantity: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

const addVariantSchema = z.object({
  sku: z.string().min(2),
  size: z.string().min(1),
  color: z.string().min(1),
  priceCents: z.number().int().positive(),
  compareAtCents: z.number().int().positive().optional(),
  stockQuantity: z.number().int().min(0).default(0),
});

const addImageSchema = z.object({
  url: z.string().url(),
  altText: z.string().optional(),
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
      data: {
        name: input.name,
        description: input.description !== undefined ? (input.description || undefined) : undefined,
        isActive: input.isActive,
        categoryId: input.categoryId,
      },
      include: {
        category: true,
        images: { orderBy: { sortOrder: "asc" } },
        variants: { orderBy: [{ color: "asc" }, { size: "asc" }] },
      },
    });

    res.json({ product });
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/:productId/variants", requireAdmin, async (req, res, next) => {
  try {
    const productId = req.params.productId as string;
    const input = addVariantSchema.parse(req.body);

    const variant = await prisma.productVariant.create({
      data: {
        productId,
        sku: input.sku,
        size: input.size,
        color: input.color,
        priceCents: input.priceCents,
        compareAtCents: input.compareAtCents,
        stockQuantity: input.stockQuantity,
      },
    });

    res.status(201).json({ variant });
  } catch (error: any) {
    if (error?.code === "P2002") {
      res.status(400).json({ error: "SKU already in use." });
      return;
    }
    next(error);
  }
});

productsRouter.post("/:productId/images", requireAdmin, async (req, res, next) => {
  try {
    const productId = req.params.productId as string;
    const input = addImageSchema.parse(req.body);

    const max = await prisma.productImage.aggregate({
      where: { productId },
      _max: { sortOrder: true },
    });
    const sortOrder = ((max._max?.sortOrder) ?? -1) + 1;

    const image = await prisma.productImage.create({
      data: { productId, url: input.url, altText: input.altText, sortOrder },
    });

    res.status(201).json({ image });
  } catch (error) {
    next(error);
  }
});

productsRouter.post("/:productId/images/upload", requireAdmin, imageUpload.single("image"), async (req, res, next) => {
  try {
    const productId = req.params.productId as string;
    if (!req.file) {
      res.status(400).json({ error: "Image file is required." });
      return;
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      res.status(404).json({ error: "Product not found." });
      return;
    }

    const max = await prisma.productImage.aggregate({
      where: { productId },
      _max: { sortOrder: true },
    });
    const sortOrder = ((max._max?.sortOrder) ?? -1) + 1;
    const image = await prisma.productImage.create({
      data: {
        productId,
        url: `/uploads/products/${req.file.filename}`,
        altText: typeof req.body.altText === "string" && req.body.altText ? req.body.altText : product.name,
        sortOrder,
      },
    });

    res.status(201).json({ image });
  } catch (error) {
    next(error);
  }
});

productsRouter.delete("/images/:imageId", requireAdmin, async (req, res, next) => {
  try {
    const imageId = req.params.imageId as string;
    await prisma.productImage.delete({ where: { id: imageId } });
    res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Image not found." });
      return;
    }
    next(error);
  }
});

productsRouter.delete("/variants/:variantId", requireAdmin, async (req, res, next) => {
  try {
    const variantId = req.params.variantId as string;
    await prisma.productVariant.delete({ where: { id: variantId } });
    res.json({ ok: true });
  } catch (error: any) {
    if (error?.code === "P2003") {
      res.status(400).json({ error: "Variant has orders and cannot be deleted." });
      return;
    }
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Variant not found." });
      return;
    }
    next(error);
  }
});
