"use client";

import Image from "next/image";
import { useExpenseSession } from "./expense-session";
import { useEffect, useId, useRef, useState } from "react";
import {
  Clock3,
  MessageCircle,
  Mic,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { formatDate } from "@/lib/format/datetime";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ExpenseChatMessages } from "@/components/finance/expense-chat-messages";
import {
  ExpenseChatComposer,
  expenseExamples,
} from "@/components/finance/expense-chat-composer";
import {
  ReceiptAnalysis,
  RECEIPT_ANALYSIS_DURATION_MS,
} from "@/components/finance/receipt-analysis";
import { ReceiptReview } from "@/components/finance/receipt-review";
import { ReceiptScanSuccess } from "@/components/finance/receipt-scan-success";
import { MoneyDisplay } from "@/components/finance/money-display";
import {
  blankReceipt,
  receiptAmounts,
  receiptSchema,
  type ReceiptDraft,
} from "@/features/scan/receipt-schema";
import { parseExpenseText, type ExpenseTextResult } from "./parse-expense-text";
import {
  appendChatMessage,
  welcomeMessage,
  type ChatStep,
  type ChatMessage,
  type ChatSessionSnapshot,
  type ConfirmedChatNote,
} from "./chat-session";

export function ChatReceiptFlow({
  onBack,
  onClose,
  initialText = "",
  source = "chat",
  onEditSource,
  onStartOver,
  initialDraft,
  onSourceChange,
  initialSession,
  onSuspend,
}: {
  onBack: () => void;
  onClose: () => void;
  initialText?: string;
  source?: "chat" | "voice";
  onEditSource?: () => void;
  onStartOver?: () => void;
  initialDraft?: ReceiptDraft;
  onSourceChange?: (text: string) => void;
  initialSession?: ChatSessionSnapshot | null;
  onSuspend?: (snapshot: ChatSessionSnapshot) => void;
}) {
  const { recordDrafts } = useExpenseSession();
  const recordId = useRef(crypto.randomUUID());
  const [step, setStep] = useState<ChatStep>(
    initialSession?.step ??
      (initialDraft ? "review" : initialText ? "processing" : "chat"),
  );
  const [input, setInput] = useState(initialSession?.input ?? "");
  const [sourceText, setSourceText] = useState(
    initialSession?.sourceText ?? initialText,
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    initialSession?.messages ?? [welcomeMessage()],
  );
  const sequence = useRef(
    Math.max(0, ...messages.map((message) => message.id)),
  );
  const [draft, setDraft] = useState<ReceiptDraft>(
    () => initialSession?.draft ?? initialDraft ?? blankReceipt(),
  );
  const [transcriptError, setTranscriptError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<ConfirmedChatNote | null>(
    initialSession?.confirmed ?? null,
  );
  const [missing, setMissing] = useState<{
    text: string;
    reason: "name" | "amount";
  } | null>(initialSession?.missing ?? null);
  const pending = useRef<{ text: string; result: ExpenseTextResult } | null>(
    !initialSession && initialText
      ? { text: initialText, result: parseExpenseText(initialText) }
      : null,
  );
  const dialogRef = useRef<HTMLDivElement>(null);
  const formId = useId();
  const total = receiptAmounts(draft).total;

  function addMessage(role: ChatMessage["role"], text: string) {
    const message = {
      id: ++sequence.current,
      role,
      text,
      createdAt: new Date().toISOString(),
    };
    setMessages((previous) => appendChatMessage(previous, message));
  }

  function suspend(leave: () => void) {
    onSuspend?.({
      step: step === "processing" ? "chat" : step,
      input: step === "processing" ? sourceText : input,
      sourceText,
      messages,
      draft,
      confirmed,
      missing,
    });
    pending.current = null;
    leave();
  }

  useEffect(() => {
    if (step !== "processing") return;
    const work = pending.current;
    const timer = window.setTimeout(() => {
      if (!work || pending.current !== work) return;
      pending.current = null;
      if (work.result.kind === "ready") {
        setDraft(work.result.draft);
        setErrors({});
        setMissing(null);
        const message: ChatMessage = {
          id: ++sequence.current,
          role: "assistant",
          text: "Rinciannya sudah siap. Cek kembali sebelum disimpan, ya.",
          createdAt: new Date().toISOString(),
        };
        setMessages((previous) => appendChatMessage(previous, message));
        setStep("review");
      } else {
        const result = work.result;
        setMissing(
          result.reason === "ambiguous"
            ? null
            : { text: work.text, reason: result.reason },
        );
        const message: ChatMessage = {
          id: ++sequence.current,
          role: "assistant",
          text: result.message,
          createdAt: new Date().toISOString(),
        };
        setMessages((previous) => appendChatMessage(previous, message));
        setStep("chat");
      }
    }, RECEIPT_ANALYSIS_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [step]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const dialog = dialogRef.current?.closest("dialog");
      if (!dialog) return;
      dialog.scrollTop = 0;
      if (step === "chat") {
        const content = dialog.querySelector(".dialog-content");
        if (content) content.scrollTop = content.scrollHeight;
      } else
        dialog
          .querySelector<HTMLElement>('[aria-label="Kembali"]')
          ?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [step, messages.length]);

  useEffect(() => {
    const viewport = window.visualViewport;
    const dialog = dialogRef.current?.closest<HTMLElement>("dialog");
    if ((step !== "chat" && step !== "transcript") || !viewport || !dialog)
      return;
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

  function send() {
    if (pending.current || step !== "chat" || !input.trim()) return;
    let text = input.trim();
    let result = parseExpenseText(text);
    if (missing && result.kind === "clarify" && result.reason !== "ambiguous") {
      const combined =
        missing.reason === "amount"
          ? `${missing.text} ${text}`
          : `${text} ${missing.text}`;
      const combinedResult = parseExpenseText(combined);
      if (combinedResult.kind === "ready") {
        text = combined;
        result = combinedResult;
      }
    }
    addMessage("user", input.trim());
    setInput("");
    setSourceText(text);
    setMissing(null);
    pending.current = { text, result };
    setStep("processing");
  }
  function returnToChat() {
    pending.current = null;
    if (onEditSource) {
      onEditSource();
      return;
    }
    setInput(sourceText);
    setStep("chat");
  }
  function back() {
    if (step === "chat") suspend(onBack);
    else if (step === "success" || step === "transcript") setStep("review");
    else returnToChat();
  }
  function applyTranscript() {
    const text = input.trim();
    const result = parseExpenseText(text);
    if (result.kind === "clarify") {
      setTranscriptError(result.message);
      return;
    }
    setTranscriptError("");
    setSourceText(text);
    onSourceChange?.(text);
    pending.current = { text, result };
    setStep("processing");
  }
  function submit() {
    const result = receiptSchema.safeParse(draft);
    if (!result.success) {
      const next: Record<string, string> = {};
      for (const issue of result.error.issues)
        next[issue.path.join(".")] ??= issue.message;
      setErrors(next);
      requestAnimationFrame(() =>
        document.getElementById(`scan-${Object.keys(next)[0]}`)?.focus(),
      );
      return;
    }
    setConfirmed({
      draft: result.data,
      source,
      text: sourceText,
      confirmedAt: new Date().toISOString(),
      messages: messages.map((message) => ({ ...message })),
    });
    recordDrafts([{ id: recordId.current, draft: result.data, source }]);
    setErrors({});
    setStep("success");
  }

  return (
    <Dialog
      title={
        {
          chat: "Chat manual",
          processing:
            source === "voice" ? "Analisis voice note" : "Analisis catatan",
          review: "Review pengeluaran",
          success: "Konfirmasi pengeluaran",
          transcript: "Ubah transkrip",
        }[step]
      }
      variant="screen"
      className={`scan-flow ${step === "chat" || step === "transcript" ? "expense-chat-flow" : `scan-flow-${step}`}`}
      onBack={back}
      onClose={() => suspend(onClose)}
      footer={
        step === "chat" ? (
          <ExpenseChatComposer
            value={input}
            onChange={setInput}
            onSend={send}
          />
        ) : step === "transcript" ? (
          <div className="scan-review-actions">
            <Button type="submit" form={formId}>
              Terapkan transkrip
            </Button>
          </div>
        ) : step === "processing" ? (
          <div className="analysis-actions">
            <div>
              <Button variant="secondary" onClick={returnToChat}>
                {source === "voice" ? "Kembali ke rekaman" : "Kembali ke chat"}
              </Button>
              <Button variant="secondary" onClick={returnToChat}>
                Batal
              </Button>
            </div>
          </div>
        ) : step === "review" ? (
          <div className="scan-review-actions">
            <Button type="submit" form={formId}>
              <ShieldCheck size={18} /> Simpan pengeluaran{" "}
              <MoneyDisplay
                amountIdr={(total > BigInt(0) ? total : BigInt(0)).toString()}
              />
            </Button>
          </div>
        ) : (
          <div className="scan-success-actions">
            <Button
              variant="secondary"
              onClick={() => {
                if (onStartOver || onEditSource) {
                  (onStartOver ?? onEditSource)?.();
                  return;
                }
                setInput("");
                setSourceText("");
                setMessages([
                  welcomeMessage("Yuk, ceritakan pengeluaran berikutnya."),
                ]);
                sequence.current = 0;
                setDraft(blankReceipt());
                setMissing(null);
                setConfirmed(null);
                recordId.current = crypto.randomUUID();
                setStep("chat");
              }}
            >
              {source === "voice" ? (
                <Mic size={17} />
              ) : (
                <MessageCircle size={17} />
              )}{" "}
              Catat lagi
            </Button>
          </div>
        )
      }
    >
      <div ref={dialogRef} className="chat-flow-content">
        {step === "transcript" && (
          <form
            id={formId}
            className="voice-source-editor"
            onSubmit={(event) => {
              event.preventDefault();
              applyTranscript();
            }}
          >
            <label htmlFor="voice-source-text">Transkrip voice note</label>
            <p>
              Periksa nama pembelian dan nominalnya sebelum diterapkan ke
              rincian.
            </p>
            <Textarea
              id="voice-source-text"
              value={input}
              onChange={(event) => {
                setInput(event.target.value);
                setTranscriptError("");
              }}
              maxLength={1000}
              rows={5}
              placeholder="Contoh: habis beli Nescafe coffee 12k"
              aria-invalid={!!transcriptError}
              aria-describedby={
                transcriptError ? "voice-source-error" : undefined
              }
            />
            {transcriptError && (
              <p
                id="voice-source-error"
                className="scan-field-error"
                role="alert"
              >
                {transcriptError}
              </p>
            )}
          </form>
        )}
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
                <p>Ceritakan sekali. Mochi bantu rapikan rinciannya.</p>
                <div className="chat-examples">
                  {expenseExamples.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => {
                        setInput(example);
                        dialogRef.current
                          ?.closest("dialog")
                          ?.querySelector<HTMLTextAreaElement>("textarea")
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
          </>
        )}
        {step === "processing" && (
          <ReceiptAnalysis example={false} source={source} />
        )}
        {step === "review" && (
          <ReceiptReview
            draft={draft}
            text={sourceText}
            textSource={source}
            errors={errors}
            formId={formId}
            onChange={(next) => {
              setDraft(next);
              setErrors({});
            }}
            onSubmit={submit}
            onRetake={
              source === "voice"
                ? () => {
                    setInput(sourceText);
                    setTranscriptError("");
                    setStep("transcript");
                  }
                : returnToChat
            }
          />
        )}
        {step === "success" && confirmed && (
          <>
            <ReceiptScanSuccess draft={confirmed.draft} />
            <section
              className="scan-card chat-source-summary"
              aria-label="Sumber catatan"
            >
              <div className="scan-section-title">
                {confirmed.source === "voice" ? (
                  <Mic size={18} />
                ) : (
                  <MessageCircle size={18} />
                )}
                <h3>
                  {confirmed.source === "voice"
                    ? "Catatan dari voice note"
                    : "Catatan dari chat"}
                </h3>
              </div>
              <blockquote>{confirmed.text}</blockquote>
              <p>
                <Clock3 size={14} aria-hidden="true" />
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
            </section>
          </>
        )}
      </div>
    </Dialog>
  );
}
