"use client";

import { useState, type ReactNode } from "react";
import { Eye, EyeOff, LockKeyhole, CircleCheck, CircleX } from "lucide-react";
import { Input } from "@/components/ui/input";
import { autofillHydrationProps } from "./browser-autofill";

export function AuthPasswordField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  labelAction,
  name,
  autoComplete = "off",
  descriptionId,
  feedback,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled?: boolean;
  labelAction?: ReactNode;
  name?: string;
  autoComplete?: "off" | "current-password" | "new-password";
  descriptionId?: string;
  feedback?: { matches: boolean; text: string };
}) {
  const [visible, setVisible] = useState(false);
  const isConfirmation = id.endsWith("confirm-password");
  return (
    <div className="form-field">
      <div className="password-label-row">
        <label htmlFor={id}>{label}</label>
        {labelAction}
      </div>
      <div className="input-wrap">
        <LockKeyhole size={19} aria-hidden="true" />
        <Input
          {...autofillHydrationProps}
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          placeholder={
            autoComplete === "current-password" ? "Masukkan kata sandi" : isConfirmation ? "Ulangi kata sandi" : "Minimal 8 karakter"
          }
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={Boolean(error) || feedback?.matches === false}
          aria-describedby={[descriptionId, error ? `${id}-error` : undefined, feedback ? `${id}-feedback` : undefined].filter(Boolean).join(" ") || undefined}
          required
          disabled={disabled}
        />
        <button
          type="button"
          className="icon-button password-toggle"
          disabled={disabled}
          aria-label={`${visible ? "Sembunyikan" : "Tampilkan"} ${isConfirmation ? "konfirmasi kata sandi" : "kata sandi"}`}
          aria-pressed={visible}
          onClick={() => setVisible((current) => !current)}
        >
          {visible ? <EyeOff size={19} /> : <Eye size={19} />}
        </button>
      </div>
      {error && (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      )}
      {feedback && <p id={`${id}-feedback`} className="password-match-feedback" data-matched={feedback.matches ? "true" : "false"} role="status" aria-live="polite">
        {feedback.matches ? <CircleCheck size={14} aria-hidden="true" /> : <CircleX size={14} aria-hidden="true" />}
        <span>{feedback.text}</span>
      </p>}
    </div>
  );
}
