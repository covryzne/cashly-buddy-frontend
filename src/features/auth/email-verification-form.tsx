'use client';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ClipboardPaste, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOnline } from '@/lib/pwa/connectivity';

const OTP_LIFETIME_MS = 5 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;
const digitsOnly = (value: string) => value.replace(/[^0-9]/g, '').slice(0, 6);

export function EmailVerificationForm({
  email,
  issuedAt,
  onVerified,
  onBack,
}: {
  email: string;
  issuedAt: number | null;
  onVerified: () => void;
  onBack: () => void;
}) {
  const id = useId();
  const online = useOnline();
  const input = useRef<HTMLInputElement>(null);
  const [token, setToken] = useState('');
  const [pasting, setPasting] = useState(false);
  const [focused, setFocused] = useState(false);
  const [activeDigit, setActiveDigit] = useState(0);
  const [pending, setPending] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const [deadlines, setDeadlines] = useState(() => ({
    expiresAt: issuedAt === null ? null : issuedAt + OTP_LIFETIME_MS,
    resendAt: issuedAt === null ? 0 : issuedAt + RESEND_COOLDOWN_MS,
  }));
  const seconds = Math.max(0, Math.ceil((deadlines.resendAt - now) / 1000));
  const remaining =
    deadlines.expiresAt === null
      ? null
      : Math.max(0, Math.ceil((deadlines.expiresAt - now) / 1000));
  const expired = remaining === 0;
  const countdown =
    remaining === null
      ? null
      : `${Math.floor(remaining / 60)
          .toString()
          .padStart(2, '0')}:${(remaining % 60).toString().padStart(2, '0')}`;
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = setInterval(update, 1000);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);
  async function act(mode: 'verify' | 'resend') {
    if (!online || pending || (mode === 'resend' && seconds > 0)) return;
    if (
      mode === 'verify' &&
      deadlines.expiresAt !== null &&
      Date.now() >= deadlines.expiresAt
    ) {
      setNow(Date.now());
      setError(
        'Kode sudah kedaluwarsa. Kirim ulang untuk mendapatkan kode baru.',
      );
      return;
    }
    setPending(true);
    setError('');
    try {
      const response = await fetch(`/auth/email/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'verify' ? { email, token } : { email }),
        cache: 'no-store',
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body.error ?? 'Verifikasi belum berhasil. Coba lagi.');
        if (response.status === 429) {
          const time = Date.now();
          setNow(time);
          setDeadlines((current) => ({
            ...current,
            resendAt: time + RESEND_COOLDOWN_MS,
          }));
        }
        return;
      }
      if (mode === 'verify') {
        setToken('');
        onVerified();
      } else {
        const time = Date.now();
        setNow(time);
        setDeadlines({
          expiresAt: time + OTP_LIFETIME_MS,
          resendAt: time + RESEND_COOLDOWN_MS,
        });
        setToken('');
        setNotice(
          'Jika email terdaftar dan belum diverifikasi, kode baru akan dikirim. Gunakan kode terbaru.',
        );
      }
    } catch {
      setError('Tidak dapat menghubungi layanan verifikasi.');
    } finally {
      setPending(false);
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void act('verify');
  }
  function fillCode(value: string) {
    const code = digitsOnly(value);
    setToken(code);
    setActiveDigit(Math.min(code.length, 5));
    setError('');
  }
  async function pasteCode() {
    if (pending || pasting || expired) return;
    setPasting(true);
    setError('');
    try {
      if (!navigator.clipboard?.readText)
        throw new Error('Clipboard unavailable');
      const code = digitsOnly(await navigator.clipboard.readText());
      if (deadlines.expiresAt !== null && Date.now() >= deadlines.expiresAt) {
        setNow(Date.now());
        return;
      }
      if (code.length !== 6) {
        setError(
          'Salin kode OTP enam digit dari email, lalu coba tempel lagi.',
        );
        return;
      }
      fillCode(code);
      input.current?.focus();
    } catch {
      setError(
        'Clipboard belum dapat dibaca. Pilih kotak kode lalu gunakan Tempel atau Ctrl+V.',
      );
      input.current?.focus();
    } finally {
      setPasting(false);
    }
  }
  return (
    <section className="email-verification" aria-label="Verifikasi email">
      <p className="muted">
        Masukkan kode yang sudah dikirimkan ke <strong>{email}</strong> dan
        periksa folder spam juga, ya.
      </p>
      {notice && <p role="status">{notice}</p>}
      <form className="login-form" onSubmit={submit} aria-busy={pending}>
        <div
          className="otp-input-card"
          data-disabled={pending || expired || undefined}
        >
          <p className="otp-card-label">Kode OTP</p>
          <label className="sr-only" htmlFor={`${id}-otp`}>
            Kode verifikasi
          </label>
          <div className="otp-entry" data-invalid={Boolean(error) || undefined}>
            <div className="otp-digit-row" aria-hidden="true">
              {Array.from({ length: 6 }, (_, index) => (
                <span
                  className="otp-digit"
                  key={index}
                  data-active={(focused && activeDigit === index) || undefined}
                  data-filled={Boolean(token[index]) || undefined}
                >
                  {token[index] ?? ''}
                </span>
              ))}
            </div>
            <Input
              ref={input}
              className="otp-native-input"
              id={`${id}-otp`}
              name="token"
              autoFocus
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={token}
              onChange={(event) => fillCode(event.target.value)}
              onPaste={(event) => {
                event.preventDefault();
                fillCode(event.clipboardData.getData('text'));
              }}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onSelect={(event) =>
                setActiveDigit(
                  Math.min(
                    event.currentTarget.selectionStart ?? token.length,
                    5,
                  ),
                )
              }
              disabled={pending || expired}
              aria-invalid={Boolean(error)}
              aria-describedby={`${id}-hint ${id}-expiry${error ? ` ${id}-error` : ''}`}
            />
          </div>
          <Button
            className="otp-paste-button"
            variant="secondary"
            type="button"
            onClick={() => void pasteCode()}
            disabled={pending || expired || pasting}
          >
            <ClipboardPaste size={16} aria-hidden="true" />
            {pasting ? 'Membaca...' : 'Tempel OTP'}
          </Button>
          <span className="sr-only" id={`${id}-hint`}>
            Masukkan enam digit kode. Kamu bisa mengetik atau menempelkan
            seluruh kode sekaligus.
          </span>
        </div>
        <p
          id={`${id}-expiry`}
          className="otp-expiry"
          data-expired={expired || undefined}
        >
          <Clock3 size={14} aria-hidden="true" />
          {expired ? (
            'Kode kedaluwarsa. Kirim ulang untuk mendapatkan kode baru.'
          ) : countdown ? (
            <span>
              Kode berlaku selama{' '}
              <time aria-label="Sisa waktu kode verifikasi">{countdown}</time>
            </span>
          ) : (
            'Gunakan kode terbaru di email, atau kirim ulang untuk memulai waktu verifikasi 5 menit.'
          )}
        </p>
        {error && (
          <p id={`${id}-error`} className="field-error" role="alert">
            {error}
          </p>
        )}
        {!online && <p role="status">Hubungkan internet untuk melanjutkan.</p>}
        <Button
          className="auth-full-button"
          type="submit"
          disabled={!online || pending || expired || token.length !== 6}
        >
          {pending ? 'Memproses...' : 'Verifikasi email'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="auth-full-button"
          disabled={!online || pending || seconds > 0}
          onClick={() => void act('resend')}
        >
          {seconds > 0
            ? `Kirim ulang dalam ${seconds} detik`
            : 'Kirim ulang kode'}
        </Button>
        <button
          type="button"
          className="text-button"
          onClick={onBack}
          disabled={pending}
        >
          Kembali ke form
        </button>
      </form>
    </section>
  );
}
