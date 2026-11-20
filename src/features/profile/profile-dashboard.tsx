'use client';
import { AppLoader } from '@/components/shared/app-loader';

import { LocalDataStatus } from '@/components/shared/local-data-status';

import { useId, useState } from 'react';
import { useOnline } from '@/lib/pwa/connectivity';
import { useHomeData } from '@/features/home/use-home-data';
import { useExpenseSession } from '@/features/expenses/expense-session';
import { logoutGoogle } from '@/features/auth/session-boundary';
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
} from 'lucide-react';
import { AppNavigation } from '@/components/shared/app-navigation';
import { AppPageHeader } from '@/components/shared/app-page-header';
import {
  AppActionDialogs,
  isAppAction,
  type AppActionPanel,
} from '@/components/shared/app-action-dialogs';
import { AccountSecurityPanel } from './account-security-panel';
import { PermissionsPanel } from './permissions-panel';
import { SettingsRow } from '@/components/shared/settings-row';
import { InstallAppEntry } from '@/components/shared/install-app';
import { useModalStack } from '@/components/shared/use-modal-stack';
import { EvolutionCarousel } from '@/components/gamification/evolution-carousel';
import { MoneyDisplay } from '@/components/finance/money-display';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { formatDate } from '@/lib/format/datetime';
import { themeLabels, useTheme, type Theme } from '@/lib/theme/use-theme';
import {
  evolutionStages,
  profileSchema,
  type ProfileDraft,
} from './profile-model';
import { useProfileSession } from './profile-session';
import { ProfileEditForm } from './profile-edit-form';
import { EvolutionGuide } from './evolution-guide';
import {
  WhatsappConnectIntro,
  WhatsappOtpForm,
  WhatsappExampleConnected,
} from './whatsapp-connect';
import { whatsappExample } from '@/mocks/fixtures/whatsapp';

type InfoPanel =
  | 'theme'
  | 'timezone'
  | 'currency'
  | 'reminder'
  | 'privacy'
  | 'permissions'
  | 'help'
  | 'hero';
type Panel =
  | AppActionPanel
  | { kind: 'edit' | 'logout' }
  | { kind: 'info'; topic: InfoPanel }
  | { kind: 'guide'; stage?: number }
  | { kind: 'whatsapp'; step: 'intro' | 'otp' };
const infoTitles: Record<InfoPanel, string> = {
  theme: 'Tampilan Cashly',
  timezone: 'Zona waktu habit',
  currency: 'Mata uang & format',
  reminder: 'Pengingat catat harian',
  privacy: 'Privasi & keamanan',
  permissions: 'Perizinan',
  help: 'Pusat bantuan',
  hero: 'Level hero',
};

export function ProfileDashboard() {
  const gameData = useHomeData();
  const online = useOnline();
  const [logoutError, setLogoutError] = useState('');
  const session = useExpenseSession();
  const {
    profile,
    account: profileAccount,
    saveProfile,
    whatsappExampleLinked,
    setWhatsappExampleLinked,
  } = useProfileSession();
  const { theme, setTheme } = useTheme();
  const { panel, open, push, close, back, canGoBack } = useModalStack<Panel>();
  const [draft, setDraft] = useState<ProfileDraft>(profile);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [photoBusy, setPhotoBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [guideTab, setGuideTab] = useState<'evolution' | 'freeze'>('evolution');
  const formId = useId();
  const [whatsappChallenge, setWhatsappChallenge] = useState<{
    source: 'chat' | 'example';
    expiresAt: number;
  }>({ source: 'example', expiresAt: 0 });
  function startWhatsapp(source: 'chat' | 'example') {
    setWhatsappChallenge({
      source,
      expiresAt: Date.now() + whatsappExample.ttlMs,
    });
    push({ kind: 'whatsapp', step: 'otp' });
  }
  const nextStage = evolutionStages.find(
    (stage) => stage.stage > gameData.maxMascotStageUnlocked,
  );
  function openGuide(tab: 'evolution' | 'freeze', stage?: number) {
    setGuideTab(tab);
    open({ kind: 'guide', stage });
  }
  function editProfile() {
    setDraft(profile);
    setErrors({});
    setPhotoBusy(false);
    open({ kind: 'edit' });
  }
  async function submitProfile() {
    if (photoBusy || !navigator.onLine) return;
    const result = profileSchema.safeParse(draft);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const error of result.error.issues)
        next[error.path.join('.')] ??= error.message;
      setErrors(next);
      requestAnimationFrame(() =>
        document.getElementById(`profile-${Object.keys(next)[0]}`)?.focus(),
      );
      return;
    }
    setPhotoBusy(true);
    const saved = await saveProfile(result.data);
    setPhotoBusy(false);
    if (!saved) return;
    setFeedback('Profilmu sudah diperbarui.');
    close();
  }
  const title =
    panel?.kind === 'whatsapp'
      ? whatsappExampleLinked
        ? 'WhatsApp contoh terhubung'
        : panel.step === 'otp'
          ? 'Masukkan kode OTP'
          : 'Hubungkan WhatsApp'
      : panel?.kind === 'edit'
        ? 'Ubah profil'
        : panel?.kind === 'guide'
          ? panel.stage
            ? `Mochi level ${panel.stage}`
            : 'Evolusi Mochi & Freeze'
          : panel?.kind === 'logout'
            ? 'Keluar dari Cashly?'
            : panel?.kind === 'info'
              ? infoTitles[panel.topic]
              : '';
  return (
    <>
      <a className="skip-link" href="#profile-main">
        Langsung ke konten
      </a>
      <AppNavigation
        activePage="profile"
        onAdd={() => open({ kind: 'add' })}
        onUpcoming={() => {}}
      />
      <div className="app-shell profile-page">
        <AppPageHeader
          title="Profil Akun"
          description="Teman kecil, kebiasaan baik, ceritamu"
          icon={CircleUserRound}
        />
        <main id="profile-main" className="profile-main">
          <LocalDataStatus />
          {feedback && (
            <p className="profile-feedback" role="status">
              <CheckCircle2 size={16} />
              {feedback}
            </p>
          )}
          <section className="profile-account-card" aria-label="Profil akun">
            <div className="profile-account-top">
              <div>
                <h2>{profile.name}</h2>
                <p>@{profile.username}</p>
                <small>
                  Bergabung{' '}
                  {formatDate(profileAccount.joinedAt, {
                    month: 'short',
                    year: 'numeric',
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
                  Jaga Streak with Mochi!
                </h2>
                <span>{evolutionStages.length} level hero</span>
                <button
                  type="button"
                  className="icon-button"
                  aria-label="Panduan Mochi"
                  onClick={() => openGuide('evolution')}
                >
                  <Info size={17} />
                </button>
              </div>
              <div className="profile-mochi-card">
                <EvolutionCarousel
                  currentStage={gameData.mascotStage}
                  maxUnlocked={gameData.maxMascotStageUnlocked}
                  streak={gameData.streak}
                  onDetails={(stage) => openGuide('evolution', stage)}
                />
                {nextStage ? (
                  <div className="profile-evolution-progress">
                    <div>
                      <span>Menuju Mochi level {nextStage.stage}</span>
                      <strong>
                        {gameData.streak}/{nextStage.days} hari
                      </strong>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Menuju evolusi berikutnya"
                      aria-valuemin={0}
                      aria-valuemax={nextStage.days}
                      aria-valuenow={Math.min(gameData.streak, nextStage.days)}
                    >
                      <i
                        style={{
                          width: `${Math.min((gameData.streak / nextStage.days) * 100, 100)}%`,
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
                  onClick={() => open({ kind: 'info', topic: 'hero' })}
                >
                  <span>
                    Level hero <Zap size={17} />
                  </span>
                  <strong>
                    {gameData.level} <small>level hero</small>
                  </strong>
                  <p>Level {gameData.level} · Perjalananmu sendiri.</p>
                  <small>
                    Kenali level hero <Info size={12} />
                  </small>
                </button>
                <button
                  type="button"
                  className="profile-stat-card"
                  onClick={() => openGuide('freeze')}
                >
                  <span>
                    Proteksi bulanan <ShieldCheck size={17} />
                  </span>
                  <strong>
                    {gameData.freezeBalance} <small>tersedia</small>
                  </strong>
                  <p>Perlindungan streak dengan konfirmasi manual.</p>
                  <small>
                    Lihat aturan proteksi <Info size={12} />
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
                    onClick={() => open({ kind: 'info', topic: 'theme' })}
                  />
                  <SettingsRow
                    icon={Clock3}
                    title="Zona waktu habit"
                    description="Batas hari mengikuti pukul 00.00 WIB"
                    value="WIB"
                    onClick={() => open({ kind: 'info', topic: 'timezone' })}
                  />
                  <SettingsRow
                    icon={BellRing}
                    title="Pengingat catat harian"
                    description="Pengingat kecil untuk kebiasaanmu"
                    value="Segera hadir"
                    onClick={() => open({ kind: 'info', topic: 'reminder' })}
                  />
                  <SettingsRow
                    icon={Wallet}
                    title="Mata uang & format"
                    description="Rupiah Indonesia"
                    value="IDR"
                    onClick={() => open({ kind: 'info', topic: 'currency' })}
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
                    value={
                      whatsappExampleLinked ? 'Contoh terhubung' : 'Hubungkan'
                    }
                    onClick={() => open({ kind: 'whatsapp', step: 'intro' })}
                  />
                </div>
                <div className="profile-install-card">
                  <InstallAppEntry
                    layout="settings"
                    showStatus
                    onOpen={() => open({ kind: 'install' })}
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
                    title="Perizinan"
                    description="Kamera, mikrofon, foto & akses perangkat"
                    onClick={() => open({ kind: 'info', topic: 'permissions' })}
                  />
                  <SettingsRow
                    icon={ShieldCheck}
                    title="Privasi & keamanan"
                    description="Kenali cara Cashly memakai datamu"
                    onClick={() => open({ kind: 'info', topic: 'privacy' })}
                  />
                  <SettingsRow
                    icon={CircleHelp}
                    title="Pusat bantuan"
                    description="Jawaban untuk langkah kecilmu"
                    onClick={() => open({ kind: 'info', topic: 'help' })}
                  />
                </div>
              </section>
              <AccountSecurityPanel onLogout={() => open({ kind: 'logout' })} />
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
        />
      )}
      {panel && !isAppAction(panel) && (
        <Dialog
          title={title}
          onClose={close}
          onBack={canGoBack ? back : undefined}
          variant={
            panel.kind === 'edit' ||
            (panel.kind === 'info' && panel.topic === 'permissions') ||
            panel.kind === 'guide' ||
            panel.kind === 'whatsapp'
              ? 'sheet'
              : 'default'
          }
          className={`profile-dialog ${panel.kind === 'edit' ? 'profile-edit-dialog' : ''} ${panel.kind === 'whatsapp' ? 'whatsapp-connect-dialog' : ''}`}
          footer={
            panel.kind === 'edit' ? (
              <div className="profile-dialog-actions">
                <Button variant="secondary" onClick={close}>
                  Batal
                </Button>
                <Button
                  form={formId}
                  type="submit"
                  disabled={photoBusy || !online}
                >
                  {photoBusy ? (
                    <AppLoader inline />
                  ) : (
                    <>
                      <Check size={17} />
                      Simpan profil
                    </>
                  )}
                </Button>
              </div>
            ) : panel.kind === 'logout' ? (
              <div className="profile-dialog-actions">
                <Button variant="secondary" onClick={close}>
                  Tetap di sini
                </Button>
                <Button
                  className="profile-logout-confirm"
                  disabled={!online}
                  onClick={async () => {
                    try {
                      if (session.remoteMode) await logoutGoogle();
                      await session.resetSession();
                      window.location.replace('/login');
                    } catch {
                      setLogoutError(
                        'Sesi belum berhasil ditutup. Periksa koneksi lalu coba keluar lagi.',
                      );
                    }
                  }}
                >
                  <LogOut size={16} />
                  Keluar
                </Button>
              </div>
            ) : undefined
          }
        >
          {panel.kind === 'whatsapp' &&
            (!online ? (
              <p role="status">
                Penautan dan verifikasi WhatsApp memerlukan koneksi internet.
                WhatsApp tetap opsional untuk menggunakan Cashly.
              </p>
            ) : whatsappExampleLinked ? (
              <WhatsappExampleConnected
                onReset={() => {
                  setWhatsappExampleLinked(false);
                  close();
                }}
              />
            ) : panel.step === 'intro' ? (
              <WhatsappConnectIntro onStart={startWhatsapp} />
            ) : (
              <WhatsappOtpForm
                key={whatsappChallenge.expiresAt}
                formId={formId}
                source={whatsappChallenge.source}
                expiresAt={whatsappChallenge.expiresAt}
                onRestart={() =>
                  setWhatsappChallenge((previous) => ({
                    ...previous,
                    expiresAt: Date.now() + whatsappExample.ttlMs,
                  }))
                }
                onVerified={() => {
                  setWhatsappExampleLinked(true);
                  back();
                }}
              />
            ))}
          {panel.kind === 'edit' && (
            <>
              <p hidden={online} role="status">
                Hubungkan internet untuk menyimpan perubahan profil.
              </p>
              <ProfileEditForm
                draft={draft}
                onChange={(value) => {
                  setDraft(value);
                  setErrors({});
                }}
                errors={errors}
                formId={formId}
                onSubmit={submitProfile}
              />
            </>
          )}
          {panel.kind === 'guide' && (
            <EvolutionGuide
              tab={guideTab}
              onTab={setGuideTab}
              selectedStage={panel.stage}
            />
          )}
          {panel.kind === 'logout' && (
            <div className="profile-info-content">
              <span className="profile-info-icon">
                <LogOut size={29} />
              </span>
              <h3>Sampai ketemu lagi!</h3>
              {logoutError && <p role="alert">{logoutError}</p>}
              <p>
                Salinan data contoh di perangkat dan perubahan sesi akan dihapus
                ketika kamu keluar. Pilihan tema tetap tersimpan di perangkatmu.
              </p>
            </div>
          )}
          {panel.kind === 'info' && (
            <div className="profile-info-content">
              {panel.topic === 'permissions' && <PermissionsPanel />}
              {panel.topic === 'theme' && (
                <>
                  <p>Pilih tampilan yang paling nyaman untukmu.</p>
                  <fieldset className="profile-theme-options">
                    <legend className="sr-only">Tema aplikasi</legend>
                    {(['system', 'light', 'dark'] as Theme[]).map((value) => {
                      const Icon =
                        value === 'system'
                          ? Monitor
                          : value === 'light'
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
              {panel.topic === 'timezone' && (
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
              {panel.topic === 'currency' && (
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
              {panel.topic === 'reminder' && (
                <>
                  <span className="profile-info-icon">
                    <BellRing size={29} />
                  </span>
                  <span className="pill">Segera hadir</span>
                  <h3>Pengingat kecil, saat kamu siap.</h3>
                  <p>
                    Pengingat otomatis belum tersedia. Untuk sekarang, kamu bisa
                    membuka Cashly dari Home Screen saat ingin mencatat.
                  </p>
                </>
              )}
              {panel.topic === 'hero' && (
                <>
                  <span className="profile-info-icon">
                    <Zap size={29} />
                  </span>
                  <h3>Hero level {gameData.level}</h3>
                  <p>
                    Level hero mengikuti streak: 0, 30, 100, 150 dan 200 hari.
                  </p>
                  <p>
                    Jika streak putus dan tidak dipulihkan, hero kembali ke
                    level 1.
                  </p>
                  <Button
                    variant="secondary"
                    data-modal-focus-key="xp-evolution"
                    onClick={() => {
                      setGuideTab('evolution');
                      push({ kind: 'guide' });
                    }}
                  >
                    Lihat tahapan evolusi <Sparkles size={16} />
                  </Button>
                </>
              )}
              {panel.topic === 'privacy' && (
                <>
                  <span className="profile-info-icon">
                    <ShieldCheck size={29} />
                  </span>
                  <h3>Kenali apa yang disimpan.</h3>
                  <ul className="profile-info-list">
                    <li>
                      Nama dan username disimpan pada akunmu melalui API. Email
                      dikelola Supabase Auth.
                    </li>
                    <li>
                      Foto struk dan rekaman suara dikirim untuk analisis atau
                      transkripsi saat kamu memakai fitur terkait. Lihat
                      Perizinan untuk rincian akses perangkat.
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
              {panel.topic === 'help' && (
                <div className="profile-faq">
                  <p>Beberapa jawaban untuk menemani langkah pertamamu.</p>
                  {[
                    [
                      'Bagaimana cara mencatat pengeluaran?',
                      'Tekan tombol +, lalu pilih scan struk, voice note, atau chat manual. Tinjau rincian sebelum melanjutkan.',
                    ],
                    [
                      'Bagaimana memasang Cashly di Home Screen?',
                      'Buka panduan Install pada halaman Profil. Di iPhone, gunakan Safari dan menu Bagikan → Tambahkan ke Layar Utama.',
                    ],
                    [
                      'Kenapa izin kamera atau mikrofon ditolak?',
                      'Periksa izin situs pada pengaturan browser, lalu izinkan kamera atau mikrofon untuk Cashly dan coba kembali.',
                    ],
                    [
                      'Apakah menyapa Mochi menambah streak?',
                      'Menyapa Mochi adalah interaksi kecil untuk menemanimu. Streak berasal dari aktivitas yang memenuhi syarat, bukan membuka halaman atau menyapa Mochi.',
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
