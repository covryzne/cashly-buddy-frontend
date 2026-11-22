"use client";
import { apiRequest } from "@/lib/finance";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { whatsappConnectionSchema, whatsappRequest, type WhatsappConnection } from "./whatsapp-api";
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
  whatsappStatus: WhatsappConnection | null;
  whatsappError: string;
  refreshWhatsapp: () => Promise<WhatsappConnection | null>;
  applyWhatsappStatus: (status: WhatsappConnection) => void;
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
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsappConnection | null>(null);
  const [whatsappError, setWhatsappError] = useState("");
  const whatsappSequence = useRef(0);
  const invalidateWhatsapp = useCallback(() => { whatsappSequence.current++; }, []);
  const applyWhatsappStatus = useCallback((status: WhatsappConnection) => {
    whatsappSequence.current++;
    setWhatsappStatus(status);
    setWhatsappError("");
  }, []);
  const refreshWhatsapp = useCallback(async () => {
    if (!account || !online) return null;
    const sequence = ++whatsappSequence.current;
    try {
      const result = whatsappConnectionSchema.parse(await whatsappRequest(""));
      if (sequence === whatsappSequence.current) { setWhatsappStatus(result); setWhatsappError(""); }
      return result;
    } catch (failure) {
      if (sequence === whatsappSequence.current) setWhatsappError(failure instanceof Error ? failure.message : "Status WhatsApp belum dapat diperiksa.");
      return null;
    }
  }, [account, online]);
  useEffect(() => {
    if (!account) return;
    const initialRefresh = window.setTimeout(() => void refreshWhatsapp(), 0);
    const focus = () => { if (document.visibilityState === "visible") void refreshWhatsapp(); };
    window.addEventListener("focus", focus);
    document.addEventListener("visibilitychange", focus);
    return () => { clearTimeout(initialRefresh); invalidateWhatsapp(); window.removeEventListener("focus", focus); document.removeEventListener("visibilitychange", focus); };
  }, [account, refreshWhatsapp, invalidateWhatsapp]);
  return (
    <Context.Provider
      value={{
        profile, remoteMode:Boolean(account),saveError,
        saveProfile,
        whatsappExampleLinked,
        setWhatsappExampleLinked,
        whatsappStatus, whatsappError, refreshWhatsapp, applyWhatsappStatus,
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
