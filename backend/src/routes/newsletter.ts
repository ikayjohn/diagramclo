import { Router } from "express";
import { z } from "zod";
import { notifyAdminSafely, renderEmailTemplate, sendEmailSafely } from "../lib/email.js";
import { prisma } from "../lib/prisma.js";
import { requireAdmin } from "../middleware/auth.js";

export const newsletterRouter = Router();

const subscribeSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
});

newsletterRouter.post("/subscribe", async (req, res, next) => {
  try {
    const input = subscribeSchema.parse(req.body);

    await prisma.subscriber.upsert({
      where: { email: input.email },
      update: { name: input.name || undefined },
      create: { email: input.email, name: input.name || undefined },
    });

    void sendEmailSafely({
      to: input.email,
      subject: "You're subscribed to Diagramclo",
      text: `Thanks for subscribing${input.name ? `, ${input.name}` : ""}. We'll send Diagramclo updates and drops to this email.`,
      html: renderEmailTemplate({
        title: "You're subscribed",
        intro: `Thanks for subscribing${input.name ? `, ${input.name}` : ""}. We'll send Diagramclo updates and drops to this email.`,
        rows: [["Email", input.email]],
        footer: "Diagramclo newsletter",
      }),
    });
    void notifyAdminSafely(
      "New Diagramclo newsletter subscriber",
      `${input.email}${input.name ? ` (${input.name})` : ""} subscribed to the newsletter.`,
    );

    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

newsletterRouter.get("/subscribers", requireAdmin, async (_req, res, next) => {
  try {
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, email: true, createdAt: true },
    });
    res.json({ subscribers });
  } catch (error) {
    next(error);
  }
});
