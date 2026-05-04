import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";

export const categoriesRouter = Router();

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createCategorySchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(2).regex(slugRegex),
  description: z.string().optional(),
});

const updateCategorySchema = z.object({
  name: z.string().min(2).optional(),
  slug: z.string().min(2).regex(slugRegex).optional(),
  description: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

categoriesRouter.get("/", async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: "asc" },
    });
    res.json({ categories });
  } catch (error) {
    next(error);
  }
});

categoriesRouter.post("/", requireAdmin, async (req, res, next) => {
  try {
    const input = createCategorySchema.parse(req.body);

    const max = await prisma.category.aggregate({ _max: { sortOrder: true } });
    const sortOrder = (max._max.sortOrder ?? -1) + 1;

    const category = await prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description || undefined,
        sortOrder,
      },
      include: { _count: { select: { products: true } } },
    });

    res.status(201).json({ category });
  } catch (error: any) {
    if (error?.code === "P2002") {
      res.status(400).json({ error: "Slug already in use." });
      return;
    }
    next(error);
  }
});

categoriesRouter.patch("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const input = updateCategorySchema.parse(req.body);

    const category = await prisma.category.update({
      where: { id },
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description !== undefined ? (input.description || undefined) : undefined,
        sortOrder: input.sortOrder,
      },
      include: { _count: { select: { products: true } } },
    });

    res.json({ category });
  } catch (error: any) {
    if (error?.code === "P2002") {
      res.status(400).json({ error: "Slug already in use." });
      return;
    }
    if (error?.code === "P2025") {
      res.status(404).json({ error: "Category not found." });
      return;
    }
    next(error);
  }
});

categoriesRouter.delete("/:id", requireAdmin, async (req, res, next) => {
  try {
    const id = req.params.id as string;
    const moveTo = typeof req.query.moveTo === "string" ? req.query.moveTo : undefined;

    const category = await prisma.category.findUnique({ where: { id } });
    if (!category) {
      res.status(404).json({ error: "Category not found." });
      return;
    }

    const productCount = await prisma.product.count({ where: { categoryId: id } });

    if (productCount > 0) {
      if (!moveTo) {
        res.status(400).json({ error: "Category has products. Provide moveTo query param." });
        return;
      }
      if (moveTo === id) {
        res.status(400).json({ error: "moveTo must be a different category." });
        return;
      }
      const target = await prisma.category.findUnique({ where: { id: moveTo } });
      if (!target) {
        res.status(400).json({ error: "moveTo category not found." });
        return;
      }
      await prisma.product.updateMany({ where: { categoryId: id }, data: { categoryId: moveTo } });
    }

    await prisma.category.delete({ where: { id } });
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});
