import { z } from "zod";
export const termsSchema = z
  .object({
    principal: z.number().int().min(1).max(10000000000),
    bps: z.number().int().min(0).max(10000),
    start: z.iso.date(),
    due: z.iso.date(),
    count: z.number().int().min(1).max(60),
    note: z.string().min(3).max(1000),
  })
  .refine((t) => t.due >= t.start, "Due date must follow start date");
export const actionSchema = z.object({
  action: z.enum([
    "signin",
    "signout",
    "create",
    "accept",
    "reject",
    "payment",
    "confirm",
    "dispute",
    "amend",
    "approve-amendment",
    "reject-amendment",
    "refresh",
    "promise",
  ]),
  userId: z.enum(["asha", "rohan"]).optional(),
  id: z.string().max(100).optional(),
  title: z.string().min(3).max(100).optional(),
  terms: termsSchema.optional(),
  amount: z.number().int().positive().max(10000000000).optional(),
  paymentId: z.string().max(100).optional(),
  date: z.iso.date().optional(),
  note: z.string().max(500).optional(),
});
export const insightSchema = z.object({
  id: z.string().min(1).max(100),
  enabled: z.boolean(),
  affordability: z
    .object({
      amount: z.number().int().min(0).max(10000000000),
      date: z.iso
        .date()
        .refine(
          (d) => d >= new Date().toISOString().slice(0, 10),
          "Availability date must be today or later",
        ),
    })
    .optional(),
});
