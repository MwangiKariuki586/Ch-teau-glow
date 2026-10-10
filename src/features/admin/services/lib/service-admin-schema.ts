import { z } from "zod";
import { SERVICE_STATUSES } from "@/lib/constants/service-status";

export const serviceMutationSchema = z
  .object({
    category_id: z.string().uuid(),
    name: z.string().min(1).max(120),
    slug: z.string().min(1).max(160),
    description: z.string().max(4000).optional().nullable(),
    what_is_it: z.string().min(1).max(4000),
    who_is_it_for: z.string().max(4000).optional().nullable(),
    who_is_it_not_for: z.string().max(4000).optional().nullable(),
    min_price_cents: z.number().int().nonnegative(),
    max_price_cents: z.number().int().nonnegative(),
    currency: z.string().min(3).max(3),
    duration_minutes: z.number().int().positive(),
    cover_image_url: z.string().url().optional().nullable(),
    results_duration: z.string().max(500).optional().nullable(),
    discomfort_level: z.string().max(500).optional().nullable(),
    side_effects: z.string().max(1000).optional().nullable(),
    recovery_duration: z.string().max(500).optional().nullable(),
    full_recovery: z.string().max(500).optional().nullable(),
    downtime: z.string().max(500).optional().nullable(),
    status: z.enum(SERVICE_STATUSES),
    is_featured: z.boolean().default(false),
    branch_ids: z.array(z.string().uuid()).default([]),
  })
  .superRefine((value, ctx) => {
    if (value.min_price_cents > value.max_price_cents) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "min_price_cents must be less than or equal to max_price_cents.",
        path: ["min_price_cents"],
      });
    }

    if (value.status === "published" && value.branch_ids.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Published services must be mapped to at least one branch.",
        path: ["branch_ids"],
      });
    }
  });

export type ServiceMutationInput = z.infer<typeof serviceMutationSchema>;
