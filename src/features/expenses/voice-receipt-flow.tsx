"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type CSSProperties, type ComponentProps } from "react";
import { AudioLines, RotateCcw, ShieldCheck, Sparkles, ArrowRight, MessageCircle, Upload, WifiOff } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AppLoader } from "@/components/shared/app-loader";
import FluidOrb from "@/components/ui/fluid-orb";
import { VoiceNote, type VoiceNoteHandle } from "@/components/detent/components/voicenote/VoiceNote";
import { ReceiptReview } from "@/components/finance/receipt-review";
import { ReceiptAnalysis } from "@/components/finance/receipt-analysis";
import { ChatBatchList } from "@/components/finance/chat-batch-list";
import { MoneyDisplay } from "@/components/finance/money-display";
import { receiptSchema } from "@/features/scan/receipt-schema";
import { useOnline } from "@/lib/pwa/connectivity";
import { useVoiceRecorder } from "./use-voice-recorder";
import { useExpenseSession } from "./expense-session";
import { batchTotal, type ChatEntry } from "./chat-batch";
import { transcribeVoice, extractVoice } from "./extract-voice";

type Step = "record" | "transcript" | "preview" | "detail" | "success";
function VoiceReceiptFlowContent({ onBack, onClose, onChat }: {
  onBack: () => void; onClose: () => void; onChat: () => void;
}) {
  const voice = useVoiceRecorder();
  const online = useOnline();
  const stopRecording = voice.stop;
  const { recordDrafts, mutationPending, remoteMode } = useExpenseSession();
  const [step, setStep] = useState<Step>("record");
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [duration, setDuration] = useState(0);
  const [pending, setPending] = useState<"transcribe" | "extract" | null>(null);
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const stableIds = useRef<string[]>([]);
  const request = useRef<AbortController | null>(null);
  const version = useRef(0);
  const busyRequest = useRef(false);
  const player = useRef<VoiceNoteHandle>(null);
  const file = useRef<HTMLInputElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const formId = useId();
  const busy = ["recording", "requesting", "stopping"].includes(voice.status);
  const ready = voice.status === "ready" && !!voice.blob;
  const active = entries.find(entry => entry.id === activeId);
  const total = batchTotal(entries).toString();
  const complete = entries.length > 0 && entries.every(entry => entry.draft && !entry.issue && receiptSchema.safeParse(entry.draft).success);

  useEffect(() => () => { ++version.current; request.current?.abort(); }, []);
  useEffect(() => {
    if (!online) { request.current?.abort(); stopRecording(); player.current?.pause(); }
  }, [online, stopRecording]);
  useEffect(() => {
    const viewport = window.visualViewport;
    const dialog = content.current?.closest<HTMLElement>("dialog");
    if (!viewport || !dialog) return;
    const resize = () => dialog.style.setProperty("--voice-height", `${viewport.height}px`);
    resize(); viewport.addEventListener("resize", resize);
    return () => { viewport.removeEventListener("resize", resize); dialog.style.removeProperty("--voice-height"); };
  }, [step, online]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) player.current?.pause(); };
    document.addEventListener("visibilitychange", hidden);
    return () => document.removeEventListener("visibilitychange", hidden);
  }, []);

  function cancel() {
    ++version.current; request.current?.abort(); request.current = null;
    busyRequest.current = false; setPending(null);
  }
  function reset() {
    cancel(); player.current?.pause(); voice.reset(); stableIds.current = [];
    setText(""); setEntries([]); setNotice(""); setError(""); setDuration(0); setStep("record");
  }
  async function run(kind: "transcribe" | "extract") {
    if (busyRequest.current || !online || mutationPending || (kind === "transcribe" && !voice.blob) || (kind === "extract" && !text.trim())) return;
    const current = ++version.current;
    const controller = new AbortController(); request.current = controller;
    busyRequest.current = true; setPending(kind); setError(""); player.current?.pause();
    try {
      if (kind === "transcribe") {
        const data = await transcribeVoice(voice.blob!, controller.signal);
        if (current !== version.current || controller.signal.aborted) return;
        setText(data.transcript); setNotice(data.issue ?? "Periksa nama pembelian dan nominalnya sebelum melanjutkan.");
        setDuration(data.duration_seconds); setStep("transcript");
      } else {
        const data = await extractVoice(text.trim(), controller.signal);
        if (current !== version.current || controller.signal.aborted) return;
        setNotice(data.reply);
        if (!data.entries.length) return;
        setEntries(data.entries.map((entry, index) => {
          stableIds.current[index] ??= crypto.randomUUID();
          return { ...entry, id: stableIds.current[index] };
        }));
        setStep("preview");
      }
    } catch (cause) {
      if (current === version.current && !controller.signal.aborted)
        setError(cause instanceof Error ? cause.message : "AI belum merespons. Inputmu tetap tersedia untuk dicoba lagi.");
    } finally {
      if (current === version.current) { busyRequest.current = false; setPending(null); request.current = null; }
    }
  }
  async function save() {
    if (!complete || mutationPending) return;
    if (await recordDrafts(entries.flatMap(entry => entry.draft ? [{ id: entry.id, draft: entry.draft, source: "voice" as const }] : []))) setStep("success");
  }
  function back() {
    if (mutationPending) return;
    if (pending) { cancel(); return; }
    if (step === "record") onBack();
    else if (step === "detail" || step === "success") setStep("preview");
    else if (step === "preview") setStep("transcript");
    else setStep("record");
  }
  function finishDetail() {
    const result = receiptSchema.safeParse(active?.draft);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues) next[issue.path.join(".")] ??= issue.message;
      setErrors(next); return;
    }
    setErrors({}); setStep("preview");
  }
  if (!online) return <Dialog title="Perlu koneksi internet" onBack={back} onClose={onClose}>
    <div className="local-data-empty"><WifiOff size={28} /><p>VN dan penyimpanan memerlukan internet. Rekaman dan transkrip tetap tersedia selama dialog ini belum ditutup.</p></div>
  </Dialog>;

  return <Dialog title={pending ? (pending === "transcribe" ? "Mendengarkan VN" : "Analisis voice note") : {
    record: "Voice note kilat", transcript: "Periksa transkrip", preview: "Pratinjau pengeluaran", detail: "Rincian pengeluaran", success: "Konfirmasi pengeluaran",
  }[step]} variant="screen" className={`scan-flow voice-flow ${step === "record" || step === "transcript" ? "" : `scan-flow-${step}`}`}
    onBack={mutationPending ? undefined : back} onClose={() => { if (!mutationPending) { cancel(); onClose(); } }} showCloseButton={!mutationPending}
    footer={<div className="voice-footer">
      {pending ? <Button variant="secondary" onClick={cancel}>Batal</Button> : step === "record" ? <>
        {ready ? <><Button onClick={() => void run("transcribe")}><Sparkles size={18} /> Buat transkrip <ArrowRight size={17} /></Button>
          <Button variant="ghost" onClick={() => { setNotice("Tulis atau perbaiki ucapan dari rekamanmu."); setStep("transcript"); }}>Tulis transkrip sendiri</Button></> :
          <Button variant="secondary" disabled={busy} onClick={() => { voice.reset(); onChat(); }}><MessageCircle size={18} /> Catat lewat chat</Button>}
        <p><ShieldCheck size={13} /> Audio dikirim ke AI saat kamu memilih Buat transkrip.</p>
      </> : step === "transcript" ? <Button disabled={!text.trim()} onClick={() => void run("extract")}><Sparkles size={18} /> Tinjau pengeluaran</Button> :
        step === "preview" ? <><Button disabled={!complete || mutationPending} onClick={() => void save()}><ShieldCheck size={18} /> Simpan {entries.length} pengeluaran <MoneyDisplay amountIdr={total} /></Button>
          <Button variant="ghost" disabled={mutationPending} onClick={() => setStep("transcript")}>Ubah transkrip</Button></> :
        step === "detail" ? <Button type="submit" form={formId}>Selesai mengubah</Button> : <Button variant="secondary" onClick={reset}>Catat lagi</Button>}
    </div>}>
    <div ref={content} className="voice-content">
      {error && <p role="alert" className="voice-error">{error}</p>}
      {pending ? <ReceiptAnalysis example={false} source="voice" pending pendingLabel={pending === "transcribe" ? "Mochi sedang mendengarkan VN" : "Mochi sedang merapikan transkrip"} /> : <>
        {step === "record" && <>
          <div className="voice-intro"><div className="voice-mochi"><Image src="/mascot/mochi-crown-transparent.webp" alt="Mochi siap mendengarkan" width={76} height={76} /><span><AudioLines size={17} /></span></div>
            <span className="pill">Cerita lewat suara</span><h3>{ready ? "Dengarkan, lalu rapikan." : voice.status === "recording" ? "Mochi mendengarkan..." : "Belanja apa hari ini?"}</h3>
            <p>Sebutkan pembelian, nominal, dan pembayaran. Misal: tadi beli nasi padang dua belas ribu, bayar QRIS.</p></div>
          <section className="voice-recorder" aria-label="Perekam pengeluaran">
            <div className="voice-status" role="status">{voice.status === "recording" ? "Sedang merekam" : voice.status === "requesting" ? "Menunggu izin mikrofon" : voice.status === "stopping" ? "Menyiapkan audio" : ready ? "Rekaman siap diputar" : "Siap saat kamu siap"}</div>
            <div className="voice-timer" aria-label={`${voice.seconds} detik`}>{`${Math.floor(voice.seconds / 60)}`.padStart(2, "0")}:{`${voice.seconds % 60}`.padStart(2, "0")}<span> / 01:00</span></div>
            {!ready && <button className={`voice-record-button ${voice.status === "recording" ? "is-recording" : ""}`} style={{ "--voice-level": voice.level } as CSSProperties}
              disabled={voice.status === "requesting" || voice.status === "stopping"} aria-label={voice.status === "recording" ? "Hentikan rekaman" : "Mulai rekam"}
              aria-pressed={voice.status === "recording"} onClick={() => voice.status === "recording" ? voice.stop() : void voice.start()}>
              {voice.status === "requesting" || voice.status === "stopping" ? <AppLoader /> : <FluidOrb size={160} color="var(--primary)" className="voice-orb" aria-hidden="true" />}</button>}
            {ready && <Button variant="ghost" onClick={reset}><RotateCcw size={16} /> Rekam ulang</Button>}
            <Button variant="secondary" disabled={busy} onClick={() => file.current?.click()}><Upload size={17} /> Pilih audio</Button>
            <input ref={file} type="file" className="sr-only" aria-label="Pilih berkas audio" accept="audio/*,.m4a,.webm,.ogg,.wav,.mp3,.aac,.flac" onChange={async event => {
              const selected = event.currentTarget.files?.[0]; event.currentTarget.value = "";
              if (selected && await voice.loadFile(selected)) { setText(""); setNotice(""); setError(""); setDuration(0); setEntries([]); stableIds.current = []; }
            }} />
            <p className="voice-record-hint">Maksimal 60 detik dan 5 MB. WebM, M4A, WAV, MP3, Ogg, AAC, atau FLAC.</p>
          </section>
          {voice.warning && <p className="scan-field-hint" role="status">{voice.warning}</p>}
          {voice.error && <div className="voice-error" role="alert">{voice.error}</div>}
        </>}
        {(step === "record" || step === "transcript") && voice.audioUrl && voice.previewAvailable && <VoiceNote ref={player} src={voice.audioUrl} duration={duration || voice.duration} peaks={voice.peaks} words={[]} defaultTranscript={false} />}
        {step === "transcript" && <section className="voice-source-editor">
          <label htmlFor="voice-transcript">Transkrip voice note</label>
          {notice && <p role="status">{notice}</p>}
          <Textarea id="voice-transcript" rows={6} maxLength={4000} value={text} onChange={event => { setText(event.target.value); setError(""); }} placeholder="Periksa atau tulis ucapanmu di sini, termasuk nama pembelian dan nominalnya." />
          <p className="scan-field-hint">Perubahan transkrip akan dianalisis saat kamu menekan Tinjau. Belum ada pengeluaran yang disimpan.</p>
        </section>}
        {step === "preview" && <><section className="scan-card chat-batch-overview"><span className="pill">Draft dari voice note</span><h3>{entries.length} pengeluaran</h3><MoneyDisplay amountIdr={total} /><p>{notice}</p></section>
          <ChatBatchList entries={entries} onEdit={mutationPending ? undefined : entry => { if (!entry.draft) { setStep("transcript"); return; } setActiveId(entry.id); setErrors({}); setStep("detail"); }} onRemove={mutationPending ? undefined : id => setEntries(previous => previous.filter(entry => entry.id !== id))} /></>}
        {step === "detail" && active?.draft && <ReceiptReview draft={active.draft} text={text} textSource="voice" errors={errors} formId={formId}
          onChange={draft => { setEntries(previous => previous.map(entry => entry.id === active.id ? { ...entry, draft } : entry)); setErrors({}); }} onSubmit={finishDetail} onRetake={() => setStep("transcript")} />}
        {step === "success" && <section className="scan-success"><h3>Pengeluaran berhasil disimpan.</h3><p>{remoteMode ? "Catatan dari VN sudah masuk ke Cashly." : "Ditambahkan ke daftar lokal."}</p><MoneyDisplay amountIdr={total} /><ChatBatchList entries={entries} /></section>}
      </>}
    </div>
  </Dialog>;
}

export function VoiceReceiptFlow(props: ComponentProps<typeof VoiceReceiptFlowContent>) {
  return <VoiceReceiptFlowContent {...props} />;
}
