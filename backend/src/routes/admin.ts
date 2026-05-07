import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";

export const adminRouter = Router();

adminRouter.get("/analytics", requireAdmin, async (_req, res, next) => {
  try {
    const [
      paidRevenue,
      pendingOrders,
      paidOrders,
      lowStockVariants,
      lowStockItems,
      subscriberCount,
      activeProducts,
      archivedProducts,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { paymentStatus: "PAID" },
        _sum: { totalCents: true },
      }),
      prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } } }),
      prisma.order.count({ where: { paymentStatus: "PAID" } }),
      prisma.productVariant.count({
        where: {
          isActive: true,
          stockQuantity: { lte: 5 },
          product: { archivedAt: null },
        },
      }),
      prisma.productVariant.findMany({
        where: {
          isActive: true,
          stockQuantity: { lte: 5 },
          product: { archivedAt: null },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [{ stockQuantity: "asc" }, { sku: "asc" }],
        take: 20,
      }),
      prisma.subscriber.count(),
      prisma.product.count({ where: { isActive: true, archivedAt: null } }),
      prisma.product.count({ where: { archivedAt: { not: null } } }),
    ]);

    res.json({
      analytics: {
        totalRevenueCents: paidRevenue._sum.totalCents ?? 0,
        pendingOrders,
        paidOrders,
        lowStockVariants,
        lowStockItems: lowStockItems.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          size: variant.size,
          color: variant.color,
          stockQuantity: variant.stockQuantity,
          productId: variant.productId,
          productName: variant.product.name,
          productSlug: variant.product.slug,
        })),
        subscriberCount,
        activeProducts,
        archivedProducts,
      },
    });
  } catch (error) {
    next(error);
  }
});
