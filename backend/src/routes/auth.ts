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
