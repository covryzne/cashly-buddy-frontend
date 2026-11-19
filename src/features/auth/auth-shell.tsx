import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Sparkles, Heart, Leaf } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { InstallAppEntry } from "@/components/shared/install-app";
import { LoginAssetPreloader } from "@/components/shared/asset-cache-bootstrap";
import "@/styles/auth.css";

export function AuthShell({
  mode,
  children,
}: {
  mode: "login" | "register" | "forgot-password" | "reset-password";
  children: ReactNode;
}) {
  const copy = {
    login: {
      form: "masuk",
      kicker: "Senang kamu di sini",
      title: "Selamat datang kembali!",
      description: "Yuk, lanjutkan kebiasaan baikmu bersama Cashly.",
    },
    register: {
      form: "buat akun",
      kicker: "Mulai cerita baikmu",
      title: "Kenalan dulu, yuk!",
      description: "Buat ruang untuk kebiasaan baik, satu langkah setiap hari.",
    },
    "forgot-password": {
      form: "pemulihan",
      kicker: "Tenang, Mochi bantu temani",
      title: "Lupa kata sandi?",
      description: "Kami akan mengirim tautan untuk mengatur ulang kata sandimu.",
    },
    "reset-password": {form:"kata sandi baru",kicker:"Keamanan akun",title:"Atur kata sandi",description:"Buat kata sandi untuk akun Cashly yang sama."},
  }[mode];
  return (
    <div className="auth-page">
      {mode === "login" && <LoginAssetPreloader />}
      <a href="#auth-form-section" className="skip-link">
        Langsung ke form {copy.form}
      </a>
      <header className="auth-header">
        <Link href="/login" className="auth-brand">
          <Image
            className="auth-brand-image auth-brand-light"
            src="/branding/header-light.png"
            alt=""
            width={44}
            height={44}
            priority
          />
          <Image
            className="auth-brand-image auth-brand-dark"
            src="/branding/header-dark.png"
            alt=""
            width={44}
            height={44}
            priority
          />
          <span>
            Cashly<span className="brand-dot">●</span>
          </span>
        </Link>
        <div className="auth-header-actions">
          <InstallAppEntry compact />
          <ThemeToggle />
        </div>
      </header>
      <main className="auth-main">
        <section className="auth-story" aria-labelledby="auth-story-title">
          <span className="auth-kicker">
            <Sparkles size={16} />
            Your little money adventure
          </span>
          <h1 id="auth-story-title">
            Kebiasaan kecil.
            <br />
            <span>Cerita baik setiap hari.</span>
          </h1>
          <p className="auth-story-description">
            Kenali pengeluaranmu, rayakan konsistensimu.
            <br />
            Mochi siap menemani, satu langkah setiap hari.
          </p>
          <div className="auth-mascot-scene">
            <div className="mascot-halo" aria-hidden="true" />
            <Image
              className="auth-mascot"
              src="/mascot/mochi-crown-transparent.webp"
              alt="Mochi, teman kecil untuk kebiasaan baikmu"
              width={240}
              height={240}
              priority
            />
            <span className="auth-floating-note note-check">
              <span className="auth-note-icon tone-mint">
                <Check size={18} />
              </span>
              <span>
                Langkah kecil hari ini<strong>Sudah berarti.</strong>
              </span>
            </span>
            <span className="auth-floating-note note-heart">
              <Heart size={18} />
              <span>Pelan-pelan, bareng Mochi.</span>
            </span>
            <span className="auth-sparkle sparkle-one" aria-hidden="true">
              ✦
            </span>
            <span className="auth-sparkle sparkle-two" aria-hidden="true">
              ✧
            </span>
          </div>
          <p className="auth-story-footer">
            <Leaf size={16} />
            Tanpa menghakimi. Selalu menemani.
          </p>
        </section>
        <section
          className="auth-form-section"
          id="auth-form-section"
          aria-labelledby="auth-form-title"
        >
          <div className="auth-form-card">
            <span className="auth-welcome-icon" aria-hidden="true">
              <Sparkles size={23} />
            </span>
            <p className="auth-form-kicker">{copy.kicker}</p>
            <h2 id="auth-form-title">{copy.title}</h2>
            <p className="auth-form-description">{copy.description}</p>
            {children}
          </div>
          <p className="auth-footnote">
            Sedikit lebih kenal pengeluaranmu, setiap hari.
          </p>
        </section>
      </main>
      <footer className="auth-footer">
        <span>© 2026 Cashly</span>
        <span>Dibuat untuk langkah kecilmu.</span>
      </footer>
    </div>
  );
}
