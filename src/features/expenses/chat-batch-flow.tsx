"use client";

import type { ComponentProps } from "react";
import { OnlineRequired } from "@/components/shared/online-required";
import { useExpenseSession } from "./expense-session";

import Image from "next/image";
import { useEffect, useId, useRef, useState } from "react";
import {
  Check,
  Clock3,
  Info,
  MessageCircle,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  ExpenseChatComposer,
  expenseExamples,
} from "@/components/finance/expense-chat-composer";
import { ExpenseChatMessages } from "@/components/finance/expense-chat-messages";
import { ChatBatchList } from "@/components/finance/chat-batch-list";
import {
  ReceiptAnalysis,
  RECEIPT_ANALYSIS_DURATION_MS,
} from "@/components/finance/receipt-analysis";
import { ReceiptReview } from "@/components/finance/receipt-review";
import { MoneyDisplay } from "@/components/finance/money-display";
import {
  receiptSchema,
  type ReceiptDraft,
} from "@/features/scan/receipt-schema";
import { formatDate } from "@/lib/format/datetime";
import {
  appendChatMessage,
  welcomeMessage,
  type ChatMessage,
} from "./chat-session";
import {
  batchTotal,
  collectChatEntry,
  type BatchStep,
  type ChatEntry,
  type ChatBatchSnapshot,
  type ConfirmedChatBatch,
} from "./chat-batch";
import { parseExpenseText } from "./parse-expense-text";

const greeting = () =>
  welcomeMessage(
    "Hai! Kirim pengeluaranmu satu per satu. Setelah selesai, tekan Tinjau, ya.",
  );
function fieldErrors(draft: ReceiptDraft) {
  const result = receiptSchema.safeParse(draft);
  const errors: Record<string, string> = {};
  if (!result.success)
    for (const issue of result.error.issues)
      errors[issue.path.join(".")] ??= issue.message;
  return errors;
}

function ChatBatchFlowContent({
  onBack,
  onClose,
  initialSession,
  onSuspend,
}: {
  onBack: () => void;
  onClose: () => void;
  initialSession?: ChatBatchSnapshot | null;
  onSuspend?: (snapshot: ChatBatchSnapshot) => void;
}) {
  // Ignore the previous single-entry shape retained by Fast Refresh during development.
  const { recordDrafts } = useExpenseSession();
  const restored = Array.isArray(initialSession?.entries)
    ? initialSession
    : null;
  const [step, setStep] = useState<BatchStep>(restored?.step ?? "chat");
  const [input, setInput] = useState(restored?.input ?? "");
  const [messages, setMessages] = useState<ChatMessage[]>(
    restored?.messages ?? [greeting()],
  );
  const [entries, setEntries] = useState<ChatEntry[]>(restored?.entries ?? []);
  const [activeId, setActiveId] = useState<string | null>(
    restored?.activeId ?? null,
  );
  const [sourceInput, setSourceInput] = useState(restored?.sourceInput ?? "");
  const [confirmed, setConfirmed] = useState<ConfirmedChatBatch | null>(
    restored?.confirmed ?? null,
  );
  const [issues, setIssues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const sequence = useRef(
    Math.max(0, ...messages.map((message) => message.id)),
  );
  const work = useRef(0);
  const content = useRef<HTMLDivElement>(null);
  const formId = useId();
  const total = batchTotal(entries);
  const active = entries.find((entry) => entry.id === activeId);

  useEffect(() => {
    if (step !== "processing") return;
    const attempt = ++work.current;
    const timer = window.setTimeout(() => {
      if (attempt === work.current) setStep("review");
    }, RECEIPT_ANALYSIS_DURATION_MS);
    return () => {
      window.clearTimeout(timer);
    };
  }, [step]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const dialog = content.current?.closest("dialog");
      const scroller = dialog?.querySelector(".dialog-content");
      if (scroller)
        scroller.scrollTop = step === "chat" ? scroller.scrollHeight : 0;
      if (step !== "chat")
        dialog
          ?.querySelector<HTMLElement>('[aria-label="Kembali"]')
          ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [step, messages.length]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const dialog = content.current?.closest<HTMLElement>("dialog");
    if (!viewport || !dialog || (step !== "chat" && step !== "source")) return;
    const resize = () =>
      dialog.style.setProperty(
        "--chat-viewport-height",
        `${viewport.height}px`,
      );
    resize();
    viewport.addEventListener("resize", resize);
    return () => {
      viewport.removeEventListener("resize", resize);
      dialog.style.removeProperty("--chat-viewport-height");
    };
  }, [step]);

  function suspend(leave: () => void) {
    ++work.current;
    onSuspend?.({
      step: step === "processing" ? "chat" : step,
      input,
      messages,
      entries,
      activeId,
      sourceInput,
      confirmed,
    });
    leave();
  }
  function send() {
    if (step !== "chat" || !input.trim()) return;
    const createdAt = new Date().toISOString();
    const result = collectChatEntry(
      entries,
      input,
      crypto.randomUUID(),
      createdAt,
    );
    if (result.entries.length > 50) {
      setError(
        "Maksimal 50 pengeluaran per sesi. Tinjau daftar ini terlebih dahulu, ya.",
      );
      return;
    }
    const user: ChatMessage = {
      id: ++sequence.current,
      role: "user",
      text: input.trim(),
      createdAt,
    };
    const reply: ChatMessage = {
      id: ++sequence.current,
      role: "assistant",
      text: result.reply,
      createdAt,
    };
    setMessages((previous) =>
      appendChatMessage(appendChatMessage(previous, user), reply),
    );
    setEntries(result.entries);
    setInput("");
    setError("");
    setIssues({});
  }
  function preview() {
    if (!entries.length || input.trim()) return;
    setIssues({});
    setStep("processing");
  }
  function edit(entry: ChatEntry) {
    setActiveId(entry.id);
    setSourceInput(entry.text);
    setErrors({});
    setError("");
    setStep(entry.draft ? "detail" : "source");
  }
  function remove(id: string) {
    setEntries((previous) => previous.filter((entry) => entry.id !== id));
    setIssues({});
  }
  function applySource() {
    if (!active) return;
    const result = parseExpenseText(sourceInput.trim());
    if (result.kind === "clarify") {
      setError(result.message);
      return;
    }
    setEntries((previous) =>
      previous.map((entry) =>
        entry.id === active.id
          ? {
              ...entry,
              text: sourceInput.trim(),
              draft: result.draft,
              issue: null,
              reason: null,
            }
          : entry,
      ),
    );
    setError("");
    setIssues({});
    setStep("review");
  }
  function finishDetail() {
    if (!active?.draft) return;
    const next = fieldErrors(active.draft);
    setErrors(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        document.getElementById(`scan-${Object.keys(next)[0]}`)?.focus(),
      );
      return;
    }
    setIssues({});
    setStep("review");
  }
  function confirm() {
    if (step !== "review" || !entries.length) return;
    const next: Record<string, string> = {};
    const validated = entries.map((entry) => {
      if (!entry.draft) {
        next[entry.id] = entry.issue || "Lengkapi catatan ini.";
        return entry;
      }
      const result = receiptSchema.safeParse(entry.draft);
      if (!result.success) {
        next[entry.id] = result.error.issues[0].message;
        return entry;
      }
      return { ...entry, draft: result.data };
    });
    setIssues(next);
    if (Object.keys(next).length) {
      requestAnimationFrame(() =>
        content.current
          ?.querySelector<HTMLElement>('[role="status"]')
          ?.scrollIntoView({ block: "center" }),
      );
      return;
    }
    setConfirmed({
      entries: validated,
      messages: messages.map((message) => ({ ...message })),
      confirmedAt: new Date().toISOString(),
    });
    recordDrafts(validated.flatMap(entry => entry.draft ? [{ id: entry.id, draft: entry.draft, source: "chat" as const }] : []));
    setStep("success");
  }
  function reset() {
    setEntries([]);
    setMessages([greeting()]);
    sequence.current = 0;
    setInput("");
    setConfirmed(null);
    setActiveId(null);
    setSourceInput("");
    setIssues({});
    setErrors({});
    setError("");
    setStep("chat");
  }
  function back() {
    ++work.current;
    if (step === "chat") suspend(onBack);
    else if (step === "detail" || step === "success") setStep("review");
    else if (step === "source") {
      setError("");
      setStep(active?.draft ? "detail" : "review");
    } else setStep("chat");
  }
  const safeTotal = (total > BigInt(0) ? total : BigInt(0)).toString();
  return (
    <Dialog
      title={
        {
          chat: "Chat manual",
          processing: "Analisis catatan",
          review: "Pratinjau pengeluaran",
          detail: "Rincian pengeluaran",
          source: "Ubah catatan",
          success: "Konfirmasi pengeluaran",
        }[step]
      }
      variant="screen"
      className={`scan-flow ${step === "chat" || step === "source" ? "expense-chat-flow" : `scan-flow-${step}`}`}
      onBack={back}
      onClose={() => suspend(onClose)}
      footer={
        step === "chat" ? (
          <div className="chat-batch-composer">
            <ExpenseChatComposer
              value={input}
              onChange={setInput}
              onSend={send}
            />
            <p className="chat-batch-hint">
              <Info size={13} />
              Kirim beberapa pengeluaran, lalu tekan Tinjau.
            </p>
            {entries.length > 0 && (
              <>
                <Button
                  className="chat-batch-preview"
                  onClick={preview}
                  disabled={!!input.trim()}
                >
                  <Sparkles size={16} />
                  Tinjau {entries.length} pengeluaran ·{" "}
                  <MoneyDisplay amountIdr={safeTotal} />
                </Button>
                {input.trim() && (
                  <p className="chat-batch-hint" role="status">
                    Kirim atau kosongkan pesan sebelum Tinjau.
                  </p>
                )}
              </>
            )}
          </div>
        ) : step === "processing" ? (
          <div className="analysis-actions">
            <Button variant="secondary" onClick={back}>
              Kembali ke chat
            </Button>
            <Button variant="secondary" onClick={back}>
              Batal
            </Button>
          </div>
        ) : step === "source" ? (
          <Button form={formId} type="submit">
            Terapkan catatan
          </Button>
        ) : step === "detail" ? (
          <Button form={formId} type="submit">
            Selesai mengubah
          </Button>
        ) : step === "review" ? (
          <div className="scan-review-actions">
            <Button onClick={confirm} disabled={!entries.length}>
              <ShieldCheck size={18} />
              Konfirmasi {entries.length} pengeluaran ·{" "}
              <MoneyDisplay amountIdr={safeTotal} />
            </Button>
            <Button variant="ghost" onClick={() => setStep("chat")}>
              Tambah lewat chat
            </Button>
          </div>
        ) : (
          <div className="scan-success-actions">
            <Button variant="secondary" onClick={reset}>
              <MessageCircle size={17} />
              Catat lagi
            </Button>
          </div>
        )
      }
    >
      <div ref={content} className="chat-flow-content">
        {step === "chat" && (
          <>
            {messages.length === 1 && (
              <section
                className="chat-welcome"
                aria-labelledby="chat-welcome-title"
              >
                <div className="chat-mochi">
                  <Image
                    src="/mascot/mochi-crown-transparent.webp"
                    alt="Mochi menemani catatanmu"
                    width={88}
                    height={88}
                  />
                  <Sparkles size={20} />
                </div>
                <span className="pill">Cerita kecil, jadi catatan.</span>
                <h3 id="chat-welcome-title">Belanja apa hari ini?</h3>
                <p>Kirim satu per satu. Mochi siapkan daftar untuk ditinjau.</p>
                <div className="chat-examples">
                  {expenseExamples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setInput(example);
                        content.current
                          ?.closest("dialog")
                          ?.querySelector("textarea")
                          ?.focus({ preventScroll: true });
                      }}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <ExpenseChatMessages messages={messages} />
            {error && (
              <p className="scan-field-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
        {step === "processing" && (
          <ReceiptAnalysis example={false} source="chat" />
        )}
        {step === "review" && (
          <>
            <section className="scan-card chat-batch-overview">
              <span className="pill">Siap ditinjau</span>
              <h3>{entries.length} pengeluaran</h3>
              <MoneyDisplay amountIdr={safeTotal} />
              <p>Periksa setiap catatan sebelum dikonfirmasi.</p>
            </section>
            {entries.length ? (
              <ChatBatchList
                entries={entries}
                issues={issues}
                onEdit={edit}
                onRemove={remove}
              />
            ) : (
              <section className="scan-card">
                <p>Daftar masih kosong. Tambahkan pengeluaran melalui chat.</p>
              </section>
            )}
          </>
        )}
        {step === "detail" && active?.draft && (
          <ReceiptReview
            draft={active.draft}
            text={active.text}
            errors={errors}
            formId={formId}
            onChange={(draft) => {
              setEntries((previous) =>
                previous.map((entry) =>
                  entry.id === active.id ? { ...entry, draft } : entry,
                ),
              );
              setErrors({});
            }}
            onSubmit={finishDetail}
            onRetake={() => {
              setSourceInput(active.text);
              setError("");
              setStep("source");
            }}
          />
        )}
        {step === "source" && active && (
          <form
            id={formId}
            className="voice-source-editor"
            onSubmit={(event) => {
              event.preventDefault();
              applySource();
            }}
          >
            <label htmlFor="chat-entry-source">Catatan pengeluaran</label>
            <p>Perbaiki nama pembelian dan nominal untuk pengeluaran ini.</p>
            <Textarea
              id="chat-entry-source"
              value={sourceInput}
              onChange={(event) => {
                setSourceInput(event.target.value);
                setError("");
              }}
              rows={5}
              maxLength={1000}
              aria-invalid={!!error}
              aria-describedby={error ? "chat-source-error" : undefined}
            />
            {error && (
              <p
                id="chat-source-error"
                className="scan-field-error"
                role="alert"
              >
                {error}
              </p>
            )}
          </form>
        )}
        {step === "success" && confirmed && (
          <div className="scan-success">
            <section className="scan-success-hero">
              <div className="scan-success-mochi">
                <Image
                  src="/mascot/mochi-crown-transparent.webp"
                  alt="Mochi tersenyum"
                  width={112}
                  height={112}
                />
                <span>
                  <Check size={19} />
                </span>
              </div>
              <span className="pill">
                <ShieldCheck size={14} />
                Selesai
              </span>
              <h3>Catatanmu siap!</h3>
              <p>Ditambahkan ke daftar contoh Cashly. Belum dikirim ke server.</p>
              <p>
                {confirmed.entries.length} pengeluaran ·{" "}
                <MoneyDisplay
                  amountIdr={batchTotal(confirmed.entries).toString()}
                />
              </p>
            </section>
            <ChatBatchList entries={confirmed.entries} />
            <p className="chat-batch-confirmed-time">
              <Clock3 size={14} />
              <span>
                Dikonfirmasi{" "}
                <time dateTime={confirmed.confirmedAt}>
                  {formatDate(confirmed.confirmedAt, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}{" "}
                  WIB
                </time>
              </span>
            </p>
          </div>
        )}
      </div>
    </Dialog>
  );
}

export function ChatBatchFlow(props: ComponentProps<typeof ChatBatchFlowContent>) {
  return <OnlineRequired onBack={props.onBack} onClose={props.onClose}><ChatBatchFlowContent {...props} /></OnlineRequired>;
}
