import Image from "next/image";
import type { ProfileDraft } from "@/features/profile/profile-model";
export function ProfileAvatar({
  profile,
  size = 64,
}: {
  profile: ProfileDraft;
  size?: number;
}) {
  return (
    <span
      className={`profile-avatar avatar-${profile.avatar}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {profile.avatar === "initials" ? (
        profile.name.trim().slice(0, 1).toUpperCase() || "N"
      ) : (
        <Image
          src={
            profile.avatar === "photo" && profile.photo
              ? profile.photo
              : "/mascot/mochi-crown-transparent.webp"
          }
          alt=""
          width={size}
          height={size}
          unoptimized={profile.avatar === "photo"}
        />
      )}
    </span>
  );
}
