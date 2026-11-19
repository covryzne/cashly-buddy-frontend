import { z } from "zod";

export const googleConnectionSchema = z.object({
  connected: z.boolean(), google_email: z.string().nullable(),
  password_login_enabled: z.boolean(), can_disconnect: z.boolean(),
});

export const accountSchema = z.object({
  account_id: z.string().uuid(), display_name: z.string(), email: z.string(),
  username: z.string(), password_login_enabled: z.boolean(), google_connected: z.boolean(),
  runtime: z.object({environment:z.enum(["dev","staging","prod"]),database_kind:z.enum(["local","hosted"])}).nullable().optional(),
  timezone: z.string(), theme_preference: z.string(), joined_at: z.string(), sample_data: z.boolean(),
});
export type AuthAccount = z.infer<typeof accountSchema>;
export const apiExpensesSchema = z.object({
  data: z.array(z.object({
    id: z.string().uuid(), merchant: z.string(), description: z.string(), category_code: z.string(),
    amount_idr: z.string().regex(/^\d+$/), occurred_at: z.string(), payment_method: z.string(), source: z.string(),
    discount_idr: z.string().default("0"), tax_idr: z.string().default("0"), version: z.number().default(1),
    items: z.array(z.object({item_index:z.number(),label:z.string(),quantity:z.number(),unit_price_idr:z.string(),amount_idr:z.string()})).default([]),
  })), has_more: z.boolean(),
  next_cursor: z.string().nullable().optional(),
});
