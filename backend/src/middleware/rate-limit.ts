import type { NextFunction, Request, Response } from "express";

type RateLimitOptions = {
  windowMs: number;
  limit: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

export const createRateLimiter = ({ windowMs, limit }: RateLimitOptions) => {
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    const key = `${req.ip}:${req.path}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > limit) {
      res.status(429).json({ error: "Too many requests. Please try again later." });
      return;
    }

    next();
  };
};
