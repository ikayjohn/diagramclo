import bcrypt from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { httpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { type AuthenticatedRequest, requireAuth, signAuthToken } from "../middleware/auth.js";

export const authRouter = Router();

const authSchema = z.object({
  email: z.string().email().transform((value) => value.toLowerCase()),
  password: z.string().min(8),
});

const registerSchema = authSchema.extend({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
});

const addressSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(5),
  line1: z.string().min(3),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2),
  country: z.string().min(2).default("Nigeria"),
  postalCode: z.string().optional(),
});

const publicUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  createdAt: true,
} as const;

authRouter.post("/register", async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: input.email } });

    if (existing) {
      throw httpError(409, "Email is already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
      },
      select: publicUserSelect,
    });

    const token = signAuthToken({ sub: user.id, role: user.role });

    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/login", async (req, res, next) => {
  try {
    const input = authSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { email: input.email } });

    if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
      throw httpError(401, "Invalid email or password");
    }

    const token = signAuthToken({ sub: user.id, role: user.role });

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const user = await prisma.user.findUnique({
      where: { id: authReq.user.sub },
      select: publicUserSelect,
    });

    if (!user) {
      throw httpError(404, "User not found");
    }

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const input = updateProfileSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id: authReq.user.sub },
      data: input,
      select: publicUserSelect,
    });

    res.json({ user });
  } catch (error) {
    next(error);
  }
});

authRouter.get("/me/addresses", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const addresses = await prisma.address.findMany({
      where: { userId: authReq.user.sub },
      orderBy: { createdAt: "desc" },
    });

    res.json({ addresses });
  } catch (error) {
    next(error);
  }
});

authRouter.post("/me/addresses", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const input = addressSchema.parse(req.body);
    const address = await prisma.address.create({
      data: {
        ...input,
        userId: authReq.user.sub,
      },
    });

    res.status(201).json({ address });
  } catch (error) {
    next(error);
  }
});

authRouter.patch("/me/addresses/:addressId", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const addressId = req.params.addressId;
    if (typeof addressId !== "string") {
      throw httpError(400, "Invalid address ID");
    }

    const input = addressSchema.partial().parse(req.body);
    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId: authReq.user.sub },
    });

    if (!existing) {
      throw httpError(404, "Address not found");
    }

    const address = await prisma.address.update({
      where: { id: existing.id },
      data: input,
    });

    res.json({ address });
  } catch (error) {
    next(error);
  }
});

authRouter.delete("/me/addresses/:addressId", requireAuth, async (req, res, next) => {
  try {
    const authReq = req as AuthenticatedRequest;
    const addressId = req.params.addressId;
    if (typeof addressId !== "string") {
      throw httpError(400, "Invalid address ID");
    }

    const existing = await prisma.address.findFirst({
      where: { id: addressId, userId: authReq.user.sub },
    });

    if (!existing) {
      throw httpError(404, "Address not found");
    }

    await prisma.address.delete({ where: { id: existing.id } });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
