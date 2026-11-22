import { z } from "zod";
export const profileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Nama minimal 2 karakter.")
      .max(40, "Nama maksimal 40 karakter."),
    username: z
      .string()
      .trim()
      .min(3, "Username minimal 3 karakter.")
      .max(24, "Username maksimal 24 karakter.")
      .regex(
        /^[a-zA-Z0-9._]+$/,
        "Gunakan huruf, angka, titik, atau garis bawah.",
      )
      .transform((value) => value.toLowerCase()),
    bio: z.string().trim().max(80, "Bio maksimal 80 karakter."),
    avatar: z.enum(["mochi", "initials", "photo"]),
    photo: z.string().nullable(),
    friendlyGreeting: z.boolean(),
  })
  .superRefine((value, context) => {
    if (
      value.avatar === "photo" &&
      (!value.photo ||
        !/^data:image\/(png|jpeg|webp);base64,/.test(value.photo))
    )
      context.addIssue({
        code: "custom",
        path: ["photo"],
        message: "Pilih foto yang valid.",
      });
  });
export type ProfileDraft = z.infer<typeof profileSchema>;
export const initialProfile: ProfileDraft = {
  name: "Nara",
  username: "nara.cashly",
  bio: "Langkah kecil hari ini, cerita baik setiap hari.",
  avatar: "mochi",
  photo: null,
  friendlyGreeting: true,
};
export const profileAccount = {
  email: "nara@example.com",
  joinedAt: "2026-11-01T00:00:00+07:00",
};
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
export function avatarFileError(file: { type: string; size: number }) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    return "Pilih foto JPG, PNG, atau WebP.";
  if (!file.size || file.size > MAX_AVATAR_BYTES)
    return "Ukuran foto harus lebih dari 0 dan maksimal 2 MB.";
  return null;
}
export const evolutionStages = [
  {
    stage: 1,
    name: "Little Cashly",
    days: 0,
    description: "Awal perjalananmu. Mochi tersedia sejak hari pertama.",
  },
  {
    stage: 2,
    name: "Happy Cashly",
    image: "/mascot/mochi-level-2.webp",
    days: 30,
    description: "Tiga puluh hari membangun kebiasaan bersama.",
  },
  {
    stage: 3,
    name: "Starry Cashly",
    image: "/mascot/mochi-level-3.webp",
    days: 100,
    description: "Seratus hari untuk kebiasaan yang makin bersinar.",
  },
  {
    stage: 4,
    name: "Star Cashly",
    image: "/mascot/mochi-level-4.webp",
    days: 150,
    description: "Seratus lima puluh hari, cerita baik yang terus tumbuh.",
  },
  {
    stage: 5,
    name: "Mochi Level 5",
    image: "/mascot/mochi-crown-transparent.png",
    days: 200,
    description: "Dua ratus hari, perjalanan panjang bersama teman kecilmu.",
  },
] as const;
