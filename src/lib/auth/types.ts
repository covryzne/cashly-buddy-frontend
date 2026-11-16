import { z } from "zod";

export const accountSchema = z.object({
  account_id: z.string().uuid(), display_name: z.string(), email: z.string(),
  timezone: z.string(), theme_preference: z.string(), joined_at: z.string(), sample_data: z.boolean(),
});
export type AuthAccount = z.infer<typeof accountSchema>;
export const apiExpensesSchema = z.object({
  data: z.array(z.object({
    id: z.string().uuid(), merchant: z.string(), description: z.string(), category_code: z.string(),
    amount_idr: z.string().regex(/^\d+$/), occurred_at: z.string(), payment_method: z.string(), source: z.string(),
  })), has_more: z.boolean(),
});
