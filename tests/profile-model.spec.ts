import { test, expect } from "@playwright/test";
import {
  avatarFileError,
  evolutionStages,
  initialProfile,
  MAX_AVATAR_BYTES,
  profileSchema,
} from "../src/features/profile/profile-model";
test("Profil memvalidasi nama, username dan bio", () => {
  expect(
    profileSchema.parse({
      ...initialProfile,
      name: "  Nara Baru  ",
      username: "NARA.BARU",
    }).name,
  ).toBe("Nara Baru");
  expect(
    profileSchema.parse({ ...initialProfile, username: "NARA.BARU" }).username,
  ).toBe("nara.baru");
  for (const value of [
    { name: " " },
    { name: "N".repeat(51) },
    { username: "ab" },
    { username: "@nara baru" },
    { bio: "b".repeat(81) },
  ])
    expect(
      profileSchema.safeParse({ ...initialProfile, ...value }).success,
    ).toBe(false);
});
test("Foto hanya menerima format yang didukung dan maksimal 2 MB", () => {
  expect(
    avatarFileError({ type: "image/jpeg", size: MAX_AVATAR_BYTES }),
  ).toBeNull();
  expect(
    avatarFileError({ type: "image/png", size: MAX_AVATAR_BYTES + 1 }),
  ).toContain("2 MB");
  expect(avatarFileError({ type: "image/svg+xml", size: 100 })).toContain(
    "JPG",
  );
  expect(avatarFileError({ type: "image/png", size: 0 })).not.toBeNull();
  expect(
    profileSchema.safeParse({
      ...initialProfile,
      avatar: "photo",
      photo: "https://example.com/photo.png",
    }).success,
  ).toBe(false);
});
test("Hero level 1–5 memakai streak 10/30/100/150/200 yang disetujui", () => {
  expect(evolutionStages.map((stage) => stage.days)).toEqual([
    10, 30, 100, 150, 200,
  ]);
  expect(evolutionStages).toHaveLength(5);
});
