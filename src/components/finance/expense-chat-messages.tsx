"use client";
import Image from "next/image";
import { Fragment, useSyncExternalStore } from "react";
import { chatDayLabel, formatDate, wibDayKey } from "@/lib/format/datetime";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageFooter,
} from "@/components/ui/message";
import type { ChatMessage } from "@/features/expenses/chat-session";
const subscribeDay = (notify: () => void) => {
  const timer = window.setInterval(notify, 60000);
  window.addEventListener("focus", notify);
  document.addEventListener("visibilitychange", notify);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", notify);
    document.removeEventListener("visibilitychange", notify);
  };
};
export function ExpenseChatMessages({ messages, pending = false }: { messages: ChatMessage[]; pending?: boolean }) {
  const today = useSyncExternalStore(
    subscribeDay,
    () => wibDayKey(new Date().toISOString()),
    () => null,
  );
  return (
    <div
      className="expense-chat-messages"
      role="log"
      tabIndex={0}
      aria-label="Percakapan pengeluaran"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {messages.map((message, index) => {
        const day = message.createdAt ? wibDayKey(message.createdAt) : null;
        const previous = messages[index - 1];
        const next = messages[index + 1];
        const previousDay = previous?.createdAt
          ? wibDayKey(previous.createdAt)
          : null;
        const nextDay = next?.createdAt ? wibDayKey(next.createdAt) : null;
        const showTime =
          message.createdAt && (next?.role !== message.role || nextDay !== day);
        return (
          <Fragment key={message.id}>
            {message.createdAt && day !== previousDay && (
              <div className="chat-day-divider">
                <span>{chatDayLabel(message.createdAt, today)}</span>
              </div>
            )}
            <Message
              align={message.role === "user" ? "end" : "start"}
              className={`expense-message expense-message-${message.role}`}
            >
              {message.role === "assistant" && (
                <MessageAvatar>
                  <Image
                    src="/mascot/mochi-crown-transparent.webp"
                    alt=""
                    width={30}
                    height={30}
                  />
                </MessageAvatar>
              )}
              <MessageContent>
                <span className="chat-speaker">
                  {message.role === "user" ? "Kamu" : "Mochi"}
                </span>
                <Bubble
                  align={message.role === "user" ? "end" : "start"}
                  variant={message.role === "user" ? "default" : "muted"}
                >
                  <BubbleContent>{message.text}</BubbleContent>
                </Bubble>
                {showTime && (
                  <MessageFooter className="chat-message-time">
                    <time
                      dateTime={message.createdAt!}
                      title={
                        formatDate(message.createdAt!, {
                          dateStyle: "full",
                          timeStyle: "short",
                        }) + " WIB"
                      }
                    >
                      {formatDate(message.createdAt!, {
                        hour: "2-digit",
                        minute: "2-digit",
                        hourCycle: "h23",
                      })}{" "}
                      WIB
                    </time>
                  </MessageFooter>
                )}
              </MessageContent>
            </Message>
          </Fragment>
        );
      })}
      {pending && (
        <Message align="start" className="expense-message expense-message-assistant">
          <MessageAvatar>
            <Image src="/mascot/mochi-crown-transparent.webp" alt="" width={30} height={30} />
          </MessageAvatar>
          <MessageContent>
            <span className="chat-speaker">Mochi</span>
            <Bubble align="start" variant="muted">
              <BubbleContent>
                <span className="chat-typing" role="status">
                  Mochi sedang mengetik…
                  <span className="chat-typing-dots" aria-hidden="true"><i /><i /><i /></span>
                </span>
              </BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      )}
    </div>
  );
}
