"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { initialProfile, type ProfileDraft } from "./profile-model";
import type { AuthAccount } from "@/lib/auth/types";
import { profileAccount } from "./profile-model";
const Context = createContext<{
  profile: ProfileDraft;
  saveProfile: (profile: ProfileDraft) => void;
  whatsappExampleLinked: boolean;
  setWhatsappExampleLinked: (linked: boolean) => void;
  account: { email: string; joinedAt: string };
} | null>(null);
export function ProfileSessionProvider({ children, account }: { children: ReactNode; account?: AuthAccount }) {
  const [profile, saveProfile] = useState<ProfileDraft>(account ? {
    ...initialProfile, name: account.display_name, username: `cashly.${account.account_id.slice(0, 8)}`, bio: "",
  } : initialProfile);
  const [whatsappExampleLinked, setWhatsappExampleLinked] = useState(false);
  return (
    <Context.Provider
      value={{
        profile,
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
