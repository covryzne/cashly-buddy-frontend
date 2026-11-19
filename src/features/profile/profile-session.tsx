"use client";
import { apiRequest } from "@/lib/finance";
import { createContext, useContext, useState, type ReactNode } from "react";
import { initialProfile, type ProfileDraft } from "./profile-model";
import type { AuthAccount } from "@/lib/auth/types";
import { accountSchema } from "@/lib/auth/types";
import { profileAccount } from "./profile-model";
import { useOnline } from "@/lib/pwa/connectivity";
import { useExpenseSession } from "@/features/expenses/expense-session";
const Context = createContext<{
  profile: ProfileDraft;
  saveProfile: (profile: ProfileDraft) => Promise<boolean>;
  remoteMode: boolean;
  saveError: string;
  whatsappExampleLinked: boolean;
  setWhatsappExampleLinked: (linked: boolean) => void;
  account: { email: string; joinedAt: string; passwordLoginEnabled: boolean; googleConnected: boolean };
} | null>(null);
export function ProfileSessionProvider({ children, account }: { children: ReactNode; account?: AuthAccount }) {
  const online = useOnline();
  const { updateSnapshotAccount } = useExpenseSession();
  const [profile, setProfile] = useState<ProfileDraft>(account ? {
    ...initialProfile, name: account.display_name, username: account.username, bio: "", avatar:"initials",photo:null,
  } : initialProfile);
  const [saveError,setSaveError]=useState("");
  async function saveProfile(next: ProfileDraft) {
    if (!online) { setSaveError("Hubungkan internet untuk mengubah profil."); return false; }
    setSaveError("");
    try {
      if(account) {
        const result=accountSchema.parse((await apiRequest("me/profile","PATCH",{display_name:next.name,username:next.username})).data);
        next={...next,name:result.display_name,username:result.username};
        updateSnapshotAccount(result);
      }
      setProfile(next);return true;
    } catch(error) {setSaveError(error instanceof Error ? error.message : "Profil belum tersimpan. Coba lagi.");return false;}
  }
  const [whatsappExampleLinked, setWhatsappExampleLinked] = useState(false);
  return (
    <Context.Provider
      value={{
        profile, remoteMode:Boolean(account),saveError,
        saveProfile,
        whatsappExampleLinked,
        setWhatsappExampleLinked,
        account: account ? { email: account.email, joinedAt: account.joined_at, passwordLoginEnabled:account.password_login_enabled,googleConnected:account.google_connected } : {...profileAccount,passwordLoginEnabled:false,googleConnected:false},
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
