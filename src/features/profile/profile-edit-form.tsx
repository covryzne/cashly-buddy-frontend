"use client";
import { Input } from "@/components/ui/input";
import { useProfileSession } from "./profile-session";
import type { ProfileDraft } from "./profile-model";

export function ProfileEditForm({ draft, onChange, errors, formId, onSubmit }: {
  draft: ProfileDraft; onChange: (draft: ProfileDraft) => void;
  errors: Record<string,string>; formId: string; onSubmit: () => void;
}) {
  const {account,saveError}=useProfileSession();
  return <form id={formId} className="profile-edit-form" noValidate onSubmit={event=>{event.preventDefault();onSubmit();}}>
    {saveError && <p role="alert" className="profile-field-error">{saveError}</p>}
    <div className="profile-form-field"><label htmlFor="profile-name">Nama lengkap</label>
      <Input id="profile-name" value={draft.name} maxLength={40} autoComplete="name" required onChange={event=>onChange({...draft,name:event.target.value})} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "profile-error-name" : undefined}/>
      {errors.name && <p id="profile-error-name" className="profile-field-error">{errors.name}</p>}
    </div>
    <div className="profile-form-field"><label htmlFor="profile-username">Username</label>
      <div className="profile-username-input"><span aria-hidden="true">@</span><Input id="profile-username" value={draft.username} maxLength={24} autoComplete="username" autoCapitalize="none" spellCheck={false} required onChange={event=>onChange({...draft,username:event.target.value})} aria-invalid={Boolean(errors.username)} aria-describedby={errors.username ? "profile-error-username" : "profile-username-hint"}/></div>
      <small id="profile-username-hint">3-24 karakter: huruf, angka, titik atau garis bawah.</small>
      {errors.username && <p id="profile-error-username" className="profile-field-error">{errors.username}</p>}
    </div>
    <div className="profile-form-field"><label htmlFor="profile-email">Email</label>
      <Input id="profile-email" value={account.email} type="email" disabled/>
    </div>
  </form>;
}
