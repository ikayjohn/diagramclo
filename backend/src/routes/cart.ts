import { Router } from "express";
import { z } from "zod";
import { httpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

export const cartRouter = Router();

const addItemSchema = z.object({
  variantId: z.string().min(1),
  quantity: z.number().int().positive(),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(0),
});

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              images: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  },
} as const;

const getCartOrThrow = async (cartId: string) => {
  const cart = await prisma.cart.findUnique({
    where: { id: cartId },
    include: cartInclude,
  });

  if (!cart) {
    throw httpError(404, "Cart not found");
  }

  return cart;
};

cartRouter.post("/", async (_req, res, next) => {
  try {
    const cart = await prisma.cart.create({
      data: {},
      include: cartInclude,
    });

    res.status(201).json({ cart });
  } catch (error) {
    next(error);
  }
});

cartRouter.get("/:cartId", async (req, res, next) => {
  try {
    const cart = await getCartOrThrow(req.params.cartId);
    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

cartRouter.post("/:cartId/items", async (req, res, next) => {
  try {
    const input = addItemSchema.parse(req.body);
    await getCartOrThrow(req.params.cartId);

    const variant = await prisma.productVariant.findUnique({
      where: { id: input.variantId },
      include: { product: true },
    });

    if (!variant || !variant.isActive || !variant.product.isActive) {
      throw httpError(404, "Product variant not found");
    }

    const existingItem = await prisma.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: req.params.cartId,
          variantId: input.variantId,
        },
      },
    });
    const nextQuantity = (existingItem?.quantity ?? 0) + input.quantity;

    if (variant.stockQuantity < nextQuantity) {
      throw httpError(409, "Not enough stock available");
    }

    await prisma.cartItem.upsert({
      where: {
        cartId_variantId: {
          cartId: req.params.cartId,
          variantId: input.variantId,
        },
      },
      update: {
        quantity: { increment: input.quantity },
      },
      create: {
        cartId: req.params.cartId,
        variantId: input.variantId,
        quantity: input.quantity,
      },
    });

    const cart = await getCartOrThrow(req.params.cartId);

    res.status(201).json({ cart });
  } catch (error) {
    next(error);
  }
});

cartRouter.patch("/:cartId/items/:itemId", async (req, res, next) => {
  try {
    const input = updateItemSchema.parse(req.body);
    await getCartOrThrow(req.params.cartId);

    const item = await prisma.cartItem.findUnique({
      where: { id: req.params.itemId },
      include: { variant: true },
    });

    if (!item || item.cartId !== req.params.cartId) {
      throw httpError(404, "Cart item not found");
    }

    if (input.quantity === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      if (item.variant.stockQuantity < input.quantity) {
        throw httpError(409, "Not enough stock available");
      }

      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity: input.quantity },
      });
    }

    const cart = await getCartOrThrow(req.params.cartId);

    res.json({ cart });
  } catch (error) {
    next(error);
  }
});

cartRouter.delete("/:cartId/items/:itemId", async (req, res, next) => {
  try {
    await getCartOrThrow(req.params.cartId);

    const item = await prisma.cartItem.findUnique({
      where: { id: req.params.itemId },
    });

    if (!item || item.cartId !== req.params.cartId) {
      throw httpError(404, "Cart item not found");
    }

    await prisma.cartItem.delete({ where: { id: item.id } });
    const cart = await getCartOrThrow(req.params.cartId);

    res.json({ cart });
  } catch (error) {
    next(error);
  }
});
