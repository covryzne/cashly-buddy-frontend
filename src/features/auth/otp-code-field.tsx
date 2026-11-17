"use client";
import { useRef, useState } from "react";
import { ClipboardPaste } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function OtpCodeField({ id, label, value, onChange, onError, disabled = false }: {
  id: string; label: string; value: string; onChange: (value: string) => void;
  onError: (message: string) => void; disabled?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);
  const [pasting, setPasting] = useState(false);
  function fill(text: string) { const code = text.replace(/[^0-9]/g, "").slice(0, 6); onChange(code); setActive(Math.min(code.length, 5)); }
  async function paste() {
    if (disabled || pasting) return;
    setPasting(true);
    try {
      if (!navigator.clipboard?.readText) throw new Error("Clipboard unavailable");
      const text = await navigator.clipboard.readText();
      if (text.replace(/[^0-9]/g, "").length !== 6) { onError("Salin kode OTP enam digit dari email."); return; }
      fill(text); input.current?.focus();
    } catch { onError("Clipboard belum dapat dibaca. Pilih kotak kode lalu gunakan Tempel atau Ctrl+V."); input.current?.focus(); }
    finally { setPasting(false); }
  }
  return <div className="otp-input-card" data-disabled={disabled || undefined}>
    <p className="otp-card-label">Kode OTP</p><label className="sr-only" htmlFor={id}>{label}</label>
    <div className="otp-entry"><div className="otp-digit-row" aria-hidden="true">{Array.from({ length: 6 }, (_, index) => <span key={index} className="otp-digit" data-active={focused && active === index || undefined}>{value[index] ?? ""}</span>)}</div>
      <Input ref={input} id={id} className="otp-native-input" inputMode="numeric" autoComplete="one-time-code" value={value} maxLength={6} pattern="[0-9]{6}" disabled={disabled} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onSelect={event => setActive(Math.min(event.currentTarget.selectionStart ?? value.length, 5))} onChange={event => fill(event.target.value)} onPaste={event => { event.preventDefault(); fill(event.clipboardData.getData("text")); }} required />
    </div>
    <Button variant="secondary" className="otp-paste-button" disabled={disabled || pasting} onClick={() => void paste()}><ClipboardPaste size={16} />{pasting ? "Membaca..." : "Tempel OTP"}</Button>
  </div>;
}
