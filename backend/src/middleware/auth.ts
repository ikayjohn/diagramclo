import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { httpError } from "../lib/http-error.js";

type TokenPayload = {
  sub: string;
  role: "CUSTOMER" | "ADMIN";
};

export type AuthenticatedRequest = Request & {
  user: TokenPayload;
};

export const signAuthToken = (payload: TokenPayload) =>
  jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "7d",
  });

export const requireAuth = (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

    if (!token) {
      throw httpError(401, "Authentication required");
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as jwt.JwtPayload;

    if (typeof payload.sub !== "string" || (payload.role !== "CUSTOMER" && payload.role !== "ADMIN")) {
      throw httpError(401, "Invalid authentication token");
    }

    (req as AuthenticatedRequest).user = {
      sub: payload.sub,
      role: payload.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(httpError(401, "Invalid authentication token"));
      return;
    }

    next(error);
  }
};

export const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  requireAuth(req, res, (error?: unknown) => {
    if (error) {
      next(error);
      return;
    }

    const authReq = req as AuthenticatedRequest;

    if (authReq.user.role !== "ADMIN") {
      next(httpError(403, "Admin access required"));
      return;
    }

    next();
  });
};
