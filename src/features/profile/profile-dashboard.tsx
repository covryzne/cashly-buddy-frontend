"use client";

import { useId, useState } from "react";
import { flushSync } from "react-dom";
import { useExpenseSession } from "@/features/expenses/expense-session";
import {
  BellRing,
  Check,
  CheckCircle2,
  CircleHelp,
  CircleUserRound,
  Clock3,
  Download,
  Globe,
  Info,
  LogOut,
  MessageCircle,
  Monitor,
  Moon,
  Palette,
  PencilLine,
  ShieldCheck,
  Sparkles,
  Sun,
  Wallet,
  Zap,
} from "lucide-react";
import { AppNavigation } from "@/components/shared/app-navigation";
import { AppPageHeader } from "@/components/shared/app-page-header";
import {
  AppActionDialogs,
  isAppAction,
  type AppActionPanel,
} from "@/components/shared/app-action-dialogs";
import { ProfileAvatar } from "@/components/shared/profile-avatar";
import { SettingsRow } from "@/components/shared/settings-row";
import { InstallAppEntry } from "@/components/shared/install-app";
import { useModalStack } from "@/components/shared/use-modal-stack";
import { EvolutionCarousel } from "@/components/gamification/evolution-carousel";
import { MoneyDisplay } from "@/components/finance/money-display";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { homeFixture } from "@/mocks/fixtures/home";
import { formatDate } from "@/lib/format/datetime";
import { themeLabels, useTheme, type Theme } from "@/lib/theme/use-theme";
import {
  evolutionStages,
  profileAccount,
  profileSchema,
  type ProfileDraft,
} from "./profile-model";
import { useProfileSession } from "./profile-session";
import { ProfileEditForm } from "./profile-edit-form";
import { EvolutionGuide } from "./evolution-guide";

type InfoPanel =
  | "theme"
  | "timezone"
  | "currency"
  | "reminder"
  | "whatsapp"
  | "privacy"
  | "help"
  | "xp";
type Panel =
  | AppActionPanel
  | { kind: "edit" | "logout" }
  | { kind: "info"; topic: InfoPanel }
  | { kind: "guide"; stage?: number };
const infoTitles: Record<InfoPanel, string> = {
  theme: "Tampilan Cashly",
  timezone: "Zona waktu habit",
  currency: "Mata uang & format",
  reminder: "Pengingat catat harian",
  whatsapp: "Catat via WhatsApp",
  privacy: "Privasi & keamanan",
  help: "Pusat bantuan",
  xp: "XP & level",
};

export function ProfileDashboard() {
  const session = useExpenseSession();
  const { profile, saveProfile } = useProfileSession();
  const { theme, setTheme } = useTheme();
  const { panel, open, push, close, back, canGoBack } = useModalStack<Panel>();
  const [draft, setDraft] = useState<ProfileDraft>(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [guideTab, setGuideTab] = useState<"evolution" | "freeze">("evolution");
  const formId = useId();
  const nextStage = evolutionStages.find(
    (stage) => stage.stage > homeFixture.maxMascotStageUnlocked,
  );
  function openGuide(tab: "evolution" | "freeze", stage?: number) {
    setGuideTab(tab);
    open({ kind: "guide", stage });
  }
  function editProfile() {
    setDraft(profile);
    setErrors({});
    setPhotoBusy(false);
    open({ kind: "edit" });
  }
  function submitProfile() {
    if (photoBusy) return;
    const result = profileSchema.safeParse(draft);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const error of result.error.issues)
        next[error.path.join(".")] ??= error.message;
      setErrors(next);
      requestAnimationFrame(() =>
        document.getElementById(`profile-${Object.keys(next)[0]}`)?.focus(),
      );
      return;
    }
    saveProfile(result.data);
    setFeedback("Profilmu sudah diperbarui.");
    close();
  }
  const title =
    panel?.kind === "edit"
      ? "Ubah profil"
      : panel?.kind === "guide"
        ? "Evolusi Mochi & Freeze"
        : panel?.kind === "logout"
          ? "Keluar dari Cashly?"
          : panel?.kind === "info"
            ? infoTitles[panel.topic]
            : "";
  return (
    <>
      <a className="skip-link" href="#profile-main">
        Langsung ke konten
      </a>
      <AppNavigation
        activePage="profile"
        onAdd={() => open({ kind: "add" })}
        onUpcoming={() => {}}
      />
      <div className="app-shell profile-page">
        <AppPageHeader
          title="Profil Akun"
          description="Teman kecil, kebiasaan baik, ceritamu"
          icon={CircleUserRound}
        />
        <main id="profile-main" className="profile-main">
          {feedback && (
            <p className="profile-feedback" role="status">
              <CheckCircle2 size={16} />
              {feedback}
            </p>
          )}
          <section className="profile-account-card" aria-label="Profil akun">
            <div className="profile-account-top">
              <ProfileAvatar profile={profile} size={66} />
              <div>
                <h2>{profile.name}</h2>
                <p>@{profile.username}</p>
                <small>
                  Bergabung{" "}
                  {formatDate(profileAccount.joinedAt, {
                    month: "short",
                    year: "numeric",
                  })}
                </small>
              </div>
              <Button
                variant="secondary"
                aria-label="Ubah profil"
                onClick={editProfile}
              >
                <PencilLine size={14} />
                Edit
              </Button>
            </div>
            {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          </section>
          <div className="profile-layout">
            <section
              className="profile-companion"
              aria-labelledby="profile-companion-title"
            >
              <div className="profile-section-heading">
                <h2 id="profile-companion-title">
                  <Sparkles size={18} />
                  Teman Mochi & Gamifikasi
                </h2>
                <span>{evolutionStages.length} level hero</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Panduan Mochi"
                  onClick={() => openGuide("evolution")}
                >
                  <Info size={17} />
                </button>
              </div>
              <div className="profile-mochi-card">
                <EvolutionCarousel
                  currentStage={homeFixture.mascotStage}
                  maxUnlocked={homeFixture.maxMascotStageUnlocked}
                  xp={homeFixture.xp}
                  streak={homeFixture.streak}
                  onDetails={(stage) => openGuide("evolution", stage)}
                />
                {nextStage ? (
                  <div className="profile-evolution-progress">
                    <div>
                      <span>
                        Menuju hero level {nextStage.stage} · {nextStage.name}
                      </span>
                      <strong>
                        {homeFixture.streak}/{nextStage.days} hari
                      </strong>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Menuju evolusi berikutnya"
                      aria-valuemin={0}
                      aria-valuemax={nextStage.days}
                      aria-valuenow={Math.min(
                        homeFixture.streak,
                        nextStage.days,
                      )}
                    >
                      <i
                        style={{
                          width: `${Math.min((homeFixture.streak / nextStage.days) * 100, 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                ) : (
                  <p>Semua tahap evolusi sudah terbuka.</p>
                )}
              </div>
              <div className="profile-stats-grid">
                <button
                  type="button"
                  className="profile-stat-card"
                  onClick={() => open({ kind: "info", topic: "xp" })}
                >
                  <span>
                    XP & Level <Zap size={17} />
                  </span>
                  <strong>
                    {homeFixture.xp} <small>XP</small>
                  </strong>
                  <p>Level {homeFixture.level} · Perjalananmu sendiri.</p>
                  <small>
                    Kenali XP dan level <Info size={12} />
                  </small>
                </button>
                <button
                  type="button"
                  className="profile-stat-card"
                  onClick={() => openGuide("freeze")}
                >
                  <span>
                    Streak Freeze <ShieldCheck size={17} />
                  </span>
                  <strong>
                    {homeFixture.freezeBalance} <small>tersedia</small>
                  </strong>
                  <p>Perlindungan streak dengan konfirmasi manual.</p>
                  <small>
                    Lihat aturan Freeze <Info size={12} />
                  </small>
                </button>
              </div>
            </section>
            <div className="profile-settings-column">
              <section
                className="profile-settings-section"
                aria-labelledby="profile-preferences-title"
              >
                <h2 id="profile-preferences-title">Preferensi & Kebiasaan</h2>
                <div className="profile-settings-card">
                  <SettingsRow
                    icon={Palette}
                    title="Tampilan aplikasi"
                    description="Pilih tema yang nyaman untukmu"
                    value={themeLabels[theme]}
                    onClick={() => open({ kind: "info", topic: "theme" })}
                  />
                  <SettingsRow
                    icon={Clock3}
                    title="Zona waktu habit"
                    description="Batas hari mengikuti pukul 00.00 WIB"
                    value="WIB"
                    onClick={() => open({ kind: "info", topic: "timezone" })}
                  />
                  <SettingsRow
                    icon={BellRing}
                    title="Pengingat catat harian"
                    description="Pengingat kecil untuk kebiasaanmu"
                    value="Segera hadir"
                    onClick={() => open({ kind: "info", topic: "reminder" })}
                  />
                  <SettingsRow
                    icon={Wallet}
                    title="Mata uang & format"
                    description="Rupiah Indonesia"
                    value="IDR"
                    onClick={() => open({ kind: "info", topic: "currency" })}
                  />
                </div>
              </section>
              <section
                className="profile-settings-section"
                aria-labelledby="profile-connections-title"
              >
                <h2 id="profile-connections-title">Koneksi & Fitur</h2>
                <div className="profile-whatsapp-card">
                  <SettingsRow
                    icon={MessageCircle}
                    title="Catat via WhatsApp"
                    description="Catat pengeluaran langsung dari percakapanmu."
                    value="Segera hadir"
                    onClick={() => open({ kind: "info", topic: "whatsapp" })}
                  />
                </div>
              </section>
              <section
                className="profile-settings-section"
                aria-labelledby="profile-data-title"
              >
                <h2 id="profile-data-title">Data & Bantuan</h2>
                <div className="profile-settings-card">
                  <SettingsRow
                    icon={Download}
                    title="Ekspor ringkasan"
                    description="Salin teks atau simpan laporan sebagai PDF"
                    href="/laporan"
                  />
                  <SettingsRow
                    icon={ShieldCheck}
                    title="Privasi & keamanan"
                    description="Kenali cara Cashly memakai datamu"
                    onClick={() => open({ kind: "info", topic: "privacy" })}
                  />
                  <SettingsRow
                    icon={CircleHelp}
                    title="Pusat bantuan"
                    description="Jawaban untuk langkah kecilmu"
                    onClick={() => open({ kind: "info", topic: "help" })}
                  />
                </div>
              </section>
              <div className="profile-install-card">
                <InstallAppEntry
                  showStatus
                  onOpen={() => open({ kind: "install" })}
                />
              </div>
              <Button
                variant="ghost"
                className="profile-logout"
                onClick={() => open({ kind: "logout" })}
              >
                <LogOut size={17} />
                Keluar dari akun
              </Button>
              <footer className="profile-footer">
                Cashly · Langkah kecil, cerita baik.
                <span>Dibuat untuk menemani kebiasaanmu.</span>
              </footer>
            </div>
          </div>
        </main>
      </div>
      {panel && isAppAction(panel) && (
        <AppActionDialogs
          panel={panel}
          push={push}
          back={back}
          close={close}
          canGoBack={canGoBack}
          returnLabel="Kembali ke Profil"
        />
      )}
      {panel && !isAppAction(panel) && (
        <Dialog
          title={title}
          onClose={close}
          onBack={canGoBack ? back : undefined}
          variant={
            panel.kind === "edit" || panel.kind === "guide"
              ? "sheet"
              : "default"
          }
          className={`profile-dialog ${panel.kind === "edit" ? "profile-edit-dialog" : ""}`}
          footer={
            panel.kind === "edit" ? (
              <div className="profile-dialog-actions">
                <Button variant="secondary" onClick={close}>
                  Batal
                </Button>
                <Button form={formId} type="submit" disabled={photoBusy}>
                  <Check size={17} />
                  Simpan profil
                </Button>
              </div>
            ) : panel.kind === "logout" ? (
              <div className="profile-dialog-actions">
                <Button variant="secondary" onClick={close}>
                  Tetap di sini
                </Button>
                <Button
                  className="profile-logout-confirm"
                  onClick={() => {
                    flushSync(session.resetSession);
                    window.location.replace("/login");
                  }}
                >
                  <LogOut size={16} />
                  Keluar
                </Button>
              </div>
            ) : (
              <Button onClick={close}>Mengerti</Button>
            )
          }
        >
          {panel.kind === "edit" && (
            <ProfileEditForm
              draft={draft}
              onChange={(value) => {
                setDraft(value);
                setErrors({});
              }}
              onPhoto={(photo) =>
                setDraft((current) => ({ ...current, avatar: "photo", photo }))
              }
              errors={errors}
              formId={formId}
              onSubmit={submitProfile}
              onBusyChange={setPhotoBusy}
            />
          )}
          {panel.kind === "guide" && (
            <EvolutionGuide
              tab={guideTab}
              onTab={setGuideTab}
              selectedStage={panel.stage}
            />
          )}
          {panel.kind === "logout" && (
            <div className="profile-info-content">
              <span className="profile-info-icon">
                <LogOut size={29} />
              </span>
              <h3>Sampai ketemu lagi!</h3>
              <p>
                Perubahan sementara dalam sesi ini akan direset ketika kamu
                keluar. Pilihan tema tetap tersimpan di perangkatmu.
              </p>
            </div>
          )}
          {panel.kind === "info" && (
            <div className="profile-info-content">
              {panel.topic === "theme" && (
                <>
                  <p>Pilih tampilan yang paling nyaman untukmu.</p>
                  <fieldset className="profile-theme-options">
                    <legend className="sr-only">Tema aplikasi</legend>
                    {(["system", "light", "dark"] as Theme[]).map((value) => {
                      const Icon =
                        value === "system"
                          ? Monitor
                          : value === "light"
                            ? Sun
                            : Moon;
                      return (
                        <label key={value}>
                          <Icon size={21} />
                          <span>{themeLabels[value]}</span>
                          <input
                            type="radio"
                            name="profile-theme"
                            checked={theme === value}
                            onChange={() => setTheme(value)}
                          />
                        </label>
                      );
                    })}
                  </fieldset>
                </>
              )}
              {panel.topic === "timezone" && (
                <>
                  <span className="profile-info-icon">
                    <Globe size={29} />
                  </span>
                  <h3>Asia/Jakarta · WIB</h3>
                  <p>
                    Transaksi dan pergantian hari mengikuti Waktu Indonesia
                    Barat (UTC+7). Batas hari habit adalah pukul 00.00 WIB.
                  </p>
                  <p>Zona waktu belum dapat diubah di sini.</p>
                </>
              )}
              {panel.topic === "currency" && (
                <>
                  <span className="profile-info-icon">
                    <Wallet size={29} />
                  </span>
                  <h3>Rupiah Indonesia (IDR)</h3>
                  <p>
                    Nominal dicatat dalam rupiah bulat dengan pemisah ribuan
                    agar mudah dibaca.
                  </p>
                  <div className="profile-format-example">
                    <small>Contoh format</small>
                    <MoneyDisplay amountIdr="1248500" />
                  </div>
                </>
              )}
              {(panel.topic === "reminder" || panel.topic === "whatsapp") && (
                <>
                  <span className="profile-info-icon">
                    {panel.topic === "reminder" ? (
                      <BellRing size={29} />
                    ) : (
                      <MessageCircle size={29} />
                    )}
                  </span>
                  <span className="pill">Segera hadir</span>
                  <h3>
                    {panel.topic === "reminder"
                      ? "Pengingat kecil, saat kamu siap."
                      : "Catatan dari percakapanmu."}
                  </h3>
                  <p>
                    {panel.topic === "reminder"
                      ? "Pengingat otomatis belum tersedia. Untuk sekarang, kamu bisa membuka Cashly dari Home Screen saat ingin mencatat."
                      : "Pencatatan melalui WhatsApp sedang disiapkan. Akunmu belum dihubungkan ke WhatsApp. Kamu tetap bisa mencatat lewat chat, suara, atau scan di Cashly."}
                  </p>
                </>
              )}
              {panel.topic === "xp" && (
                <>
                  <span className="profile-info-icon">
                    <Zap size={29} />
                  </span>
                  <h3>
                    Level {homeFixture.level} · {homeFixture.xp} XP
                  </h3>
                  <p>
                    XP berasal dari aktivitas yang memenuhi syarat. Level XP
                    berbeda dari streak dan tahap evolusi Mochi.
                  </p>
                  <p>
                    Membuka halaman, menyapa Mochi, atau melihat panduan tidak
                    menambah XP. Angka yang ditampilkan mengikuti status akun.
                  </p>
                  <Button
                    variant="secondary"
                    data-modal-focus-key="xp-evolution"
                    onClick={() => {
                      setGuideTab("evolution");
                      push({ kind: "guide" });
                    }}
                  >
                    Lihat tahapan evolusi <Sparkles size={16} />
                  </Button>
                </>
              )}
              {panel.topic === "privacy" && (
                <>
                  <span className="profile-info-icon">
                    <ShieldCheck size={29} />
                  </span>
                  <h3>Kenali apa yang disimpan.</h3>
                  <ul className="profile-info-list">
                    <li>
                      Nama, bio, dan foto profil saat ini disimpan sementara
                      selama sesi. Muat ulang halaman akan memulai data awal.
                    </li>
                    <li>
                      Foto profil, foto struk, dan rekaman suara tidak diunggah
                      melalui alur yang tersedia saat ini.
                    </li>
                    <li>
                      Pilihan tema disimpan pada perangkat agar tampilannya
                      tetap nyaman saat kamu kembali.
                    </li>
                    <li>
                      Akses kamera dan mikrofon diminta melalui izin browser
                      ketika kamu memilih fitur terkait.
                    </li>
                  </ul>
                </>
              )}
              {panel.topic === "help" && (
                <div className="profile-faq">
                  <p>Beberapa jawaban untuk menemani langkah pertamamu.</p>
                  {[
                    [
                      "Bagaimana cara mencatat pengeluaran?",
                      "Tekan tombol +, lalu pilih scan struk, voice note, atau chat manual. Tinjau rincian sebelum melanjutkan.",
                    ],
                    [
                      "Bagaimana memasang Cashly di Home Screen?",
                      "Buka panduan Install pada halaman Profil. Di iPhone, gunakan Safari dan menu Bagikan → Tambahkan ke Layar Utama.",
                    ],
                    [
                      "Kenapa izin kamera atau mikrofon ditolak?",
                      "Periksa izin situs pada pengaturan browser, lalu izinkan kamera atau mikrofon untuk Cashly dan coba kembali.",
                    ],
                    [
                      "Apakah menyapa Mochi menambah streak?",
                      "Menyapa Mochi adalah interaksi kecil untuk menemanimu. Streak dan XP berasal dari aktivitas yang memenuhi syarat, bukan membuka halaman atau menyapa Mochi.",
                    ],
                  ].map(([question, answer]) => (
                    <details key={question}>
                      <summary>{question}</summary>
                      <p>{answer}</p>
                    </details>
                  ))}
                </div>
              )}
            </div>
          )}
        </Dialog>
      )}
    </>
  );
}
