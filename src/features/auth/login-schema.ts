import { z } from "zod";
export const passwordSchema = z.string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(16, "Kata sandi maksimal 16 karakter.")
  .regex(/[A-Z]/, "Tambahkan minimal satu huruf besar.")
  .regex(/[a-z]/, "Tambahkan minimal satu huruf kecil.")
  .regex(/[0-9]/, "Tambahkan minimal satu angka.")
  .regex(/[^A-Za-z0-9\s]/, "Tambahkan minimal satu simbol, misalnya ! @ #.");
export const loginSchema = z.object({
  email: z.string().trim().pipe(z.email("Masukkan alamat email yang valid.")),
  password: passwordSchema,
});
export type LoginValues = z.infer<typeof loginSchema>;
