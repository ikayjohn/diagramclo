import { PaymentStatus } from "@prisma/client";
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
      subscriberCount,
      activeProducts,
      archivedProducts,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { paymentStatus: PaymentStatus.PAID },
        _sum: { totalCents: true },
      }),
      prisma.order.count({ where: { status: { in: ["PENDING", "CONFIRMED", "PROCESSING"] } } }),
      prisma.order.count({ where: { paymentStatus: PaymentStatus.PAID } }),
      prisma.productVariant.count({
        where: {
          isActive: true,
          stockQuantity: { lte: 5 },
          product: { archivedAt: null },
        },
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
        subscriberCount,
        activeProducts,
        archivedProducts,
      },
    });
  } catch (error) {
    next(error);
  }
});
