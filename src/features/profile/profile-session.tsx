"use client";
import { createContext, useContext, useState, type ReactNode } from "react";
import { initialProfile, type ProfileDraft } from "./profile-model";
const Context = createContext<{
  profile: ProfileDraft;
  saveProfile: (profile: ProfileDraft) => void;
  whatsappExampleLinked: boolean;
  setWhatsappExampleLinked: (linked: boolean) => void;
} | null>(null);
export function ProfileSessionProvider({ children }: { children: ReactNode }) {
  const [profile, saveProfile] = useState(initialProfile);
  const [whatsappExampleLinked, setWhatsappExampleLinked] = useState(false);
  return (
    <Context.Provider
      value={{
        profile,
        saveProfile,
        whatsappExampleLinked,
        setWhatsappExampleLinked,
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
