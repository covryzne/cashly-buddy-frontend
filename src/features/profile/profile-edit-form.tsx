"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, Smile, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProfileSession } from "./profile-session";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import {
  avatarFileError,
  type ProfileDraft,
} from "./profile-model";

export function ProfileEditForm({
  draft,
  onChange,
  onPhoto,
  errors,
  formId,
  onSubmit,
  onBusyChange,
}: {
  draft: ProfileDraft;
  onChange: (draft: ProfileDraft) => void;
  errors: Record<string, string>;
  formId: string;
  onSubmit: () => void;
  onBusyChange: (busy: boolean) => void;
  onPhoto: (photo: string) => void;
}) {
  const { account: profileAccount } = useProfileSession();
  const fileInput = useRef<HTMLInputElement>(null);
  const reader = useRef<FileReader | null>(null);
  const generation = useRef(0);
  const [photoError, setPhotoError] = useState("");
  const [reading, setReading] = useState(false);
  useEffect(
    () => () => {
      generation.current++;
      reader.current?.abort();
    },
    [],
  );
  function selectPhoto(file?: File) {
    if (!file) return;
    const error = avatarFileError(file);
    if (error) {
      setPhotoError(error);
      return;
    }
    const request = ++generation.current;
    reader.current?.abort();
    const fileReader = new FileReader();
    reader.current = fileReader;
    setPhotoError("");
    setReading(true);
    onBusyChange(true);
    function finish(error = "", photo?: string) {
      if (request !== generation.current) return;
      setReading(false);
      onBusyChange(false);
      setPhotoError(error);
      if (photo) onPhoto(photo);
    }
    fileReader.onerror = () =>
      finish("Foto belum bisa dibaca. Coba foto lain.");
    fileReader.onload = () => {
      const data = String(fileReader.result);
      const image = new window.Image();
      image.onload = () => finish("", data);
      image.onerror = () =>
        finish("File ini tidak dapat dibaca sebagai foto. Pilih foto lain.");
      image.src = data;
    };
    fileReader.readAsDataURL(file);
  }
  const fieldProps = (name: string) => ({
    id: `profile-${name}`,
    "aria-invalid": !!errors[name],
    "aria-describedby": errors[name] ? `profile-error-${name}` : undefined,
  });
  return (
    <form
      id={formId}
      className="profile-edit-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="profile-edit-avatar">
        <ProfileAvatar profile={draft} size={94} />
        <span>
          <Camera size={17} />
        </span>
      </div>
      <div className="profile-avatar-actions">
        <Button
          variant="secondary"
          onClick={() => fileInput.current?.click()}
          disabled={reading}
        >
          <ImagePlus size={15} />
          Galeri
        </Button>
        <Button
          variant="secondary"
          disabled={reading}
          onClick={() => {
            setPhotoError("");
            onChange({ ...draft, avatar: "mochi", photo: null });
          }}
        >
          <Smile size={15} />
          Gunakan Mochi
        </Button>
        <Button
          variant="ghost"
          disabled={reading}
          onClick={() => {
            setPhotoError("");
            onChange({ ...draft, avatar: "initials", photo: null });
          }}
        >
          <Trash2 size={15} />
          Hapus
        </Button>
      </div>
      <input
        ref={fileInput}
        type="file"
        className="sr-only"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Pilih foto profil"
        onChange={(event) => {
          selectPhoto(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <p className="profile-field-hint">JPG, PNG, atau WebP · Maksimal 2 MB</p>
      {reading && (
        <p role="status" className="profile-field-hint">
          Menyiapkan fotomu…
        </p>
      )}
      {photoError && (
        <p className="profile-field-error" role="alert">
          {photoError}
        </p>
      )}
      <div className="profile-form-field">
        <label htmlFor="profile-name">
          Nama lengkap <small>Wajib diisi</small>
        </label>
        <Input
          {...fieldProps("name")}
          value={draft.name}
          maxLength={50}
          autoComplete="name"
          required
          onChange={(event) => onChange({ ...draft, name: event.target.value })}
        />
        {errors.name && (
          <p id="profile-error-name" className="profile-field-error">
            {errors.name}
          </p>
        )}
      </div>
      <div className="profile-form-field">
        <label htmlFor="profile-username">Username</label>
        <div className="profile-username-input">
          <span aria-hidden="true">@</span>
          <Input
            {...fieldProps("username")}
            value={draft.username}
            maxLength={24}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) =>
              onChange({ ...draft, username: event.target.value })
            }
          />
        </div>
        {errors.username && (
          <p id="profile-error-username" className="profile-field-error">
            {errors.username}
          </p>
        )}
        <small>Huruf, angka, titik, atau garis bawah.</small>
      </div>
      <div className="profile-form-field">
        <label htmlFor="profile-email">Email akun</label>
        <Input
          id="profile-email"
          value={profileAccount.email}
          type="email"
          readOnly
          autoComplete="off"
        />
        <small>Email akun belum dapat diubah di sini.</small>
      </div>
      <div className="profile-form-field">
        <label htmlFor="profile-bio">
          Bio singkat <small>{draft.bio.length}/80</small>
        </label>
        <textarea
          {...fieldProps("bio")}
          value={draft.bio}
          rows={3}
          maxLength={80}
          onChange={(event) => onChange({ ...draft, bio: event.target.value })}
        />
        {errors.bio && (
          <p id="profile-error-bio" className="profile-field-error">
            {errors.bio}
          </p>
        )}
      </div>
      <label className="profile-greeting-toggle">
        <Smile size={23} />
        <span>
          <strong>Sapaan ramah Mochi</strong>
          <small>Sapaan kecil saat kamu menyapa Mochi.</small>
        </span>
        <input
          type="checkbox"
          checked={draft.friendlyGreeting}
          onChange={(event) =>
            onChange({ ...draft, friendlyGreeting: event.target.checked })
          }
        />
      </label>
    </form>
  );
}
