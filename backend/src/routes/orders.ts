import { InventoryReason, OrderStatus, PaymentStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { notifyAdminSafely, renderEmailTemplate, sendEmailSafely } from "../lib/email.js";
import { httpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { type AuthenticatedRequest, requireAdmin, requireAuth } from "../middleware/auth.js";

export const ordersRouter = Router();

const checkoutSchema = z.object({
  cartId: z.string().min(1),
  customerEmail: z.string().email().transform((value) => value.toLowerCase()),
  customerPhone: z.string().min(5).optional(),
  notes: z.string().max(1000).optional(),
  shippingCents: z.number().int().min(0).default(0),
  discountCents: z.number().int().min(0).default(0),
  shippingAddress: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(5),
    line1: z.string().min(3),
    line2: z.string().optional(),
    city: z.string().min(2),
    state: z.string().min(2),
    country: z.string().min(2).default("Nigeria"),
    postalCode: z.string().optional(),
  }),
});

const orderLookupSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
});

const adminOrderUpdateSchema = z.object({
  status: z.nativeEnum(OrderStatus).optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  courier: z.string().max(120).optional(),
  trackingNumber: z.string().max(120).optional(),
  internalNotes: z.string().max(2000).optional(),
});

const orderInclude = {
  shippingAddress: true,
  items: true,
} as const;

ordersRouter.post("/", async (req, res, next) => {
  try {
    const input = checkoutSchema.parse(req.body);

    const order = await prisma.$transaction(async (tx) => {
      const cart = await tx.cart.findUnique({
        where: { id: input.cartId },
        include: {
          items: {
            include: {
              variant: {
                include: {
                  product: true,
                },
              },
            },
          },
        },
      });

      if (!cart) {
        throw httpError(404, "Cart not found");
      }

      if (cart.items.length === 0) {
        throw httpError(400, "Cart is empty");
      }

      for (const item of cart.items) {
        if (!item.variant.isActive || !item.variant.product.isActive) {
          throw httpError(409, `${item.variant.sku} is no longer available`);
        }

        if (item.variant.stockQuantity < item.quantity) {
          throw httpError(409, `${item.variant.sku} does not have enough stock`);
        }
      }

      const subtotalCents = cart.items.reduce(
        (sum, item) => sum + item.quantity * item.variant.priceCents,
        0,
      );
      const totalCents = subtotalCents + input.shippingCents - input.discountCents;

      if (totalCents < 0) {
        throw httpError(400, "Discount cannot exceed order total");
      }

      const address = await tx.address.create({
        data: input.shippingAddress,
      });

      const createdOrder = await tx.order.create({
        data: {
          userId: cart.userId,
          shippingAddressId: address.id,
          subtotalCents,
          shippingCents: input.shippingCents,
          discountCents: input.discountCents,
          totalCents,
          customerEmail: input.customerEmail,
          customerPhone: input.customerPhone,
          notes: input.notes,
          items: {
            create: cart.items.map((item) => ({
              variantId: item.variantId,
              productName: item.variant.product.name,
              variantSku: item.variant.sku,
              size: item.variant.size,
              color: item.variant.color,
              unitPriceCents: item.variant.priceCents,
              quantity: item.quantity,
              lineTotalCents: item.quantity * item.variant.priceCents,
            })),
          },
        },
        include: orderInclude,
      });

      for (const item of cart.items) {
        const update = await tx.productVariant.updateMany({
          where: {
            id: item.variantId,
            stockQuantity: { gte: item.quantity },
          },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });

        if (update.count !== 1) {
          throw httpError(409, `${item.variant.sku} does not have enough stock`);
        }

        await tx.inventoryMovement.create({
          data: {
            variantId: item.variantId,
            quantity: -item.quantity,
            reason: InventoryReason.ORDER_PLACED,
            note: `Order ${createdOrder.id}`,
          },
        });
      }

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return createdOrder;
    });

    const orderSummary = order.items
      .map((item) => `- ${item.productName} / ${item.color} / ${item.size} x ${item.quantity}`)
      .join("\n");

    void sendEmailSafely({
      to: order.customerEmail,
      subject: `Diagramclo order received: ${order.id}`,
      text: `We received your order ${order.id}.\n\n${orderSummary}\n\nTotal: NGN ${(order.totalCents / 100).toLocaleString("en-NG")}\nStatus: ${order.status}`,
      html: renderEmailTemplate({
        title: "Order received",
        intro: `We received your order ${order.id}.`,
        rows: [
          ["Order ID", order.id],
          ["Status", order.status],
          ["Payment", order.paymentStatus],
          ["Items", `${order.items.length}`],
          ["Total", `NGN ${(order.totalCents / 100).toLocaleString("en-NG")}`],
        ],
        footer: "Diagramclo order confirmation",
      }),
    });
    void notifyAdminSafely(
      `New Diagramclo order: ${order.id}`,
      `${order.customerEmail} placed order ${order.id}.\n\n${orderSummary}\n\nTotal: NGN ${(order.totalCents / 100).toLocaleString("en-NG")}`,
    );

    res.status(201).json({ order });
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const orders = await prisma.order.findMany({
      where: { userId: authReq.user.sub },
      include: orderInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/admin/all", requireAdmin, async (_req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      include: orderInclude,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    res.json({ orders });
  } catch (error) {
    next(error);
  }
});

ordersRouter.patch("/admin/:orderId", requireAdmin, async (req, res, next) => {
  try {
    const orderId = req.params.orderId;
    if (typeof orderId !== "string" || !orderId) {
      throw httpError(400, "Order ID is required");
    }

    const input = adminOrderUpdateSchema.parse(req.body);
    const order = await prisma.order.update({
      where: { id: orderId },
      data: input,
      include: orderInclude,
    });

    if (input.status || input.paymentStatus) {
      void sendEmailSafely({
        to: order.customerEmail,
        subject: `Diagramclo order update: ${order.id}`,
        text: `Your order ${order.id} has been updated.\n\nOrder status: ${order.status}\nPayment status: ${order.paymentStatus}${order.courier ? `\nCourier: ${order.courier}` : ""}${order.trackingNumber ? `\nTracking number: ${order.trackingNumber}` : ""}`,
        html: renderEmailTemplate({
          title: "Order update",
          intro: `Your order ${order.id} has been updated.`,
          rows: [
            ["Order ID", order.id],
            ["Order status", order.status],
            ["Payment status", order.paymentStatus],
            ["Courier", order.courier ?? "Not assigned yet"],
            ["Tracking", order.trackingNumber ?? "Not available yet"],
          ],
          footer: "Diagramclo order tracking",
        }),
      });
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});

ordersRouter.get("/:orderId", async (req, res, next) => {
  try {
    const lookup = orderLookupSchema.parse(req.query);
    const order = await prisma.order.findUnique({
      where: { id: req.params.orderId },
      include: orderInclude,
    });

    if (!order || order.customerEmail !== lookup.email) {
      throw httpError(404, "Order not found");
    }

    res.json({ order });
  } catch (error) {
    next(error);
  }
});
