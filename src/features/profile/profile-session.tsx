"use client";
import { apiRequest } from "@/lib/finance";
import { createContext, useContext, useState, type ReactNode } from "react";
import { initialProfile, type ProfileDraft } from "./profile-model";
import type { AuthAccount } from "@/lib/auth/types";
import { profileAccount } from "./profile-model";
const Context = createContext<{
  profile: ProfileDraft;
  saveProfile: (profile: ProfileDraft) => Promise<boolean>;
  remoteMode: boolean;
  saveError: string;
  whatsappExampleLinked: boolean;
  setWhatsappExampleLinked: (linked: boolean) => void;
  account: { email: string; joinedAt: string };
} | null>(null);
export function ProfileSessionProvider({ children, account }: { children: ReactNode; account?: AuthAccount }) {
  const [profile, setProfile] = useState<ProfileDraft>(account ? {
    ...initialProfile, name: account.display_name, username: `cashly.${account.account_id.slice(0, 8)}`, bio: "",
  } : initialProfile);
  const [saveError,setSaveError]=useState("");
  async function saveProfile(next: ProfileDraft) {
    setSaveError("");
    try {
      if(account) await apiRequest("me/preferences","PATCH",{display_name:next.name,theme_preference:account.theme_preference});
      setProfile(next);return true;
    } catch {setSaveError("Profil belum tersimpan. Coba lagi.");return false;}
  }
  const [whatsappExampleLinked, setWhatsappExampleLinked] = useState(false);
  return (
    <Context.Provider
      value={{
        profile, remoteMode:Boolean(account),saveError,
        saveProfile,
        whatsappExampleLinked,
        setWhatsappExampleLinked,
        account: account ? { email: account.email, joinedAt: account.joined_at } : profileAccount,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useProfileSession() {
  const value = useContext(Context);
  if (!value) throw new Error("ProfileSessionProvider is required");
  return value;
}
