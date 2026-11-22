import { z } from "zod";
export const passwordSchema = z.string()
  .min(8, "Password minimal 8 karakter.")
  .max(16, "Password maksimal 16 karakter.")
  .regex(/[A-Z]/, "Tambahin minimal satu huruf besar.")
  .regex(/[a-z]/, "Tambahin minimal satu huruf kecil.")
  .regex(/[0-9]/, "Tambahin minimal satu angka.")
  .regex(/[^A-Za-z0-9\s]/, "Tambahin minimal satu simbol, misalnya ! @ #.");
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Masukin alamat email yang valid, ya.")),
  password: passwordSchema,
});
export type LoginValues = z.infer<typeof loginSchema>;
